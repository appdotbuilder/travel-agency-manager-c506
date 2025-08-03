
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  loginInputSchema,
  updateCompanySettingsInputSchema,
  createCurrencyExchangeRateInputSchema,
  updateCurrencyExchangeRateInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createHotelInputSchema,
  updateHotelInputSchema,
  createServiceInputSchema,
  updateServiceInputSchema,
  createBookingInputSchema,
  createPaymentInputSchema,
  createExpenseInputSchema,
  bookingStatusSchema
} from './schema';

// Handler imports
import { login, verifyToken } from './handlers/auth';
import { getCompanySettings, updateCompanySettings } from './handlers/company_settings';
import {
  getCurrencyExchangeRates,
  createCurrencyExchangeRate,
  updateCurrencyExchangeRate,
  deleteCurrencyExchangeRate
} from './handlers/currency_exchange_rates';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from './handlers/users';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from './handlers/customers';
import {
  getHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel
} from './handlers/hotels';
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from './handlers/services';
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  generateBookingInvoice
} from './handlers/bookings';
import {
  getPaymentsByBookingId,
  createPayment,
  generatePaymentReceipt
} from './handlers/payments';
import {
  getExpensesByBookingId,
  createExpense
} from './handlers/expenses';
import { getDashboardStats } from './handlers/dashboard';
import {
  getProfitLossReport,
  getOutstandingInvoices,
  getHotelBookingRecapitulation,
  exportReportToPDF,
  exportReportToExcel
} from './handlers/reports';
import {
  createDatabaseBackup,
  restoreDatabase
} from './handlers/database_backup';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  verifyToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(({ input }) => verifyToken(input.token)),

  // Company Settings
  getCompanySettings: publicProcedure
    .query(() => getCompanySettings()),

  updateCompanySettings: publicProcedure
    .input(updateCompanySettingsInputSchema)
    .mutation(({ input }) => updateCompanySettings(input)),

  // Currency Exchange Rates
  getCurrencyExchangeRates: publicProcedure
    .query(() => getCurrencyExchangeRates()),

  createCurrencyExchangeRate: publicProcedure
    .input(createCurrencyExchangeRateInputSchema)
    .mutation(({ input }) => createCurrencyExchangeRate(input)),

  updateCurrencyExchangeRate: publicProcedure
    .input(updateCurrencyExchangeRateInputSchema)
    .mutation(({ input }) => updateCurrencyExchangeRate(input)),

  deleteCurrencyExchangeRate: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCurrencyExchangeRate(input.id)),

  // Users
  getUsers: publicProcedure
    .query(() => getUsers()),

  getUserById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getUserById(input.id)),

  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  deleteUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteUser(input.id)),

  // Customers
  getCustomers: publicProcedure
    .query(() => getCustomers()),

  getCustomerById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomerById(input.id)),

  createCustomer: publicProcedure
    .input(createCustomerInputSchema)
    .mutation(({ input }) => createCustomer(input)),

  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),

  deleteCustomer: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCustomer(input.id)),

  // Hotels
  getHotels: publicProcedure
    .query(() => getHotels()),

  getHotelById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getHotelById(input.id)),

  createHotel: publicProcedure
    .input(createHotelInputSchema)
    .mutation(({ input }) => createHotel(input)),

  updateHotel: publicProcedure
    .input(updateHotelInputSchema)
    .mutation(({ input }) => updateHotel(input)),

  deleteHotel: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteHotel(input.id)),

  // Services
  getServices: publicProcedure
    .query(() => getServices()),

  getServiceById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getServiceById(input.id)),

  createService: publicProcedure
    .input(createServiceInputSchema)
    .mutation(({ input }) => createService(input)),

  updateService: publicProcedure
    .input(updateServiceInputSchema)
    .mutation(({ input }) => updateService(input)),

  deleteService: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteService(input.id)),

  // Bookings
  getBookings: publicProcedure
    .query(() => getBookings()),

  getBookingById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getBookingById(input.id)),

  createBooking: publicProcedure
    .input(createBookingInputSchema)
    .mutation(({ input, ctx }) => createBooking(input, 1)), // TODO: Get userId from context

  updateBookingStatus: publicProcedure
    .input(z.object({ id: z.number(), status: bookingStatusSchema }))
    .mutation(({ input }) => updateBookingStatus(input.id, input.status)),

  generateBookingInvoice: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => generateBookingInvoice(input.id)),

  // Payments
  getPaymentsByBookingId: publicProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(({ input }) => getPaymentsByBookingId(input.bookingId)),

  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input, ctx }) => createPayment(input, 1)), // TODO: Get userId from context

  generatePaymentReceipt: publicProcedure
    .input(z.object({ paymentId: z.number() }))
    .mutation(({ input }) => generatePaymentReceipt(input.paymentId)),

  // Expenses
  getExpensesByBookingId: publicProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(({ input }) => getExpensesByBookingId(input.bookingId)),

  createExpense: publicProcedure
    .input(createExpenseInputSchema)
    .mutation(({ input, ctx }) => createExpense(input, 1)), // TODO: Get userId from context

  // Dashboard
  getDashboardStats: publicProcedure
    .query(() => getDashboardStats()),

  // Reports
  getProfitLossReport: publicProcedure
    .input(z.object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional()
    }))
    .query(({ input }) => getProfitLossReport(input.startDate, input.endDate)),

  getOutstandingInvoices: publicProcedure
    .query(() => getOutstandingInvoices()),

  getHotelBookingRecapitulation: publicProcedure
    .input(z.object({
      startDate: z.coerce.date(),
      endDate: z.coerce.date()
    }))
    .query(({ input }) => getHotelBookingRecapitulation(input.startDate, input.endDate)),

  exportReportToPDF: publicProcedure
    .input(z.object({
      reportData: z.array(z.any()),
      reportType: z.string()
    }))
    .mutation(({ input }) => exportReportToPDF(input.reportData, input.reportType)),

  exportReportToExcel: publicProcedure
    .input(z.object({
      reportData: z.array(z.any()),
      reportType: z.string()
    }))
    .mutation(({ input }) => exportReportToExcel(input.reportData, input.reportType)),

  // Database Backup
  createDatabaseBackup: publicProcedure
    .mutation(() => createDatabaseBackup()),

  restoreDatabase: publicProcedure
    .input(z.object({ backupFile: z.any() }))
    .mutation(({ input }) => restoreDatabase(input.backupFile))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
