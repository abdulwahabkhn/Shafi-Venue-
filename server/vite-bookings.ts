import type { Plugin } from 'vite';
import handler from '../api/bookings.js';
import staffHandler from '../api/staff.js';
import type { RuntimeRequest } from './auth.js';

// Set a separate development DATABASE_URL. Legacy SQLite files remain untouched.
export function bookingsPlugin(): Plugin {
  return { name: 'private-bookings', configureServer(server) {
    server.middlewares.use('/api/staff', async (req, res) => {
      req.headers['x-forwarded-proto']='http';
      req.url = `/api/staff${req.url === '/' ? '' : req.url ?? ''}`;
      await staffHandler(req as unknown as RuntimeRequest, res);
    });
    server.middlewares.use('/api/bookings', async (req, res) => {
      req.headers['x-forwarded-proto']='http';
      req.url = `/api/bookings${req.url === '/' ? '' : req.url ?? ''}`;
      await handler(req as unknown as RuntimeRequest, res);
    });
  } };
}
