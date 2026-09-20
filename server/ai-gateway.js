/**
 * AI GATEWAY & PROVIDER ROUTER
 * Unified AI service abstraction supporting Ollama, OmniRoute, and OpenRouter
 * with automatic fallback logic and OpenAI-compatible REST endpoints.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load .env manually if dotenv isn't present
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valParts] = trimmed.split('=');
        const value = valParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key && !process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnv();

// Configuration defaults with environment variables
const CONFIG = {
  openrouter: {
    baseUrl: (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'openrouter/free',
    headers: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Khammam 3D Real Estate GIS'
    })
  },
  omniroute: {
    baseUrl: (process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1').replace(/\/$/, ''),
    apiKey: process.env.OMNIROUTE_API_KEY || '',
    model: process.env.OMNIROUTE_MODEL || 'auto',
    headers: () => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OMNIROUTE_API_KEY || ''}`
    })
  },
  ollama: {
    baseUrl: (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1').replace(/\/$/, ''),
    model: process.env.OLLAMA_MODEL || 'llama3',
    headers: () => ({
      'Content-Type': 'application/json'
    })
  }
};

/**
 * Generic OpenAI-compatible API call helper
 */
async function callOpenAICompatibleEndpoint({ baseUrl, apiKey, model, messages, headers, timeoutMs = 15000 }) {
  const url = `${baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: typeof headers === 'function' ? headers() : headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
    const returnedModel = data.model || model;

    return {
      success: true,
      content,
      model: returnedModel,
      raw: data
    };
  } catch (err) {
    clearTimeout(timer);
    throw new Error(`Endpoint call failed (${url}): ${err.message}`);
  }
}

/**
 * Call Ollama Provider
 */
async function callOllama(messages, customModel) {
  loadEnv();
  const model = customModel || CONFIG.ollama.model;
  const res = await callOpenAICompatibleEndpoint({
    baseUrl: CONFIG.ollama.baseUrl,
    model,
    messages,
    headers: CONFIG.ollama.headers
  });
  return { ...res, provider: 'ollama' };
}

/**
 * Call OmniRoute Local Router Provider
 */
async function callOmniRoute(messages, customModel) {
  loadEnv();
  const key = process.env.OMNIROUTE_API_KEY;
  if (!key || key === 'your_omniroute_api_key_here') {
    throw new Error('OMNIROUTE_API_KEY is missing or unconfigured in .env');
  }
  const model = customModel || CONFIG.omniroute.model;
  const res = await callOpenAICompatibleEndpoint({
    baseUrl: CONFIG.omniroute.baseUrl,
    apiKey: key,
    model,
    messages,
    headers: CONFIG.omniroute.headers
  });
  return { ...res, provider: 'omniroute' };
}

/**
 * Call OpenRouter Provider
 */
async function callOpenRouter(messages, customModel) {
  loadEnv();
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key === 'your_openrouter_api_key_here') {
    throw new Error('OPENROUTER_API_KEY is missing or unconfigured in .env');
  }
  const model = customModel || CONFIG.openrouter.model;
  const res = await callOpenAICompatibleEndpoint({
    baseUrl: CONFIG.openrouter.baseUrl,
    apiKey: key,
    model,
    messages,
    headers: CONFIG.openrouter.headers
  });
  return { ...res, provider: 'openrouter' };
}

/**
 * Main AI Gateway Router with Fallback Chain Execution
 * Fallback order: Ollama/local -> OmniRoute -> OpenRouter free
 */
async function queryAIGateway({ prompt, messages, provider = 'auto', systemPrompt = 'You are a helpful AI real estate & GIS assistant for Khammam, Telangana.' }) {
  loadEnv();

  // Standardize messages format
  let formattedMessages = [];
  if (Array.isArray(messages) && messages.length > 0) {
    formattedMessages = messages;
  } else if (prompt) {
    formattedMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];
  } else {
    throw new Error('Either prompt or messages array must be provided');
  }

  const errors = [];
  const attemptedProviders = [];

  // Direct single provider call if specifically requested
  if (provider === 'ollama') {
    return await callOllama(formattedMessages);
  }
  if (provider === 'omniroute') {
    return await callOmniRoute(formattedMessages);
  }
  if (provider === 'openrouter') {
    return await callOpenRouter(formattedMessages);
  }

  // Fallback Chain: 1. Ollama -> 2. OmniRoute -> 3. OpenRouter
  // 1. Try Ollama (Local)
  try {
    attemptedProviders.push('ollama');
    const result = await callOllama(formattedMessages);
    return { ...result, fallbackChainUsed: attemptedProviders };
  } catch (err) {
    errors.push({ provider: 'ollama', error: err.message });
  }

  // 2. Try OmniRoute (Local Router)
  try {
    attemptedProviders.push('omniroute');
    const result = await callOmniRoute(formattedMessages);
    return { ...result, fallbackChainUsed: attemptedProviders };
  } catch (err) {
    errors.push({ provider: 'omniroute', error: err.message });
  }

  // 3. Try OpenRouter (Cloud Free/Paid)
  try {
    attemptedProviders.push('openrouter');
    const result = await callOpenRouter(formattedMessages);
    return { ...result, fallbackChainUsed: attemptedProviders };
  } catch (err) {
    errors.push({ provider: 'openrouter', error: err.message });
  }

  // All providers failed
  throw new Error(`AI Gateway error - all providers failed in fallback chain (${attemptedProviders.join(' -> ')}). Details: ${JSON.stringify(errors)}`);
}

export {
  queryAIGateway,
  callOllama,
  callOmniRoute,
  callOpenRouter,
  CONFIG
};
