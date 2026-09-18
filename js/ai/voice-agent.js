/**
 * TELUGU LAND VOICE AGENT & CONVERSATIONAL ASSISTANT (POWERED BY OMNIROUTE)
 * Speech-to-Text and Text-to-Speech Voice Interface in Telugu (తెలుగు) & English for Khammam Real Estate 3D GIS.
 */

(function (global) {
  'use strict';

  class VoiceAgent {
    constructor(viewer) {
      this.viewer = viewer;
      this.spatialTools = global.SpatialTools ? new global.SpatialTools(viewer) : null;
      this.isListening = false;
      this.recognition = null;
      this.language = 'te-IN'; // Default to Telugu (తెలుగు)
      this.welcomeSpoken = false;

      this.initSpeechRecognition();
      this.renderVoiceUI();
    }

    /**
     * Initialize Speech Recognition (Web Speech API) for Telugu & English
     */
    initSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[VoiceAgent] Web Speech Recognition API not supported in this browser');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.language;

      this.recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log(`[VoiceAgent] Speech recognized (${this.language}):`, transcript);
        this.updateVoiceStatus(`విన్నాను: "${transcript}"`, 'processing');
        this.stopListening();
        await this.handleUserUtterance(transcript);
      };

      this.recognition.onerror = (event) => {
        console.warn('[VoiceAgent] Speech recognition error:', event.error);
        this.updateVoiceStatus('వాయిస్ అర్థం కాలేదు. మళ్ళీ ప్రయత్నించండి.', 'error');
        this.stopListening();
      };
    }

    /**
     * Play Official Telugu Welcome Audio Greeting on Land Map Load
     */
    playTeluguWelcomeGreeting() {
      if (this.welcomeSpoken) return;
      this.welcomeSpoken = true;

      const teluguGreeting = "నమస్కారం! ఖమ్మం గుర్రాలపాడు స్టంబాద్రి ఎన్‌క్లేవ్ 3D డిజిటల్ ల్యాండ్ మ్యాప్‌కి స్వాగతం. ప్లాట్ల వివరాలు, ధరలు, లేదా 3D టూర్ కోసం నన్ను అడగండి.";
      console.log('[VoiceAgent] Playing Telugu Welcome Greeting...');
      
      this.updateVoiceStatus('🔊 స్వాగతం! (Welcome to Khammam 3D Land)', 'speaking');
      this.speakText(teluguGreeting, 'te-IN');
    }

    /**
     * Switch Voice Language (te-IN for Telugu, en-IN for English)
     */
    setLanguage(langCode) {
      this.language = langCode;
      if (this.recognition) {
        this.recognition.lang = langCode;
      }
      console.log(`[VoiceAgent] Switched voice language to: ${langCode}`);
      const btn = document.getElementById('voice-lang-toggle');
      if (btn) btn.textContent = langCode === 'te-IN' ? '🗣️ తెలుగు (Telugu Active)' : '🗣️ English Active';
    }

    /**
     * Start Speech Listening
     */
    startListening() {
      if (!this.recognition) {
        alert('వాయిస్ సపోర్ట్ అందుబాటులో లేదు. (Speech recognition not supported in this browser)');
        return;
      }
      try {
        this.recognition.lang = this.language;
        this.isListening = true;
        this.recognition.start();
        this.updateVoiceStatus('🎙️ వింటున్నాను... మాట్లాడండి (Listening in Telugu...)', 'listening');
      } catch (e) {
        console.warn('[VoiceAgent] Start error:', e);
      }
    }

    /**
     * Stop Speech Listening
     */
    stopListening() {
      this.isListening = false;
      if (this.recognition) {
        try { this.recognition.stop(); } catch (e) {}
      }
      const micBtn = document.getElementById('voice-mic-btn');
      if (micBtn) micBtn.classList.remove('listening');
    }

    /**
     * Handle user utterance in Telugu and query OmniRoute AI model
     */
    async handleUserUtterance(promptText) {
      console.log(`[VoiceAgent] Querying OmniRoute AI Model in Telugu for: "${promptText}"`);
      
      let aiResponse = "ఖమ్మం గుర్రాలపాడు ప్రాజెక్ట్ వివరాలను సేకరిస్తున్నాను.";
      
      if (this.spatialTools) {
        // System prompt instructs OmniRoute to respond in clear, courteous Telugu
        const teluguSystemPrompt = `మీరు ఖమ్మం, గుర్రాలపాడు లోని 'స్టంబాద్రి ఎన్‌క్లేవ్' (Stambadri Enclave) రియల్ ఎస్టేట్ 3D ల్యాండ్ మ్యాప్ AI అసిస్టెంట్.
వినియోగదారు అడిగిన ప్రశ్నకు స్పష్టమైన, సులభమైన తెలుగు లో (Telugu language) సమాధానం చెప్పండి.
ప్లాట్ల ధర చదరపు గజానికి సగటున ₹18,500. DTCP అనుమతులు (TLP No. 3147/2020/0378), 50 & 30 అడుగుల బిటి రోడ్లు, డ్రైనేజీ, మరియు సెంట్రల్ పార్క్ సదుపాయాలు ఉన్నాయి.`;

        const result = await this.spatialTools.queryOmniRoute(promptText, { systemPrompt: teluguSystemPrompt });
        aiResponse = result.content;
        this.spatialTools.executeMapAction(promptText);
      }

      this.updateVoiceStatus('🗣️ సమాధానం ఇస్తున్నాను...', 'speaking');
      this.speakText(aiResponse, this.language);
      return aiResponse;
    }

    /**
     * Speak text response using Web Speech Synthesis with Telugu voice selection
     */
    speakText(text, lang = 'te-IN') {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel(); // Clear queue

      const cleanText = text.replace(/[*#_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = 0.95; // Slightly slower pace for natural Telugu clarity
      utterance.pitch = 1.0;

      // Select matching Telugu voice if available on user device
      const voices = window.speechSynthesis.getVoices();
      const teluguVoice = voices.find(v => v.lang.includes('te') || v.lang.includes('TE') || v.name.toLowerCase().includes('telugu'));
      if (teluguVoice) {
        utterance.voice = teluguVoice;
      }

      utterance.onend = () => {
        this.updateVoiceStatus('మాట్లాడటానికి మైక్ క్లిక్ చేయండి', 'idle');
      };

      window.speechSynthesis.speak(utterance);
    }

    /**
     * Render Telugu Voice Control HUD Bar
     */
    renderVoiceUI() {
      if (document.getElementById('telugu-voice-hud')) return;

      const hud = document.createElement('div');
      hud.id = 'telugu-voice-hud';
      hud.innerHTML = `
        <div class="voice-card">
          <button class="voice-mic-btn" id="voice-mic-btn" title="మాట్లాడటానికి క్లిక్ చేయండి (Click to Speak)">
            <span class="mic-icon">🎙️</span>
          </button>
          <div class="voice-details">
            <div class="voice-title">తెలుగు ల్యాండ్ వాయిస్ మోడ్ (Telugu Voice Mode)</div>
            <div class="voice-status" id="voice-status-msg">మాట్లాడటానికి మైక్ క్లిక్ చేయండి</div>
          </div>
          <div class="voice-actions">
            <button class="voice-action-chip" id="voice-welcome-btn" title="స్వాగతం చెప్పండి">🔊 స్వాగతం</button>
            <button class="voice-action-chip" id="voice-lang-toggle">🗣️ తెలుగు Active</button>
          </div>
        </div>
      `;

      document.body.appendChild(hud);
      this.injectStyles();

      // Bind UI Events
      document.getElementById('voice-mic-btn')?.addEventListener('click', () => {
        if (this.isListening) {
          this.stopListening();
          this.updateVoiceStatus('మాట్లాడటానికి మైక్ క్లిక్ చేయండి', 'idle');
        } else {
          this.startListening();
        }
      });

      document.getElementById('voice-welcome-btn')?.addEventListener('click', () => {
        this.welcomeSpoken = false;
        this.playTeluguWelcomeGreeting();
      });

      document.getElementById('voice-lang-toggle')?.addEventListener('click', () => {
        const newLang = this.language === 'te-IN' ? 'en-IN' : 'te-IN';
        this.setLanguage(newLang);
      });

      // Auto play welcome greeting after 2.5 seconds on page load
      setTimeout(() => this.playTeluguWelcomeGreeting(), 2500);
    }

    updateVoiceStatus(msg, state = 'idle') {
      const statusElem = document.getElementById('voice-status-msg');
      const micBtn = document.getElementById('voice-mic-btn');
      if (statusElem) statusElem.textContent = msg;

      if (micBtn) {
        micBtn.classList.remove('listening', 'speaking', 'processing');
        if (state !== 'idle') micBtn.classList.add(state);
      }
    }

    injectStyles() {
      if (document.getElementById('telugu-voice-styles')) return;
      const style = document.createElement('style');
      style.id = 'telugu-voice-styles';
      style.textContent = `
        #telugu-voice-hud {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Telugu", sans-serif;
        }
        .voice-card {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: 40px;
          padding: 8px 18px 8px 10px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          color: white;
        }
        .voice-mic-btn {
          width: 46px; height: 46px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10B981, #047857);
          border: none;
          color: white;
          font-size: 1.3rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
          transition: all 0.3s ease;
        }
        .voice-mic-btn:hover { transform: scale(1.08); }
        .voice-mic-btn.listening {
          background: linear-gradient(135deg, #EF4444, #B91C1C);
          animation: micPulse 1.2s infinite;
        }
        .voice-mic-btn.speaking {
          background: linear-gradient(135deg, #3B82F6, #1D4ED8);
        }
        @keyframes micPulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .voice-title {
          font-size: 0.82rem; font-weight: 700; color: #10B981;
        }
        .voice-status {
          font-size: 0.75rem; color: #CBD5E1; margin-top: 2px;
        }
        .voice-actions { display: flex; gap: 6px; }
        .voice-action-chip {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #E2E8F0;
          padding: 4px 10px;
          border-radius: 14px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .voice-action-chip:hover { background: rgba(16, 185, 129, 0.2); border-color: #10B981; }
      `;
      document.head.appendChild(style);
    }
  }

  global.VoiceAgent = VoiceAgent;

  // Auto-instantiate VoiceAgent on DOM ready so mic HUD appears immediately
  const initVoice = () => {
    if (!window.teluguVoiceAgent) {
      window.teluguVoiceAgent = new VoiceAgent();
      console.log('[VoiceAgent] Telugu Voice Mode auto-initialized');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoice);
  } else {
    initVoice();
  }
})(window);
