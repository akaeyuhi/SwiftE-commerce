import { Search } from 'lucide-react';
import { Input, InputProps } from '../forms/Input';
import { forwardRef } from 'react';

interface SearchBarProps extends Omit<InputProps, 'type'> {
  placeholder?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  ({ placeholder = 'Search...', className, ...props }, ref) => (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={ref}
        type="text"
        placeholder={placeholder}
        className={`pl-9 ${className}`}
        {...props}
      />
    </div>
  )
);

SearchBar.displayName = 'SearchBar';
