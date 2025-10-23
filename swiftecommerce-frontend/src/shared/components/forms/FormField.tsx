import { ReactNode } from 'react';
import { FieldError } from 'react-hook-form';
import { cn } from '@/shared/utils/cn';

interface FormFieldProps {
  label?: string;
  error?: FieldError;
  required?: boolean;
  children: ReactNode;
  className?: string;
  hint?: string;
}

export function FormField({
  label,
  error,
  required,
  children,
  className,
  hint,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground flex items-center gap-1">
          {label}
          {required && <span className="text-error">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-error flex items-center gap-1">
          <span className="inline-block">⚠</span>
          {error.message}
        </p>
      )}
    </div>
  );
}
