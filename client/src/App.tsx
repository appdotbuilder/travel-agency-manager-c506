
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Calendar, DollarSign, FileText, Shield, Settings, LogOut, PieChart } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User } from '../../server/src/schema';

// Import components
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import { CompanySettings } from '@/components/CompanySettings';
import { CurrencyExchangeRates } from '@/components/CurrencyExchangeRates';
import { UserManagement } from '@/components/UserManagement';
import { CustomerManagement } from '@/components/CustomerManagement';
import { HotelManagement } from '@/components/HotelManagement';
import { ServiceManagement } from '@/components/ServiceManagement';
import { BookingManagement } from '@/components/BookingManagement';
import { ExpenseInput } from '@/components/ExpenseInput';
import { Reports } from '@/components/Reports';
import { DatabaseBackup } from '@/components/DatabaseBackup';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await trpc.login.mutate({ username, password });
      setUser(response.user);
      localStorage.setItem('auth_token', response.token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_token');
    setActiveTab('dashboard');
  }, []);

  // Verify token on app load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      trpc.verifyToken.query({ token })
        .then((userData) => {
          if (userData) {
            setUser(userData);
          } else {
            localStorage.removeItem('auth_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        });
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Travel Agency</h1>
            <p className="text-gray-600">Booking Management System</p>
          </div>
          <LoginForm onLogin={handleLogin} isLoading={isLoading} />
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'administrator';
  const isStaff = user.role === 'staff';

  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: PieChart },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'hotels', label: 'Hotels', icon: Settings },
    { id: 'services', label: 'Services', icon: Settings },
    { id: 'users', label: 'Staff', icon: Shield },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const staffTabs = [
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
  ];

  const availableTabs = isAdmin ? adminTabs : staffTabs;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Travel Agency</h1>
                <p className="text-sm text-gray-500">Booking Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
                  {user.role === 'administrator' ? 'Administrator' : 'Staff'}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center space-x-2 min-w-0"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Admin Tabs */}
          {isAdmin && (
            <>
              <TabsContent value="dashboard">
                <Dashboard />
              </TabsContent>

              <TabsContent value="bookings">
                <BookingManagement />
              </TabsContent>

              <TabsContent value="customers">
                <CustomerManagement />
              </TabsContent>

              <TabsContent value="hotels">
                <HotelManagement />
              </TabsContent>

              <TabsContent value="services">
                <ServiceManagement />
              </TabsContent>

              <TabsContent value="users">
                <UserManagement />
              </TabsContent>

              <TabsContent value="reports">
                <Reports />
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-6">
                  <CompanySettings />
                  <Separator />
                  <CurrencyExchangeRates />
                  <Separator />
                  <DatabaseBackup />
                </div>
              </TabsContent>
            </>
          )}

          {/* Staff Tabs */}
          {isStaff && (
            <TabsContent value="expenses">
              <ExpenseInput />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;
