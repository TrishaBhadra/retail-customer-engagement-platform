import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import { getAnalyticsSummary } from './services/analyticsService.js';
import { processAiQuery, generateCustomerDraftMessage, translateNlToSegmentSpec } from './services/aiService.js';
import { createMessageDraft, sendMockWhatsAppMessage, getCustomerMessages, createCampaignAndMockSend } from './services/communicationService.js';
import { getRecentActivities, logActivity } from './services/activityService.js';
import { executeStructuredQuery } from './services/queryService.js';
import { executeSegmentQuery } from './services/segmentationEngine.js';
import { getCustomerCategoryPreferences, CATEGORY_DEFINITIONS } from './services/categoryEngine.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Analytics KPIs
app.get('/api/analytics', (req, res) => {
  try {
    const summary = getAnalyticsSummary();
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Canonical Product Categories
app.get('/api/categories', (req, res) => {
  try {
    res.json({ categories: CATEGORY_DEFINITIONS });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Paginated List & Search & Filters
app.get('/api/customers', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = (req.query.search as string || '').trim();
    const minSpend = parseFloat(req.query.minSpend as string) || 0;
    const maxSpend = parseFloat(req.query.maxSpend as string) || Number.MAX_SAFE_INTEGER;
    const minVisits = parseInt(req.query.minVisits as string) || 0;
    const inactiveOnly = req.query.inactiveOnly === 'true';
    const category = (req.query.category as string || '').trim();
    const sortBy = (req.query.sortBy as string) || 'total_spend';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;
    const whereClauses: string[] = ['1=1'];
    const params: any[] = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR phone LIKE ? OR customer_id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (minSpend > 0) {
      whereClauses.push('total_spend >= ?');
      params.push(minSpend);
    }

    if (maxSpend < Number.MAX_SAFE_INTEGER) {
      whereClauses.push('total_spend <= ?');
      params.push(maxSpend);
    }

    if (minVisits > 0) {
      whereClauses.push('visit_count >= ?');
      params.push(minVisits);
    }

    if (inactiveOnly) {
      whereClauses.push("last_visit_date < DATE('2026-09-04', '-180 days')");
    }

    if (category) {
      const def = CATEGORY_DEFINITIONS.find(c => c.key === category || c.label.toLowerCase().includes(category.toLowerCase()));
      const keywords = def ? def.keywords : [category];
      const likeClauses = keywords.map(() => `t.item_description LIKE ?`);
      const kwParams = keywords.map(kw => `%${kw}%`);
      whereClauses.push(`customer_id IN (SELECT DISTINCT customer_id FROM transactions t WHERE ${likeClauses.join(' OR ')})`);
      params.push(...kwParams);
    }

    const whereSql = whereClauses.join(' AND ');

    const countSql = `SELECT COUNT(*) as total FROM customers WHERE ${whereSql}`;
    const totalRow = db.prepare(countSql).get(...params) as { total: number };

    const validSortCols: Record<string, string> = {
      name: 'name',
      phone: 'phone',
      last_visit_date: 'last_visit_date',
      visit_count: 'visit_count',
      total_spend: 'total_spend',
      average_transaction_value: 'average_transaction_value'
    };
    const orderCol = validSortCols[sortBy] || 'total_spend';

    const dataSql = `
      SELECT * FROM customers
      WHERE ${whereSql}
      ORDER BY ${orderCol} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const customers = db.prepare(dataSql).all(...params, limit, offset) as any[];

    // Attach preferences for display
    const enriched = customers.map(c => ({
      ...c,
      buying_preferences: getCustomerCategoryPreferences(c.customer_id)
    }));

    if (search && page === 1) {
      logActivity('customer_searched', 'Retail Staff', `Searched customer database for "${search}".`, { search, results: totalRow.total });
    }

    res.json({
      customers: enriched,
      pagination: {
        page,
        limit,
        total: totalRow.total,
        totalPages: Math.ceil(totalRow.total / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single Customer Details
app.get('/api/customers/:id', (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = db.prepare(`SELECT * FROM customers WHERE customer_id = ?`).get(customerId) as any;

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const buying_preferences = getCustomerCategoryPreferences(customerId);

    const transactions = db.prepare(`
      SELECT * FROM transactions WHERE customer_id = ? ORDER BY purchase_date DESC
    `).all(customerId);

    const messages = getCustomerMessages(customerId);

    logActivity('customer_viewed', 'Retail Staff', `Viewed profile for customer ${customer.name} (${customer.phone}).`, { customer_id: customerId });

    res.json({
      customer: {
        ...customer,
        buying_preferences
      },
      transactions,
      messages
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Segment Preview & Audience Calculation Endpoint
app.post('/api/segment/preview', (req, res) => {
  try {
    const { spec, page = 1, limit = 25, search = '', sortBy = 'total_spend', sortOrder = 'DESC' } = req.body;
    const result = executeSegmentQuery(spec, page, limit, search, sortBy, sortOrder);

    logActivity('audience_filtered', 'Retail Staff', `Filtered campaign audience: ${result.matching_count.toLocaleString()} matching recipients.`, {
      matching_count: result.matching_count,
      spec
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Natural Language Audience Translation Endpoint
app.post('/api/segment/nl-translate', (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string required' });
    }

    const spec = translateNlToSegmentSpec(prompt);
    const result = executeSegmentQuery(spec, 1, 25);

    logActivity('audience_created', 'Retail Staff', `Translated natural language audience request: "${prompt}" -> ${result.matching_count.toLocaleString()} matching recipients.`, {
      prompt,
      spec,
      matching_count: result.matching_count
    });

    res.json({
      spec,
      result
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Campaign Creation & Bulk Mock Send Endpoint
app.post('/api/campaign/create-and-send', (req, res) => {
  try {
    const {
      campaignName,
      spec,
      category = 'marketing',
      templateName = 'marketing_template',
      customBodyTemplate,
      excludedCustomerIds = [],
      targetCategory
    } = req.body;

    if (!campaignName || !spec) {
      return res.status(400).json({ error: 'Campaign name and audience spec required' });
    }

    const result = createCampaignAndMockSend(
      campaignName,
      spec,
      category,
      templateName,
      customBodyTemplate,
      excludedCustomerIds,
      targetCategory
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Natural Language Query Pipeline
app.post('/api/ai/query', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question string is required' });
    }

    const result = await processAiQuery(question);

    logActivity(
      'ai_question_asked',
      'Retail Staff',
      `Asked AI Assistant: "${question}"`,
      { question, sql: result.query_result?.sql_executed || result.segment_result?.sql_executed }
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Direct Structured Query Execution Endpoint (Safe Query Engine)
app.post('/api/query/execute', (req, res) => {
  try {
    const spec = req.body;
    const result = executeStructuredQuery(spec);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Generate Draft WhatsApp Message for Single Customer
app.post('/api/messages/draft', (req, res) => {
  try {
    const { customerId, category, targetCategory } = req.body;
    const customer = db.prepare(`SELECT * FROM customers WHERE customer_id = ?`).get(customerId) as any;

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const draft = generateCustomerDraftMessage(customer, category || 'marketing', 'JK Readymade Center', targetCategory);
    const message = createMessageDraft(
      customerId,
      category || 'marketing',
      `${category}_template`,
      draft.body,
      draft.variables
    );

    res.json({ message, draft });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send Mock WhatsApp Message
app.post('/api/messages/send-mock', (req, res) => {
  try {
    const { messageId } = req.body;
    const result = sendMockWhatsAppMessage(messageId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Activity Timeline
app.get('/api/activity', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activities = getRecentActivities(limit);
    res.json({ activities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Chunk Ingestion API (from Web Worker)
app.post('/api/ingest/chunk', (req, res) => {
  try {
    const { rows } = req.body as { rows: any[] };
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'Rows array required' });
    }

    let customersInserted = 0;
    let transactionsInserted = 0;

    const findCust = db.prepare(`SELECT customer_id, visit_count, total_spend, first_visit_date, last_visit_date FROM customers WHERE phone = ?`);
    const updateCust = db.prepare(`
      UPDATE customers
      SET visit_count = visit_count + 1,
          total_spend = total_spend + ?,
          average_transaction_value = (total_spend + ?) / (visit_count + 1),
          last_visit_date = MAX(last_visit_date, ?),
          first_visit_date = MIN(first_visit_date, ?)
      WHERE customer_id = ?
    `);
    const insertCust = db.prepare(`
      INSERT INTO customers (customer_id, name, phone, first_visit_date, last_visit_date, visit_count, total_spend, average_transaction_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTx = db.prepare(`
      INSERT INTO transactions (transaction_id, customer_id, purchase_date, item_description, amount, quantity)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const ingestBatch = db.transaction(() => {
      for (const row of rows) {
        const phone = row.phone || '';
        const name = row.customer_name || 'Retail Customer';
        const date = row.purchase_date || new Date().toISOString().split('T')[0];
        const amount = parseFloat(row.amount) || 0;
        const item = row.item || 'Apparel Item';

        if (!phone) continue;

        const existing = findCust.get(phone) as any;
        let customerId = '';

        if (existing) {
          customerId = existing.customer_id;
          updateCust.run(amount, amount, date, date, customerId);
        } else {
          customerId = `CUST-${uuidv4().slice(0, 8).toUpperCase()}`;
          insertCust.run(customerId, name, phone, date, date, 1, amount, amount, date);
          customersInserted++;
        }

        const txId = `TX-${uuidv4().slice(0, 8).toUpperCase()}`;
        insertTx.run(txId, customerId, date, item, amount, 1);
        transactionsInserted++;
      }
    });

    ingestBatch();

    res.json({
      success: true,
      customersInserted,
      transactionsInserted
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Finalize Ingestion & Log Activity
app.post('/api/ingest/finish', (req, res) => {
  try {
    const summary = req.body;
    logActivity(
      'dataset_imported',
      'Retail Staff',
      `Imported spreadsheet dataset: ${summary.rows_processed?.toLocaleString() || 0} rows processed, ${summary.customers_created?.toLocaleString() || 0} customers created/updated in ${((summary.duration_ms || 0) / 1000).toFixed(1)}s.`,
      summary
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`📡 Retail Platform Express API server running at http://0.0.0.0:${PORT}`);
});
