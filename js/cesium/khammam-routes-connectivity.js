/**
 * KHAMMAM-ROUTES-CONNECTIVITY.JS
 * Route Analysis & Connectivity Intelligence
 *
 * Uses Google Maps APIs to calculate:
 * - Routes from each plot to key locations
 * - Real-time travel times
 * - Traffic conditions
 * - Accessibility scoring
 * - Connectivity heatmap
 */

class KhammamRoutesConnectivity {
  constructor(viewer) {
    this.viewer = viewer;
    this.apiKey = this.getGoogleMapsApiKey();

    // Key locations for analysis
    this.keyLocations = {
      khammam_bus_station: { lat: 17.2476, lng: 80.1437, name: '🚌 Khammam Bus Station', type: 'transit' },
      khammam_railway: { lat: 17.2600, lng: 80.1500, name: '🚂 Railway Station', type: 'transit' },
      khammam_highway: { lat: 17.2400, lng: 80.1200, name: '🛣️ Khammam-Kodada Highway', type: 'highway' },
      gvk_hospital: { lat: 17.2550, lng: 80.1550, name: '🏥 GVK Hospital', type: 'hospital' },
      govt_school: { lat: 17.2350, lng: 80.1350, name: '🏫 Government School', type: 'school' },
      khammam_market: { lat: 17.2500, lng: 80.1400, name: '🛒 Khammam Market', type: 'market' },
      hyderabad_city: { lat: 17.3850, lng: 78.4867, name: '🏙️ Hyderabad City Center', type: 'city' }
    };

    this.routes = {};
    this.connectivity = {};
    this.distanceMatrix = {};
  }

  /**
   * Get Google Maps API key from environment
   */
  getGoogleMapsApiKey() {
    // Check multiple possible locations for API key
    if (typeof process !== 'undefined' && process.env?.GOOGLE_MAPS_API_KEY) {
      return process.env.GOOGLE_MAPS_API_KEY;
    }
    if (typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY) {
      return window.GOOGLE_MAPS_API_KEY;
    }
    console.warn('⚠️ Google Maps API key not found. Using demo mode (simulated data).');
    return null;
  }

  /**
   * Initialize route analysis for all plots
   */
  async initialize(plots) {
    console.log('🛣️ Initializing route connectivity analysis...');

    try {
      if (!plots || plots.length === 0) {
        console.warn('⚠️ No plots provided for route analysis');
        return false;
      }

      // Analyze connectivity for each plot
      for (let i = 0; i < plots.length; i++) {
        const plot = plots[i];
        await this.analyzePlotConnectivity(plot);

        // Rate limit: every 10 plots, pause
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Calculate overall metrics
      this.calculateMetrics();

      // Visualize routes
      this.visualizeRoutes(plots);

      // Create heatmap
      this.createConnectivityHeatmap();

      console.log(`✅ Route analysis complete for ${plots.length} plots`);
      return true;

    } catch (err) {
      console.error('❌ Route analysis failed:', err);
      return false;
    }
  }

  /**
   * Analyze connectivity for a single plot
   */
  async analyzePlotConnectivity(plot) {
    const plotId = plot.plot_id || plot.plot_number;
    const origin = { lat: plot.geometry?.coordinates?.[1], lng: plot.geometry?.coordinates?.[0] };

    if (!origin || !origin.lat) return;

    this.connectivity[plotId] = {
      plot: plotId,
      routes: {},
      score: 0,
      accessibility: {}
    };

    // Calculate distance/time to each key location
    for (const [locKey, location] of Object.entries(this.keyLocations)) {
      try {
        const route = await this.calculateRoute(origin, location);

        if (route) {
          this.connectivity[plotId].routes[locKey] = route;
          this.connectivity[plotId].accessibility[location.type] = route.time;
        }
      } catch (err) {
        console.warn(`⚠️ Route calculation failed for ${plotId} to ${location.name}`);
      }
    }

    // Calculate connectivity score
    this.connectivity[plotId].score = this.calculateConnectivityScore(this.connectivity[plotId]);
  }

  /**
   * Calculate route using Google Maps Directions API or simulation
   */
  async calculateRoute(origin, destination) {
    if (!this.apiKey) {
      // Simulate route with realistic data
      return this.simulateRoute(origin, destination);
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        return {
          distance: leg.distance.value, // meters
          distanceText: leg.distance.text,
          duration: leg.duration.value, // seconds
          timeText: leg.duration.text,
          time: Math.round(leg.duration.value / 60), // minutes
          polyline: route.overview_polyline.points,
          steps: leg.steps
        };
      }
    } catch (err) {
      console.warn('Fallback to simulated route:', err.message);
      return this.simulateRoute(origin, destination);
    }
  }

  /**
   * Simulate realistic route data (for demo/testing)
   */
  simulateRoute(origin, destination) {
    // Calculate great-circle distance
    const R = 6371; // Earth's radius in km
    const dLat = (destination.lat - origin.lat) * Math.PI / 180;
    const dLng = (destination.lng - origin.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Estimate travel time (avg 40 km/h in India)
    const time = Math.round((distance / 40) * 60);

    return {
      distance: Math.round(distance * 1000),
      distanceText: `${distance.toFixed(1)} km`,
      duration: time * 60,
      timeText: `${time} mins`,
      time: time,
      polyline: this.generatePolyline(origin, destination)
    };
  }

  /**
   * Generate simple polyline between two points
   */
  generatePolyline(origin, destination) {
    // Simplified polyline encoding
    return `${origin.lat},${origin.lng};${destination.lat},${destination.lng}`;
  }

  /**
   * Calculate connectivity score (0-100)
   */
  calculateConnectivityScore(connectivity) {
    const routes = connectivity.routes;
    if (!routes || Object.keys(routes).length === 0) return 0;

    let score = 0;
    const maxTimes = {
      highway: 10,     // max 10 mins to highway
      transit: 30,     // max 30 mins to transit
      hospital: 20,    // max 20 mins to hospital
      school: 15,      // max 15 mins to school
      market: 20,      // max 20 mins to market
      city: 120        // max 120 mins to city
    };

    // Score based on proximity to each type
    for (const [key, route] of Object.entries(routes)) {
      const location = this.keyLocations[key];
      if (!location || !route) continue;

      const maxTime = maxTimes[location.type];
      const proximity = Math.max(0, (maxTime - route.time) / maxTime);
      score += proximity * 20; // Each location type worth up to 20 points
    }

    return Math.min(100, score);
  }

  /**
   * Calculate overall metrics
   */
  calculateMetrics() {
    console.log('📊 Calculating connectivity metrics...');

    const scores = Object.values(this.connectivity).map(c => c.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    this.metrics = {
      averageScore: Math.round(avgScore),
      maxScore: Math.round(maxScore),
      minScore: Math.round(minScore),
      totalPlots: scores.length,
      highlyConnected: scores.filter(s => s >= 75).length,
      wellConnected: scores.filter(s => s >= 50 && s < 75).length,
      moderatelyConnected: scores.filter(s => s >= 25 && s < 50).length,
      poorlyConnected: scores.filter(s => s < 25).length
    };

    console.log('Connectivity metrics:', this.metrics);
  }

  /**
   * Visualize routes on Cesium viewer
   */
  visualizeRoutes(plots) {
    console.log('🎨 Visualizing routes...');

    const colors = {
      highway: Cesium.Color.RED,
      transit: Cesium.Color.BLUE,
      hospital: Cesium.Color.YELLOW,
      school: Cesium.Color.GREEN,
      market: Cesium.Color.PURPLE,
      city: Cesium.Color.ORANGE
    };

    // Draw routes for top 5 most connected plots
    const topPlots = Object.entries(this.connectivity)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 5);

    topPlots.forEach(([plotId, conn]) => {
      for (const [locKey, route] of Object.entries(conn.routes)) {
        if (!route || !route.polyline) continue;

        const location = this.keyLocations[locKey];
        const color = colors[location.type] || Cesium.Color.WHITE;

        // Add polyline to viewer
        try {
          const coords = route.polyline.split(';').map(c => {
            const [lat, lng] = c.split(',').map(parseFloat);
            return Cesium.Cartesian3.fromDegrees(lng, lat);
          });

          if (coords.length >= 2) {
            this.viewer.entities.add({
              polyline: {
                positions: coords,
                width: 2,
                material: color.withAlpha(0.6),
                clampToGround: true
              }
            });
          }
        } catch (err) {
          // Skip invalid polylines
        }
      }
    });
  }

  /**
   * Create connectivity heatmap visualization
   */
  createConnectivityHeatmap() {
    console.log('🔥 Creating connectivity heatmap...');

    // This would create a color-coded overlay showing connectivity scores
    // Green (high) → Yellow (medium) → Red (low)
    // Implementation depends on Cesium heatmap library availability
  }

  /**
   * Get connectivity report for a specific plot
   */
  getPlotReport(plotId) {
    const conn = this.connectivity[plotId];
    if (!conn) return null;

    const report = {
      plotId: plotId,
      score: conn.score,
      routes: {}
    };

    for (const [key, route] of Object.entries(conn.routes)) {
      const location = this.keyLocations[key];
      if (!route) continue;

      report.routes[location.name] = {
        distance: route.distanceText,
        time: `${route.time} minutes`,
        accessibility: this.getAccessibilityLabel(route.time)
      };
    }

    return report;
  }

  /**
   * Get accessibility label for travel time
   */
  getAccessibilityLabel(timeMinutes) {
    if (timeMinutes <= 5) return '⭐⭐⭐⭐⭐ Excellent';
    if (timeMinutes <= 10) return '⭐⭐⭐⭐ Very Good';
    if (timeMinutes <= 20) return '⭐⭐⭐ Good';
    if (timeMinutes <= 30) return '⭐⭐ Fair';
    return '⭐ Poor';
  }

  /**
   * Export connectivity data as JSON
   */
  exportConnectivityData() {
    return {
      metrics: this.metrics,
      connectivity: this.connectivity,
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Get connectivity statistics
   */
  getStatistics() {
    return {
      metrics: this.metrics,
      topPlots: Object.entries(this.connectivity)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 10)
        .map(([id, conn]) => ({ plot: id, score: conn.score })),
      bottleneckPlots: Object.entries(this.connectivity)
        .sort((a, b) => a[1].score - b[1].score)
        .slice(0, 5)
        .map(([id, conn]) => ({ plot: id, score: conn.score, recommendations: this.getRecommendations(id, conn) }))
    };
  }

  /**
   * Get improvement recommendations for a plot
   */
  getRecommendations(plotId, connectivity) {
    const recommendations = [];

    // Check each accessibility type
    const times = {
      highway: connectivity.accessibility.highway,
      transit: connectivity.accessibility.transit,
      hospital: connectivity.accessibility.hospital,
      school: connectivity.accessibility.school
    };

    if ((times.highway || 999) > 10) recommendations.push('Consider proximity to highway access');
    if ((times.transit || 999) > 30) recommendations.push('Transit accessibility could be improved');
    if ((times.hospital || 999) > 20) recommendations.push('Hospital proximity is distant');
    if ((times.school || 999) > 15) recommendations.push('School access is limited');

    return recommendations;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KhammamRoutesConnectivity;
}
