
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  customersTable, 
  usersTable, 
  bookingsTable, 
  paymentsTable, 
  expensesTable,
  hotelsTable,
  hotelBookingDetailsTable
} from '../db/schema';
import { 
  getProfitLossReport, 
  getOutstandingInvoices, 
  getHotelBookingRecapitulation,
  exportReportToPDF,
  exportReportToExcel
} from '../handlers/reports';

// Test data
const testCustomer = {
  name: 'John Doe',
  address: '123 Main St',
  phone: '+1234567890',
  email: 'john@example.com'
};

const testUser = {
  name: 'Admin User',
  username: 'admin',
  password_hash: 'hashedpassword',
  role: 'administrator' as const,
  is_active: true
};

const testHotel = {
  name: 'Grand Hotel',
  location: 'Mecca',
  cost_price: '200.00',
  selling_price_percentage: '125.00'
};

describe('Reports', () => {
  let customerId: number;
  let userId: number;
  let hotelId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values(testCustomer)
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test hotel
    const hotelResult = await db.insert(hotelsTable)
      .values(testHotel)
      .returning()
      .execute();
    hotelId = hotelResult[0].id;
  });

  afterEach(resetDB);

  describe('getProfitLossReport', () => {
    it('should return profit/loss report for all bookings', async () => {
      // Create test booking
      const bookingResult = await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK001',
          total_cost_price: '500.00',
          total_selling_price: '750.00',
          status: 'confirmed',
          payment_status: 'pending',
          created_by: userId
        })
        .returning()
        .execute();

      const bookingId = bookingResult[0].id;

      // Add expense
      await db.insert(expensesTable)
        .values({
          booking_id: bookingId,
          expense_name: 'Transportation',
          amount: '50.00',
          created_by: userId
        })
        .execute();

      const results = await getProfitLossReport();

      expect(results).toHaveLength(1);
      expect(results[0].booking_number).toEqual('BK001');
      expect(results[0].customer_name).toEqual('John Doe');
      expect(results[0].total_selling_price).toEqual(750);
      expect(results[0].total_cost_price).toEqual(500);
      expect(results[0].total_expenses).toEqual(50);
      expect(results[0].profit).toEqual(200); // 750 - 500 - 50
      expect(results[0].created_at).toBeInstanceOf(Date);
    });

    it('should filter by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create booking with custom date
      await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK002',
          total_cost_price: '300.00',
          total_selling_price: '450.00',
          status: 'confirmed',
          payment_status: 'pending',
          created_by: userId,
          created_at: yesterday
        })
        .execute();

      const results = await getProfitLossReport(today, today);
      expect(results).toHaveLength(0);

      const allResults = await getProfitLossReport(yesterday, today);
      expect(allResults).toHaveLength(1);
      expect(allResults[0].booking_number).toEqual('BK002');
    });

    it('should handle bookings without expenses', async () => {
      await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK003',
          total_cost_price: '400.00',
          total_selling_price: '600.00',
          status: 'confirmed',
          payment_status: 'pending',
          created_by: userId
        })
        .execute();

      const results = await getProfitLossReport();

      expect(results).toHaveLength(1);
      expect(results[0].total_expenses).toEqual(0);
      expect(results[0].profit).toEqual(200); // 600 - 400 - 0
    });
  });

  describe('getOutstandingInvoices', () => {
    it('should return bookings with outstanding payments', async () => {
      const bookingResult = await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK004',
          total_cost_price: '500.00',
          total_selling_price: '800.00',
          status: 'confirmed',
          payment_status: 'pending', // Key: pending status
          created_by: userId
        })
        .returning()
        .execute();

      const bookingId = bookingResult[0].id;

      // Add partial payment
      await db.insert(paymentsTable)
        .values({
          booking_id: bookingId,
          amount: '300.00',
          currency: 'SAR',
          amount_in_sar: '300.00',
          created_by: userId
        })
        .execute();

      const results = await getOutstandingInvoices();

      expect(results).toHaveLength(1);
      expect(results[0].booking_number).toEqual('BK004');
      expect(results[0].customer_name).toEqual('John Doe');
      expect(results[0].total_amount).toEqual(800);
      expect(results[0].paid_amount).toEqual(300);
      expect(results[0].outstanding_amount).toEqual(500);
    });

    it('should not return fully paid bookings', async () => {
      await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK005',
          total_cost_price: '500.00',
          total_selling_price: '800.00',
          status: 'confirmed',
          payment_status: 'paid', // Fully paid
          created_by: userId
        })
        .execute();

      const results = await getOutstandingInvoices();
      expect(results).toHaveLength(0);
    });

    it('should handle bookings with no payments', async () => {
      await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK006',
          total_cost_price: '400.00',
          total_selling_price: '700.00',
          status: 'confirmed',
          payment_status: 'pending',
          created_by: userId
        })
        .execute();

      const results = await getOutstandingInvoices();

      expect(results).toHaveLength(1);
      expect(results[0].paid_amount).toEqual(0);
      expect(results[0].outstanding_amount).toEqual(700);
    });
  });

  describe('getHotelBookingRecapitulation', () => {
    it('should return hotel booking summary by date range', async () => {
      const testDate = new Date('2024-01-15');
      
      const bookingResult = await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK007',
          total_cost_price: '600.00',
          total_selling_price: '900.00',
          status: 'confirmed',
          payment_status: 'pending',
          created_by: userId,
          created_at: testDate,
          updated_at: testDate
        })
        .returning()
        .execute();

      const bookingId = bookingResult[0].id;

      // Add hotel booking detail
      await db.insert(hotelBookingDetailsTable)
        .values({
          booking_id: bookingId,
          hotel_id: hotelId,
          room_type: 'double',
          meal_plan: 'breakfast',
          check_in_date: '2024-01-15',
          check_out_date: '2024-01-18',
          number_of_rooms: 2,
          cost_price: '600.00',
          selling_price: '900.00'
        })
        .execute();

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const results = await getHotelBookingRecapitulation(startDate, endDate);

      expect(results).toHaveLength(1);
      expect(results[0].hotel_name).toEqual('Grand Hotel');
      expect(results[0].hotel_location).toEqual('Mecca');
      expect(results[0].room_type).toEqual('double');
      expect(results[0].meal_plan).toEqual('breakfast');
      expect(results[0].total_rooms).toEqual(2);
      expect(results[0].total_nights).toEqual(1);
      expect(results[0].total_cost).toEqual(600);
      expect(results[0].total_revenue).toEqual(900);
      expect(results[0].profit).toEqual(300);
      expect(results[0].booking_count).toEqual(1);
    });

    it('should filter by date range correctly', async () => {
      const today = new Date();
      const pastDate = new Date('2023-01-01');

      // Create booking in the past
      const bookingResult = await db.insert(bookingsTable)
        .values({
          customer_id: customerId,
          booking_number: 'BK008',
          total_cost_price: '400.00',
          total_selling_price: '600.00',
          status: 'confirmed',
          payment_status: 'pending',
          created_by: userId,
          created_at: pastDate,
          updated_at: pastDate
        })
        .returning()
        .execute();

      await db.insert(hotelBookingDetailsTable)
        .values({
          booking_id: bookingResult[0].id,
          hotel_id: hotelId,
          room_type: 'single',
          meal_plan: 'no_meal',
          check_in_date: '2023-01-10',
          check_out_date: '2023-01-12',
          number_of_rooms: 1,
          cost_price: '400.00',
          selling_price: '600.00'
        })
        .execute();

      // Query for current year - should return no results
      const results = await getHotelBookingRecapitulation(today, today);
      expect(results).toHaveLength(0);

      // Query for 2023 - should return results
      const pastResults = await getHotelBookingRecapitulation(
        new Date('2023-01-01'), 
        new Date('2023-12-31')
      );
      expect(pastResults).toHaveLength(1);
      expect(pastResults[0].room_type).toEqual('single');
    });
  });

  describe('exportReportToPDF', () => {
    it('should export report data to PDF format', async () => {
      const sampleData = [
        { id: 1, name: 'Test Report', amount: 100 },
        { id: 2, name: 'Another Entry', amount: 200 }
      ];

      const result = await exportReportToPDF(sampleData, 'Profit Loss');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      
      const content = result.toString('utf-8');
      expect(content).toContain('Profit Loss Report');
      expect(content).toContain('Generated on:');
      expect(content).toContain('Test Report');
    });
  });

  describe('exportReportToExcel', () => {
    it('should export report data to Excel format', async () => {
      const sampleData = [
        { booking_id: 1, customer_name: 'John Doe', profit: 150 },
        { booking_id: 2, customer_name: 'Jane Smith', profit: 200 }
      ];

      const result = await exportReportToExcel(sampleData, 'Outstanding Invoices');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      
      const content = result.toString('utf-8');
      expect(content).toContain('Outstanding Invoices Report');
      expect(content).toContain('booking_id,customer_name,profit');
      expect(content).toContain('John Doe');
      expect(content).toContain('Jane Smith');
    });

    it('should handle empty data', async () => {
      const result = await exportReportToExcel([], 'Empty Report');

      expect(result).toBeInstanceOf(Buffer);
      const content = result.toString('utf-8');
      expect(content).toEqual('No data available');
    });

    it('should handle data with commas in values', async () => {
      const sampleData = [
        { name: 'Hotel, Resort & Spa', location: 'City, Country' }
      ];

      const result = await exportReportToExcel(sampleData, 'CSV Test');
      
      const content = result.toString('utf-8');
      expect(content).toContain('"Hotel, Resort & Spa"');
      expect(content).toContain('"City, Country"');
    });
  });
});
