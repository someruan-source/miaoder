'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const createPostSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(100, '标题不能超过 100 个字符'),
  content: z.string().trim().min(1, '正文不能为空').max(5000, '正文不能超过 5000 个字符'),
  category: z.enum(['experience', 'diet', 'training', 'help', 'emergency', 'city']),
  city: z.string().trim().max(50).optional().or(z.literal('')),
  pet_id: z.string().uuid().optional().or(z.literal('')),
})

export async function createPostAction(formData: FormData) {
  const parsed = createPostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    category: formData.get('category'),
    city: formData.get('city') || '',
    pet_id: formData.get('pet_id') || '',
  })

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    const supabase = await createClient()
    const { data: authResult } = await supabase.auth.getUser()
    const authUser = authResult.user
    if (!authUser) throw new Error('未登录')

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userRow) throw new Error('请先完成主人资料')

    const { error } = await supabase.from('posts').insert({
      user_id: userRow.id,
      pet_id: parsed.data.pet_id || null,
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category,
      city: parsed.data.city || null,
    })

    if (error) throw new Error(error.message)

    revalidatePath('/')
    revalidatePath('/community')
    revalidatePath('/community/new')

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : '发布帖子失败',
    }
  }
}
