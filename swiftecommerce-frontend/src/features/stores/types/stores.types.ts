export interface Store {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreData {
  name: string;
  description: string;
}
