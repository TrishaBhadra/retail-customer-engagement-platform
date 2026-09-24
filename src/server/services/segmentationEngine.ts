import { db } from '../db.js';
import {
  StructuredSegmentSpec,
  StructuredSegmentCondition,
  SegmentQueryResult,
  Customer
} from '../../shared/types.js';
import {
  buildCategorySqlCondition,
  buildMonthlySpendSqlCondition,
  getCustomerCategoryPreferences
} from './categoryEngine.js';
import { z } from 'zod';

export const StructuredSegmentConditionSchema = z.object({
  id: z.string().optional(),
  field: z.enum([
    'monthly_spend',
    'lifetime_spend',
    'visit_count',
    'last_visit_date',
    'purchase_category',
    'purchase_date'
  ]),
  operator: z.enum([
    'greater_than',
    'less_than',
    'equals',
    'before',
    'after',
    'within_last_days',
    'contains',
    'between',
    'in_category'
  ]),
  value: z.union([z.string(), z.number()]),
  second_value: z.union([z.string(), z.number()]).optional()
});

export const StructuredSegmentSpecSchema = z.object({
  logic: z.enum(['AND', 'OR', 'NOT']).default('AND'),
  conditions: z.array(StructuredSegmentConditionSchema)
});

/**
 * Normalizes dynamic date expressions like "30 days ago" or "6 months ago"
 */
function normalizeDateValue(val: string | number): string {
  if (typeof val === 'number') return String(val);
  const s = String(val).toLowerCase().trim();
  const baseDate = new Date('2026-09-04T00:00:00Z');

  if (s.includes('30 days ago') || s.includes('30_days') || s.includes('last month')) {
    const d = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }
  if (s.includes('6 months ago') || s.includes('6_months') || s.includes('half year')) {
    const d = new Date(baseDate.getTime() - 180 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }
  if (s.includes('90 days ago') || s.includes('90_days') || s.includes('3 months ago')) {
    const d = new Date(baseDate.getTime() - 90 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }

  return s;
}

/**
 * Builds a SQL clause and parameters for a single segment condition
 */
export function buildSingleConditionSql(cond: StructuredSegmentCondition): { sqlWhere: string; params: any[] } {
  const params: any[] = [];
  let sqlWhere = '';

  switch (cond.field) {
    case 'monthly_spend': {
      const amount = typeof cond.value === 'number' ? cond.value : parseFloat(cond.value) || 0;
      let op: 'greater_than' | 'less_than' | 'equals' = 'greater_than';
      if (cond.operator === 'less_than') op = 'less_than';
      if (cond.operator === 'equals') op = 'equals';
      return buildMonthlySpendSqlCondition(op, amount);
    }

    case 'lifetime_spend': {
      const amount = typeof cond.value === 'number' ? cond.value : parseFloat(cond.value) || 0;
      if (cond.operator === 'greater_than') {
        sqlWhere = 'c.total_spend > ?';
        params.push(amount);
      } else if (cond.operator === 'less_than') {
        sqlWhere = 'c.total_spend < ?';
        params.push(amount);
      } else if (cond.operator === 'equals') {
        sqlWhere = 'c.total_spend = ?';
        params.push(amount);
      } else if (cond.operator === 'between' && cond.second_value !== undefined) {
        const amt2 = typeof cond.second_value === 'number' ? cond.second_value : parseFloat(cond.second_value) || 0;
        sqlWhere = 'c.total_spend BETWEEN ? AND ?';
        params.push(amount, amt2);
      } else {
        sqlWhere = 'c.total_spend >= ?';
        params.push(amount);
      }
      break;
    }

    case 'visit_count': {
      const visits = typeof cond.value === 'number' ? cond.value : parseInt(String(cond.value)) || 0;
      if (cond.operator === 'greater_than') {
        sqlWhere = 'c.visit_count > ?';
        params.push(visits);
      } else if (cond.operator === 'less_than') {
        sqlWhere = 'c.visit_count < ?';
        params.push(visits);
      } else if (cond.operator === 'equals') {
        sqlWhere = 'c.visit_count = ?';
        params.push(visits);
      } else if (cond.operator === 'between' && cond.second_value !== undefined) {
        const v2 = typeof cond.second_value === 'number' ? cond.second_value : parseInt(String(cond.second_value)) || 0;
        sqlWhere = 'c.visit_count BETWEEN ? AND ?';
        params.push(visits, v2);
      } else {
        sqlWhere = 'c.visit_count >= ?';
        params.push(visits);
      }
      break;
    }

    case 'last_visit_date': {
      if (cond.operator === 'within_last_days') {
        const days = typeof cond.value === 'number' ? cond.value : parseInt(String(cond.value)) || 30;
        const cutoffDate = new Date(new Date('2026-09-04T00:00:00Z').getTime() - days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        sqlWhere = 'c.last_visit_date >= ?';
        params.push(cutoffDate);
      } else if (cond.operator === 'before') {
        const dateStr = normalizeDateValue(cond.value);
        sqlWhere = 'c.last_visit_date < ?';
        params.push(dateStr);
      } else if (cond.operator === 'after') {
        const dateStr = normalizeDateValue(cond.value);
        sqlWhere = 'c.last_visit_date > ?';
        params.push(dateStr);
      } else if (cond.operator === 'between' && cond.second_value !== undefined) {
        const d1 = normalizeDateValue(cond.value);
        const d2 = normalizeDateValue(cond.second_value);
        sqlWhere = 'c.last_visit_date BETWEEN ? AND ?';
        params.push(d1, d2);
      } else {
        const dateStr = normalizeDateValue(cond.value);
        sqlWhere = 'c.last_visit_date = ?';
        params.push(dateStr);
      }
      break;
    }

    case 'purchase_category': {
      return buildCategorySqlCondition(String(cond.value));
    }

    case 'purchase_date': {
      const dateStr = normalizeDateValue(cond.value);
      if (cond.operator === 'after' || cond.operator === 'within_last_days') {
        sqlWhere = `c.customer_id IN (SELECT DISTINCT customer_id FROM transactions WHERE purchase_date >= ?)`;
        params.push(dateStr);
      } else if (cond.operator === 'before') {
        sqlWhere = `c.customer_id IN (SELECT DISTINCT customer_id FROM transactions WHERE purchase_date < ?)`;
        params.push(dateStr);
      } else if (cond.operator === 'between' && cond.second_value !== undefined) {
        const d2 = normalizeDateValue(cond.second_value);
        sqlWhere = `c.customer_id IN (SELECT DISTINCT customer_id FROM transactions WHERE purchase_date BETWEEN ? AND ?)`;
        params.push(dateStr, d2);
      } else {
        sqlWhere = `c.customer_id IN (SELECT DISTINCT customer_id FROM transactions WHERE purchase_date = ?)`;
        params.push(dateStr);
      }
      break;
    }
  }

  return { sqlWhere, params };
}

/**
 * Executes a deterministic composite segment query against SQLite
 */
export function executeSegmentQuery(
  rawSpec: any,
  page = 1,
  limit = 25,
  search = '',
  sortBy = 'total_spend',
  sortOrder = 'DESC'
): SegmentQueryResult {
  const startTime = performance.now();
  const spec = StructuredSegmentSpecSchema.parse(rawSpec);

  const whereClauses: string[] = ['1=1'];
  const params: any[] = [];

  if (search && search.trim()) {
    const s = search.trim();
    whereClauses.push('(c.name LIKE ? OR c.phone LIKE ? OR c.customer_id LIKE ?)');
    params.push(`%${s}%`, `%${s}%`, `%${s}%`);
  }

  if (spec.conditions && spec.conditions.length > 0) {
    const condClauses: string[] = [];
    for (const cond of spec.conditions) {
      const { sqlWhere, params: condParams } = buildSingleConditionSql(cond);
      if (sqlWhere) {
        condClauses.push(`(${sqlWhere})`);
        params.push(...condParams);
      }
    }

    if (condClauses.length > 0) {
      if (spec.logic === 'OR') {
        whereClauses.push(`(${condClauses.join(' OR ')})`);
      } else if (spec.logic === 'NOT') {
        whereClauses.push(`NOT (${condClauses.join(' AND ')})`);
      } else {
        // AND logic
        whereClauses.push(`(${condClauses.join(' AND ')})`);
      }
    }
  }

  const whereSql = whereClauses.join(' AND ');

  // Count total matching records deterministically
  const countSql = `SELECT COUNT(*) as total FROM customers c WHERE ${whereSql}`;
  const totalRow = db.prepare(countSql).get(...params) as { total: number };
  const totalMatching = totalRow ? totalRow.total : 0;

  // Pagination & Sorting
  const validSortCols: Record<string, string> = {
    name: 'c.name',
    phone: 'c.phone',
    last_visit_date: 'c.last_visit_date',
    visit_count: 'c.visit_count',
    total_spend: 'c.total_spend',
    average_transaction_value: 'c.average_transaction_value'
  };
  const orderCol = validSortCols[sortBy] || 'c.total_spend';
  const orderDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const offset = (page - 1) * limit;

  const dataSql = `
    SELECT
      c.customer_id,
      c.name,
      c.phone,
      c.first_visit_date,
      c.last_visit_date,
      c.visit_count,
      c.total_spend,
      c.average_transaction_value,
      c.created_at
    FROM customers c
    WHERE ${whereSql}
    ORDER BY ${orderCol} ${orderDir}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(dataSql).all(...params, limit, offset) as Customer[];

  // Populate customer preferences for audience preview
  const customersWithPrefs: Customer[] = rows.map((c) => ({
    ...c,
    buying_preferences: getCustomerCategoryPreferences(c.customer_id)
  }));

  const totalPages = Math.ceil(totalMatching / limit) || 1;
  const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

  return {
    spec,
    matching_count: totalMatching,
    customers: customersWithPrefs,
    page,
    limit,
    total_pages: totalPages,
    sql_executed: dataSql.trim().replace(/\s+/g, ' '),
    execution_time_ms: executionTimeMs
  };
}
