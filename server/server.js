/**
 * KHAMMAM 3D REAL ESTATE GIS - PHASE 1 BACKEND SERVER
 * Zero-dependency native HTTP REST API server with PostGIS query builder & AI Gateway.
 */

const http = require('http');
const db = require('./db/pool');
const { queryAIGateway } = require('./ai-gateway');
const { parseUserIntent, buildParameterizedSQL } = require('./ai-query-planner');

const PORT = process.env.PORT || 3001;

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health Check: GET /api/health
  if (req.method === 'GET' && url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'Khammam 3D Real Estate GIS API (Phase 1)',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // District Boundary: GET /api/gis/khammam/boundary
  if (req.method === 'GET' && url.pathname === '/api/gis/khammam/boundary') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Khammam District', state: 'Telangana', code: 'KM' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [80.0500, 17.1500], [80.3000, 17.1500],
              [80.3000, 17.3500], [80.0500, 17.3500],
              [80.0500, 17.1500]
            ]]
          }
        }
      ]
    }));
    return;
  }

  // Plot Search: GET /api/gis/plots/search
  if (req.method === 'GET' && url.pathname === '/api/gis/plots/search') {
    const facing = url.searchParams.get('facing') || 'all';
    const status = url.searchParams.get('status') || 'all';
    const max_price = url.searchParams.get('max_price') ? parseFloat(url.searchParams.get('max_price')) : null;

    const filter = { facing, status, max_price };
    const { sql, values } = buildParameterizedSQL(filter);

    try {
      const result = await db.query(sql, values);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        count: result.rows.length,
        filter,
        data: result.rows
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Point-in-Polygon Lookup: GET /api/gis/plots/at/:lat/:lng
  if (req.method === 'GET' && url.pathname.startsWith('/api/gis/plots/at/')) {
    const parts = url.pathname.replace('/api/gis/plots/at/', '').split('/');
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      queryCoordinates: { lat, lng },
      matchedPlot: {
        plot_number: '01',
        survey_number: '45-A',
        village: 'Gurralapadu',
        facing: 'East',
        status: 'available',
        price_per_sqyard: 18500,
        extent_sqyards: 250
      }
    }));
    return;
  }

  // AI Structured Query: POST /api/ai/query (SAFE: NL -> JSON Schema -> Parameterized SQL)
  if (req.method === 'POST' && url.pathname === '/api/ai/query') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const userPrompt = payload.query || payload.prompt || 'Show available plots';
        const provider = payload.provider || 'auto';

        // 1. Convert Natural Language into Structured JSON Filter
        const filter = await parseUserIntent(userPrompt, provider);

        // 2. Build Safe Parameterized SQL (Zero Raw LLM SQL String Execution)
        const { sql, values } = buildParameterizedSQL(filter);

        // 3. Execute Query against PostGIS / GeoJSON Fallback
        const result = await db.query(sql, values);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          interpreted_filters: filter,
          sql_generated: sql,
          results_count: result.rows.length,
          data: result.rows
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // AI Chat Gateway: POST /api/ai/chat
  if (req.method === 'POST' && url.pathname === '/api/ai/chat') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { prompt, messages, provider = 'auto', systemPrompt } = payload;
        const response = await queryAIGateway({ prompt, messages, provider, systemPrompt });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Test Endpoint: GET /api/ai/test
  if (req.method === 'GET' && url.pathname === '/api/ai/test') {
    try {
      const result = await queryAIGateway({ prompt: 'Hello, test the AI connection.', provider: 'auto' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 404 Fallback
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`🤖 Khammam 3D GIS Server (Phase 1) running on http://localhost:${PORT}`);
    console.log(`   - Health Check : http://localhost:${PORT}/api/health`);
    console.log(`   - Plot Search  : http://localhost:${PORT}/api/gis/plots/search`);
    console.log(`   - AI Query     : POST http://localhost:${PORT}/api/ai/query`);
    console.log(`   - AI Chat      : POST http://localhost:${PORT}/api/ai/chat`);
  });
}

module.exports = server;
