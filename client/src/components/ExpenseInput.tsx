
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, DollarSign, Search } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Expense, CreateExpenseInput } from '../../../server/src/schema';

export function ExpenseInput() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<CreateExpenseInput>({
    booking_id: 0,
    expense_name: '',
    amount: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    if (!formData.expense_name.trim()) {
      setError('Expense name is required');
      setIsSaving(false);
      return;
    }

    if (formData.booking_id <= 0) {
      setError('Please enter a valid booking ID');
      setIsSaving(false);
      return;
    }

    if (formData.amount <= 0) {
      setError('Amount must be greater than zero');
      setIsSaving(false);
      return;
    }

    try {
      const newExpense = await trpc.createExpense.mutate(formData);
      setExpenses(prev => [newExpense, ...prev]);
      setFormData({ booking_id: 0, expense_name: '', amount: 0 });
      setSuccess('Expense added successfully');
    } catch (error) {
      console.error('Failed to create expense:', error);
      setError('Failed to create expense. Please check if the booking ID exists.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { // Changed from 'ar-SA' to 'en-US'
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Filter expenses based on search term
  const filteredExpenses = expenses.filter(expense =>
    expense.expense_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.booking_id.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Add Expense Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Add Expense</CardTitle>
          </div>
          <CardDescription>
            Record expenses against booking invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert variant="default" className="border-green-200 bg-green-50">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Booking ID *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.booking_id || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    booking_id: parseInt(e.target.value) || 0 
                  }))}
                  placeholder="Enter booking ID"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Amount (SAR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    amount: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expense Name *</Label>
              <Input
                value={formData.expense_name}
                onChange={(e) => setFormData(prev => ({ ...prev, expense_name: e.target.value }))}
                placeholder="Transportation, meals, accommodation extras, etc."
                required
              />
            </div>

            <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
              {isSaving ? 'Adding Expense...' : 'Add Expense'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>
                Your recently added expenses
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No expenses match your search' : 'No expenses yet'}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Try adjusting your search criteria.' 
                  : 'Add your first expense using the form above.'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Expense Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-mono">
                      #{expense.booking_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.expense_name}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {expense.created_at.toLocaleDateString()} at{' '}
                      {expense.created_at.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
