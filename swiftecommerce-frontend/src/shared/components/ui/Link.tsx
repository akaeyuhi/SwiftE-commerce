import { Link as RouterLink, LinkProps } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';

interface AppLinkProps extends LinkProps {
  variant?: 'default' | 'primary' | 'ghost';
}

export function Link({
  variant = 'default',
  className,
  children,
  ...props
}: AppLinkProps) {
  const variants = {
    default: 'text-foreground hover:text-primary transition-colors',
    primary: 'text-primary hover:text-primary/80 font-medium transition-colors',
    ghost: 'text-muted-foreground hover:text-foreground transition-colors',
  };

  return (
    <RouterLink className={cn(variants[variant], className)} {...props}>
      {children}
    </RouterLink>
  );
}
