import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/forms/Input';
import { FormField } from '@/shared/components/forms/FormField';
import { Textarea } from '@/shared/components/forms/Textarea';
import { useNavigate } from '@/shared/hooks/useNavigate';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface UserEditData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  avatar: string | null;
  avatarPreview?: string;
}

export function UserEditPage() {
  useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [, setAvatarFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<UserEditData>({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    bio: 'I love shopping for quality products',
    avatar: '/path/to/avatar.jpg',
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({
        ...formData,
        avatarPreview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setFormData({
      ...formData,
      avatar: null,
      avatarPreview: undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      // const response = await userService.updateUser(userId, formData)

      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Profile updated successfully');
      navigate.back();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <button
          onClick={() => navigate.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground
          hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Edit Profile
        </h1>
        <p className="text-muted-foreground mb-8">
          Update your account information
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Section */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">
                  Profile Picture
                </p>
                <div className="flex items-end gap-4">
                  <div
                    className="h-24 w-24 bg-muted rounded-lg overflow-hidden
                  flex items-center justify-center flex-shrink-0"
                  >
                    {formData.avatarPreview || formData.avatar ? (
                      <img
                        src={
                          formData.avatarPreview || formData.avatar || undefined
                        }
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.currentTarget.parentElement
                            ?.querySelector('input')
                            ?.click();
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </label>
                    {formData.avatar && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveAvatar}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>

              {/* Form Fields */}
              <FormField label="First Name" required>
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Last Name" required>
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Email" required>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </FormField>

              <FormField label="Phone">
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </FormField>

              <FormField label="Bio">
                <Textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </FormField>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" loading={isLoading}>
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
