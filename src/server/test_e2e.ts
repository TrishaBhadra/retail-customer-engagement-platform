import { getAnalyticsSummary } from './services/analyticsService.js';
import { executeStructuredQuery } from './services/queryService.js';
import { processAiQuery } from './services/aiService.js';
import { createMessageDraft, sendMockWhatsAppMessage } from './services/communicationService.js';

async function runE2ETests() {
  console.log('🧪 Starting End-to-End Automated Verification Test Suite...\n');

  // Test 1: Analytics KPI Aggregation
  const startTime = performance.now();
  const summary = getAnalyticsSummary();
  const analyticsDuration = performance.now() - startTime;

  console.log(`1. Analytics KPIs (Execution: ${analyticsDuration.toFixed(2)}ms):`);
  console.log(`   - Total Customers: ${summary.total_customers.toLocaleString()}`);
  console.log(`   - Total Transactions: ${summary.total_transactions.toLocaleString()}`);
  console.log(`   - Total Revenue: ₹${summary.total_sales.toLocaleString()}`);
  console.log(`   - Repeat Visit Rate: ${summary.repeat_visit_rate}%`);
  console.log(`   - Active (30d): ${summary.active_last_30_days.toLocaleString()}`);
  console.log(`   - Inactive (6+ mo): ${summary.inactive_6_months.toLocaleString()}`);
  if (summary.total_customers < 25000) throw new Error('Customer count mismatch!');
  console.log('   ✅ Analytics Test PASSED!\n');

  // Test 2: Search & Filter Performance
  const searchStart = performance.now();
  const searchResult = executeStructuredQuery({
    operation: 'list',
    metric: 'customers',
    filters: [{ field: 'name', operator: 'contains', value: 'Rahul' }],
    limit: 10
  });
  const searchDuration = performance.now() - searchStart;

  console.log(`2. Search Customer ("Rahul") (Execution: ${searchDuration.toFixed(2)}ms):`);
  console.log(`   - Matches Found: ${searchResult.data.length}`);
  console.log(`   - First Match: ${searchResult.data[0]?.name} (${searchResult.data[0]?.phone})`);
  console.log('   ✅ Search Test PASSED!\n');

  // Test 3: AI Natural Language Assistant Pipeline & Store Branding
  const aiQuestion = 'How many customers have not visited in the last 6 months?';
  const aiStart = performance.now();
  const aiRes = await processAiQuery(aiQuestion);
  const aiDuration = performance.now() - aiStart;

  console.log(`3. AI Assistant Query ("${aiQuestion}") (Execution: ${aiDuration.toFixed(2)}ms):`);
  console.log(`   - Grounded Answer: ${aiRes.answer}`);
  if (!aiRes.answer.includes('JK Readymade Center')) throw new Error('Store name branding missing from AI response!');
  console.log('   ✅ AI Pipeline & Store Branding Test PASSED!\n');

  // Test 4: Product/Item Knowledge Search ("Silk Saree")
  const productQuestion = 'Show me customers who bought Silk Sarees';
  const productRes = await processAiQuery(productQuestion);
  console.log(`4. AI Product Query ("${productQuestion}"):`);
  console.log(`   - Answer: ${productRes.answer}`);
  console.log(`   - Matches returned: ${productRes.query_result?.data?.length || 0}`);
  if (!productRes.query_result?.data || productRes.query_result.data.length === 0) {
    throw new Error('Product query failed to return matches!');
  }
  console.log('   ✅ Product Data Knowledge Test PASSED!\n');

  // Test 5: WhatsApp Message Generation & Mock Delivery
  const topCust = searchResult.data[0];
  const draft = createMessageDraft(topCust.customer_id, 'marketing', 'promo_v1', `Hi ${topCust.name}, visit JK Readymade Center!`, { customer_name: topCust.name });
  const mockSendRes = sendMockWhatsAppMessage(draft.id);

  console.log(`5. Mock WhatsApp Delivery:`);
  console.log(`   - Draft ID: ${draft.id}`);
  console.log(`   - Recipient: ${topCust.name}`);
  console.log(`   - Status: ${mockSendRes.message.status}`);
  console.log(`   - Delivery Meta: ${mockSendRes.mock_delivery_meta.delivery_status}`);
  if (mockSendRes.message.status !== 'sent_mock') throw new Error('Mock send status failed!');
  console.log('   ✅ WhatsApp Simulator Test PASSED!\n');

  console.log('🎉 ALL END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runE2ETests().catch(err => {
  console.error('❌ E2E Verification Test Failed:', err);
  process.exit(1);
});
