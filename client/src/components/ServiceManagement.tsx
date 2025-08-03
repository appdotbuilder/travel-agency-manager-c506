
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Plus, Edit, Trash2, Settings, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Service, CreateServiceInput, UpdateServiceInput } from '../../../server/src/schema';

export function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<CreateServiceInput>({
    name: '',
    cost_price: 0,
    selling_price_percentage: 0
  });

  const loadServices = useCallback(async () => {
    try {
      setError('');
      const data = await trpc.getServices.query();
      setServices(data);
      setFilteredServices(data);
    } catch (error) {
      console.error('Failed to load services:', error);
      setError('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    const filtered = services.filter(service =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredServices(filtered);
  }, [services, searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newService = await trpc.createService.mutate(formData);
      setServices(prev => [...prev, newService]);
      setShowCreateDialog(false);
      setFormData({ name: '', cost_price: 0, selling_price_percentage: 0 });
    } catch (error) {
      console.error('Failed to create service:', error);
      setError('Failed to create service');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    try {
      const updateData: UpdateServiceInput = {
        id: editingService.id,
        ...formData
      };
      const updatedService = await trpc.updateService.mutate(updateData);
      setServices(prev => prev.map(service => 
        service.id === updatedService.id ? updatedService : service
      ));
      setEditingService(null);
      setFormData({ name: '', cost_price: 0, selling_price_percentage: 0 });
    } catch (error) {
      console.error('Failed to update service:', error);
      setError('Failed to update service');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await trpc.deleteService.mutate({ id });
      setServices(prev => prev.filter(service => service.id !== id));
    } catch (error) {
      console.error('Failed to delete service:', error);
      setError('Failed to delete service');
    }
  };

  const startEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      cost_price: service.cost_price,
      selling_price_percentage: service.selling_price_percentage
    });
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({ name: '', cost_price: 0, selling_price_percentage: 0 });
  };

  const calculateSellingPrice = (costPrice: number, percentage: number) => {
    return costPrice * (1 + percentage / 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Service Management</CardTitle>
          </div>
          <CardDescription>Loading services...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <div>
              <CardTitle>Service Management</CardTitle>
              <CardDescription>
                Manage additional travel services and pricing
              </CardDescription>
            </div>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Service</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Service</DialogTitle>
                <DialogDescription>
                  Create a new travel service
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Service Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Airport Transfer"
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Cost Price (SAR) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        cost_price: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="100.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Markup % *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.selling_price_percentage}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        selling_price_percentage: parseFloat(e.target.value) || 0 
                      }))}
                      placeholder="30"
                      required
                    />
                  </div>
                </div>
                {formData.cost_price > 0 && formData.selling_price_percentage > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Selling Price:</strong> {formatCurrency(calculateSellingPrice(formData.cost_price, formData.selling_price_percentage))}
                    </p>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button type="submit">Create Service</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateDialog(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search services by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {filteredServices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No services match your search.' : 'No services found. Add your first service above.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Markup %</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Profit Margin</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => {
                const sellingPrice = calculateSellingPrice(service.cost_price, service.selling_price_percentage);
                const profitMargin = sellingPrice - service.cost_price;
                
                return (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{formatCurrency(service.cost_price)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{service.selling_price_percentage.toFixed(1)}%</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(sellingPrice)}
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {formatCurrency(profitMargin)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {service.created_at.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(service)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Service</DialogTitle>
                              <DialogDescription>
                                Update service information
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleUpdate} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Service Name *</Label>
                                <Input
                                  value={formData.name}
                                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                  required
                                />
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Cost Price (SAR) *</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.cost_price}
                                    onChange={(e) => setFormData(prev => ({ 
                                      ...prev, 
                                      cost_price: parseFloat(e.target.value) || 0 
                                    }))}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Markup % *</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.selling_price_percentage}
                                    onChange={(e) => setFormData(prev => ({ 
                                      ...prev, 
                                      selling_price_percentage: parseFloat(e.target.value) || 0 
                                    }))}
                                    required
                                  />
                                </div>
                              </div>
                              {formData.cost_price > 0 && formData.selling_price_percentage > 0 && (
                                <div className="p-3 bg-blue-50 rounded-lg">
                                  <p className="text-sm text-blue-700">
                                    <strong>Selling Price:</strong> {formatCurrency(calculateSellingPrice(formData.cost_price, formData.selling_price_percentage))}
                                  </p>
                                </div>
                              )}
                              <div className="flex space-x-2">
                                <Button type="submit">Update Service</Button>
                                <Button type="button" variant="outline" onClick={resetForm}>
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(service.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
