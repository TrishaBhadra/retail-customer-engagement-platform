import { db } from '../db.js';
import { AnalyticsSummary } from '../../shared/types.js';

export function getAnalyticsSummary(): AnalyticsSummary {
  const customerCountRow = db.prepare(`SELECT COUNT(*) as count FROM customers`).get() as { count: number };
  const transactionCountRow = db.prepare(`SELECT COUNT(*) as count, SUM(amount) as total_sales FROM transactions`).get() as { count: number; total_sales: number };
  const repeatCountRow = db.prepare(`SELECT COUNT(*) as count FROM customers WHERE visit_count > 1`).get() as { count: number };

  const totalCustomers = customerCountRow.count || 0;
  const totalTransactions = transactionCountRow.count || 0;
  const totalSales = Number((transactionCountRow.total_sales || 0).toFixed(2));

  const repeatRate = totalCustomers > 0 ? Number(((repeatCountRow.count / totalCustomers) * 100).toFixed(1)) : 0;
  const avgCustomerSpend = totalCustomers > 0 ? Number((totalSales / totalCustomers).toFixed(2)) : 0;
  const avgTransactionValue = totalTransactions > 0 ? Number((totalSales / totalTransactions).toFixed(2)) : 0;

  // Active in last 30 days (assuming current date anchor 2026-09-04)
  const active30dRow = db.prepare(`
    SELECT COUNT(*) as count FROM customers
    WHERE last_visit_date >= DATE('2026-09-04', '-30 days')
  `).get() as { count: number };

  // Inactive for 6+ months
  const inactive6moRow = db.prepare(`
    SELECT COUNT(*) as count FROM customers
    WHERE last_visit_date < DATE('2026-09-04', '-180 days')
  `).get() as { count: number };

  // Sales by month (last 12 months)
  const monthlySalesRows = db.prepare(`
    SELECT
      STRFTIME('%Y-%m', purchase_date) as month,
      SUM(amount) as sales,
      COUNT(*) as transactions
    FROM transactions
    WHERE purchase_date >= DATE('2026-09-04', '-1 year')
    GROUP BY STRFTIME('%Y-%m', purchase_date)
    ORDER BY month ASC
  `).all() as Array<{ month: string; sales: number; transactions: number }>;

  const salesByMonth = monthlySalesRows.map(r => ({
    month: r.month,
    sales: Number((r.sales || 0).toFixed(2)),
    transactions: r.transactions
  }));

  // Spend distribution tiers
  const tier1 = db.prepare(`SELECT COUNT(*) as c FROM customers WHERE total_spend < 2000`).get() as { c: number };
  const tier2 = db.prepare(`SELECT COUNT(*) as c FROM customers WHERE total_spend >= 2000 AND total_spend < 5000`).get() as { c: number };
  const tier3 = db.prepare(`SELECT COUNT(*) as c FROM customers WHERE total_spend >= 5000 AND total_spend < 10000`).get() as { c: number };
  const tier4 = db.prepare(`SELECT COUNT(*) as c FROM customers WHERE total_spend >= 10000`).get() as { c: number };

  const spendDistribution = [
    { range: '< ₹2,000', customer_count: tier1.c || 0 },
    { range: '₹2,000 - ₹5,000', customer_count: tier2.c || 0 },
    { range: '₹5,000 - ₹10,000', customer_count: tier3.c || 0 },
    { range: '> ₹10,000 (VIP)', customer_count: tier4.c || 0 }
  ];

  // Top categories / items
  const topItemsRows = db.prepare(`
    SELECT
      item_description as item,
      SUM(amount) as total_amount,
      COUNT(*) as count
    FROM transactions
    WHERE item_description IS NOT NULL
    GROUP BY item_description
    ORDER BY total_amount DESC
    LIMIT 6
  `).all() as Array<{ item: string; total_amount: number; count: number }>;

  return {
    total_customers: totalCustomers,
    total_transactions: totalTransactions,
    total_sales: totalSales,
    repeat_visit_rate: repeatRate,
    average_customer_spend: avgCustomerSpend,
    average_transaction_value: avgTransactionValue,
    active_last_30_days: active30dRow.count || 0,
    inactive_6_months: inactive6moRow.count || 0,
    sales_by_month: salesByMonth,
    spend_distribution: spendDistribution,
    top_categories: topItemsRows.map(r => ({
      item: r.item,
      total_amount: Number((r.total_amount || 0).toFixed(2)),
      count: r.count
    })),
    dataset_metadata: {
      last_updated: new Date().toISOString(),
      total_records: totalCustomers + totalTransactions
    }
  };
}
