# System Architecture & Design Specification

## Overview
This platform acts as an operational intelligence and customer engagement layer built over offline Excel/CSV billing data for B2C clothing retail. The core goal is to enable shop owners and retail staff to analyze, query, segment, and communicate with ~50,000 customers without forcing a migration away from Excel.

---

## Architectural Principles & Hard Boundaries

### 1. Deterministic vs AI Boundary
- **Deterministic Engine (SQLite + Node.js)**: Handles data parsing, chunked ingestion, phone/date/spend normalization, indexed searching, pagination, aggregation math (spend, repeat rates, counts), message template substitution, and activity logging.
- **AI Layer (LLM Interface)**: Used *strictly* for natural language intent translation into structured function specifications (`query_customer_data`), grounded answer synthesis, and tone-tailored customer message drafting.
- **Strict Rule**: The LLM NEVER receives raw customer rows, NEVER executes unvalidated SQL, and NEVER estimates/invents database stats.

### 2. High-Volume Ingestion Architecture
- **Web Worker**: Excel (`.xlsx`) and `.csv` files up to 60,000 rows are parsed off the main UI thread in chunked batches (5,000 rows/chunk).
- **Zero UI Freeze**: Main thread receives real-time progress updates (`parsedRows`, `mergedCustomers`, `insertedTransactions`) maintaining 60fps UI responsiveness.

### 3. Safety Pipeline for AI Function Calling
```
User NL Question
      │
      ▼
LLM Schema Spec ──► Zod Validator ──► Safe SQL Query Builder ──► SQLite Execution (<50ms)
                                                                       │
                                                                       ▼
User Display ◄── Grounded Answer Synthesizer ◄── Compact Query Payload (JSON, max 50 rows)
```

---

## Database Schemas & Indexes

### Tables & Indexes
- `customers`: `customer_id` (PK), `name`, `phone` (INDEX), `first_visit_date`, `last_visit_date` (INDEX), `visit_count`, `total_spend` (INDEX), `average_transaction_value`, `created_at`
- `transactions`: `transaction_id` (PK), `customer_id` (INDEX), `purchase_date` (INDEX), `item_description`, `amount`, `quantity`
- `messages`: `id` (PK), `customer_id`, `category` (`marketing`|`utility`|`service`), `template_name`, `body`, `variables` (JSON), `status`, `created_at`
- `activity`: `id` (PK), `timestamp`, `type`, `actor`, `description`, `metadata` (JSON)

---

## AI Function Calling Tool Schema (`query_customer_data`)

```json
{
  "name": "query_customer_data",
  "description": "Execute structured queries for customer search, counts, aggregates, and segmentation.",
  "parameters": {
    "type": "object",
    "properties": {
      "operation": { "type": "string", "enum": ["count", "list", "aggregate", "customer_lookup", "segment"] },
      "metric": { "type": "string", "enum": ["customers", "visits", "spend", "average_spend", "repeat_rate", "transactions"] },
      "filters": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "field": { "type": "string", "enum": ["customer_id", "name", "phone", "last_visit_date", "first_visit_date", "visit_count", "total_spend", "purchase_date", "amount"] },
            "operator": { "type": "string", "enum": ["equals", "contains", "before", "after", "between", "greater_than", "less_than"] },
            "value": { "type": "string" }
          },
          "required": ["field", "operator", "value"]
        }
      },
      "group_by": { "type": "string", "enum": ["none", "customer", "month", "date"] },
      "sort": { "type": "string", "enum": ["ascending", "descending"] },
      "limit": { "type": "number", "default": 50 }
    },
    "required": ["operation", "metric"]
  }
}
```
