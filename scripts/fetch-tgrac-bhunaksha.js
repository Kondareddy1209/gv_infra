const https = require('https');
const http = require('http');
const url = require('url');

function fetchJsonNoSSL(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path,
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };

    const req = (parsed.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ rawText: data, status: res.statusCode });
        }
      });
    });

    req.on('error', err => reject(err));
    req.end();
  });
}

async function inspectTGRACBhunaksha() {
  const baseUrl = 'https://tgrac.telangana.gov.in/arcgis/rest/services/Bhunaksha_Folder/Bhunaksha_Cadastral/MapServer';
  console.log(`🔍 Inspecting TGRAC Bhunaksha MapServer: ${baseUrl}`);

  try {
    const mapServerInfo = await fetchJsonNoSSL(`${baseUrl}?f=json`);
    console.log('\n=================== MAPSERVER METADATA ===================');
    console.log(`Service Name: ${mapServerInfo.serviceDescription || mapServerInfo.mapName || 'Bhunaksha Cadastral'}`);
    console.log(`Spatial Reference: ${JSON.stringify(mapServerInfo.spatialReference || mapServerInfo.singleFusedMapCache?.spatialReference)}`);
    
    if (mapServerInfo.layers) {
      console.log('\n=================== LAYERS LIST ===================');
      mapServerInfo.layers.forEach(layer => {
        console.log(`Layer ID [${layer.id}]: ${layer.name} (SubLayer IDs: ${layer.subLayerIds ? layer.subLayerIds.join(', ') : 'None'})`);
      });
    }

    if (mapServerInfo.tables) {
      console.log('\n=================== TABLES LIST ===================');
      mapServerInfo.tables.forEach(table => {
        console.log(`Table ID [${table.id}]: ${table.name}`);
      });
    }

    // Inspect individual layers (0, 1, 2, etc.)
    if (mapServerInfo.layers && mapServerInfo.layers.length > 0) {
      for (const layer of mapServerInfo.layers) {
        console.log(`\n🔍 Inspecting Layer ID [${layer.id}]: ${layer.name}...`);
        const layerInfo = await fetchJsonNoSSL(`${baseUrl}/${layer.id}?f=json`);
        if (layerInfo.fields) {
          console.log(`   Fields found in Layer ${layer.id}:`);
          layerInfo.fields.forEach(field => {
            console.log(`   - ${field.name} (${field.type}) [Alias: ${field.alias}]`);
          });
        } else {
          console.log(`   Layer info: ${JSON.stringify(layerInfo).substring(0, 200)}...`);
        }
      }
    }

  } catch (err) {
    console.error('❌ Failed to fetch Bhunaksha metadata:', err.message);
  }
}

inspectTGRACBhunaksha();
