import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
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
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
} from 'lucide-react';

interface Log {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  action: string;
  user: string;
  ip: string;
  details: string;
}

export function AdminLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  const logs: Log[] = [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      level: 'success',
      action: 'User Login',
      user: 'admin@example.com',
      ip: '192.168.1.1',
      details: 'Successful admin login',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      level: 'info',
      action: 'Store Created',
      user: 'seller@example.com',
      ip: '192.168.1.2',
      details: 'New store "Tech Haven" created',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      level: 'warning',
      action: 'Failed Login Attempt',
      user: 'unknown@example.com',
      ip: '192.168.1.3',
      details: 'Multiple failed login attempts detected',
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      level: 'error',
      action: 'Payment Failed',
      user: 'buyer@example.com',
      ip: '192.168.1.4',
      details: 'Payment processing error for order #12345',
    },
  ];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;

    return matchesSearch && matchesLevel;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'info':
        return <Info className="h-4 w-4 text-info" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-error" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelVariant = (level: string) => {
    switch (level) {
      case 'success':
        return 'success';
      case 'info':
        return 'default';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">System Logs</h1>
        <p className="text-muted-foreground">
          View platform activity and audit logs
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SearchBar
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {getLevelIcon(log.level)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-foreground">
                        {log.action}
                      </p>
                      <Badge variant={getLevelVariant(log.level) as any}>
                        {log.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>User: {log.user}</span>
                      <span>IP: {log.ip}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
