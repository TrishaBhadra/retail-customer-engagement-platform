import React, { useState } from 'react';
import {
  Users,
  Filter,
  Sparkles,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  X,
  Layers,
  Zap,
  Tag
} from 'lucide-react';
import {
  StructuredSegmentSpec,
  StructuredSegmentCondition,
  SegmentLogic,
  SegmentField,
  SegmentOperator
} from '../../shared/types.js';

interface AudienceBuilderProps {
  spec: StructuredSegmentSpec;
  onChangeSpec: (newSpec: StructuredSegmentSpec) => void;
  matchingCount: number;
  selectAll: boolean;
  onToggleSelectAll: (val: boolean) => void;
  selectedCount: number;
  onClearSelection: () => void;
  onNlTranslate: (prompt: string) => void;
  isTranslatingNl: boolean;
}

export const PRESET_SEGMENTS = [
  { id: 'all', name: 'All Customers', description: 'Select all registered shoppers in database' },
  { id: 'high_monthly', name: 'High Monthly Spenders (>₹10,000/mo)', description: 'Customers who spent > ₹10,000 in a calendar month' },
  { id: 'frequent', name: 'Frequent Visitors (5+ visits)', description: 'Customers with 5 or more recorded visits' },
  { id: 'recent', name: 'Recent Visitors (Last 30 Days)', description: 'Shopped within the last 30 days' },
  { id: 'inactive', name: 'Inactive Customers (6+ Months)', description: 'Has not visited for over 6 months' },
  { id: 'high_value', name: 'Lifetime High-Value (>₹25,000)', description: 'Total lifetime spend exceeds ₹25,000' },
  { id: 'repeat', name: 'Repeat Customers (2+ visits)', description: 'Visited 2 or more times' },
  { id: 'saree', name: 'Saree Buyers', description: 'Purchased sarees or silk sarees' },
  { id: 'kids', name: 'Kids Clothing Buyers', description: 'Purchased children/kidswear items' },
  { id: 'menswear', name: "Men's Clothing Buyers", description: 'Purchased menswear, shirts, kurtas' },
  { id: 'womenswear', name: "Women's Clothing Buyers", description: 'Purchased womenswear, suits, dresses' },
  { id: 'ethnic', name: 'Ethnic Wear Buyers', description: 'Purchased sarees, kurtas, lehengas, suits' },
  { id: 'western', name: 'Western Wear Buyers', description: 'Purchased jeans, t-shirts, jackets, tops' },
  { id: 'shirts', name: 'Shirt Buyers', description: 'Purchased casual/formal shirts or t-shirts' },
  { id: 'trousers', name: 'Trousers/Bottomwear Buyers', description: 'Purchased trousers, jeans, or leggings' },
  { id: 'dresses', name: 'Dress Buyers', description: 'Purchased dresses, frocks, or suits' }
];

export default function AudienceBuilder({
  spec,
  onChangeSpec,
  matchingCount,
  selectAll,
  onToggleSelectAll,
  selectedCount,
  onClearSelection,
  onNlTranslate,
  isTranslatingNl
}: AudienceBuilderProps) {
  const [nlInput, setNlInput] = useState('');
  const [activePreset, setActivePreset] = useState<string>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSelectPreset = (presetId: string) => {
    setActivePreset(presetId);
    let newConditions: StructuredSegmentCondition[] = [];

    switch (presetId) {
      case 'all':
        newConditions = [];
        break;
      case 'high_monthly':
        newConditions = [{ field: 'monthly_spend', operator: 'greater_than', value: 10000 }];
        break;
      case 'frequent':
        newConditions = [{ field: 'visit_count', operator: 'greater_than', value: 4 }];
        break;
      case 'recent':
        newConditions = [{ field: 'last_visit_date', operator: 'within_last_days', value: 30 }];
        break;
      case 'inactive':
        newConditions = [{ field: 'last_visit_date', operator: 'before', value: '6_months_ago' }];
        break;
      case 'high_value':
        newConditions = [{ field: 'lifetime_spend', operator: 'greater_than', value: 25000 }];
        break;
      case 'repeat':
        newConditions = [{ field: 'visit_count', operator: 'greater_than', value: 1 }];
        break;
      case 'saree':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'saree' }];
        break;
      case 'kids':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'kids_clothing' }];
        break;
      case 'menswear':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'menswear' }];
        break;
      case 'womenswear':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'womenswear' }];
        break;
      case 'ethnic':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'ethnic_wear' }];
        break;
      case 'western':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'western_wear' }];
        break;
      case 'shirts':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'shirts' }];
        break;
      case 'trousers':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'trousers' }];
        break;
      case 'dresses':
        newConditions = [{ field: 'purchase_category', operator: 'equals', value: 'dresses' }];
        break;
    }

    onChangeSpec({
      logic: 'AND',
      conditions: newConditions
    });
  };

  const handleAddCondition = () => {
    const newCond: StructuredSegmentCondition = {
      id: Math.random().toString(36).substring(2, 9),
      field: 'lifetime_spend',
      operator: 'greater_than',
      value: 10000
    };
    onChangeSpec({
      ...spec,
      conditions: [...spec.conditions, newCond]
    });
    setActivePreset('custom');
  };

  const handleRemoveCondition = (index: number) => {
    const updated = spec.conditions.filter((_, i) => i !== index);
    onChangeSpec({
      ...spec,
      conditions: updated
    });
    setActivePreset('custom');
  };

  const handleUpdateCondition = (index: number, key: keyof StructuredSegmentCondition, value: any) => {
    const updated = [...spec.conditions];
    updated[index] = { ...updated[index], [key]: value };
    onChangeSpec({
      ...spec,
      conditions: updated
    });
    setActivePreset('custom');
  };

  const handleLogicChange = (logic: SegmentLogic) => {
    onChangeSpec({
      ...spec,
      logic
    });
    setActivePreset('custom');
  };

  const handleNlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlInput.trim()) return;
    onNlTranslate(nlInput);
    setActivePreset('custom');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      {/* Header with Title & Select All Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" />
            <span>Audience Segmentation Engine</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Filter target recipients deterministically using buying behavior and category history.
          </p>
        </div>

        {/* Audience Selection Counter & Select All Controls */}
        <div className="flex items-center space-x-3 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
          <button
            onClick={() => onToggleSelectAll(!selectAll)}
            className="flex items-center space-x-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-all"
          >
            {selectAll ? (
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{selectAll ? 'Deselect All' : 'Select All Matching'}</span>
          </button>

          <span className="text-slate-600">|</span>

          <div className="text-xs font-mono">
            <span className="text-emerald-400 font-bold">{selectedCount.toLocaleString()}</span>
            <span className="text-slate-400"> / {matchingCount.toLocaleString()} selected</span>
          </div>

          {selectedCount > 0 && (
            <button
              onClick={onClearSelection}
              className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* AI Natural Language Segmentation Bar */}
      <form onSubmit={handleNlSubmit} className="relative">
        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 focus-within:border-orange-500 rounded-xl px-3.5 py-2 transition-all">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <input
            type="text"
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            placeholder="Ask AI to segment: e.g. 'Find high-value saree buyers who haven't visited in 6 months'..."
            className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={isTranslatingNl || !nlInput.trim()}
            className="px-3 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg text-xs font-semibold transition-all shadow flex items-center space-x-1 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isTranslatingNl ? 'Translating...' : 'AI Translate'}</span>
          </button>
        </div>
      </form>

      {/* Quick Presets Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Quick Audience Presets
          </label>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Custom Builder' : 'Custom AND/OR Builder'}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_SEGMENTS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                activePreset === preset.id
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-orange-500 text-white shadow-md font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Composite Condition Builder (AND / OR / NOT) */}
      {(showAdvanced || spec.conditions.length > 0) && (
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Match Logic:</span>
              <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                {(['AND', 'OR', 'NOT'] as SegmentLogic[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleLogicChange(mode)}
                    className={`px-3 py-1 rounded-md font-bold transition-all ${
                      spec.logic === mode
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddCondition}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Filter Condition</span>
            </button>
          </div>

          {/* Condition Rows */}
          {spec.conditions.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-3 italic">
              No custom filters active. Currently selecting all registered customers.
            </div>
          ) : (
            <div className="space-y-2">
              {spec.conditions.map((cond, idx) => (
                <div
                  key={cond.id || idx}
                  className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800/80 p-2.5 rounded-xl text-xs"
                >
                  {/* Field Selector */}
                  <select
                    value={cond.field}
                    onChange={(e) => handleUpdateCondition(idx, 'field', e.target.value as SegmentField)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-500"
                  >
                    <option value="lifetime_spend">Lifetime Spend (₹)</option>
                    <option value="monthly_spend">High Monthly Spend (₹)</option>
                    <option value="visit_count">Visit Count</option>
                    <option value="last_visit_date">Last Visit Date</option>
                    <option value="purchase_category">Product / Category Preference</option>
                    <option value="purchase_date">Transaction Date</option>
                  </select>

                  {/* Operator Selector */}
                  <select
                    value={cond.operator}
                    onChange={(e) => handleUpdateCondition(idx, 'operator', e.target.value as SegmentOperator)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-500"
                  >
                    {cond.field === 'purchase_category' ? (
                      <>
                        <option value="equals">is category</option>
                        <option value="contains">contains item keyword</option>
                      </>
                    ) : cond.field === 'last_visit_date' ? (
                      <>
                        <option value="within_last_days">within last X days</option>
                        <option value="before">before date (older than)</option>
                        <option value="after">after date (newer than)</option>
                      </>
                    ) : (
                      <>
                        <option value="greater_than">greater than (&gt;)</option>
                        <option value="less_than">less than (&lt;)</option>
                        <option value="equals">equals (=)</option>
                      </>
                    )}
                  </select>

                  {/* Value Input */}
                  {cond.field === 'purchase_category' ? (
                    <select
                      value={cond.value}
                      onChange={(e) => handleUpdateCondition(idx, 'value', e.target.value)}
                      className="bg-slate-950 border border-slate-800 text-amber-400 font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-500"
                    >
                      <option value="saree">Saree Buyers</option>
                      <option value="kids_clothing">Kids Clothing Buyers</option>
                      <option value="menswear">Men's Clothing Buyers</option>
                      <option value="womenswear">Women's Clothing Buyers</option>
                      <option value="ethnic_wear">Ethnic Wear Buyers</option>
                      <option value="western_wear">Western Wear Buyers</option>
                      <option value="shirts">Shirt Buyers</option>
                      <option value="trousers">Trousers/Bottomwear Buyers</option>
                      <option value="dresses">Dress Buyers</option>
                      <option value="accessories">Accessory Buyers</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => handleUpdateCondition(idx, 'value', e.target.value)}
                      placeholder="e.g. 10000 or 30"
                      className="w-32 bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-500"
                    />
                  )}

                  <button
                    onClick={() => handleRemoveCondition(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded"
                    title="Remove Condition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
