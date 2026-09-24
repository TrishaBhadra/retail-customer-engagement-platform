import React, { useEffect, useState } from 'react';
import {
  History,
  Database,
  Search,
  Bot,
  MessageSquare,
  Send,
  UploadCloud,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { Activity } from '../../shared/types.js';

export default function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetch('/api/activity?limit=100')
      .then(res => res.json())
      .then(data => {
        setActivities(data.activities || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch activity log:', err);
        setLoading(false);
      });
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'dataset_imported':
      case 'dataset_uploaded':
        return <UploadCloud className="w-4 h-4 text-emerald-400" />;
      case 'customer_searched':
      case 'customer_viewed':
        return <Search className="w-4 h-4 text-amber-400" />;
      case 'ai_question_asked':
      case 'query_executed':
        return <Bot className="w-4 h-4 text-indigo-400" />;
      case 'message_generated':
      case 'message_copied':
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'mock_whatsapp_sent':
        return <Send className="w-4 h-4 text-whatsapp-light" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  const filtered = filterType === 'all'
    ? activities
    : activities.filter(a => a.type.includes(filterType));

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-slate-800 text-slate-300 rounded-xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-white">Operational Activity Log</h2>
            <p className="text-xs text-slate-400">
              Audit trail of dataset ingestion, AI queries, customer searches, and mock WhatsApp communications.
            </p>
          </div>
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 outline-none focus:border-sky-500"
          >
            <option value="all">All Event Types</option>
            <option value="dataset">Dataset Ingestion</option>
            <option value="ai">AI Questions</option>
            <option value="customer">Customer Searches</option>
            <option value="whatsapp">Mock WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Timeline Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
        {loading ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Loading activity event stream...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No activity events recorded for the selected filter.
          </div>
        ) : (
          <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6">
            {filtered.map((item) => (
              <div key={item.id} className="relative group">
                {/* Timeline Icon Node */}
                <div className="absolute -left-[35px] top-0.5 p-1.5 bg-slate-950 border border-slate-800 rounded-xl group-hover:border-sky-500 transition-all">
                  {getEventIcon(item.type)}
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-1.5 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">{item.actor}</span>
                    <span className="font-mono text-[11px]">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-100">{item.description}</p>

                  {item.metadata && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400 flex flex-wrap gap-2">
                      {Object.entries(item.metadata).map(([k, v]) => (
                        <span key={k} className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {k}: <strong className="text-sky-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
