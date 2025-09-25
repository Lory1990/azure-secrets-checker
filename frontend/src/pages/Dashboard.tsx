import { Shield, TrendingUp } from 'lucide-react';
import AppTable from '@/components/AppTable';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Credentials Dashboard</h1>
                <p className="text-sm text-muted-foreground">Monitor and manage application secrets</p>
              </div>
            </div>
            <div className="ml-auto flex items-center space-x-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Real-time monitoring</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <AppTable />
      </main>
    </div>
  );
};

export default Dashboard;