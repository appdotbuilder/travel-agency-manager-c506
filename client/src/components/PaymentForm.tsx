
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Payment, CreatePaymentInput, Currency, CurrencyExchangeRate } from '../../../server/src/schema';

interface PaymentFormProps {
  bookingId: number;
  onPaymentAdded: (payment: Payment) => void;
  onCancel: () => void;
}

export function PaymentForm({ bookingId, onPaymentAdded, onCancel }: PaymentFormProps) {
  const [formData, setFormData] = useState<CreatePaymentInput>({
    booking_id: bookingId,
    amount: 0,
    currency: 'SAR',
    notes: null
  });
  const [exchangeRates, setExchangeRates] = useState<CurrencyExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currencies: Currency[] = ['SAR', 'USD', 'IDR'];

  const loadExchangeRates = useCallback(async () => {
    try {
      const rates = await trpc.getCurrencyExchangeRates.query();
      setExchangeRates(rates);
    } catch (error) {
      console.error('Failed to load exchange rates:', error);
    }
  }, []);

  useEffect(() => {
    loadExchangeRates();
  }, [loadExchangeRates]);

  const getConvertedAmount = () => {
    if (formData.currency === 'SAR') {
      return formData.amount;
    }

    const rate = exchangeRates.find(r => 
      r.from_currency === formData.currency && r.to_currency === 'SAR'
    );

    if (rate) {
      return formData.amount * rate.rate;
    }

    return formData.amount; // Fallback to original amount
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.amount <= 0) {
      setError('Payment amount must be greater than zero');
      setIsLoading(false);
      return;
    }

    try {
      const newPayment = await trpc.createPayment.mutate(formData);
      onPaymentAdded(newPayment);
    } catch (error) {
      console.error('Failed to create payment:', error);
      setError('Failed to create payment');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const currencyCode = currency === 'SAR' ? 'SAR' : currency === 'USD' ? 'USD' : 'IDR';
    return new Intl.NumberFormat('en-US', { // Changed for all cases to 'en-US' for Western numerals
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Amount *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              amount: parseFloat(e.target.value) || 0 
            }))}
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Currency *</Label>
          <Select
            value={formData.currency || 'SAR'}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, currency: value as Currency }))
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

      {formData.currency !== 'SAR' && formData.amount > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Amount in SAR:</strong> {formatCurrency(getConvertedAmount(), 'SAR')}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Exchange rate applied based on current system rates
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            notes: e.target.value || null 
          }))}
          placeholder="Payment method, reference number, etc."
          rows={3}
        />
      </div>

      <div className="flex space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Adding Payment...' : 'Add Payment'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
