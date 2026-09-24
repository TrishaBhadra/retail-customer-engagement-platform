import { db } from '../db.js';
import { StructuredQuerySpec, QueryResult, QueryFilter } from '../../shared/types.js';
import { z } from 'zod';

// Strict Zod schema validating input specifications from LLM
export const StructuredQuerySchema = z.object({
  operation: z.enum(['count', 'list', 'aggregate', 'customer_lookup', 'segment']),
  metric: z.enum(['customers', 'visits', 'spend', 'average_spend', 'repeat_rate', 'transactions']),
  filters: z.array(z.object({
    field: z.enum(['customer_id', 'name', 'phone', 'last_visit_date', 'first_visit_date', 'visit_count', 'total_spend', 'purchase_date', 'amount', 'item_description']),
    operator: z.enum(['equals', 'contains', 'before', 'after', 'between', 'greater_than', 'less_than']),
    value: z.union([z.string(), z.number()]),
    second_value: z.union([z.string(), z.number()]).optional()
  })).optional(),
  group_by: z.enum(['none', 'customer', 'month', 'date']).optional(),
  sort: z.enum(['ascending', 'descending']).optional(),
  limit: z.number().max(200).optional().default(50)
});

const ALLOWED_COLUMNS: Record<string, string> = {
  customer_id: 'c.customer_id',
  name: 'c.name',
  phone: 'c.phone',
  last_visit_date: 'c.last_visit_date',
  first_visit_date: 'c.first_visit_date',
  visit_count: 'c.visit_count',
  total_spend: 'c.total_spend',
  purchase_date: 't.purchase_date',
  amount: 't.amount',
  item_description: 't.item_description'
};

export function executeStructuredQuery(rawSpec: any): QueryResult {
  const startTime = performance.now();
  const spec = StructuredQuerySchema.parse(rawSpec);

  let isTransactionJoinNeeded = false;
  if (spec.filters) {
    isTransactionJoinNeeded = spec.filters.some(f => f.field === 'purchase_date' || f.field === 'amount' || f.field === 'item_description');
  }

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (spec.filters && spec.filters.length > 0) {
    for (const filter of spec.filters) {
      const col = ALLOWED_COLUMNS[filter.field];
      if (!col) continue;

      let val = filter.value;
      // Handle dynamic date keywords
      if (typeof val === 'string') {
        if (val.toUpperCase().includes('CURRENT_DATE - 6 MONTHS') || val.toLowerCase().includes('6 months ago')) {
          val = '2026-03-04'; // relative to dataset baseline 2026-09-04
        } else if (val.toUpperCase().includes('CURRENT_DATE - 30 DAYS') || val.toLowerCase().includes('30 days ago')) {
          val = '2026-08-05';
        }
      }

      switch (filter.operator) {
        case 'equals':
          whereClauses.push(`${col} = ?`);
          params.push(val);
          break;
        case 'contains':
          whereClauses.push(`${col} LIKE ?`);
          params.push(`%${val}%`);
          break;
        case 'before':
        case 'less_than':
          whereClauses.push(`${col} < ?`);
          params.push(val);
          break;
        case 'after':
        case 'greater_than':
          whereClauses.push(`${col} > ?`);
          params.push(val);
          break;
        case 'between':
          if (filter.second_value !== undefined) {
            whereClauses.push(`${col} BETWEEN ? AND ?`);
            params.push(val, filter.second_value);
          }
          break;
      }
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const fromClause = isTransactionJoinNeeded
    ? `FROM customers c JOIN transactions t ON c.customer_id = t.customer_id`
    : `FROM customers c`;

  let sql = '';
  let data: any[] = [];
  let count: number | undefined;
  let aggregateValue: number | undefined;
  let summary = '';

  if (spec.operation === 'count') {
    sql = `SELECT COUNT(DISTINCT c.customer_id) as val ${fromClause} ${whereSql}`;
    const row = db.prepare(sql).get(...params) as { val: number };
    count = row.val || 0;
    aggregateValue = count;
    summary = `Counted ${count.toLocaleString()} matching customer records.`;
    data = [{ count }];
  } else if (spec.operation === 'aggregate') {
    if (spec.metric === 'spend' || spec.metric === 'transactions') {
      sql = `SELECT SUM(c.total_spend) as total, AVG(c.total_spend) as avg_spend ${fromClause} ${whereSql}`;
      const row = db.prepare(sql).get(...params) as { total: number; avg_spend: number };
      aggregateValue = Number((row.total || 0).toFixed(2));
      summary = `Total spend: ₹${aggregateValue.toLocaleString()} (Average: ₹${Number((row.avg_spend || 0).toFixed(2)).toLocaleString()})`;
      data = [{ total_spend: aggregateValue, average_spend: Number((row.avg_spend || 0).toFixed(2)) }];
    } else if (spec.metric === 'average_spend') {
      sql = `SELECT AVG(c.total_spend) as avg_spend ${fromClause} ${whereSql}`;
      const row = db.prepare(sql).get(...params) as { avg_spend: number };
      aggregateValue = Number((row.avg_spend || 0).toFixed(2));
      summary = `Average customer spend: ₹${aggregateValue.toLocaleString()}`;
      data = [{ average_spend: aggregateValue }];
    } else if (spec.metric === 'repeat_rate') {
      const totalRow = db.prepare(`SELECT COUNT(*) as t FROM customers c ${whereSql}`).get(...params) as { t: number };
      const repeatWhere = whereSql ? `${whereSql} AND c.visit_count > 1` : `WHERE c.visit_count > 1`;
      const repeatRow = db.prepare(`SELECT COUNT(*) as r FROM customers c ${repeatWhere}`).get(...params) as { r: number };

      const total = totalRow.t || 0;
      const repeat = repeatRow.r || 0;
      const rate = total > 0 ? Number(((repeat / total) * 100).toFixed(1)) : 0;
      aggregateValue = rate;
      summary = `Repeat customer rate: ${rate}% (${repeat.toLocaleString()} out of ${total.toLocaleString()} customers)`;
      data = [{ repeat_rate_pct: rate, repeat_customers: repeat, total_customers: total }];
      sql = `SELECT (COUNT(CASE WHEN c.visit_count > 1 THEN 1 END) * 100.0 / COUNT(*)) as repeat_rate ${fromClause} ${whereSql}`;
    }
  } else {
    // List / Customer Lookup / Segment
    let orderSql = 'ORDER BY c.total_spend DESC';
    if (spec.sort === 'ascending') {
      orderSql = 'ORDER BY c.total_spend ASC';
    } else if (spec.filters?.some(f => f.field === 'name')) {
      orderSql = 'ORDER BY c.name ASC';
    }

    const limitVal = Math.min(spec.limit || 50, 100);
    sql = `
      SELECT DISTINCT
        c.customer_id,
        c.name,
        c.phone,
        c.first_visit_date,
        c.last_visit_date,
        c.visit_count,
        c.total_spend,
        c.average_transaction_value
      ${fromClause}
      ${whereSql}
      ${orderSql}
      LIMIT ${limitVal}
    `;

    data = db.prepare(sql).all(...params);
    count = data.length;
    summary = `Retrieved ${data.length} customer profiles matching criteria.`;
  }

  const duration = Number((performance.now() - startTime).toFixed(2));

  return {
    spec,
    sql_executed: sql.trim().replace(/\s+/g, ' '),
    summary,
    data,
    count,
    aggregate_value: aggregateValue,
    execution_time_ms: duration
  };
}
