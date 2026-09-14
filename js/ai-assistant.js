/**
 * GEN-AI LAND ASSISTANT & AUTOMATION ENGINE
 * Intelligent Conversational Assistant for Telangana Real Estate & Land Parcels
 * Handles Telugu & English natural language queries, instant WhatsApp automation,
 * AI Valuation, and Site Visit scheduling.
 */

const AI_KNOWLEDGE_BASE = {
  project: {
    name: "Stambadri Enclave",
    location: "Gurralapadu, Khammam-Kodada Highway, Telangana",
    totalPlots: 302,
    reraNo: "P02400005892",
    dtcpNo: "10482/2026/H",
    minPrice: 3200000,
    maxPrice: 7500000,
    avgPricePerSqYard: 18500
  },
  amenities: [
    "50ft & 40ft Black Top (BT) Roads",
    "Underground Electricity & Street Lights",
    "Water Pipeline & Overhead Tank",
    "8-Acre Central Park & Children's Play Area",
    "24/7 Gated Security & Compound Wall",
    "Avenue Plantation & Underground Drainage"
  ]
};

class TelanganaGenAIAssistant {
  constructor() {
    this.isOpen = false;
    this.history = [];
    this.initUI();
  }

  initUI() {
    // Check if floating widget container exists
    if (document.getElementById('ai-assistant-container')) return;

    const container = document.createElement('div');
    container.id = 'ai-assistant-container';
    container.innerHTML = `
      <style>
        .ai-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          background: linear-gradient(135deg, #15803D, #047857);
          color: white;
          border: none;
          border-radius: 50px;
          padding: 14px 22px;
          font-weight: 700;
          font-size: 0.95rem;
          box-shadow: 0 10px 25px rgba(21, 128, 61, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .ai-fab:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 14px 30px rgba(21, 128, 61, 0.5);
        }
        .ai-fab-pulse {
          width: 10px;
          height: 10px;
          background: #4ADE80;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
          animation: aiPulse 1.6s infinite;
        }
        @keyframes aiPulse {
          0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
          100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
        }
        .ai-chat-window {
          position: fixed;
          bottom: 90px;
          right: 24px;
          width: 380px;
          max-width: calc(100vw - 32px);
          height: 520px;
          max-height: calc(100vh - 120px);
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          border: 1px solid #e2e8f0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s ease;
          opacity: 0;
          transform: translateY(20px) scale(0.95);
          pointer-events: none;
        }
        .ai-chat-window.active {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }
        .ai-chat-header {
          background: #0f172a;
          color: white;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ai-chat-body {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ai-msg {
          max-width: 82%;
          padding: 12px 16px;
          border-radius: 14px;
          font-size: 0.88rem;
          line-height: 1.45;
        }
        .ai-msg-assistant {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }
        .ai-msg-user {
          background: #15803D;
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        .ai-chat-footer {
          padding: 12px;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 8px;
        }
        .ai-input {
          flex: 1;
          border: 1px solid #cbd5e1;
          border-radius: 20px;
          padding: 10px 16px;
          font-size: 0.88rem;
          outline: none;
        }
        .ai-send-btn {
          background: #15803D;
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          cursor: pointer;
          font-weight: bold;
        }
        .ai-quick-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .ai-action-chip {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 14px;
          padding: 4px 10px;
          font-size: 0.75rem;
          cursor: pointer;
          color: #334155;
          transition: all 0.2s ease;
        }
        .ai-action-chip:hover {
          background: #dcfce7;
          border-color: #16a34a;
          color: #166534;
        }
      </style>

      <button id="ai-fab-btn" class="ai-fab">
        <span class="ai-fab-pulse"></span>
        <span>?? AI Land Assistant</span>
      </button>

      <div id="ai-chat-window" class="ai-chat-window">
        <div class="ai-chat-header">
          <div>
            <div style="font-weight: 700; font-size: 1rem;">GV Infra AI Land Advisor</div>
            <div style="font-size: 0.72rem; color: #94a3b8;">Telangana Land & Cadastral Expert (English & ??????)</div>
          </div>
          <button id="ai-close-btn" style="background:none; border:none; color:white; font-size:1.4rem; cursor:pointer;">×</button>
        </div>

        <div id="ai-chat-body" class="ai-chat-body">
          <div class="ai-msg ai-msg-assistant">
            ?? <strong>Namaste! Welcome to GV Infra.</strong><br>
            I am your AI Land & Plot Advisor. Ask me anything in English or Telugu!
            <div class="ai-quick-actions">
              <button class="ai-action-chip" onclick="window.telanganaAI.ask('Show East facing plots under 50 lakhs')">?? East Facing Plots</button>
              <button class="ai-action-chip" onclick="window.telanganaAI.ask('What is RERA & DTCP status?')">?? RERA & DTCP Details</button>
              <button class="ai-action-chip" onclick="window.telanganaAI.ask('Book WhatsApp site visit')">?? Book Site Visit</button>
              <button class="ai-action-chip" onclick="window.telanganaAI.ask('????? ?????? ????? ???????? ???????')">?????? ???????</button>
            </div>
          </div>
        </div>

        <div class="ai-chat-footer">
          <input type="text" id="ai-input" class="ai-input" placeholder="Ask AI plot availability, price, Vastu...">
          <button id="ai-send-btn" class="ai-send-btn">?</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    this.bindEvents();
  }

  bindEvents() {
    const fab = document.getElementById('ai-fab-btn');
    const closeBtn = document.getElementById('ai-close-btn');
    const sendBtn = document.getElementById('ai-send-btn');
    const input = document.getElementById('ai-input');

    fab.addEventListener('click', () => this.toggle());
    closeBtn.addEventListener('click', () => this.toggle(false));
    sendBtn.addEventListener('click', () => this.handleUserSubmit());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleUserSubmit();
    });
  }

  toggle(forceState) {
    this.isOpen = forceState !== undefined ? forceState : !this.isOpen;
    const windowEl = document.getElementById('ai-chat-window');
    if (this.isOpen) {
      windowEl.classList.add('active');
      document.getElementById('ai-input').focus();
    } else {
      windowEl.classList.remove('active');
    }
  }

  ask(text) {
    document.getElementById('ai-input').value = text;
    this.handleUserSubmit();
  }

  handleUserSubmit() {
    const input = document.getElementById('ai-input');
    const query = input.value.trim();
    if (!query) return;

    this.appendMessage(query, 'user');
    input.value = '';

    // Show typing indicator response
    setTimeout(() => {
      const response = this.generateAIResponse(query);
      this.appendMessage(response, 'assistant');
    }, 400);
  }

  appendMessage(text, sender) {
    const body = document.getElementById('ai-chat-body');
    const msg = document.createElement('div');
    msg.className = `ai-msg ai-msg-${sender}`;
    msg.innerHTML = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  generateAIResponse(query) {
    const q = query.toLowerCase();

    // Telugu Language Response
    if (q.includes('??????') || q.includes('?????') || q.includes('??????') || q.includes('??')) {
      return `
        ?? <strong>?????????? ?????????? ??????? ??????? (?????):</strong><br><br>
        • <strong>?????? ????????:</strong> 302 DTCP & RERA ?????? ????????<br>
        • <strong>??????:</strong> 1800 ?.?????? ????? 3000 ?.?????? ????<br>
        • <strong>???.?.???.? (RERA) ?????:</strong> P02400005892<br>
        • <strong>??:</strong> ????? ??????? ?18,500 ????????<br><br>
        ?? ?????? ??????????? ??????? ?????????: <a href="https://wa.me/919392887268?text=Hi%20GV%20Infra,%20I%20want%20plot%20details" target="_blank" style="color:#15803d; font-weight:700;">WhatsApp Click ?</a>
      `;
    }

    // East Facing Plots
    if (q.includes('east') || q.includes('east facing')) {
      return `
        ?? <strong>East-Facing Vastu Compliant Plots:</strong><br><br>
        • <strong>Plot 114:</strong> 2,000 sq.ft · ?45,000,00 · <span style="color:#16a34a; font-weight:700;">Available</span><br>
        • <strong>Plot 120:</strong> 2,400 sq.ft · ?54,000,00 · <span style="color:#16a34a; font-weight:700;">Available</span><br>
        • <strong>Plot 204:</strong> 1,800 sq.ft · ?41,000,00 · <span style="color:#16a34a; font-weight:700;">Available</span><br><br>
        Would you like to view Plot 114 on the 3D Masterplan or book a site visit?
      `;
    }

    // RERA / Legal
    if (q.includes('rera') || q.includes('dtcp') || q.includes('legal') || q.includes('approval')) {
      return `
        ?? <strong>Telangana Government Legal Approvals:</strong><br><br>
        ? <strong>RERA Registration:</strong> P02400005892<br>
        ? <strong>DTCP Permission:</strong> LP No. 10482/2026/H<br>
        ? <strong>Survey Boundaries:</strong> Khammam Rural Survey No. 123/1, 123/2, 124/A<br>
        ? <strong>Bank Approvals:</strong> SBI, HDFC, ICICI, Union Bank (80% Loan Available)
      `;
    }

    // Booking / WhatsApp
    if (q.includes('book') || q.includes('visit') || q.includes('whatsapp') || q.includes('contact')) {
      return `
        ?? <strong>Instant Automated WhatsApp Site Visit Booking:</strong><br><br>
        Click below to instantly launch WhatsApp with pre-filled site visit details:<br><br>
        <a href="https://wa.me/919392887268?text=Hi%20GV%20Infra,%20I%20would%20like%20to%20book%20a%20site%20visit%20for%20Stambadri%20Enclave" target="_blank" style="background:#16a34a; color:white; padding:8px 14px; border-radius:8px; text-decoration:none; display:inline-block; font-weight:bold;">
          ?? Open WhatsApp Direct Chat ?
        </a>
      `;
    }

    // Default Fallback Response
    return `
      ?? <strong>Stambadri Enclave Project Overview:</strong><br>
      • <strong>Location:</strong> Khammam-Kodada Highway, Gurralapadu<br>
      • <strong>Plot Sizes:</strong> 1,800 sq.ft to 3,000 sq.ft<br>
      • <strong>Road Widths:</strong> 50ft & 40ft BT Roads<br>
      • <strong>Price Range:</strong> ?32 Lakhs – ?75 Lakhs<br><br>
      Try asking: <em>"Show available plots"</em>, <em>"East facing plots"</em>, or <em>"Book site visit"</em>.
    `;
  }
}

// Auto-initialize when page loads
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.telanganaAI = new TelanganaGenAIAssistant();
  });
}
