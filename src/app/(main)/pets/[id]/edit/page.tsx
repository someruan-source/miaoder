import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PetEditForm from '@/components/pet-edit-form'

type PetRow = {
  id: string
  user_id: string
  name: string | null
  type: string | null
  breed: string | null
  gender: string | null
  age_months: number | null
  city: string | null
  bio: string | null
}

type PetMediaRow = {
  id: string
  pet_id: string
  file_path: string
  media_type: 'image' | 'video'
  sort_order: number
  created_at: string
}

type UploadedMedia = {
  filePath: string
  mediaType: 'image' | 'video'
  sortOrder: number
}

export default async function EditPetPage({
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

  const { data: pet } = await supabase
    .from('pets')
    .select('id, user_id, name, type, breed, gender, age_months, city, bio')
    .eq('id', id)
    .maybeSingle<PetRow>()

  if (!pet) {
    notFound()
  }

  if (pet.user_id !== currentProfile.id) {
    redirect('/me')
  }

  const { data: mediaRows } = await supabase
    .from('pet_media')
    .select('id, pet_id, file_path, media_type, sort_order, created_at')
    .eq('pet_id', pet.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const typedMedia = (mediaRows ?? []) as PetMediaRow[]
  const firstImage = typedMedia.find((item) => item.media_type === 'image')
  const currentVideos = typedMedia.filter((item) => item.media_type === 'video')

  const currentImage = firstImage
    ? supabase.storage.from('pet-media').getPublicUrl(firstImage.file_path).data.publicUrl
    : null

  const currentVideoUrls = currentVideos.map((item) =>
    supabase.storage.from('pet-media').getPublicUrl(item.file_path).data.publicUrl
  )

  async function updatePet(formData: FormData) {
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

    const petId = String(formData.get('pet_id') || '').trim()
    const name = String(formData.get('name') || '').trim()
    const type = String(formData.get('type') || '').trim()
    const breed = String(formData.get('breed') || '').trim()
    const gender = String(formData.get('gender') || '').trim()
    const ageMonthsRaw = String(formData.get('age_months') || '').trim()
    const city = String(formData.get('city') || '').trim()
    const bio = String(formData.get('bio') || '').trim()
    const uploadedMediaJson = String(formData.get('uploaded_media_json') || '[]')

    if (!petId) throw new Error('缺少宠物 id')
    if (!name) throw new Error('请填写宠物名字')
    if (!type) throw new Error('请选择宠物类型')

    const { data: existingPet } = await supabase
      .from('pets')
      .select('id, user_id')
      .eq('id', petId)
      .maybeSingle()

    if (!existingPet || existingPet.user_id !== profile.id) {
      throw new Error('你无权编辑这只宠物')
    }

    const ageMonths =
      ageMonthsRaw === ''
        ? null
        : Number.isNaN(Number(ageMonthsRaw))
          ? null
          : Number(ageMonthsRaw)

    let uploadedMedia: UploadedMedia[] = []

    try {
      uploadedMedia = JSON.parse(uploadedMediaJson) as UploadedMedia[]
    } catch {
      uploadedMedia = []
    }

    const { error: updateError } = await supabase
      .from('pets')
      .update({
        name,
        type,
        breed: breed || null,
        gender: gender || null,
        age_months: ageMonths,
        city: city || null,
        bio: bio || null,
      })
      .eq('id', petId)

    if (updateError) {
      throw new Error(`更新宠物资料失败：${updateError.message}`)
    }

    const imageUpload = uploadedMedia.find((item) => item.mediaType === 'image')
    const videoUploads = uploadedMedia.filter((item) => item.mediaType === 'video')

    if (imageUpload) {
      const { data: existingImages } = await supabase
        .from('pet_media')
        .select('id')
        .eq('pet_id', petId)
        .eq('media_type', 'image')
        .order('sort_order', { ascending: true })
        .limit(1)

      const firstImageRow = existingImages?.[0]

      if (firstImageRow) {
        const { error: mediaUpdateError } = await supabase
          .from('pet_media')
          .update({
            file_path: imageUpload.filePath,
            media_type: 'image',
            sort_order: 0,
          })
          .eq('id', firstImageRow.id)

        if (mediaUpdateError) {
          throw new Error(`图片媒体记录更新失败：${mediaUpdateError.message}`)
        }
      } else {
        const { error: mediaInsertError } = await supabase.from('pet_media').insert({
          pet_id: petId,
          file_path: imageUpload.filePath,
          media_type: 'image',
          sort_order: 0,
        })

        if (mediaInsertError) {
          throw new Error(`图片媒体记录写入失败：${mediaInsertError.message}`)
        }
      }
    }

    if (videoUploads.length > 0) {
      const { data: existingVideos } = await supabase
        .from('pet_media')
        .select('sort_order')
        .eq('pet_id', petId)
        .eq('media_type', 'video')
        .order('sort_order', { ascending: false })
        .limit(1)

      const maxSortOrder = existingVideos?.[0]?.sort_order ?? 0

      const rows = videoUploads.map((item, index) => ({
        pet_id: petId,
        file_path: item.filePath,
        media_type: 'video',
        sort_order: maxSortOrder + index + 1,
      }))

      const { error: videoInsertError } = await supabase.from('pet_media').insert(rows)

      if (videoInsertError) {
        throw new Error(`视频媒体记录写入失败：${videoInsertError.message}`)
      }
    }

    revalidatePath('/me')
    revalidatePath('/discover')
    revalidatePath(`/pets/${petId}`)
    revalidatePath(`/pets/${petId}/edit`)
    redirect(`/pets/${petId}`)
  }

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <Link
            href={`/pets/${pet.id}`}
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            ← 返回宠物详情
          </Link>
          <p className="page-kicker mt-4">miaoder</p>
          <h1 className="page-title">编辑宠物</h1>
          <p className="page-subtitle">
            更新宠物资料和展示媒体，让这份档案始终保持最好状态。
          </p>
        </div>

        <PetEditForm
          ownerId={currentProfile.id}
          ownerName={currentProfile.nickname ?? '你'}
          pet={pet}
          currentImage={currentImage}
          currentVideoUrls={currentVideoUrls}
          action={updatePet}
        />
      </div>
    </main>
  )
}