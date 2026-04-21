import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type LikeRow = {
  id: string
  post_id: string
  user_id: string
}

type PostRow = {
  id: string
  user_id: string
  category: string | null
  title: string | null
  content: string | null
  city: string | null
  is_city_visible: boolean | null
  created_at: string | null
}

type UserRow = {
  id: string
  nickname: string | null
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

export default async function MyLikesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string
    keyword?: string
  }>
}) {
  const { category = '', keyword = '' } = await searchParams

  const selectedCategory = category.trim()
  const keywordText = keyword.trim()

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

  const { data: likes, error: likesError } = await supabase
    .from('post_likes')
    .select('id, post_id, user_id')
    .eq('user_id', userProfile.id)
    .order('id', { ascending: false })

  if (likesError) {
    return (
      <main className="min-h-screen bg-white px-4 py-6 pb-24">
        <div className="mx-auto max-w-md">
          <Link href="/me" className="text-sm text-gray-500">
            ← 返回我的主页
          </Link>
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-600">
            加载我的点赞失败：{likesError.message}
          </div>
        </div>
      </main>
    )
  }

  const likeRows = (likes ?? []) as LikeRow[]
  const likedPostIds = likeRows.map((row) => row.post_id)

  let likedPosts: PostRow[] = []

  if (likedPostIds.length > 0) {
    let postsQuery = supabase
      .from('posts')
      .select(
        'id, user_id, category, title, content, city, is_city_visible, created_at'
      )
      .in('id', likedPostIds)
      .order('created_at', { ascending: false })

    if (selectedCategory) {
      postsQuery = postsQuery.eq('category', selectedCategory)
    }

    if (keywordText) {
      postsQuery = postsQuery.or(
        `title.ilike.%${keywordText}%,content.ilike.%${keywordText}%`
      )
    }

    const { data: posts } = await postsQuery
    likedPosts = (posts ?? []) as PostRow[]
  }

  const authorIds = [...new Set(likedPosts.map((post) => post.user_id))]
  const likedPostIdSet = likedPosts.map((post) => post.id)

  let authorMap = new Map<string, UserRow>()
  let likeCountMap = new Map<string, number>()
  let commentCountMap = new Map<string, number>()

  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from('users')
      .select('id, nickname')
      .in('id', authorIds)

    authorMap = new Map(
      ((authors ?? []) as UserRow[]).map((author) => [author.id, author])
    )
  }

  if (likedPostIdSet.length > 0) {
    const { data: allLikes } = await supabase
      .from('post_likes')
      .select('id, post_id, user_id')
      .in('post_id', likedPostIdSet)

    for (const like of (allLikes ?? []) as LikeRow[]) {
      likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) ?? 0) + 1)
    }

    const { data: comments } = await supabase
      .from('comments')
      .select('id, post_id')
      .in('post_id', likedPostIdSet)

    for (const comment of (comments ?? []) as CommentRow[]) {
      commentCountMap.set(
        comment.post_id,
        (commentCountMap.get(comment.post_id) ?? 0) + 1
      )
    }
  }

  const likeIndexMap = new Map<string, number>()
  likeRows.forEach((row, index) => {
    likeIndexMap.set(row.post_id, index)
  })

  likedPosts.sort((a, b) => {
    const aIndex = likeIndexMap.get(a.id) ?? 999999
    const bIndex = likeIndexMap.get(b.id) ?? 999999
    return aIndex - bIndex
  })

  return (
    <main className="min-h-screen bg-white px-4 py-6 pb-24">
      <div className="mx-auto max-w-md">
        <div className="mb-6">
          <Link href="/me" className="text-sm text-gray-500">
            ← 返回我的主页
          </Link>
          <p className="mt-4 text-sm text-gray-500">miaoder</p>
          <h1 className="mt-1 text-3xl font-bold">我的点赞</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            查看你点赞过的帖子，并按分类和关键词快速筛选。
          </p>
        </div>

        <section className="mb-6 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">筛选条件</h2>
            <Link href="/me/likes" className="text-sm text-gray-500">
              清空
            </Link>
          </div>

          <form action="/me/likes" className="mt-4 space-y-3">
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

            <button
              type="submit"
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm text-white"
            >
              应用筛选
            </button>
          </form>
        </section>

        {(selectedCategory || keywordText) && (
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
            </div>
          </section>
        )}

        <section className="mb-4 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">点赞结果</h2>
              <p className="mt-1 text-sm text-gray-500">
                当前结果共 {likedPosts.length} 条
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
          {likedPosts.map((post) => {
            const author = authorMap.get(post.user_id)
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
                    ❤️ {likeCount} · 💬 {commentCount}
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
                    作者：{author?.nickname ?? '匿名用户'}
                  </span>
                  <span className="rounded-full bg-gray-50 px-3 py-1">
                    发布时间：{formatPostTime(post.created_at)}
                  </span>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/community/${post.id}`}
                    className="rounded-2xl border px-4 py-2 text-sm text-gray-800"
                  >
                    查看原帖
                  </Link>
                </div>
              </article>
            )
          })}

          {likedPosts.length === 0 && (
            <section className="rounded-3xl border border-dashed p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold">没有找到符合条件的点赞帖子</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  你可以调整筛选条件，或者先去社区点点赞。
                </p>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link
                  href="/me/likes"
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