import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Eye,
  Heart,
} from 'lucide-react';
import { useState } from 'react';
import { StatsGrid } from '@/shared/components/ui/StatsGrid';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-foreground">
              {entry.name}: <span className="font-semibold">{entry.value}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function StoreAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');

  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231.89',
      change: '+20.1%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Orders',
      value: '1,234',
      change: '+15.3%',
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Customers',
      value: '892',
      change: '+8.2%',
      trend: 'up' as const,
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: 'Conversion Rate',
      value: '3.2%',
      change: '-0.4%',
      trend: 'down' as const,
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const topProducts = [
    {
      name: 'Wireless Headphones',
      revenue: '$5,850',
      sales: 45,
      change: '+12%',
    },
    { name: 'Smart Watch', revenue: '$9,600', sales: 32, change: '+8%' },
    { name: 'USB-C Cable', revenue: '$890', sales: 89, change: '+25%' },
    { name: 'Phone Case', revenue: '$1,340', sales: 67, change: '-5%' },
    { name: 'Laptop Stand', revenue: '$2,450', sales: 49, change: '+15%' },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 3500, orders: 120 },
    { month: 'Feb', revenue: 4200, orders: 145 },
    { month: 'Mar', revenue: 3800, orders: 132 },
    { month: 'Apr', revenue: 5100, orders: 178 },
    { month: 'May', revenue: 4800, orders: 165 },
    { month: 'Jun', revenue: 6200, orders: 210 },
  ];

  // Sales by category data
  const categoryData = [
    { name: 'Electronics', value: 4500 },
    { name: 'Accessories', value: 3200 },
    { name: 'Audio', value: 2800 },
    { name: 'Wearables', value: 2100 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Track your store performance and insights
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Revenue Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Orders Overview</CardTitle>
          <CardDescription>
            Monthly revenue and order trends for the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
                name="Revenue ($)"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--success))' }}
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Sales Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales by Category</CardTitle>
          <CardDescription>
            Revenue distribution across product categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--primary-foreground))' }}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--muted-foreground))"
                radius={[8, 8, 0, 0]}
                name="Revenue ($)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>
              Best performing products this period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div
                    className="h-10 w-10 bg-primary/10 rounded-lg flex
                  items-center justify-center flex-shrink-0"
                  >
                    <span className="text-sm font-bold text-primary">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {product.sales} sales
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {product.revenue}
                    </p>
                    <p
                      className={`text-xs ${
                        product.change.startsWith('+')
                          ? 'text-success'
                          : 'text-error'
                      }`}
                    >
                      {product.change}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Store Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Store Insights</CardTitle>
            <CardDescription>
              Key metrics and performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Page Views</span>
              </div>
              <span className="font-semibold text-foreground">12,345</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Favorites</span>
              </div>
              <span className="font-semibold text-foreground">892</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  Avg. Order Value
                </span>
              </div>
              <span className="font-semibold text-foreground">$89.50</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-foreground">Return Rate</span>
              </div>
              <span className="font-semibold text-foreground">2.3%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
