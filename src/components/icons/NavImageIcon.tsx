import { forwardRef } from 'react'

export interface NavImageIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  src: string
  alt?: string
}

/** Image-based nav icon; accepts className like Lucide icons for consistent sizing. */
const NavImageIcon = forwardRef<HTMLImageElement, NavImageIconProps>(
  ({ src, alt = '', className, ...props }, ref) => (
    <img
      ref={ref}
      src={src}
      alt={alt}
      aria-hidden
      className={`block shrink-0 object-contain ${className ?? ''}`}
      {...props}
    />
  )
)
NavImageIcon.displayName = 'NavImageIcon'

export default NavImageIcon
