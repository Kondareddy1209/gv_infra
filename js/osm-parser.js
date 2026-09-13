/* ============================================================
   OSM (OpenStreetMap) Parser & Processor
   Parses local .osm XML files for offline infrastructure mapping
   Supports: amenities, infrastructure, roads, villages
   ============================================================ */

class OSMParser {
  constructor() {
    this.nodes = new Map();
    this.ways = new Map();
    this.relations = new Map();
    this.amenities = [];
    this.infrastructure = [];
    this.roads = [];
  }

  async loadOSMFile(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xmlText = await response.text();
      return this.parseOSMXML(xmlText);
    } catch (error) {
      console.error('[OSMParser] Failed to load OSM file:', error);
      throw new Error('Could not load OpenStreetMap data');
    }
  }

  parseOSMXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid OSM XML format');
    }

    // Parse nodes
    xmlDoc.querySelectorAll('node').forEach(node => {
      const id = node.getAttribute('id');
      const lat = parseFloat(node.getAttribute('lat'));
      const lon = parseFloat(node.getAttribute('lon'));

      const tags = {};
      node.querySelectorAll('tag').forEach(tag => {
        tags[tag.getAttribute('k')] = tag.getAttribute('v');
      });

      this.nodes.set(id, {
        id,
        lat,
        lon,
        tags
      });

      // Extract amenities and infrastructure
      this.extractAmenity(id, lat, lon, tags);
    });

    // Parse ways (roads, paths)
    xmlDoc.querySelectorAll('way').forEach(way => {
      const id = way.getAttribute('id');
      const nodeIds = [];
      way.querySelectorAll('nd').forEach(nd => {
        nodeIds.push(nd.getAttribute('ref'));
      });

      const tags = {};
      way.querySelectorAll('tag').forEach(tag => {
        tags[tag.getAttribute('k')] = tag.getAttribute('v');
      });

      this.ways.set(id, {
        id,
        nodeIds,
        tags
      });

      // Extract roads
      this.extractRoad(id, nodeIds, tags);
    });

    return {
      nodeCount: this.nodes.size,
      wayCount: this.ways.size,
      amenitiesCount: this.amenities.length,
      infrastructureCount: this.infrastructure.length,
      roadsCount: this.roads.length
    };
  }

  extractAmenity(id, lat, lon, tags) {
    const amenityTypes = {
      health_post: { icon: '🏥', category: 'healthcare' },
      hospital: { icon: '🏥', category: 'healthcare' },
      clinic: { icon: '⚕️', category: 'healthcare' },
      pharmacy: { icon: '💊', category: 'healthcare' },
      school: { icon: '🎓', category: 'education' },
      university: { icon: '📚', category: 'education' },
      restaurant: { icon: '🍽️', category: 'food' },
      cafe: { icon: '☕', category: 'food' },
      bank: { icon: '🏦', category: 'finance' },
      atm: { icon: '💳', category: 'finance' },
      police: { icon: '🚔', category: 'safety' },
      fire_station: { icon: '🚒', category: 'safety' },
      parking: { icon: '🅿️', category: 'transport' },
      fuel: { icon: '⛽', category: 'transport' },
      bus_station: { icon: '🚌', category: 'transport' },
      railway_station: { icon: '🚂', category: 'transport' },
      park: { icon: '🌳', category: 'recreation' },
      playground: { icon: '🎪', category: 'recreation' },
      market: { icon: '🛒', category: 'shopping' },
      mall: { icon: '🏬', category: 'shopping' },
      supermarket: { icon: '🛍️', category: 'shopping' },
      library: { icon: '📖', category: 'culture' },
      museum: { icon: '🏛️', category: 'culture' }
    };

    for (const [amenityKey, amenityInfo] of Object.entries(amenityTypes)) {
      if (tags.amenity === amenityKey || tags['name:en'] === amenityKey) {
        this.amenities.push({
          id,
          lat,
          lon,
          name: tags.name || tags['name:en'] || amenityKey,
          type: amenityKey,
          icon: amenityInfo.icon,
          category: amenityInfo.category,
          tags
        });
        return;
      }
    }

    // Check for other tags
    if (tags.place === 'village') {
      this.amenities.push({
        id,
        lat,
        lon,
        name: tags.name || 'Village',
        type: 'village',
        icon: '🏘️',
        category: 'location',
        tags
      });
    }
  }

  extractRoad(id, nodeIds, tags) {
    const roadTypes = {
      motorway: 'major',
      trunk: 'major',
      primary: 'major',
      secondary: 'main',
      tertiary: 'main',
      residential: 'local',
      service: 'local',
      pedestrian: 'path',
      footway: 'path',
      path: 'path'
    };

    const highway = tags.highway;
    if (highway && roadTypes[highway]) {
      const coordinates = nodeIds
        .map(id => this.nodes.get(id))
        .filter(node => node !== undefined)
        .map(node => [node.lon, node.lat]);

      if (coordinates.length > 1) {
        this.roads.push({
          id,
          coordinates,
          name: tags.name || '',
          type: roadTypes[highway],
          highway,
          tags
        });
      }
    }
  }

  getAmenitiesByCategory(category) {
    return this.amenities.filter(a => a.category === category);
  }

  getAmenitiesByType(type) {
    return this.amenities.filter(a => a.type === type);
  }

  getNearby(lat, lon, radiusKm = 2) {
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371; // Earth radius in km

    return this.amenities.filter(amenity => {
      const dLat = toRad(amenity.lat - lat);
      const dLon = toRad(amenity.lon - lon);
      const a = Math.sin(dLat/2) ** 2 +
                Math.cos(toRad(lat)) * Math.cos(toRad(amenity.lat)) * Math.sin(dLon/2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      return distance <= radiusKm;
    }).sort((a, b) => {
      const distA = this.calculateDistance(lat, lon, a.lat, a.lon);
      const distB = this.calculateDistance(lat, lon, b.lat, b.lon);
      return distA - distB;
    });
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = deg => deg * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getSummary() {
    const categories = {};
    this.amenities.forEach(a => {
      categories[a.category] = (categories[a.category] || 0) + 1;
    });

    return {
      total: this.amenities.length,
      byCategory: categories,
      roads: this.roads.length,
      area: this.calculateBoundingBox()
    };
  }

  calculateBoundingBox() {
    if (this.nodes.size === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;

    this.nodes.forEach(node => {
      minLat = Math.min(minLat, node.lat);
      maxLat = Math.max(maxLat, node.lat);
      minLon = Math.min(minLon, node.lon);
      maxLon = Math.max(maxLon, node.lon);
    });

    return {
      bounds: [[minLat, minLon], [maxLat, maxLon]],
      center: [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
    };
  }

  exportGeoJSON() {
    const features = this.amenities.map(amenity => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [amenity.lon, amenity.lat]
      },
      properties: {
        id: amenity.id,
        name: amenity.name,
        type: amenity.type,
        category: amenity.category,
        icon: amenity.icon
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }
}

// Export for use
window.OSMParser = OSMParser;
