/**
 * AI GATEWAY TEST SUITE & VERIFICATION SCRIPT
 * Tests OpenRouter, OmniRoute, Ollama, and fallback chain execution.
 * Run with: node scripts/test-ai-gateway.js
 */

const { queryAIGateway, callOpenRouter, callOmniRoute, callOllama } = require('../server/ai-gateway');

const TEST_PROMPT = "Hello, test the AI connection.";

async function runTests() {
  console.log("==========================================================");
  console.log("🚀 TESTING AI GATEWAY PROVIDERS AND FALLBACK CHAIN");
  console.log("==========================================================\n");

  const results = {
    openrouter: { status: 'PENDING' },
    omniroute: { status: 'PENDING' },
    ollama: { status: 'PENDING' },
    fallbackChain: { status: 'PENDING' }
  };

  // 1. Test OpenRouter Connection
  console.log("1️⃣ Testing OpenRouter Provider (Base URL: https://openrouter.ai/api/v1)...");
  try {
    const res = await callOpenRouter([{ role: 'user', content: TEST_PROMPT }]);
    console.log("   ✅ OpenRouter Response Received:");
    console.log(`      Model: ${res.model}`);
    console.log(`      Content: "${res.content.trim().slice(0, 150)}..."\n`);
    results.openrouter = { status: 'SUCCESS', model: res.model, content: res.content };
  } catch (err) {
    console.log(`   ❌ OpenRouter Notice: ${err.message}\n`);
    results.openrouter = { status: 'FAILED', error: err.message };
  }

  // 2. Test OmniRoute Connection
  console.log("2️⃣ Testing OmniRoute Provider (Base URL: http://localhost:20128/v1)...");
  try {
    const res = await callOmniRoute([{ role: 'user', content: TEST_PROMPT }]);
    console.log("   ✅ OmniRoute Response Received:");
    console.log(`      Model: ${res.model}`);
    console.log(`      Content: "${res.content.trim().slice(0, 150)}..."\n`);
    results.omniroute = { status: 'SUCCESS', model: res.model, content: res.content };
  } catch (err) {
    console.log(`   ❌ OmniRoute Notice: ${err.message}\n`);
    results.omniroute = { status: 'FAILED', error: err.message };
  }

  // 3. Test Ollama Connection
  console.log("3️⃣ Testing Ollama Provider (Base URL: http://localhost:11434/v1)...");
  try {
    const res = await callOllama([{ role: 'user', content: TEST_PROMPT }]);
    console.log("   ✅ Ollama Response Received:");
    console.log(`      Model: ${res.model}`);
    console.log(`      Content: "${res.content.trim().slice(0, 150)}..."\n`);
    results.ollama = { status: 'SUCCESS', model: res.model, content: res.content };
  } catch (err) {
    console.log(`   ❌ Ollama Notice: ${err.message}\n`);
    results.ollama = { status: 'FAILED', error: err.message };
  }

  // 4. Test Unified Gateway & Automatic Fallback Chain
  console.log("4️⃣ Testing AI Gateway Automatic Fallback Chain (Ollama -> OmniRoute -> OpenRouter)...");
  try {
    const res = await queryAIGateway({ prompt: TEST_PROMPT, provider: 'auto' });
    console.log("   ✅ AI Gateway Fallback Execution Succeeded:");
    console.log(`      Active Provider: ${res.provider.toUpperCase()}`);
    console.log(`      Model: ${res.model}`);
    console.log(`      Fallback Chain Path: ${res.fallbackChainUsed ? res.fallbackChainUsed.join(' ➔ ') : 'Direct'}`);
    console.log(`      Response: "${res.content.trim().slice(0, 150)}..."\n`);
    results.fallbackChain = { 
      status: 'SUCCESS', 
      activeProvider: res.provider, 
      model: res.model, 
      path: res.fallbackChainUsed 
    };
  } catch (err) {
    console.log(`   ❌ AI Gateway Fallback Error: ${err.message}\n`);
    results.fallbackChain = { status: 'FAILED', error: err.message };
  }

  console.log("==========================================================");
  console.log("📊 TEST SUMMARY RESULT:");
  console.log("==========================================================");
  console.log(`OpenRouter Status : ${results.openrouter.status}`);
  console.log(`OmniRoute Status  : ${results.omniroute.status}`);
  console.log(`Ollama Status     : ${results.ollama.status}`);
  console.log(`Gateway Fallback  : ${results.fallbackChain.status}`);
  console.log("==========================================================\n");

  return results;
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
