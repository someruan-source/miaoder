import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type UserRow = {
  id: string
  nickname: string | null
}

type PetRow = {
  id: string
  user_id: string
  name: string | null
  type: string | null
}

type MatchRow = {
  id: string
  user_a_id: string
  user_b_id: string
  pet_a_id: string | null
  pet_b_id: string | null
  created_at: string | null
}

type MessageRow = {
  id: string
  match_id: string
  sender_user_id: string
  content: string | null
  is_read: boolean | null
  created_at: string | null
}

type PetMediaRow = {
  id: string
  pet_id: string
  file_path: string
  media_type: 'image' | 'video'
  sort_order: number
  created_at: string
}

function petAvatar(type: string | null) {
  if (type === 'dog') return '🐶'
  if (type === 'cat') return '🐱'
  return '🐾'
}

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: currentProfile } = await supabase
    .from('users')
    .select('id, nickname')
    .eq('auth_user_id', authUser.id)
    .maybeSingle<UserRow>()

  if (!currentProfile) {
    redirect('/onboarding')
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, user_a_id, user_b_id, pet_a_id, pet_b_id, created_at')
    .eq('id', id)
    .maybeSingle<MatchRow>()

  if (matchError) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <Link href="/messages" className="text-sm text-neutral-500">
            ← 返回消息
          </Link>
          <div className="status-danger mt-6">
            加载聊天失败：{matchError.message}
          </div>
        </div>
      </main>
    )
  }

  if (!match) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <Link href="/messages" className="text-sm text-neutral-500">
            ← 返回消息
          </Link>
          <div className="empty-state mt-6">
            <h1 className="text-xl font-bold text-neutral-900">聊天不存在</h1>
          </div>
        </div>
      </main>
    )
  }

  const isParticipant =
    match.user_a_id === currentProfile.id || match.user_b_id === currentProfile.id

  if (!isParticipant) {
    redirect('/messages')
  }

  const otherUserId =
    match.user_a_id === currentProfile.id ? match.user_b_id : match.user_a_id

  const otherPetId =
    match.user_a_id === currentProfile.id ? match.pet_b_id : match.pet_a_id

  const myPetId =
    match.user_a_id === currentProfile.id ? match.pet_a_id : match.pet_b_id

  const userIds = [match.user_a_id, match.user_b_id]
  const petIds = [match.pet_a_id, match.pet_b_id].filter(Boolean) as string[]

  const userMap = new Map<string, UserRow>()
  const petMap = new Map<string, PetRow>()
  const petImageMap = new Map<string, string>()

  const { data: users } = await supabase
    .from('users')
    .select('id, nickname')
    .in('id', userIds)

  ;(users ?? []).forEach((item) => {
    userMap.set(item.id, item as UserRow)
  })

  if (petIds.length > 0) {
    const { data: pets } = await supabase
      .from('pets')
      .select('id, user_id, name, type')
      .in('id', petIds)

    ;(pets ?? []).forEach((item) => {
      petMap.set(item.id, item as PetRow)
    })

    const { data: mediaRows } = await supabase
      .from('pet_media')
      .select('id, pet_id, file_path, media_type, sort_order, created_at')
      .in('pet_id', petIds)
      .eq('media_type', 'image')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    const typedMediaRows = (mediaRows ?? []) as PetMediaRow[]

    for (const item of typedMediaRows) {
      if (!petImageMap.has(item.pet_id)) {
        const publicUrl = supabase.storage
          .from('pet-media')
          .getPublicUrl(item.file_path).data.publicUrl
        petImageMap.set(item.pet_id, publicUrl)
      }
    }
  }

  const otherUser = userMap.get(otherUserId)
  const otherPet = otherPetId ? petMap.get(otherPetId) : undefined
  const myPet = myPetId ? petMap.get(myPetId) : undefined
  const otherPetImageUrl = otherPetId ? petImageMap.get(otherPetId) : undefined
  const otherPetEmoji = petAvatar(otherPet?.type ?? null)

  const { data: messages } = await supabase
    .from('messages')
    .select('id, match_id, sender_user_id, content, is_read, created_at')
    .eq('match_id', match.id)
    .order('created_at', { ascending: true })

  const messageRows = (messages ?? []) as MessageRow[]

  const unreadIds = messageRows
    .filter(
      (item) => item.sender_user_id !== currentProfile.id && item.is_read === false
    )
    .map((item) => item.id)

  if (unreadIds.length > 0) {
    await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
  }

  async function sendMessage(formData: FormData) {
    'use server'

    const content = String(formData.get('content') || '').trim()
    const matchId = String(formData.get('match_id') || '').trim()

    if (!content) {
      throw new Error('消息内容不能为空')
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!profile) {
      redirect('/onboarding')
    }

    const { data: existingMatch } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id')
      .eq('id', matchId)
      .maybeSingle()

    if (
      !existingMatch ||
      (existingMatch.user_a_id !== profile.id &&
        existingMatch.user_b_id !== profile.id)
    ) {
      throw new Error('你无权在此会话中发送消息')
    }

    const { error } = await supabase.from('messages').insert({
      match_id: matchId,
      sender_user_id: profile.id,
      content,
      is_read: false,
    })

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath('/messages')
    revalidatePath(`/messages/${matchId}`)
    redirect(`/messages/${matchId}`)
  }

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <Link
            href="/messages"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            ← 返回消息
          </Link>
          <p className="page-kicker mt-4">miaoder</p>
          <h1 className="page-title">聊天详情</h1>
          <p className="page-subtitle">继续和对方主人交流，慢慢熟悉彼此。</p>
        </div>

        <section className="card-base p-5">
          <div className="flex items-center gap-4">
            <div className="avatar-frame h-18 w-18 shrink-0 overflow-hidden rounded-[20px] bg-neutral-100">
              {otherPetImageUrl ? (
                <img
                  src={otherPetImageUrl}
                  alt={otherPet?.name ?? '宠物头像'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl">
                  {otherPetEmoji}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-3xl font-black tracking-tight text-neutral-900">
                {otherUser?.nickname ?? '对方用户'}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                正在和 {otherPet?.name ?? '对方宠物'} 聊天
              </p>
              <p className="mt-2 text-xs text-neutral-400">
                我的发起宠物：{myPet?.name ?? '未命名宠物'}
              </p>
            </div>
          </div>
        </section>

        <section className="card-base mt-6 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-black tracking-tight text-neutral-900">
              聊天记录
            </h3>
            <span className="pill-soft">{messageRows.length} 条消息</span>
          </div>

          <div className="mt-5 space-y-3">
            {messageRows.length > 0 ? (
              messageRows.map((message) => {
                const isMine = message.sender_user_id === currentProfile.id

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-[22px] px-4 py-3 shadow-sm ${
                        isMine
                          ? 'bg-neutral-900 text-white'
                          : 'border border-black/5 bg-white text-neutral-800'
                      }`}
                    >
                      <div className="text-sm leading-7">
                        {message.content?.trim() || '空消息'}
                      </div>
                      <div
                        className={`mt-2 text-xs ${
                          isMine ? 'text-neutral-300' : 'text-neutral-400'
                        }`}
                      >
                        {message.created_at
                          ? new Date(message.created_at).toLocaleString()
                          : '未知时间'}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state text-sm text-neutral-500">
                还没有消息，发一条开始聊天吧。
              </div>
            )}
          </div>
        </section>

        <section className="card-base mt-6 p-5">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-neutral-900">
              发送消息
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              说点轻松自然的话，会更容易拉近距离。
            </p>
          </div>

          <form action={sendMessage} className="mt-5">
            <input type="hidden" name="match_id" value={match.id} />
            <textarea
              name="content"
              rows={4}
              placeholder="输入你想说的话……"
              className="textarea-base"
            />
            <div className="mt-4 flex justify-end">
              <button type="submit" className="btn-primary">
                发送消息
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}