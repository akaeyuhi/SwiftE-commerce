import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import { Package, Layers, Eye } from 'lucide-react';
import { Product } from '../types/product.types';

interface StoreProductsStatsProps {
  products: Product[];
}

export function StoreProductsStats({ products }: StoreProductsStatsProps) {
  const totalVariants = products.reduce((sum, p) => sum + p.variants.length, 0);
  const totalStock = products.reduce(
    (sum, p) =>
      sum +
      p.variants.reduce((s: number, v: any) => s + v.inventory.quantity, 0),
    0
  );
  const totalSales = products.reduce((sum, p) => sum + p.totalSales, 0);

  const stats = [
    {
      title: 'Total Products',
      value: products.length,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Variants',
      value: totalVariants,
      icon: Layers,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Total Stock',
      value: totalStock,
      icon: Package,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Sales',
      value: totalSales,
      icon: Eye,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return <StatsGrid stats={stats} columns={4} />;
}
