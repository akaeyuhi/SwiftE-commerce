import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidateFeature } from '@/lib/queryKeys';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
} from '@/features/orders/types/order.types.ts';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function useOrderMutations(userId: string, storeId: string) {
  const queryClient = useQueryClient();

  const createOrder = useMutation({
    mutationFn: (data: CreateOrderDto) =>
      api.orders.createUserOrder(userId, storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.orders(storeId));
      toast.success('Order created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order');
    },
  });

  const createUserOrder = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: CreateOrderDto }) =>
      api.orders.createUserOrder(storeId, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.orders(storeId));
      toast.success('Order created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create order');
    },
  });

  const updateOrder = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateOrderDto> }) =>
      api.orders.updateOrder(storeId, id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(storeId, id),
      });
      queryClient.invalidateQueries(invalidateFeature.orders(storeId));
      toast.success('Order updated successfully');
    },
    onError: () => toast.error('Failed to update order'),
  });

  const deleteOrder = useMutation({
    mutationFn: (orderId: string) => api.orders.deleteOrder(storeId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries(invalidateFeature.orders(storeId));
      toast.success('Order deleted successfully');
    },
    onError: () => toast.error('Failed to delete order'),
  });

  const checkout = useMutation({
    mutationFn: (orderId: string) =>
      api.orders.updateOrderStatus(storeId, orderId, {
        orderStatus: 'processing',
      }),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(storeId, orderId),
      });
      queryClient.invalidateQueries(invalidateFeature.orders(storeId));
      toast.success('Order checked out successfully');
    },
    onError: () => toast.error('Failed to checkout order'),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateOrderStatusDto;
    }) => api.orders.updateOrderStatus(storeId, orderId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(storeId, orderId),
      });
      toast.success('Order status updated successfully');
    },
    onError: () => toast.error('Failed to update order status'),
  });

  const cancelOrder = useMutation({
    mutationFn: (orderId: string) => api.orders.cancelOrder(storeId, orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(storeId, orderId),
      });
      queryClient.invalidateQueries(invalidateFeature.orders(storeId));
      toast.success('Order cancelled successfully');
    },
    onError: () => toast.error('Failed to cancel order'),
  });

  const updateShipping = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: {
        trackingNumber?: string;
        carrier?: string;
        estimatedDelivery?: string;
      };
    }) => api.orders.updateShipping(storeId, orderId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(storeId, orderId),
      });
      toast.success('Shipping information updated successfully');
    },
    onError: () => toast.error('Failed to update shipping information'),
  });

  const markDelivered = useMutation({
    mutationFn: (orderId: string) =>
      api.orders.markAsDelivered(storeId, orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(storeId, orderId),
      });
      toast.success('Order marked as delivered');
    },
    onError: () => toast.error('Failed to mark order as delivered'),
  });

  return {
    createOrder,
    createUserOrder,
    updateOrder,
    deleteOrder,
    checkout,
    updateStatus,
    cancelOrder,
    updateShipping,
    markDelivered,
  };
}
