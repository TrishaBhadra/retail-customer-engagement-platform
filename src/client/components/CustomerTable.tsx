import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  ArrowUpDown,
  RefreshCw,
  Phone,
  Calendar,
  IndianRupee,
  UserCheck,
  UserX
} from 'lucide-react';
import { Customer } from '../../shared/types.js';

interface CustomerTableProps {
  onSelectCustomer: (customerId: string) => void;
  onDraftMessage: (customer: Customer) => void;
}

export default function CustomerTable({ onSelectCustomer, onDraftMessage }: CustomerTableProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filters
  const [minSpend, setMinSpend] = useState<number | ''>('');
  const [minVisits, setMinVisits] = useState<number | ''>('');
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState('total_spend');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search,
        sortBy,
        sortOrder
      });

      if (minSpend !== '') params.append('minSpend', minSpend.toString());
      if (minVisits !== '') params.append('minVisits', minVisits.toString());
      if (inactiveOnly) params.append('inactiveOnly', 'true');

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
        setTotalPages(data.pagination.totalPages);
        setTotalRecords(data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, limit, search, minSpend, minVisits, inactiveOnly, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setMinSpend('');
    setMinVisits('');
    setInactiveOnly(false);
    setSortBy('total_spend');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search customer by name, phone (+91...), or ID..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 text-sm outline-none transition-all"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Quick Filter presets */}
          <button
            onClick={() => {
              setInactiveOnly(!inactiveOnly);
              setPage(1);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 ${
              inactiveOnly
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Inactive 6+ Mo</span>
          </button>

          <button
            onClick={() => {
              setMinSpend(minSpend === 10000 ? '' : 10000);
              setPage(1);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 ${
              minSpend === 10000
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 font-semibold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>VIP &gt; ₹10k</span>
          </button>

          {/* Detailed filter toggle */}
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center space-x-2 transition-all ${
              showFilterMenu || minVisits !== ''
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>

          <button
            onClick={handleResetFilters}
            title="Reset Filters"
            className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {showFilterMenu && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Min Visit Count</label>
            <input
              type="number"
              value={minVisits}
              onChange={(e) => {
                setMinVisits(e.target.value ? parseInt(e.target.value) : '');
                setPage(1);
              }}
              placeholder="e.g. 2 visits"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Min Total Spend (₹)</label>
            <input
              type="number"
              value={minSpend}
              onChange={(e) => {
                setMinSpend(e.target.value ? parseFloat(e.target.value) : '');
                setPage(1);
              }}
              placeholder="e.g. 5000"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Records Per Page</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 outline-none focus:border-orange-500"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Paginated Data Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">
                  <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-white">
                    <span>Customer</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold">
                  <button onClick={() => handleSort('phone')} className="flex items-center space-x-1 hover:text-white">
                    <span>Phone</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold">
                  <button onClick={() => handleSort('last_visit_date')} className="flex items-center space-x-1 hover:text-white">
                    <span>Last Visit</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold">
                  <button onClick={() => handleSort('visit_count')} className="flex items-center space-x-1 hover:text-white">
                    <span>Visits</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold">
                  <button onClick={() => handleSort('total_spend')} className="flex items-center space-x-1 hover:text-white">
                    <span>Total Spend</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold">
                  <button onClick={() => handleSort('average_transaction_value')} className="flex items-center space-x-1 hover:text-white">
                    <span>Avg Spend</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs">Fetching customer page from indexed SQLite...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers match the current search or filter criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customer_id} className="hover:bg-slate-800/40 transition-all group">
                    <td className="py-3 px-4">
                      <div className="font-medium text-white group-hover:text-amber-300 transition-all">{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{c.customer_id}</div>
                    </td>

                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {c.phone}
                    </td>

                    <td className="py-3 px-4 text-xs">
                      <div>{c.last_visit_date || 'N/A'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.visit_count > 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {c.visit_count} {c.visit_count === 1 ? 'visit' : 'visits'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-white font-mono text-xs">
                      ₹{c.total_spend.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                      ₹{c.average_transaction_value.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onSelectCustomer(c.customer_id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1 border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>Profile</span>
                        </button>

                        <button
                          onClick={() => onDraftMessage(c)}
                          className="px-2.5 py-1 bg-orange-600/90 hover:bg-orange-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination Controls */}
        <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <strong className="text-slate-200">{customers.length}</strong> of{' '}
            <strong className="text-slate-200">{totalRecords.toLocaleString()}</strong> indexed customer records
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-lg text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-medium text-slate-300">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-40 rounded-lg text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
