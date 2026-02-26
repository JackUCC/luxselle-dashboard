import type { InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
  error?: boolean
}

export default function Input({
  className = '',
  error = false,
  ...rest
}: InputProps) {
  const errorClass = error ? 'border-lux-danger focus:border-lux-danger' : ''
  return (
    <input
      className={`lux-input ${errorClass} ${className}`.trim()}
      {...rest}
    />
  )
}
