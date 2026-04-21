import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function EditMePage() {
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
    .maybeSingle()

  if (!profile) {
    redirect('/onboarding')
  }

  async function updateProfile(formData: FormData) {
    'use server'

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: currentProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!currentProfile) {
      redirect('/onboarding')
    }

    const nickname = String(formData.get('nickname') || '').trim()
    const city = String(formData.get('city') || '').trim()
    const bio = String(formData.get('bio') || '').trim()

    const { error } = await supabase
      .from('users')
      .update({
        nickname: nickname || null,
        city: city || null,
        bio: bio || null,
      })
      .eq('id', currentProfile.id)

    if (error) {
      throw new Error(`保存资料失败：${error.message}`)
    }

    revalidatePath('/me')
    redirect('/me')
  }

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <Link
            href="/me"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            ← 返回我的
          </Link>
          <p className="page-kicker mt-4">miaoder</p>
          <h1 className="page-title">编辑资料</h1>
          <p className="page-subtitle">
            更新你的主人信息，让别人更容易认识你。
          </p>
        </div>

        <section className="card-base p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-neutral-900">
                主人信息
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                昵称、城市和简介会展示在你的个人页面中。
              </p>
            </div>

            <span className="pill-soft shrink-0">
              邮箱：{profile.email ?? authUser.email ?? '未填写'}
            </span>
          </div>

          <form action={updateProfile} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                昵称
              </label>
              <input
                name="nickname"
                type="text"
                defaultValue={profile.nickname ?? ''}
                placeholder="例如：壮壮妈、橘子爸爸"
                className="input-base"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                城市
              </label>
              <input
                name="city"
                type="text"
                defaultValue={profile.city ?? ''}
                placeholder="例如：深圳"
                className="input-base"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                简介
              </label>
              <textarea
                name="bio"
                rows={6}
                defaultValue={profile.bio ?? ''}
                placeholder="介绍一下你和宠物的日常，也可以写你想认识怎样的朋友。"
                className="textarea-base"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/me" className="btn-secondary flex-1">
                取消
              </Link>
              <button type="submit" className="btn-primary flex-1">
                保存资料
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}