/**
 * High-resolution PNG export of the poster canvas.
 *
 * How it works
 * ------------
 * 1. The live poster DOM (a plain HTML subtree styled only by poster.css) is
 *    cloned. No editor chrome is included, because only the poster node is
 *    serialized.
 * 2. poster.css is embedded into the clone as a <style> element, with the
 *    self-hosted fonts inlined as base64 data URLs so the exported image is
 *    completely self-contained (no network, no missing glyphs).
 * 3. The clone is wrapped in an SVG <foreignObject> and turned into an SVG
 *    data URL, which is then drawn onto a <canvas> at 2x/3x scale and encoded
 *    as PNG.
 *
 * The logical poster is 800x1200; the export pixel size is scale * 800 x
 * scale * 1200 (default 1600x2400).
 */

import posterCssSource from '../styles/poster.css?raw'

export const POSTER_LOGICAL_WIDTH = 800
export const POSTER_LOGICAL_HEIGHT = 1200

const FONT_FILES = [
  { pattern: /url\('\/fonts\/fraunces-normal-latin\.woff2'\)/g, url: '/fonts/fraunces-normal-latin.woff2' },
  { pattern: /url\('\/fonts\/fraunces-italic-latin\.woff2'\)/g, url: '/fonts/fraunces-italic-latin.woff2' },
  { pattern: /url\('\/fonts\/caveat-normal-latin\.woff2'\)/g, url: '/fonts/caveat-normal-latin.woff2' },
] as const

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

let embeddedCssPromise: Promise<string> | null = null

/** poster.css with fonts inlined as data URLs (cached). */
function getEmbeddedCss(): Promise<string> {
  if (!embeddedCssPromise) {
    embeddedCssPromise = (async () => {
      let css = posterCssSource
      for (const font of FONT_FILES) {
        try {
          const response = await fetch(font.url)
          if (!response.ok) continue
          const base64 = arrayBufferToBase64(await response.arrayBuffer())
          css = css.replace(font.pattern, `url(data:font/woff2;base64,${base64})`)
        } catch {
          // Keep the plain URL; the browser will fetch it while rasterizing.
        }
      }
      return css
    })()
  }
  return embeddedCssPromise
}

/** Make sure the poster fonts are available before rasterizing. */
export async function ensurePosterFontsLoaded(): Promise<void> {
  try {
    if (document.fonts) {
      await Promise.all([
        document.fonts.load("400 16px 'Fraunces'"),
        document.fonts.load("italic 400 16px 'Fraunces'"),
        document.fonts.load("600 16px 'Fraunces'"),
        document.fonts.load("700 26px 'Caveat'"),
        document.fonts.ready,
      ])
    }
  } catch {
    /* fonts are optional — fallbacks are defined in poster.css */
  }
}

function serializePosterSvg(node: HTMLElement, css: string): string {
  const clone = node.cloneNode(true) as HTMLElement
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  clone.style.width = `${POSTER_LOGICAL_WIDTH}px`
  clone.style.height = `${POSTER_LOGICAL_HEIGHT}px`
  clone.style.margin = '0'

  const style = document.createElement('style')
  style.textContent = css
  clone.insertBefore(style, clone.firstChild)

  const serialized = new XMLSerializer().serializeToString(clone)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_LOGICAL_WIDTH}" height="${POSTER_LOGICAL_HEIGHT}" ` +
    `viewBox="0 0 ${POSTER_LOGICAL_WIDTH} ${POSTER_LOGICAL_HEIGHT}">` +
    `<foreignObject x="0" y="0" width="${POSTER_LOGICAL_WIDTH}" height="${POSTER_LOGICAL_HEIGHT}">` +
    serialized +
    `</foreignObject></svg>`
  return svg
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('The poster could not be rasterized as an image.'))
    img.src = src
  })
}

export interface PosterExportOptions {
  /** 1 = 800x1200, 2 = 1600x2400 (default), 3 = 2400x3600. */
  scale?: number
  /** Output format. JPEG is used for small previews/thumbnails. */
  mimeType?: 'image/png' | 'image/jpeg'
  /** Quality for JPEG (0..1). */
  quality?: number
}

export async function posterNodeToPngBlob(node: HTMLElement, options: PosterExportOptions = {}): Promise<Blob> {
  return posterNodeToBlob(node, { ...options, mimeType: 'image/png' })
}

/** Shared implementation for PNG / JPEG output. */
export async function posterNodeToBlob(node: HTMLElement, options: PosterExportOptions = {}): Promise<Blob> {
  const scale = Math.min(3, Math.max(0.2, Math.round(options.scale ?? 2)))
  const mimeType = options.mimeType ?? 'image/png'
  const [css] = await Promise.all([getEmbeddedCss(), ensurePosterFontsLoaded()])

  const svg = serializePosterSvg(node, css)
  const img = await loadImage(svgToDataUrl(svg))

  // Give the SVG image a moment to finish laying out embedded fonts.
  await new Promise((resolve) => setTimeout(resolve, 60))

  const canvas = document.createElement('canvas')
  canvas.width = POSTER_LOGICAL_WIDTH * scale
  canvas.height = POSTER_LOGICAL_HEIGHT * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not create a canvas for export.')
  if (mimeType === 'image/jpeg') {
    // JPEG has no alpha channel — paint a light base first.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, mimeType === 'image/jpeg' ? (options.quality ?? 0.82) : undefined),
  )
  if (!blob) throw new Error('The image file could not be created.')
  return blob
}

/** Standalone SVG copy — used as a graceful fallback if PNG fails. */
export async function posterNodeToSvgBlob(node: HTMLElement): Promise<Blob> {
  const css = await getEmbeddedCss()
  const svg = serializePosterSvg(node, css)
  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function slugifyFileName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'poster'
  )
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('The image could not be read.'))
    reader.readAsDataURL(blob)
  })
}
