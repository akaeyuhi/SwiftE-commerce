import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2',
        'text-sm text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-none transition-shadow',
        error && 'border-error focus:ring-error',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);

Textarea.displayName = 'Textarea';
