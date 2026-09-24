````markdown
# Retail Customer Engagement Platform

A customer intelligence and engagement platform designed for B2C retail businesses.

The system transforms offline retail transaction data from Excel/CSV files into a structured customer database and provides tools for customer analytics, segmentation, audience creation, activity tracking, and targeted communication.

## Problem

Small and mid-sized retail businesses often have valuable customer information stored in Excel/CSV files, but lack a unified system for understanding customer behaviour and engaging with customers effectively.

This project was designed to provide a centralized customer intelligence and engagement layer over existing retail data.

## Product Overview

```text
Excel / CSV Data
       │
       ▼
Data Ingestion
       │
       ▼
SQLite Customer Database
       │
       ├──────────────► Customer Analytics
       │
       ├──────────────► Customer Segmentation
       │
       ├──────────────► Audience Builder
       │
       ├──────────────► Activity Tracking
       │
       └──────────────► WhatsApp Communication
                             
                    AI Assistant
                         │
                         ▼
                Natural Language Queries
                         │
                         ▼
                Validated Query Specification
                         │
                         ▼
                  Safe SQL Query Builder
                         │
                         ▼
                    SQLite Database
                         │
                         ▼
                  Grounded Response
````

## Key Features

### 1. Data Ingestion

* Import customer and transaction data from Excel/CSV files
* Process large datasets using chunked ingestion
* Validate and normalize incoming records
* Store structured data in SQLite

### 2. Customer Intelligence

* Customer profiles
* Purchase history
* Spending analysis
* Customer activity tracking
* Transaction-level data analysis

### 3. Customer Segmentation

Create targeted customer audiences based on business criteria such as:

* Purchase behaviour
* Spending
* Recency
* Customer activity
* Product/category preferences

### 4. Audience Builder

Build customer audiences using configurable business rules and preview the resulting customer segments before communication.

### 5. WhatsApp Communication

The platform provides a workflow for preparing targeted customer communication based on customer segments and business requirements.

### 6. AI Assistant

The AI assistant allows users to ask questions about customer data using natural language.

Example:

> "Show me customers who spent more than ₹10,000 in the last 90 days."

Instead of allowing the LLM to execute arbitrary SQL directly, the system uses a structured query workflow:

```text
User Question
      ↓
LLM Query Specification
      ↓
Zod Validation
      ↓
Safe SQL Query Builder
      ↓
SQLite Execution
      ↓
Compact Query Result
      ↓
Grounded AI Response
```

This creates a separation between AI-assisted reasoning and deterministic database operations.

## Architecture

The application is divided into three major layers:

### Frontend

A React + TypeScript interface responsible for:

* Dashboard
* Customer management
* Audience building
* Analytics
* Activity logs
* AI assistant
* Communication workflows

### Backend

A Node.js + Express backend responsible for:

* Database operations
* Customer services
* Analytics
* Segmentation
* Communication workflows
* AI integration
* Query validation

### Database

SQLite is used for structured local data storage.

Core data domains include:

* Customers
* Transactions
* Messages
* Activities

## Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Table
* Recharts
* Lucide React

### Backend

* Node.js
* Express
* TypeScript
* SQLite
* better-sqlite3
* Zod

### Data Processing

* Excel/CSV ingestion
* PapaParse
* XLSX
* Chunked data processing

### AI

* LLM-based natural language querying
* Structured query specifications
* Zod validation
* Safe SQL query generation
* Grounded response synthesis

## Project Structure

```text
retail-customer-engagement-platform/
│
├── ARCHITECTURE.md
├── data/
│   └── retail_store.db
│
├── public/
│   └── logo.jpg
│
├── src/
│   ├── client/
│   │   ├── components/
│   │   ├── workers/
│   │   ├── index.css
│   │   └── main.tsx
│   │
│   ├── server/
│   │   ├── services/
│   │   ├── db.ts
│   │   ├── seed.ts
│   │   └── server.ts
│   │
│   └── shared/
│       └── types.ts
│
├── index.html
├── package.json
├── package-lock.json
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.server.json
└── vite.config.ts
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/TrishaBhadra/retail-customer-engagement-platform.git
cd retail-customer-engagement-platform
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development environment

```bash
npm run dev
```

The application will be available through the local Vite development server.

## Development

Available scripts:

```bash
npm run dev
npm run dev:client
npm run dev:server
npm run build
npm run seed
```

## Design Principles

### Separation of AI and Deterministic Logic

AI is used for interpreting natural-language requests, while database access and business-critical operations remain deterministic.

### Structured Data Access

The AI assistant operates through a controlled query schema rather than receiving unrestricted database access.

### Scalable Data Ingestion

Large Excel/CSV files are processed in chunks to reduce memory usage during ingestion.

### Modular Architecture

Business capabilities such as analytics, segmentation, communication, and querying are separated into dedicated services.

## Current Status

**Prototype / Portfolio Project**

The current implementation focuses on demonstrating the product workflow, system architecture, customer intelligence features, and AI-assisted data querying.

Future production work would include authentication, deployment infrastructure, production WhatsApp integration, monitoring, security hardening, and expanded automated testing.

## My Role

I designed the product concept, user workflows, feature requirements, system structure, and overall architecture.

Development was performed using AI-assisted coding, with the implementation reviewed and structured around the product and architectural requirements.

## Future Improvements

* Production WhatsApp Business API integration
* Role-based authentication and authorization
* Cloud database infrastructure
* Campaign analytics
* Automated customer journeys
* Customer lifetime value analysis
* Advanced retention and churn analytics
* Production monitoring and logging
* Expanded automated testing
* Cloud deployment

```
```
