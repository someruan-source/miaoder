'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const createPetSchema = z.object({
  name: z.string().trim().min(1, '宠物名字不能为空').max(30, '宠物名字不能超过 30 个字符'),
  type: z.enum(['cat', 'dog', 'other']),
  breed: z.string().trim().max(50, '品种不能超过 50 个字符').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'unknown']).default('unknown'),
  age_months: z.coerce.number().int().min(0).max(600).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
  neutered: z.coerce.boolean().optional().default(false),
  vaccinated: z.coerce.boolean().optional().default(false),
  friendly_to_humans: z.coerce.boolean().optional(),
  friendly_to_pets: z.coerce.boolean().optional(),
  meetup_ready: z.coerce.boolean().optional().default(false),
  intro: z.string().trim().max(500, '简介不能超过 500 个字符').optional().or(z.literal('')),
  city: z.string().trim().max(50).optional().or(z.literal('')),
  district: z.string().trim().max(50).optional().or(z.literal('')),
  personality_tags: z.array(z.string()).max(10).default([]),
  activity_tags: z.array(z.string()).max(10).default([]),
})

async function getCurrentUserRow() {
  const supabase = await createClient()
  const { data: authResult } = await supabase.auth.getUser()
  const authUser = authResult.user

  if (!authUser) throw new Error('未登录')

  const { data: userRow, error } = await supabase
    .from('users')
    .select('id, nickname')
    .eq('auth_user_id', authUser.id)
    .single()

  if (error || !userRow) {
    throw new Error('请先完成主人资料')
  }

  return { supabase, userRow }
}

export async function createPetAction(input: {
  name: string
  type: 'cat' | 'dog' | 'other'
  breed?: string
  gender?: 'male' | 'female' | 'unknown'
  age_months?: number
  size?: 'small' | 'medium' | 'large'
  neutered?: boolean
  vaccinated?: boolean
  friendly_to_humans?: boolean
  friendly_to_pets?: boolean
  meetup_ready?: boolean
  intro?: string
  city?: string
  district?: string
  personality_tags?: string[]
  activity_tags?: string[]
}) {
  const parsed = createPetSchema.safeParse({
    ...input,
    gender: input.gender ?? 'unknown',
    personality_tags: input.personality_tags ?? [],
    activity_tags: input.activity_tags ?? [],
  })

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const { supabase, userRow } = await getCurrentUserRow()

    const { personality_tags, activity_tags, ...petPayload } = parsed.data

    const { data: pet, error } = await supabase
      .from('pets')
      .insert({
        user_id: userRow.id,
        ...petPayload,
        breed: petPayload.breed || null,
        intro: petPayload.intro || null,
        city: petPayload.city || null,
        district: petPayload.district || null,
      })
      .select('id')
      .single()

    if (error || !pet) {
      throw new Error(error?.message || '创建宠物失败')
    }

    const tags = [
      ...personality_tags.map((tag) => ({ pet_id: pet.id, tag_type: 'personality', tag_value: tag })),
      ...activity_tags.map((tag) => ({ pet_id: pet.id, tag_type: 'activity', tag_value: tag })),
    ]

    if (tags.length) {
      const { error: tagError } = await supabase.from('pet_tags').insert(tags)
      if (tagError) throw new Error(tagError.message)
    }

    revalidatePath('/')
    revalidatePath('/discover')
    revalidatePath('/me')

    return { ok: true, petId: pet.id }
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : '创建宠物失败',
    }
  }
}
