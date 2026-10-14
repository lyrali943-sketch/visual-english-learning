/**
 * iOS-style segmented control (used for learning mode and difficulty).
 * The selected state is communicated by the sliding thumb AND a check icon,
 * never by colour alone.
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  hint?: string
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  name: string
  /** Stack the options vertically with hints (used on narrow screens). */
  stacked?: boolean
  className?: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
  stacked = false,
  className,
}: SegmentedProps<T>) {
  const reducedMotion = useReducedMotion()
  const layoutId = `segmented-thumb-${name}`

  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={className}
      style={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        /* The option labels are `white-space: nowrap` by design, so an unwrapped
           row cannot shrink below their combined width and overflows the page on
           narrow phones. Wrapping keeps every option fully tappable without
           shrinking or truncating the text. */
        flexWrap: stacked ? 'nowrap' : 'wrap',
        gap: stacked ? 8 : 0,
        rowGap: stacked ? 8 : 4,
        width: stacked ? '100%' : undefined,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className="ves-segment-item"
            onClick={() => onChange(option.value)}
            style={stacked ? { width: '100%', justifyContent: 'flex-start', padding: '12px 14px', textAlign: 'left' } : undefined}
          >
            {selected ? (
              <motion.span
                layoutId={reducedMotion ? undefined : layoutId}
                className="ves-segment-thumb"
                style={{ inset: stacked ? 4 : 4 }}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {selected ? <Check size={15} strokeWidth={2.6} /> : null}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>{option.label}</span>
                {option.hint && stacked ? (
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 450,
                      color: selected ? 'var(--color-ves-accent-on-tint)' : 'var(--color-ves-faint)',
                    }}
                  >
                    {option.hint}
                  </span>
                ) : null}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
