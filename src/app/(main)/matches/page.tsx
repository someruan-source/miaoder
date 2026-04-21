import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type MatchRow = {
  id: string
  user_a_id: string
  user_b_id: string
  pet_a_id: string | null
  pet_b_id: string | null
  created_at: string | null
}

type PetRow = {
  id: string
  user_id: string
  name: string | null
  type: string | null
  breed: string | null
  city: string | null
}

type UserRow = {
  id: string
  nickname: string | null
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

function petTypeLabel(type: string | null) {
  if (type === 'dog') return '狗狗'
  if (type === 'cat') return '猫咪'
  return '未知类型'
}

export default async function MatchesPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">配对</h1>
          <div className="empty-state mt-6 text-sm text-neutral-500">
            请先登录后再查看配对页。
          </div>
        </div>
      </main>
    )
  }

  const { data: currentProfile } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!currentProfile) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">配对</h1>
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

  const userIds = [
    ...new Set(matchRows.flatMap((m) => [m.user_a_id, m.user_b_id])),
  ]

  const petIds = [
    ...new Set(
      matchRows.flatMap((m) => [m.pet_a_id, m.pet_b_id].filter(Boolean))
    ),
  ] as string[]

  const userMap = new Map<string, UserRow>()
  const petMap = new Map<string, PetRow>()
  const petImageMap = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, nickname')
      .in('id', userIds)

    ;(users ?? []).forEach((item) => {
      userMap.set(item.id, item as UserRow)
    })
  }

  if (petIds.length > 0) {
    const { data: pets } = await supabase
      .from('pets')
      .select('id, user_id, name, type, breed, city')
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

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">配对</h1>
          <p className="page-subtitle">
            查看已经互相喜欢成功的宠物配对记录。
          </p>
        </div>

        <section className="card-base p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Matches</div>
              <h2 className="section-title">配对记录</h2>
              <p className="section-desc">
                当前共 {matchRows.length} 条成功配对
              </p>
            </div>

            <div className="section-meta">
              <span className="pill-soft">实时</span>
            </div>
          </div>

          <div className="section-head-divider" />
        </section>

        <section className="mt-6 space-y-5">
          {matchRows.length > 0 ? (
            matchRows.map((match) => {
              const isUserA = match.user_a_id === currentProfile.id

              const myPetId = isUserA ? match.pet_a_id : match.pet_b_id
              const otherPetId = isUserA ? match.pet_b_id : match.pet_a_id
              const otherUserId = isUserA ? match.user_b_id : match.user_a_id

              const myPet = myPetId ? petMap.get(myPetId) : undefined
              const otherPet = otherPetId ? petMap.get(otherPetId) : undefined
              const otherUser = userMap.get(otherUserId)

              const otherImageUrl = otherPetId
                ? petImageMap.get(otherPetId)
                : undefined
              const otherAvatar = petAvatar(otherPet?.type ?? null)

              return (
                <article key={match.id} className="card-base overflow-hidden p-5">
                  <div className="flex items-start gap-4">
                    <div className="avatar-frame h-20 w-20 shrink-0 rounded-[20px]">
                      {otherImageUrl ? (
                        <img
                          src={otherImageUrl}
                          alt={otherPet?.name ?? '配对宠物头像'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 to-neutral-200 text-4xl">
                          {otherAvatar}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-3xl font-black tracking-tight text-neutral-900">
                            {otherPet?.name ?? '未命名宠物'}
                          </h3>
                          <p className="mt-1 text-sm text-neutral-500">
                            {petTypeLabel(otherPet?.type ?? null)} ·{' '}
                            {otherPet?.breed ?? '未知品种'}
                          </p>
                        </div>

                        <span className="pill-soft shrink-0">
                          {otherPet?.city ?? '未填写城市'}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="pill">
                          对方主人：{otherUser?.nickname ?? '匿名用户'}
                        </span>
                        <span className="pill">
                          我的宠物：{myPet?.name ?? '未命名宠物'}
                        </span>
                      </div>

                      <div className="mt-4 rounded-[20px] bg-neutral-50 px-4 py-3">
                        <p className="text-sm leading-6 text-neutral-600">
                          你和 {otherPet?.name ?? '这只宠物'} 已经互相喜欢成功，可以继续聊天认识彼此。
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-xs text-neutral-400">
                          {match.created_at
                            ? new Date(match.created_at).toLocaleString()
                            : '未知时间'}
                        </div>

                        <div className="flex gap-3">
                          {otherPetId ? (
                            <Link
                              href={`/pets/${otherPetId}`}
                              className="btn-secondary px-4 py-2"
                            >
                              看它详情
                            </Link>
                          ) : null}
                          <Link
                            href={`/messages/${match.id}`}
                            className="btn-primary px-4 py-2"
                          >
                            去聊天
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="empty-state">
              <div className="empty-state-emoji">💞</div>
              <h3 className="empty-state-title">还没有成功配对</h3>
              <p className="empty-state-desc">
                去发现页给喜欢的宠物点个赞，等双方互相喜欢后，这里就会出现配对记录。
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