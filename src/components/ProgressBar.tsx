/** Simple progress bar; `ratio` is 0–1. */
export function ProgressBar({ ratio }: { ratio: number }) {
  const pct = Math.min(1, Math.max(0, ratio)) * 100
  return (
    <div className="h-3 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  )
}
