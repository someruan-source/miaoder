import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type PostRow = {
  id: string
  user_id: string
  title: string | null
  content: string | null
  city: string | null
  category: string | null
  status: string | null
}

type PostMediaRow = {
  id: string
  post_id: string
  file_path: string
  media_type: 'image' | 'video'
  sort_order: number
  created_at: string
}

export default async function EditCommunityPostPage({
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

  const { data: post } = await supabase
    .from('posts')
    .select('id, user_id, title, content, city, category, status')
    .eq('id', id)
    .maybeSingle<PostRow>()

  if (!post) {
    notFound()
  }

  if (post.user_id !== currentProfile.id) {
    redirect(`/community/${id}`)
  }

  const { data: mediaRows } = await supabase
    .from('post_media')
    .select('id, post_id, file_path, media_type, sort_order, created_at')
    .eq('post_id', post.id)
    .eq('media_type', 'image')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const firstImage = ((mediaRows ?? []) as PostMediaRow[])[0]
  const currentImage = firstImage
    ? supabase.storage.from('post-media').getPublicUrl(firstImage.file_path).data
        .publicUrl
    : null

  async function updatePost(formData: FormData) {
    'use server'

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

    const postId = String(formData.get('post_id') || '').trim()
    const city = String(formData.get('city') || '').trim()
    const category = String(formData.get('category') || '').trim()
    const title = String(formData.get('title') || '').trim()
    const content = String(formData.get('content') || '').trim()
    const photo = formData.get('photo')

    if (!postId) throw new Error('缺少帖子 id')

    const { data: existingPost } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .maybeSingle()

    if (!existingPost || existingPost.user_id !== profile.id) {
      throw new Error('你无权编辑这篇帖子')
    }

    if (!title) throw new Error('请填写标题')
    if (!content) throw new Error('请填写正文')

    const { error: updateError } = await supabase
      .from('posts')
      .update({
        city: city || null,
        category: category || null,
        title,
        content,
      })
      .eq('id', postId)

    if (updateError) {
      throw new Error(`更新帖子失败：${updateError.message}`)
    }

    if (photo instanceof File && photo.size > 0) {
      const { data: existingMedia } = await supabase
        .from('post_media')
        .select('id, post_id, file_path, media_type, sort_order, created_at')
        .eq('post_id', postId)
        .eq('media_type', 'image')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      const ext = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
      const filePath = `${profile.id}/${postId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(filePath, photo, {
          cacheControl: '3600',
          upsert: false,
          contentType: photo.type || undefined,
        })

      if (uploadError) {
        throw new Error(`图片上传失败：${uploadError.message}`)
      }

      const firstMediaRow = ((existingMedia ?? []) as PostMediaRow[])[0]

      if (firstMediaRow) {
        const { error: mediaUpdateError } = await supabase
          .from('post_media')
          .update({
            file_path: filePath,
            media_type: 'image',
            sort_order: 0,
          })
          .eq('id', firstMediaRow.id)

        if (mediaUpdateError) {
          throw new Error(`媒体记录更新失败：${mediaUpdateError.message}`)
        }
      } else {
        const { error: mediaInsertError } = await supabase.from('post_media').insert({
          post_id: postId,
          file_path: filePath,
          media_type: 'image',
          sort_order: 0,
        })

        if (mediaInsertError) {
          throw new Error(`媒体记录写入失败：${mediaInsertError.message}`)
        }
      }
    }

    revalidatePath('/community')
    revalidatePath(`/community/${postId}`)
    revalidatePath(`/community/${postId}/edit`)
    redirect(`/community/${postId}`)
  }

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <Link
            href={`/community/${post.id}`}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            ← 返回帖子详情
          </Link>
          <p className="page-kicker mt-4">miaoder</p>
          <h1 className="page-title">编辑帖子</h1>
          <p className="page-subtitle">
            调整你的标题、正文和图片，让内容表达得更清楚。
          </p>
        </div>

        <section className="card-base p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Post Form</div>
              <h2 className="section-title">帖子内容</h2>
              <p className="section-desc">
                修改后会立即展示在社区和帖子详情中。
              </p>
            </div>

            <div className="section-meta">
              <span className="pill-soft shrink-0">
                作者：{currentProfile.nickname ?? '你'}
              </span>
            </div>
          </div>

          <div className="section-head-divider" />

          {currentImage ? (
            <div className="mt-5">
              <div className="cover-frame aspect-[4/3]">
                <img
                  src={currentImage}
                  alt={post.title ?? '当前帖子图片'}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 text-xs text-neutral-400">当前首图</p>
            </div>
          ) : null}

          <form action={updatePost} className="mt-5 space-y-4">
            <input type="hidden" name="post_id" value={post.id} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700">
                  城市
                </label>
                <input
                  name="city"
                  type="text"
                  defaultValue={post.city ?? ''}
                  placeholder="例如：杭州"
                  className="input-base"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-neutral-700">
                  分类
                </label>
                <select
                  name="category"
                  className="select-base"
                  defaultValue={post.category ?? ''}
                >
                  <option value="">请选择</option>
                  <option value="help">求助</option>
                  <option value="share">分享</option>
                  <option value="experience">经验</option>
                  <option value="adopt">领养</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                标题
              </label>
              <input
                name="title"
                type="text"
                defaultValue={post.title ?? ''}
                placeholder="例如：两只公猫能不能一起养？"
                className="input-base"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                正文
              </label>
              <textarea
                name="content"
                rows={8}
                defaultValue={post.content ?? ''}
                placeholder="把你的情况写清楚一点，例如背景、经过、目前最困扰的问题。"
                className="textarea-base"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                更换配图
              </label>

              <div className="hint-card">
                <input
                  name="photo"
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black"
                />
                <div className="mt-4">
                  <div className="hint-title">更换说明</div>
                  <p className="hint-desc">
                    不上传则保留原图。上传新图后会替换当前首图。
                  </p>
                </div>
              </div>
            </div>

            <div className="status-info">
              建议尽量使用清晰图片，社区列表首图和帖子详情展示会更自然。
            </div>

            <div className="flex gap-3 pt-2">
              <Link href={`/community/${post.id}`} className="btn-secondary flex-1">
                取消
              </Link>
              <button type="submit" className="btn-primary flex-1">
                保存修改
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}