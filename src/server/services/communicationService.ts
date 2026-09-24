import { db } from '../db.js';
import { Message, MessageCategory, StructuredSegmentSpec } from '../../shared/types.js';
import { logActivity } from './activityService.js';
import { executeSegmentQuery } from './segmentationEngine.js';
import { generateCustomerDraftMessage } from './aiService.js';
import { v4 as uuidv4 } from 'uuid';

export function createMessageDraft(
  customerId: string | null,
  category: MessageCategory,
  templateName: string,
  body: string,
  variables: Record<string, string>
): Message {
  const msgId = `MSG-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO messages (id, customer_id, category, template_name, body, variables, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(msgId, customerId, category, templateName, body, JSON.stringify(variables), 'draft', now);

  logActivity(
    'message_generated',
    'Retail Staff',
    `Created ${category.toUpperCase()} WhatsApp draft for ${variables.customer_name || 'Customer'}.`,
    { message_id: msgId, customer_id: customerId, category }
  );

  return {
    id: msgId,
    customer_id: customerId,
    category,
    template_name: templateName,
    body,
    variables,
    status: 'draft',
    created_at: now
  };
}

export function sendMockWhatsAppMessage(messageId: string): { message: Message; mock_delivery_meta: any } {
  const row = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId) as any;
  if (!row) {
    throw new Error(`Message with ID ${messageId} not found`);
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE messages SET status = ? WHERE id = ?`).run('sent_mock', messageId);

  const variables = JSON.parse(row.variables || '{}');

  const mockMeta = {
    provider: 'WhatsApp Business API (MOCK SANDBOX)',
    simulated_message_id: `wamid.HBgL${Math.random().toString(36).slice(2, 12)}`,
    recipient_phone: variables.phone || '+91 98765 43210',
    delivery_status: 'DELIVERED (SIMULATED)',
    delivered_at: now,
    read_receipt: true
  };

  logActivity(
    'mock_whatsapp_sent',
    'Retail Staff',
    `[MOCK SEND] WhatsApp message sent to ${variables.customer_name || 'Customer'} (${mockMeta.recipient_phone}).`,
    mockMeta
  );

  return {
    message: {
      ...row,
      variables,
      status: 'sent_mock'
    },
    mock_delivery_meta: mockMeta
  };
}

export function createCampaignAndMockSend(
  campaignName: string,
  spec: StructuredSegmentSpec,
  category: MessageCategory,
  templateName: string,
  customBodyTemplate?: string,
  excludedCustomerIds: string[] = [],
  targetCategory?: string
) {
  // Execute segment query to fetch total recipient count and sample records
  // For bulk mock send, query matching recipients efficiently
  const segmentResult = executeSegmentQuery(spec, 1, 1000); // up to 1000 for mock payload or all matching count
  let recipients = segmentResult.customers;

  if (excludedCustomerIds.length > 0) {
    const exSet = new Set(excludedCustomerIds);
    recipients = recipients.filter((c) => !exSet.has(c.customer_id));
  }

  const totalMatching = segmentResult.matching_count;
  const selectedCount = Math.max(0, totalMatching - excludedCustomerIds.length);

  const campaignId = `CAMP-${uuidv4().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  // Create message drafts for top recipients in batch
  const insertStmt = db.prepare(`
    INSERT INTO messages (id, customer_id, category, template_name, body, variables, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const createdMessages: Message[] = [];
  const runBatch = db.transaction(() => {
    for (const cust of recipients.slice(0, 50)) {
      // sample up to 50 actual message records in DB for prototype efficiency
      const draft = generateCustomerDraftMessage(cust, category, 'JK Readymade Center', targetCategory);
      let bodyText = draft.body;

      if (customBodyTemplate && customBodyTemplate.trim()) {
        bodyText = customBodyTemplate
          .replace(/\{\{customer_name\}\}/g, cust.name)
          .replace(/\{\{shop_name\}\}/g, 'JK Readymade Center')
          .replace(/\{\{preferred_category\}\}/g, draft.variables.preferred_category || 'Apparel')
          .replace(/\{\{recent_category\}\}/g, draft.variables.recent_category || 'Apparel')
          .replace(/\{\{last_visit_date\}\}/g, cust.last_visit_date || 'recently')
          .replace(/\{\{total_spend\}\}/g, `₹${cust.total_spend.toLocaleString()}`);
      }

      const msgId = `MSG-${uuidv4().slice(0, 8)}`;
      const vars = { ...draft.variables, phone: cust.phone };

      insertStmt.run(msgId, cust.customer_id, category, templateName, bodyText, JSON.stringify(vars), 'sent_mock', now);

      createdMessages.push({
        id: msgId,
        customer_id: cust.customer_id,
        category,
        template_name: templateName,
        body: bodyText,
        variables: vars,
        status: 'sent_mock',
        created_at: now
      });
    }
  });

  runBatch();

  const criteriaSummary = spec.conditions
    .map((c) => `${c.field.replace('_', ' ')} ${c.operator} ${c.value}`)
    .join(` ${spec.logic} `) || 'All Customers';

  // Log activity event
  logActivity(
    'mock_campaign_sent',
    'Retail Staff',
    `[MOCK CAMPAIGN SENT] Launched campaign "${campaignName}" targeting ${selectedCount.toLocaleString()} recipients (${criteriaSummary}).`,
    {
      campaign_id: campaignId,
      campaign_name: campaignName,
      audience_criteria: criteriaSummary,
      matching_count: totalMatching,
      selected_count: selectedCount,
      category,
      template_name: templateName
    }
  );

  return {
    success: true,
    campaign_id: campaignId,
    campaign_name: campaignName,
    audience_criteria_text: criteriaSummary,
    matching_count: totalMatching,
    selected_count: selectedCount,
    category,
    sample_messages: createdMessages.slice(0, 5)
  };
}

export function getCustomerMessages(customerId: string): Message[] {
  const rows = db.prepare(`SELECT * FROM messages WHERE customer_id = ? ORDER BY created_at DESC`).all(customerId) as any[];
  return rows.map((r) => ({
    ...r,
    variables: JSON.parse(r.variables || '{}')
  }));
}
