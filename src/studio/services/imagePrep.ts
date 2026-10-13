/**
 * Photo intake: validation, decoding and downscaling.
 *
 * Uploaded photos are converted to JPEG data URLs (never blob URLs) so that
 * the same image can be used for preview, AI analysis, the poster and export
 * without any lifetime or CORS problems.
 */

import type { PreparedPhoto } from '../types/poster'

export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const MAX_PHOTO_SIZE = 12 * 1024 * 1024 // 12 MB
const MAX_PREVIEW_EDGE = 1280
const MAX_ANALYSIS_EDGE = 1024

export class PhotoError extends Error {
  hint?: string
  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'PhotoError'
    this.hint = hint
  }
}

export function validatePhotoFile(file: File): void {
  const typeOk = ALLOWED_PHOTO_TYPES.includes(file.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  if (!typeOk) {
    throw new PhotoError(
      `“${file.name}” is not a supported photo format.`,
      'Please choose a JPEG, PNG, WebP or HEIC photo.',
    )
  }
  if (file.size > MAX_PHOTO_SIZE) {
    throw new PhotoError(
      `This photo is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 12 MB.`,
      'Try a smaller photo or take a new one.',
    )
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new PhotoError('The photo could not be read.', 'Please try selecting it again.'))
    reader.readAsDataURL(file)
  })
}

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function decodePhoto(dataUrl: string): Promise<DecodedImage> {
  // Prefer createImageBitmap (handles EXIF orientation in modern browsers).
  if (typeof createImageBitmap === 'function') {
    try {
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.(),
      }
    } catch {
      /* fall through to <img> decoding */
    }
  }
  return new Promise<DecodedImage>((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        release: () => undefined,
      })
    img.onerror = () =>
      reject(
        new PhotoError(
          'This browser could not decode the photo.',
          'Some formats (for example HEIC) are not supported everywhere. A JPEG or PNG photo always works.',
        ),
      )
    img.src = dataUrl
  })
}

function drawScaled(image: DecodedImage, maxEdge: number, quality: number): string {
  const longestEdge = Math.max(image.width, image.height)
  const scale = Math.min(1, maxEdge / longestEdge)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('This browser could not create a drawing canvas.')
  // JPEG has no alpha channel — paint a white base so transparency stays light.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image.source, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

/**
 * Validate + decode + downscale a photo into the two sizes the app needs.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  validatePhotoFile(file)
  const originalDataUrl = await readFileAsDataUrl(file)
  let decoded: DecodedImage
  try {
    decoded = await decodePhoto(originalDataUrl)
  } catch (error) {
    if (error instanceof PhotoError) throw error
    throw new PhotoError('This photo could not be opened.')
  }
  try {
    if (decoded.width < 200 || decoded.height < 200) {
      throw new PhotoError('This photo is too small to use.', 'Photos should be at least 200 × 200 pixels.')
    }
    return {
      previewDataUrl: drawScaled(decoded, MAX_PREVIEW_EDGE, 0.9),
      analysisDataUrl: drawScaled(decoded, MAX_ANALYSIS_EDGE, 0.82),
      width: decoded.width,
      height: decoded.height,
      fileName: file.name,
      fileSize: file.size,
    }
  } finally {
    decoded.release()
  }
}

/** Basic in-place photo tuning (brightness / contrast / warmth) for preview. */
export interface PhotoTuning {
  brightness: number // 0.8 .. 1.2
  contrast: number // 0.8 .. 1.2
  saturate: number // 0.8 .. 1.2
}

export const DEFAULT_PHOTO_TUNING: PhotoTuning = { brightness: 1, contrast: 1, saturate: 1 }
