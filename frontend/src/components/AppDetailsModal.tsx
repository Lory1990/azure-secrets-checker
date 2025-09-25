import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Key, Shield, Calendar, Clock } from 'lucide-react';
import { ApplicationWithStatus } from '@/types';
import { ICertificate, ISecret } from '@/hooks/apiClients/useApplicationsApi';

interface AppDetailsModalProps {
  application: ApplicationWithStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

const AppDetailsModal = ({ application, isOpen, onClose }: AppDetailsModalProps) => {
  if (!application) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (daysUntilExpiration: number, isExpired: boolean) => {
    if (isExpired || daysUntilExpiration < 0) {
      return (
        <Badge className="bg-danger text-danger-foreground hover:bg-danger/90">
          <Calendar className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    } else if (daysUntilExpiration <= 15) {
      return (
        <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">
          <Calendar className="w-3 h-3 mr-1" />
          Expiring ({daysUntilExpiration}d)
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-success text-success-foreground hover:bg-success/90">
          <Clock className="w-3 h-3 mr-1" />
          Valid ({daysUntilExpiration}d)
        </Badge>
      );
    }
  };

  const getAzurePortalUrl = (appId: string) => {
    return `https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/${appId}`
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6" />
            {application.displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Application Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Display Name</label>
                <p className="text-sm">{application.displayName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Application ID</label>
                <p className="text-sm font-mono">{application.appId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Object ID</label>
                <p className="text-sm font-mono">{application.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Secrets */}
          {application.secrets && application.secrets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Key className="w-5 h-5" />
                  Secrets ({application.secrets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {application.secrets.map((secret: ISecret, index: number) => (
                    <div key={secret.keyId || index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{secret.displayName || `Secret ${index + 1}`}</h4>
                        {getStatusBadge(secret.daysUntilExpiration, secret.isExpired)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="text-muted-foreground">Key ID</label>
                          <p className="font-mono">{secret.keyId}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Expires</label>
                          <p>{formatDate(secret.endDateTime)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Source</label>
                          <p>{secret.source}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Days Until Expiration</label>
                          <p>{secret.daysUntilExpiration}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certificates */}
          {application.certificates && application.certificates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5" />
                  Certificates ({application.certificates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {application.certificates.map((certificate: ICertificate, index: number) => (
                    <div key={certificate.keyId || index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{certificate.displayName || `Certificate ${index + 1}`}</h4>
                        {getStatusBadge(certificate.daysUntilExpiration, certificate.isExpired)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="text-muted-foreground">Key ID</label>
                          <p className="font-mono">{certificate.keyId}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Expires</label>
                          <p>{formatDate(certificate.endDateTime)}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Type</label>
                          <p>{certificate.type}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Usage</label>
                          <p>{certificate.usage}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Source</label>
                          <p>{certificate.source}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Days Until Expiration</label>
                          <p>{certificate.daysUntilExpiration}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppDetailsModal;