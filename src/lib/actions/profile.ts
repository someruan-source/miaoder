'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1, '昵称不能为空').max(30, '昵称不能超过 30 个字符'),
  city: z.string().trim().max(50, '城市不能超过 50 个字符').optional().or(z.literal('')),
  bio: z.string().trim().max(300, '简介不能超过 300 个字符').optional().or(z.literal('')),
})

async function getCurrentProfileRowId() {
  const supabase = await createClient()
  const { data: authResult } = await supabase.auth.getUser()
  const authUser = authResult.user

  if (!authUser) {
    throw new Error('未登录')
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, auth_user_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return { supabase, authUser, profile }
}

export async function updateProfileAction(formData: FormData) {
  const parsed = updateProfileSchema.safeParse({
    nickname: formData.get('nickname'),
    city: formData.get('city') || '',
    bio: formData.get('bio') || '',
  })

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const { supabase, authUser, profile } = await getCurrentProfileRowId()

    const payload = {
      auth_user_id: authUser.id,
      email: authUser.email ?? null,
      nickname: parsed.data.nickname,
      city: parsed.data.city || null,
      bio: parsed.data.bio || null,
    }

    if (profile) {
      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', profile.id)

      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('users').insert(payload)
      if (error) throw new Error(error.message)
    }

    revalidatePath('/')
    revalidatePath('/me')
    revalidatePath('/onboarding')

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : '更新主人资料失败',
    }
  }
}
