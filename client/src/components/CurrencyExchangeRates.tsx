
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { 
  CurrencyExchangeRate, 
  CreateCurrencyExchangeRateInput, 
  UpdateCurrencyExchangeRateInput,
  Currency 
} from '../../../server/src/schema';

export function CurrencyExchangeRates() {
  const [rates, setRates] = useState<CurrencyExchangeRate[]>([]);
  const [isLoading, setIsLoading]= useState(true);
  const [error, setError] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRate, setEditingRate] = useState<CurrencyExchangeRate | null>(null);
  const [formData, setFormData] = useState<CreateCurrencyExchangeRateInput>({
    from_currency: 'USD',
    to_currency: 'SAR',
    rate: 0
  });

  const currencies: Currency[] = ['SAR', 'USD', 'IDR'];

  const loadRates = useCallback(async () => {
    try {
      setError('');
      const data = await trpc.getCurrencyExchangeRates.query();
      setRates(data);
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
      setError('Failed to load exchange rates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRate = await trpc.createCurrencyExchangeRate.mutate(formData);
      setRates(prev => [...prev, newRate]);
      setShowCreateDialog(false);
      setFormData({ from_currency: 'USD', to_currency: 'SAR', rate: 0 });
    } catch (error) {
      console.error('Failed to create exchange rate:', error);
      setError('Failed to create exchange rate');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;

    try {
      const updateData: UpdateCurrencyExchangeRateInput = {
        id: editingRate.id,
        rate: formData.rate
      };
      const updatedRate = await trpc.updateCurrencyExchangeRate.mutate(updateData);
      setRates(prev => prev.map(rate => 
        rate.id === updatedRate.id ? updatedRate : rate
      ));
      setEditingRate(null);
      setFormData({ from_currency: 'USD', to_currency: 'SAR', rate: 0 });
    } catch (error) {
      console.error('Failed to update exchange rate:', error);
      setError('Failed to update exchange rate');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this exchange rate?')) return;

    try {
      await trpc.deleteCurrencyExchangeRate.mutate({ id });
      setRates(prev => prev.filter(rate => rate.id !== id));
    } catch (error) {
      console.error('Failed to delete exchange rate:', error);
      setError('Failed to delete exchange rate');
    }
  };

  const startEdit = (rate: CurrencyExchangeRate) => {
    setEditingRate(rate);
    setFormData({
      from_currency: rate.from_currency,
      to_currency: rate.to_currency,
      rate: rate.rate
    });
  };

  const cancelEdit = () => {
    setEditingRate(null);
    setFormData({ from_currency: 'USD', to_currency: 'SAR', rate: 0 });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Currency Exchange Rates</CardTitle>
          </div>
          <CardDescription>Loading exchange rates...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
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
            <DollarSign className="h-5 w-5" />
            <div>
              <CardTitle>Currency Exchange Rates</CardTitle>
              <CardDescription>
                Manage conversion rates between SAR, USD, and IDR
              </CardDescription>
            </div>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Rate</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Exchange Rate</DialogTitle>
                <DialogDescription>
                  Create a new currency exchange rate
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>From Currency</Label>
                    <Select
                      value={formData.from_currency || 'USD'}
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, from_currency: value as Currency }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(currency => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>To Currency</Label>
                    <Select
                      value={formData.to_currency || 'SAR'}
                      onValueChange={(value) => 
                        setFormData(prev => ({ ...prev, to_currency: value as Currency }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(currency => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Exchange Rate</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.rate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      rate: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="3.75"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit">Create Rate</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
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

        {rates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No exchange rates configured. Add your first rate above.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <Badge variant="outline">{rate.from_currency}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rate.to_currency}</Badge>
                  </TableCell>
                  <TableCell>
                    {editingRate?.id === rate.id ? (
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={formData.rate}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          rate: parseFloat(e.target.value) || 0 
                        }))}
                        className="w-24"
                      />
                    ) : (
                      <span className="font-mono">{rate.rate.toFixed(4)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {rate.updated_at.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingRate?.id === rate.id ? (
                      <div className="flex justify-end space-x-2">
                        <Button size="sm" onClick={handleUpdate}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(rate)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(rate.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
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
