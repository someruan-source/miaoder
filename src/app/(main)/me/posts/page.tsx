import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type PostRow = {
  id: string
  user_id: string
  category: string | null
  title: string | null
  content: string | null
  city: string | null
  is_city_visible: boolean | null
  status: string | null
  created_at: string | null
}

type LikeRow = {
  id: string
  post_id: string
  user_id: string
}

type CommentRow = {
  id: string
  post_id: string
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

function formatPostTime(dateString: string | null) {
  if (!dateString) return '时间未知'
  return new Date(dateString).toLocaleString()
}

export default async function MyPostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    keyword?: string
    sort?: string
  }>
}) {
  const { category = '', keyword = '', sort = 'latest' } = await searchParams

  const selectedCategory = category.trim()
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

  let query = supabase
    .from('posts')
    .select(
      'id, user_id, category, title, content, city, is_city_visible, status, created_at'
    )
    .eq('user_id', userProfile.id)
    .order('created_at', { ascending: selectedSort === 'oldest' })

  if (selectedCategory) {
    query = query.eq('category', selectedCategory)
  }

  if (keywordText) {
    query = query.or(
      `title.ilike.%${keywordText}%,content.ilike.%${keywordText}%`
    )
  }

  const { data: posts, error: postsError } = await query

  if (postsError) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 pb-24">
        <div className="mx-auto max-w-md">
          <Link href="/me" className="text-sm text-gray-500">
            ← 返回我的主页
          </Link>
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
            加载我的帖子失败：{postsError.message}
          </div>
        </div>
      </main>
    )
  }

  const rows = (posts ?? []) as PostRow[]
  const postIds = rows.map((row) => row.id)

  let likeCountMap = new Map<string, number>()
  let commentCountMap = new Map<string, number>()

  if (postIds.length > 0) {
    const { data: likes } = await supabase
      .from('post_likes')
      .select('id, post_id, user_id')
      .in('post_id', postIds)

    for (const like of (likes ?? []) as LikeRow[]) {
      likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) ?? 0) + 1)
    }

    const { data: comments } = await supabase
      .from('comments')
      .select('id, post_id')
      .in('post_id', postIds)

    for (const comment of (comments ?? []) as CommentRow[]) {
      commentCountMap.set(
        comment.post_id,
        (commentCountMap.get(comment.post_id) ?? 0) + 1
      )
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 pb-24">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <Link href="/me" className="text-sm text-gray-500">
            ← 返回我的主页
          </Link>
          <p className="mt-4 text-sm text-gray-500">miaoder</p>
          <h1 className="mt-1 text-3xl font-bold">我的帖子</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            查看你发布过的帖子，并按分类、关键词、时间排序快速筛选。
          </p>
        </div>

        <section className="mb-6 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">筛选与排序</h2>
            <Link href="/me/posts" className="text-sm text-gray-500">
              清空
            </Link>
          </div>

          <form action="/me/posts" className="mt-4 space-y-3">
            <select
              name="category"
              defaultValue={selectedCategory}
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
            >
              <option value="">全部分类</option>
              <option value="help">求助</option>
              <option value="experience">经验</option>
              <option value="question">提问</option>
              <option value="share">分享</option>
            </select>

            <input
              type="text"
              name="keyword"
              defaultValue={keywordText}
              placeholder="搜索标题或正文关键词"
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
            />

            <select
              name="sort"
              defaultValue={selectedSort}
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
            >
              <option value="latest">按最新发布</option>
              <option value="oldest">按最早发布</option>
            </select>

            <button
              type="submit"
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm text-white"
            >
              应用筛选
            </button>
          </form>
        </section>

        {(selectedCategory || keywordText || selectedSort !== 'latest') && (
          <section className="mb-4 rounded-3xl border bg-gray-50 p-4 text-sm text-gray-600">
            当前条件：
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedCategory && (
                <span className="rounded-full bg-white px-3 py-1">
                  分类：{categoryLabel(selectedCategory)}
                </span>
              )}
              {keywordText && (
                <span className="rounded-full bg-white px-3 py-1">
                  关键词：{keywordText}
                </span>
              )}
              <span className="rounded-full bg-white px-3 py-1">
                排序：{selectedSort === 'latest' ? '最新优先' : '最早优先'}
              </span>
            </div>
          </section>
        )}

        <section className="mb-4 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">帖子总数</h2>
              <p className="mt-1 text-sm text-gray-500">
                当前结果共 {rows.length} 条
              </p>
            </div>

            <Link
              href="/community/new"
              className="rounded-2xl bg-black px-4 py-2 text-sm text-white"
            >
              发新帖子
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          {rows.map((post) => {
            const likeCount = likeCountMap.get(post.id) ?? 0
            const commentCount = commentCountMap.get(post.id) ?? 0

            return (
              <article
                key={post.id}
                className="rounded-3xl border bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-gray-500">
                    {(post.is_city_visible ? post.city : null) ?? '未展示城市'} ·{' '}
                    {categoryLabel(post.category)}
                  </div>

                  <div className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-500">
                    {post.status ?? 'published'}
                  </div>
                </div>

                <h2 className="mt-4 text-2xl font-bold">
                  {post.title ?? '未命名帖子'}
                </h2>

                <p className="mt-4 line-clamp-3 text-sm leading-7 text-gray-700">
                  {post.content ?? '暂无内容'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="rounded-full bg-gray-50 px-3 py-1">
                    ❤️ {likeCount}
                  </span>
                  <span className="rounded-full bg-gray-50 px-3 py-1">
                    💬 {commentCount}
                  </span>
                  <span className="rounded-full bg-gray-50 px-3 py-1">
                    发布时间：{formatPostTime(post.created_at)}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/community/${post.id}`}
                    className="rounded-2xl border px-4 py-2 text-sm text-gray-800"
                  >
                    查看详情
                  </Link>

                  <Link
                    href={`/community/${post.id}/edit`}
                    className="rounded-2xl border px-4 py-2 text-sm text-gray-800"
                  >
                    编辑帖子
                  </Link>
                </div>
              </article>
            )
          })}

          {rows.length === 0 && (
            <section className="rounded-3xl border border-dashed p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold">没有找到符合条件的帖子</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  你可以调整筛选条件，或者先去发布一篇新帖子。
                </p>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/me/posts"
                  className="rounded-2xl border px-4 py-2 text-sm text-gray-700"
                >
                  查看全部
                </Link>

                <Link
                  href="/community/new"
                  className="rounded-2xl bg-black px-4 py-2 text-sm text-white"
                >
                  去发帖子
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}