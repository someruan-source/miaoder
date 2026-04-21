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

type PostCreateFormProps = {
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

export default function PostCreateForm({
  ownerId,
  ownerName,
  action,
}: PostCreateFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [errorText, setErrorText] = useState('')

  async function uploadFile(params: {
    file: File
    postDraftId: string
    kind: 'image' | 'video'
    sortOrder: number
  }) {
    const { file, postDraftId, kind, sortOrder } = params

    let fileForUpload = file

    if (kind === 'image') {
      if (shouldNormalizeImage(file)) {
        setStatusText(`正在转换图片格式：${file.name}`)
      }

      fileForUpload = await normalizeImageForUpload(file)
    }

    const ext = getFileExt(fileForUpload, kind === 'video' ? 'mp4' : 'jpg')
    const filePath = `${ownerId}/${postDraftId}/${kind}-${Date.now()}-${sortOrder}.${ext}`

    const { error } = await supabase.storage
      .from('post-media')
      .upload(filePath, fileForUpload, {
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
    setStatusText('')

    const form = event.currentTarget
    const formData = new FormData(form)

    const title = String(formData.get('title') || '').trim()
    const content = String(formData.get('content') || '').trim()

    if (!title) {
      setErrorText('请填写标题')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!content) {
      setErrorText('请填写正文')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const photo = formData.get('photo')
    const video = formData.get('video')

    formData.delete('photo')
    formData.delete('video')

    const postDraftId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`

    try {
      setUploading(true)
      setStatusText('准备上传……')

      const uploadedMedia: Array<{
        filePath: string
        mediaType: 'image' | 'video'
        sortOrder: number
      }> = []

      if (photo instanceof File && photo.size > 0) {
        setStatusText(`正在处理帖子图片：${photo.name}`)

        const uploaded = await uploadFile({
          file: photo,
          postDraftId,
          kind: 'image',
          sortOrder: 0,
        })

        uploadedMedia.push(uploaded)
      }

      if (video instanceof File && video.size > 0) {
        setStatusText(`正在上传帖子视频：${video.name}`)

        const uploaded = await uploadFile({
          file: video,
          postDraftId,
          kind: 'video',
          sortOrder: 1,
        })

        uploadedMedia.push(uploaded)
      }

      formData.set('uploaded_media_json', JSON.stringify(uploadedMedia))
      setStatusText('媒体上传完成，正在发布帖子……')

      startTransition(async () => {
        try {
          await action(formData)
          router.refresh()
        } catch (error) {
          setErrorText(`发布帖子失败：${readableError(error)}`)
          setUploading(false)
          setStatusText('')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
      })
    } catch (error) {
      setErrorText(readableError(error))
      setUploading(false)
      setStatusText('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const disabled = uploading || isPending

  return (
    <section className="card-base p-5">
      <div className="section-head">
        <div className="section-head-main">
          <div className="section-kicker">Post Form</div>
          <h2 className="section-title">帖子内容</h2>
          <p className="section-desc">
            图片和视频会直接上传到 Supabase Storage。特殊图片会先转成 JPG。
          </p>
        </div>

        <div className="section-meta">
          <span className="pill-soft shrink-0">作者：{ownerName}</span>
        </div>
      </div>

      <div className="section-head-divider" />

      {statusText ? <div className="status-info mt-5">{statusText}</div> : null}
      {errorText ? <div className="status-danger mt-5">{errorText}</div> : null}

      <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              城市
            </label>
            <input
              name="city"
              type="text"
              placeholder="例如：杭州"
              className="input-base"
              disabled={disabled}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              分类
            </label>
            <select name="category" className="select-base" defaultValue="" disabled={disabled}>
              <option value="">请选择</option>
              <option value="help">求助</option>
              <option value="share">分享</option>
              <option value="experience">经验</option>
              <option value="adopt">领养</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            标题
          </label>
          <input
            name="title"
            type="text"
            placeholder="例如：两只公猫能不能一起养？"
            className="input-base"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            正文
          </label>
          <textarea
            name="content"
            rows={8}
            placeholder="把你的情况写清楚一点，例如背景、经过、目前最困扰的问题。"
            className="textarea-base"
            disabled={disabled}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            帖子图片
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
              <div className="hint-title">图片说明</div>
              <p className="hint-desc">
                支持 JPG / PNG / WebP / GIF / HEIC / HEIF / AVIF / TIFF / BMP。特殊格式会自动转 JPG。
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700">
            帖子视频
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
          点发布后会先处理媒体，再保存帖子。大文件上传期间请不要关闭页面。
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/community" className="btn-secondary flex-1">
            取消
          </Link>
          <button type="submit" className="btn-primary flex-1" disabled={disabled}>
            {disabled ? '处理中……' : '发布帖子'}
          </button>
        </div>
      </form>
    </section>
  )
}