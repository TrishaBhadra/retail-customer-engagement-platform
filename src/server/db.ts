import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'retail_store.db');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      customer_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      first_visit_date TEXT,
      last_visit_date TEXT,
      visit_count INTEGER DEFAULT 1,
      total_spend REAL DEFAULT 0.0,
      average_transaction_value REAL DEFAULT 0.0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      item_description TEXT,
      amount REAL NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY(customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      category TEXT NOT NULL,
      template_name TEXT NOT NULL,
      body TEXT NOT NULL,
      variables TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      actor TEXT NOT NULL,
      description TEXT NOT NULL,
      metadata TEXT
    );

    -- Create Critical Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit_date);
    CREATE INDEX IF NOT EXISTS idx_customers_total_spend ON customers(total_spend);
    CREATE INDEX IF NOT EXISTS idx_customers_visit_count ON customers(visit_count);

    CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_purchase_date ON transactions(purchase_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_item_desc ON transactions(item_description);
    CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON messages(customer_id);
    CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp);
  `);
}

initDatabase();
