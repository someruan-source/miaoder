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

type PetCreateFormProps = {
  ownerId: string
  ownerName: string
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

export default function PetCreateForm({
  ownerId,
  ownerName,
  action,
}: PetCreateFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [errorText, setErrorText] = useState('')

  async function uploadFile(params: {
    file: File
    petDraftId: string
    kind: 'image' | 'video'
    sortOrder: number
  }) {
    const { file, petDraftId, kind, sortOrder } = params

    let fileForUpload = file

    if (kind === 'image') {
      if (shouldNormalizeImage(file)) {
        setStatusText(`正在转换图片格式：${file.name}`)
      }

      fileForUpload = await normalizeImageForUpload(file)
    }

    const ext = getFileExt(fileForUpload, kind === 'video' ? 'mp4' : 'jpg')
    const filePath = `${ownerId}/${petDraftId}/${kind}-${Date.now()}-${sortOrder}.${ext}`

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

    const petDraftId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`

    try {
      setUploading(true)

      const uploadedMedia: Array<{
        filePath: string
        mediaType: 'image' | 'video'
        sortOrder: number
      }> = []

      if (photo instanceof File && photo.size > 0) {
        setStatusText(`正在处理宠物主图：${photo.name}`)

        const uploaded = await uploadFile({
          file: photo,
          petDraftId,
          kind: 'image',
          sortOrder: 0,
        })
        uploadedMedia.push(uploaded)
      }

      if (video instanceof File && video.size > 0) {
        setStatusText(`正在上传宠物视频：${video.name}`)

        const uploaded = await uploadFile({
          file: video,
          petDraftId,
          kind: 'video',
          sortOrder: 1,
        })
        uploadedMedia.push(uploaded)
      }

      formData.set('uploaded_media_json', JSON.stringify(uploadedMedia))

      setStatusText('正在保存宠物资料……')

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

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            宠物名字
          </label>
          <input
            name="name"
            type="text"
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
              defaultValue=""
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
            <select name="gender" className="select-base" defaultValue="" disabled={disabled}>
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
            placeholder="介绍一下它的性格、习惯、喜欢什么，也可以写想找怎样的小伙伴。"
            className="textarea-base"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            宠物主图
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
              <div className="hint-title">主图说明</div>
              <p className="hint-desc">
                支持 JPG / PNG / WebP / GIF / HEIC / HEIF / AVIF / TIFF / BMP。特殊格式会自动转 JPG。
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            宠物视频
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
              <div className="hint-title">视频说明</div>
              <p className="hint-desc">
                视频会从浏览器直接上传到 Supabase Storage，不再经过 Next Server Action。
              </p>
            </div>
          </div>
        </div>

        <div className="status-info">
          大图片和视频会直接上传到 Supabase Storage。特殊图片会通过后端接口转成 JPG。
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/me" className="btn-secondary flex-1">
            取消
          </Link>
          <button type="submit" className="btn-primary flex-1" disabled={disabled}>
            {disabled ? '处理中……' : '保存宠物资料'}
          </button>
        </div>
      </form>
    </section>
  )
}