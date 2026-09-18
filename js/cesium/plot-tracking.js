/**
 * PLOT-TRACKING.JS
 * Plot Selection & Click Interaction Manager
 *
 * Handles plot selection, entity picking, detail view updates, and state management.
 * Integrates with the admin panel for real-time inventory updates.
 *
 * Usage:
 *   const tracker = new PlotTracker(viewer, cameraDirector, config);
 *   tracker.enableClickSelection();
 *   tracker.selectPlot(plotId);
 */

class PlotTracker {
  constructor(viewer, cameraDirector, config = {}) {
    this.viewer = viewer;
    this.cameraDirector = cameraDirector;
    this.config = config;
    this.selectedPlot = null;
    this.selectedEntity = null;
    this.plotMap = new Map(); // id -> entity
    this.clickHandler = null;
    this.isClickEnabled = false;
    this.highlights = {
      previousColor: null,
      previousOpacity: null
    };
  }

  /**
   * Enable mouse click selection
   */
  enableClickSelection() {
    if (this.isClickEnabled) {
      Logger.warn('Cesium', '[PlotTracker] Click selection already enabled');
      return;
    }

    this.clickHandler = Cesium.ScreenSpaceEventHandler.getInputAction(
      this.viewer.screenSpaceEventHandler,
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.canvas);

    handler.setInputAction((click) => {
      const pickedObject = Cesium.defaultLeftClick(this.viewer, click);
      if (!Cesium.defined(pickedObject)) {
        this.deselectPlot();
        return;
      }

      const entity = pickedObject.id;
      if (entity && entity.polygon) {
        this.selectPlotByEntity(entity);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    this.isClickEnabled = true;
    Logger.info('Cesium', '[PlotTracker] Click selection enabled');
  }

  /**
   * Select plot by entity (from click)
   */
  selectPlotByEntity(entity) {
    try {
      // Extract plot info from entity description/name
      const entityName = entity.name || '';
      const plotId = this.extractPlotIdFromEntity(entityName);

      if (plotId) {
        this.selectPlot(plotId, entity);
      }

    } catch (err) {
      Logger.error('Cesium', '[PlotTracker] Error selecting plot:', err);
    }
  }

  /**
   * Select plot by ID
   * @param {string} plotId - Plot ID or name
   * @param {Object} entity - Cesium entity (optional)
   */
  selectPlot(plotId, entity = null) {
    try {
      // Deselect previous
      if (this.selectedPlot) {
        this.deselectPlot();
      }

      // Find plot in data
      const plot = this.findPlotById(plotId);
      if (!plot) {
        Logger.error('Cesium', `[PlotTracker] Plot not found: ${plotId}`);
        return;
      }

      // Find or get entity
      if (!entity) {
        entity = this.plotMap.get(plotId);
      }

      // Set selection
      this.selectedPlot = plot;
      this.selectedEntity = entity;

      // Highlight selected entity
      if (entity && entity.polygon) {
        this.highlightEntity(entity);
      }

      // Update detail view
      this.updateDetailView(plot);

      // Animate camera to plot
      this.cameraDirector.flyToPlot(plot, 1.5);

      // Emit selection event
      this.emitSelectionEvent(plot);

      Logger.info('Cesium', `[PlotTracker] Selected plot: ${plotId}`);

    } catch (err) {
      Logger.error('Cesium', '[PlotTracker] Error selecting plot:', err);
    }
  }

  /**
   * Deselect current plot
   */
  deselectPlot() {
    if (this.selectedEntity && this.selectedEntity.polygon) {
      // Restore original styling
      if (this.highlights.previousColor) {
        this.selectedEntity.polygon.material = this.highlights.previousColor;
      }
      if (this.highlights.previousOpacity !== null) {
        this.selectedEntity.polygon.material.color.alpha = this.highlights.previousOpacity;
      }
    }

    this.selectedPlot = null;
    this.selectedEntity = null;
    this.highlights = { previousColor: null, previousOpacity: null };

    // Hide detail view
    this.hideDetailView();

    // Emit deselection event
    this.emitDeselectionEvent();

    Logger.info('Cesium', '[PlotTracker] Plot deselected');
  }

  /**
   * Highlight selected entity with visual emphasis
   */
  highlightEntity(entity) {
    if (!entity || !entity.polygon) return;

    // Save original styling
    const originalMaterial = entity.polygon.material;
    const originalOpacity = originalMaterial?.color?.alpha ?? 0.5;

    this.highlights.previousColor = originalMaterial;
    this.highlights.previousOpacity = originalOpacity;

    // Apply highlight styling
    const highlightColor = Cesium.Color.fromCssColorString('#FFD700').withAlpha(0.8);
    entity.polygon.material = new Cesium.ColorMaterialProperty(highlightColor);
    entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#FFA500');
    entity.polygon.outlineWidth = 4.0;
  }

  /**
   * Register plot entity in the tracker
   * @param {string} plotId - Plot identifier
   * @param {Object} entity - Cesium entity
   */
  registerPlotEntity(plotId, entity) {
    this.plotMap.set(plotId, entity);
  }

  /**
   * Find plot data by ID
   */
  findPlotById(plotId) {
    if (window.GV_DATA && window.GV_DATA.getAdminParcels) {
      const parcels = window.GV_DATA.getAdminParcels();
      return parcels.find(p =>
        p.id === plotId ||
        p.title === plotId ||
        p.title.includes(plotId)
      );
    }

    return null;
  }

  /**
   * Extract plot ID from entity name
   */
  extractPlotIdFromEntity(entityName) {
    // Parse entity name format: "Plot Name (Survey Sy. 123)"
    const match = entityName.match(/^(.*?)\s*\(/);
    return match ? match[1].trim() : entityName;
  }

  /**
   * Update detail view panel with plot info
   */
  updateDetailView(plot) {
    const drawer = document.getElementById('plot-detail-drawer');
    if (!drawer) {
      Logger.warn('Cesium', '[PlotTracker] Plot detail drawer not found in DOM');
      return;
    }

    const html = this.generatePlotDetailHTML(plot);
    drawer.innerHTML = html;

    // Show drawer
    drawer.classList.add('visible');

    // Bind action handlers
    this.bindDetailViewActions(plot);
  }

  /**
   * Generate HTML for plot detail view
   */
  generatePlotDetailHTML(plot) {
    const status = plot.status?.toUpperCase() ?? 'UNKNOWN';
    const statusColor = {
      'AVAILABLE': '#16A34A',
      'RESERVED': '#D97706',
      'SOLD': '#DC2626'
    }[status] ?? '#6B7280';

    const statusBgColor = {
      'AVAILABLE': '#DCFCE7',
      'RESERVED': '#FEF3C7',
      'SOLD': '#FEE2E2'
    }[status] ?? '#F3F4F6';

    return `
      <div class="plot-detail-header">
        <h3>${plot.title || plot.id}</h3>
        <button class="close-btn" onclick="this.closest('#plot-detail-drawer').classList.remove('visible')">✕</button>
      </div>

      <div class="plot-detail-content">
        <div class="detail-section">
          <h4>Location & Survey</h4>
          <p><strong>Survey No:</strong> ${plot.surveyNo ?? 'N/A'}</p>
          <p><strong>Area:</strong> ${plot.areaAcres ?? 0} Acres (${plot.areaSqYds?.toLocaleString() ?? 'N/A'} sq yds)</p>
          <p><strong>Village:</strong> ${plot.village ?? 'N/A'}</p>
          <p><strong>Mandal:</strong> ${plot.mandal ?? 'N/A'}</p>
          <p><strong>District:</strong> ${plot.district ?? 'N/A'}</p>
        </div>

        <div class="detail-section">
          <h4>Property Details</h4>
          <p><strong>Facing:</strong> ${plot.facing ?? 'N/A'}</p>
          <p><strong>Road Width:</strong> ${plot.roadWidth ?? 'N/A'}</p>
          <p><strong>Status:</strong>
            <span style="background: ${statusBgColor}; color: ${statusColor}; padding: 4px 8px; border-radius: 6px; font-weight: bold;">
              ${status}
            </span>
          </p>
        </div>

        <div class="detail-section">
          <h4>Pricing</h4>
          <p><strong>Price per sq yd:</strong> ₹${plot.pricePerSqYd?.toLocaleString() ?? 'N/A'}</p>
          <p><strong>Total Price:</strong> <span class="price">₹${Number(plot.priceTotal ?? 0).toLocaleString("en-IN")}</span></p>
        </div>

        <div class="detail-actions">
          <a href="https://wa.me/919392887268?text=Hi%20GV%20Infra,%20I%20want%20details%20about%20${encodeURIComponent(plot.title ?? plot.id)}"
             target="_blank" rel="noopener" class="action-btn action-whatsapp">
            WhatsApp Enquiry
          </a>
          <a href="tel:+919392887268" class="action-btn action-call">
            Call Sales
          </a>
          <button class="action-btn action-tour" onclick="window.dispatchEvent(new CustomEvent('plot:start-tour', {detail: {plotId: '${plot.id}'}}))">
            Virtual Tour
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Bind detail view action handlers
   */
  bindDetailViewActions(plot) {
    // Virtual tour button
    const tourBtn = document.querySelector('.action-tour');
    if (tourBtn) {
      tourBtn.addEventListener('click', () => {
        this.startPlotTour(plot);
      });
    }
  }

  /**
   * Hide detail view panel
   */
  hideDetailView() {
    const drawer = document.getElementById('plot-detail-drawer');
    if (drawer) {
      drawer.classList.remove('visible');
    }
  }

  /**
   * Start a cinematic tour of the selected plot
   */
  async startPlotTour(plot) {
    if (!plot) return;

    const tour = window.CinematicTour;
    if (!tour) {
      Logger.error('Cesium', '[PlotTracker] CinematicTour not initialized');
      return;
    }

    await tour.createDynamicTour([plot], {
      speed: 1.0,
      dwellTime: 3.0,
      orbitEachPlot: true,
      orbitRadius: 250,
      transitionDuration: 2.0
    });

    await tour.play();
  }

  /**
   * Get selected plot
   */
  getSelectedPlot() {
    return this.selectedPlot;
  }

  /**
   * Get selection status
   */
  getStatus() {
    return {
      hasSelection: this.selectedPlot !== null,
      selectedPlotId: this.selectedPlot?.id ?? null,
      selectedPlotTitle: this.selectedPlot?.title ?? null,
      isClickEnabled: this.isClickEnabled,
      registeredPlots: this.plotMap.size
    };
  }

  // ========== EVENT METHODS ==========

  /**
   * Emit plot selection event
   */
  emitSelectionEvent(plot) {
    window.dispatchEvent(new CustomEvent('plot:selected', {
      detail: { plot }
    }));
  }

  /**
   * Emit plot deselection event
   */
  emitDeselectionEvent() {
    window.dispatchEvent(new CustomEvent('plot:deselected'));
  }
}

// Export for use in main Cesium module
if (typeof window !== 'undefined') {
  window.PlotTracker = PlotTracker;
}
