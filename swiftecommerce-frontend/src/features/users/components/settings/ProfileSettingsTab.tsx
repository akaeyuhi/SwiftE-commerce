import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import { useAuth } from '@/app/store';
import { useUserMutations } from '../../hooks/useUsersMutations';
import { useUserProfile } from '../../hooks/useUsers';
import { AvatarUpload } from '../../components/AvatarUpload';
import { QueryLoader } from '@/shared/components/loaders/QueryLoader';
import { useEffect } from 'react';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileSettingsTab() {
  const { user: authUser } = useAuth();
  const { data: profile, isLoading, error } = useUserProfile();
  const { updateProfile } = useUserMutations();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    }
  }, [profile, reset]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate(data);
  };

  return (
    <QueryLoader isLoading={isLoading} error={error}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h3 className="font-semibold text-foreground mb-2">
            Profile Picture
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a new avatar.
          </p>
          <AvatarUpload />
        </div>
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField label="First Name" error={errors.firstName}>
              <Input {...register('firstName')} />
            </FormField>

            <FormField label="Last Name" error={errors.lastName}>
              <Input {...register('lastName')} />
            </FormField>

            <FormField label="Email">
              <Input type="email" value={authUser?.email} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed.
              </p>
            </FormField>

            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                loading={updateProfile.isPending}
                disabled={!isDirty}
              >
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={!isDirty}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </QueryLoader>
  );
}
