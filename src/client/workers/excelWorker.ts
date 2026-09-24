import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface WorkerMessageInput {
  action: 'PARSE_FILE';
  file: File;
  columnMapping?: Record<string, string>;
}

export interface WorkerProgressOutput {
  type: 'PROGRESS' | 'COLUMNS_DETECTED' | 'CHUNK_PROCESSED' | 'COMPLETE' | 'ERROR';
  parsedRows?: number;
  totalRows?: number;
  columns?: string[];
  suggestedMapping?: Record<string, string>;
  chunk?: any[];
  summary?: any;
  error?: string;
}

const DEFAULT_ALIASES: Record<string, string[]> = {
  customer_name: ['customer name', 'name', 'customer', 'client name', 'shopper', 'buyer'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact', 'cell', 'phone_no'],
  purchase_date: ['purchase date', 'date', 'bill date', 'transaction date', 'invoice date'],
  amount: ['amount', 'purchase amount', 'total', 'bill amount', 'sales', 'value', 'price'],
  item: ['item', 'items', 'product', 'product name', 'description', 'garment']
};

function autoDetectColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {
    customer_name: '',
    phone: '',
    purchase_date: '',
    amount: '',
    item: ''
  };

  const headersLower = headers.map(h => h.trim().toLowerCase());

  for (const [targetKey, aliases] of Object.entries(DEFAULT_ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      const cleanH = headersLower[i];
      if (aliases.some(alias => cleanH === alias || cleanH.includes(alias))) {
        mapping[targetKey] = headers[i];
        break;
      }
    }
  }

  // Fallbacks if not auto-matched
  if (!mapping.customer_name && headers[0]) mapping.customer_name = headers[0];
  if (!mapping.phone && headers[1]) mapping.phone = headers[1];
  if (!mapping.amount && headers[2]) mapping.amount = headers[2];

  return mapping;
}

self.onmessage = async (e: MessageEvent<WorkerMessageInput>) => {
  const { action, file, columnMapping } = e.data;

  if (action === 'PARSE_FILE') {
    try {
      const fileName = file.name.toLowerCase();
      let allRows: any[] = [];
      let headers: string[] = [];

      if (fileName.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            allRows = results.data;
            headers = results.meta.fields || [];
            processParsedData(allRows, headers, columnMapping);
          },
          error: (err: any) => {
            self.postMessage({ type: 'ERROR', error: err.message });
          }
        });
      } else {
        // XLSX or XLS
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        allRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (allRows.length > 0) {
          headers = Object.keys(allRows[0]);
        }
        processParsedData(allRows, headers, columnMapping);
      }
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', error: err.message || 'Failed to parse file' });
    }
  }
};

function processParsedData(rawRows: any[], headers: string[], userMapping?: Record<string, string>) {
  const mapping = userMapping || autoDetectColumns(headers);

  self.postMessage({
    type: 'COLUMNS_DETECTED',
    columns: headers,
    suggestedMapping: mapping
  } as WorkerProgressOutput);

  const totalRows = rawRows.length;
  const chunkSize = 2500;
  let parsedCount = 0;
  const normalizedRows: any[] = [];
  const warnings: string[] = [];
  let duplicates = 0;
  let rejected = 0;

  const phoneSeen = new Set<string>();

  for (let i = 0; i < totalRows; i += chunkSize) {
    const rawChunk = rawRows.slice(i, i + chunkSize);

    for (const r of rawChunk) {
      const rawName = String(r[mapping.customer_name] || '').trim();
      const rawPhone = String(r[mapping.phone] || '').trim();
      const rawDate = r[mapping.purchase_date];
      const rawAmount = r[mapping.amount];
      const rawItem = String(r[mapping.item] || 'Apparel Purchase').trim();

      // Normalize phone (+91 formatting)
      const digits = rawPhone.replace(/\D/g, '');
      let cleanPhone = digits;
      if (digits.length === 10) {
        cleanPhone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
      } else if (digits.length === 12 && digits.startsWith('91')) {
        cleanPhone = `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
      } else if (digits.length > 6) {
        cleanPhone = `+91 ${digits.slice(-10, -5)} ${digits.slice(-5)}`;
      }

      if (!cleanPhone || cleanPhone.length < 8) {
        rejected++;
        warnings.push(`Row ${parsedCount + 1}: Missing or invalid phone number "${rawPhone}".`);
        continue;
      }

      if (phoneSeen.has(cleanPhone)) {
        duplicates++;
      }
      phoneSeen.add(cleanPhone);

      // Normalize date
      let cleanDate = new Date().toISOString().split('T')[0];
      if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
        cleanDate = rawDate.toISOString().split('T')[0];
      } else if (typeof rawDate === 'string' && rawDate.trim()) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          cleanDate = d.toISOString().split('T')[0];
        }
      }

      // Normalize amount
      const cleanAmount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, '')) || 0;

      normalizedRows.push({
        customer_name: rawName || 'Retail Customer',
        phone: cleanPhone,
        purchase_date: cleanDate,
        amount: cleanAmount,
        item: rawItem
      });

      parsedCount++;
    }

    // Send chunk batch to main UI thread
    self.postMessage({
      type: 'CHUNK_PROCESSED',
      chunk: normalizedRows.slice(i, i + chunkSize),
      parsedRows: parsedCount,
      totalRows
    } as WorkerProgressOutput);
  }

  self.postMessage({
    type: 'COMPLETE',
    summary: {
      rows_detected: totalRows,
      rows_processed: parsedCount,
      customers_created: phoneSeen.size,
      transactions_created: normalizedRows.length,
      duplicates_detected: duplicates,
      rejected_rows: rejected,
      warnings: warnings.slice(0, 10)
    }
  } as WorkerProgressOutput);
}
