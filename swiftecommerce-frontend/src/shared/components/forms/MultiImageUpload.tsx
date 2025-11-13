import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, X } from 'lucide-react';

interface MultiImageUploadProps {
  onFilesSelect: (files: File[]) => void;
  maxSizeMb?: number;
  maxFiles?: number;
  label: string;
  existingImageUrls?: string[];
  onRemoveExistingImage?: (index: number) => void;
}

export function MultiImageUpload({
  onFilesSelect,
  maxSizeMb = 5,
  maxFiles = 10,
  label,
  existingImageUrls = [],
  onRemoveExistingImage,
}: MultiImageUploadProps) {
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Generate previews for new files
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);

    return () => {
      // Clean up object URLs when component unmounts or files change
      newPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const currentTotalFiles = existingImageUrls.length + newFiles.length;

    if (currentTotalFiles + selectedFiles.length > maxFiles) {
      toast.error(`You can upload a maximum of ${maxFiles} images.`);
      return;
    }

    const validFiles: File[] = [];
    selectedFiles.forEach((file) => {
      const maxSize = maxSizeMb * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(
          `File '${file.name}' size must be less than ${maxSizeMb}MB`
        );
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`File '${file.name}' is not an image.`);
        return;
      }
      validFiles.push(file);
    });

    setNewFiles((prevFiles) => [...prevFiles, ...validFiles]);
    onFilesSelect([...newFiles, ...validFiles]);

    // Clear the input to allow re-uploading the same file if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveNewImage = (index: number) => {
    const updatedFiles = newFiles.filter((_, i) => i !== index);
    setNewFiles(updatedFiles);
    onFilesSelect(updatedFiles);
  };

  const totalImages = existingImageUrls.length + newFiles.length;
  const canUploadMore = totalImages < maxFiles;

  return (
    <div className="space-y-4">
      <label className="text-sm font-semibold text-foreground block">
        {label}
      </label>

      {(existingImageUrls.length > 0 || newFiles.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Existing images */}
          {existingImageUrls.map((imageUrl, index) => (
            <div
              key={`existing-${index}`}
              className="relative group aspect-square rounded-lg
              overflow-hidden border border-border"
            >
              <img
                src={imageUrl}
                alt={`Product ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {onRemoveExistingImage && (
                <button
                  type="button"
                  onClick={() => onRemoveExistingImage(index)}
                  className="absolute -top-2 -right-2 h-6 w-6 bg-error text-error-foreground
                    rounded-full flex items-center justify-center
                    opacity-0 group-hover:opacity-100
                    transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {/* New images */}
          {newFiles.map((file, index) => (
            <div
              key={`new-${file.name + index}`}
              className="relative group aspect-square
              rounded-lg overflow-hidden border border-border"
            >
              <img
                src={previews[index]}
                alt={`New ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveNewImage(index)}
                className="absolute -top-2 -right-2 h-6 w-6 bg-error text-error-foreground
                  rounded-full flex items-center justify-center
                  opacity-0 group-hover:opacity-100
                  transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
              {index === 0 && existingImageUrls.length === 0 && (
                <div
                  className="absolute bottom-2 left-2 px-2 py-1
                bg-primary text-primary-foreground text-xs rounded"
                >
                  Main
                </div>
              )}
              <div
                className="absolute bottom-2 right-2 px-2 py-1
                bg-success text-success-foreground text-xs rounded"
              >
                New
              </div>
            </div>
          ))}
        </div>
      )}

      {canUploadMore && (
        <label className="block">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
          />
          <div
            className="border-2 border-dashed border-border rounded-lg p-8
            text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground mb-1">
              Click to upload images
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG up to {maxSizeMb}MB ({maxFiles - totalImages} remaining)
            </p>
          </div>
        </label>
      )}
    </div>
  );
}
