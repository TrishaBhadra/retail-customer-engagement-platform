import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Database,
  Code2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User,
  ShoppingBag,
  Phone,
  Calendar,
  IndianRupee,
  ExternalLink
} from 'lucide-react';
import { AiResponse } from '../../shared/types.js';

interface AiAssistantProps {
  onSelectCustomer: (customerId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  response?: AiResponse;
  timestamp: string;
}

export default function AiAssistant({ onSelectCustomer }: AiAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello! I am your AI Data Assistant for JK Readymade Center. Ask me any question in simple language about your customers, sales trends, inactive shoppers, top spenders, or product purchases (like Silk Sarees or Kurtas).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);

  const presetQuestions = [
    'Who are our top 10 spenders?',
    'How many customers haven\'t visited in 6 months?',
    'Show me customers who bought Silk Sarees',
    'Find customer named Rahul',
    'What is our average customer spend?',
    'Who bought Kurtas?'
  ];

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });

      if (res.ok) {
        const aiData: AiResponse = await res.json();
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: aiData.answer,
          response: aiData,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, assistantMsg]);
        // Kept collapsed by default so non-coding shopkeepers get clean text & customer cards
      } else {
        throw new Error('Server returned an error');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Sorry, I encountered an issue searching the JK Readymade Center database. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-white">JK Customer Assistant</h2>
            <p className="text-xs text-slate-400">
              Ask questions about customer purchases, inactive shoppers, sales stats, and top spenders in simple language.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl font-medium">
          <CheckCircle2 className="w-4 h-4" />
          <span>Shopkeeper Friendly</span>
        </div>
      </div>

      {/* Preset Question Chips */}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
          Suggested Questions for Shopkeepers
        </div>
        <div className="flex flex-wrap gap-2">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSend(q)}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-amber-500/40 px-3 py-2 rounded-xl transition-all font-medium text-left flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 min-h-[400px] flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto max-h-[520px] pr-2">
          {messages.map((msg) => {
            const hasCustomerData = msg.response?.query_result?.data &&
              msg.response.query_result.data.length > 0 &&
              Boolean(msg.response.query_result.data[0]?.customer_id);

            const customerList = hasCustomerData ? msg.response!.query_result!.data : [];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-orange-600 text-white rounded-tr-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 space-x-4">
                    <span className="font-semibold text-slate-300">
                      {msg.sender === 'user' ? 'Shopkeeper' : 'JK Assistant'}
                    </span>
                    <span className="text-[11px] opacity-70">{msg.timestamp}</span>
                  </div>

                  {/* Main Plain Language Answer */}
                  <div className="whitespace-pre-line font-sans leading-relaxed">{msg.text}</div>

                  {/* Non-Technical Customer Cards for Shopkeepers */}
                  {hasCustomerData && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                      <div className="text-xs font-semibold text-amber-400 flex items-center justify-between">
                        <span>Matching Customer Records ({customerList.length})</span>
                        <span className="text-[11px] text-slate-400 font-normal">Click a profile to view details</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {customerList.slice(0, 6).map((cust: any) => (
                          <div
                            key={cust.customer_id}
                            className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-3 text-xs space-y-1.5 transition-all"
                          >
                            <div className="flex items-center justify-between font-bold text-white">
                              <span className="truncate max-w-[140px]">{cust.name}</span>
                              <span className="text-amber-300 font-mono">₹{(cust.total_spend || 0).toLocaleString()}</span>
                            </div>

                            <div className="flex items-center space-x-2 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-orange-400" />
                              <span className="font-mono">{cust.phone}</span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                              <span>Visits: <strong className="text-white">{cust.visit_count}</strong></span>
                              <button
                                onClick={() => onSelectCustomer(cust.customer_id)}
                                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1 text-[11px]"
                              >
                                <span>View Profile</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {customerList.length > 6 && (
                        <div className="text-[11px] text-slate-400 text-center pt-1 italic">
                          Showing top 6 of {customerList.length} matching customer records.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Suggested Followups */}
                  {msg.response?.suggested_followups && msg.response.suggested_followups.length > 0 && (
                    <div className="mt-3 pt-2 flex flex-wrap gap-1.5">
                      {msg.response.suggested_followups.slice(0, 3).map((f, i) => (
                        <button
                          key={i}
                          disabled={loading}
                          onClick={() => handleSend(f)}
                          className="text-[11px] bg-slate-900 hover:bg-slate-800 text-amber-300/90 border border-slate-800 rounded-lg px-2.5 py-1 transition-all"
                        >
                          + {f}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Optional Technical Trace for Developers (Collapsed by default) */}
                  {msg.response && msg.response.structured_query && (
                    <div className="mt-3 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)}
                        className="text-[11px] text-slate-500 hover:text-slate-400 font-mono flex items-center space-x-1"
                      >
                        <Code2 className="w-3 h-3" />
                        <span>Developer Info ({msg.response.query_result?.execution_time_ms}ms)</span>
                        {expandedTraceId === msg.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {expandedTraceId === msg.id && (
                        <div className="mt-2 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono space-y-2 text-slate-300 animate-in fade-in">
                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">1. Structured Query Spec</div>
                            <pre className="mt-1 bg-slate-950 p-2 rounded text-sky-300 overflow-x-auto text-[11px]">
                              {JSON.stringify(msg.response.structured_query, null, 2)}
                            </pre>
                          </div>

                          <div>
                            <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">2. SQLite Statement</div>
                            <div className="mt-1 bg-slate-950 p-2 rounded text-emerald-400 break-all text-[11px]">
                              {msg.response.query_result?.sql_executed}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Searching JK Readymade Center database...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-slate-800 flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question in plain language (e.g. top spenders, silk saree buyers)..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
          />
          <button
            disabled={loading || !input.trim()}
            onClick={() => handleSend()}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-medium text-sm rounded-xl transition-all flex items-center space-x-1.5 shadow-lg shadow-orange-600/20"
          >
            <span>Ask Assistant</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
