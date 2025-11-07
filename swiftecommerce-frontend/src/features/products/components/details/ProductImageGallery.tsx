import { useState } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Package } from 'lucide-react';

interface ProductImageGalleryProps {
  images: { url: string; altText?: string }[];
}

export function ProductImageGallery({ images }: ProductImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="aspect-square bg-muted flex items-center justify-center">
            <Package className="h-24 w-24 text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="aspect-square bg-muted flex items-center justify-center">
          <img
            src={images[currentImageIndex]?.url}
            alt={images[currentImageIndex]?.altText || 'Product image'}
            className="w-full h-full object-cover"
          />
        </div>
      </Card>

      {/* Thumbnail Images */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((image, i) => (
            <Card
              key={i}
              className={`cursor-pointer overflow-hidden ${
                currentImageIndex === i ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setCurrentImageIndex(i)}
            >
              <div className="aspect-square bg-muted flex items-center justify-center">
                <img
                  src={image.url}
                  alt={image.altText || `Product thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
