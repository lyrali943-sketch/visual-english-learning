/**
 * Sample artwork used by the empty-state example poster (home page) and as a
 * fallback when a saved poster has no photo. Flat editorial illustration —
 * it is clearly presented as sample artwork, never as a real photo.
 */

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`
}

const bowlSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6EDDF"/>
      <stop offset="1" stop-color="#EADCC6"/>
    </linearGradient>
    <radialGradient id="yog" cx="0.4" cy="0.35" r="0.8">
      <stop offset="0" stop-color="#FFFDF8"/>
      <stop offset="1" stop-color="#F3E7D3"/>
    </radialGradient>
  </defs>
  <rect width="640" height="480" fill="url(#bg)"/>
  <circle cx="108" cy="96" r="46" fill="#F7F2E9" opacity="0.75"/>
  <circle cx="556" cy="72" r="30" fill="#F7F2E9" opacity="0.6"/>
  <ellipse cx="320" cy="392" rx="196" ry="30" fill="#D9C4A4" opacity="0.65"/>
  <path d="M124 236 L516 236 L470 366 C 466 396, 174 396, 170 366 Z" fill="#FFFDF8"/>
  <path d="M124 236 L516 236 L508 268 L132 268 Z" fill="#EFE3CE"/>
  <ellipse cx="320" cy="238" rx="196" ry="44" fill="url(#yog)"/>
  <ellipse cx="320" cy="234" rx="176" ry="36" fill="#FFFDF8"/>
  <g fill="#D9A85C">
    <ellipse cx="238" cy="222" rx="13" ry="9" transform="rotate(-18 238 222)"/>
    <ellipse cx="268" cy="240" rx="12" ry="8" transform="rotate(12 268 240)"/>
    <ellipse cx="352" cy="216" rx="13" ry="9" transform="rotate(8 352 216)"/>
    <ellipse cx="392" cy="238" rx="12" ry="8" transform="rotate(-14 392 238)"/>
    <ellipse cx="312" cy="248" rx="12" ry="8" transform="rotate(20 312 248)"/>
    <ellipse cx="424" cy="224" rx="11" ry="8" transform="rotate(-6 424 224)"/>
    <ellipse cx="206" cy="240" rx="11" ry="8" transform="rotate(24 206 240)"/>
  </g>
  <g>
    <circle cx="286" cy="212" r="15" fill="#5B6FB4"/>
    <circle cx="282" cy="208" r="4" fill="#8494CF" opacity="0.8"/>
    <circle cx="342" cy="226" r="14" fill="#52639F"/>
    <circle cx="338" cy="222" r="4" fill="#7E8DC8" opacity="0.8"/>
    <circle cx="368" cy="206" r="12" fill="#5B6FB4"/>
    <circle cx="252" cy="230" r="12" fill="#52639F"/>
  </g>
  <g>
    <path d="M300 196 C 312 182, 332 184, 336 200 C 340 216, 324 228, 312 226 C 298 224, 292 208, 300 196 Z" fill="#D9574A"/>
    <path d="M302 200 C 310 192, 324 194, 328 204" stroke="#F2A49B" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M372 226 C 382 214, 398 216, 402 230 C 406 244, 392 254, 382 252 C 370 250, 366 236, 372 226 Z" fill="#C84D3A"/>
    <path d="M375 230 C 381 223, 393 225, 396 233" stroke="#F2A49B" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <g>
    <path d="M236 200 C 244 186, 262 188, 264 202 C 266 216, 252 226, 242 224 C 232 222, 230 210, 236 200 Z" fill="#7A5A8F"/>
    <path d="M240 204 C 246 198, 256 200, 258 208" stroke="#B99CC9" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M418 206 C 426 194, 442 196, 444 208 C 446 220, 434 230, 425 228 C 416 226, 414 214, 418 206 Z" fill="#6E4F82"/>
  </g>
  <path d="M216 208 C 206 194, 214 182, 228 184 C 238 186, 240 198, 234 206 C 228 202, 222 204, 216 208 Z" fill="#6E8B5A"/>
  <g stroke="#C9A87C" stroke-width="5" stroke-linecap="round" fill="none">
    <path d="M478 214 C 492 200, 496 236, 484 262"/>
  </g>
  <ellipse cx="484" cy="272" rx="20" ry="12" fill="#E9DCC6"/>
  <ellipse cx="484" cy="268" rx="13" ry="7" fill="#F4EBDC"/>
  <g stroke="#D8C3A2" stroke-width="2.5" stroke-linecap="round" fill="none">
    <path d="M96 128 L 112 140 M540 128 L 556 116"/>
  </g>
</svg>
`

/** Yogurt-bowl illustration (data URL). */
export const SAMPLE_BOWL_PHOTO = svgToDataUrl(bowlSvg)

const deskSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#EFE9DA"/>
  <rect x="0" y="300" width="640" height="180" fill="#D9C9AC"/>
  <rect x="70" y="120" width="240" height="170" rx="10" fill="#FFFDF8" stroke="#C9B896" stroke-width="3"/>
  <g stroke="#D9CBB0" stroke-width="2">
    <path d="M92 160 L 288 160 M92 190 L 288 190 M92 220 L 260 220 M92 250 L 288 250"/>
  </g>
  <g stroke="#C84D3A" stroke-width="4" opacity="0.55">
    <path d="M96 192 L 206 192 M96 222 L 172 222"/>
  </g>
  <rect x="360" y="150" width="220" height="140" rx="12" fill="#4A4A55"/>
  <rect x="372" y="162" width="196" height="108" rx="6" fill="#8E93A8"/>
  <rect x="330" y="290" width="280" height="14" rx="6" fill="#3C3C46"/>
  <rect x="180" y="250" width="120" height="52" rx="8" fill="#E8D9C5" stroke="#C9B896" stroke-width="3"/>
  <circle cx="215" cy="276" r="12" fill="#C84D3A" opacity="0.8"/>
  <circle cx="255" cy="276" r="12" fill="#4E6B50" opacity="0.8"/>
</svg>
`

export const SAMPLE_DESK_PHOTO = svgToDataUrl(deskSvg)

const coffeeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#F1E7DB"/>
  <rect x="0" y="320" width="640" height="160" fill="#D8C3A4"/>
  <path d="M180 200 L 380 200 L 366 350 C 364 366, 196 366, 194 350 Z" fill="#FFFDF8" stroke="#D9CBB0" stroke-width="3"/>
  <path d="M380 220 C 424 224, 424 288, 376 292" fill="none" stroke="#FFFDF8" stroke-width="22" stroke-linecap="round"/>
  <ellipse cx="280" cy="202" rx="102" ry="24" fill="#6B4A2F"/>
  <ellipse cx="280" cy="200" rx="88" ry="18" fill="#8A5C3B"/>
  <path d="M258 176 C 266 158, 258 144, 272 130" stroke="#B99C7E" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.7"/>
  <path d="M300 176 C 308 158, 300 144, 314 132" stroke="#B99C7E" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.5"/>
  <rect x="452" y="230" width="130" height="90" rx="10" fill="#3C3C46"/>
  <rect x="462" y="240" width="110" height="70" rx="5" fill="#7C8199"/>
  <circle cx="120" cy="150" r="34" fill="#C84D3A" opacity="0.35"/>
  <circle cx="520" cy="120" r="24" fill="#C84D3A" opacity="0.25"/>
</svg>
`

export const SAMPLE_COFFEE_PHOTO = svgToDataUrl(coffeeSvg)

export function samplePhotoFor(mode: string): string {
  if (mode === 'academic') return SAMPLE_DESK_PHOTO
  if (mode === 'business') return SAMPLE_COFFEE_PHOTO
  return SAMPLE_BOWL_PHOTO
}
