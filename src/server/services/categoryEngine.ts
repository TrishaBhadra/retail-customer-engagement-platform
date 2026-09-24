import { db } from '../db.js';
import { CategoryPreference } from '../../shared/types.js';

export interface CategoryDefinition {
  key: string;
  label: string;
  keywords: string[];
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: 'saree',
    label: 'Saree Buyers',
    keywords: ['saree', 'sari', 'silk saree', 'cotton saree', 'banarasi', 'georgette saree', 'handloom saree', 'kanchipuram', 'chanderi saree']
  },
  {
    key: 'kids_clothing',
    label: 'Kids Clothing Buyers',
    keywords: ['kids', 'children', 'boys', 'girls', 'baby', 'toddler', 'frock', 'dungarees', 'kidswear']
  },
  {
    key: 'menswear',
    label: "Men's Clothing Buyers",
    keywords: ['mens', "men's", 'kurta', 'sherwani', 'men shirt', 'men trouser', 'blazer', 'men polo', 'hoodie']
  },
  {
    key: 'womenswear',
    label: "Women's Clothing Buyers",
    keywords: ['womens', "women's", 'saree', 'dress', 'kurti', 'lehenga', 'salwar', 'dupatta', 'anarkali', 'top', 'frock', 'suit']
  },
  {
    key: 'ethnic_wear',
    label: 'Ethnic Wear Buyers',
    keywords: ['saree', 'kurta', 'kurti', 'lehenga', 'sherwani', 'salwar', 'dupatta', 'anarkali', 'chanderi', 'bandhani', 'ethnic']
  },
  {
    key: 'western_wear',
    label: 'Western Wear Buyers',
    keywords: ['jeans', 't-shirt', 'top', 'shirt', 'blazer', 'hoodie', 'jacket', 'trousers', 'dress', 'western']
  },
  {
    key: 'shirts',
    label: 'Shirt Buyers',
    keywords: ['shirt', 't-shirt', 'polo']
  },
  {
    key: 'trousers',
    label: 'Trousers/Bottomwear Buyers',
    keywords: ['trouser', 'trousers', 'jeans', 'pant', 'pants', 'leggings', 'bottomwear']
  },
  {
    key: 'dresses',
    label: 'Dress Buyers',
    keywords: ['dress', 'lehenga', 'anarkali', 'suit', 'frock']
  },
  {
    key: 'accessories',
    label: 'Accessory Buyers',
    keywords: ['dupatta', 'stole', 'scarf', 'belt', 'accessory']
  }
];

export function categorizeItemDescription(description: string | null): string[] {
  if (!description) return [];
  const descLower = description.toLowerCase();
  const matchedCategories: string[] = [];

  for (const cat of CATEGORY_DEFINITIONS) {
    if (cat.keywords.some((kw) => descLower.includes(kw.toLowerCase()))) {
      matchedCategories.push(cat.key);
    }
  }

  return matchedCategories;
}

export function getCategoryDefinition(key: string): CategoryDefinition | undefined {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return CATEGORY_DEFINITIONS.find(
    (c) => c.key === normalizedKey || c.label.toLowerCase().includes(normalizedKey)
  );
}

/**
 * Deterministically computes a customer's product preferences from transaction history
 */
export function getCustomerCategoryPreferences(customerId: string): CategoryPreference[] {
  const transactions = db
    .prepare(
      `SELECT item_description, amount, purchase_date FROM transactions WHERE customer_id = ?`
    )
    .all(customerId) as Array<{ item_description: string | null; amount: number; purchase_date: string }>;

  const prefMap: Record<
    string,
    { key: string; label: string; count: number; totalSpend: number; lastDate: string | null }
  > = {};

  for (const tx of transactions) {
    const cats = categorizeItemDescription(tx.item_description);
    for (const catKey of cats) {
      const def = CATEGORY_DEFINITIONS.find((d) => d.key === catKey);
      if (!def) continue;

      if (!prefMap[catKey]) {
        prefMap[catKey] = {
          key: catKey,
          label: def.label,
          count: 0,
          totalSpend: 0,
          lastDate: tx.purchase_date
        };
      }

      prefMap[catKey].count += 1;
      prefMap[catKey].totalSpend += tx.amount || 0;
      if (!prefMap[catKey].lastDate || (tx.purchase_date && tx.purchase_date > prefMap[catKey].lastDate)) {
        prefMap[catKey].lastDate = tx.purchase_date;
      }
    }
  }

  return Object.values(prefMap)
    .map((p) => ({
      category: p.key,
      label: p.label,
      purchase_count: p.count,
      total_spend: Number(p.totalSpend.toFixed(2)),
      last_purchase_date: p.lastDate
    }))
    .sort((a, b) => b.total_spend - a.total_spend);
}

/**
 * Builds a deterministic SQL condition for customers matching a specific purchase category keyword group
 */
export function buildCategorySqlCondition(categoryKeyOrName: string): { sqlWhere: string; params: any[] } {
  const norm = categoryKeyOrName.toLowerCase().trim();
  const def = CATEGORY_DEFINITIONS.find(
    (c) => c.key === norm || c.label.toLowerCase() === norm || c.key.includes(norm) || norm.includes(c.key)
  );

  const keywords = def ? def.keywords : [norm];

  const likeClauses = keywords.map(() => `t.item_description LIKE ?`);
  const params = keywords.map((kw) => `%${kw}%`);

  const sqlWhere = `c.customer_id IN (
    SELECT DISTINCT t.customer_id 
    FROM transactions t 
    WHERE ${likeClauses.join(' OR ')}
  )`;

  return { sqlWhere, params };
}

/**
 * Builds SQL condition for high monthly spenders
 * Monthly spend logic: aggregate transactions by customer and calendar month, find max monthly spend
 */
export function buildMonthlySpendSqlCondition(operator: 'greater_than' | 'less_than' | 'equals', amount: number): { sqlWhere: string; params: any[] } {
  let opSql = '>';
  if (operator === 'less_than') opSql = '<';
  if (operator === 'equals') opSql = '=';

  const sqlWhere = `c.customer_id IN (
    SELECT customer_id
    FROM (
      SELECT customer_id, strftime('%Y-%m', purchase_date) as yr_mth, SUM(amount) as monthly_total
      FROM transactions
      GROUP BY customer_id, yr_mth
    )
    GROUP BY customer_id
    HAVING MAX(monthly_total) ${opSql} ?
  )`;

  return { sqlWhere, params: [amount] };
}
