/**
 * Fixed light field behind the whole page.
 *
 * Purely decorative: aria-hidden, pointer-events:none, and every animated
 * property is transform-only so it stays on the compositor.
 */
export function Backdrop() {
  return (
    <div className="ldg-backdrop" aria-hidden="true">
      <span className="ldg-field" />
      <span className="ldg-blob ldg-blob-a" />
      <span className="ldg-blob ldg-blob-b" />
      <span className="ldg-blob ldg-blob-c" />
      <span className="ldg-grid" />
    </div>
  )
}