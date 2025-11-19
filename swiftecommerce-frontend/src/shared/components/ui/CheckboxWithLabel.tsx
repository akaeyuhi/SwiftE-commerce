import * as React from 'react';
import { Checkbox, CheckboxProps } from './Checkbox';
import { cn } from '@/shared/utils/cn.ts';

export interface CheckboxWithLabelProps extends CheckboxProps {
  label: string;
  description?: string;
  error?: boolean;
}

export const CheckboxWithLabel = React.forwardRef<
  HTMLButtonElement,
  CheckboxWithLabelProps
>(({ label, description, error, className, id, ...props }, ref) => {
  const checkboxId =
    id || `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start space-x-3">
        <Checkbox
          ref={ref}
          id={checkboxId}
          className={cn(error && 'border-error', className)}
          {...props}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor={checkboxId}
            className={cn(
              'text-sm font-medium leading-none cursor-pointer',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              error && 'text-error'
            )}
          >
            {label}
          </label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-error ml-7">{error}</p>}
    </div>
  );
});
CheckboxWithLabel.displayName = 'CheckboxWithLabel';
