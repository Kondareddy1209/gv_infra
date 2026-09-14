/* ============================================================
   GV INFRA PROJECTS — Property Concierge Engine & UI
   Modular, production-grade property advisory assistant.
   Grounded strictly in GV_DATA (verified inventory, sanctions & pricing).
   ============================================================ */

(() => {
  'use strict';

  // ==========================================================
  // 1. CONVERSATION ENGINE (Deterministic Advisory Logic)
  // ==========================================================
  class ChatbotEngine {
    constructor() {
      this.llmProvider = null; // Pluggable hook for future backend AI services
      this.state = {
        stage: 'INITIAL',
        pendingLeadField: null,
        leadDraft: {
          name: '',
          phone: '',
          project: 'Stambadri Enclave',
          budget: '',
          size: '',
          facing: '',
          contactMethod: 'Phone',
        },
        searchFilters: {
          facing: 'all',
          size: 'all',
          maxPrice: Infinity,
        }
      };
    }

    /**
     * Optional external LLM adapter registration.
     * @param {Function} providerFn - async (message, context) => responseString | null
     */
    setLLMProvider(providerFn) {
      this.llmProvider = providerFn;
    }

    reset() {
      this.state.stage = 'INITIAL';
      this.state.pendingLeadField = null;
      this.state.searchFilters = { facing: 'all', size: 'all', maxPrice: Infinity };
    }

    /**
     * Primary entry point for user text messages.
     * Returns a structured response object:
     * {
     *   text: string,
     *   chips: Array<{ label: string, action: string, payload?: any, primary?: boolean }>,
     *   items?: Array<object>,
     *   form?: boolean | object
     * }
     */
    async processMessage(rawText) {
      const text = (rawText || '').trim();
      const lower = text.toLowerCase();

      // If an external backend AI service is plugged in, try that first
      if (typeof this.llmProvider === 'function') {
        try {
          const aiResponse = await this.llmProvider(text, {
            state: this.state,
            project: typeof GV_DATA !== 'undefined' ? GV_DATA.project : null,
          });
          if (aiResponse) return aiResponse;
        } catch (err) {
          console.warn('[GV Concierge] LLM provider error, falling back to deterministic rules:', err);
        }
      }

      // 1. Check for Active Lead Form Collection State
      if (this.state.pendingLeadField === 'phone') {
        return this.handlePhoneInput(text);
      }
      if (this.state.pendingLeadField === 'name') {
        return this.handleNameInput(text);
      }

      // 2. Keyword & Intent Recognition
      // Greetings
      if (/^(hi|hello|namaste|hey|greetings|good morning|good afternoon|good evening|vanakkam)\b/i.test(lower)) {
        return {
          text: `Welcome to GV Infra Projects. I am your Property Assistant. How may I assist your property enquiry today?`,
          chips: this.getDefaultQuickActions()
        };
      }

      // Reset / Restart
      if (/^(restart|start over|menu|reset|home|clear)\b/i.test(lower)) {
        this.reset();
        return {
          text: `I've reset our conversation. How can I guide you across our plotted developments?`,
          chips: this.getDefaultQuickActions()
        };
      }

      // Book a Site Visit / Inspection
      if (lower.includes('visit') || lower.includes('inspection') || lower.includes('appointment') || lower.includes('cab') || lower.includes('pickup') || lower.includes('vehicle') || lower.includes('see the site')) {
        return this.handleSiteVisitIntent();
      }

      // 3D Masterplan / Model / Aerial
      if (lower.includes('masterplan') || lower.includes('3d') || lower.includes('model') || lower.includes('drone') || lower.includes('aerial') || lower.includes('walkthrough')) {
        return {
          text: `Stambadri Enclave features a complete interactive 3D Masterplan and 360° drone viewer covering all 302 plotted units, blacktop carriageways, and dedicated parks.`,
          chips: [
            { label: 'Explore 3D Masterplan ↗', action: 'NAVIGATE', payload: 'project.html', primary: true },
            { label: 'Filter Available Plots', action: 'START_PLOT_FINDER' },
            { label: 'Book a Site Visit', action: 'START_SITE_VISIT' },
            { label: 'Main Menu', action: 'MENU' }
          ]
        };
      }

      // Projects / Portfolio / Other ventures
      if (lower.includes('project') || lower.includes('projects') || lower.includes('venture') || lower.includes('ventures') || lower.includes('portfolio') || lower.includes('stambadri') || lower.includes('aleru') || lower.includes('kadthal') || lower.includes('peacock') || lower.includes('gokuldhaam') || lower.includes('sunrise') || lower.includes('maripeda')) {
        return this.handleProjectsQuery(lower);
      }

      // Pricing / Cost / Budget / Rates / EMI
      if (lower.includes('price') || lower.includes('pricing') || lower.includes('cost') || lower.includes('rate') || lower.includes('budget') || lower.includes('lakh') || lower.includes('lakhs') || lower.includes('emi') || lower.includes('loan') || lower.includes('calculator') || lower.includes('how much')) {
        return this.handlePricingQuery(lower);
      }

      // Location / Connectivity / Route / Distance / Khammam
      if (lower.includes('location') || lower.includes('where') || lower.includes('address') || lower.includes('route') || lower.includes('distance') || lower.includes('khammam') || lower.includes('gurralapadu') || lower.includes('highway') || lower.includes('reach') || lower.includes('map') || lower.includes('station') || lower.includes('bus stand')) {
        return this.handleLocationQuery();
      }

      // Legal / Approvals / DTCP / RERA / Title / SUDA
      if (lower.includes('dtcp') || lower.includes('approval') || lower.includes('approvals') || lower.includes('rera') || lower.includes('suda') || lower.includes('sanction') || lower.includes('title') || lower.includes('freehold') || lower.includes('registration') || lower.includes('tlp') || lower.includes('legal')) {
        return this.handleApprovalsQuery();
      }

      // Infrastructure / Specifications / Roads / Parks
      if (lower.includes('road') || lower.includes('roads') || lower.includes('infrastructure') || lower.includes('spec') || lower.includes('specs') || lower.includes('carriageway') || lower.includes('water') || lower.includes('electricity') || lower.includes('park') || lower.includes('parks') || lower.includes('amenit')) {
        return this.handleInfrastructureQuery();
      }

      // Plot Finding / Available Plots / Sizes
      if (lower.includes('plot') || lower.includes('plots') || lower.includes('inventory') || lower.includes('available') || lower.includes('sq yds') || lower.includes('sqft') || lower.includes('facing') || lower.includes('east') || lower.includes('west') || lower.includes('north') || lower.includes('south')) {
        return this.handlePlotSearchQuery(lower);
      }

      // Direct Contact / Call / WhatsApp / Sales Office
      if (lower.includes('call') || lower.includes('phone') || lower.includes('whatsapp') || lower.includes('talk') || lower.includes('agent') || lower.includes('human') || lower.includes('sales') || lower.includes('contact') || lower.includes('office') || lower.includes('number')) {
        return this.handleContactSalesQuery();
      }

      // Default Friendly Fallback with Contextual Assistance
      return {
        text: `I don't have verified information for that specific query. However, as your GV Infra Property Assistant, I can help you with verified project details:`,
        chips: this.getDefaultQuickActions()
      };
    }

    /**
     * Executes actions triggered from UI chips.
     */
    async processAction(action, payload) {
      switch (action) {
        case 'MENU':
          this.reset();
          return {
            text: `How may I assist you with GV Infra's plotted developments?`,
            chips: this.getDefaultQuickActions()
          };

        case 'EXPLORE_PROJECTS':
          return this.handleProjectsQuery('');

        case 'START_PLOT_FINDER':
          this.state.stage = 'PLOT_FILTER_SIZE';
          return {
            text: `Stambadri Enclave features plots ranging from 200 sq.yds (1,800 sq.ft) up to 333 sq.yds (3,000 sq.ft). What plot area are you seeking?`,
            chips: [
              { label: '200 Sq. Yds (1,800 sqft)', action: 'FILTER_SIZE', payload: '1800' },
              { label: '233 Sq. Yds (2,100 sqft)', action: 'FILTER_SIZE', payload: '2100' },
              { label: '267 Sq. Yds (2,400 sqft)', action: 'FILTER_SIZE', payload: '2400' },
              { label: '333 Sq. Yds (3,000 sqft)', action: 'FILTER_SIZE', payload: '3000' },
              { label: 'Show All Sizes', action: 'FILTER_SIZE', payload: 'all' }
            ]
          };

        case 'FILTER_SIZE':
          this.state.searchFilters.size = payload;
          return {
            text: `Great. Do you have a preferred directional orientation (Vastu facing)?`,
            chips: [
              { label: 'East Facing', action: 'FILTER_FACING', payload: 'East' },
              { label: 'West Facing', action: 'FILTER_FACING', payload: 'West' },
              { label: 'North Facing', action: 'FILTER_FACING', payload: 'North' },
              { label: 'Any Facing', action: 'FILTER_FACING', payload: 'all' }
            ]
          };

        case 'FILTER_FACING':
          this.state.searchFilters.facing = payload;
          return this.renderFilteredPlotResults();

        case 'CHECK_PRICING':
          return this.handlePricingQuery('');

        case 'VIEW_MASTERPLAN':
          return {
            text: `Launching the 3D Masterplan allows you to rotate the layout, view carriageways, inspect individual plot boundaries, and see real-time availability.`,
            chips: [
              { label: 'Open 3D Masterplan ↗', action: 'NAVIGATE', payload: 'project.html', primary: true },
              { label: 'Back to Menu', action: 'MENU' }
            ]
          };

        case 'START_SITE_VISIT':
          return this.handleSiteVisitIntent();

        case 'START_LEAD_FORM':
          return {
            text: `Please enter your details below. Our project sales manager will personally prepare your plot shortlist and schedule your inspection:`,
            form: {
              project: this.state.leadDraft.project || 'Stambadri Enclave',
              facing: this.state.searchFilters.facing !== 'all' ? this.state.searchFilters.facing : '',
              size: this.state.searchFilters.size !== 'all' ? this.state.searchFilters.size : ''
            }
          };

        case 'SUBMIT_LEAD_FORM':
          return this.saveLeadSubmission(payload);

        case 'TALK_SALES':
          return this.handleContactSalesQuery();

        case 'SHOW_LOCATION':
          return this.handleLocationQuery();

        case 'SHOW_APPROVALS':
          return this.handleApprovalsQuery();

        default:
          return this.processMessage(action);
      }
    }

    // --- Sub-Handers ---

    getDefaultQuickActions() {
      return [
        { label: 'Explore Projects', action: 'EXPLORE_PROJECTS' },
        { label: 'Find a Plot', action: 'START_PLOT_FINDER' },
        { label: 'View 3D Masterplan', action: 'VIEW_MASTERPLAN' },
        { label: 'Check Pricing & EMI', action: 'CHECK_PRICING' },
        { label: 'Book Site Visit', action: 'START_SITE_VISIT', primary: true },
        { label: 'Talk to Sales', action: 'TALK_SALES' }
      ];
    }

    handleProjectsQuery(query) {
      if (typeof GV_DATA === 'undefined') {
        return { text: `GV Infra Projects develops DTCP-approved plotted communities across Telangana, led by our flagship Stambadri Enclave in Khammam.` };
      }

      const p = GV_DATA.project;
      const others = GV_DATA.otherProjects || [];

      let intro = `<strong>${p.name}</strong> is our flagship 302-plot residential development in ${p.locationShort}. Sanctioned under DTCP ${p.dtcpNumber}.\n\nIn addition, GV Infra markets verified plotted layouts across primary Telangana growth corridors:`;

      const items = [
        {
          title: `${p.name} (Flagship)`,
          price: 'DTCP Sanctioned · 3D Ready',
          meta: `${p.totalPlots} Plotted Units · Khammam–Kodada Highway`,
          link: 'project.html',
          btnLabel: 'Launch 3D Masterplan'
        },
        ...others.slice(0, 3).map(o => ({
          title: o.name,
          price: o.approval,
          meta: o.location,
          link: 'projects.html',
          btnLabel: 'View Venture'
        }))
      ];

      return {
        text: intro,
        items: items,
        chips: [
          { label: 'Find a Plot at Stambadri', action: 'START_PLOT_FINDER', primary: true },
          { label: 'All Projects Portfolio', action: 'NAVIGATE', payload: 'projects.html' },
          { label: 'Book a Site Visit', action: 'START_SITE_VISIT' },
          { label: 'Main Menu', action: 'MENU' }
        ]
      };
    }

    handlePlotSearchQuery(query) {
      // Natural language parameter extraction
      if (query.includes('east')) this.state.searchFilters.facing = 'East';
      else if (query.includes('west')) this.state.searchFilters.facing = 'West';
      else if (query.includes('north')) this.state.searchFilters.facing = 'North';
      else if (query.includes('south')) this.state.searchFilters.facing = 'South';

      if (query.includes('1800') || query.includes('200')) this.state.searchFilters.size = '1800';
      else if (query.includes('2100') || query.includes('233')) this.state.searchFilters.size = '2100';
      else if (query.includes('2400') || query.includes('267')) this.state.searchFilters.size = '2400';
      else if (query.includes('3000') || query.includes('333')) this.state.searchFilters.size = '3000';

      return this.renderFilteredPlotResults();
    }

    renderFilteredPlotResults() {
      if (typeof GV_DATA === 'undefined') {
        return {
          text: `Please explore our 3D Masterplan to inspect available plots.`,
          chips: [{ label: 'View Masterplan', action: 'NAVIGATE', payload: 'project.html' }]
        };
      }

      const allPlots = GV_DATA.getPlots();
      const facing = this.state.searchFilters.facing;
      const size = this.state.searchFilters.size;

      const matching = allPlots.filter(p => {
        if (p.status !== 'available') return false;
        if (facing !== 'all' && p.facing !== facing) return false;
        if (size !== 'all' && String(p.area) !== size) return false;
        return true;
      });

      const count = matching.length;
      const sample = matching.slice(0, 3);

      const facingStr = facing !== 'all' ? `${facing}-facing ` : '';
      const sizeStr = size !== 'all' ? `${size} sq.ft ` : '';

      if (count === 0) {
        return {
          text: `No open plots match that exact combination of ${facingStr}${sizeStr}. However, we have other available plots in the layout. Would you like to inspect all available inventory or speak with a sales advisor?`,
          chips: [
            { label: 'View All Available Plots', action: 'FILTER_SIZE', payload: 'all' },
            { label: 'Talk to Sales Advisor', action: 'TALK_SALES', primary: true },
            { label: 'Main Menu', action: 'MENU' }
          ]
        };
      }

      const items = sample.map(p => ({
        title: `Plot #${p.id} · ${p.facing} Facing`,
        price: GV_DATA.formatINR(p.price),
        meta: `${p.sqYards} Sq. Yds (${p.area} sqft) · ${p.isCorner ? 'Corner Plot' : 'Standard'} · ${p.isParkFacing ? 'Park-Facing' : 'Internal Carriageway'}`,
        link: `project.html?plotId=${p.id}`,
        btnLabel: 'View in 3D'
      }));

      return {
        text: `Found <strong>${count} verified available plots</strong> matching your criteria${facingStr ? ' (' + facingStr + ')' : ''}:`,
        items: items,
        chips: [
          { label: `Explore All in 3D Masterplan (${count}) ↗`, action: 'NAVIGATE', payload: `project.html?facing=${facing}&size=${size}`, primary: true },
          { label: 'Hold or Reserve a Plot', action: 'START_LEAD_FORM' },
          { label: 'Change Criteria', action: 'START_PLOT_FINDER' },
          { label: 'Book Site Inspection', action: 'START_SITE_VISIT' }
        ]
      };
    }

    handlePricingQuery(lower) {
      if (typeof GV_DATA === 'undefined') {
        return { text: `Please contact our sales office for current plot pricing.` };
      }

      return {
        text: `<strong>Fixed Rate Policy:</strong> Per the developer's official brochure, Stambadri Enclave plots are sold at fixed, non-negotiable rates to maintain equity among all purchasers.\n\n` +
              `• <strong>Sample 200 Sq. Yds (1,800 sq.ft):</strong> ~₹36.00 Lakhs\n` +
              `• <strong>Sample 233 Sq. Yds (2,100 sq.ft):</strong> ~₹41.94 Lakhs\n` +
              `• <strong>Sample 267 Sq. Yds (2,400 sq.ft):</strong> ~₹48.06 Lakhs\n` +
              `• <strong>Bank Financing:</strong> Up to 80% eligible bank loan sanction with spot registration assistance.\n` +
              `• <strong>Indicative EMI:</strong> ~₹28,360/month (for ₹28.8L loan @ 8.5% over 15 yrs).`,
        chips: [
          { label: 'Calculate Custom EMI', action: 'NAVIGATE', payload: 'index.html#calculator' },
          { label: 'Request Certified Quotation', action: 'START_LEAD_FORM', primary: true },
          { label: 'Find a Plot Within Budget', action: 'START_PLOT_FINDER' },
          { label: 'Main Menu', action: 'MENU' }
        ]
      };
    }

    handleLocationQuery() {
      return {
        text: `<strong>Stambadri Enclave Location & Regional Axis:</strong>\n\n` +
              `• <strong>Exact Site:</strong> Gurralapadu Village, facing the Khammam–Kodada Highway.\n` +
              `• <strong>Jurisdiction:</strong> Khammam Municipal Corporation / Stambhadri Urban Development Authority (SUDA).\n` +
              `• <strong>Highway Frontage:</strong> Direct 50ft blacktop entrance off the national corridor.\n` +
              `• <strong>Khammam Railway & Bus Terminal:</strong> Approximately 10 minutes.\n` +
              `• <strong>Regional Arterials:</strong> Direct links to Kodada X-Road, Suryapet, and NH-65 corridor to Hyderabad and Vijayawada.`,
        chips: [
          { label: 'Open Google Maps ↗', action: 'NAVIGATE_BLANK', payload: 'https://maps.google.com/?q=Gurralapadu+Khammam' },
          { label: 'Book Inspection with Free Cab', action: 'START_SITE_VISIT', primary: true },
          { label: 'Review Connectivity Matrix', action: 'NAVIGATE', payload: 'index.html#location' },
          { label: 'Main Menu', action: 'MENU' }
        ]
      };
    }

    handleApprovalsQuery() {
      return {
        text: `<strong>Verified Regulatory Sanctions:</strong>\n\n` +
              `• <strong>Sanction Order:</strong> DTCP TLP No. 3147/Khammam municip/2020/0378.\n` +
              `• <strong>Governing Authority:</strong> Stambhadri Urban Development Authority (SUDA), Khammam District.\n` +
              `• <strong>Title:</strong> 100% Freehold marketable title with clear revenue demarcations.\n` +
              `• <strong>Conveyance:</strong> Ready for immediate spot registration upon purchase.`,
        chips: [
          { label: 'Request Certified Copy', action: 'START_LEAD_FORM', primary: true },
          { label: 'View Regulatory Dossier', action: 'NAVIGATE', payload: 'index.html#approvals' },
          { label: 'Talk to Legal Sales Manager', action: 'TALK_SALES' }
        ]
      };
    }

    handleInfrastructureQuery() {
      return {
        text: `<strong>Engineered Layout Specifications:</strong>\n\n` +
              `• <strong>Carriageways:</strong> 50 FT Highway Frontage, 40 FT Central Spine, 30 FT Internal Grid.\n` +
              `• <strong>Open Green Space:</strong> 10,065 Sq. Yards dedicated open-space parks that can never be repurposed.\n` +
              `• <strong>Social Infrastructure:</strong> 3,369 Sq. Yards reserved parcel for future civic amenities.\n` +
              `• <strong>Utilities:</strong> Underground electrical conduits, avenue plantations, overhead water tank, and rainwater harvesting pits.`,
        chips: [
          { label: 'Inspect in 3D Masterplan', action: 'NAVIGATE', payload: 'project.html', primary: true },
          { label: 'Find a Park-Facing Plot', action: 'FILTER_FACING', payload: 'East' },
          { label: 'Book Site Visit', action: 'START_SITE_VISIT' }
        ]
      };
    }

    handleSiteVisitIntent() {
      return {
        text: `<strong>Complimentary Site Inspection Service:</strong>\n\n` +
              `GV Infra arranges dedicated vehicle pickup and drop for scheduled inspections to Stambadri Enclave in Gurralapadu. ` +
              `Would you like to book a site inspection this week?`,
        chips: [
          { label: 'Yes, Book Free Cab Inspection', action: 'START_LEAD_FORM', primary: true },
          { label: 'Call Sales to Schedule', action: 'CALL_SALES' },
          { label: 'WhatsApp Sales Desk', action: 'WHATSAPP_SALES' },
          { label: 'Main Menu', action: 'MENU' }
        ]
      };
    }

    handleContactSalesQuery() {
      const phone = typeof GV_DATA !== 'undefined' ? GV_DATA.company.phone : '+91 9392887268';
      const waUrl = typeof GV_DATA !== 'undefined'
        ? GV_DATA.buildWhatsAppUrl(null, "Hi GV Infra, I'd like to consult a property advisor regarding your plotted layouts.")
        : 'https://wa.me/919392887268';

      return {
        text: `<strong>Direct Developer Leadership:</strong>\n\n` +
              `• <strong>Project Sales Office:</strong> Star Complex, 5th Floor #501, Opp. HP Petrol Bunk, Raparthi Nagar, Khammam.\n` +
              `• <strong>Corporate HQ:</strong> Nustar Bhavan, Opp. Mangalya Shopping Mall, Vanastalipuram, Hyderabad.\n` +
              `• <strong>Telephone:</strong> ${phone} (Mon–Sat, 9:30 AM – 6:30 PM)\n` +
              `• <strong>Official WhatsApp:</strong> Available 24/7 for inventory updates.`,
        chips: [
          { label: 'Call Sales Now', action: 'CALL_SALES', primary: true },
          { label: 'Chat on WhatsApp ↗', action: 'WHATSAPP_SALES' },
          { label: 'Request Immediate Callback', action: 'START_LEAD_FORM' },
          { label: 'Main Menu', action: 'MENU' }
        ]
      };
    }

    saveLeadSubmission(data) {
      if (typeof GV_DATA !== 'undefined') {
        GV_DATA.saveLead({
          name: data.name || 'Website Visitor',
          phone: data.phone,
          project: data.project || 'Stambadri Enclave',
          budget: data.budget || '',
          size: data.size || '',
          source: 'concierge_chatbot',
          status: 'new'
        });
      }

      return {
        text: `Thank you, <strong>${data.name}</strong>. Your enquiry has been received by our sales desk. ` +
              `Our project manager will contact you at <strong>${data.phone}</strong> with verified allocations and documentation.\n\n` +
              `In the meantime, feel free to explore the interactive 3D layout or consult us directly on WhatsApp.`,
        chips: [
          { label: 'Explore 3D Masterplan ↗', action: 'NAVIGATE', payload: 'project.html', primary: true },
          { label: 'Message on WhatsApp', action: 'WHATSAPP_SALES' },
          { label: 'Main Menu', action: 'MENU' }
        ]
      };
    }
  }


  // ==========================================================
  // 2. CHATBOT UI COMPONENT (Accessible, Responsive Widget)
  // ==========================================================
  class ChatbotUI {
    constructor(engine) {
      this.engine = engine;
      this.isOpen = false;
      this.elements = {};
      this.init();
    }

    init() {
      // Avoid running inside admin panel
      if (window.location.pathname.includes('admin.html')) return;

      this.createDOM();
      this.attachEventListeners();
      this.sendInitialGreeting();
    }

    createDOM() {
      // 1. Launcher Button
      const launcher = document.createElement('button');
      launcher.id = 'gv-chatbot-launcher';
      launcher.className = 'gv-chat-launcher';
      launcher.setAttribute('aria-label', 'Open GV Infra Property Help');
      launcher.setAttribute('aria-haspopup', 'dialog');
      launcher.setAttribute('aria-expanded', 'false');
      launcher.innerHTML = `
        <span class="gv-chat-launcher-beacon" aria-hidden="true"></span>
        <span class="gv-chat-launcher-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </span>
        <span>GV Help</span>
      `;
      document.body.appendChild(launcher);
      this.elements.launcher = launcher;

      // 2. Chat Panel
      const panel = document.createElement('div');
      panel.id = 'gv-chatbot-panel';
      panel.className = 'gv-chat-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'GV Infra Property Help');
      panel.innerHTML = `
        <div class="gv-chat-header">
          <div class="gv-chat-header-identity">
            <div class="gv-chat-header-logo">
              <img src="img/real/gv-infra-logo.png" alt="GV Infra">
            </div>
            <div class="gv-chat-header-meta">
              <h3>GV HELP <span class="gv-chat-header-status-dot" title="Active"></span></h3>
              <span>Your guide to GV Infra projects</span>
            </div>
          </div>
          <div class="gv-chat-header-controls">
            <button class="gv-chat-ctrl-btn" id="gv-chat-reset" aria-label="Restart conversation" title="Restart conversation">
              <svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
            <button class="gv-chat-ctrl-btn" id="gv-chat-close" aria-label="Close GV Help" title="Close">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div class="gv-chat-messages" id="gv-chat-messages" aria-live="polite"></div>

        <div class="gv-chat-footer">
          <form class="gv-chat-input-form" id="gv-chat-form">
            <input type="text" id="gv-chat-input" class="gv-chat-text-input" placeholder="Ask about plots, prices, site visits..." aria-label="Chat with property concierge" autocomplete="off">
            <button type="submit" class="gv-chat-send-btn" id="gv-chat-send" aria-label="Send message">
              <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
          <div class="gv-chat-disclaimer">Verified property data · Official GV Infra Projects Advisory</div>
        </div>
      `;
      document.body.appendChild(panel);
      this.elements.panel = panel;
      this.elements.messages = panel.querySelector('#gv-chat-messages');
      this.elements.form = panel.querySelector('#gv-chat-form');
      this.elements.input = panel.querySelector('#gv-chat-input');
      this.elements.closeBtn = panel.querySelector('#gv-chat-close');
      this.elements.resetBtn = panel.querySelector('#gv-chat-reset');
    }

    attachEventListeners() {
      // Launcher Toggle
      this.elements.launcher.addEventListener('click', () => this.toggle());

      // Close Button
      this.elements.closeBtn.addEventListener('click', () => this.close());

      // Reset Button
      this.elements.resetBtn.addEventListener('click', async () => {
        this.elements.messages.innerHTML = '';
        this.engine.reset();
        this.sendInitialGreeting();
      });

      // Escape Key to Close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });

      // Form Submit
      this.elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = this.elements.input.value.trim();
        if (!query) return;

        this.elements.input.value = '';
        this.addUserMessage(query);

        this.showTypingIndicator();
        const response = await this.engine.processMessage(query);
        this.hideTypingIndicator();

        this.addBotMessage(response);
      });
    }

    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    }

    open() {
      this.isOpen = true;
      this.elements.panel.classList.add('is-open');
      this.elements.launcher.classList.add('is-hidden');
      this.elements.launcher.setAttribute('aria-expanded', 'true');
      document.body.classList.add('gv-chat-open');
      this.scrollToBottom();
      setTimeout(() => this.elements.input.focus(), 250);
    }

    close() {
      this.isOpen = false;
      this.elements.panel.classList.remove('is-open');
      this.elements.launcher.classList.remove('is-hidden');
      this.elements.launcher.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('gv-chat-open');
      this.elements.launcher.focus();
    }

    sendInitialGreeting() {
      const welcome = {
        text: `Welcome to <strong>GV Infra Projects</strong>. I am your personal Property Assistant.\n\nI can help you explore our plotted developments, find open plots, check pricing, review civil specifications, or schedule a complimentary site inspection.`,
        chips: this.engine.getDefaultQuickActions()
      };
      this.addBotMessage(welcome);
    }

    addUserMessage(text) {
      const msg = document.createElement('div');
      msg.className = 'gv-chat-msg user';
      msg.innerHTML = `
        <span class="gv-chat-msg-sender">You</span>
        <div class="gv-chat-msg-bubble">
          <p>${this.escapeHTML(text)}</p>
        </div>
      `;
      this.elements.messages.appendChild(msg);
      this.scrollToBottom();
    }

    addBotMessage(response) {
      const msg = document.createElement('div');
      msg.className = 'gv-chat-msg bot';

      // Parse linebreaks into paragraphs
      const formattedText = (response.text || '')
        .split('\n\n')
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

      let content = `
        <span class="gv-chat-msg-sender">GV Help · Property Assistant</span>
        <div class="gv-chat-msg-bubble">
          ${formattedText}
        </div>
      `;

      msg.innerHTML = content;

      // Add Structured Items / Plot Cards if available
      if (response.items && Array.isArray(response.items)) {
        const itemsWrap = document.createElement('div');
        response.items.forEach(item => {
          const card = document.createElement('div');
          card.className = 'gv-chat-item-card';
          card.innerHTML = `
            <div class="gv-chat-item-card-title">
              <span>${item.title}</span>
              ${item.price ? `<span class="gv-chat-item-card-price">${item.price}</span>` : ''}
            </div>
            <div class="gv-chat-item-card-meta">${item.meta}</div>
            <div class="gv-chat-item-card-actions">
              ${item.link ? `<a href="${item.link}" class="gv-chat-btn-micro gv-chat-btn-micro-primary">${item.btnLabel || 'View Details'} &rarr;</a>` : ''}
            </div>
          `;
          itemsWrap.appendChild(card);
        });
        msg.querySelector('.gv-chat-msg-bubble').appendChild(itemsWrap);
      }

      // Add Lead Form if requested
      if (response.form) {
        const formCard = document.createElement('form');
        formCard.className = 'gv-chat-form-card';
        formCard.innerHTML = `
          <h4>Shortlist &amp; Site Visit Request</h4>
          <div class="gv-chat-form-field">
            <label for="gv-lead-name">Your Full Name</label>
            <input type="text" required id="gv-lead-name" class="gv-chat-form-input" placeholder="e.g. K. Venkat Reddy">
          </div>
          <div class="gv-chat-form-field">
            <label for="gv-lead-phone">Mobile Number</label>
            <input type="tel" required id="gv-lead-phone" class="gv-chat-form-input" placeholder="10-digit mobile number">
          </div>
          <button type="submit" class="gv-chat-form-submit">Confirm &amp; Request Callback &rarr;</button>
        `;
        formCard.addEventListener('submit', async (e) => {
          e.preventDefault();
          const name = formCard.querySelector('#gv-lead-name').value.trim();
          const phone = formCard.querySelector('#gv-lead-phone').value.trim();
          if (!name || !phone) return;

          formCard.remove();
          this.showTypingIndicator();
          const followUp = await this.engine.processAction('SUBMIT_LEAD_FORM', { name, phone });
          this.hideTypingIndicator();
          this.addBotMessage(followUp);
        });
        msg.querySelector('.gv-chat-msg-bubble').appendChild(formCard);
      }

      // Add Quick Action Chips
      if (response.chips && Array.isArray(response.chips)) {
        const chipsWrap = document.createElement('div');
        chipsWrap.className = 'gv-chat-chips-container';
        response.chips.forEach(chip => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `gv-chat-chip ${chip.primary ? 'gv-chat-chip-primary' : ''}`;
          btn.textContent = chip.label;
          btn.addEventListener('click', async () => {
            chipsWrap.remove(); // Remove active chips once clicked for clean stream

            // Handle navigation commands immediately
            if (chip.action === 'NAVIGATE') {
              window.location.href = chip.payload;
              return;
            }
            if (chip.action === 'NAVIGATE_BLANK') {
              window.open(chip.payload, '_blank', 'noopener');
              return;
            }
            if (chip.action === 'CALL_SALES') {
              const tel = typeof GV_DATA !== 'undefined' ? GV_DATA.telLink() : 'tel:+919392887268';
              window.location.href = tel;
              return;
            }
            if (chip.action === 'WHATSAPP_SALES') {
              const waUrl = typeof GV_DATA !== 'undefined'
                ? GV_DATA.buildWhatsAppUrl(null, "Hi GV Infra, I'd like to consult a property advisor regarding your plotted layouts.")
                : 'https://wa.me/919392887268';
              window.open(waUrl, '_blank', 'noopener');
              return;
            }

            this.addUserMessage(chip.label);
            this.showTypingIndicator();
            const botReply = await this.engine.processAction(chip.action, chip.payload);
            this.hideTypingIndicator();
            this.addBotMessage(botReply);
          });
          chipsWrap.appendChild(btn);
        });
        msg.appendChild(chipsWrap);
      }

      this.elements.messages.appendChild(msg);
      this.scrollToBottom();
    }

    showTypingIndicator() {
      this.hideTypingIndicator();
      const typing = document.createElement('div');
      typing.id = 'gv-chat-typing';
      typing.className = 'gv-chat-typing';
      typing.innerHTML = `
        <span class="gv-chat-dot"></span>
        <span class="gv-chat-dot"></span>
        <span class="gv-chat-dot"></span>
      `;
      this.elements.messages.appendChild(typing);
      this.scrollToBottom();
    }

    hideTypingIndicator() {
      const typing = this.elements.messages.querySelector('#gv-chat-typing');
      if (typing) typing.remove();
    }

    scrollToBottom() {
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    escapeHTML(str) {
      return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag));
    }
  }

  // ==========================================================
  // 3. GLOBAL INITIALIZATION
  // ==========================================================
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new ChatbotEngine();
    const ui = new ChatbotUI(engine);

    // Primary API: window.GV_HELP
    window.GV_HELP = {
      engine,
      ui,
      open: () => ui.open(),
      close: () => ui.close(),
      setLLMProvider: (fn) => engine.setLLMProvider(fn),
    };

    // Backward-compatibility aliases
    window.GV_CONCIERGE = window.GV_HELP;
    window.GVChatbot = window.GV_HELP;
  });
})();
