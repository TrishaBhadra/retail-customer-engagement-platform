import React, { useState } from 'react';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  Calendar,
  IndianRupee,
  Eye,
  Check,
  X
} from 'lucide-react';
import { Customer, CategoryPreference } from '../../shared/types.js';

interface AudiencePreviewProps {
  customers: Customer[];
  matchingCount: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  excludedCustomerIds: string[];
  onToggleExcludeCustomer: (customerId: string) => void;
  onSelectCustomer: (customerId: string) => void;
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
}

export default function AudiencePreview({
  customers,
  matchingCount,
  page,
  totalPages,
  onPageChange,
  excludedCustomerIds,
  onToggleExcludeCustomer,
  onSelectCustomer,
  loading,
  search,
  onSearchChange
}: AudiencePreviewProps) {
  const excludedSet = new Set(excludedCustomerIds);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-0">
      {/* Table Top Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-white">Audience Preview & Recipient Selection</h4>
            <p className="text-xs text-slate-400">
              Inspect verified customers matching active criteria. Uncheck any customer to exclude.
            </p>
          </div>
        </div>

        {/* Search within audience */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search matching audience..."
            className="w-48 bg-slate-900 border border-slate-800 focus:border-orange-500 text-xs text-slate-200 placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 outline-none"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-3 w-10 text-center">Include</th>
              <th className="py-3 px-4 font-semibold">Customer</th>
              <th className="py-3 px-4 font-semibold">Phone</th>
              <th className="py-3 px-4 font-semibold">Buying Preferences (Category Spend)</th>
              <th className="py-3 px-4 font-semibold">Last Visit</th>
              <th className="py-3 px-4 font-semibold">Visits</th>
              <th className="py-3 px-4 font-semibold">Total Spend</th>
              <th className="py-3 px-4 text-right font-semibold">Profile</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Evaluating deterministic audience preview from SQLite...</span>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  No customer records match the current audience criteria.
                </td>
              </tr>
            ) : (
              customers.map((c) => {
                const isExcluded = excludedSet.has(c.customer_id);
                const prefs = c.buying_preferences || [];

                return (
                  <tr
                    key={c.customer_id}
                    className={`transition-all hover:bg-slate-800/40 ${
                      isExcluded ? 'opacity-40 bg-slate-950/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => onToggleExcludeCustomer(c.customer_id)}
                        className="rounded border-slate-700 text-orange-600 focus:ring-orange-500 h-4 w-4 bg-slate-950"
                      />
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.customer_id}</div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {c.phone}
                    </td>

                    {/* Preferences */}
                    <td className="py-3 px-4">
                      {prefs.length === 0 ? (
                        <span className="text-slate-500 italic text-[11px]">General Apparel</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {prefs.slice(0, 3).map((p) => (
                            <span
                              key={p.category}
                              className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md text-[10px] font-medium"
                            >
                              {p.label.replace(' Buyers', '')} (₹{p.total_spend.toLocaleString()})
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Last Visit */}
                    <td className="py-3 px-4 text-slate-300">
                      {c.last_visit_date || 'N/A'}
                    </td>

                    {/* Visits */}
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {c.visit_count}
                    </td>

                    {/* Total Spend */}
                    <td className="py-3 px-4 font-bold text-white font-mono">
                      ₹{c.total_spend.toLocaleString()}
                    </td>

                    {/* View Profile */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectCustomer(c.customer_id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700"
                        title="View Full Profile"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <strong className="text-slate-200">{customers.length}</strong> of{' '}
          <strong className="text-slate-200">{matchingCount.toLocaleString()}</strong> matching recipients
        </div>

        <div className="flex items-center space-x-2">
          <button
            disabled={page === 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-lg text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-medium text-slate-300">
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-lg text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
