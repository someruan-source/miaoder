import { createClient } from '@/lib/supabase/server'

interface DiscoverFilters {
  city?: string
  petType?: 'cat' | 'dog' | 'other'
  excludePetIds?: string[]
  limit?: number
}

export async function getDiscoverPets(filters: DiscoverFilters = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('pets')
    .select(`
      id,
      name,
      type,
      age_months,
      city,
      district,
      intro,
      neutered,
      vaccinated,
      meetup_ready,
      pet_tags(tag_type, tag_value),
      pet_media(url, media_type, sort_order)
    `)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 20)

  if (filters.city) query = query.eq('city', filters.city)
  if (filters.petType) query = query.eq('type', filters.petType)
  if (filters.excludePetIds?.length) {
    query = query.not('id', 'in', `(${filters.excludePetIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((pet) => ({
    ...pet,
    cover: pet.pet_media?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
    tags: (pet.pet_tags ?? []).map((tag) => tag.tag_value),
  }))
}
