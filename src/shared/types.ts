export interface CategoryPreference {
  category: string;
  label: string;
  purchase_count: number;
  total_spend: number;
  last_purchase_date: string | null;
}

export interface Customer {
  customer_id: string;
  name: string;
  phone: string;
  first_visit_date: string | null;
  last_visit_date: string | null;
  visit_count: number;
  total_spend: number;
  average_transaction_value: number;
  created_at: string;
  buying_preferences?: CategoryPreference[];
  max_monthly_spend?: number;
}

export interface Transaction {
  transaction_id: string;
  customer_id: string;
  purchase_date: string;
  item_description: string | null;
  amount: number;
  quantity: number | null;
}

export type MessageCategory = 'marketing' | 'utility' | 'service';
export type MessageStatus = 'draft' | 'approved' | 'queued' | 'sent_mock' | 'failed_mock';

export interface Message {
  id: string;
  customer_id: string | null;
  category: MessageCategory;
  template_name: string;
  body: string;
  variables: Record<string, string>;
  status: MessageStatus;
  created_at: string;
}

export interface Activity {
  id: string;
  timestamp: string;
  type:
    | 'dataset_uploaded'
    | 'dataset_imported'
    | 'customer_searched'
    | 'customer_viewed'
    | 'ai_question_asked'
    | 'query_executed'
    | 'message_generated'
    | 'message_copied'
    | 'mock_whatsapp_sent'
    | 'audience_created'
    | 'audience_filtered'
    | 'campaign_created'
    | 'mock_campaign_sent';
  actor: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsSummary {
  total_customers: number;
  total_transactions: number;
  total_sales: number;
  repeat_visit_rate: number; // percentage (e.g. 54.2)
  average_customer_spend: number;
  average_transaction_value: number;
  active_last_30_days: number;
  inactive_6_months: number;
  sales_by_month: Array<{ month: string; sales: number; transactions: number }>;
  spend_distribution: Array<{ range: string; customer_count: number }>;
  top_categories: Array<{ item: string; total_amount: number; count: number }>;
  dataset_metadata: {
    last_updated: string;
    total_records: number;
  };
}

export type QueryOperation = 'count' | 'list' | 'aggregate' | 'customer_lookup' | 'segment';
export type QueryMetric = 'customers' | 'visits' | 'spend' | 'average_spend' | 'repeat_rate' | 'transactions';
export type QueryOperator = 'equals' | 'contains' | 'before' | 'after' | 'between' | 'greater_than' | 'less_than' | 'within_last_days' | 'in_category';
export type QueryField = 'customer_id' | 'name' | 'phone' | 'last_visit_date' | 'first_visit_date' | 'visit_count' | 'total_spend' | 'monthly_spend' | 'purchase_date' | 'amount' | 'item_description' | 'purchase_category';

export interface QueryFilter {
  field: QueryField;
  operator: QueryOperator;
  value: string | number;
  second_value?: string | number;
}

export interface StructuredQuerySpec {
  operation: QueryOperation;
  metric: QueryMetric;
  filters?: QueryFilter[];
  group_by?: 'none' | 'customer' | 'month' | 'date';
  sort?: 'ascending' | 'descending';
  limit?: number;
}

export type SegmentLogic = 'AND' | 'OR' | 'NOT';
export type SegmentField = 'monthly_spend' | 'lifetime_spend' | 'visit_count' | 'last_visit_date' | 'purchase_category' | 'purchase_date';
export type SegmentOperator = 'greater_than' | 'less_than' | 'equals' | 'before' | 'after' | 'within_last_days' | 'contains' | 'between' | 'in_category';

export interface StructuredSegmentCondition {
  id?: string;
  field: SegmentField;
  operator: SegmentOperator;
  value: string | number;
  second_value?: string | number;
}

export interface StructuredSegmentSpec {
  logic: SegmentLogic;
  conditions: StructuredSegmentCondition[];
}

export interface SegmentQueryResult {
  spec: StructuredSegmentSpec;
  matching_count: number;
  customers: Customer[];
  page: number;
  limit: number;
  total_pages: number;
  sql_executed: string;
  execution_time_ms: number;
}

export interface CampaignSummary {
  campaign_name: string;
  audience_criteria_text: string;
  matching_count: number;
  selected_count: number;
  category: MessageCategory;
  template_name: string;
  message_preview: string;
  target_category?: string;
}

export interface QueryResult {
  spec: StructuredQuerySpec;
  sql_executed: string;
  summary: string;
  data: any[];
  count?: number;
  aggregate_value?: number;
  execution_time_ms: number;
}

export interface AiResponse {
  answer: string;
  structured_query?: StructuredQuerySpec;
  structured_segment?: StructuredSegmentSpec;
  query_result?: QueryResult;
  segment_result?: SegmentQueryResult;
  suggested_followups?: string[];
}

export interface IngestionColumnMapping {
  customer_name: string;
  phone: string;
  purchase_date: string;
  amount: string;
  item: string;
  last_visit_date?: string;
}

export interface IngestionSummary {
  rows_detected: number;
  rows_processed: number;
  customers_created: number;
  customers_updated: number;
  transactions_created: number;
  duplicates_detected: number;
  warnings: string[];
  rejected_rows: number;
  duration_ms: number;
}

export interface RawImportRow {
  [key: string]: any;
}

