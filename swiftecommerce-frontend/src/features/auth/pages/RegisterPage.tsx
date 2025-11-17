import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/shared/components/ui/Link';
import { Logo } from '@/shared/components/ui/Logo';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { PasswordInput } from '@/shared/components/forms/PasswordInput';
import { FormField } from '@/shared/components/forms/FormField';
import { ROUTES } from '@/app/routes/routes';
import {
  registerSchema,
  RegisterFormData,
} from '@/lib/validations/auth.schemas';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { CheckCircle2 } from 'lucide-react';
import { useAuthMutations } from '../hooks/useAuthMutations';
import { useAuth } from '@/app/store';

export function RegisterPage() {
  const { register: registerMutation } = useAuthMutations();
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password');

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    const levels = [
      { strength: 0, label: 'Very Weak', color: 'bg-error' },
      { strength: 1, label: 'Weak', color: 'bg-error' },
      { strength: 2, label: 'Fair', color: 'bg-warning' },
      { strength: 3, label: 'Good', color: 'bg-info' },
      { strength: 4, label: 'Strong', color: 'bg-success' },
      { strength: 5, label: 'Very Strong', color: 'bg-success' },
    ];

    return levels[strength];
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    const result = await registerMutation.mutateAsync(data);
    login(result.user, result.accessToken, result.refreshToken);
    navigate.toDashboard();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center w-full
    bg-gradient-to-b from-muted to-background px-4 py-12"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Create Your Account
            </h1>
            <p className="text-muted-foreground">
              Join thousands of sellers and buyers
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name" error={errors.firstName} required>
                <Input
                  {...register('firstName')}
                  placeholder="John"
                  error={!!errors.firstName}
                  autoComplete="given-name"
                />
              </FormField>

              <FormField label="Last Name" error={errors.lastName} required>
                <Input
                  {...register('lastName')}
                  placeholder="Doe"
                  error={!!errors.lastName}
                  autoComplete="family-name"
                />
              </FormField>
            </div>

            <FormField label="Email" error={errors.email} required>
              <Input
                {...register('email')}
                type="email"
                placeholder="john@example.com"
                error={!!errors.email}
                autoComplete="email"
              />
            </FormField>

            <FormField
              label="Password"
              error={errors.password}
              required
              hint="Must be at least 8 characters with uppercase, lowercase, and number"
            >
              <PasswordInput
                {...register('password')}
                placeholder="Create a strong password"
                error={!!errors.password}
                autoComplete="new-password"
              />
              {password && (
                <div className="space-y-2 mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          level <= passwordStrength!.strength
                            ? passwordStrength?.color
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength:{' '}
                    <span className="font-medium">
                      {passwordStrength?.label}
                    </span>
                  </p>
                </div>
              )}
            </FormField>

            <FormField
              label="Confirm Password"
              error={errors.confirmPassword}
              required
            >
              <PasswordInput
                {...register('confirmPassword')}
                placeholder="Confirm your password"
                error={!!errors.confirmPassword}
                autoComplete="new-password"
              />
            </FormField>

            {/* Terms & Conditions */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={registerMutation.isPending}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{' '}
            </span>
            <Link
              to={ROUTES.LOGIN}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-8 bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-3">
            What you&#39;ll get:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Access to thousands of products
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Start selling in minutes
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Secure payment processing
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              24/7 customer support
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
