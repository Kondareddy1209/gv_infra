/**
 * AI STRUCTURED QUERY PLANNER
 * Converts natural language user queries into safe, validated JSON filter parameters
 * for PostGIS spatial queries. Enforces strict parameter validation to prevent raw SQL execution.
 */

import { queryAIGateway } from './ai-gateway.js';

/**
 * Structured Query Filter JSON Schema definition
 */
const SYSTEM_PLANNER_PROMPT = `You are a spatial query intent planner for a Khammam real estate GIS platform.
Your job is to parse natural language user queries into a JSON filter object.
Do NOT output raw SQL. Return ONLY valid JSON matching this schema:

{
  "intent": "search_plots" | "identify_survey" | "general_info",
  "status": "available" | "reserved" | "sold" | "all",
  "facing": "North" | "East" | "West" | "South" | "all",
  "max_price": number | null,
  "min_price": number | null,
  "max_area_sqyards": number | null,
  "near_landmark": string | null
}

Examples:
User: "Show East-facing plots under 40 lakhs"
JSON: {"intent":"search_plots","status":"available","facing":"East","max_price":4000000,"min_price":null,"max_area_sqyards":null,"near_landmark":null}
`;

/**
 * Parse Natural Language Prompt into Validated Filter Object
 */
async function parseUserIntent(prompt, provider = 'auto') {
  try {
    const aiResult = await queryAIGateway({
      prompt,
      provider,
      systemPrompt: SYSTEM_PLANNER_PROMPT
    });

    let filter = {};
    try {
      const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        filter = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('[AI Query Planner] Could not parse LLM output as JSON, using default fallback filter');
    }

    // Sanitize & validate fields
    return {
      intent: filter.intent || 'search_plots',
      status: ['available', 'reserved', 'sold'].includes(filter.status) ? filter.status : 'all',
      facing: ['North', 'East', 'West', 'South'].includes(filter.facing) ? filter.facing : 'all',
      max_price: typeof filter.max_price === 'number' && filter.max_price > 0 ? filter.max_price : null,
      min_price: typeof filter.min_price === 'number' && filter.min_price > 0 ? filter.min_price : null,
      max_area_sqyards: typeof filter.max_area_sqyards === 'number' ? filter.max_area_sqyards : null,
      raw_prompt: prompt
    };
  } catch (err) {
    console.error('[AI Query Planner] Error parsing intent:', err.message);
    return {
      intent: 'search_plots',
      status: 'all',
      facing: 'all',
      max_price: null,
      min_price: null,
      raw_prompt: prompt,
      error: err.message
    };
  }
}

/**
 * Build Parameterized SQL Query from Validated Filter (NO RAW SQL STRINGS FROM LLM)
 */
function buildParameterizedSQL(filter) {
  const conditions = [];
  const values = [];
  let paramIdx = 1;

  let sql = `
    SELECT id, plot_number, survey_number, extent_sqyards, facing, status, price_per_sqyard, total_price,
           ST_AsGeoJSON(boundary) AS boundary_geojson
    FROM land_parcels
    WHERE 1=1
  `;

  if (filter.status && filter.status !== 'all') {
    conditions.push(`status = $${paramIdx++}`);
    values.push(filter.status);
  }

  if (filter.facing && filter.facing !== 'all') {
    conditions.push(`facing = $${paramIdx++}`);
    values.push(filter.facing);
  }

  if (filter.max_price) {
    conditions.push(`total_price <= $${paramIdx++}`);
    values.push(filter.max_price);
  }

  if (conditions.length > 0) {
    sql += ' AND ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY plot_number ASC LIMIT 50;';

  return { sql, values };
}

export {
  parseUserIntent,
  buildParameterizedSQL
};
