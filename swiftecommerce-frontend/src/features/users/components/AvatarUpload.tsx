import { useDropzone } from 'react-dropzone';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button.tsx';
import { useUploadAvatar } from '@/features/users/hooks/useUploadAvatar.ts';

export const AvatarUpload = () => {
  const [avatar, setAvatar] = useState<File | undefined>();

  const { mutate: uploadAvatar, isPending } = useUploadAvatar();

  const onDrop = (acceptedFiles: File[]) => {
    setAvatar(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.webp'] },
    maxFiles: 1,
  });

  const handleSubmit = () => {
    if (avatar) {
      uploadAvatar(avatar);
    }
  };

  return (
    <div>
      <div
        {...getRootProps({ className: 'dropzone' })}
        className="border-2 border-dashed
        border-gray-300 rounded-md p-4 text-center cursor-pointer mb-4"
      >
        <input {...getInputProps()} />
        {avatar ? (
          <p>{avatar.name}</p>
        ) : (
          <p>Drag &#39;n&#39; drop an avatar here, or click to select one</p>
        )}
      </div>
      <Button onClick={handleSubmit} disabled={isPending || !avatar}>
        {isPending ? 'Uploading...' : 'Upload Avatar'}
      </Button>
    </div>
  );
};
