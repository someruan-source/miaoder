'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  normalizeImageForUpload,
  shouldNormalizeImage,
} from '@/lib/media/normalize-image-client'

const IMAGE_ACCEPT =
  'image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif,.bmp,.tiff,.tif'

const VIDEO_ACCEPT = 'video/*,.mp4,.mov,.webm,.m4v,.quicktime'

type PetForEdit = {
  id: string
  name: string | null
  type: string | null
  breed: string | null
  gender: string | null
  age_months: number | null
  city: string | null
  bio: string | null
}

type PetEditFormProps = {
  ownerId: string
  ownerName: string
  pet: PetForEdit
  currentImage: string | null
  currentVideoUrls: string[]
  action: (formData: FormData) => Promise<void>
}

function getFileExt(file: File, fallback: string) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return ext || fallback
}

function mediaTypeFromFile(file: File): 'image' | 'video' {
  if (file.type.startsWith('video/')) return 'video'
  return 'image'
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return '未知错误'
  }
}

export default function PetEditForm({
  ownerId,
  ownerName,
  pet,
  currentImage,
  currentVideoUrls,
  action,
}: PetEditFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [errorText, setErrorText] = useState('')

  async function uploadFile(params: {
    file: File
    kind: 'image' | 'video'
    sortOrder: number
  }) {
    const { file, kind, sortOrder } = params

    let fileForUpload = file

    if (kind === 'image') {
      if (shouldNormalizeImage(file)) {
        setStatusText(`正在转换图片格式：${file.name}`)
      }

      fileForUpload = await normalizeImageForUpload(file)
    }

    const ext = getFileExt(fileForUpload, kind === 'video' ? 'mp4' : 'jpg')
    const filePath = `${ownerId}/${pet.id}/${kind}-${Date.now()}-${sortOrder}.${ext}`

    const { error } = await supabase.storage.from('pet-media').upload(filePath, fileForUpload, {
      cacheControl: '3600',
      upsert: false,
      contentType: fileForUpload.type || undefined,
    })

    if (error) {
      throw new Error(
        `${kind === 'video' ? '视频' : '图片'}上传失败：${error.message}`
      )
    }

    return {
      filePath,
      mediaType: mediaTypeFromFile(fileForUpload),
      sortOrder,
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErrorText('')
    setStatusText('准备上传……')

    const form = event.currentTarget
    const formData = new FormData(form)

    const photo = formData.get('photo')
    const video = formData.get('video')

    formData.delete('photo')
    formData.delete('video')

    try {
      setUploading(true)

      const uploadedMedia: Array<{
        filePath: string
        mediaType: 'image' | 'video'
        sortOrder: number
      }> = []

      if (photo instanceof File && photo.size > 0) {
        setStatusText(`正在处理新的宠物主图：${photo.name}`)

        const uploaded = await uploadFile({
          file: photo,
          kind: 'image',
          sortOrder: 0,
        })
        uploadedMedia.push(uploaded)
      }

      if (video instanceof File && video.size > 0) {
        setStatusText(`正在上传新的宠物视频：${video.name}`)

        const uploaded = await uploadFile({
          file: video,
          kind: 'video',
          sortOrder: currentVideoUrls.length + 1,
        })
        uploadedMedia.push(uploaded)
      }

      formData.set('uploaded_media_json', JSON.stringify(uploadedMedia))

      setStatusText('正在保存修改……')

      startTransition(async () => {
        try {
          await action(formData)
          router.refresh()
        } catch (error) {
          setErrorText(readableError(error))
          setUploading(false)
          setStatusText('')
        }
      })
    } catch (error) {
      setErrorText(readableError(error))
      setUploading(false)
      setStatusText('')
    }
  }

  const disabled = uploading || isPending

  return (
    <section className="card-base p-5">
      <div className="section-head">
        <div className="section-head-main">
          <div className="section-kicker">Pet Form</div>
          <h2 className="section-title">宠物资料</h2>
          <p className="section-desc">
            图片和视频会直接上传到 Supabase Storage。特殊图片会先转成 JPG。
          </p>
        </div>

        <div className="section-meta">
          <span className="pill-soft shrink-0">主人：{ownerName}</span>
        </div>
      </div>

      <div className="section-head-divider" />

      {statusText ? <div className="status-info mt-5">{statusText}</div> : null}
      {errorText ? <div className="status-danger mt-5">{errorText}</div> : null}

      {currentImage ? (
        <div className="mt-5">
          <div className="cover-frame aspect-[4/3]">
            <img
              src={currentImage}
              alt={pet.name ?? '宠物当前图片'}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-400">当前主图</p>
        </div>
      ) : null}

      {currentVideoUrls.length > 0 ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-semibold text-neutral-700">当前视频</p>
          {currentVideoUrls.map((url, index) => (
            <div key={url + index} className="cover-frame aspect-[4/3]">
              <video src={url} controls preload="metadata" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <input type="hidden" name="pet_id" value={pet.id} />

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            宠物名字
          </label>
          <input
            name="name"
            type="text"
            defaultValue={pet.name ?? ''}
            placeholder="例如：大黄、布丁、苏大强"
            className="input-base"
            required
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              类型
            </label>
            <select
              name="type"
              className="select-base"
              required
              defaultValue={pet.type ?? ''}
              disabled={disabled}
            >
              <option value="" disabled>
                请选择
              </option>
              <option value="cat">猫咪</option>
              <option value="dog">狗狗</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              性别
            </label>
            <select
              name="gender"
              className="select-base"
              defaultValue={pet.gender ?? ''}
              disabled={disabled}
            >
              <option value="">暂不填写</option>
              <option value="male">公</option>
              <option value="female">母</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            品种
          </label>
          <input
            name="breed"
            type="text"
            defaultValue={pet.breed ?? ''}
            placeholder="例如：英短、金毛、中华田园猫"
            className="input-base"
            disabled={disabled}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              月龄
            </label>
            <input
              name="age_months"
              type="number"
              min="0"
              defaultValue={pet.age_months ?? ''}
              placeholder="例如：12"
              className="input-base"
              disabled={disabled}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              城市
            </label>
            <input
              name="city"
              type="text"
              defaultValue={pet.city ?? ''}
              placeholder="例如：深圳"
              className="input-base"
              disabled={disabled}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            宠物简介
          </label>
          <textarea
            name="bio"
            rows={5}
            defaultValue={pet.bio ?? ''}
            placeholder="介绍一下它的性格、习惯、喜欢什么，也可以写想找怎样的小伙伴。"
            className="textarea-base"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            更换主图
          </label>
          <div className="hint-card">
            <input
              name="photo"
              type="file"
              accept={IMAGE_ACCEPT}
              disabled={disabled}
              className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black disabled:opacity-60"
            />
            <div className="mt-4">
              <div className="hint-title">更换说明</div>
              <p className="hint-desc">
                支持 JPG / PNG / WebP / GIF / HEIC / HEIF / AVIF / TIFF / BMP。特殊格式会自动转 JPG。
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            新增宠物视频
          </label>
          <div className="hint-card">
            <input
              name="video"
              type="file"
              accept={VIDEO_ACCEPT}
              disabled={disabled}
              className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-neutral-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-black disabled:opacity-60"
            />
            <div className="mt-4">
              <div className="hint-title">新增说明</div>
              <p className="hint-desc">
                每次可以新增 1 个视频，文件会直接上传到 Supabase Storage。
              </p>
            </div>
          </div>
        </div>

        <div className="status-info">
          主图负责列表封面，视频主要在宠物详情页展示。特殊图片会通过后端接口转成 JPG。
        </div>

        <div className="flex gap-3 pt-2">
          <Link href={`/pets/${pet.id}`} className="btn-secondary flex-1">
            取消
          </Link>
          <button type="submit" className="btn-primary flex-1" disabled={disabled}>
            {disabled ? '处理中……' : '保存修改'}
          </button>
        </div>
      </form>
    </section>
  )
}