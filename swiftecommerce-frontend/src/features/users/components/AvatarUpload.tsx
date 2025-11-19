import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button.tsx';
import { useUploadAvatar } from '@/features/users/hooks/useUploadAvatar.ts';
import { ImageUpload } from '@/shared/components/forms/ImageUpload';
import { useAuth } from '@/app/store';

export const AvatarUpload = () => {
  const { user, updateUser } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { mutateAsync: uploadAvatar, isPending } = useUploadAvatar();

  const handleSubmit = async () => {
    if (avatarFile) {
      const result = await uploadAvatar(avatarFile);
      console.log(result);
      updateUser({ avatarUrl: result.avatarUrl });
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <ImageUpload
        label="Avatar"
        onFileSelect={setAvatarFile}
        maxSizeMb={2}
        aspectRatio="square"
        initialImageUrl={user?.avatarUrl || null}
        className="w-32 h-32"
      />
      <Button
        onClick={handleSubmit}
        disabled={isPending || !avatarFile}
        className="mt-8"
      >
        {isPending ? 'Uploading...' : 'Save Avatar'}
      </Button>
    </div>
  );
};
