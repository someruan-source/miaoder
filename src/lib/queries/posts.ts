import { createClient } from '@/lib/supabase/server'

interface CommunityFilters {
  category?: 'experience' | 'diet' | 'training' | 'help' | 'emergency' | 'city'
  city?: string
  limit?: number
}

export async function getCommunityPosts(filters: CommunityFilters = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      content,
      category,
      city,
      created_at,
      users!posts_user_id_fkey(nickname)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 20)

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.city) query = query.eq('city', filters.city)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((post) => ({
    ...post,
    authorName: Array.isArray(post.users)
      ? post.users[0]?.nickname
      : (post.users as { nickname?: string } | null)?.nickname,
  }))
}
