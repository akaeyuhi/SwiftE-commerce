import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
  maxSizeMb?: number;
  label: string;
  aspectRatio?: 'video' | 'square';
  className?: string;
  initialImageUrl?: string | null;
}

export function ImageUpload({
  onFileSelect,
  maxSizeMb = 10,
  label,
  aspectRatio = 'video',
  className,
  initialImageUrl,
}: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initialImageUrl || null
  );

  useEffect(() => {
    if (initialImageUrl) {
      setPreview(initialImageUrl);
    }
  }, [initialImageUrl]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const maxSize = maxSizeMb * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error(`File size must be less than ${maxSizeMb}MB`);
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
      setFile(selectedFile);
      onFileSelect(selectedFile ?? file);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleRemoveImage = () => {
    setFile(null);
    setPreview(null);
    onFileSelect(null);
  };

  const aspectClass =
    aspectRatio === 'video' ? 'aspect-video' : 'aspect-square';

  return (
    <div className={className}>
      <label className="text-sm font-semibold text-foreground mb-3 block">
        {label}
      </label>
      <div className="relative">
        {preview ? (
          <div className={`relative ${aspectClass}`}>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 h-8 w-8 bg-background/80 rounded-full
              flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>
        ) : (
          <div
            className={`w-full bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors ${aspectClass}`}
          >
            <label className="flex flex-col items-center cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">
                Click to upload
              </span>
              <span className="text-xs text-muted-foreground">
                Max {maxSizeMb}MB
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
