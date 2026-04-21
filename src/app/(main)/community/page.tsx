import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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

export default async function CommunityPage({
  searchParams,
}: {
  searchParams?: Promise<{
    category?: string
    keyword?: string
  }>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const categoryFilter = String(resolvedSearchParams?.category || '').trim()
  const keywordFilter = String(resolvedSearchParams?.keyword || '').trim()

  const supabase = await createClient()

  let postQuery = supabase
    .from('posts')
    .select('id, user_id, title, content, city, category, status, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (categoryFilter) {
    postQuery = postQuery.eq('category', categoryFilter)
  }

  if (keywordFilter) {
    postQuery = postQuery.or(
      `title.ilike.%${keywordFilter}%,content.ilike.%${keywordFilter}%`
    )
  }

  const { data: posts, error } = await postQuery
  const postRows = (posts ?? []) as PostRow[]

  const userIds = [...new Set(postRows.map((item) => item.user_id))]
  const postIds = postRows.map((item) => item.id)

  const userMap = new Map<string, string>()
  const postImageMap = new Map<string, string>()

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, nickname')
      .in('id', userIds)

    ;(users ?? []).forEach((item) => {
      const row = item as UserRow
      userMap.set(row.id, row.nickname ?? '匿名用户')
    })
  }

  if (postIds.length > 0) {
    const { data: mediaRows } = await supabase
      .from('post_media')
      .select('id, post_id, file_path, media_type, sort_order, created_at')
      .in('post_id', postIds)
      .eq('media_type', 'image')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    const typedMediaRows = (mediaRows ?? []) as PostMediaRow[]

    for (const item of typedMediaRows) {
      if (!postImageMap.has(item.post_id)) {
        const publicUrl = supabase.storage
          .from('post-media')
          .getPublicUrl(item.file_path).data.publicUrl
        postImageMap.set(item.post_id, publicUrl)
      }
    }
  }

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <p className="page-kicker">miaoder</p>
          <h1 className="page-title">帮帮帮</h1>
          <p className="page-subtitle">
            浏览社区帖子，看看大家正在分享什么，也可以发布自己的内容。
          </p>
        </div>

        <section className="card-base p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Filters</div>
              <h2 className="section-title">筛选内容</h2>
              <p className="section-desc">
                快速缩小范围，找到你想看的内容。
              </p>
            </div>

            <div className="section-meta">
              <Link
                href="/community"
                className="text-sm text-neutral-500 transition hover:text-neutral-800"
              >
                清空
              </Link>
            </div>
          </div>

          <div className="section-head-divider" />

          <form method="get" className="mt-5 space-y-3">
            <select
              name="category"
              defaultValue={categoryFilter}
              className="select-base"
            >
              <option value="">全部分类</option>
              <option value="help">求助</option>
              <option value="share">分享</option>
              <option value="experience">经验</option>
              <option value="adopt">领养</option>
            </select>

            <input
              type="text"
              name="keyword"
              defaultValue={keywordFilter}
              placeholder="搜索标题或正文关键词"
              className="input-base"
            />

            <button type="submit" className="btn-primary w-full">
              应用筛选
            </button>
          </form>
        </section>

        <section className="card-base mt-6 p-5">
          <div className="section-head">
            <div className="section-head-main">
              <div className="section-kicker">Feed</div>
              <h2 className="section-title">社区帖子</h2>
              <p className="section-desc">
                当前共 {postRows.length} 条内容
              </p>
            </div>

            <div className="section-meta">
              <Link href="/community/new" className="btn-primary shrink-0">
                去发帖
              </Link>
            </div>
          </div>

          <div className="section-head-divider" />
        </section>

        <section className="mt-6 space-y-5">
          {error ? (
            <div className="status-danger">加载帖子失败：{error.message}</div>
          ) : null}

          {postRows.length > 0 ? (
            postRows.map((post) => {
              const imageUrl = postImageMap.get(post.id)
              const authorName = userMap.get(post.user_id) ?? '匿名用户'

              return (
                <article key={post.id} className="card-base overflow-hidden">
                  {imageUrl ? (
                    <div className="cover-frame aspect-[4/3]">
                      <img
                        src={imageUrl}
                        alt={post.title ?? '帖子首图'}
                        className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                      />
                    </div>
                  ) : null}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span className="pill-soft">
                            {post.city ?? '未填写城市'}
                          </span>
                          <span className="pill">
                            {categoryLabel(post.category)}
                          </span>
                        </div>

                        <h3 className="mt-4 line-clamp-2 text-3xl font-black tracking-tight text-neutral-900">
                          {post.title ?? '未命名帖子'}
                        </h3>
                      </div>

                      <span className="pill shrink-0">
                        {post.status ?? 'published'}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-7 text-neutral-600">
                      {post.content?.trim() || '暂无正文内容。'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-500">
                      <span className="pill-soft">作者：{authorName}</span>
                      <span className="pill-soft">
                        {post.created_at
                          ? new Date(post.created_at).toLocaleString()
                          : '未知时间'}
                      </span>
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/community/${post.id}`}
                        className="btn-secondary"
                      >
                        查看原帖
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="empty-state">
              <div className="empty-state-emoji">📝</div>
              <h3 className="empty-state-title">还没有帖子</h3>
              <p className="empty-state-desc">
                当前还没有符合条件的帖子，试试清空筛选或者自己发布第一条吧。
              </p>
              <div className="mt-5">
                <Link href="/community/new" className="btn-secondary">
                  去发帖
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}