/** Square cinnabar seal (印章) with one character, the app's logo mark. `stamp` plays the stamping animation. */
export function Seal({ char = '学', className = 'size-9 text-xl', stamp = false }: { char?: string; className?: string; stamp?: boolean }) {
  return (
    <span
      aria-hidden
      lang="zh-CN"
      className={`font-zh inline-flex shrink-0 items-center justify-center rounded-md bg-teal-700 font-bold text-white ring-2 ring-teal-700 ring-offset-2 ring-offset-surface outline-1 -outline-offset-4 outline-white/70 ${
        stamp ? 'animate-stamp' : ''
      } ${className}`}
    >
      {char}
    </span>
  )
}
