import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@/shared/components/ui/Link';
import { Logo } from '@/shared/components/ui/Logo';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import { ROUTES } from '@/app/routes/routes';
import {
  forgotPasswordSchema,
  ForgotPasswordFormData,
} from '@/lib/validations/auth.schemas';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // await authService.forgotPassword(data)

      console.log(data);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div
        className="min-h-screen flex items-center justify-center
      bg-gradient-to-b from-muted to-background px-4 py-12"
      >
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>

          <div className="bg-card border border-border rounded-xl shadow-lg p-8 text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16
            bg-success/10 rounded-full mb-4"
            >
              <Mail className="h-8 w-8 text-success" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Check Your Email
            </h1>
            <p className="text-muted-foreground mb-6">
              We&#39;ve sent a password reset link to{' '}
              <span className="font-medium text-foreground">
                {getValues('email')}
              </span>
            </p>

            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-muted-foreground mb-2">
                Didn&#39;t receive the email?
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Check your spam folder</li>
                <li>Verify the email address is correct</li>
                <li>Wait a few minutes and check again</li>
              </ul>
            </div>

            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full mb-3"
            >
              Try Different Email
            </Button>

            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center
    bg-gradient-to-b from-muted to-background px-4 py-12"
    >
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Reset Password
            </h1>
            <p className="text-muted-foreground">
              Enter your email and we&#39;ll send you a reset link
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Email Address" error={errors.email} required>
              <Input
                {...register('email')}
                type="email"
                placeholder="john@example.com"
                error={!!errors.email}
                autoComplete="email"
              />
            </FormField>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Remember your password?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
