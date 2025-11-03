import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Download, Users, Store, ShoppingCart, DollarSign } from 'lucide-react';
import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

export function AdminReportsPage() {
  const [timeRange, setTimeRange] = useState('30d');

  const revenueData = [
    { month: 'Jan', revenue: 45000, orders: 350 },
    { month: 'Feb', revenue: 52000, orders: 420 },
    { month: 'Mar', revenue: 48000, orders: 380 },
    { month: 'Apr', revenue: 61000, orders: 480 },
    { month: 'May', revenue: 58000, orders: 450 },
    { month: 'Jun', revenue: 72000, orders: 560 },
  ];

  const storeGrowthData = [
    { month: 'Jan', stores: 850 },
    { month: 'Feb', stores: 920 },
    { month: 'Mar', stores: 1050 },
    { month: 'Apr', stores: 1120 },
    { month: 'May', stores: 1180 },
    { month: 'Jun', stores: 1234 },
  ];

  const userGrowthData = [
    { month: 'Jan', users: 8500 },
    { month: 'Feb', users: 9200 },
    { month: 'Mar', users: 10100 },
    { month: 'Apr', users: 10800 },
    { month: 'May', users: 11600 },
    { month: 'Jun', users: 12543 },
  ];

  const handleExport = (reportType: string) => {
    toast.success(`${reportType} exported successfully`);
  };

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
                {entry.name}:{' '}
                <span className="font-semibold">{entry.value}</span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
          <p className="text-muted-foreground">
            Platform analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">$336K</p>
                <p className="text-xs text-success mt-1">
                  +18.2% from last period
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">2,640</p>
                <p className="text-xs text-success mt-1">
                  +12.5% from last period
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Stores</p>
                <p className="text-2xl font-bold text-foreground">1,234</p>
                <p className="text-xs text-success mt-1">
                  +8.7% from last period
                </p>
              </div>
              <Store className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">12,543</p>
                <p className="text-xs text-success mt-1">
                  +15.3% from last period
                </p>
              </div>
              <Users className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue & Orders</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('Revenue Report')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
                name="Revenue ($)"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Growth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Store Growth</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('Store Growth Report')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storeGrowthData}>
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
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'hsl(var(--primary-foreground))' }}
                />
                <Bar
                  dataKey="stores"
                  fill="hsl(var(--info))"
                  radius={[8, 8, 0, 0]}
                  name="Stores"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Growth</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('User Growth Report')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userGrowthData}>
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
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'hsl(var(--primary-foreground))' }}
                />
                <Bar
                  dataKey="users"
                  fill="hsl(var(--warning))"
                  radius={[8, 8, 0, 0]}
                  name="Users"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
