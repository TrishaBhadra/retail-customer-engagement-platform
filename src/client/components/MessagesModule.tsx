import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  CheckCheck,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Users,
  Layers,
  SendHorizontal
} from 'lucide-react';
import AudienceBuilder from './AudienceBuilder.js';
import AudiencePreview from './AudiencePreview.js';
import {
  Customer,
  MessageCategory,
  StructuredSegmentSpec,
  CampaignSummary
} from '../../shared/types.js';

interface MessagesModuleProps {
  initialCustomer?: Customer | null;
  onClearInitialCustomer?: () => void;
}

export default function MessagesModule({ initialCustomer, onClearInitialCustomer }: MessagesModuleProps) {
  // Campaign Meta State
  const [campaignName, setCampaignName] = useState('Festive Collection Engagement');
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory>('marketing');
  const [templateName, setTemplateName] = useState('festive_preference_template');

  // Audience Segmentation State
  const [spec, setSpec] = useState<StructuredSegmentSpec>({
    logic: 'AND',
    conditions: []
  });
  const [matchingCount, setMatchingCount] = useState(0);
  const [audienceCustomers, setAudienceCustomers] = useState<Customer[]>([]);
  const [audiencePage, setAudiencePage] = useState(1);
  const [audienceTotalPages, setAudienceTotalPages] = useState(1);
  const [audienceSearch, setAudienceSearch] = useState('');
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Selection & Exclusion State
  const [selectAll, setSelectAll] = useState(true);
  const [excludedCustomerIds, setExcludedCustomerIds] = useState<string[]>([]);

  // Message Body & Preview State
  const [draftBody, setDraftBody] = useState('');
  const [draftVars, setDraftVars] = useState<Record<string, string>>({});
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [isTranslatingNl, setIsTranslatingNl] = useState(false);

  // Mock Sending State
  const [isSendingMock, setIsSendingMock] = useState(false);
  const [mockCampaignResult, setMockCampaignResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  // Target Customer for single preview
  const [previewCustomer, setPreviewCustomer] = useState<Customer | null>(initialCustomer || null);

  // Fetch Audience Preview when segment criteria, page, or search changes
  const fetchAudiencePreview = async (
    currentSpec: StructuredSegmentSpec,
    page = 1,
    search = ''
  ) => {
    setLoadingAudience(true);
    try {
      const res = await fetch('/api/segment/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spec: currentSpec,
          page,
          limit: 10,
          search
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMatchingCount(data.matching_count);
        setAudienceCustomers(data.customers || []);
        setAudienceTotalPages(data.total_pages || 1);

        if (data.customers && data.customers.length > 0) {
          setPreviewCustomer(data.customers[0]);
          generateMessageForCustomer(data.customers[0], selectedCategory, currentSpec);
        }
      }
    } catch (err) {
      console.error('Failed to fetch audience preview:', err);
    } finally {
      setLoadingAudience(false);
    }
  };

  useEffect(() => {
    fetchAudiencePreview(spec, audiencePage, audienceSearch);
  }, [spec, audiencePage, audienceSearch, selectedCategory]);

  const handleSpecChange = (newSpec: StructuredSegmentSpec) => {
    setSpec(newSpec);
    setAudiencePage(1);
    setExcludedCustomerIds([]);
    setSelectAll(true);
    setMockCampaignResult(null);
  };

  const handleNlTranslate = async (promptText: string) => {
    setIsTranslatingNl(true);
    try {
      const res = await fetch('/api/segment/nl-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      if (res.ok) {
        const data = await res.json();
        setSpec(data.spec);
        setMatchingCount(data.result.matching_count);
        setAudienceCustomers(data.result.customers || []);
        setAudienceTotalPages(data.result.total_pages || 1);

        if (data.result.customers && data.result.customers.length > 0) {
          setPreviewCustomer(data.result.customers[0]);
          generateMessageForCustomer(data.result.customers[0], selectedCategory, data.spec);
        }
      }
    } catch (err) {
      console.error('Failed to translate NL segment:', err);
    } finally {
      setIsTranslatingNl(false);
    }
  };

  const generateMessageForCustomer = async (
    cust: Customer,
    category: MessageCategory,
    currentSpec: StructuredSegmentSpec
  ) => {
    setIsGeneratingMessage(true);
    try {
      // Find target category condition if present
      const catCond = currentSpec.conditions.find((c) => c.field === 'purchase_category');
      const targetCategory = catCond ? String(catCond.value) : undefined;

      const res = await fetch('/api/messages/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: cust.customer_id,
          category,
          targetCategory
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDraftBody(data.draft.body);
        setDraftVars(data.draft.variables);
      }
    } catch (err) {
      console.error('Failed to generate draft message:', err);
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleToggleExcludeCustomer = (customerId: string) => {
    if (excludedCustomerIds.includes(customerId)) {
      setExcludedCustomerIds(excludedCustomerIds.filter((id) => id !== customerId));
    } else {
      setExcludedCustomerIds([...excludedCustomerIds, customerId]);
    }
  };

  const handleToggleSelectAll = (val: boolean) => {
    setSelectAll(val);
    if (!val) {
      // Exclude all currently loaded audience IDs
      setExcludedCustomerIds(audienceCustomers.map((c) => c.customer_id));
    } else {
      setExcludedCustomerIds([]);
    }
  };

  const handleClearSelection = () => {
    setExcludedCustomerIds(audienceCustomers.map((c) => c.customer_id));
  };

  const handleMockCampaignSend = async () => {
    if (isSendingMock || matchingCount === 0) return;
    setIsSendingMock(true);
    setMockCampaignResult(null);

    const catCond = spec.conditions.find((c) => c.field === 'purchase_category');
    const targetCategory = catCond ? String(catCond.value) : undefined;

    try {
      const res = await fetch('/api/campaign/create-and-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          spec,
          category: selectedCategory,
          templateName,
          customBodyTemplate: draftBody,
          excludedCustomerIds,
          targetCategory
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMockCampaignResult(data);
      }
    } catch (err) {
      console.error('Failed to send mock campaign:', err);
    } finally {
      setIsSendingMock(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(draftBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedRecipientCount = Math.max(0, matchingCount - excludedCustomerIds.length);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-whatsapp-teal/20 text-whatsapp-light border border-whatsapp-light/20 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-white">WhatsApp Campaign & Segmentation Hub</h2>
            <p className="text-xs text-slate-400">
              Segment customers by purchasing behavior & product preferences, preview audience, and launch personalized campaigns.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl font-medium">
          <AlertCircle className="w-4 h-4" />
          <span>Mock WhatsApp Deliverability Sandbox</span>
        </div>
      </div>

      {/* Campaign Name & Meta Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Campaign Name
          </label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g. Saree Re-engagement Campaign"
            className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 text-slate-100 rounded-xl px-3.5 py-2 text-xs outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Message Category
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(['marketing', 'utility', 'service'] as MessageCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider border transition-all ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-orange-500 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Template Name
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 font-mono text-slate-300 text-xs rounded-xl px-3.5 py-2 outline-none"
          />
        </div>
      </div>

      {/* Audience Builder Component */}
      <AudienceBuilder
        spec={spec}
        onChangeSpec={handleSpecChange}
        matchingCount={matchingCount}
        selectAll={selectAll}
        onToggleSelectAll={handleToggleSelectAll}
        selectedCount={selectedRecipientCount}
        onClearSelection={handleClearSelection}
        onNlTranslate={handleNlTranslate}
        isTranslatingNl={isTranslatingNl}
      />

      {/* Audience Preview Table Component */}
      <AudiencePreview
        customers={audienceCustomers}
        matchingCount={matchingCount}
        page={audiencePage}
        totalPages={audienceTotalPages}
        onPageChange={setAudiencePage}
        excludedCustomerIds={excludedCustomerIds}
        onToggleExcludeCustomer={handleToggleExcludeCustomer}
        onSelectCustomer={(cust) => {
          const found = audienceCustomers.find((c) => c.customer_id === cust);
          if (found) {
            setPreviewCustomer(found);
            generateMessageForCustomer(found, selectedCategory, spec);
          }
        }}
        loading={loadingAudience}
        search={audienceSearch}
        onSearchChange={setAudienceSearch}
      />

      {/* Grid: Message Composer vs Mobile Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Preference-Aware Message Editor (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Preference-Aware Message Composer</span>
            </h3>

            {previewCustomer && (
              <button
                onClick={() => generateMessageForCustomer(previewCustomer, selectedCategory, spec)}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-generate Copy</span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Messages automatically adapt based on verified customer buying preferences (e.g. Sarees vs Kidswear).
          </p>

          <textarea
            rows={5}
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 text-slate-100 rounded-xl p-3.5 text-xs leading-relaxed outline-none"
          />

          {/* Resolved Variables Chips */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Resolved Customer Variables (Previewing: {previewCustomer ? previewCustomer.name : 'Customer'})
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs font-mono">
              {Object.entries(draftVars).map(([key, val]) => (
                <span key={key} className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                  <span className="text-amber-400 font-semibold">{`{{${key}}}`}</span>: <span className="text-emerald-400">{val}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              onClick={handleCopyMessage}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs transition-all flex items-center justify-center space-x-2 border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Copy!' : 'Copy Draft'}</span>
            </button>

            <button
              disabled={isSendingMock || selectedRecipientCount === 0 || !draftBody.trim()}
              onClick={handleMockCampaignSend}
              className="flex-1 py-2.5 bg-whatsapp-teal hover:bg-whatsapp-dark text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-whatsapp-teal/20 disabled:opacity-50"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>
                {isSendingMock
                  ? 'Executing Campaign...'
                  : `Mock Send Campaign (${selectedRecipientCount.toLocaleString()} Recipients)`}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Mobile Phone Simulator Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-xs bg-slate-900 border-4 border-slate-800 rounded-[40px] p-3 shadow-2xl space-y-3 relative overflow-hidden">
            {/* Phone Top Speaker */}
            <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-2"></div>

            {/* WhatsApp Header */}
            <div className="bg-whatsapp-teal text-white p-3 rounded-2xl flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs">
                {previewCustomer ? previewCustomer.name[0] : 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs truncate">
                  {previewCustomer ? previewCustomer.name : 'Customer Recipient'}
                </div>
                <div className="text-[10px] text-whatsapp-light opacity-90 truncate">
                  {previewCustomer ? previewCustomer.phone : '+91 98765 43210'}
                </div>
              </div>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">PREVIEW</span>
            </div>

            {/* Chat Bubble Sandbox Container */}
            <div className="h-80 bg-whatsapp-chatbg rounded-2xl p-3 flex flex-col justify-between overflow-y-auto font-sans">
              <div className="space-y-3">
                {/* System Watermark */}
                <div className="text-center">
                  <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium shadow-sm">
                    Campaign Live Preview
                  </span>
                </div>

                {/* Message Bubble */}
                {draftBody && (
                  <div className="bg-whatsapp-bubbleOut text-slate-800 p-3 rounded-xl rounded-tr-none text-xs leading-relaxed shadow-sm relative space-y-1">
                    <p>{draftBody}</p>

                    <div className="flex items-center justify-end space-x-1 text-[10px] text-slate-500 pt-1">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                  </div>
                )}
              </div>

              {/* Status footer inside chat */}
              {mockCampaignResult && (
                <div className="bg-emerald-100 text-emerald-800 text-[10px] p-2 rounded-xl text-center font-semibold border border-emerald-300 animate-in fade-in">
                  ✓ Mock Campaign Executed to {mockCampaignResult.selected_count.toLocaleString()} Customers & Activity Logged!
                </div>
              )}
            </div>

            {/* Phone Bottom Home Bar */}
            <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
