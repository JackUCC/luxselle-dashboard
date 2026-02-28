export default function AiThinkingDots() {
  const delayClasses = ['dot-delay-0', 'dot-delay-1', 'dot-delay-2']

  return (
    <span className="inline-flex items-center gap-1" aria-label="AI is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full bg-lux-400 animate-dot-bounce ${delayClasses[i]}`}
        />
      ))}
    </span>
  )
}
