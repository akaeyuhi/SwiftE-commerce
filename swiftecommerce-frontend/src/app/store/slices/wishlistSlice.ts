import { SliceCreator } from '../types';

export interface WishlistSlice {
  // State
  likedProductIds: string[];
  followedStoreIds: string[];

  // Actions
  setInitialState: (likes: { productId?: string; storeId?: string }[]) => void;
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;

  followStore: (storeId: string) => void;
  unfollowStore: (storeId: string) => void;
  isFollowingStore: (storeId: string) => boolean;

  // Getters
  getWishlistCount: () => number;
  getFollowedStoresCount: () => number;
}

export const createWishlistSlice: SliceCreator<WishlistSlice> = (set, get) => ({
  likedProductIds: [],
  followedStoreIds: [],

  setInitialState: (likes) => {
    const productIds = new Set<string>();
    const storeIds = new Set<string>();
    likes.forEach((like) => {
      if (like.productId) productIds.add(like.productId);
      if (like.storeId) storeIds.add(like.storeId);
    });
    set(
      {
        likedProductIds: Array.from(productIds),
        followedStoreIds: Array.from(storeIds),
      },
      false,
      'wishlist/setInitialState'
    );
  },

  // Product wishlist actions
  addToWishlist: (productId) => {
    const current = get().likedProductIds;
    if (!current.includes(productId)) {
      set(
        { likedProductIds: [...current, productId] },
        false,
        'wishlist/addToWishlist'
      );
    }
  },

  removeFromWishlist: (productId) => {
    set(
      (state) => ({
        likedProductIds: state.likedProductIds.filter((id) => id !== productId),
      }),
      false,
      'wishlist/removeFromWishlist'
    );
  },

  isInWishlist: (productId) => get().likedProductIds.includes(productId),

  clearWishlist: () => {
    set({ likedProductIds: [] }, false, 'wishlist/clearWishlist');
  },

  // Store follow actions
  followStore: (storeId) => {
    const current = get().followedStoreIds;
    if (!current.includes(storeId)) {
      set(
        { followedStoreIds: [...current, storeId] },
        false,
        'wishlist/followStore'
      );
    }
  },

  unfollowStore: (storeId) => {
    set(
      (state) => ({
        followedStoreIds: state.followedStoreIds.filter((id) => id !== storeId),
      }),
      false,
      'wishlist/unfollowStore'
    );
  },

  isFollowingStore: (storeId) => get().followedStoreIds.includes(storeId),

  // Getters
  getWishlistCount: () => get().likedProductIds.length,
  getFollowedStoresCount: () => get().followedStoreIds.length,
});
