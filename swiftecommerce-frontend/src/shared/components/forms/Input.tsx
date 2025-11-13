import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2',
        'text-sm text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-shadow',
        error && 'border-error focus:ring-error',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Input.displayName = 'Input';
