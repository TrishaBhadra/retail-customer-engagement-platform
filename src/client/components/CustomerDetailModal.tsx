import React, { useEffect, useState } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  ShoppingBag,
  IndianRupee,
  RotateCcw,
  MessageSquare,
  History,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { Customer, Transaction, Message } from '../../shared/types.js';

interface CustomerDetailModalProps {
  customerId: string;
  onClose: () => void;
  onDraftMessage: (customer: Customer) => void;
}

export default function CustomerDetailModal({ customerId, onClose, onDraftMessage }: CustomerDetailModalProps) {
  const [data, setData] = useState<{
    customer: Customer;
    transactions: Transaction[];
    messages: Message[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${customerId}`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch customer profile:', err);
        setLoading(false);
      });
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-heading font-bold text-lg">
              {data?.customer.name ? data.customer.name[0] : 'C'}
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white leading-tight">
                {data ? data.customer.name : 'Loading Profile...'}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {customerId} • Mobile: {data?.customer.phone}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {loading || !data ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Fetching customer profile & purchase history...</span>
          </div>
        ) : (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Customer Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-slate-500 font-medium">Total Spend</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  ₹{data.customer.total_spend.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-slate-500 font-medium">Visits</span>
                <div className="text-lg font-bold text-white mt-1">
                  {data.customer.visit_count} {data.customer.visit_count === 1 ? 'time' : 'times'}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-slate-500 font-medium">Avg Bill Value</span>
                <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                  ₹{data.customer.average_transaction_value.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5">
                <span className="text-slate-500 font-medium">Last Visit Date</span>
                <div className="text-sm font-semibold text-slate-200 mt-1.5">
                  {data.customer.last_visit_date || 'N/A'}
                </div>
              </div>
            </div>

            {/* Buying Preferences & Category Breakdown Section */}
            {data.customer.buying_preferences && data.customer.buying_preferences.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-semibold text-slate-200 text-sm flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-orange-400" />
                    <span>Derived Buying Preferences ({data.customer.buying_preferences.length} categories)</span>
                  </h4>
                  <span className="text-[11px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                    Deterministic History
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {data.customer.buying_preferences.map((pref) => (
                    <div key={pref.category} className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{pref.label}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {pref.purchase_count} item{pref.purchase_count > 1 ? 's' : ''} purchased • Last: {pref.last_purchase_date || 'N/A'}
                        </div>
                      </div>
                      <div className="text-emerald-400 font-mono font-bold">
                        ₹{pref.total_spend.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions Bar */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white">Activate Customer:</span> Draft custom WhatsApp message based on purchase history.
              </div>
              <button
                onClick={() => onDraftMessage(data.customer)}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-orange-600/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Create WhatsApp Draft</span>
              </button>
            </div>

            {/* Itemized Purchase Transactions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-heading font-semibold text-slate-200 text-sm flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Itemized Purchase History ({data.transactions.length})</span>
                </h4>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Apparel Item</th>
                      <th className="py-2.5 px-4">Qty</th>
                      <th className="py-2.5 px-4 text-right">Bill Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {data.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500 font-sans">
                          No transactions recorded.
                        </td>
                      </tr>
                    ) : (
                      data.transactions.map((tx) => (
                        <tr key={tx.transaction_id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-4 text-slate-400">{tx.purchase_date}</td>
                          <td className="py-2.5 px-4 font-sans text-white font-medium">{tx.item_description}</td>
                          <td className="py-2.5 px-4 text-slate-400">{tx.quantity || 1}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-400 font-semibold">
                            ₹{tx.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Messages Sent */}
            {data.messages.length > 0 && (
              <div>
                <h4 className="font-heading font-semibold text-slate-200 text-sm mb-3 flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Communication History ({data.messages.length})</span>
                </h4>

                <div className="space-y-2 text-xs">
                  {data.messages.map((msg) => (
                    <div key={msg.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="uppercase font-semibold text-[10px] bg-slate-800 text-amber-400 px-2 py-0.5 rounded-full">
                          {msg.category}
                        </span>
                        <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed font-sans">{msg.body}</p>
                      <div className="mt-2 flex items-center space-x-1.5 text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Status: {msg.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
