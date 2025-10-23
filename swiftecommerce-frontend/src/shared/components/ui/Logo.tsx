import { useTheme } from '@/lib/theme';
import { cn } from '@/shared/utils/cn';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const { theme } = useTheme();

  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const logoSrc =
    theme === 'dark'
      ? '/src/assets/images/logo-minimal.svg'
      : '/src/assets/images/logo-minimal-dark.svg';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src={logoSrc}
        alt="SwiftE-commerce"
        className={cn(sizes[size], 'object-contain')}
      />
      {showText && (
        <span className={cn('font-bold text-foreground', textSizes[size])}>
          SwiftE-commerce
        </span>
      )}
    </div>
  );
}
