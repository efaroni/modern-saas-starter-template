import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success'
  className?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = 'default', className = '', ...props }, ref) => {
    const variantClasses = {
      default: 'border-gray-300 focus:ring-blue-500',
      error: 'border-red-500 focus:ring-red-500',
      success: 'border-green-500 focus:ring-green-500'
    }

    return (
      <input
        ref={ref}
        className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${variantClasses[variant]} ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'