
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Plus, Edit, Trash2, Building, MapPin, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Hotel, CreateHotelInput, UpdateHotelInput } from '../../../server/src/schema';

export function HotelManagement() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [formData, setFormData] = useState<CreateHotelInput>({
    name: '',
    location: '',
    cost_price: 0,
    selling_price_percentage: 0
  });

  const loadHotels = useCallback(async () => {
    try {
      setError('');
      const data = await trpc.getHotels.query();
      setHotels(data);
      setFilteredHotels(data);
    } catch (error) {
      console.error('Failed to load hotels:', error);
      setError('Failed to load hotels');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotels();
  }, [loadHotels]);

  useEffect(() => {
    const filtered = hotels.filter(hotel =>
      hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredHotels(filtered);
  }, [hotels, searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newHotel = await trpc.createHotel.mutate(formData);
      setHotels(prev => [...prev, newHotel]);
      setShowCreateDialog(false);
      setFormData({ name: '', location: '', cost_price: 0, selling_price_percentage: 0 });
    } catch (error) {
      console.error('Failed to create hotel:', error);
      setError('Failed to create hotel');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHotel) return;

    try {
      const updateData: UpdateHotelInput = {
        id: editingHotel.id,
        ...formData
      };
      const updatedHotel = await trpc.updateHotel.mutate(updateData);
      setHotels(prev => prev.map(hotel => 
        hotel.id === updatedHotel.id ? updatedHotel : hotel
      ));
      setEditingHotel(null);
      setFormData({ name: '', location: '', cost_price: 0, selling_price_percentage: 0 });
    } catch (error) {
      console.error('Failed to update hotel:', error);
      setError('Failed to update hotel');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this hotel?')) return;

    try {
      await trpc.deleteHotel.mutate({ id });
      setHotels(prev => prev.filter(hotel => hotel.id !== id));
    } catch (error) {
      console.error('Failed to delete hotel:', error);
      setError('Failed to delete hotel');
    }
  };

  const startEdit = (hotel: Hotel) => {
    setEditingHotel(hotel);
    setFormData({
      name: hotel.name,
      location: hotel.location,
      cost_price: hotel.cost_price,
      selling_price_percentage: hotel.selling_price_percentage
    });
  };

  const resetForm = () => {
    setEditingHotel(null);
    setFormData({ name: '', location: '', cost_price: 0, selling_price_percentage: 0 });
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
            <Building className="h-5 w-5" />
            <CardTitle>Hotel Management</CardTitle>
          </div>
          <CardDescription>Loading hotels...</CardDescription>
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
            <Building className="h-5 w-5" />
            <div>
              <CardTitle>Hotel Management</CardTitle>
              <CardDescription>
                Manage hotels with room types and pricing
              </CardDescription>
            </div>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Hotel</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Hotel</DialogTitle>
                <DialogDescription>
                  Create a new hotel record
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Hotel Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Grand Hotel"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Riyadh, Saudi Arabia"
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
                      placeholder="500.00"
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
                      placeholder="20"
                      required
                    />
                  </div>
                </div>
                {formData.cost_price > 0 && formData.selling_price_percentage > 0 && (
                  <div className="p-3 bg-blue-50  rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Selling Price:</strong> {formatCurrency(calculateSellingPrice(formData.cost_price, formData.selling_price_percentage))}
                    </p>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button type="submit">Create Hotel</Button>
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
            placeholder="Search hotels by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {filteredHotels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No hotels match your search.' : 'No hotels found. Add your first hotel above.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Markup %</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHotels.map((hotel) => (
                <TableRow key={hotel.id}>
                  <TableCell className="font-medium">{hotel.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span>{hotel.location}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(hotel.cost_price)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{hotel.selling_price_percentage.toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    {formatCurrency(calculateSellingPrice(hotel.cost_price, hotel.selling_price_percentage))}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {hotel.created_at.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(hotel)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Hotel</DialogTitle>
                            <DialogDescription>
                              Update hotel information
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                              <Label>Hotel Name *</Label>
                              <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Location *</Label>
                              <Input
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
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
                              <Button type="submit">Update Hotel</Button>
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
                        onClick={() => handleDelete(hotel.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
