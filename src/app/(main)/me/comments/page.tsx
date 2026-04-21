import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type CommentRow = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

type PostRow = {
  id: string
  title: string | null
  category: string | null
}

function categoryLabel(category: string | null) {
  switch (category) {
    case 'help':
      return '求助'
    case 'experience':
      return '经验'
    case 'question':
      return '提问'
    case 'share':
      return '分享'
    default:
      return '未分类'
  }
}

function formatCommentTime(dateString: string) {
  return new Date(dateString).toLocaleString()
}

export default async function MyCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    keyword?: string
    sort?: string
  }>
}) {
  const { keyword = '', sort = 'latest' } = await searchParams

  const keywordText = keyword.trim()
  const selectedSort = sort === 'oldest' ? 'oldest' : 'latest'

  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: userProfile, error: userProfileError } = await supabase
    .from('users')
    .select('id, nickname')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (userProfileError || !userProfile) {
    redirect('/onboarding')
  }

  async function deleteComment(formData: FormData) {
    'use server'

    const commentId = String(formData.get('comment_id') || '').trim()

    if (!commentId) {
      throw new Error('缺少 comment_id')
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

    const { data: deletedRows, error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', profile.id)
      .select('id')

    if (error) {
      throw new Error(error.message)
    }

    if (!deletedRows || deletedRows.length === 0) {
      throw new Error('评论没有删除成功：可能没有权限，或该评论不属于当前用户')
    }

    revalidatePath('/me/comments')
    revalidatePath('/community')
    redirect('/me/comments')
  }

  let query = supabase
    .from('comments')
    .select('id, post_id, user_id, content, created_at')
    .eq('user_id', userProfile.id)
    .order('created_at', { ascending: selectedSort === 'oldest' })

  if (keywordText) {
    query = query.ilike('content', `%${keywordText}%`)
  }

  const { data: comments, error: commentsError } = await query

  if (commentsError) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 pb-24">
        <div className="mx-auto max-w-md">
          <Link href="/me" className="text-sm text-gray-500">
            ← 返回我的主页
          </Link>
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
            加载我的评论失败：{commentsError.message}
          </div>
        </div>
      </main>
    )
  }

  const rows = (comments ?? []) as CommentRow[]
  const postIds = [...new Set(rows.map((row) => row.post_id))]
  let postMap = new Map<string, PostRow>()

  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, title, category')
      .in('id', postIds)

    postMap = new Map(((posts ?? []) as PostRow[]).map((post) => [post.id, post]))
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 pb-24">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <Link href="/me" className="text-sm text-gray-500">
            ← 返回我的主页
          </Link>
          <p className="mt-4 text-sm text-gray-500">miaoder</p>
          <h1 className="mt-1 text-3xl font-bold">我的评论</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            查看你发表过的评论，支持搜索、排序，并快速回到原帖。
          </p>
        </div>

        <section className="mb-6 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">筛选与排序</h2>
            <Link href="/me/comments" className="text-sm text-gray-500">
              清空
            </Link>
          </div>

          <form action="/me/comments" className="mt-4 space-y-3">
            <input
              type="text"
              name="keyword"
              defaultValue={keywordText}
              placeholder="搜索评论内容关键词"
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
            />

            <select
              name="sort"
              defaultValue={selectedSort}
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
            >
              <option value="latest">按最新评论</option>
              <option value="oldest">按最早评论</option>
            </select>

            <button
              type="submit"
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm text-white"
            >
              应用筛选
            </button>
          </form>
        </section>

        {(keywordText || selectedSort !== 'latest') && (
          <section className="mb-4 rounded-3xl border bg-gray-50 p-4 text-sm text-gray-600">
            当前条件：
            <div className="mt-2 flex flex-wrap gap-2">
              {keywordText && (
                <span className="rounded-full bg-white px-3 py-1">
                  关键词：{keywordText}
                </span>
              )}
              <span className="rounded-full bg-white px-3 py-1">
                排序：{selectedSort === 'latest' ? '最新评论优先' : '最早评论优先'}
              </span>
            </div>
          </section>
        )}

        <section className="mb-4 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">评论总数</h2>
              <p className="mt-1 text-sm text-gray-500">
                当前结果共 {rows.length} 条
              </p>
            </div>

            <Link
              href="/community"
              className="rounded-2xl border px-4 py-2 text-sm text-gray-700"
            >
              去社区
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          {rows.map((comment) => {
            const post = postMap.get(comment.post_id)

            return (
              <article
                key={comment.id}
                className="rounded-3xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-gray-500">
                    所属帖子：{post?.title ?? '帖子已不存在'}
                  </div>

                  <div className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500">
                    {post ? categoryLabel(post.category) : '未知分类'}
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-800">
                  {comment.content}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="rounded-full bg-gray-50 px-3 py-1">
                    评论时间：{formatCommentTime(comment.created_at)}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/community/${comment.post_id}`}
                    className="rounded-2xl border px-4 py-2 text-sm text-gray-800"
                  >
                    查看原帖
                  </Link>

                  <form action={deleteComment}>
                    <input type="hidden" name="comment_id" value={comment.id} />
                    <button
                      type="submit"
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
                    >
                      删除评论
                    </button>
                  </form>
                </div>
              </article>
            )
          })}

          {rows.length === 0 && (
            <section className="rounded-3xl border border-dashed p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold">没有找到符合条件的评论</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  你可以调整搜索条件，或者先去社区参与讨论。
                </p>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/me/comments"
                  className="rounded-2xl border px-4 py-2 text-sm text-gray-700"
                >
                  查看全部
                </Link>

                <Link
                  href="/community"
                  className="rounded-2xl bg-black px-4 py-2 text-sm text-white"
                >
                  去社区
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}