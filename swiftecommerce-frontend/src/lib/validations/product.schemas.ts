import { z } from 'zod';

export const variantSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU is required')
    .max(50, 'SKU must be less than 50 characters'),
  price: z
    .number()
    .min(0.01, 'Price must be at least $0.01')
    .max(1000000, 'Price must be less than $1,000,000'),
  attributes: z.record(z.any()).optional(),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative'),
  id: z.string().uuid().optional(),
});

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .min(3, 'Product name must be at least 3 characters')
    .max(255, 'Product name must be less than 255 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(20, 'Description must be at least 20 characters'),
  categoryIds: z.array(z.string()).min(1, 'Select at least one category'),
  categories: z.array(z.string()).min(1, 'Select at least one category'),
  variants: z.array(variantSchema).min(1, 'At least one variant is required'),
});

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Category name is required')
    .min(2, 'Category name must be at least 2 characters')
    .max(255, 'Category name must be less than 255 characters'),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export type VariantFormData = z.infer<typeof variantSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
