import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/shared/components/ui/Link';
import { Logo } from '@/shared/components/ui/Logo';
import { Input } from '@/shared/components/forms/Input';
import { PasswordInput } from '@/shared/components/forms/PasswordInput';
import { FormField } from '@/shared/components/forms/FormField';
import { ROUTES } from '@/app/routes/routes';
import { loginSchema, LoginFormData } from '@/lib/validations/auth.schemas';
import { useAuth } from '@/app/store';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/Button.tsx';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await authService.login(data)
      // login(response.user, response.token)

      // Mock login for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      login(
        {
          id: '1',
          email: data.email,
          firstName: 'John',
          lastName: 'Doe',
          isEmailVerified: true,
          isActive: true,
          siteRole: 'SITE_ADMIN',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'mock-token'
      );

      toast.success('Login successful!');
      navigate.toDashboard();
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center wid
    bg-gradient-to-b from-muted to-background px-4 py-12"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" showText />
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email" error={errors.email} required>
              <Input
                {...register('email')}
                type="email"
                placeholder="john@example.com"
                error={!!errors.email}
                autoComplete="email"
              />
            </FormField>

            <FormField label="Password" error={errors.password} required>
              <PasswordInput
                {...register('password')}
                placeholder="Enter your password"
                error={!!errors.password}
                autoComplete="current-password"
              />
            </FormField>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">
              Don&#39;t have an account?{' '}
            </span>
            <Link
              to={ROUTES.REGISTER}
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
