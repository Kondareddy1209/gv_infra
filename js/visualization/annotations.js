/**
 * 3D FLOATING ANNOTATIONS & PROPERTY BILLBOARDS
 * Renders 3D pins, price badges, survey boundaries, and infrastructure markers on real terrain.
 */

(function (global) {
  'use strict';

  class RealEstateAnnotations {
    constructor(viewer) {
      this.viewer = viewer;
      this.pinEntities = new Map();
    }

    /**
     * Add 3D Property Pins with Floating Price & Status Canvas Badges
     */
    addPropertyPins(properties = []) {
      if (!this.viewer || !Array.isArray(properties)) return;

      const defaultProperties = [
        { id: 'p-01', plotNo: '01', price: '₹34.5 L', status: 'available', acres: '0.05 (250 sq.yd)', lat: 17.2485, lng: 80.1365 },
        { id: 'p-02', plotNo: '02', price: '₹36.0 L', status: 'available', acres: '0.05 (260 sq.yd)', lat: 17.2488, lng: 80.1370 },
        { id: 'p-03', plotNo: '03', price: '₹42.0 L', status: 'reserved', acres: '0.06 (300 sq.yd)', lat: 17.2482, lng: 80.1375 },
        { id: 'p-04', plotNo: '04', price: '₹38.5 L', status: 'sold', acres: '0.05 (275 sq.yd)', lat: 17.2479, lng: 80.1368 }
      ];

      const items = properties.length > 0 ? properties : defaultProperties;

      items.forEach(prop => {
        const pinCanvas = this.createPinBadgeCanvas(prop.plotNo, prop.price, prop.status);
        const position = Cesium.Cartesian3.fromDegrees(prop.lng, prop.lat, 12.0); // Floating 12m above ground

        const entity = this.viewer.entities.add({
          id: `prop-pin-${prop.id}`,
          position,
          billboard: {
            image: pinCanvas,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
            scaleByDistance: new Cesium.NearFarScalar(100, 1.0, 3000, 0.4),
            disableDepthTestDistance: Number.POSITIVE_INFINITY // Ensures badge is always crisp and visible
          },
          polyline: {
            positions: [
              Cesium.Cartesian3.fromDegrees(prop.lng, prop.lat, 0),
              Cesium.Cartesian3.fromDegrees(prop.lng, prop.lat, 12.0)
            ],
            width: 2,
            material: Cesium.Color.fromCssColorString(prop.status === 'available' ? '#10B981' : prop.status === 'reserved' ? '#F59E0B' : '#EF4444').withAlpha(0.75),
            clampToGround: false
          },
          properties: prop
        });

        this.pinEntities.set(prop.id, entity);
      });

      console.log(`[3D Annotations] Rendered ${items.length} 3D property billboards floating on terrain`);
    }

    /**
     * Dynamically draw 3D Pin Badge using HTML5 Canvas
     */
    createPinBadgeCanvas(plotNo, price, status) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 70;
      const ctx = canvas.getContext('2d');

      const bgHex = status === 'available' ? '#047857' : status === 'reserved' ? '#B45309' : '#B91C1C';
      const borderHex = status === 'available' ? '#34D399' : status === 'reserved' ? '#FBBF24' : '#F87171';

      // Draw Badge Container Box
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(10, 5, 140, 48, 8);
      ctx.fill();

      // Border Glow
      ctx.strokeStyle = borderHex;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Plot Pill Tag
      ctx.fillStyle = bgHex;
      ctx.beginPath();
      ctx.roundRect(18, 12, 55, 18, 4);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`PLOT #${plotNo}`, 22, 25);

      // Price Label
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(price, 80, 26);

      // Status Subtitle
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px sans-serif';
      ctx.fillText(status.toUpperCase(), 18, 44);

      // Pointer Stem Arrow
      ctx.fillStyle = borderHex;
      ctx.beginPath();
      ctx.moveTo(70, 53);
      ctx.lineTo(90, 53);
      ctx.lineTo(80, 64);
      ctx.closePath();
      ctx.fill();

      return canvas;
    }
  }

  global.RealEstateAnnotations = RealEstateAnnotations;
})(window);
