import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, '..', 'financeflow.db'), (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.run('PRAGMA journal_mode = WAL');

const createTables = () => {
  const transactionsTable = `
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'ARS',
      exchange_rate REAL DEFAULT 0,
      category TEXT,
      description TEXT,
      date TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `;

  const installmentsTable = `
    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      card_name TEXT NOT NULL,
      amount_per_installment REAL NOT NULL,
      total_installments INTEGER NOT NULL,
      installments_paid INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      currency TEXT DEFAULT 'ARS'
    )
  `;

  const installmentPaymentsTable = `
    CREATE TABLE IF NOT EXISTS installment_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      installment_id INTEGER NOT NULL,
      transaction_id INTEGER NOT NULL,
      installment_number INTEGER NOT NULL,
      payment_date TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    )
  `;

  db.serialize(() => {
    db.run(transactionsTable);
    db.run(installmentsTable);
    db.run(installmentPaymentsTable);
    // Migration: Add currency column if it doesn't exist
    db.run("ALTER TABLE installments ADD COLUMN currency TEXT DEFAULT 'ARS'", (err) => {
      if (err && !err.message.includes('duplicate column')) {
        // Column already exists, ignore
      }
    });
    // Migration: Convert MAJOR_EXPENSE and MICRO_EXPENSE to EXPENSE
    db.run("UPDATE transactions SET type = 'EXPENSE' WHERE type IN ('MAJOR_EXPENSE', 'MICRO_EXPENSE')", (err) => {
      if (err) {
        console.error('Migration error (EXPENSE):', err);
      }
    });
  });
};

createTables();

export default db;
