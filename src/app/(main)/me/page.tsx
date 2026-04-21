import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type UserProfile = {
  id: string
  nickname: string | null
  email: string | null
  city: string | null
  bio: string | null
}

type PetRow = {
  id: string
  user_id: string
  name: string | null
  type: string | null
  breed: string | null
  gender: string | null
  age_months: number | null
  city: string | null
  bio: string | null
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

function petTypeLabel(type: string | null) {
  if (type === 'dog') return '狗狗'
  if (type === 'cat') return '猫咪'
  return '未知类型'
}

function petGenderLabel(gender: string | null) {
  if (gender === 'male') return '公'
  if (gender === 'female') return '母'
  return '未知'
}

export default async function MePage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, nickname, email, city, bio')
    .eq('auth_user_id', authUser.id)
    .maybeSingle<UserProfile>()

  if (!profile) {
    redirect('/onboarding')
  }

  const { data: pets } = await supabase
    .from('pets')
    .select(
      'id, user_id, name, type, breed, gender, age_months, city, bio, created_at'
    )
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const petRows = (pets ?? []) as PetRow[]
  const petIds = petRows.map((item) => item.id)

  const petImageMap = new Map<string, string>()

  if (petIds.length > 0) {
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

  const [{ count: postCount }, { count: commentCount }, { count: likeCount }, { count: matchCount }] =
    await Promise.all([
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id),
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id),
      supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id),
      supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`),
    ])

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">我的</h1>
          <p className="page-subtitle">
            查看你的主人资料、宠物档案、互动记录和快捷入口。
          </p>
        </div>

        <section className="card-base p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Profile</div>
              <h2 className="section-title">主人资料</h2>
              <p className="section-desc">这是别人认识你的第一印象。</p>
            </div>

            <div className="section-meta">
              <Link href="/me/edit" className="btn-secondary shrink-0">
                编辑资料
              </Link>
            </div>
          </div>

          <div className="section-head-divider" />

          <div className="mt-5 grid gap-3">
            <div className="card-soft p-4">
              <div className="text-xs font-medium text-neutral-400">昵称</div>
              <div className="mt-2 text-base font-semibold text-neutral-900">
                {profile.nickname ?? '未设置昵称'}
              </div>
            </div>

            <div className="card-soft p-4">
              <div className="text-xs font-medium text-neutral-400">邮箱</div>
              <div className="mt-2 break-all text-base font-semibold text-neutral-900">
                {profile.email ?? authUser.email ?? '未填写邮箱'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card-soft p-4">
                <div className="text-xs font-medium text-neutral-400">城市</div>
                <div className="mt-2 text-base font-semibold text-neutral-900">
                  {profile.city ?? '未填写'}
                </div>
              </div>

              <div className="card-soft p-4">
                <div className="text-xs font-medium text-neutral-400">宠物数量</div>
                <div className="mt-2 text-base font-semibold text-neutral-900">
                  {petRows.length} 只
                </div>
              </div>
            </div>

            <div className="card-soft p-4">
              <div className="text-xs font-medium text-neutral-400">简介</div>
              <p className="mt-2 text-sm leading-7 text-neutral-600">
                {profile.bio?.trim() || '还没有填写简介'}
              </p>
            </div>
          </div>
        </section>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Stats</div>
              <h2 className="section-title">我的数据</h2>
              <p className="section-desc">实时统计你的活跃情况</p>
            </div>

            <div className="section-meta">
              <span className="pill-soft">实时</span>
            </div>
          </div>

          <div className="section-head-divider" />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="card-soft p-4">
              <div className="text-sm text-neutral-500">我的宠物</div>
              <div className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
                {petRows.length}
              </div>
            </div>

            <div className="card-soft p-4">
              <div className="text-sm text-neutral-500">我的帖子</div>
              <div className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
                {postCount ?? 0}
              </div>
            </div>

            <div className="card-soft p-4">
              <div className="text-sm text-neutral-500">我的评论</div>
              <div className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
                {commentCount ?? 0}
              </div>
            </div>

            <div className="card-soft p-4">
              <div className="text-sm text-neutral-500">我的配对</div>
              <div className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
                {matchCount ?? 0}
              </div>
            </div>

            <div className="card-soft p-4">
              <div className="text-sm text-neutral-500">我的点赞</div>
              <div className="mt-3 text-3xl font-black tracking-tight text-neutral-900">
                {likeCount ?? 0}
              </div>
            </div>
          </div>
        </section>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Pets</div>
              <h2 className="section-title">我的宠物</h2>
              <p className="section-desc">
                管理你的宠物资料、图片和展示内容。
              </p>
            </div>

            <div className="section-meta">
              <Link href="/pets/new" className="btn-primary shrink-0">
                新增宠物
              </Link>
            </div>
          </div>

          <div className="section-head-divider" />

          <div className="mt-5 space-y-5">
            {petRows.length > 0 ? (
              petRows.map((pet) => {
                const imageUrl = petImageMap.get(pet.id)
                const avatar = petAvatar(pet.type)

                return (
                  <article key={pet.id} className="card-soft overflow-hidden">
                    <div className="cover-frame aspect-[4/3]">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={pet.name ?? '宠物图片'}
                          className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-neutral-200">
                          <span className="text-7xl drop-shadow-sm">{avatar}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-3xl font-black tracking-tight text-neutral-900">
                            {pet.name ?? '未命名宠物'}
                          </h3>
                          <p className="mt-2 text-sm text-neutral-500">
                            {petTypeLabel(pet.type)} · {pet.breed ?? '未知品种'}
                          </p>
                        </div>

                        <span className="pill-soft shrink-0">
                          {pet.city ?? '未填写城市'}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="pill">性别：{petGenderLabel(pet.gender)}</span>
                        <span className="pill">月龄：{pet.age_months ?? '未知'}</span>
                      </div>

                      <p className="mt-4 line-clamp-3 text-sm leading-7 text-neutral-600">
                        {pet.bio?.trim() || '这只小可爱还没有填写简介。'}
                      </p>

                      <div className="mt-5 flex gap-3">
                        <Link href={`/pets/${pet.id}`} className="btn-secondary flex-1">
                          查看详情
                        </Link>
                        <Link href={`/pets/${pet.id}/edit`} className="btn-primary flex-1">
                          编辑宠物
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="empty-state">
                <div className="empty-state-emoji">🐾</div>
                <h3 className="empty-state-title">你还没有添加宠物</h3>
                <p className="empty-state-desc">先去新增一只吧。</p>
              </div>
            )}
          </div>
        </section>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Shortcuts</div>
              <h2 className="section-title">快捷入口</h2>
              <p className="section-desc">常用功能一步进入。</p>
            </div>
          </div>

          <div className="section-head-divider" />

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/me/posts" className="card-soft p-4 transition hover:bg-white">
              <div className="text-base font-bold text-neutral-900">我的帖子</div>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                查看我发过的全部内容。
              </p>
            </Link>

            <Link href="/me/likes" className="card-soft p-4 transition hover:bg-white">
              <div className="text-base font-bold text-neutral-900">我的点赞</div>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                查看我收藏和点赞过的帖子。
              </p>
            </Link>

            <Link href="/matches" className="card-soft p-4 transition hover:bg-white">
              <div className="text-base font-bold text-neutral-900">我的配对</div>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                查看当前已经成功的配对记录。
              </p>
            </Link>

            <Link href="/discover" className="card-soft p-4 transition hover:bg-white">
              <div className="text-base font-bold text-neutral-900">去发现页</div>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                继续给宠物寻找新的小伙伴。
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}