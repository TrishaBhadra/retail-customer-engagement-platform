import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Bot,
  MessageSquare,
  UploadCloud,
  History,
  Store,
  Database,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import Dashboard from './Dashboard.js';
import CustomerTable from './CustomerTable.js';
import AiAssistant from './AiAssistant.js';
import MessagesModule from './MessagesModule.js';
import IngestionModule from './IngestionModule.js';
import ActivityLog from './ActivityLog.js';
import CustomerDetailModal from './CustomerDetailModal.js';
import { Customer } from '../../shared/types.js';

export type NavTab = 'dashboard' | 'customers' | 'ai_assistant' | 'messages' | 'ingestion' | 'activity';

export default function Shell() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerForMsg, setSelectedCustomerForMsg] = useState<Customer | null>(null);
  const [dbStatus, setDbStatus] = useState<{ totalCustomers: number; totalSales: number } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setDbStatus({
          totalCustomers: data.total_customers,
          totalSales: data.total_sales
        });
      }
    } catch (err) {
      console.error('Failed to fetch header stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users, badge: dbStatus ? `${(dbStatus.totalCustomers / 1000).toFixed(0)}k` : undefined },
    { id: 'ai_assistant', label: 'AI Assistant', icon: Bot, highlight: true },
    { id: 'messages', label: 'WhatsApp Drafts', icon: MessageSquare },
    { id: 'ingestion', label: 'Excel / CSV Import', icon: UploadCloud },
    { id: 'activity', label: 'Activity Log', icon: History }
  ];

  const handleOpenCustomerDetail = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const handleOpenMessageDraft = (customer: Customer) => {
    setSelectedCustomerForMsg(customer);
    setActiveTab('messages');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Brand Ribbon Top Header Bar */}
      <header className="border-b border-orange-950/60 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 px-6 py-3 flex flex-wrap items-center justify-between sticky top-0 z-40 shadow-xl backdrop-blur">
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl blur opacity-40 group-hover:opacity-75 transition duration-300"></div>
            <img
              src="/logo.jpg"
              alt="JK Readymade Center Logo"
              className="relative w-12 h-12 rounded-xl object-cover border border-amber-400/40 shadow-lg"
            />
          </div>

          <div>
            <div className="flex items-center space-x-3">
              <h1 className="font-heading font-extrabold text-xl text-white tracking-wide flex items-center gap-2">
                <span>JK Readymade Center</span>
                <span className="font-bengali text-amber-400 font-semibold text-lg">JK রেডিমেড সেন্টার</span>
              </h1>
              <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider">
                Luxury Apparel Hub
              </span>
            </div>
            
            <div className="flex items-center space-x-3 text-xs mt-0.5 text-slate-300">
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide uppercase">
                YOUR ONE STOP DESTINATION FOR SHOPPING
              </span>
              <span className="hidden sm:inline font-bengali text-orange-300 font-medium">এক এবং অদ্বিতীয়</span>
              <span className="hidden lg:inline text-slate-400">•</span>
              <span className="hidden lg:inline font-bengali text-slate-400">স্টেশন রোড, সোদপুর</span>
              <span className="hidden xl:inline text-amber-400/80 font-medium">📞 9674567322 / 9674567323</span>
            </div>
          </div>
        </div>

        {/* System State Info */}
        <div className="flex items-center space-x-3 text-xs mt-2 sm:mt-0">
          <div className="hidden md:flex items-center space-x-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-amber-500/20 shadow-inner">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Database:</span>
            <span className="font-semibold text-amber-300">
              {dbStatus ? `${dbStatus.totalCustomers.toLocaleString()} Shoppers` : 'SQLite Active'}
            </span>
          </div>

          <div className="flex items-center space-x-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span className="text-amber-200 font-medium">JK Engine Online</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-900/40 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-bold text-amber-500/80 uppercase tracking-wider">
              Management Portal
            </div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as NavTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/25 font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-orange-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-orange-800 text-white' : 'bg-slate-800 text-amber-400/90 border border-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Store Info Banner Callout */}
          <div className="bg-gradient-to-b from-amber-950/30 to-slate-900/90 border border-amber-500/20 rounded-xl p-3.5 text-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>JK Readymade Hub</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Offline retail intelligence & WhatsApp bulk campaign engine tailored for JK Readymade Center Sodepur.
            </p>
            <div className="pt-1 text-[10px] text-amber-400/80 font-bengali border-t border-slate-800 flex items-center justify-between">
              <span>স্টেশন রোড, সোদপুর</span>
              <span className="font-sans text-orange-400">9674567322</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {activeTab === 'dashboard' && (
            <Dashboard
              onNavigateToCustomers={() => setActiveTab('customers')}
              onNavigateToAi={() => setActiveTab('ai_assistant')}
              onNavigateToIngest={() => setActiveTab('ingestion')}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerTable
              onSelectCustomer={handleOpenCustomerDetail}
              onDraftMessage={handleOpenMessageDraft}
            />
          )}

          {activeTab === 'ai_assistant' && (
            <AiAssistant
              onSelectCustomer={handleOpenCustomerDetail}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesModule
              initialCustomer={selectedCustomerForMsg}
              onClearInitialCustomer={() => setSelectedCustomerForMsg(null)}
            />
          )}

          {activeTab === 'ingestion' && (
            <IngestionModule
              onIngestSuccess={() => {
                fetchStats();
                setActiveTab('customers');
              }}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityLog />
          )}
        </main>
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomerId && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
          onDraftMessage={(cust) => {
            setSelectedCustomerId(null);
            handleOpenMessageDraft(cust);
          }}
        />
      )}
    </div>
  );
}
