import { randomUUID } from 'crypto'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const INPUT_EXT_FALLBACK = 'input'
const OUTPUT_EXT = 'jpg'

function getExt(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext || INPUT_EXT_FALLBACK
}

async function runImageMagick(inputPath: string, outputPath: string) {
  const args = [
    inputPath,
    '-auto-orient',
    '-strip',
    '-colorspace',
    'sRGB',
    '-quality',
    '90',
    outputPath,
  ]

  try {
    await execFileAsync('magick', args)
    return
  } catch {
    await execFileAsync('convert', args)
  }
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: '缺少图片文件' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const inputBuffer = Buffer.from(arrayBuffer)

  const tempDir = await mkdtemp(path.join(tmpdir(), 'miaoder-image-'))
  const inputExt = getExt(file.name)
  const inputPath = path.join(tempDir, `${randomUUID()}.${inputExt}`)
  const outputPath = path.join(tempDir, `${randomUUID()}.${OUTPUT_EXT}`)

  try {
    await writeFile(inputPath, inputBuffer)
    await runImageMagick(inputPath, outputPath)

    const outputBuffer = await readFile(outputPath)

    return new Response(outputBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : '图片转换失败'

    return Response.json(
      {
        error:
          `图片转换失败：${message}。请确认服务器已安装 ImageMagick 和 libheif。`,
      },
      { status: 500 }
    )
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}