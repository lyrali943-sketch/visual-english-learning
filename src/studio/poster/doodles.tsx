/**
 * Hand-drawn SVG decorations for the learning poster.
 * Pure SVG attributes (no CSS classes) so they survive the export pipeline.
 */

interface DoodleProps {
  size?: number
  color?: string
  className?: string
  strokeWidth?: number
}

const strokeProps = (color: string, width: number) => ({
  fill: 'none' as const,
  stroke: color,
  strokeWidth: width,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function DoodleArrow({ size = 46, color = 'currentColor', strokeWidth = 2 }: DoodleProps) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 46 33" aria-hidden="true">
      <path d="M3 27 C 12 8, 26 3, 40 6" {...strokeProps(color, strokeWidth)} />
      <path d="M31 2 C 36 2, 40 4, 42 9" {...strokeProps(color, strokeWidth)} />
      <path d="M42 9 L 37.5 4.5 M42 9 L 39 14" {...strokeProps(color, strokeWidth)} />
    </svg>
  )
}

export function DoodleSquiggle({ size = 90, color = 'currentColor', strokeWidth = 2 }: DoodleProps) {
  return (
    <svg width={size} height={size * 0.16} viewBox="0 0 90 14" aria-hidden="true">
      <path
        d="M2 9 C 10 2, 16 12, 24 7 S 38 2, 46 8 S 60 13, 68 7 S 82 2, 88 8"
        {...strokeProps(color, strokeWidth)}
      />
    </svg>
  )
}

export function DoodleSpoon({ size = 34, color = 'currentColor', strokeWidth = 2 }: DoodleProps) {
  return (
    <svg width={size} height={size * 1.7} viewBox="0 0 34 58" aria-hidden="true">
      <ellipse cx="17" cy="14" rx="10" ry="13" {...strokeProps(color, strokeWidth)} />
      <path d="M17 27 L 17 52" {...strokeProps(color, strokeWidth)} />
      <path d="M11 52 C 11 55, 23 55, 23 52" {...strokeProps(color, strokeWidth)} />
    </svg>
  )
}

export function DoodleMic({ size = 30, color = 'currentColor', strokeWidth = 2 }: DoodleProps) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 30 45" aria-hidden="true">
      <rect x="9" y="3" width="12" height="20" rx="6" {...strokeProps(color, strokeWidth)} />
      <path d="M5 20 C 5 30, 11 34, 15 34 C 19 34, 25 30, 25 20" {...strokeProps(color, strokeWidth)} />
      <path d="M15 34 L 15 41 M9 41 L 21 41" {...strokeProps(color, strokeWidth)} />
    </svg>
  )
}

export function DoodleSparkle({ size = 22, color = 'currentColor', strokeWidth = 2 }: DoodleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <path d="M11 2 C 12 8, 14 10, 20 11 C 14 12, 12 14, 11 20 C 10 14, 8 12, 2 11 C 8 10, 10 8, 11 2 Z" {...strokeProps(color, strokeWidth)} />
    </svg>
  )
}

export function DoodleBowl({ size = 44, color = 'currentColor', strokeWidth = 2 }: DoodleProps) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 44 26" aria-hidden="true">
      <path d="M3 12 C 3 22, 11 25, 22 25 C 33 25, 41 22, 41 12" {...strokeProps(color, strokeWidth)} />
      <path d="M1 12 L 43 12" {...strokeProps(color, strokeWidth)} />
      <path d="M14 8 C 15 4, 19 4, 20 8 M24 7 C 25 3, 29 3, 30 7" {...strokeProps(color, strokeWidth)} />
    </svg>
  )
}

export function DoodleStar({ size = 18, color = 'currentColor', strokeWidth = 2 }: DoodleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 1 L 11 7 L 17 9 L 11 11 L 9 17 L 7 11 L 1 9 L 7 7 Z" {...strokeProps(color, strokeWidth)} />
    </svg>
  )
}

/** Small monogram used on the poster and in the site header. */
export function BrandMark({ size = 22, color = 'currentColor', strokeWidth = 2 }: DoodleProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.2" {...strokeProps(color, strokeWidth)} />
      <path d="M7.5 8.5 C 9 12.5, 10.5 15.5, 12 17.5 C 13.5 15.5, 15 12.5, 16.5 8.5" {...strokeProps(color, strokeWidth)} />
      <circle cx="12" cy="5.6" r="1.3" fill={color} />
    </svg>
  )
}

/** Curved annotation arrow used to point at photo details. */
export function AnnotationArrow({
  size = 30,
  color = 'currentColor',
  direction = 'down-left',
  strokeWidth = 2,
}: DoodleProps & { direction?: 'down-left' | 'down-right' | 'up-left' | 'up-right' }) {
  const rotation = { 'down-left': 0, 'down-right': 90, 'up-right': 180, 'up-left': 270 }[direction]
  return (
    <svg
      width={size}
      height={size * 0.8}
      viewBox="0 0 30 24"
      aria-hidden="true"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <path d="M2 4 C 8 16, 16 20, 26 19" {...strokeProps(color, strokeWidth)} />
      <path d="M19 13 C 23 15, 26 17, 28 21" {...strokeProps(color, strokeWidth)} />
      <path d="M28 21 L 22.5 19.5 M28 21 L 25 15.5" {...strokeProps(color, strokeWidth)} />
    </svg>
  )
}
