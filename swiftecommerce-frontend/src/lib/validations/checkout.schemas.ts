import { z } from 'zod';

export const checkoutSchema = z.object({
  // Shipping Address
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Valid phone number required'),
  addressLine1: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'ZIP code is required'),
  country: z.string().min(2, 'Country is required'),

  // Payment (mock for now)
  cardNumber: z.string().min(16, 'Invalid card number'),
  cardName: z.string().min(3, 'Name on card required'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, 'Invalid expiry (MM/YY)'),
  cvv: z.string().min(3, 'CVV required'),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
