import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PetCreateForm from '@/components/pet-create-form'

type UploadedMedia = {
  filePath: string
  mediaType: 'image' | 'video'
  sortOrder: number
}

export default async function NewPetPage() {
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

  async function createPet(formData: FormData) {
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

    const name = String(formData.get('name') || '').trim()
    const type = String(formData.get('type') || '').trim()
    const breed = String(formData.get('breed') || '').trim()
    const gender = String(formData.get('gender') || '').trim()
    const ageMonthsRaw = String(formData.get('age_months') || '').trim()
    const city = String(formData.get('city') || '').trim()
    const bio = String(formData.get('bio') || '').trim()
    const uploadedMediaJson = String(formData.get('uploaded_media_json') || '[]')

    if (!name) throw new Error('请填写宠物名字')
    if (!type) throw new Error('请选择宠物类型')

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

    const { data: insertedPet, error: petInsertError } = await supabase
      .from('pets')
      .insert({
        user_id: profile.id,
        name,
        type,
        breed: breed || null,
        gender: gender || null,
        age_months: ageMonths,
        city: city || null,
        bio: bio || null,
      })
      .select('id')
      .single()

    if (petInsertError || !insertedPet) {
      throw new Error(`保存宠物资料失败：${petInsertError?.message ?? '未知错误'}`)
    }

    if (uploadedMedia.length > 0) {
      const rows = uploadedMedia.map((item) => ({
        pet_id: insertedPet.id,
        file_path: item.filePath,
        media_type: item.mediaType,
        sort_order: item.sortOrder,
      }))

      const { error: mediaInsertError } = await supabase.from('pet_media').insert(rows)

      if (mediaInsertError) {
        throw new Error(`媒体记录写入失败：${mediaInsertError.message}`)
      }
    }

    revalidatePath('/me')
    revalidatePath('/discover')
    revalidatePath(`/pets/${insertedPet.id}`)
    redirect(`/pets/${insertedPet.id}`)
  }

  return (
    <main className="page-shell">
      <div className="page-wrap">
        <div className="mb-6">
          <Link
            href="/me"
            className="text-sm font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            ← 返回我的
          </Link>
          <p className="page-kicker mt-4">miaoder</p>
          <h1 className="page-title">新增宠物</h1>
          <p className="page-subtitle">
            为你的毛孩子建立一份好看的宠物档案，用于展示、发现和配对。
          </p>
        </div>

        <PetCreateForm
          ownerId={currentProfile.id}
          ownerName={currentProfile.nickname ?? '你'}
          action={createPet}
        />
      </div>
    </main>
  )
}