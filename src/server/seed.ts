import { db, initDatabase } from './db.js';
import { v4 as uuidv4 } from 'uuid';

// Helper to pick random element
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min: number, max: number) => Number((Math.random() * (max - min) + min).toFixed(2));

const firstNames = [
  'Rahul', 'Priya', 'Amit', 'Ananya', 'Vikram', 'Sneha', 'Rajesh', 'Sunita', 'Arjun', 'Pooja',
  'Neha', 'Suresh', 'Kavita', 'Rohan', 'Deepika', 'Manish', 'Meera', 'Alok', 'Shruti', 'Sanjay',
  'Aarti', 'Gaurav', 'Divya', 'Karan', 'Shweta', 'Nikhil', 'Tanvi', 'Varun', 'Ritu', 'Aditya',
  'Swati', 'Harish', 'Preeti', 'Abhishek', 'Pallavi', 'Siddharth', 'Nisha', 'Vijay', 'Bhavna', 'Kunal',
  'Anjali', 'Tarun', 'Shalini', 'Vivek', 'Monika', 'Rakesh', 'Aakanksha', 'Sachin', 'Sonam', 'Pankaj'
];

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Iyer', 'Singh', 'Kulkarni', 'Kumar', 'Gupta', 'Mehta', 'Reddy',
  'Agarwal', 'Nair', 'Deshmukh', 'Joshi', 'Chowdhury', 'Rao', 'Bhat', 'Saxena', 'Kapoor', 'Malhotra',
  'Shah', 'Srivastava', 'Chawla', 'Trivedi', 'Jain', 'Das', 'Sen', 'Pillai', 'Rathore', 'Banerjee',
  'Dhar', 'Kashyap', 'Chopra', 'Mishra', 'Pandey', 'Shukla', 'Yadav', 'Verma', 'Dubey', 'Tripathi'
];

const clothingItems = [
  // Sarees & Ethnic Wear
  { desc: 'Banarasi Silk Saree', basePrice: 4999 },
  { desc: 'Handloom Cotton Saree', basePrice: 2299 },
  { desc: 'Georgette Printed Saree', basePrice: 3499 },
  { desc: 'Kanchipuram Silk Saree', basePrice: 7999 },
  { desc: 'Ethnic Lehenga Choli', basePrice: 8999 },
  { desc: 'Chanderi Dupatta Set', basePrice: 1899 },
  { desc: 'Bandhani Print Salwar Suit', basePrice: 2799 },
  { desc: 'Anarkali Salwar Suit', basePrice: 3499 },
  { desc: 'Embroidered Silk Kurti', basePrice: 1699 },
  
  // Kids Wear
  { desc: 'Kids Cotton Kurta Pyjama', basePrice: 999 },
  { desc: 'Girls Floral Party Frock', basePrice: 1499 },
  { desc: 'Boys Denim Dungarees', basePrice: 1299 },
  { desc: 'Kids Graphic Printed T-Shirt', basePrice: 599 },
  { desc: 'Children Silk Lehenga Set', basePrice: 2499 },

  // Menswear
  { desc: 'Men\'s Cotton Linen Kurta', basePrice: 1299 },
  { desc: 'Men\'s Slim Fit Denim Jeans', basePrice: 2499 },
  { desc: 'Men\'s Casual Printed Shirt', basePrice: 1499 },
  { desc: 'Men\'s Formal Pleated Trousers', basePrice: 1799 },
  { desc: 'Men\'s Polo Cotton T-Shirt', basePrice: 899 },
  { desc: 'Men\'s Royal Sherwani Set', basePrice: 12499 },
  { desc: 'Men\'s Formal Blazer Jacket', basePrice: 5999 },

  // Womenswear & Western Wear
  { desc: 'Women\'s Summer Floral Dress', basePrice: 2199 },
  { desc: 'Women\'s Casual Denim Jacket', basePrice: 3299 },
  { desc: 'Women\'s V-Neck Cotton Top', basePrice: 799 },
  { desc: 'Women\'s Graphic Printed Hoodie', basePrice: 1999 },
  { desc: 'Women\'s Ankle Length Leggings', basePrice: 699 }
];

export function generateSyntheticDataset(targetCustomers = 30000, targetTransactions = 50000) {
  console.log(`🚀 Seeding database with ~${targetCustomers} customers and ~${targetTransactions} transactions...`);
  initDatabase();

  db.exec('DELETE FROM transactions;');
  db.exec('DELETE FROM customers;');
  db.exec('DELETE FROM messages;');
  db.exec('DELETE FROM activity;');

  const insertCustomer = db.prepare(`
    INSERT INTO customers (customer_id, name, phone, first_visit_date, last_visit_date, visit_count, total_spend, average_transaction_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTransaction = db.prepare(`
    INSERT INTO transactions (transaction_id, customer_id, purchase_date, item_description, amount, quantity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activity (id, timestamp, type, actor, description, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = new Date('2026-09-04T21:00:00Z');
  const startDate = new Date('2023-01-01T00:00:00Z');
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const phoneSet = new Set<string>();
  const generatePhone = () => {
    let p = '';
    do {
      const prefix = pick(['98', '97', '88', '70', '91', '99', '94', '81', '79']);
      const rest = String(randInt(1000000, 9999999));
      p = `+91 ${prefix}${rest.slice(0, 3)} ${rest.slice(3)}`;
    } while (phoneSet.has(p));
    phoneSet.add(p);
    return p;
  };

  const seedTransaction = db.transaction(() => {
    let transactionCount = 0;

    for (let i = 0; i < targetCustomers; i++) {
      const customerId = `CUST-${String(i + 1).padStart(6, '0')}`;
      const name = `${pick(firstNames)} ${pick(lastNames)}`;
      const phone = generatePhone();

      // Customer tier breakdown
      // ~45% one-time, ~55% repeat
      const isRepeat = Math.random() < 0.55;
      const visitCount = isRepeat ? randInt(2, 12) : 1;

      // Segment profile: high-value vs regular, inactive vs recent vs middle
      const isHighValue = Math.random() < 0.12; // ~12% high value
      const isInactive = Math.random() < 0.20;  // ~20% inactive (last visit > 6mo ago)
      const isRecent = !isInactive && Math.random() < 0.38; // ~30% overall recent

      let lastVisitTimestamp: number;
      if (isInactive) {
        // Between 2023-01-01 and 6 months ago
        lastVisitTimestamp = randInt(startDate.getTime(), sixMonthsAgo.getTime());
      } else if (isRecent) {
        // Between 30 days ago and today
        lastVisitTimestamp = randInt(thirtyDaysAgo.getTime(), now.getTime());
      } else {
        // Between 6 months ago and 30 days ago
        lastVisitTimestamp = randInt(sixMonthsAgo.getTime(), thirtyDaysAgo.getTime());
      }

      let firstVisitTimestamp = lastVisitTimestamp;
      if (visitCount > 1) {
        firstVisitTimestamp = randInt(startDate.getTime(), lastVisitTimestamp);
      }

      let customerTotalSpend = 0;
      const customerTxDates: number[] = [];
      const txBuffer: Array<{ txId: string; txDate: string; desc: string; amount: number; qty: number }> = [];

      // Generate transaction dates between first and last visit
      for (let v = 0; v < visitCount; v++) {
        if (v === 0) {
          customerTxDates.push(firstVisitTimestamp);
        } else if (v === visitCount - 1) {
          customerTxDates.push(lastVisitTimestamp);
        } else {
          customerTxDates.push(randInt(firstVisitTimestamp, lastVisitTimestamp));
        }
      }
      customerTxDates.sort((a, b) => a - b);

      for (let v = 0; v < visitCount; v++) {
        const item = pick(clothingItems);
        const qty = randInt(1, 3);
        const multiplier = isHighValue ? randFloat(2.5, 4.5) : randFloat(0.9, 1.4);
        const amount = Number((item.basePrice * qty * multiplier).toFixed(2));
        customerTotalSpend += amount;

        const txId = `TX-${String(++transactionCount).padStart(7, '0')}`;
        const txDate = new Date(customerTxDates[v]).toISOString().split('T')[0];

        txBuffer.push({ txId, txDate, desc: item.desc, amount, qty });
      }

      customerTotalSpend = Number(customerTotalSpend.toFixed(2));
      const avgTxValue = Number((customerTotalSpend / visitCount).toFixed(2));
      const firstVisitStr = new Date(firstVisitTimestamp).toISOString().split('T')[0];
      const lastVisitStr = new Date(lastVisitTimestamp).toISOString().split('T')[0];
      const createdAt = firstVisitStr;

      // Insert customer FIRST to satisfy FOREIGN KEY constraint
      insertCustomer.run(
        customerId,
        name,
        phone,
        firstVisitStr,
        lastVisitStr,
        visitCount,
        customerTotalSpend,
        avgTxValue,
        createdAt
      );

      // Insert buffered transactions SECOND
      for (const t of txBuffer) {
        insertTransaction.run(t.txId, customerId, t.txDate, t.desc, t.amount, t.qty);
      }

      if ((i + 1) % 5000 === 0) {
        console.log(`  Processed ${i + 1} customers, ${transactionCount} transactions...`);
      }
    }

    // Add initial dataset upload activity event
    const actId = `ACT-${uuidv4()}`;
    insertActivity.run(
      actId,
      now.toISOString(),
      'dataset_imported',
      'System',
      `Imported baseline retail database with ${targetCustomers.toLocaleString()} customers and ${transactionCount.toLocaleString()} transactions.`,
      JSON.stringify({ customers: targetCustomers, transactions: transactionCount })
    );

    console.log(`✅ Successfully seeded database with ${targetCustomers} customers and ${transactionCount} transactions!`);
  });

  seedTransaction();
}

// Run directly if invoked via CLI
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.ts')) {
  generateSyntheticDataset(30000, 50000);
}
