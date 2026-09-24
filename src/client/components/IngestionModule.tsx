import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Layers,
  Clock,
  Database
} from 'lucide-react';
import { IngestionSummary } from '../../shared/types.js';

interface IngestionModuleProps {
  onIngestSuccess: () => void;
}

export default function IngestionModule({ onIngestSuccess }: IngestionModuleProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing' | 'complete'>('upload');

  // Column Mapping state
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    customer_name: '',
    phone: '',
    purchase_date: '',
    amount: '',
    item: ''
  });

  // Progress state
  const [parsedRows, setParsedRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [summary, setSummary] = useState<IngestionSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setErrorMessage(null);

    // Instantiate Web Worker to detect headers and sample columns
    const worker = new Worker(new URL('../workers/excelWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (e) => {
      const { type, columns, suggestedMapping, error } = e.data;
      if (type === 'COLUMNS_DETECTED') {
        setDetectedColumns(columns || []);
        if (suggestedMapping) {
          setColumnMapping(suggestedMapping);
        }
        setStep('mapping');
        worker.terminate();
      } else if (type === 'ERROR') {
        setErrorMessage(error || 'Failed to read file headers.');
        worker.terminate();
      }
    };

    worker.postMessage({ action: 'PARSE_FILE', file: selectedFile });
  };

  const startWorkerIngestion = () => {
    if (!file) return;
    setStep('processing');
    setErrorMessage(null);

    const startTime = performance.now();
    const worker = new Worker(new URL('../workers/excelWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = async (e) => {
      const { type, chunk, parsedRows: currentParsed, totalRows: total, summary: finalSummary, error } = e.data;

      if (type === 'PROGRESS') {
        setParsedRows(currentParsed || 0);
        setTotalRows(total || 0);
      } else if (type === 'CHUNK_PROCESSED') {
        setParsedRows(currentParsed || 0);
        setTotalRows(total || 0);

        // Send chunk batch to backend SQLite database
        if (chunk && chunk.length > 0) {
          try {
            await fetch('/api/ingest/chunk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rows: chunk })
            });
          } catch (err) {
            console.error('Failed to post ingestion chunk to SQLite:', err);
          }
        }
      } else if (type === 'COMPLETE') {
        const duration = Number((performance.now() - startTime).toFixed(0));
        const fullSummary: IngestionSummary = {
          ...finalSummary,
          duration_ms: duration
        };

        // Finalize activity event
        try {
          await fetch('/api/ingest/finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullSummary)
          });
        } catch (err) {
          console.error('Failed to finalize ingestion activity:', err);
        }

        setSummary(fullSummary);
        setStep('complete');
        worker.terminate();
      } else if (type === 'ERROR') {
        setErrorMessage(error || 'Ingestion failed.');
        setStep('mapping');
        worker.terminate();
      }
    };

    worker.postMessage({ action: 'PARSE_FILE', file, columnMapping });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-white">Bulk Excel / CSV Ingestion Engine</h2>
            <p className="text-xs text-slate-400">Stream & ingest 50,000+ customer transaction rows into SQLite in seconds</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-medium">
          <FileSpreadsheet className="w-4 h-4 text-orange-400" />
          <span>Supports .xlsx, .xls, .csv</span>
        </div>
      </div>

      {/* Step 1: Upload File */}
      {step === 'upload' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-orange-500 bg-slate-950/60 hover:bg-slate-950 p-12 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 group"
          >
            <div className="p-4 bg-orange-500/10 text-orange-400 rounded-2xl group-hover:scale-110 transition-all">
              <FileSpreadsheet className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-white text-base">
                Click or Drag & Drop Excel / CSV file
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Supports `.xlsx`, `.xls`, and `.csv` files up to 60,000 records.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center justify-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Dynamic Column Mapping */}
      {step === 'mapping' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="font-heading font-bold text-white text-base">Confirm Column Mapping</h3>
            <p className="text-xs text-slate-400">
              Map the detected columns from <strong className="text-slate-200">{file?.name}</strong> to application schema fields.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Customer Name Column</label>
              <select
                value={columnMapping.customer_name}
                onChange={(e) => setColumnMapping({ ...columnMapping, customer_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 outline-none focus:border-orange-500"
              >
                {detectedColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Phone / Mobile Column</label>
              <select
                value={columnMapping.phone}
                onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 outline-none focus:border-orange-500"
              >
                {detectedColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Purchase / Bill Date Column</label>
              <select
                value={columnMapping.purchase_date}
                onChange={(e) => setColumnMapping({ ...columnMapping, purchase_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 outline-none focus:border-orange-500"
              >
                {detectedColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Bill Amount Column (₹)</label>
              <select
                value={columnMapping.amount}
                onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 outline-none focus:border-orange-500"
              >
                {detectedColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium"
            >
              Choose Different File
            </button>

            <button
              onClick={startWorkerIngestion}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-sky-600/20"
            >
              <span>Start Worker Ingestion</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Non-blocking Progress */}
      {step === 'processing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-5">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div>
            <h3 className="font-heading font-bold text-white text-lg">Parsing & Normalizing Spreadsheet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Web Worker processing rows in background thread (UI remains 60fps responsive)
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className="bg-sky-500 h-full transition-all duration-150"
              style={{ width: `${totalRows > 0 ? (parsedRows / totalRows) * 100 : 5}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Processed: {parsedRows.toLocaleString()} rows</span>
            <span>Target: {totalRows.toLocaleString()} rows</span>
          </div>
        </div>
      )}

      {/* Step 4: Import Summary Report */}
      {step === 'complete' && summary && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center space-x-3 text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
            <div>
              <h3 className="font-heading font-bold text-white text-lg">Ingestion Completed Successfully!</h3>
              <p className="text-xs text-slate-400">
                Normalized and indexed in SQLite database in {(summary.duration_ms / 1000).toFixed(1)} seconds.
              </p>
            </div>
          </div>

          {/* Stat Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500">Rows Detected</span>
              <div className="text-base font-bold text-white mt-0.5">{summary.rows_detected.toLocaleString()}</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500">Customers Merged</span>
              <div className="text-base font-bold text-sky-400 mt-0.5">{summary.customers_created.toLocaleString()}</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500">Transactions Created</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5">{summary.transactions_created.toLocaleString()}</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500">Duplicates Detected</span>
              <div className="text-base font-bold text-amber-400 mt-0.5">{summary.duplicates_detected.toLocaleString()}</div>
            </div>
          </div>

          {/* Warnings List */}
          {summary.warnings && summary.warnings.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="font-semibold text-amber-400 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Validation Warnings ({summary.rejected_rows} rejected rows)</span>
              </div>
              <ul className="text-slate-400 space-y-1 font-mono text-[11px]">
                {summary.warnings.map((w, idx) => (
                  <li key={idx}>• {w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium"
            >
              Upload Another File
            </button>

            <button
              onClick={onIngestSuccess}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-sky-600/20"
            >
              <span>View Updated Customer Grid</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
