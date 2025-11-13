import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Textarea } from '@/shared/components/forms/Textarea';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/shared/components/ui/Tabs';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  ArrowLeft,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  Ban,
  Download,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string | null;
  role: 'SITE_ADMIN' | 'SELLER' | 'BUYER';
  status: 'active' | 'suspended' | 'banned';
  verified: boolean;
  createdAt: string;
  lastLogin: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  bio: string;
  totalOrders: number;
  totalSpent: number;
  stores: number;
  products: number;
  reviews: number;
  suspensionReason?: string;
  suspendedAt?: string;
}

const mockUser: UserDetail = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1 (555) 123-4567',
  avatar: null,
  role: 'BUYER',
  status: 'active',
  verified: true,
  createdAt: '2024-01-15',
  lastLogin: '2024-03-21',
  address: '123 Main Street',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  country: 'USA',
  bio: 'Love shopping online for quality products',
  totalOrders: 45,
  totalSpent: 2543.5,
  stores: 0,
  products: 0,
  reviews: 12,
};

export function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setUser(mockUser);
      setIsLoading(false);
    }, 500);
  }, [userId]);

  const handleStatusChange = (newStatus: UserDetail['status']) => {
    if (newStatus === 'suspended') {
      setShowReasonModal(true);
      return;
    }

    setUser((prev) => (prev ? { ...prev, status: newStatus } : null));
    toast.success(`User ${newStatus}`);
  };

  const handleConfirmSuspension = () => {
    if (!suspensionReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }

    setUser((prev) =>
      prev
        ? {
            ...prev,
            status: 'suspended',
            suspensionReason,
            suspendedAt: new Date().toISOString(),
          }
        : null
    );
    setShowReasonModal(false);
    setSuspensionReason('');
    toast.success('User suspended with reason');
  };

  const handlePromoteToAdmin = () => {
    setUser((prev) => (prev ? { ...prev, role: 'SITE_ADMIN' } : null));
    toast.success('User promoted to admin');
  };

  const handleBanUser = () => {
    if (confirm('Are you sure you want to ban this user permanently?')) {
      setUser((prev) => (prev ? { ...prev, status: 'banned' } : null));
      toast.success('User banned permanently');
    }
  };

  const handleDeleteUser = () => {
    if (
      confirm(
        'Are you sure you want to delete this user? This action cannot be undone.'
      )
    ) {
      navigate.to('/admin/users');
      toast.success('User deleted');
    }
  };

  const handleExportData = () => {
    if (!user) return;

    const userData = JSON.stringify(user, null, 2);
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(userData)
    );
    element.setAttribute('download', `user-${user.id}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.success('User data exported');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="animate-spin rounded-full h-12
        w-12 border-t-2 border-b-2 border-primary"
        ></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground">User not found</h2>
        <Button onClick={() => navigate.to('/admin/users')} className="mt-4">
          Back to Users
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'suspended':
        return <Badge variant="warning">Suspended</Badge>;
      case 'banned':
        return <Badge variant="error">Banned</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SITE_ADMIN':
        return <Badge variant="error">Site Admin</Badge>;
      case 'SELLER':
        return <Badge variant="secondary">Seller</Badge>;
      default:
        return <Badge>Buyer</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate.to('/admin/users')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-foreground">
                {user.firstName} {user.lastName}
              </h1>
              {getStatusBadge(user.status)}
              {getRoleBadge(user.role)}
            </div>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </DropdownMenuItem>
            {user.status === 'active' ? (
              <DropdownMenuItem
                onClick={() => handleStatusChange('suspended')}
                className="text-warning"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Suspend User
              </DropdownMenuItem>
            ) : user.status === 'suspended' ? (
              <DropdownMenuItem
                onClick={() => handleStatusChange('active')}
                className="text-success"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Reactivate User
              </DropdownMenuItem>
            ) : null}
            {user.role !== 'SITE_ADMIN' && (
              <DropdownMenuItem
                onClick={handlePromoteToAdmin}
                className="text-info"
              >
                <Shield className="h-4 w-4 mr-2" />
                Promote to Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleBanUser} className="text-error">
              <Ban className="h-4 w-4 mr-2" />
              Ban User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeleteUser} className="text-error">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Suspension Reason Modal */}
      {showReasonModal && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3">
              Suspension Reason
            </h3>
            <Textarea
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleConfirmSuspension}>
                Confirm Suspension
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReasonModal(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="h-32 w-32 bg-muted rounded-lg
                flex items-center justify-center mx-auto mb-4"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Avatar"
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No Avatar
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Email
                  </p>
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Phone
                  </p>
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {user.phone}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Role
                  </p>
                  <div className="mt-1">{getRoleBadge(user.role)}</div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Status
                  </p>
                  <div className="mt-1">{getStatusBadge(user.status)}</div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Email Verified
                  </p>
                  <div className="mt-1">
                    {user.verified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Not Verified</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card>
              <CardHeader>
                <CardTitle>Address Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Street Address
                  </p>
                  <p className="text-sm text-foreground">{user.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      City
                    </p>
                    <p className="text-sm text-foreground">{user.city}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      State
                    </p>
                    <p className="text-sm text-foreground">{user.state}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Zip Code
                    </p>
                    <p className="text-sm text-foreground">{user.zipCode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Country
                    </p>
                    <p className="text-sm text-foreground">{user.country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bio & Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Member Since
                  </p>
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Last Login
                  </p>
                  <p className="text-sm text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {new Date(user.lastLogin).toLocaleString()}
                  </p>
                </div>

                {user.suspendedAt && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Suspended At
                    </p>
                    <p className="text-sm text-foreground">
                      {new Date(user.suspendedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {user.suspensionReason && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Suspension Reason
                    </p>
                    <p className="text-sm text-foreground bg-muted p-2 rounded">
                      {user.suspensionReason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bio */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Bio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {user.bio || 'No bio provided'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Orders
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {user.totalOrders}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Spent
                </p>
                <p className="text-3xl font-bold text-foreground">
                  ${user.totalSpent.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">
                  Stores Owned
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {user.stores}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-1">
                  Reviews Left
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {user.reviews}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Detailed order history coming soon
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Password Reset</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Send password reset link to user
                </p>
                <Button variant="outline">Send Reset Link</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Current Status: <Badge variant="warning">Not Enabled</Badge>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Current Device
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last active: now
                      </p>
                    </div>
                    <Badge>Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
