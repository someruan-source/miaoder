import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

type UserRow = {
  id: string
  nickname: string | null
  city: string | null
  bio: string | null
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

export default async function PetDetailPage({
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
    .maybeSingle()

  if (!currentProfile) {
    redirect('/onboarding')
  }

  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select(
      'id, user_id, name, type, breed, gender, age_months, city, bio, created_at'
    )
    .eq('id', id)
    .limit(1)
    .maybeSingle<PetRow>()

  if (petError) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <Link href="/me" className="text-sm text-neutral-500">
            ← 返回
          </Link>
          <div className="status-danger mt-6">
            加载宠物详情失败：{petError.message}
          </div>
        </div>
      </main>
    )
  }

  if (!pet) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <Link href="/me" className="text-sm text-neutral-500">
            ← 返回
          </Link>
          <div className="empty-state mt-6">
            <div className="empty-state-emoji">🐾</div>
            <h1 className="empty-state-title">没找到这只宠物</h1>
            <p className="empty-state-desc">当前宠物 id：{id}</p>
            <div className="mt-4">
              <Link href="/me" className="btn-secondary">
                返回我的主页
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const { data: owner } = await supabase
    .from('users')
    .select('id, nickname, city, bio')
    .eq('id', pet.user_id)
    .limit(1)
    .maybeSingle<UserRow>()

  const { data: mediaRows } = await supabase
    .from('pet_media')
    .select('id, pet_id, file_path, media_type, sort_order, created_at')
    .eq('pet_id', pet.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const petMedia = (mediaRows ?? []) as PetMediaRow[]
  const imageItems = petMedia.filter((item) => item.media_type === 'image')
  const videoItems = petMedia.filter((item) => item.media_type === 'video')

  const imageUrls = imageItems.map((item) =>
    supabase.storage.from('pet-media').getPublicUrl(item.file_path).data.publicUrl
  )
  const videoUrls = videoItems.map((item) =>
    supabase.storage.from('pet-media').getPublicUrl(item.file_path).data.publicUrl
  )

  const heroImageUrl = imageUrls[0] ?? null
  const heroVideoUrl = !heroImageUrl ? videoUrls[0] ?? null : null

  const isMine = pet.user_id === currentProfile.id
  const avatar = petAvatar(pet.type)

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <Link
            href={isMine ? '/me' : '/discover'}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            ← 返回
          </Link>
          <p className="page-kicker mt-4">miaoder</p>
          <h1 className="page-title">宠物详情</h1>
          <p className="page-subtitle">
            查看这只宠物的完整资料、图片、视频与主人信息。
          </p>
        </div>

        <section className="card-base overflow-hidden">
          <div className="cover-frame aspect-[4/5] rounded-none">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={pet.name ?? '宠物照片'}
                className="h-full w-full object-cover"
              />
            ) : heroVideoUrl ? (
              <video
                src={heroVideoUrl}
                controls
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-100 to-neutral-200">
                <span className="text-8xl drop-shadow-sm">{avatar}</span>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="section-head">
              <div className="section-head-main">
                <div className="section-kicker">Pet Profile</div>
                <h2 className="section-title-lg">
                  {pet.name ?? '未命名宠物'}
                </h2>
                <p className="section-desc">
                  {petTypeLabel(pet.type)} · {pet.breed ?? '未知品种'}
                </p>
              </div>

              <div className="section-meta">
                <span className="pill-soft shrink-0">
                  {pet.city ?? '未填写城市'}
                </span>
              </div>
            </div>

            <div className="section-head-divider" />

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="pill">类型：{petTypeLabel(pet.type)}</span>
              <span className="pill">品种：{pet.breed ?? '未知'}</span>
              <span className="pill">性别：{petGenderLabel(pet.gender)}</span>
              <span className="pill">月龄：{pet.age_months ?? '未知'}</span>
              <span className="pill">城市：{pet.city ?? '未填写'}</span>
            </div>

            <div className="mt-5 card-soft p-5">
              <div className="section-head-tight">
                <div className="section-head-main">
                  <div className="section-kicker">About</div>
                  <h3 className="section-title">宠物简介</h3>
                </div>
              </div>

              <div className="section-head-divider" />

              <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-neutral-700">
                {pet.bio?.trim() || '这只小可爱还没有填写简介。'}
              </p>
            </div>

            {(imageUrls.length > 0 || videoUrls.length > 0) ? (
              <div className="mt-5 card-soft p-5">
                <div className="section-head-tight">
                  <div className="section-head-main">
                    <div className="section-kicker">Media</div>
                    <h3 className="section-title">宠物媒体</h3>
                  </div>
                  <div className="section-meta">
                    <span className="pill-soft">
                      {imageUrls.length + videoUrls.length} 个内容
                    </span>
                  </div>
                </div>

                <div className="section-head-divider" />

                <div className="mt-4 space-y-4">
                  {imageUrls.map((url, index) => (
                    <div key={`image-${url}-${index}`} className="cover-frame aspect-[4/3]">
                      <img
                        src={url}
                        alt={`${pet.name ?? '宠物'} 图片 ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}

                  {videoUrls.map((url, index) => (
                    <div key={`video-${url}-${index}`} className="cover-frame aspect-[4/3]">
                      <video
                        src={url}
                        controls
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Owner</div>
              <h3 className="section-title">宠物主人</h3>
              <p className="section-desc">认识一下这只宠物背后的主人。</p>
            </div>

            <div className="section-meta">
              {isMine ? <span className="pill-soft">我的宠物</span> : null}
            </div>
          </div>

          <div className="section-head-divider" />

          <div className="mt-5 grid gap-3">
            <div className="card-soft p-4">
              <div className="text-xs font-medium text-neutral-400">昵称</div>
              <div className="mt-2 text-base font-semibold text-neutral-900">
                {owner?.nickname ?? '未设置昵称'}
              </div>
            </div>

            <div className="card-soft p-4">
              <div className="text-xs font-medium text-neutral-400">所在城市</div>
              <div className="mt-2 text-base font-semibold text-neutral-900">
                {owner?.city ?? pet.city ?? '未填写城市'}
              </div>
            </div>

            <div className="card-soft p-4">
              <div className="text-xs font-medium text-neutral-400">主人简介</div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
                {owner?.bio?.trim() || '主人还没有填写简介。'}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {isMine ? (
              <>
                <Link href={`/pets/${pet.id}/edit`} className="btn-primary">
                  编辑宠物
                </Link>
                <Link href="/me" className="btn-secondary">
                  返回我的主页
                </Link>
              </>
            ) : (
              <>
                <Link href="/discover" className="btn-primary">
                  返回发现页
                </Link>
                <Link href="/messages" className="btn-secondary">
                  去消息列表
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}