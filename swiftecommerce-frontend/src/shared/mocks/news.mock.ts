export interface MockNewsPost {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  tags: string[];
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export const mockNews: MockNewsPost[] = [
  {
    id: '1',
    storeId: '1',
    storeName: 'Tech Haven',
    title: 'New Wireless Headphones Collection Launched!',
    excerpt:
      'Discover our latest collection of premium wireless ' +
      'headphones featuring cutting-edge technology...',
    content:
      'We are excited to announce the launch of our new wireless headphones collection! ' +
      'Featuring state-of-the-art active noise cancellation, ' +
      '40-hour battery life, and studio-quality sound, ' +
      'these headphones are perfect for music lovers and ' +
      'professionals alike. Available in three stunning colors: ' +
      'Matte Black, Pearl White, and Ocean Blue. Pre-order now and get 15% off!',
    author: {
      id: 'user1',
      name: 'Tech Haven Team',
    },
    tags: ['New Arrival', 'Audio', 'Promotion'],
    views: 1234,
    likes: 89,
    createdAt: '2024-10-20T10:00:00Z',
    updatedAt: '2024-10-20T10:00:00Z',
  },
  {
    id: '2',
    storeId: '1',
    storeName: 'Tech Haven',
    title: 'Holiday Sale: Up to 40% Off on Smart Devices',
    excerpt:
      'Get ready for the holidays with amazing deals on our smart device lineup...',
    content:
      'The holiday season is here, and we have incredible deals for you! ' +
      'Save up to 40% on our entire smart device collection including fitness watches, ' +
      'smart home devices, and more. Sale runs from November 1st to November 30th. ' +
      `Free shipping on all orders over $50. Don't miss out!`,
    author: {
      id: 'user1',
      name: 'Tech Haven Team',
    },
    tags: ['Sale', 'Holiday', 'Smart Devices'],
    views: 2145,
    likes: 156,
    createdAt: '2024-10-15T14:30:00Z',
    updatedAt: '2024-10-15T14:30:00Z',
  },
];
