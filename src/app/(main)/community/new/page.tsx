import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PostCreateForm from '@/components/post-create-form'

type UploadedMedia = {
  filePath: string
  mediaType: 'image' | 'video'
  sortOrder: number
}

export default async function NewCommunityPostPage() {
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

  async function createPost(formData: FormData) {
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

    const city = String(formData.get('city') || '').trim()
    const category = String(formData.get('category') || '').trim()
    const title = String(formData.get('title') || '').trim()
    const content = String(formData.get('content') || '').trim()
    const uploadedMediaJson = String(formData.get('uploaded_media_json') || '[]')

    if (!title) throw new Error('请填写标题')
    if (!content) throw new Error('请填写正文')

    let uploadedMedia: UploadedMedia[] = []

    try {
      uploadedMedia = JSON.parse(uploadedMediaJson) as UploadedMedia[]
    } catch {
      uploadedMedia = []
    }

    const { data: insertedPost, error: postInsertError } = await supabase
      .from('posts')
      .insert({
        user_id: profile.id,
        city: city || null,
        category: category || null,
        title,
        content,
        status: 'published',
      })
      .select('id')
      .single()

    if (postInsertError || !insertedPost) {
      throw new Error(`发布帖子失败：${postInsertError?.message ?? '未知错误'}`)
    }

    if (uploadedMedia.length > 0) {
      const rows = uploadedMedia.map((item) => ({
        post_id: insertedPost.id,
        file_path: item.filePath,
        media_type: item.mediaType,
        sort_order: item.sortOrder,
      }))

      const { error: mediaInsertError } = await supabase.from('post_media').insert(rows)

      if (mediaInsertError) {
        throw new Error(`媒体记录写入失败：${mediaInsertError.message}`)
      }
    }

    revalidatePath('/community')
    revalidatePath(`/community/${insertedPost.id}`)
    redirect(`/community/${insertedPost.id}`)
  }

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <Link
            href="/community"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            ← 返回社区
          </Link>
          <p className="page-kicker mt-4">miaoder</p>
          <h1 className="page-title">发布帖子</h1>
          <p className="page-subtitle">
            分享你的经验、困惑和故事，也可以上传图片或视频让内容更完整。
          </p>
        </div>

        <PostCreateForm
          ownerId={currentProfile.id}
          ownerName={currentProfile.nickname ?? '你'}
          action={createPost}
        />
      </div>
    </main>
  )
}