const SERVER_NORMALIZE_EXTS = [
  '.heic',
  '.heif',
  '.avif',
  '.tif',
  '.tiff',
  '.bmp',
]

function getLowerName(file: File) {
  return file.name.toLowerCase()
}

export function shouldNormalizeImage(file: File) {
  const lowerName = getLowerName(file)

  if (file.type === 'image/heic') return true
  if (file.type === 'image/heif') return true
  if (file.type === 'image/avif') return true
  if (file.type === 'image/tiff') return true
  if (file.type === 'image/bmp') return true

  return SERVER_NORMALIZE_EXTS.some((ext) => lowerName.endsWith(ext))
}

function basenameWithoutImageExt(name: string) {
  return name
    .replace(/\.heic$/i, '')
    .replace(/\.heif$/i, '')
    .replace(/\.avif$/i, '')
    .replace(/\.tiff$/i, '')
    .replace(/\.tif$/i, '')
    .replace(/\.bmp$/i, '')
}

export async function normalizeImageForUpload(file: File) {
  if (!shouldNormalizeImage(file)) {
    return file
  }

  const formData = new FormData()
  formData.set('file', file)

  const response = await fetch('/api/image/normalize', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    let message = '图片转换失败'

    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      message = await response.text()
    }

    throw new Error(message)
  }

  const blob = await response.blob()
  const baseName = basenameWithoutImageExt(file.name)

  return new File([blob], `${baseName || 'image'}.jpg`, {
    type: 'image/jpeg',
  })
}