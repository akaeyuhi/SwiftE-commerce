import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  CreateOrderRequest,
  UpdateOrderStatusRequest,
} from '../types/order.types';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export function useOrderMutations(storeId: string) {
  const queryClient = useQueryClient();

  const createOrder = useMutation({
    mutationFn: (data: CreateOrderRequest) =>
      api.orders.createOrder(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      toast.success('Order created successfully');
    },
    onError: () => toast.error('Failed to create order'),
  });

  const updateOrderStatus = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateOrderStatusRequest;
    }) => api.orders.updateOrderStatus(storeId, orderId, data),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(storeId, orderId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update order status'),
  });

  const cancelOrder = useMutation({
    mutationFn: (orderId: string) => api.orders.cancelOrder(storeId, orderId),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(storeId, orderId),
      });
      toast.success('Order cancelled');
    },
    onError: () => toast.error('Failed to cancel order'),
  });

  return { createOrder, updateOrderStatus, cancelOrder };
}
