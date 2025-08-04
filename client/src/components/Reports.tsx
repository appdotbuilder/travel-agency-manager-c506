
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, FileText, Download, TrendingUp, CreditCard, Calendar } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { ProfitLossReport, OutstandingInvoice } from '../../../server/src/schema';

export function Reports() {
  const [profitLossData, setProfitLossData] = useState<ProfitLossReport[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [hotelRecap, setHotelRecap] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const loadReports = useCallback(async () => {
    try {
      setError('');
      const [profitLoss, outstanding, hotelData] = await Promise.all([
        trpc.getProfitLossReport.query({
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate)
        }),
        trpc.getOutstandingInvoices.query(),
        trpc.getHotelBookingRecapitulation.query({
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate)
        })
      ]);

      setProfitLossData(profitLoss);
      setOutstandingInvoices(outstanding);
      setHotelRecap(hotelData);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setError('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExportPDF = async (reportType: string, data: Record<string, unknown>[]) => {
    try {
      await trpc.exportReportToPDF.mutate({ reportData: data, reportType });
      // In a real implementation, this would trigger a file download
      alert('PDF export started (placeholder implementation)');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setError('Failed to export PDF');
    }
  };

  const handleExportExcel = async (reportType: string, data: Record<string, unknown>[]) => {
    try {
      await trpc.exportReportToExcel.mutate({ reportData: data, reportType });
      // In a real implementation, this would trigger a file download
      alert('Excel export started (placeholder implementation)');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      setError('Failed to export Excel');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { // Changed from 'ar-SA' to 'en-US'
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateTotalProfit = () => {
    return profitLossData.reduce((sum, item) => sum + item.profit, 0);
  };

  const calculateTotalOutstanding = () => {
    return outstandingInvoices.reduce((sum, item) => sum + item.outstanding_amount, 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Reports</CardTitle>
          </div>
          <CardDescription>Loading reports...</CardDescription>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h2>
        <p className="text-gray-600">Financial reports and business analytics</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Date Range</span>
          </CardTitle>
          <CardDescription>Select date range for profit/loss and hotel reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <Button onClick={() => loadReports()}>
              Update Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profit-loss" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profit-loss" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Profit & Loss</span>
          </TabsTrigger>
          <TabsTrigger value="outstanding" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Outstanding</span>
          </TabsTrigger>
          <TabsTrigger value="hotel-recap" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Hotel Recap</span>
          </TabsTrigger>
        </TabsList>

        {/* Profit & Loss Report */}
        <TabsContent value="profit-loss">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Profit & Loss Report</span>
                  </CardTitle>
                  <CardDescription>
                    Financial performance per booking from {dateRange.startDate} to {dateRange.endDate}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportPDF('profit-loss', profitLossData)}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('profit-loss', profitLossData)}>
                    <Download className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-700">Total Profit</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(calculateTotalProfit())}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-700">Total Bookings</p>
                  <p className="text-2xl font-bold text-blue-900">{profitLossData.length}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-700">Avg Profit</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {profitLossData.length > 0 ? formatCurrency(calculateTotalProfit() / profitLossData.length) : formatCurrency(0)}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-700">Profit Margin</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {profitLossData.length > 0 
                      ? `${((calculateTotalProfit() / profitLossData.reduce((sum, item) => sum + item.total_selling_price, 0)) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                </div>
              </div>

              <Separator className="mb-4" />

              {profitLossData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No profit/loss data available for the selected date range.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitLossData.map((item) => (
                      <TableRow key={item.booking_id}>
                        <TableCell className="font-mono">{item.booking_number}</TableCell>
                        <TableCell>{item.customer_name}</TableCell>
                        <TableCell>{formatCurrency(item.total_selling_price)}</TableCell>
                        <TableCell>{formatCurrency(item.total_cost_price)}</TableCell>
                        <TableCell>{formatCurrency(item.total_expenses)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={item.profit >= 0 ? 'default' : 'destructive'}
                            className={item.profit >= 0 ? 'bg-green-100 text-green-800' : ''}
                          >
                            {formatCurrency(item.profit)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {item.created_at.toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outstanding Invoices */}
        <TabsContent value="outstanding">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Outstanding Invoices</span>
                  </CardTitle>
                  <CardDescription>
                    Bookings with pending payments
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportPDF('outstanding', outstandingInvoices)}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('outstanding', outstandingInvoices)}>
                    <Download className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(calculateTotalOutstanding())}</p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium text-yellow-700">Pending Invoices</p>
                  <p className="text-2xl font-bold text-yellow-900">{outstandingInvoices.length}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-orange-700">Avg Outstanding</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {outstandingInvoices.length > 0 ? formatCurrency(calculateTotalOutstanding() / outstandingInvoices.length) : formatCurrency(0)}
                  </p>
                </div>
              </div>

              <Separator className="mb-4" />

              {outstandingInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No outstanding invoices. All payments are up to date! 🎉
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingInvoices.map((invoice) => (
                      <TableRow key={invoice.booking_id}>
                        <TableCell className="font-mono">{invoice.booking_number}</TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        <TableCell>{formatCurrency(invoice.total_amount)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(invoice.paid_amount)}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {formatCurrency(invoice.outstanding_amount)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {invoice.created_at.toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hotel Booking Recapitulation */}
        <TabsContent value="hotel-recap">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Hotel Booking Recapitulation</span>
                  </CardTitle>
                  <CardDescription>
                    Hotel booking summary from {dateRange.startDate} to {dateRange.endDate}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportPDF('hotel-recap', hotelRecap)}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('hotel-recap', hotelRecap)}>
                    <Download className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {hotelRecap.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hotel booking data available for the selected date range.
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Hotel recapitulation data loaded ({hotelRecap.length} records).
                  <br />
                  <span className="text-sm">Detailed table implementation pending based on actual data structure.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
