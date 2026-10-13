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
      style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', gap: stacked ? 8 : 0, width: stacked ? '100%' : undefined }}
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
                  <span style={{ fontSize: 11.5, fontWeight: 450, color: selected ? 'rgba(255,255,255,0.75)' : 'var(--color-ves-faint)' }}>
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
