import Link from 'next/link'
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

export default async function MessagesPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">消息</h1>
          <div className="empty-state mt-6 text-sm text-neutral-500">
            请先登录后再查看消息页。
          </div>
        </div>
      </main>
    )
  }

  const { data: currentProfile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle<UserRow>()

  if (!currentProfile) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">消息</h1>
          <div className="empty-state mt-6 text-sm text-neutral-500">
            请先完善主人资料。
          </div>
        </div>
      </main>
    )
  }

  const { data: matches } = await supabase
    .from('matches')
    .select('id, user_a_id, user_b_id, pet_a_id, pet_b_id, created_at')
    .or(`user_a_id.eq.${currentProfile.id},user_b_id.eq.${currentProfile.id}`)
    .order('created_at', { ascending: false })

  const matchRows = (matches ?? []) as MatchRow[]

  const otherUserIds = [
    ...new Set(
      matchRows.map((item) =>
        item.user_a_id === currentProfile.id ? item.user_b_id : item.user_a_id
      )
    ),
  ]

  const petIds = [
    ...new Set(
      matchRows.flatMap((item) => [item.pet_a_id, item.pet_b_id].filter(Boolean))
    ),
  ] as string[]

  const matchIds = matchRows.map((item) => item.id)

  const userMap = new Map<string, UserRow>()
  const petMap = new Map<string, PetRow>()
  const petImageMap = new Map<string, string>()
  const latestMessageMap = new Map<string, MessageRow>()
  const unreadCountMap = new Map<string, number>()

  if (otherUserIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, nickname')
      .in('id', otherUserIds)

    ;(users ?? []).forEach((item) => {
      userMap.set(item.id, item as UserRow)
    })
  }

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

  if (matchIds.length > 0) {
    const { data: messages } = await supabase
      .from('messages')
      .select('id, match_id, sender_user_id, content, is_read, created_at')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false })

    const typedMessages = (messages ?? []) as MessageRow[]

    for (const msg of typedMessages) {
      if (!latestMessageMap.has(msg.match_id)) {
        latestMessageMap.set(msg.match_id, msg)
      }

      const isUnread =
        msg.sender_user_id !== currentProfile.id && msg.is_read === false
      if (isUnread) {
        unreadCountMap.set(msg.match_id, (unreadCountMap.get(msg.match_id) ?? 0) + 1)
      }
    }
  }

  const totalUnread = [...unreadCountMap.values()].reduce((sum, n) => sum + n, 0)

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">消息</h1>
          <p className="page-subtitle">
            查看配对成功后的聊天会话，继续和对方主人交流。
          </p>
        </div>

        <section className="card-base p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Inbox</div>
              <h2 className="section-title">最近消息</h2>
              <p className="section-desc">
                你当前有 {matchRows.length} 个真实会话
              </p>
            </div>

            <div className="section-meta text-right">
              <div className="pill-soft">数据库版</div>
              <div className="mt-2 text-xs text-neutral-400">未读 {totalUnread} 条</div>
            </div>
          </div>

          <div className="section-head-divider" />
        </section>

        <section className="mt-6 space-y-4">
          {matchRows.length > 0 ? (
            matchRows.map((match) => {
              const otherUserId =
                match.user_a_id === currentProfile.id ? match.user_b_id : match.user_a_id

              const otherPetId =
                match.user_a_id === currentProfile.id ? match.pet_b_id : match.pet_a_id

              const otherUser = userMap.get(otherUserId)
              const otherPet = otherPetId ? petMap.get(otherPetId) : undefined
              const latestMessage = latestMessageMap.get(match.id)
              const unreadCount = unreadCountMap.get(match.id) ?? 0
              const imageUrl = otherPetId ? petImageMap.get(otherPetId) : undefined
              const avatar = petAvatar(otherPet?.type ?? null)

              return (
                <article key={match.id} className="card-base p-5">
                  <div className="flex items-start gap-4">
                    <div className="avatar-frame h-18 w-18 shrink-0 overflow-hidden rounded-[20px] bg-neutral-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={otherPet?.name ?? '宠物头像'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">
                          {avatar}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-2xl font-black tracking-tight text-neutral-900">
                            {otherUser?.nickname ?? '对方用户'}
                          </h3>
                          <p className="mt-1 text-sm text-neutral-500">
                            已和 {otherPet?.name ?? '对方宠物'} 配对成功
                          </p>
                        </div>

                        {unreadCount > 0 ? (
                          <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">
                            {unreadCount} 条未读
                          </span>
                        ) : (
                          <span className="pill">已读</span>
                        )}
                      </div>

                      <div className="mt-4 rounded-[20px] bg-neutral-50 px-4 py-3">
                        <p className="line-clamp-2 text-sm leading-6 text-neutral-600">
                          {latestMessage?.content?.trim() || '还没有消息内容'}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-xs text-neutral-400">
                          {latestMessage?.created_at
                            ? new Date(latestMessage.created_at).toLocaleString()
                            : match.created_at
                              ? new Date(match.created_at).toLocaleString()
                              : '未知时间'}
                        </div>

                        <Link
                          href={`/messages/${match.id}`}
                          className="btn-primary px-4 py-2"
                        >
                          进入聊天
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="empty-state">
              <div className="empty-state-emoji">💬</div>
              <h3 className="empty-state-title">还没有聊天会话</h3>
              <p className="empty-state-desc">
                先去发现页互相喜欢，生成配对后这里就会出现消息列表。
              </p>
              <div className="mt-5">
                <Link href="/discover" className="btn-secondary">
                  去发现页
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}