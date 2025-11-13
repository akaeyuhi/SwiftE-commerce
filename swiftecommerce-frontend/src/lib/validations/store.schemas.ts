import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z
    .string()
    .min(1, 'Store name is required')
    .min(3, 'Store name must be at least 3 characters')
    .max(100, 'Store name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
});

export const updateStoreSchema = z.object({
  name: z
    .string()
    .min(3, 'Store name must be at least 3 characters')
    .max(100, 'Store name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters')
    .optional(),
});

export const assignRoleSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['STORE_ADMIN', 'STORE_MODERATOR', 'STORE_GUEST'], {
    // eslint-disable-next-line camelcase
    required_error: 'Please select a role',
  }),
});

export type CreateStoreFormData = z.infer<typeof createStoreSchema>;
export type UpdateStoreFormData = z.infer<typeof updateStoreSchema>;
export type AssignRoleFormData = z.infer<typeof assignRoleSchema>;
