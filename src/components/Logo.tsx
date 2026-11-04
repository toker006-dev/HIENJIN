/** App mark: 学 on a rounded green square. */
export function Logo({ className = 'size-9 text-lg' }: { className?: string }) {
  return (
    <span aria-hidden lang="zh-CN" className={`font-zh grid shrink-0 place-items-center rounded-xl bg-primary font-bold text-on-primary ${className}`}>
      学
    </span>
  )
}
