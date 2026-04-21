import Link from 'next/link'
import { revalidatePath } from 'next/cache'
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

type PetMediaRow = {
  id: string
  pet_id: string
  file_path: string
  media_type: 'image' | 'video'
  sort_order: number
  created_at: string
}

type SwipeRow = {
  id: string
  user_id: string
  from_pet_id: string
  to_pet_id: string
  action: string | null
}

type MatchRow = {
  id: string
  user_a_id: string
  user_b_id: string
  pet_a_id: string | null
  pet_b_id: string | null
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

function buildDiscoverUrl(params: {
  fromPet?: string
  type?: string
  gender?: string
  city?: string
  liked?: string
  matched?: string
  skipped?: string
}) {
  const query = new URLSearchParams()

  if (params.fromPet) query.set('from_pet', params.fromPet)
  if (params.type) query.set('type', params.type)
  if (params.gender) query.set('gender', params.gender)
  if (params.city) query.set('city', params.city)
  if (params.liked) query.set('liked', params.liked)
  if (params.matched) query.set('matched', params.matched)
  if (params.skipped) query.set('skipped', params.skipped)

  const qs = query.toString()
  return qs ? `/discover?${qs}` : '/discover'
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams?: Promise<{
    from_pet?: string
    type?: string
    gender?: string
    city?: string
    liked?: string
    matched?: string
    skipped?: string
  }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined

  const currentPetId = String(resolvedSearchParams?.from_pet || '').trim()
  const typeFilter = String(resolvedSearchParams?.type || '').trim()
  const genderFilter = String(resolvedSearchParams?.gender || '').trim()
  const cityFilter = String(resolvedSearchParams?.city || '').trim()
  const likedFlag = String(resolvedSearchParams?.liked || '').trim()
  const matchedFlag = String(resolvedSearchParams?.matched || '').trim()
  const skippedFlag = String(resolvedSearchParams?.skipped || '').trim()

  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">发现</h1>
          <div className="empty-state mt-6 text-sm text-neutral-500">
            请先登录后再查看发现页。
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
          <h1 className="page-title">发现</h1>
          <div className="empty-state mt-6 text-sm text-neutral-500">
            请先完善主人资料。
          </div>
        </div>
      </main>
    )
  }

  const { data: myPets } = await supabase
    .from('pets')
    .select(
      'id, user_id, name, type, breed, gender, age_months, city, bio, created_at'
    )
    .eq('user_id', currentProfile.id)
    .order('created_at', { ascending: false })

  const myPetRows = (myPets ?? []) as PetRow[]
  const selectedPet =
    myPetRows.find((item) => item.id === currentPetId) ?? myPetRows[0] ?? null

  const processedTargetPetIds = new Set<string>()

  if (selectedPet) {
    const { data: mySwipes } = await supabase
      .from('swipes')
      .select('id, user_id, from_pet_id, to_pet_id, action')
      .eq('from_pet_id', selectedPet.id)

    ;((mySwipes ?? []) as SwipeRow[]).forEach((item) => {
      if (item.to_pet_id) processedTargetPetIds.add(item.to_pet_id)
    })

    const { data: myMatches } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id, pet_a_id, pet_b_id')
      .or(`pet_a_id.eq.${selectedPet.id},pet_b_id.eq.${selectedPet.id}`)

    ;((myMatches ?? []) as MatchRow[]).forEach((item) => {
      if (item.pet_a_id && item.pet_a_id !== selectedPet.id) {
        processedTargetPetIds.add(item.pet_a_id)
      }
      if (item.pet_b_id && item.pet_b_id !== selectedPet.id) {
        processedTargetPetIds.add(item.pet_b_id)
      }
    })
  }

  let discoverQuery = supabase
    .from('pets')
    .select(
      'id, user_id, name, type, breed, gender, age_months, city, bio, created_at'
    )
    .neq('user_id', currentProfile.id)
    .order('created_at', { ascending: false })

  if (typeFilter) discoverQuery = discoverQuery.eq('type', typeFilter)
  if (genderFilter) discoverQuery = discoverQuery.eq('gender', genderFilter)
  if (cityFilter) discoverQuery = discoverQuery.ilike('city', `%${cityFilter}%`)

  const { data: discoverPets } = await discoverQuery
  const rawDiscoverPetRows = (discoverPets ?? []) as PetRow[]

  const discoverPetRows = selectedPet
    ? rawDiscoverPetRows.filter((pet) => !processedTargetPetIds.has(pet.id))
    : rawDiscoverPetRows

  const petIds = discoverPetRows.map((item) => item.id)
  const mediaMap = new Map<string, string>()

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
      if (!mediaMap.has(item.pet_id)) {
        const publicUrl = supabase.storage
          .from('pet-media')
          .getPublicUrl(item.file_path).data.publicUrl
        mediaMap.set(item.pet_id, publicUrl)
      }
    }
  }

  async function likePet(formData: FormData) {
    'use server'

    const fromPetId = String(formData.get('from_pet_id') || '').trim()
    const targetPetId = String(formData.get('target_pet_id') || '').trim()
    const type = String(formData.get('type') || '').trim()
    const gender = String(formData.get('gender') || '').trim()
    const city = String(formData.get('city') || '').trim()

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!profile) redirect('/onboarding')

    if (!fromPetId || !targetPetId) {
      redirect(buildDiscoverUrl({ fromPet: fromPetId, type, gender, city }))
    }

    const { data: fromPet } = await supabase
      .from('pets')
      .select('id, user_id')
      .eq('id', fromPetId)
      .maybeSingle()

    const { data: targetPet } = await supabase
      .from('pets')
      .select('id, user_id')
      .eq('id', targetPetId)
      .maybeSingle()

    if (!fromPet || fromPet.user_id !== profile.id || !targetPet) {
      redirect(buildDiscoverUrl({ fromPet: fromPetId, type, gender, city }))
    }

    if (targetPet.user_id === profile.id) {
      redirect(buildDiscoverUrl({ fromPet: fromPetId, type, gender, city }))
    }

    const { data: existingSwipe } = await supabase
      .from('swipes')
      .select('id, user_id, from_pet_id, to_pet_id, action')
      .eq('user_id', profile.id)
      .eq('from_pet_id', fromPetId)
      .eq('to_pet_id', targetPetId)
      .maybeSingle<SwipeRow>()

    if (existingSwipe) {
      await supabase.from('swipes').update({ action: 'like' }).eq('id', existingSwipe.id)
    } else {
      const { error: swipeInsertError } = await supabase.from('swipes').insert({
        user_id: profile.id,
        from_pet_id: fromPetId,
        to_pet_id: targetPetId,
        action: 'like',
      })

      if (swipeInsertError) {
        throw new Error(`写入喜欢记录失败：${swipeInsertError.message}`)
      }
    }

    const { data: reciprocalSwipe } = await supabase
      .from('swipes')
      .select('id, user_id, from_pet_id, to_pet_id, action')
      .eq('from_pet_id', targetPetId)
      .eq('to_pet_id', fromPetId)
      .eq('action', 'like')
      .maybeSingle<SwipeRow>()

    if (reciprocalSwipe) {
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id, user_a_id, user_b_id, pet_a_id, pet_b_id')
        .or(
          `and(pet_a_id.eq.${fromPetId},pet_b_id.eq.${targetPetId}),and(pet_a_id.eq.${targetPetId},pet_b_id.eq.${fromPetId})`
        )
        .maybeSingle<MatchRow>()

      if (existingMatch) {
        revalidatePath('/discover')
        revalidatePath('/messages')
        redirect(`/messages/${existingMatch.id}`)
      }

      const { data: insertedMatch, error: matchInsertError } = await supabase
        .from('matches')
        .insert({
          user_a_id: profile.id,
          user_b_id: targetPet.user_id,
          pet_a_id: fromPetId,
          pet_b_id: targetPetId,
        })
        .select('id')
        .single()

      if (matchInsertError || !insertedMatch) {
        throw new Error(`创建配对失败：${matchInsertError?.message ?? '未知错误'}`)
      }

      revalidatePath('/discover')
      revalidatePath('/messages')
      redirect(`/messages/${insertedMatch.id}`)
    }

    revalidatePath('/discover')
    redirect(
      buildDiscoverUrl({
        fromPet: fromPetId,
        type,
        gender,
        city,
        liked: '1',
      })
    )
  }

  async function skipPet(formData: FormData) {
    'use server'

    const fromPetId = String(formData.get('from_pet_id') || '').trim()
    const targetPetId = String(formData.get('target_pet_id') || '').trim()
    const type = String(formData.get('type') || '').trim()
    const gender = String(formData.get('gender') || '').trim()
    const city = String(formData.get('city') || '').trim()

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!profile) redirect('/onboarding')

    if (!fromPetId || !targetPetId) {
      redirect(buildDiscoverUrl({ fromPet: fromPetId, type, gender, city }))
    }

    const { data: fromPet } = await supabase
      .from('pets')
      .select('id, user_id')
      .eq('id', fromPetId)
      .maybeSingle()

    const { data: targetPet } = await supabase
      .from('pets')
      .select('id, user_id')
      .eq('id', targetPetId)
      .maybeSingle()

    if (!fromPet || fromPet.user_id !== profile.id || !targetPet) {
      redirect(buildDiscoverUrl({ fromPet: fromPetId, type, gender, city }))
    }

    if (targetPet.user_id === profile.id) {
      redirect(buildDiscoverUrl({ fromPet: fromPetId, type, gender, city }))
    }

    const { data: existingSwipe } = await supabase
      .from('swipes')
      .select('id, user_id, from_pet_id, to_pet_id, action')
      .eq('user_id', profile.id)
      .eq('from_pet_id', fromPetId)
      .eq('to_pet_id', targetPetId)
      .maybeSingle<SwipeRow>()

    if (existingSwipe) {
      await supabase.from('swipes').update({ action: 'pass' }).eq('id', existingSwipe.id)
    } else {
      const { error: swipeInsertError } = await supabase.from('swipes').insert({
        user_id: profile.id,
        from_pet_id: fromPetId,
        to_pet_id: targetPetId,
        action: 'pass',
      })

      if (swipeInsertError) {
        throw new Error(`写入跳过记录失败：${swipeInsertError.message}`)
      }
    }

    revalidatePath('/discover')
    redirect(
      buildDiscoverUrl({
        fromPet: fromPetId,
        type,
        gender,
        city,
        skipped: '1',
      })
    )
  }

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">发现</h1>
          <p className="page-subtitle">
            浏览推荐宠物，找到适合交流和配对的小伙伴。
          </p>
        </div>

        {likedFlag === '1' ? (
          <div className="status-success mb-4">已发送喜欢，这只宠物会从当前列表中隐藏。</div>
        ) : null}

        {matchedFlag === '1' ? (
          <div className="status-success mb-4">配对成功，已跳转到聊天。</div>
        ) : null}

        {skippedFlag === '1' ? (
          <div className="status-success mb-4">已跳过，这只宠物不会再出现在当前列表。</div>
        ) : null}

        <section className="card-base p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Starter Pet</div>
              <h2 className="section-title">切换发起配对的宠物</h2>
              <p className="section-desc">
                用不同的宠物发起发现，看到的候选对象也会不同。
              </p>
            </div>
          </div>

          <div className="section-head-divider" />

          {myPetRows.length > 0 ? (
            <form method="get" className="mt-5 flex gap-3">
              <select
                name="from_pet"
                defaultValue={selectedPet?.id ?? ''}
                className="select-base flex-1"
              >
                {myPetRows.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name ?? '未命名宠物'}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-primary shrink-0 px-5">
                切换
              </button>
            </form>
          ) : (
            <div className="empty-state mt-5">
              <div className="empty-state-emoji">🐾</div>
              <h3 className="empty-state-title">你还没有宠物资料</h3>
              <p className="empty-state-desc">
                先去新增宠物后再使用发现功能。
              </p>
            </div>
          )}
        </section>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Filters</div>
              <h2 className="section-title">筛选条件</h2>
              <p className="section-desc">
                按类型、性别和城市缩小范围。
              </p>
            </div>

            <div className="section-meta">
              <Link
                href={selectedPet ? `/discover?from_pet=${selectedPet.id}` : '/discover'}
                className="text-sm text-neutral-500 transition hover:text-neutral-800"
              >
                清空
              </Link>
            </div>
          </div>

          <div className="section-head-divider" />

          <form method="get" className="mt-5 space-y-3">
            {selectedPet ? <input type="hidden" name="from_pet" value={selectedPet.id} /> : null}

            <div className="grid grid-cols-2 gap-3">
              <select name="type" defaultValue={typeFilter} className="select-base">
                <option value="">全部类型</option>
                <option value="cat">只看猫咪</option>
                <option value="dog">只看狗狗</option>
              </select>

              <select name="gender" defaultValue={genderFilter} className="select-base">
                <option value="">全部性别</option>
                <option value="male">只看公</option>
                <option value="female">只看母</option>
              </select>
            </div>

            <input
              type="text"
              name="city"
              defaultValue={cityFilter}
              placeholder="按城市筛选，例如：深圳"
              className="input-base"
            />

            <button type="submit" className="btn-primary w-full">
              应用筛选
            </button>
          </form>
        </section>

        <section className="mt-6 space-y-5">
          {discoverPetRows.length > 0 ? (
            discoverPetRows.map((pet) => {
              const imageUrl = mediaMap.get(pet.id)
              const avatar = petAvatar(pet.type)

              return (
                <article key={pet.id} className="card-base overflow-hidden">
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

                      {selectedPet ? (
                        <>
                          <form action={skipPet} className="flex-1">
                            <input type="hidden" name="from_pet_id" value={selectedPet.id} />
                            <input type="hidden" name="target_pet_id" value={pet.id} />
                            <input type="hidden" name="type" value={typeFilter} />
                            <input type="hidden" name="gender" value={genderFilter} />
                            <input type="hidden" name="city" value={cityFilter} />
                            <button type="submit" className="btn-secondary w-full">
                              跳过
                            </button>
                          </form>

                          <form action={likePet} className="flex-1">
                            <input type="hidden" name="from_pet_id" value={selectedPet.id} />
                            <input type="hidden" name="target_pet_id" value={pet.id} />
                            <input type="hidden" name="type" value={typeFilter} />
                            <input type="hidden" name="gender" value={genderFilter} />
                            <input type="hidden" name="city" value={cityFilter} />
                            <button type="submit" className="btn-primary w-full">
                              喜欢它
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="empty-state">
              <div className="empty-state-emoji">✨</div>
              <h3 className="empty-state-title">当前没有更多可推荐宠物</h3>
              <p className="empty-state-desc">
                已经没有新的候选对象了。你可以切换另一只宠物继续发现，
                或等待更多新宠物加入。
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/me" className="btn-secondary">
                  去我的主页
                </Link>
                <Link href="/matches" className="btn-secondary">
                  去我的配对
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}