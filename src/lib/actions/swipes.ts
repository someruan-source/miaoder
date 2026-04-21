'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const swipeSchema = z.object({
  from_pet_id: z.string().uuid('from_pet_id 非法'),
  to_pet_id: z.string().uuid('to_pet_id 非法'),
  action: z.enum(['like', 'skip']),
})

function sortPair<T extends string>(a: T, b: T): [T, T] {
  return a < b ? [a, b] : [b, a]
}

export async function swipeAction(input: {
  from_pet_id: string
  to_pet_id: string
  action: 'like' | 'skip'
}) {
  const parsed = swipeSchema.safeParse(input)
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

    const { data: fromPet, error: fromPetError } = await supabase
      .from('pets')
      .select('id,user_id')
      .eq('id', parsed.data.from_pet_id)
      .single()

    if (fromPetError || !fromPet) throw new Error('未找到你的宠物')
    if (fromPet.user_id !== userRow.id) throw new Error('不能替别人的宠物滑卡')
    if (parsed.data.from_pet_id === parsed.data.to_pet_id) throw new Error('不能给自己滑卡')

    const { data: targetPet, error: targetPetError } = await supabase
      .from('pets')
      .select('id,user_id')
      .eq('id', parsed.data.to_pet_id)
      .single()

    if (targetPetError || !targetPet) throw new Error('目标宠物不存在')

    const { error: swipeError } = await supabase.from('swipes').upsert(
      {
        from_user_id: userRow.id,
        from_pet_id: parsed.data.from_pet_id,
        to_pet_id: parsed.data.to_pet_id,
        action: parsed.data.action,
      },
      { onConflict: 'from_pet_id,to_pet_id' }
    )

    if (swipeError) throw new Error(swipeError.message)

    let matched = false
    let matchId: string | null = null

    if (parsed.data.action === 'like') {
      const { data: reverseSwipe } = await supabase
        .from('swipes')
        .select('id')
        .eq('from_pet_id', parsed.data.to_pet_id)
        .eq('to_pet_id', parsed.data.from_pet_id)
        .eq('action', 'like')
        .maybeSingle()

      if (reverseSwipe) {
        const [petA, petB] = sortPair(parsed.data.from_pet_id, parsed.data.to_pet_id)
        const [userA, userB] = sortPair(fromPet.user_id, targetPet.user_id)

        const { data: existingMatch } = await supabase
          .from('matches')
          .select('id')
          .eq('pet_a_id', petA)
          .eq('pet_b_id', petB)
          .maybeSingle()

        if (existingMatch) {
          matched = true
          matchId = existingMatch.id
        } else {
          const { data: newMatch, error: matchError } = await supabase
            .from('matches')
            .insert({
              pet_a_id: petA,
              pet_b_id: petB,
              user_a_id: userA,
              user_b_id: userB,
              status: 'active',
            })
            .select('id')
            .single()

          if (matchError) throw new Error(matchError.message)

          matched = true
          matchId = newMatch.id

          await supabase.from('messages').insert([
            {
              match_id: newMatch.id,
              sender_user_id: userRow.id,
              message_type: 'system',
              content: '配对成功，快来打个招呼吧。',
            },
          ])
        }
      }
    }

    revalidatePath('/discover')
    revalidatePath('/matches')

    return { ok: true, matched, matchId }
  } catch (error) {
    return {
      ok: false,
      formError: error instanceof Error ? error.message : '滑卡失败',
    }
  }
}
