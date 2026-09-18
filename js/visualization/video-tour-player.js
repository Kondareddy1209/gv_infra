/**
 * 3D LAND VIDEO TOUR & CINEMATIC FLYOVER PLAYER
 * Real-time 3D aerial video flythrough experience for Khammam real estate.
 */

(function (global) {
  'use strict';

  class Land3DVideoTourPlayer {
    constructor(viewer) {
      this.viewer = viewer;
      this.isPlaying = false;
      this.currentWaypoint = 0;
      this.animationFrameId = null;

      // Defined 3D Flythrough Camera Waypoints over Khammam / Gurralapadu Land
      this.waypoints = [
        { title: "Khammam City Overview", lat: 17.2473, lng: 80.1514, height: 1200, pitch: -45, heading: 0, duration: 4.0, desc: "3D Aerial perspective of Khammam District & Highway Connectivity" },
        { title: "Gurralapadu Junction", lat: 17.2460, lng: 80.1410, height: 750, pitch: -35, heading: 45, duration: 3.5, desc: "Direct access off the 4-lane Khammam-Kodada Highway" },
        { title: "Stambadri Enclave 3D Masterplan", lat: 17.2485, lng: 80.1365, height: 350, pitch: -30, heading: 120, duration: 5.0, desc: "DTCP-approved 302 Plot Layout with 50ft & 30ft BT Roads" },
        { title: "Central Park & Amenities Zone", lat: 17.2482, lng: 80.1375, height: 180, pitch: -25, heading: 210, duration: 4.0, desc: "8-Acre Central Landscaped Park, Avenue Plantation & Play Areas" },
        { title: "3D Plot Boundary Inspection", lat: 17.2488, lng: 80.1370, height: 120, pitch: -20, heading: 310, duration: 4.5, desc: "Extruded 3D Land Parcels with verified revenue survey boundaries" }
      ];
    }

    /**
     * Start the 3D Land Video Tour Flythrough
     */
    startVideoTour() {
      if (!this.viewer) {
        console.warn('[3D Video Tour] Cesium viewer instance is required');
        return;
      }

      this.isPlaying = true;
      this.currentWaypoint = 0;
      this.renderVideoTourModal();
      this.playNextWaypoint();
    }

    /**
     * Fly smoothly to the next waypoint in 3D space
     */
    playNextWaypoint() {
      if (!this.isPlaying) return;

      if (this.currentWaypoint >= this.waypoints.length) {
        this.currentWaypoint = 0; // Loop 3D video flythrough
      }

      const wp = this.waypoints[this.currentWaypoint];
      this.updateHUDMessage(wp.title, wp.desc, this.currentWaypoint + 1, this.waypoints.length);

      // Smooth 3D camera trajectory
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.height),
        orientation: {
          heading: Cesium.Math.toRadians(wp.heading),
          pitch: Cesium.Math.toRadians(wp.pitch),
          roll: 0
        },
        duration: wp.duration,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
        complete: () => {
          if (!this.isPlaying) return;
          // Hold view for 1.5s before moving to next waypoint
          setTimeout(() => {
            if (this.isPlaying) {
              this.currentWaypoint++;
              this.playNextWaypoint();
            }
          }, 1500);
        }
      });
    }

    /**
     * Pause the 3D Video Tour
     */
    pauseVideoTour() {
      this.isPlaying = false;
      this.viewer.camera.cancelFlight();
      const playBtn = document.getElementById('vtour-play-pause');
      if (playBtn) playBtn.textContent = '▶️ Resume 3D Tour';
    }

    /**
     * Resume the 3D Video Tour
     */
    resumeVideoTour() {
      this.isPlaying = true;
      const playBtn = document.getElementById('vtour-play-pause');
      if (playBtn) playBtn.textContent = '⏸️ Pause 3D Tour';
      this.playNextWaypoint();
    }

    /**
     * Stop and close 3D Video Tour
     */
    stopVideoTour() {
      this.isPlaying = false;
      this.viewer.camera.cancelFlight();
      const modal = document.getElementById('land-3d-video-modal');
      if (modal) modal.remove();
    }

    /**
     * Render 3D Video Player Control Modal UI
     */
    renderVideoTourModal() {
      if (document.getElementById('land-3d-video-modal')) return;

      const modal = document.createElement('div');
      modal.id = 'land-3d-video-modal';
      modal.innerHTML = `
        <div class="vtour-header">
          <div class="vtour-live-tag">
            <span class="vtour-red-dot"></span> 3D LAND FLYOVER VIDEO
          </div>
          <button class="vtour-close-btn" id="vtour-close">&times;</button>
        </div>

        <div class="vtour-info-card">
          <div class="vtour-step-counter" id="vtour-step">LOCATION 1 / 5</div>
          <div class="vtour-title" id="vtour-title">Khammam City Overview</div>
          <div class="vtour-desc" id="vtour-desc">3D Aerial perspective of Khammam District & Highway Connectivity</div>
        </div>

        <div class="vtour-controls">
          <button class="vtour-ctrl-btn" id="vtour-play-pause">⏸️ Pause 3D Tour</button>
          <button class="vtour-ctrl-btn" id="vtour-skip">⏭️ Next Location</button>
          <button class="vtour-ctrl-btn" id="vtour-drone-toggle">🎥 Real Drone Video</button>
        </div>

        <!-- Embedded Aerial Drone Video Layer -->
        <div class="vtour-drone-overlay" id="vtour-drone-container" style="display:none;">
          <video autoplay loop muted playsinline class="vtour-drone-video">
            <source src="https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-residential-neighborhood-41556-large.mp4" type="video/mp4">
          </video>
          <div class="vtour-drone-caption">Gurralapadu Aerial Drone Survey View</div>
        </div>
      `;

      document.body.appendChild(modal);
      this.injectStyles();

      // Bind Modal Buttons
      document.getElementById('vtour-close')?.addEventListener('click', () => this.stopVideoTour());

      document.getElementById('vtour-play-pause')?.addEventListener('click', () => {
        if (this.isPlaying) {
          this.pauseVideoTour();
        } else {
          this.resumeVideoTour();
        }
      });

      document.getElementById('vtour-skip')?.addEventListener('click', () => {
        this.viewer.camera.cancelFlight();
        this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
        this.playNextWaypoint();
      });

      document.getElementById('vtour-drone-toggle')?.addEventListener('click', () => {
        const droneContainer = document.getElementById('vtour-drone-container');
        if (droneContainer) {
          const isHidden = droneContainer.style.display === 'none';
          droneContainer.style.display = isHidden ? 'block' : 'none';
        }
      });
    }

    updateHUDMessage(title, desc, step, total) {
      const stepElem = document.getElementById('vtour-step');
      const titleElem = document.getElementById('vtour-title');
      const descElem = document.getElementById('vtour-desc');

      if (stepElem) stepElem.textContent = `LOCATION ${step} / ${total}`;
      if (titleElem) titleElem.textContent = title;
      if (descElem) descElem.textContent = desc;
    }

    injectStyles() {
      if (document.getElementById('land-3d-video-styles')) return;
      const style = document.createElement('style');
      style.id = 'land-3d-video-styles';
      style.textContent = `
        #land-3d-video-modal {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 520px;
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 14px;
          padding: 16px 20px;
          color: white;
          z-index: 10000;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .vtour-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .vtour-live-tag {
          font-size: 0.75rem;
          font-weight: 700;
          color: #10B981;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .vtour-red-dot {
          width: 8px; height: 8px;
          background: #EF4444;
          border-radius: 50%;
          box-shadow: 0 0 10px #EF4444;
          animation: vtourPulse 1.5s infinite;
        }
        @keyframes vtourPulse {
          0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; }
        }
        .vtour-close-btn {
          background: transparent; border: none; color: #94A3B8; font-size: 1.5rem; cursor: pointer;
        }
        .vtour-close-btn:hover { color: white; }
        .vtour-step-counter {
          font-size: 0.68rem; font-weight: 700; color: #38BDF8; letter-spacing: 0.1em;
        }
        .vtour-title {
          font-size: 1.1rem; font-weight: 700; color: #F8FAFC; margin: 4px 0;
        }
        .vtour-desc {
          font-size: 0.82rem; color: #94A3B8; line-height: 1.4;
        }
        .vtour-controls {
          display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;
        }
        .vtour-ctrl-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .vtour-ctrl-btn:hover { background: #10B981; border-color: #10B981; }

        .vtour-drone-overlay {
          margin-top: 12px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          position: relative;
        }
        .vtour-drone-video {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
        }
        .vtour-drone-caption {
          position: absolute;
          bottom: 8px; left: 8px;
          background: rgba(0, 0, 0, 0.7);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.7rem;
          color: #E2E8F0;
        }
      `;
      document.head.appendChild(style);
    }
  }

  global.Land3DVideoTourPlayer = Land3DVideoTourPlayer;
})(window);
