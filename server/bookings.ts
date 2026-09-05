import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { bookingInput, paymentInput, type Booking } from '../shared/bookings.js';

export function bookingStore(path = resolve('.cms-local/bookings.sqlite')) {
  if (path !== ':memory:') mkdirSync(resolve(path, '..'), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS bookings(id TEXT PRIMARY KEY, body TEXT NOT NULL, version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS payments(id TEXT PRIMARY KEY, booking TEXT NOT NULL, amount INTEGER NOT NULL, method TEXT NOT NULL, reference TEXT NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, booking TEXT NOT NULL, action TEXT NOT NULL, created TEXT NOT NULL, actor TEXT NOT NULL);`);
  const list = (): Booking[] => db.prepare('SELECT body FROM bookings').all().map(r => JSON.parse(String(r.body)));
  function transaction<T>(fn: () => T) { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } }
  function audit(id: string, action: string) { db.prepare('INSERT INTO audit VALUES(?,?,?,?,?)').run(randomUUID(), id, action, new Date().toISOString(), 'Shared administrator (local phase 1)'); }
  return {
    list,
    close: () => db.close(),
    save(raw: unknown, id?: string, version?: number) { return transaction(() => {
      const input = bookingInput.parse(raw);
      const records = list();
      const previous = id ? records.find(b => b.id === id) : undefined;
      if (id && (!previous || previous.version !== version)) throw new Error('Record changed. Reload before saving.');
      if (input.total < (previous?.paid ?? 0)) throw new Error('Total cannot be lower than recorded payments.');
      if (['Hold','Confirmed'].includes(input.status) && records.some(b => b.id !== id && ['Hold','Confirmed'].includes(b.status) && b.hall === input.hall && b.date === input.date && b.start < input.end && b.end > input.start)) throw new Error('This hall already has a booking or hold during that time.');
      const record: Booking = { ...input, id: id ?? randomUUID(), version: (previous?.version ?? 0) + 1, paid: previous?.paid ?? 0, createdAt: previous?.createdAt ?? new Date().toISOString() };
      db.prepare('INSERT OR REPLACE INTO bookings VALUES(?,?,?)').run(record.id, JSON.stringify(record), record.version);
      audit(record.id, previous ? 'Booking updated' : 'Booking created');
      return record;
    }); },
    payment(id: string, raw: unknown) { return transaction(() => {
      const input = paymentInput.parse(raw);
      const b = list().find(b => b.id === id);
      if (!b) throw new Error('Booking not found.');
      const duplicate = db.prepare('SELECT * FROM payments WHERE id=?').get(input.key);
      if (duplicate) { if (duplicate.booking !== id || duplicate.amount !== input.amount || duplicate.method !== input.method || duplicate.reference !== input.reference) throw new Error('Payment reference conflict.'); return b; }
      if (b.status === 'Cancelled' || input.amount > b.total - b.paid) throw new Error('Payment exceeds the balance or booking is cancelled.');
      db.prepare('INSERT INTO payments VALUES(?,?,?,?,?,?)').run(input.key,id,input.amount,input.method,input.reference,new Date().toISOString());
      b.paid += input.amount; b.version++;
      db.prepare('UPDATE bookings SET body=?,version=? WHERE id=?').run(JSON.stringify(b),b.version,id);
      audit(id, `Payment recorded: ${input.amount} PKR`);
      return b;
    }); },
    history(id: string) { return { payments: db.prepare('SELECT * FROM payments WHERE booking=? ORDER BY created').all(id), audit: db.prepare('SELECT * FROM audit WHERE booking=? ORDER BY created').all(id) }; },
  };
}
