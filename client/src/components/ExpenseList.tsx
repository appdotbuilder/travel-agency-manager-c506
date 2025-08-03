
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus, DollarSign } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Expense, CreateExpenseInput } from '../../../server/src/schema';

interface ExpenseListProps {
  bookingId: number;
}

export function ExpenseList({ bookingId }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CreateExpenseInput>({
    booking_id: bookingId,
    expense_name: '',
    amount: 0
  });

  const loadExpenses = useCallback(async () => {
    try {
      setError('');
      const data = await trpc.getExpensesByBookingId.query({ bookingId });
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setError('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError('');

    if (!formData.expense_name.trim()) {
      setError('Expense name is required');
      setIsAdding(false);
      return;
    }

    if (formData.amount <= 0) {
      setError('Amount must be greater than zero');
      setIsAdding(false);
      return;
    }

    try {
      const newExpense = await trpc.createExpense.mutate(formData);
      setExpenses(prev => [...prev, newExpense]);
      setFormData({ booking_id: bookingId, expense_name: '', amount: 0 });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to create expense:', error);
      setError('Failed to create expense');
    } finally {
      setIsAdding(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Expenses</CardTitle>
          </div>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Expense
          </Button>
        </div>
        <CardDescription>
          Additional expenses for this booking
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showAddForm && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label>Expense Name *</Label>
              <Input
                value={formData.expense_name}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_name: e.target.value }))}
                placeholder="Transportation, meals, etc."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (SAR) *</Label>
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
            <div className="flex space-x-2">
              <Button type="submit" disabled={isAdding}>
                {isAdding ? 'Adding...' : 'Add Expense'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ booking_id: bookingId, expense_name: '', amount: 0 });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No expenses recorded yet
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{expense.expense_name}</p>
                  <p className="text-sm text-gray-500">
                    {expense.created_at.toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                </div>
              </div>
            ))}
            
            {expenses.length > 1 && (
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Total Expenses</p>
                  <p className="font-bold text-lg">{formatCurrency(getTotalExpenses())}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
