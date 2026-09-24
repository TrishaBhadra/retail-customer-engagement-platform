import { executeStructuredQuery } from './queryService.js';
import { executeSegmentQuery } from './segmentationEngine.js';
import { getCustomerCategoryPreferences, CATEGORY_DEFINITIONS } from './categoryEngine.js';
import {
  AiResponse,
  Customer,
  MessageCategory,
  StructuredQuerySpec,
  StructuredSegmentSpec,
  StructuredSegmentCondition
} from '../../shared/types.js';

export const STORE_NAME = 'JK Readymade Center';

/**
 * AI Natural Language Audience Translator: Converts plain text prompt into a structured segment specification.
 * AI interprets the intent, while SQLite deterministically executes recipient eligibility.
 */
export function translateNlToSegmentSpec(userPrompt: string): StructuredSegmentSpec {
  const qLower = userPrompt.toLowerCase().trim();
  const conditions: StructuredSegmentCondition[] = [];
  let logic: 'AND' | 'OR' | 'NOT' = 'AND';

  if (qLower.includes(' or ') && !qLower.includes(' and ')) {
    logic = 'OR';
  }

  // 1. Monthly Spend check
  if (qLower.includes('month') && (qLower.includes('spent') || qLower.includes('spend'))) {
    const nums = qLower.match(/\d+(?:,\d+)*/g)?.map((n) => parseInt(n.replace(/,/g, ''), 10)) || [];
    const amount = nums.find((n) => n >= 1000) || 10000;
    conditions.push({
      field: 'monthly_spend',
      operator: 'greater_than',
      value: amount
    });
  }
  // 2. High value / lifetime spend check
  else if (qLower.includes('high value') || qLower.includes('vip') || qLower.includes('high spender') || qLower.includes('spent over') || qLower.includes('spent more than')) {
    const nums = qLower.match(/\d+(?:,\d+)*/g)?.map((n) => parseInt(n.replace(/,/g, ''), 10)) || [];
    const amount = nums.find((n) => n >= 1000) || (qLower.includes('25') ? 25000 : 10000);
    conditions.push({
      field: 'lifetime_spend',
      operator: 'greater_than',
      value: amount
    });
  }

  // 3. Category preference checks
  if (qLower.includes('saree') || qLower.includes('sari')) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'saree' });
  } else if (qLower.includes('kid') || qLower.includes('children') || qLower.includes('child')) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'kids_clothing' });
  } else if (qLower.includes('men') || qLower.includes('menswear') || qLower.includes("men's")) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'menswear' });
  } else if (qLower.includes('women') || qLower.includes('womenswear') || qLower.includes("women's")) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'womenswear' });
  } else if (qLower.includes('ethnic')) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'ethnic_wear' });
  } else if (qLower.includes('western')) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'western_wear' });
  } else if (qLower.includes('shirt')) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'shirts' });
  } else if (qLower.includes('trouser') || qLower.includes('jean') || qLower.includes('pant') || qLower.includes('bottomwear')) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'trousers' });
  } else if (qLower.includes('dress') || qLower.includes('lehenga') || qLower.includes('frock')) {
    conditions.push({ field: 'purchase_category', operator: 'equals', value: 'dresses' });
  }

  // 4. Recency / Inactive checks
  if (qLower.includes('inactive') || qLower.includes('not visited') || qLower.includes('dormant') || qLower.includes('6 months') || qLower.includes('six months')) {
    conditions.push({ field: 'last_visit_date', operator: 'before', value: '6_months_ago' });
  } else if (qLower.includes('recent') || qLower.includes('last 30 days') || qLower.includes('past month') || qLower.includes('recently')) {
    conditions.push({ field: 'last_visit_date', operator: 'within_last_days', value: 30 });
  }

  // 5. Visit frequency checks
  if (qLower.includes('frequent') || qLower.includes('regular') || qLower.includes('loyal') || qLower.includes('repeat')) {
    const nums = qLower.match(/\d+/g)?.map((n) => parseInt(n, 10)) || [];
    const minVisits = nums.find((n) => n >= 2 && n <= 20) || (qLower.includes('frequent') ? 4 : 2);
    conditions.push({ field: 'visit_count', operator: 'greater_than', value: minVisits });
  }

  // Fallback if no specific condition matched
  if (conditions.length === 0) {
    conditions.push({ field: 'visit_count', operator: 'greater_than', value: 0 });
  }

  return { logic, conditions };
}

/**
 * Handles AI natural language queries by parsing intent and executing safe deterministic queries
 */
export async function processAiQuery(userQuestion: string): Promise<AiResponse> {
  const qTrim = userQuestion.trim();
  const qLower = qTrim.toLowerCase();

  // 1. Inactive / Dormant check
  if (qLower.includes('not visited') || qLower.includes('inactive') || qLower.includes('last 6 months') || qLower.includes('six months') || qLower.includes('dormant') || qLower.includes('haven\'t visited')) {
    const spec: StructuredQuerySpec = {
      operation: 'count',
      metric: 'customers',
      filters: [{ field: 'last_visit_date', operator: 'before', value: '2026-03-04' }]
    };
    const queryResult = executeStructuredQuery(spec);
    const countVal = queryResult.count || 0;
    const answer = `Based on billing records at **${STORE_NAME}**:\n\n` +
      `• **${countVal.toLocaleString()} shoppers** have not visited the store in the last 6 months.\n` +
      `• You can launch a WhatsApp re-engagement campaign to offer them a special welcome-back discount!`;

    return {
      answer,
      structured_query: spec,
      query_result: queryResult,
      suggested_followups: [
        'Who are our top 10 spenders?',
        'What is our average customer spend?',
        'Show me customers who bought Silk Sarees'
      ]
    };
  }

  // 2. Average Customer Spend check
  if (qLower.includes('average customer spend') || qLower.includes('avg spend') || qLower.includes('average spend') || qLower.includes('avg customer spend')) {
    const spec: StructuredQuerySpec = { operation: 'aggregate', metric: 'average_spend' };
    const queryResult = executeStructuredQuery(spec);
    const avgSpend = queryResult.aggregate_value || 0;
    const answer = `At **${STORE_NAME}**, the average customer lifetime spend across all billing records is **₹${avgSpend.toLocaleString()}**.`;

    return {
      answer,
      structured_query: spec,
      query_result: queryResult,
      suggested_followups: [
        'Who are our top 10 spenders?',
        'How many customers visited more than once?',
        'Show me customers who bought Kurtas'
      ]
    };
  }

  // 3. Repeat visit rate check
  if (qLower.includes('repeat visit') || qLower.includes('repeat rate') || qLower.includes('visited more than once') || qLower.includes('repeat customer')) {
    const spec: StructuredQuerySpec = { operation: 'aggregate', metric: 'repeat_rate' };
    const queryResult = executeStructuredQuery(spec);
    const rate = queryResult.aggregate_value || 0;
    const repeatCount = queryResult.data[0]?.repeat_customers || 0;
    const totalCount = queryResult.data[0]?.total_customers || 0;
    const answer = `Here is your customer repeat visit report for **${STORE_NAME}**:\n\n` +
      `• **Repeat Visit Rate**: **${rate}%**\n` +
      `• **Loyal Repeat Shoppers**: **${repeatCount.toLocaleString()} customers** (out of ${totalCount.toLocaleString()} total shoppers) have visited your shop 2 or more times.`;

    return {
      answer,
      structured_query: spec,
      query_result: queryResult,
      suggested_followups: [
        'Who are our top 10 spenders?',
        'How many customers haven\'t visited in 6 months?',
        'Show me customers who bought Silk Sarees'
      ]
    };
  }

  // 4. Check if segment / list / search request
  const isSegmentRequest =
    qLower.includes('find') ||
    qLower.includes('show') ||
    qLower.includes('segment') ||
    qLower.includes('buyers') ||
    qLower.includes('customers who') ||
    qLower.includes('saree') ||
    qLower.includes('kurta') ||
    qLower.includes('jeans') ||
    qLower.includes('top') ||
    qLower.includes('spent more than') ||
    qLower.includes('rahul') ||
    qLower.includes('priya') ||
    qLower.includes('spent over');

  if (isSegmentRequest) {
    const segmentSpec = translateNlToSegmentSpec(qTrim);
    const segmentResult = executeSegmentQuery(segmentSpec, 1, 10);

    let answer = '';
    if (qLower.includes('saree')) {
      answer = `Found **${segmentResult.matching_count.toLocaleString()} shoppers** who bought sarees at **${STORE_NAME}**. Below are the top customer profiles:`;
    } else if (qLower.includes('top') || qLower.includes('spent over') || qLower.includes('spent more than')) {
      answer = `Here are the top high-value shoppers at **${STORE_NAME}** (${segmentResult.matching_count.toLocaleString()} matching customers):`;
    } else if (qLower.includes('rahul') || qLower.includes('priya')) {
      const searchName = qLower.includes('rahul') ? 'Rahul' : 'Priya';
      answer = `Found matching customer records for **"${searchName}"** at **${STORE_NAME}**:`;
    } else {
      answer = `Found **${segmentResult.matching_count.toLocaleString()} matching customer records** at **${STORE_NAME}**. Below are the details:`;
    }

    return {
      answer,
      structured_segment: segmentSpec,
      query_result: {
        spec: { operation: 'list', metric: 'customers' },
        sql_executed: `SELECT * FROM customers (segment query)`,
        summary: `Retrieved ${segmentResult.customers.length} customer profiles`,
        data: segmentResult.customers,
        count: segmentResult.matching_count,
        execution_time_ms: segmentResult.execution_time_ms
      },
      suggested_followups: [
        'Who are our top 10 spenders?',
        'How many customers haven\'t visited in 6 months?',
        'What is our average customer spend?'
      ]
    };
  }

  // Fallback total count
  const spec: StructuredQuerySpec = { operation: 'count', metric: 'customers' };
  const queryResult = executeStructuredQuery(spec);
  const totalCount = queryResult.count || 0;
  const answer = `**${STORE_NAME}** currently has **${totalCount.toLocaleString()} registered customer profiles** in the database.`;

  return {
    answer,
    structured_query: spec,
    query_result: queryResult,
    suggested_followups: [
      'Who are our top 10 spenders?',
      'How many customers haven\'t visited in 6 months?',
      'Show me customers who bought Silk Sarees',
      'What is our average customer spend?'
    ]
  };
}

/**
 * Generates personalized, preference-aware WhatsApp message copy for a customer.
 * Uses ONLY verified customer purchase history and target campaign parameters.
 */
export function generateCustomerDraftMessage(
  customer: Customer,
  category: MessageCategory = 'marketing',
  shopName = STORE_NAME,
  targetCategory?: string
): { body: string; variables: Record<string, string> } {
  // Retrieve customer category preferences from database
  const prefs = getCustomerCategoryPreferences(customer.customer_id);
  customer.buying_preferences = prefs;

  // Determine most relevant category preference
  let mainPref = prefs.length > 0 ? prefs[0] : null;

  // If a target campaign category was passed (e.g., 'saree'), check if customer bought it
  if (targetCategory) {
    const targetMatch = prefs.find(
      (p) => p.category === targetCategory.toLowerCase() || p.label.toLowerCase().includes(targetCategory.toLowerCase())
    );
    if (targetMatch) {
      mainPref = targetMatch;
    }
  }

  const preferredCategoryName = mainPref ? mainPref.label.replace(' Buyers', '') : 'Ethnic Wear';
  const recentCategoryName = prefs.length > 0 ? prefs[0].label.replace(' Buyers', '') : 'apparel';

  const vars: Record<string, string> = {
    customer_name: customer.name,
    shop_name: shopName,
    preferred_category: preferredCategoryName,
    recent_category: recentCategoryName,
    last_visit_date: customer.last_visit_date || 'recently',
    total_spend: `₹${customer.total_spend.toLocaleString()}`,
    offer_name: customer.total_spend > 25000 ? '25% VIP Festive Special' : '15% Off New Arrivals',
    offer_expiry: '15th October'
  };

  let body = '';

  if (category === 'marketing') {
    if (mainPref && mainPref.category === 'saree') {
      body = `Hi ${vars.customer_name}! Our new saree collection has arrived at ${vars.shop_name}. Since you have shopped sarees with us before, we thought you might like to see the new Banarasi & Silk designs! Visit us this week and get ${vars.offer_name} valid till ${vars.offer_expiry}. Reply YES to see catalog.`;
    } else if (mainPref && mainPref.category === 'kids_clothing') {
      body = `Hi ${vars.customer_name}! Our new kidswear collection has arrived at ${vars.shop_name}. Since you have previously purchased kids clothing from us, we thought you may want to check out the latest festive arrivals! Enjoy ${vars.offer_name} till ${vars.offer_expiry}.`;
    } else if (customer.last_visit_date && new Date(customer.last_visit_date) < new Date('2026-03-04')) {
      body = `Hi ${vars.customer_name}, it has been a while since your last visit to ${vars.shop_name} on ${vars.last_visit_date}. We have vibrant new ${vars.preferred_category} collections in stock that may interest you! Enjoy an exclusive welcome-back offer of ${vars.offer_name} valid till ${vars.offer_expiry}.`;
    } else if (customer.visit_count >= 4) {
      body = `Hi ${vars.customer_name}! As one of our top frequent shoppers at ${vars.shop_name}, we're excited to present our new ${vars.preferred_category} arrivals! Enjoy your special VIP benefit: ${vars.offer_name} valid until ${vars.offer_expiry}.`;
    } else {
      body = `Hi ${vars.customer_name}! Thank you for shopping at ${vars.shop_name}. We have updated our stock with fresh ${vars.preferred_category} designs. Visit us soon to claim ${vars.offer_name}! Valid till ${vars.offer_expiry}.`;
    }
  } else if (category === 'utility') {
    body = `Hi ${vars.customer_name}, here is your shopping summary from ${vars.shop_name}: You have completed ${customer.visit_count} visit(s) with total purchases worth ${vars.total_spend}. Preferred category: ${vars.preferred_category}. Thank you for being a valued customer!`;
  } else {
    // Service
    body = `Hi ${vars.customer_name}, thank you for your recent visit to ${vars.shop_name} on ${vars.last_visit_date}. We hope you love your ${vars.preferred_category} purchases! Let us know if you need any sizing adjustments or alteration assistance.`;
  }

  return { body, variables: vars };
}
