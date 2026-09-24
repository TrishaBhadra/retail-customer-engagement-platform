import React, { useEffect, useState } from 'react';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  RotateCcw,
  IndianRupee,
  UserCheck,
  UserX,
  ArrowUpRight,
  Bot,
  UploadCloud,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { AnalyticsSummary } from '../../shared/types.js';

interface DashboardProps {
  onNavigateToCustomers: () => void;
  onNavigateToAi: () => void;
  onNavigateToIngest: () => void;
}

export default function Dashboard({ onNavigateToCustomers, onNavigateToAi, onNavigateToIngest }: DashboardProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = () => {
    setLoading(true);
    setError(null);
    fetch('/api/analytics')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((resData) => {
        if (resData && typeof resData.total_customers === 'number') {
          setData(resData);
          setError(null);
        } else {
          throw new Error(resData?.error || 'Invalid database response structure');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard analytics:', err);
        setError(err.message || 'Failed to connect to retail database server');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Computing deterministic retail KPIs from database...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-white">Database Connection Issue</h3>
            <p className="text-xs text-slate-400 mt-1">{error || 'Unable to fetch analytics payload'}</p>
          </div>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-semibold text-xs transition-all shadow"
          >
            Retry Connecting to Server
          </button>
        </div>
      </div>
    );
  }

  const COLORS = ['#ea580c', '#d97706', '#059669', '#be123c', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Brand Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <img
              src="/logo.jpg"
              alt="JK Readymade Center Logo"
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/50 shadow-xl shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  YOUR ONE STOP DESTINATION FOR SHOPPING
                </span>
                <span className="font-bengali text-orange-400 text-xs font-semibold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  এক এবং অদ্বিতীয়
                </span>
              </div>

              <h2 className="font-heading font-extrabold text-2xl lg:text-3xl text-white tracking-wide flex flex-wrap items-baseline gap-3">
                <span>JK Readymade Center</span>
                <span className="font-bengali text-amber-400 font-bold text-xl">JK রেডিমেড সেন্টার</span>
              </h2>

              <p className="text-slate-300 text-sm mt-1.5 max-w-2xl leading-relaxed">
                Currently tracking <strong className="text-amber-300">{data.total_customers.toLocaleString()} apparel shoppers</strong> and <strong className="text-amber-300">{data.total_transactions.toLocaleString()} offline bills</strong> directly from your Sodepur billing spreadsheets.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                <span className="font-bengali text-slate-300">📍 স্টেশন রোড, সোদপুর</span>
                <span>•</span>
                <span className="text-amber-400/90 font-medium">📞 9674567322 / 9674567323</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={onNavigateToAi}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-semibold text-sm transition-all flex items-center space-x-2 shadow-lg shadow-orange-600/25 border border-amber-400/20"
            >
              <Bot className="w-4 h-4" />
              <span>Ask AI Assistant</span>
            </button>
            <button
              onClick={onNavigateToIngest}
              className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-amber-500/30 rounded-xl font-medium text-sm transition-all flex items-center space-x-2 shadow"
            >
              <UploadCloud className="w-4 h-4 text-orange-400" />
              <span>Import Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Shoppers</span>
            <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-heading">{data.total_customers.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center space-x-1">
              <span className="text-emerald-400 font-semibold">100% Verified</span>
              <span>• JK Sodepur Store</span>
            </p>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300 font-heading">
              ₹{data.total_sales > 10000000 ? `${(data.total_sales / 10000000).toFixed(2)} Cr` : `${(data.total_sales / 100000).toFixed(2)} Lakh`}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Across {data.total_transactions.toLocaleString()} sales bills
            </p>
          </div>
        </div>

        {/* Repeat Visit Rate */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Repeat Visit Rate</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-heading">{data.repeat_visit_rate}%</div>
            <p className="text-xs text-slate-400 mt-1">
              Loyal customers (&gt; 1 purchase)
            </p>
          </div>
        </div>

        {/* Average Customer Spend */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-all shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Customer Spend</span>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white font-heading">₹{data.average_customer_spend.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">
              Avg bill: ₹{data.average_transaction_value.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Shoppers (Last 30 Days)</div>
              <div className="text-lg font-bold text-white mt-0.5">{data.active_last_30_days.toLocaleString()} customers</div>
            </div>
          </div>
          <button
            onClick={onNavigateToCustomers}
            className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1"
          >
            <span>View list</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Dormant Shoppers (6+ Months)</div>
              <div className="text-lg font-bold text-white mt-0.5">{data.inactive_6_months.toLocaleString()} customers</div>
            </div>
          </div>
          <button
            onClick={onNavigateToCustomers}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center space-x-1"
          >
            <span>Re-engage</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-white text-base flex items-center gap-2">
                <span>Monthly Sales Trend</span>
                <span className="text-xs font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">JK Sodepur Store</span>
              </h3>
              <p className="text-xs text-slate-400">Total billings grouped by month</p>
            </div>
            <div className="text-xs text-slate-500 font-medium">12 Month Window</div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sales_by_month}>
                <defs>
                  <linearGradient id="orangeBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                    <stop offset="100%" stopColor="#c2410c" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#d97706', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Sales']}
                />
                <Bar dataKey="sales" fill="url(#orangeBarGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend Distribution */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-semibold text-white text-base">Customer Spend Tiers</h3>
            <p className="text-xs text-slate-400 mb-4">Customer segmentation by total lifetime spend</p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.spend_distribution}
                    dataKey="customer_count"
                    nameKey="range"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={35}
                    paddingAngle={4}
                  >
                    {data.spend_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#d97706', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: number) => [val.toLocaleString(), 'Shoppers']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            {data.spend_distribution.map((item, idx) => (
              <div key={item.range} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-slate-300">{item.range}</span>
                </div>
                <span className="font-medium text-slate-400">{item.customer_count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
