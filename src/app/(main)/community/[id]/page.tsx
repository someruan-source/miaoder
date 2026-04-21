import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import CommentComposer from '@/components/comment-composer'

type PostRow = {
  id: string
  user_id: string
  title: string | null
  content: string | null
  city: string | null
  category: string | null
  status: string | null
  created_at: string | null
}

type UserRow = {
  id: string
  nickname: string | null
}

type CommentRow = {
  id: string
  user_id: string
  content: string | null
  created_at: string | null
}

type PostMediaRow = {
  id: string
  post_id: string
  file_path: string
  media_type: 'image' | 'video'
  sort_order: number
  created_at: string
}

function categoryLabel(category: string | null) {
  if (category === 'help') return '求助'
  if (category === 'share') return '分享'
  if (category === 'experience') return '经验'
  if (category === 'adopt') return '领养'
  return '帖子'
}

export default async function CommunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ confirmDelete?: string }>
}) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const confirmDelete = String(resolvedSearchParams?.confirmDelete || '').trim() === '1'

  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const currentProfile = authUser
    ? await supabase
        .from('users')
        .select('id, nickname')
        .eq('auth_user_id', authUser.id)
        .maybeSingle<UserRow>()
    : { data: null }

  const { data: post, error } = await supabase
    .from('posts')
    .select('id, user_id, title, content, city, category, status, created_at')
    .eq('id', id)
    .maybeSingle<PostRow>()

  if (error) {
    return (
      <main className="page-shell">
        <div className="page-wrap">
          <Link href="/community" className="text-sm text-neutral-500">
            ← 返回社区
          </Link>
          <div className="status-danger mt-6">加载帖子失败：{error.message}</div>
        </div>
      </main>
    )
  }

  if (!post) {
    notFound()
  }

  const [{ data: author }, { data: comments }, { data: mediaRows }] = await Promise.all([
    supabase
      .from('users')
      .select('id, nickname')
      .eq('id', post.user_id)
      .maybeSingle<UserRow>(),
    supabase
      .from('comments')
      .select('id, user_id, content, created_at')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('post_media')
      .select('id, post_id, file_path, media_type, sort_order, created_at')
      .eq('post_id', post.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const typedComments = (comments ?? []) as CommentRow[]
  const typedMedia = (mediaRows ?? []) as PostMediaRow[]

  const imageUrls = typedMedia
    .filter((item) => item.media_type === 'image')
    .map((item) => supabase.storage.from('post-media').getPublicUrl(item.file_path).data.publicUrl)

  const videoUrls = typedMedia
    .filter((item) => item.media_type === 'video')
    .map((item) => supabase.storage.from('post-media').getPublicUrl(item.file_path).data.publicUrl)

  const commentUserIds = [...new Set(typedComments.map((item) => item.user_id))]
  const commentUserMap = new Map<string, string>()

  if (commentUserIds.length > 0) {
    const { data: commentUsers } = await supabase
      .from('users')
      .select('id, nickname')
      .in('id', commentUserIds)

    ;(commentUsers ?? []).forEach((item) => {
      const row = item as UserRow
      commentUserMap.set(row.id, row.nickname ?? '匿名用户')
    })
  }

  async function createComment(formData: FormData) {
    'use server'

    const postId = String(formData.get('post_id') || '').trim()
    const content = String(formData.get('content') || '').trim()

    if (!postId) throw new Error('缺少帖子 id')
    if (!content) throw new Error('评论内容不能为空')

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

    const { error: insertError } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: profile.id,
      content,
    })

    if (insertError) {
      throw new Error(`发表评论失败：${insertError.message}`)
    }

    revalidatePath('/community')
    revalidatePath(`/community/${postId}`)
    redirect(`/community/${postId}`)
  }

  async function deletePost(formData: FormData) {
    'use server'

    const postId = String(formData.get('post_id') || '').trim()
    if (!postId) throw new Error('缺少帖子 id')

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

    const { data: existingPost } = await supabase
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .maybeSingle()

    if (!existingPost || existingPost.user_id !== profile.id) {
      throw new Error('你无权删除这篇帖子')
    }

    const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId)

    if (deleteError) {
      throw new Error(`删除帖子失败：${deleteError.message}`)
    }

    revalidatePath('/community')
    redirect('/community')
  }

  const isOwner = currentProfile.data?.id === post.user_id

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
          <h1 className="page-title">帖子详情</h1>
        </div>

        <article className="card-base overflow-hidden">
          {imageUrls.length > 0 ? (
            <div className="space-y-3 p-3 pb-0">
              {imageUrls.map((url, index) => (
                <div key={url + index} className="cover-frame aspect-[4/3]">
                  <img
                    src={url}
                    alt={post.title ?? '帖子图片'}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}

          {videoUrls.length > 0 ? (
            <div className="space-y-3 p-3 pb-0">
              {videoUrls.map((url, index) => (
                <div key={url + index} className="cover-frame aspect-[4/3]">
                  <video
                    src={url}
                    controls
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}

          <div className="p-5">
            <div className="section-head">
              <div className="section-head-main">
                <div className="section-kicker">Post</div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="pill-soft">{post.city ?? '未填写城市'}</span>
                  <span className="pill">{categoryLabel(post.category)}</span>
                  {videoUrls.length > 0 ? <span className="pill">含视频</span> : null}
                </div>

                <h2 className="mt-4 text-3xl font-black tracking-tight text-neutral-900">
                  {post.title ?? '未命名帖子'}
                </h2>

                <p className="section-desc mt-3">
                  来自 {author?.nickname ?? '匿名用户'} 的社区分享
                </p>
              </div>

              <div className="section-meta">
                <span className="pill shrink-0">{post.status ?? 'published'}</span>
              </div>
            </div>

            <div className="section-head-divider" />

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-500">
              <span className="pill-soft">作者：{author?.nickname ?? '匿名用户'}</span>
              <span className="pill-soft">
                发布时间：
                {post.created_at ? new Date(post.created_at).toLocaleString() : '未知时间'}
              </span>
            </div>

            <div className="mt-5 rounded-[24px] bg-neutral-50 p-5">
              <p className="whitespace-pre-wrap text-sm leading-8 text-neutral-700">
                {post.content?.trim() || '暂无正文内容。'}
              </p>
            </div>

            {isOwner ? (
              <div className="mt-5">
                {!confirmDelete ? (
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/community/${post.id}/edit`} className="btn-secondary">
                      编辑帖子
                    </Link>
                    <Link
                      href={`/community/${post.id}?confirmDelete=1`}
                      className="btn-danger"
                    >
                      删除帖子
                    </Link>
                  </div>
                ) : (
                  <div className="status-danger">
                    <div className="section-head">
                      <div className="section-head-main">
                        <div className="section-kicker">Danger Zone</div>
                        <h3 className="section-title">确认删除这篇帖子？</h3>
                        <p className="section-desc">
                          删除后将无法恢复，帖子正文、图片和评论都会一起移除。
                        </p>
                      </div>
                    </div>

                    <div className="section-head-divider" />

                    <div className="mt-4 flex flex-wrap gap-3">
                      <form action={deletePost}>
                        <input type="hidden" name="post_id" value={post.id} />
                        <button type="submit" className="btn-danger">
                          确认删除
                        </button>
                      </form>

                      <Link href={`/community/${post.id}`} className="btn-secondary">
                        取消
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </article>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Comment</div>
              <h3 className="section-title">发表评论</h3>
              <p className="section-desc">写下你的看法，帮助楼主或分享经验。</p>
            </div>

            <div className="section-meta">
              <span className="pill-soft">
                {currentProfile.data?.nickname ?? (authUser ? '当前用户' : '未登录')}
              </span>
            </div>
          </div>

          <div className="section-head-divider" />

          {authUser ? (
            <CommentComposer postId={post.id} action={createComment} />
          ) : (
            <div className="empty-state mt-5">
              <div className="empty-state-emoji">🔐</div>
              <h3 className="empty-state-title">先登录后再评论</h3>
              <p className="empty-state-desc">登录后就可以参与讨论了。</p>
            </div>
          )}
        </section>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Discussion</div>
              <h3 className="section-title">评论区</h3>
              <p className="section-desc">看看大家都说了什么。</p>
            </div>

            <div className="section-meta">
              <span className="pill-soft">{typedComments.length} 条评论</span>
            </div>
          </div>

          <div className="section-head-divider" />

          <div className="mt-5 space-y-4">
            {typedComments.length > 0 ? (
              typedComments.map((comment) => (
                <article key={comment.id} className="card-soft p-4">
                  <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                    <span className="pill-soft">
                      {commentUserMap.get(comment.user_id) ?? '匿名用户'}
                    </span>
                    <span className="pill-soft">
                      {comment.created_at
                        ? new Date(comment.created_at).toLocaleString()
                        : '未知时间'}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-700">
                    {comment.content?.trim() || '空评论'}
                  </p>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-emoji">💭</div>
                <h3 className="empty-state-title">还没有评论</h3>
                <p className="empty-state-desc">来发表第一条吧。</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}