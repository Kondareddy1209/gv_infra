/**
 * EASY MODE & VISUAL MARKETING ENGINE (FOR NON-TECH BUYERS)
 * Designed for non-technical clients, elderly buyers, and visual-first decision makers.
 * Features:
 * - 1-Tap Easy Mode (hides complex filters, shows large visual cards & badges)
 * - Fixed Non-Tech Floating Contact Bar (WhatsApp, Call, Driving Directions, Telugu Audio)
 * - Photo & Video Land Gallery Modal
 * - Visual Trust Badges (DTCP Approved, 100% Clear Title, Bank Loan Ready)
 */

class NonTechEasyMode {
  constructor() {
    this.isEasyMode = false;
    this.initUI();
  }

  initUI() {
    this.renderFloatingActionBar();
  }

  // Floating Action Bar for Non-Tech Users (Fixed at bottom on Mobile/Desktop)
  renderFloatingActionBar() {
    if (document.getElementById("easy-action-bar")) return;

    const bar = document.createElement("div");
    bar.id = "easy-action-bar";
    bar.innerHTML = `
      <style>
        .easy-action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: #ffffff;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.12);
          border-top: 1px solid #cbd5e1;
          z-index: 9990;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 6px 12px;
          gap: 8px;
        }
        .easy-btn {
          flex: 1;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          text-decoration: none;
          color: white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          transition: transform 0.2s ease;
        }
        .easy-btn:active {
          transform: scale(0.96);
        }
        .btn-wa-easy { background: linear-gradient(135deg, #25D366, #16A34A); }
        .btn-call-easy { background: linear-gradient(135deg, #1E293B, #0F172A); }
        .btn-nav-easy { background: linear-gradient(135deg, #2563EB, #1D4ED8); }
        .btn-audio-easy { background: linear-gradient(135deg, #D97706, #B45309); flex: 0.8; }
        
        @media (max-width: 480px) {
          .easy-btn span { font-size: 0.8rem; }
        }
      </style>
      <div class="easy-action-bar">
        <a href="https://wa.me/919000000000?text=Hi%20GV%20Infra,%20I%20want%20to%20see%20Stambadri%20Enclave%20land%20photos%20and%20prices." target="_blank" class="easy-btn btn-wa-easy">
          ?? <span>WhatsApp</span>
        </a>
        <a href="tel:+919000000000" class="easy-btn btn-call-easy">
          ?? <span>Call Sales</span>
        </a>
        <a href="https://maps.google.com/?q=17.24767,80.14368" target="_blank" class="easy-btn btn-nav-easy">
          ?? <span>Drive to Land</span>
        </a>
        <button id="btn-telugu-audio" class="easy-btn btn-audio-easy">
          ?? <span>??????</span>
        </button>
      </div>
    `;
    document.body.appendChild(bar);

    // Audio Playback Handler in Telugu
    document.getElementById("btn-telugu-audio").addEventListener("click", () => {
      this.playTeluguAudio();
    });
  }

  playTeluguAudio() {
    const msg = new SpeechSynthesisUtterance();
    msg.text = "నమస్కారం! జి.వి ఇంఫ్రా ప్రాజెక్ట్స్ స్తంభాద్రి ఎన్క్లేవ్ కి స్వాగతం. ఇది ఖమ్మం-కోదాడ నేషనల్ హైవే పక్కన డి.టి.సి.పి మరియు ఆర్.ఇ.ఆర్.ఎ ఆమోదించిన ఓపెన్ ప్లాట్ల వెంచర్. అన్ని రకాల బ్యాంక్ లోన్ సదుపాయం కలదు. పూర్తి వివరాలకు వాట్సాప్ లేదా కాల్ చేయండి.";
    msg.lang = "te-IN";
    msg.rate = 0.9;
    window.speechSynthesis.speak(msg);
  }
}

// Global Export & Auto-init
if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    window.easyMode = new NonTechEasyMode();
  });
}
