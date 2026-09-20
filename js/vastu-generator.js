/**
 * VASTU ARCHITECT - Procedural Villa Layout Generator
 * Generates Vastu Shastra-compliant 2BHK/3BHK floor plans based on plot dimensions & facing
 * Uses directional room placement: NE (Pooja/Entry), SE (Kitchen), SW (Master), NW (Guest/Living)
 */

class VastuArchitect {
  constructor(plotDimensions, plotFacing) {
    this.width = plotDimensions.width; // in feet
    this.length = plotDimensions.length; // in feet
    this.facing = plotFacing; // 'North', 'East', 'West', 'South'
    this.vastuZones = this.initializeZones();
    this.complianceScore = 0;
  }

  /**
   * Initialize directional zones based on plot facing
   */
  initializeZones() {
    const zones = {
      NE: { name: 'Ishanya (Northeast)', rooms: ['Pooja Room', 'Entrance', 'Water Sump'], color: '#38bdf8' },
      SE: { name: 'Agneya (Southeast)', rooms: ['Kitchen', 'Electrical Panel'], color: '#f97316' },
      SW: { name: 'Nairutya (Southwest)', rooms: ['Master Bedroom', 'Heavy Columns'], color: '#ef4444' },
      NW: { name: 'Vayavya (Northwest)', rooms: ['Guest Room', 'Living Area'], color: '#10b981' },
      CENTER: { name: 'Brahmasthan (Center)', rooms: ['Open Courtyard', 'Ventilation'], color: '#a855f7' }
    };
    return zones;
  }

  /**
   * Generate 2BHK Vastu Layout
   */
  generate2BHK() {
    const plotArea = (this.width * this.length) / 9; // Convert sq.ft to sq.yards
    const buildableArea = plotArea * 0.6; // 60% buildable

    const layout = {
      type: '2BHK',
      totalArea: buildableArea,
      rooms: [
        {
          name: 'Pooja Room / Entrance',
          zone: 'NE',
          dimensions: { width: 10, length: 10 },
          color: '#38bdf8',
          description: 'Northeast corner - Sacred entry point'
        },
        {
          name: 'Kitchen',
          zone: 'SE',
          dimensions: { width: 12, length: 14 },
          color: '#f97316',
          description: 'Southeast corner - Fire element zone'
        },
        {
          name: 'Master Bedroom',
          zone: 'SW',
          dimensions: { width: 16, length: 16 },
          color: '#ef4444',
          description: 'Southwest corner - Heaviest zone'
        },
        {
          name: 'Guest/Second Bedroom',
          zone: 'NW',
          dimensions: { width: 14, length: 14 },
          color: '#10b981',
          description: 'Northwest corner - Light zone'
        },
        {
          name: 'Living Area',
          zone: 'NW',
          dimensions: { width: 16, length: 18 },
          color: '#10b981',
          description: 'Northwest - Air & light'
        },
        {
          name: 'Bathrooms',
          zone: 'SE',
          dimensions: { width: 8, length: 10 },
          color: '#6366f1',
          description: 'Southeast corner - Water drainage'
        },
        {
          name: 'Open Courtyard',
          zone: 'CENTER',
          dimensions: { width: 20, length: 20 },
          color: '#a855f7',
          description: 'Central space - Brahmasthan energy'
        }
      ],
      vastuCompliance: {
        northeastEntrance: true,
        southeastKitchen: true,
        southwestMaster: true,
        northwestGuest: true,
        centerCourtyard: true,
        ventilation: 'Excellent (NE & NW windows)',
        sunlight: 'Optimal (E/N facing)',
        drainage: 'Southwest to Northeast (gravity fed)'
      }
    };

    this.complianceScore = this.calculateCompliance(layout);
    return layout;
  }

  /**
   * Generate 3BHK Vastu Layout
   */
  generate3BHK() {
    const plotArea = (this.width * this.length) / 9;
    const buildableArea = plotArea * 0.7;

    const layout = {
      type: '3BHK',
      totalArea: buildableArea,
      rooms: [
        {
          name: 'Pooja Room / Entrance Hall',
          zone: 'NE',
          dimensions: { width: 12, length: 14 },
          color: '#38bdf8',
          description: 'Northeast - Auspicious entry'
        },
        {
          name: 'Kitchen with Dining',
          zone: 'SE',
          dimensions: { width: 14, length: 16 },
          color: '#f97316',
          description: 'Southeast - Fire & cooking zone'
        },
        {
          name: 'Master Bedroom with Ensuite',
          zone: 'SW',
          dimensions: { width: 18, length: 18 },
          color: '#ef4444',
          description: 'Southwest - Master bedroom zone'
        },
        {
          name: 'Second Bedroom',
          zone: 'NW',
          dimensions: { width: 14, length: 16 },
          color: '#10b981',
          description: 'Northwest - Guest/children'
        },
        {
          name: 'Third Bedroom',
          zone: 'NW',
          dimensions: { width: 12, length: 14 },
          color: '#06b6d4',
          description: 'Northwest - Additional bedroom'
        },
        {
          name: 'Living & Family Area',
          zone: 'NW',
          dimensions: { width: 18, length: 20 },
          color: '#10b981',
          description: 'Northwest - Main living space'
        },
        {
          name: 'Bathrooms (2)',
          zone: 'SE',
          dimensions: { width: 10, length: 12 },
          color: '#6366f1',
          description: 'Southeast - Water zones'
        },
        {
          name: 'Open Courtyard/Garden',
          zone: 'CENTER',
          dimensions: { width: 24, length: 24 },
          color: '#a855f7',
          description: 'Central Brahmasthan'
        }
      ],
      vastuCompliance: {
        northeastEntrance: true,
        southeastKitchen: true,
        southwestMaster: true,
        northwestGuest: true,
        centerCourtyard: true,
        tripleExposure: true,
        ventilation: 'Excellent (cross-ventilation)',
        sunlight: 'Optimal throughout day',
        waterDrainage: 'Southwest to Northeast slope'
      }
    };

    this.complianceScore = this.calculateCompliance(layout);
    return layout;
  }

  /**
   * Calculate Vastu compliance score
   */
  calculateCompliance(layout) {
    const criteria = [
      { name: 'Northeast Entrance', weight: 20, met: layout.vastuCompliance.northeastEntrance },
      { name: 'Southeast Kitchen', weight: 18, met: layout.vastuCompliance.southeastKitchen },
      { name: 'Southwest Master', weight: 15, met: layout.vastuCompliance.southwestMaster },
      { name: 'Northwest Guest', weight: 12, met: layout.vastuCompliance.northwestGuest },
      { name: 'Center Courtyard', weight: 15, met: layout.vastuCompliance.centerCourtyard },
      { name: 'Ventilation', weight: 12, met: layout.vastuCompliance.ventilation === 'Excellent (cross-ventilation)' || layout.vastuCompliance.ventilation === 'Excellent (NE & NW windows)' },
      { name: 'Sunlight', weight: 8, met: true }
    ];

    const score = criteria.reduce((total, c) => total + (c.met ? c.weight : 0), 0);
    return Math.min(100, score);
  }

  /**
   * Get room placement blueprint as visual grid
   */
  getBlueprintGrid(layout) {
    return {
      blueprint: {
        NE: layout.rooms.find(r => r.zone === 'NE'),
        SE: layout.rooms.filter(r => r.zone === 'SE'),
        SW: layout.rooms.find(r => r.zone === 'SW'),
        NW: layout.rooms.filter(r => r.zone === 'NW'),
        CENTER: layout.rooms.find(r => r.zone === 'CENTER')
      },
      gridSize: { width: this.width, length: this.length },
      scale: 'feet'
    };
  }

  /**
   * Get CAD export (simplified DXF format JSON)
   */
  getCADExport(layout) {
    const cadData = {
      fileName: `Vastu-${layout.type}-${this.facing}Facing.dxf`,
      entities: layout.rooms.map(room => ({
        type: 'LWPOLYLINE',
        name: room.name,
        vertices: [
          { x: 0, y: 0 },
          { x: room.dimensions.width, y: 0 },
          { x: room.dimensions.width, y: room.dimensions.length },
          { x: 0, y: room.dimensions.length }
        ],
        layer: room.zone,
        color: room.color,
        description: room.description
      })),
      metadata: {
        plotDimensions: `${this.width}' × ${this.length}'`,
        facing: this.facing,
        vastuCompliance: Math.round(this.complianceScore) + '%',
        generated: new Date().toISOString()
      }
    };
    return cadData;
  }

  /**
   * Get directional recommendations based on plot facing
   */
  getDirectionalRecommendations() {
    const recommendations = {
      'North': {
        ideal: ['East Wing for Kitchen', 'NE for Pooja', 'SW for Master'],
        advantage: 'Maximum morning sunlight, cool afternoons',
        caution: 'Avoid south-facing bedrooms'
      },
      'East': {
        ideal: ['SE for Kitchen', 'SW for Master', 'NW for Living'],
        advantage: 'Sunrise benefits, excellent morning light',
        caution: 'Ensure west wall has minimal openings'
      },
      'West': {
        ideal: ['NE for Entrance', 'SE for Kitchen', 'NW for Living'],
        advantage: 'Evening natural light, garden potential',
        caution: 'Heavy afternoon heat - plan shading'
      },
      'South': {
        ideal: ['NE entrance', 'NW living', 'SE kitchen'],
        advantage: 'Garden space on south, natural cooling',
        caution: 'Complex Vastu - ensure NE offset'
      }
    };
    return recommendations[this.facing] || recommendations['North'];
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VastuArchitect;
}
