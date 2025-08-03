
import { db } from '../db';
import { 
  bookingsTable, 
  customersTable, 
  paymentsTable, 
  expensesTable,
  hotelBookingDetailsTable,
  hotelsTable
} from '../db/schema';
import { eq, gte, lte, and, sum, desc, sql } from 'drizzle-orm';
import { type ProfitLossReport, type OutstandingInvoice } from '../schema';

export async function getProfitLossReport(startDate?: Date, endDate?: Date): Promise<ProfitLossReport[]> {
  try {
    // Build the base query with all components
    const baseQuery = db.select({
      booking_id: bookingsTable.id,
      booking_number: bookingsTable.booking_number,
      customer_name: customersTable.name,
      total_selling_price: bookingsTable.total_selling_price,
      total_cost_price: bookingsTable.total_cost_price,
      total_expenses: sql<string>`COALESCE(${sum(expensesTable.amount)}, '0')`.as('total_expenses'),
      created_at: bookingsTable.created_at
    })
    .from(bookingsTable)
    .innerJoin(customersTable, eq(bookingsTable.customer_id, customersTable.id))
    .leftJoin(expensesTable, eq(bookingsTable.id, expensesTable.booking_id));

    // Build conditions array
    const conditions = [];
    if (startDate) {
      conditions.push(gte(bookingsTable.created_at, startDate));
    }
    if (endDate) {
      conditions.push(lte(bookingsTable.created_at, endDate));
    }

    // Execute query with or without conditions
    const results = conditions.length > 0 
      ? await baseQuery
          .where(and(...conditions))
          .groupBy(
            bookingsTable.id,
            bookingsTable.booking_number,
            customersTable.name,
            bookingsTable.total_selling_price,
            bookingsTable.total_cost_price,
            bookingsTable.created_at
          )
          .orderBy(desc(bookingsTable.created_at))
          .execute()
      : await baseQuery
          .groupBy(
            bookingsTable.id,
            bookingsTable.booking_number,
            customersTable.name,
            bookingsTable.total_selling_price,
            bookingsTable.total_cost_price,
            bookingsTable.created_at
          )
          .orderBy(desc(bookingsTable.created_at))
          .execute();

    return results.map(result => ({
      booking_id: result.booking_id,
      booking_number: result.booking_number,
      customer_name: result.customer_name,
      total_selling_price: parseFloat(result.total_selling_price),
      total_cost_price: parseFloat(result.total_cost_price),
      total_expenses: parseFloat(result.total_expenses),
      profit: parseFloat(result.total_selling_price) - parseFloat(result.total_cost_price) - parseFloat(result.total_expenses),
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to generate profit/loss report:', error);
    throw error;
  }
}

export async function getOutstandingInvoices(): Promise<OutstandingInvoice[]> {
  try {
    const results = await db.select({
      booking_id: bookingsTable.id,
      booking_number: bookingsTable.booking_number,
      customer_name: customersTable.name,
      total_amount: bookingsTable.total_selling_price,
      paid_amount: sql<string>`COALESCE(${sum(paymentsTable.amount_in_sar)}, '0')`.as('paid_amount'),
      created_at: bookingsTable.created_at
    })
    .from(bookingsTable)
    .innerJoin(customersTable, eq(bookingsTable.customer_id, customersTable.id))
    .leftJoin(paymentsTable, eq(bookingsTable.id, paymentsTable.booking_id))
    .where(eq(bookingsTable.payment_status, 'pending'))
    .groupBy(
      bookingsTable.id,
      bookingsTable.booking_number,
      customersTable.name,
      bookingsTable.total_selling_price,
      bookingsTable.created_at
    )
    .orderBy(desc(bookingsTable.created_at))
    .execute();

    return results.map(result => {
      const totalAmount = parseFloat(result.total_amount);
      const paidAmount = parseFloat(result.paid_amount);
      return {
        booking_id: result.booking_id,
        booking_number: result.booking_number,
        customer_name: result.customer_name,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        outstanding_amount: totalAmount - paidAmount,
        created_at: result.created_at
      };
    });
  } catch (error) {
    console.error('Failed to get outstanding invoices:', error);
    throw error;
  }
}

export async function getHotelBookingRecapitulation(startDate: Date, endDate: Date): Promise<any[]> {
  try {
    const results = await db.select({
      hotel_name: hotelsTable.name,
      hotel_location: hotelsTable.location,
      room_type: hotelBookingDetailsTable.room_type,
      meal_plan: hotelBookingDetailsTable.meal_plan,
      total_rooms: sql<string>`${sum(hotelBookingDetailsTable.number_of_rooms)}`.as('total_rooms'),
      total_nights: sql<string>`COUNT(*)`.as('total_nights'),
      total_cost: sql<string>`${sum(hotelBookingDetailsTable.cost_price)}`.as('total_cost'),
      total_revenue: sql<string>`${sum(hotelBookingDetailsTable.selling_price)}`.as('total_revenue'),
      booking_count: sql<string>`COUNT(DISTINCT ${hotelBookingDetailsTable.booking_id})`.as('booking_count')
    })
    .from(hotelBookingDetailsTable)
    .innerJoin(hotelsTable, eq(hotelBookingDetailsTable.hotel_id, hotelsTable.id))
    .innerJoin(bookingsTable, eq(hotelBookingDetailsTable.booking_id, bookingsTable.id))
    .where(
      and(
        gte(bookingsTable.created_at, startDate),
        lte(bookingsTable.created_at, endDate)
      )
    )
    .groupBy(
      hotelsTable.name,
      hotelsTable.location,
      hotelBookingDetailsTable.room_type,
      hotelBookingDetailsTable.meal_plan
    )
    .orderBy(hotelsTable.name, hotelBookingDetailsTable.room_type)
    .execute();

    return results.map(result => ({
      hotel_name: result.hotel_name,
      hotel_location: result.hotel_location,
      room_type: result.room_type,
      meal_plan: result.meal_plan,
      total_rooms: parseInt(result.total_rooms),
      total_nights: parseInt(result.total_nights),
      total_cost: parseFloat(result.total_cost),
      total_revenue: parseFloat(result.total_revenue),
      profit: parseFloat(result.total_revenue) - parseFloat(result.total_cost),
      booking_count: parseInt(result.booking_count)
    }));
  } catch (error) {
    console.error('Failed to generate hotel booking recapitulation:', error);
    throw error;
  }
}

export async function exportReportToPDF(reportData: any[], reportType: string): Promise<Buffer> {
  try {
    // For now, return a simple text-based PDF placeholder
    // In a real implementation, you would use a PDF library like puppeteer or jsPDF
    const content = `${reportType} Report\n\nGenerated on: ${new Date().toISOString()}\n\nData:\n${JSON.stringify(reportData, null, 2)}`;
    return Buffer.from(content, 'utf-8');
  } catch (error) {
    console.error('Failed to export report to PDF:', error);
    throw error;
  }
}

export async function exportReportToExcel(reportData: any[], reportType: string): Promise<Buffer> {
  try {
    // For now, return a simple CSV format
    // In a real implementation, you would use a library like xlsx or exceljs
    if (reportData.length === 0) {
      return Buffer.from('No data available', 'utf-8');
    }

    const headers = Object.keys(reportData[0]).join(',');
    const rows = reportData.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );

    const csvContent = `${reportType} Report\n${headers}\n${rows.join('\n')}`;
    return Buffer.from(csvContent, 'utf-8');
  } catch (error) {
    console.error('Failed to export report to Excel:', error);
    throw error;
  }
}
