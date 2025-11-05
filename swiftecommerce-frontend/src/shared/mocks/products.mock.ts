// Define proper types first
export interface MockCategory {
  id: string;
  name: string;
}

export interface MockInventory {
  quantity: number;
}

export interface MockVariant {
  id: string;
  sku: string;
  price: number;
  inventory: MockInventory;
  attributes?: Record<string, string>; // ✅ Properly typed as Record
}

export interface MockProduct {
  id: string;
  name: string;
  description: string;
  storeId: string;
  categories: MockCategory[];
  variants: MockVariant[];
  mainPhotoUrl: string | null;
  averageRating: number;
  reviewCount: number;
  totalSales: number;
  likeCount: number;
  viewCount: number;
  createdAt: string;
}

// Now use the types in the mock data
export const mockProducts: MockProduct[] = [
  {
    id: '1',
    name: 'Wireless Headphones Pro',
    description:
      'Premium wireless headphones with active noise cancellation, 40-hour battery life, ' +
      'and studio-quality sound. Perfect for music lovers and professionals ' +
      'who demand the best audio experience.',
    categories: [
      { id: '1', name: 'Electronics' },
      { id: '2', name: 'Audio' },
    ],
    variants: [
      {
        id: 'v1',
        sku: 'WHP-BLK-001',
        price: 299.99,
        inventory: { quantity: 45 },
        attributes: { color: 'Matte Black', size: 'Standard' },
      },
      {
        id: 'v2',
        sku: 'WHP-WHT-001',
        price: 299.99,
        inventory: { quantity: 23 },
        attributes: { color: 'Pearl White', size: 'Standard' },
      },
      {
        id: 'v3',
        sku: 'WHP-BLU-001',
        price: 319.99,
        inventory: { quantity: 12 },
        attributes: { color: 'Ocean Blue', size: 'Standard' },
      },
    ],
    mainPhotoUrl: null,
    averageRating: 4.8,
    reviewCount: 342,
    totalSales: 1256,
    likeCount: 834,
    storeId: '1',
    viewCount: 5234,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    storeId: '1',
    name: 'Smart Fitness Watch Ultra',
    description:
      'Advanced fitness tracker with heart rate monitor, GPS, sleep ' +
      'tracking, and 50+ sport modes. Water resistant up to 50m with 14-day battery life.',
    categories: [
      { id: '1', name: 'Electronics' },
      { id: '3', name: 'Wearables' },
    ],
    variants: [
      {
        id: 'v4',
        sku: 'SFW-S-BLK-001',
        price: 399.99,
        inventory: { quantity: 18 },
        attributes: { size: 'Small (38mm)', color: 'Black' },
      },
      {
        id: 'v5',
        sku: 'SFW-M-BLK-001',
        price: 399.99,
        inventory: { quantity: 25 },
        attributes: { size: 'Medium (42mm)', color: 'Black' },
      },
      {
        id: 'v6',
        sku: 'SFW-L-BLK-001',
        price: 399.99,
        inventory: { quantity: 15 },
        attributes: { size: 'Large (46mm)', color: 'Black' },
      },
      {
        id: 'v7',
        sku: 'SFW-M-SLV-001',
        price: 419.99,
        inventory: { quantity: 8 },
        attributes: { size: 'Medium (42mm)', color: 'Silver' },
      },
    ],
    mainPhotoUrl: null,
    averageRating: 4.9,
    reviewCount: 567,
    totalSales: 2103,
    likeCount: 1456,
    viewCount: 8921,
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    storeId: '1',
    name: 'Mechanical Gaming Keyboard RGB',
    description:
      'Professional gaming keyboard with Cherry MX switches, ' +
      'customizable RGB lighting, programmable macros, ' +
      'and N-key rollover for ultimate gaming performance.',
    categories: [
      { id: '1', name: 'Electronics' },
      { id: '4', name: 'Gaming' },
    ],
    variants: [
      {
        id: 'v8',
        sku: 'MGK-RED-001',
        price: 159.99,
        inventory: { quantity: 34 },
        attributes: { switch: 'Cherry MX Red', layout: 'Full Size' },
      },
      {
        id: 'v9',
        sku: 'MGK-BRN-001',
        price: 159.99,
        inventory: { quantity: 28 },
        attributes: { switch: 'Cherry MX Brown', layout: 'Full Size' },
      },
      {
        id: 'v10',
        sku: 'MGK-BLU-001',
        price: 169.99,
        inventory: { quantity: 15 },
        attributes: { switch: 'Cherry MX Blue', layout: 'Full Size' },
      },
      {
        id: 'v11',
        sku: 'MGK-RED-TKL-001',
        price: 149.99,
        inventory: { quantity: 22 },
        attributes: { switch: 'Cherry MX Red', layout: 'Tenkeyless' },
      },
    ],
    mainPhotoUrl: null,
    averageRating: 4.7,
    reviewCount: 289,
    totalSales: 892,
    likeCount: 623,
    viewCount: 4156,
    createdAt: '2024-02-15',
  },
  {
    id: '4',
    storeId: '1',
    name: 'USB-C Fast Charging Cable',
    description:
      'Durable braided USB-C cable with 100W fast charging support ' +
      'and 10Gbps data transfer. Compatible with all USB-C devices.',
    categories: [
      { id: '1', name: 'Electronics' },
      { id: '5', name: 'Accessories' },
    ],
    variants: [
      {
        id: 'v12',
        sku: 'USBC-3FT-BLK-001',
        price: 14.99,
        inventory: { quantity: 156 },
        attributes: { length: '3ft / 1m', color: 'Black' },
      },
      {
        id: 'v13',
        sku: 'USBC-6FT-BLK-001',
        price: 19.99,
        inventory: { quantity: 203 },
        attributes: { length: '6ft / 2m', color: 'Black' },
      },
      {
        id: 'v14',
        sku: 'USBC-3FT-WHT-001',
        price: 14.99,
        inventory: { quantity: 98 },
        attributes: { length: '3ft / 1m', color: 'White' },
      },
      {
        id: 'v15',
        sku: 'USBC-6FT-WHT-001',
        price: 19.99,
        inventory: { quantity: 145 },
        attributes: { length: '6ft / 2m', color: 'White' },
      },
    ],
    mainPhotoUrl: null,
    averageRating: 4.6,
    reviewCount: 1234,
    totalSales: 5678,
    likeCount: 2345,
    viewCount: 12456,
    createdAt: '2024-01-20',
  },
  {
    id: '5',
    storeId: '1',
    name: 'Ergonomic Laptop Stand',
    description:
      'Adjustable aluminum laptop stand with heat dissipation design. ' +
      'Improves posture and reduces neck strain. Compatible with all laptops up to 17 inches.',
    categories: [
      { id: '5', name: 'Accessories' },
      { id: '6', name: 'Office' },
    ],
    variants: [
      {
        id: 'v16',
        sku: 'ELS-SLV-001',
        price: 49.99,
        inventory: { quantity: 67 },
        attributes: { color: 'Silver', material: 'Aluminum' },
      },
      {
        id: 'v17',
        sku: 'ELS-BLK-001',
        price: 49.99,
        inventory: { quantity: 54 },
        attributes: { color: 'Space Gray', material: 'Aluminum' },
      },
    ],
    mainPhotoUrl: null,
    averageRating: 4.5,
    reviewCount: 178,
    totalSales: 445,
    likeCount: 312,
    viewCount: 2134,
    createdAt: '2024-03-01',
  },
  {
    id: '6',
    storeId: '1',
    name: 'Wireless Mouse Pro',
    description:
      'Precision wireless mouse with ergonomic design, 7 programmable buttons, ' +
      'adjustable DPI up to 16000, and rechargeable battery lasting up to 70 hours.',
    categories: [
      { id: '1', name: 'Electronics' },
      { id: '5', name: 'Accessories' },
    ],
    variants: [
      {
        id: 'v18',
        sku: 'WMP-BLK-001',
        price: 79.99,
        inventory: { quantity: 42 },
        attributes: { color: 'Black', type: 'Right-handed' },
      },
      {
        id: 'v19',
        sku: 'WMP-WHT-001',
        price: 79.99,
        inventory: { quantity: 28 },
        attributes: { color: 'White', type: 'Right-handed' },
      },
      {
        id: 'v20',
        sku: 'WMP-AMB-001',
        price: 89.99,
        inventory: { quantity: 15 },
        attributes: { color: 'Black', type: 'Ambidextrous' },
      },
    ],
    mainPhotoUrl: null,
    averageRating: 4.7,
    reviewCount: 456,
    totalSales: 1023,
    likeCount: 678,
    viewCount: 4567,
    createdAt: '2024-02-10',
  },
];
