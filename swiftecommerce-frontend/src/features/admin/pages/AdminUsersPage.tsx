import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useNavigate } from '@/shared/hooks/useNavigate';
import {
  Users,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SITE_ADMIN' | 'SELLER' | 'BUYER';
  status: 'active' | 'suspended' | 'banned';
  verified: boolean;
  createdAt: string;
  lastLogin: string;
}

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock users data
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'BUYER',
      status: 'active',
      verified: true,
      createdAt: '2024-01-15',
      lastLogin: '2024-03-20',
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'SELLER',
      status: 'active',
      verified: true,
      createdAt: '2024-02-10',
      lastLogin: '2024-03-19',
    },
    {
      id: '3',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'SITE_ADMIN',
      status: 'active',
      verified: true,
      createdAt: '2023-12-01',
      lastLogin: '2024-03-21',
    },
  ]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus =
      filterStatus === 'all' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSuspendUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'suspended' } : u))
    );
    toast.success('User suspended');
  };

  const handleActivateUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u))
    );
    toast.success('User activated');
  };

  const handleBanUser = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'banned' } : u))
    );
    toast.success('User banned');
  };

  const handleMakeAdmin = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: 'SITE_ADMIN' } : u))
    );
    toast.success('User promoted to admin');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SITE_ADMIN':
        return 'error';
      case 'SELLER':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'banned':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage users, roles, and permissions
          </p>
        </div>
        <Button onClick={() => toast.info('Create user feature coming soon')}>
          <Users className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SITE_ADMIN">Site Admin</SelectItem>
                <SelectItem value="SELLER">Seller</SelectItem>
                <SelectItem value="BUYER">Buyer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-semibold text-foreground">
                    User
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Role
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Status
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Verified
                  </th>
                  <th className="text-left p-4 font-semibold text-foreground">
                    Last Login
                  </th>
                  <th className="text-right p-4 font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={getRoleBadgeVariant(user.role) as any}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={getStatusBadgeVariant(user.status) as any}
                      >
                        {user.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {user.verified ? (
                        <UserCheck className="h-5 w-5 text-success" />
                      ) : (
                        <UserX className="h-5 w-5 text-muted-foreground" />
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate.to(`/admin/users/${user.id}`)
                            }
                          >
                            View Details
                          </DropdownMenuItem>
                          {user.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => handleSuspendUser(user.id)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Suspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivateUser(user.id)}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate User
                            </DropdownMenuItem>
                          )}
                          {user.role !== 'SITE_ADMIN' && (
                            <DropdownMenuItem
                              onClick={() => handleMakeAdmin(user.id)}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleBanUser(user.id)}
                            className="text-error"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Ban User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
