import { useState, useMemo } from 'react';
import { Search, Calendar, Clock, Key, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApplications } from '@/api';
import type { Application, ApplicationWithStatus } from '@/types';

const AppTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: applications, isLoading, error } = useApplications();

  // Calculate status and days remaining for each application
  const applicationsWithStatus = useMemo((): ApplicationWithStatus[] => {
    if (!applications) return [];

    return applications.map((app: Application) => {
      // Find the credential with the nearest expiration date
      const now = new Date();
      let nearestExpiration = '';
      let minDaysRemaining = Infinity;

      app.credentials.forEach(credential => {
        const expirationDate = new Date(credential.expiresAt);
        const daysRemaining = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining < minDaysRemaining) {
          minDaysRemaining = daysRemaining;
          nearestExpiration = credential.expiresAt;
        }
      });

      let status: 'valid' | 'expiring' | 'expired' = 'valid';
      if (minDaysRemaining < 0) {
        status = 'expired';
      } else if (minDaysRemaining <= 15) {
        status = 'expiring';
      }

      return {
        ...app,
        status,
        daysRemaining: minDaysRemaining,
        nearestExpiration
      };
    });
  }, [applications]);

  // Filter applications based on search term
  const filteredApplications = useMemo(() => {
    if (!searchTerm.trim()) return applicationsWithStatus;

    const term = searchTerm.toLowerCase();
    return applicationsWithStatus.filter(app => 
      app.name.toLowerCase().includes(term) ||
      app.credentials.some(cred => 
        cred.name.toLowerCase().includes(term) ||
        cred.keyId.toLowerCase().includes(term)
      )
    );
  }, [applicationsWithStatus, searchTerm]);

  const getStatusBadge = (status: 'valid' | 'expiring' | 'expired', daysRemaining: number) => {
    switch (status) {
      case 'valid':
        return (
          <Badge className="bg-success text-success-foreground hover:bg-success/90">
            <Clock className="w-3 h-3 mr-1" />
            Valid ({daysRemaining}d)
          </Badge>
        );
      case 'expiring':
        return (
          <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">
            <Calendar className="w-3 h-3 mr-1" />
            Expiring ({daysRemaining}d)
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-danger text-danger-foreground hover:bg-danger/90">
            <Calendar className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading applications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-danger text-lg font-semibold mb-2">Error Loading Applications</div>
            <div className="text-muted-foreground">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Application Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search applications or secrets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application</TableHead>
                  <TableHead>App ID</TableHead>
                  <TableHead>Secret / Key ID</TableHead>
                  <TableHead>Expiration Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      {searchTerm ? 'No applications match your search' : 'No applications found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApplications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{app.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{app.id}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {app.credentials.map((cred) => (
                            <div key={cred.id} className="font-mono text-sm">
                              <div className="font-medium">{cred.name}</div>
                              <div className="text-muted-foreground text-xs">{cred.keyId}</div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(app.nearestExpiration)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(app.status, app.daysRemaining)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <div>
                <div className="text-2xl font-bold">
                  {filteredApplications.filter(app => app.status === 'valid').length}
                </div>
                <div className="text-sm text-muted-foreground">Valid</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-warning rounded-full"></div>
              <div>
                <div className="text-2xl font-bold">
                  {filteredApplications.filter(app => app.status === 'expiring').length}
                </div>
                <div className="text-sm text-muted-foreground">Expiring Soon</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-danger rounded-full"></div>
              <div>
                <div className="text-2xl font-bold">
                  {filteredApplications.filter(app => app.status === 'expired').length}
                </div>
                <div className="text-sm text-muted-foreground">Expired</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppTable;