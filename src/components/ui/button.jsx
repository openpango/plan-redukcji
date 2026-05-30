export function Button({ className, variant, children, ...props }) {
  let baseClass = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2"
  if (variant === 'ghost') {
    baseClass += " hover:bg-zinc-100 hover:text-zinc-900"
  } else {
    baseClass += " bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-900/90"
  }
  return (
    <button className={`${baseClass} ${className || ''}`} {...props}>
      {children}
    </button>
  )
}
