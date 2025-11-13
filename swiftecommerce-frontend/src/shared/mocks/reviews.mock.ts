export const mockReviews = [
  {
    id: '1',
    productId: '1',
    productName: 'Wireless Headphones Pro',
    author: {
      id: 'user1',
      name: 'John Doe',
      avatar: null,
    },
    rating: 5,
    date: '2024-10-15',
    content:
      'Excellent product quality and fast shipping. The noise cancellation ' +
      'is amazing and battery life exceeds expectations. Highly recommend this store!',
    helpfulCount: 12,
    verified: true,
    storeId: '1',
  },
  {
    id: '2',
    productId: '2',
    productName: 'Smart Fitness Watch Ultra',
    author: {
      id: 'user2',
      name: 'Jane Smith',
      avatar: null,
    },
    rating: 4,
    date: '2024-10-10',
    content:
      'Good overall experience. Product matches description perfectly. ' +
      'The fitness tracking features are comprehensive. Shipping could ' +
      'be faster but product quality makes up for it.',
    helpfulCount: 8,
    verified: true,
    storeId: '1',
  },
  {
    id: '3',
    productId: '1',
    productName: 'Wireless Headphones Pro',
    author: {
      id: 'user3',
      name: 'Mike Johnson',
      avatar: null,
    },
    rating: 5,
    date: '2024-10-05',
    content:
      'Amazing quality! The sound is crystal clear and the comfort is ' +
      'unmatched. Worth every penny. Will definitely shop here again.',
    helpfulCount: 15,
    verified: true,
    storeId: '1',
  },
  {
    id: '4',
    productId: '3',
    productName: 'Mechanical Gaming Keyboard RGB',
    author: {
      id: 'user4',
      name: 'Sarah Williams',
      avatar: null,
    },
    rating: 5,
    date: '2024-09-28',
    content:
      'Perfect for gaming! The Cherry MX switches feel great and the RGB ' +
      'lighting is customizable. Fast delivery and great customer service.',
    helpfulCount: 20,
    verified: true,
    storeId: '1',
  },
  {
    id: '5',
    productId: '4',
    productName: 'USB-C Fast Charging Cable',
    author: {
      id: 'user5',
      name: 'David Brown',
      avatar: null,
    },
    rating: 4,
    date: '2024-09-20',
    content:
      'Good quality cable, charges fast as advertised. ' +
      'Braided design feels durable. Good value for the price.',
    helpfulCount: 6,
    verified: true,
    storeId: '1',
  },
];

export type MockReview = typeof mockReviews;
