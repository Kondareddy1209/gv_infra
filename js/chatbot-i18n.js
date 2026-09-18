/* ============================================================
   GV INFRA PROJECTS — Chatbot Internationalization (i18n)
   8 Indian Languages: English, Telugu, Hindi, Tamil, Kannada, Malayalam, Marathi, Bengali
   ============================================================ */

const CHATBOT_I18N = {
  en: {
    // UI Labels
    uiLabels: {
      chatTitle: 'GV HELP',
      chatSubtitle: 'Property Assistant',
      typePlaceholder: 'Type your question...',
      sendButton: 'Send',
      closeButton: 'Close',
      languageLabel: 'Language',
    },
    // Greetings & Welcome
    greeting: 'Welcome to GV Infra Projects. I am your Property Assistant. How may I assist your property enquiry today?',
    resetMessage: 'I\'ve reset our conversation. How can I guide you across our plotted developments?',
    // Quick Actions
    quickActions: {
      exploreProjects: 'Explore Projects',
      findPlot: 'Find a Plot',
      viewMasterplan: 'View 3D Masterplan',
      checkPricing: 'Check Pricing & EMI',
      bookSiteVisit: 'Book Site Visit',
      talkSales: 'Talk to Sales',
      mainMenu: 'Main Menu',
      callNow: 'Call Sales Now',
      whatsapp: 'WhatsApp Sales',
      openMaps: 'Open Google Maps ↗',
      backMenu: 'Back to Menu',
      showAll: 'Show All Sizes',
      anyFacing: 'Any Facing',
      viewAll: 'View All Available Plots',
      talkAdvisor: 'Talk to Sales Advisor',
      requestCallback: 'Request Immediate Callback',
      submitForm: 'Confirm & Request Callback →',
    },
    // Fallback & Errors
    fallbackMessage: 'I don\'t have verified information for that specific query. However, as your GV Infra Property Assistant, I can help you with verified project details:',
    errorMessage: 'I encountered an issue processing your request. Please try again or contact our sales team directly.',
    // Form Labels
    formLabels: {
      formTitle: 'Shortlist & Site Visit Request',
      nameLabel: 'Your Full Name',
      namePlaceholder: 'e.g. K. Venkat Reddy',
      phoneLabel: 'Mobile Number',
      phonePlaceholder: '10-digit mobile number',
    },
    // Common Phrases
    phrases: {
      available: 'Available',
      reserved: 'Reserved',
      sold: 'Sold',
      plots: 'plots',
      sqYards: 'Sq. Yds',
      sqFeet: 'sqft',
      facing: 'Facing',
      east: 'East',
      west: 'West',
      north: 'North',
      south: 'South',
    }
  },

  te: {
    // UI Labels (Telugu)
    uiLabels: {
      chatTitle: 'GV సహాయం',
      chatSubtitle: 'ఆస్తి సహాయకుడు',
      typePlaceholder: 'మీ ప్రశ్న టైప్ చేయండి...',
      sendButton: 'పంపించు',
      closeButton: 'మూసివేయి',
      languageLabel: 'భాష',
    },
    greeting: 'GV ఇన్‌ఫ్రా ప్రాజెక్ట్స్‌కు స్వాగతం. నేను మీ ఆస్తి సహాయకుడిని. నేను మీకు ఎలా సహాయం చేయగలను?',
    resetMessage: 'నేను మా సంభాషణను రీసెట్ చేసాను. మా ప్లాట్ డెవలప్‌మెంట్ల గురించి నేను మీకు ఎలా మార్గనిర్దేశం చేయగలను?',
    quickActions: {
      exploreProjects: 'ప్రాజెక్ట్‌లను అన్వేషించండి',
      findPlot: 'ప్లాట్ కనుగొనండి',
      viewMasterplan: '3D మాస్టర్‌ప్లాన్ చూడండి',
      checkPricing: 'ధర & EMI తనిఖీ',
      bookSiteVisit: 'సైట్ సందర్శన బుక్ చేయండి',
      talkSales: 'సేల్స్‌తో మాట్లాడండి',
      mainMenu: 'ప్రధాన మెనూ',
      callNow: 'ఇప్పుడు కాల్ చేయండి',
      whatsapp: 'WhatsApp సేల్స్',
      openMaps: 'Google Maps తెరవండి ↗',
      backMenu: 'మెనూకు తిరిగి',
      showAll: 'అన్ని పరిమాణాలు చూపించు',
      anyFacing: 'ఏదైనా ఫేసింగ్',
      viewAll: 'అందుబాటులో ఉన్న అన్ని ప్లాట్లు చూడండి',
      talkAdvisor: 'సేల్స్ సలహాదారుతో మాట్లాడండి',
      requestCallback: 'కాల్‌బ్యాక్ అభ్యర్థన',
      submitForm: 'నిర్ధారించి కాల్‌బ్యాక్ అభ్యర్థించండి →',
    },
    fallbackMessage: 'ఆ నిర్దిష్ట ప్రశ్నకు నా దగ్గర ధృవీకరించబడిన సమాచారం లేదు. అయితే, మీ GV ఇన్‌ఫ్రా ఆస్తి సహాయకుడిగా, నేను మీకు ధృవీకరించబడిన ప్రాజెక్ట్ వివరాలతో సహాయం చేయగలను:',
    errorMessage: 'మీ అభ్యర్థనను ప్రాసెస్ చేయడంలో నాకు సమస్య ఎదురైంది. దయచేసి మళ్లీ ప్రయత్నించండి లేదా మా సేల్స్ టీమ్‌ను నేరుగా సంప్రదించండి.',
    formLabels: {
      formTitle: 'షార్ట్‌లిస్ట్ & సైట్ సందర్శన అభ్యర్థన',
      nameLabel: 'మీ పూర్తి పేరు',
      namePlaceholder: 'ఉదా. K. వెంకట్ రెడ్డి',
      phoneLabel: 'మొబైల్ నంబర్',
      phonePlaceholder: '10-అంకెల మొబైల్ నంబర్',
    },
    phrases: {
      available: 'అందుబాటులో',
      reserved: 'రిజర్వ్',
      sold: 'అమ్ముడైంది',
      plots: 'ప్లాట్లు',
      sqYards: 'చ. గజాలు',
      sqFeet: 'చ. అడుగులు',
      facing: 'ఫేసింగ్',
      east: 'తూర్పు',
      west: 'పడమర',
      north: 'ఉత్తరం',
      south: 'దక్షిణం',
    }
  },

  hi: {
    // UI Labels (Hindi)
    uiLabels: {
      chatTitle: 'GV सहायता',
      chatSubtitle: 'संपत्ति सहायक',
      typePlaceholder: 'अपना प्रश्न टाइप करें...',
      sendButton: 'भेजें',
      closeButton: 'बंद करें',
      languageLabel: 'भाषा',
    },
    greeting: 'GV इन्फ्रा प्रोजेक्ट्स में आपका स्वागत है। मैं आपका संपत्ति सहायक हूँ। मैं आज आपकी संपत्ति पूछताछ में कैसे सहायता कर सकता हूँ?',
    resetMessage: 'मैंने हमारी बातचीत को रीसेट कर दिया है। मैं आपको हमारे प्लॉट विकास के बारे में कैसे मार्गदर्शन कर सकता हूँ?',
    quickActions: {
      exploreProjects: 'परियोजनाओं का अन्वेषण करें',
      findPlot: 'प्लॉट खोजें',
      viewMasterplan: '3D मास्टरप्लान देखें',
      checkPricing: 'मूल्य और EMI जांचें',
      bookSiteVisit: 'साइट विज़िट बुक करें',
      talkSales: 'सेल्स से बात करें',
      mainMenu: 'मुख्य मेनू',
      callNow: 'अभी कॉल करें',
      whatsapp: 'WhatsApp सेल्स',
      openMaps: 'Google Maps खोलें ↗',
      backMenu: 'मेनू पर वापस',
      showAll: 'सभी आकार दिखाएं',
      anyFacing: 'कोई भी फेसिंग',
      viewAll: 'सभी उपलब्ध प्लॉट देखें',
      talkAdvisor: 'सेल्स सलाहकार से बात करें',
      requestCallback: 'कॉलबैक अनुरोध',
      submitForm: 'पुष्टि करें और कॉलबैक अनुरोध करें →',
    },
    fallbackMessage: 'मेरे पास उस विशिष्ट प्रश्न के लिए सत्यापित जानकारी नहीं है। हालाँकि, आपके GV इन्फ्रा संपत्ति सहायक के रूप में, मैं आपको सत्यापित परियोजना विवरण के साथ मदद कर सकता हूँ:',
    errorMessage: 'आपके अनुरोध को संसाधित करने में मुझे एक समस्या का सामना करना पड़ा। कृपया फिर से प्रयास करें या सीधे हमारी बिक्री टीम से संपर्क करें।',
    formLabels: {
      formTitle: 'शॉर्टलिस्ट और साइट विज़िट अनुरोध',
      nameLabel: 'आपका पूरा नाम',
      namePlaceholder: 'उदा. K. वेंकट रेड्डी',
      phoneLabel: 'मोबाइल नंबर',
      phonePlaceholder: '10-अंकीय मोबाइल नंबर',
    },
    phrases: {
      available: 'उपलब्ध',
      reserved: 'आरक्षित',
      sold: 'बिक गया',
      plots: 'प्लॉट',
      sqYards: 'वर्ग गज',
      sqFeet: 'वर्ग फुट',
      facing: 'फेसिंग',
      east: 'पूर्व',
      west: 'पश्चिम',
      north: 'उत्तर',
      south: 'दक्षिण',
    }
  },

  ta: {
    // UI Labels (Tamil)
    uiLabels: {
      chatTitle: 'GV உதவி',
      chatSubtitle: 'சொத்து உதவியாளர்',
      typePlaceholder: 'உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள்...',
      sendButton: 'அனுப்பு',
      closeButton: 'மூடு',
      languageLabel: 'மொழி',
    },
    greeting: 'GV இன்ஃப்ரா ப்ராஜெக்ட்ஸுக்கு வரவேற்கிறோம். நான் உங்கள் சொத்து உதவியாளர். இன்று உங்கள் சொத்து விசாரணையில் நான் எவ்வாறு உதவ முடியும்?',
    resetMessage: 'நான் எங்கள் உரையாடலை மீட்டமைத்துள்ளேன். எங்கள் ப்ளாட் டெவலப்மெண்ட்கள் முழுவதும் நான் உங்களுக்கு எவ்வாறு வழிகாட்ட முடியும்?',
    quickActions: {
      exploreProjects: 'திட்டங்களை ஆராயுங்கள்',
      findPlot: 'ப்ளாட் கண்டுபிடி',
      viewMasterplan: '3D மாஸ்டர்ப்ளான் பார்க்கவும்',
      checkPricing: 'விலை & EMI சரிபார்க்கவும்',
      bookSiteVisit: 'தள பார்வை பதிவு செய்க',
      talkSales: 'விற்பனையுடன் பேசுங்கள்',
      mainMenu: 'முதன்மை மெனு',
      callNow: 'இப்போது அழைக்கவும்',
      whatsapp: 'WhatsApp விற்பனை',
      openMaps: 'Google Maps திறக்கவும் ↗',
      backMenu: 'மெனுவிற்குத் திரும்பு',
      showAll: 'அனைத்து அளவுகளையும் காட்டு',
      anyFacing: 'எந்த திசையும்',
      viewAll: 'கிடைக்கக்கூடிய அனைத்து ப்ளாட்களையும் பார்க்கவும்',
      talkAdvisor: 'விற்பனை ஆலோசகருடன் பேசுங்கள்',
      requestCallback: 'கால்பேக் கோரிக்கை',
      submitForm: 'உறுதிப்படுத்தி கால்பேக் கோரவும் →',
    },
    fallbackMessage: 'அந்த குறிப்பிட்ட கேள்விக்கு என்னிடம் சரிபார்க்கப்பட்ட தகவல் இல்லை. இருப்பினும், உங்கள் GV இன்ஃப்ரா சொத்து உதவியாளராக, சரிபார்க்கப்பட்ட திட்ட விவரங்களுடன் நான் உங்களுக்கு உதவ முடியும்:',
    errorMessage: 'உங்கள் கோரிக்கையை செயலாக்குவதில் நான் ஒரு சிக்கலை எதிர்கொண்டேன். தயவுசெய்து மீண்டும் முயற்சிக்கவும் அல்லது எங்கள் விற்பனை குழுவை நேரடியாக தொடர்பு கொள்ளவும்.',
    formLabels: {
      formTitle: 'குறுகிய பட்டியல் & தள பார்வை கோரிக்கை',
      nameLabel: 'உங்கள் முழு பெயர்',
      namePlaceholder: 'எ.கா. K. வெங்கட் ரெட்டி',
      phoneLabel: 'மொபைல் எண்',
      phonePlaceholder: '10-இலக்க மொபைல் எண்',
    },
    phrases: {
      available: 'கிடைக்கிறது',
      reserved: 'ஒதுக்கப்பட்டது',
      sold: 'விற்கப்பட்டது',
      plots: 'ப்ளாட்கள்',
      sqYards: 'சதுர கெஜம்',
      sqFeet: 'சதுர அடி',
      facing: 'திசை',
      east: 'கிழக்கு',
      west: 'மேற்கு',
      north: 'வடக்கு',
      south: 'தெற்கு',
    }
  },

  kn: {
    // UI Labels (Kannada)
    uiLabels: {
      chatTitle: 'GV ಸಹಾಯ',
      chatSubtitle: 'ಆಸ್ತಿ ಸಹಾಯಕ',
      typePlaceholder: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ...',
      sendButton: 'ಕಳುಹಿಸು',
      closeButton: 'ಮುಚ್ಚು',
      languageLabel: 'ಭಾಷೆ',
    },
    greeting: 'GV ಇನ್‌ಫ್ರಾ ಪ್ರಾಜೆಕ್ಟ್ಸ್‌ಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ ಆಸ್ತಿ ಸಹಾಯಕ. ಇಂದು ನಿಮ್ಮ ಆಸ್ತಿ ವಿಚಾರಣೆಯಲ್ಲಿ ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
    resetMessage: 'ನಾನು ನಮ್ಮ ಸಂಭಾಷಣೆಯನ್ನು ಮರುಹೊಂದಿಸಿದ್ದೇನೆ. ನಮ್ಮ ಪ್ಲಾಟ್ ಅಭಿವೃದ್ಧಿಗಳ ಮೂಲಕ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡಬಹುದು?',
    quickActions: {
      exploreProjects: 'ಯೋಜನೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ',
      findPlot: 'ಪ್ಲಾಟ್ ಹುಡುಕಿ',
      viewMasterplan: '3D ಮಾಸ್ಟರ್‌ಪ್ಲಾನ್ ವೀಕ್ಷಿಸಿ',
      checkPricing: 'ಬೆಲೆ ಮತ್ತು EMI ಪರಿಶೀಲಿಸಿ',
      bookSiteVisit: 'ಸೈಟ್ ಭೇಟಿ ಬುಕ್ ಮಾಡಿ',
      talkSales: 'ಮಾರಾಟದೊಂದಿಗೆ ಮಾತನಾಡಿ',
      mainMenu: 'ಮುಖ್ಯ ಮೆನು',
      callNow: 'ಈಗ ಕರೆ ಮಾಡಿ',
      whatsapp: 'WhatsApp ಮಾರಾಟ',
      openMaps: 'Google Maps ತೆರೆಯಿರಿ ↗',
      backMenu: 'ಮೆನುಗೆ ಹಿಂತಿರುಗಿ',
      showAll: 'ಎಲ್ಲಾ ಗಾತ್ರಗಳನ್ನು ತೋರಿಸು',
      anyFacing: 'ಯಾವುದೇ ದಿಕ್ಕು',
      viewAll: 'ಲಭ್ಯವಿರುವ ಎಲ್ಲಾ ಪ್ಲಾಟ್‌ಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
      talkAdvisor: 'ಮಾರಾಟ ಸಲಹೆಗಾರರೊಂದಿಗೆ ಮಾತನಾಡಿ',
      requestCallback: 'ಕಾಲ್‌ಬ್ಯಾಕ್ ವಿನಂತಿ',
      submitForm: 'ದೃಢೀಕರಿಸಿ ಮತ್ತು ಕಾಲ್‌ಬ್ಯಾಕ್ ವಿನಂತಿಸಿ →',
    },
    fallbackMessage: 'ಆ ನಿರ್ದಿಷ್ಟ ಪ್ರಶ್ನೆಗೆ ನನ್ನ ಬಳಿ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ಇಲ್ಲ. ಆದರೆ, ನಿಮ್ಮ GV ಇನ್‌ಫ್ರಾ ಆಸ್ತಿ ಸಹಾಯಕನಾಗಿ, ಪರಿಶೀಲಿಸಿದ ಯೋಜನಾ ವಿವರಗಳೊಂದಿಗೆ ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:',
    errorMessage: 'ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುವಲ್ಲಿ ನಾನು ಸಮಸ್ಯೆಯನ್ನು ಎದುರಿಸಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ನಮ್ಮ ಮಾರಾಟ ತಂಡವನ್ನು ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸಿ.',
    formLabels: {
      formTitle: 'ಕಿರುಪಟ್ಟಿ ಮತ್ತು ಸೈಟ್ ಭೇಟಿ ವಿನಂತಿ',
      nameLabel: 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು',
      namePlaceholder: 'ಉದಾ. K. ವೆಂಕಟ್ ರೆಡ್ಡಿ',
      phoneLabel: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
      phonePlaceholder: '10-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    },
    phrases: {
      available: 'ಲಭ್ಯವಿದೆ',
      reserved: 'ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ',
      sold: 'ಮಾರಾಟವಾಗಿದೆ',
      plots: 'ಪ್ಲಾಟ್‌ಗಳು',
      sqYards: 'ಚದರ ಗಜಗಳು',
      sqFeet: 'ಚದರ ಅಡಿ',
      facing: 'ದಿಕ್ಕು',
      east: 'ಪೂರ್ವ',
      west: 'ಪಶ್ಚಿಮ',
      north: 'ಉತ್ತರ',
      south: 'ದಕ್ಷಿಣ',
    }
  },

  ml: {
    // UI Labels (Malayalam)
    uiLabels: {
      chatTitle: 'GV സഹായം',
      chatSubtitle: 'വസ്തു സഹായി',
      typePlaceholder: 'നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യുക...',
      sendButton: 'അയയ്ക്കുക',
      closeButton: 'അടയ്ക്കുക',
      languageLabel: 'ഭാഷ',
    },
    greeting: 'GV ഇൻഫ്രാ പ്രോജക്ട്സിലേക്ക് സ്വാഗതം. ഞാൻ നിങ്ങളുടെ വസ്തു സഹായിയാണ്. ഇന്ന് നിങ്ങളുടെ വസ്തു അന്വേഷണത്തിൽ എനിക്ക് എങ്ങനെ സഹായിക്കാം?',
    resetMessage: 'ഞാൻ ഞങ്ങളുടെ സംഭാഷണം പുനഃക്രമീകരിച്ചു. ഞങ്ങളുടെ പ്ലോട്ട് വികസനങ്ങളിലൂടെ എനിക്ക് നിങ്ങളെ എങ്ങനെ നയിക്കാം?',
    quickActions: {
      exploreProjects: 'പ്രോജക്ടുകൾ പര്യവേക്ഷണം ചെയ്യുക',
      findPlot: 'പ്ലോട്ട് കണ്ടെത്തുക',
      viewMasterplan: '3D മാസ്റ്റർപ്ലാൻ കാണുക',
      checkPricing: 'വില & EMI പരിശോധിക്കുക',
      bookSiteVisit: 'സൈറ്റ് സന്ദർശനം ബുക്ക് ചെയ്യുക',
      talkSales: 'വിൽപ്പനയുമായി സംസാരിക്കുക',
      mainMenu: 'പ്രധാന മെനു',
      callNow: 'ഇപ്പോൾ വിളിക്കുക',
      whatsapp: 'WhatsApp വിൽപ്പന',
      openMaps: 'Google Maps തുറക്കുക ↗',
      backMenu: 'മെനുവിലേക്ക് മടങ്ങുക',
      showAll: 'എല്ലാ വലുപ്പങ്ങളും കാണിക്കുക',
      anyFacing: 'ഏതെങ്കിലും ദിശ',
      viewAll: 'ലഭ്യമായ എല്ലാ പ്ലോട്ടുകളും കാണുക',
      talkAdvisor: 'വിൽപ്പന ഉപദേശകനുമായി സംസാരിക്കുക',
      requestCallback: 'കോൾബാക്ക് അഭ്യർത്ഥന',
      submitForm: 'സ്ഥിരീകരിച്ച് കോൾബാക്ക് അഭ്യർത്ഥിക്കുക →',
    },
    fallbackMessage: 'ആ നിർദ്ദിഷ്ട ചോദ്യത്തിന് എന്റെ പക്കൽ പരിശോധിച്ച വിവരങ്ങൾ ഇല്ല. എന്നിരുന്നാലും, നിങ്ങളുടെ GV ഇൻഫ്രാ വസ്തു സഹായിയെന്ന നിലയിൽ, പരിശോധിച്ച പ്രോജക്ട് വിശദാംശങ്ങൾ ഉപയോഗിച്ച് എനിക്ക് നിങ്ങളെ സഹായിക്കാൻ കഴിയും:',
    errorMessage: 'നിങ്ങളുടെ അഭ്യർത്ഥന പ്രോസസ്സ് ചെയ്യുന്നതിൽ എനിക്ക് ഒരു പ്രശ്നം നേരിട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ ഞങ്ങളുടെ വിൽപ്പന ടീമിനെ നേരിട്ട് ബന്ധപ്പെടുക.',
    formLabels: {
      formTitle: 'ഷോർട്ട്ലിസ്റ്റ് & സൈറ്റ് സന്ദർശന അഭ്യർത്ഥന',
      nameLabel: 'നിങ്ങളുടെ പൂർണ്ണ നാമം',
      namePlaceholder: 'ഉദാ. K. വെങ്കട് റെഡ്ഡി',
      phoneLabel: 'മൊബൈൽ നമ്പർ',
      phonePlaceholder: '10-അക്ക മൊബൈൽ നമ്പർ',
    },
    phrases: {
      available: 'ലഭ്യമാണ്',
      reserved: 'റിസർവ്',
      sold: 'വിറ്റു',
      plots: 'പ്ലോട്ടുകൾ',
      sqYards: 'ചതുര യാർഡ്',
      sqFeet: 'ചതുര അടി',
      facing: 'ദിശ',
      east: 'കിഴക്ക്',
      west: 'പടിഞ്ഞാറ്',
      north: 'വടക്ക്',
      south: 'തെക്ക്',
    }
  },

  mr: {
    // UI Labels (Marathi)
    uiLabels: {
      chatTitle: 'GV मदत',
      chatSubtitle: 'मालमत्ता सहाय्यक',
      typePlaceholder: 'तुमचा प्रश्न टाइप करा...',
      sendButton: 'पाठवा',
      closeButton: 'बंद करा',
      languageLabel: 'भाषा',
    },
    greeting: 'GV इन्फ्रा प्रोजेक्ट्समध्ये आपले स्वागत आहे. मी तुमचा मालमत्ता सहाय्यक आहे. मी आज तुमच्या मालमत्ता चौकशीत कशी मदत करू शकतो?',
    resetMessage: 'मी आमचे संभाषण रीसेट केले आहे. मी तुम्हाला आमच्या प्लॉट विकासांमध्ये कसे मार्गदर्शन करू शकतो?',
    quickActions: {
      exploreProjects: 'प्रकल्प एक्सप्लोर करा',
      findPlot: 'प्लॉट शोधा',
      viewMasterplan: '3D मास्टरप्लॅन पहा',
      checkPricing: 'किंमत आणि EMI तपासा',
      bookSiteVisit: 'साइट भेट बुक करा',
      talkSales: 'विक्रीशी बोला',
      mainMenu: 'मुख्य मेनू',
      callNow: 'आता कॉल करा',
      whatsapp: 'WhatsApp विक्री',
      openMaps: 'Google Maps उघडा ↗',
      backMenu: 'मेनूवर परत जा',
      showAll: 'सर्व आकार दाखवा',
      anyFacing: 'कोणतीही दिशा',
      viewAll: 'उपलब्ध सर्व प्लॉट पहा',
      talkAdvisor: 'विक्री सल्लागाराशी बोला',
      requestCallback: 'कॉलबॅक विनंती',
      submitForm: 'पुष्टी करा आणि कॉलबॅक विनंती करा →',
    },
    fallbackMessage: 'माझ्याकडे त्या विशिष्ट प्रश्नासाठी सत्यापित माहिती नाही. तथापि, तुमचा GV इन्फ्रा मालमत्ता सहाय्यक म्हणून, मी तुम्हाला सत्यापित प्रकल्प तपशीलांसह मदत करू शकतो:',
    errorMessage: 'तुमची विनंती प्रक्रिया करताना मला समस्या आली. कृपया पुन्हा प्रयत्न करा किंवा आमच्या विक्री टीमशी थेट संपर्क साधा.',
    formLabels: {
      formTitle: 'शॉर्टलिस्ट आणि साइट भेट विनंती',
      nameLabel: 'तुमचे पूर्ण नाव',
      namePlaceholder: 'उदा. K. वेंकट रेड्डी',
      phoneLabel: 'मोबाइल नंबर',
      phonePlaceholder: '10-अंकी मोबाइल नंबर',
    },
    phrases: {
      available: 'उपलब्ध',
      reserved: 'राखीव',
      sold: 'विकले गेले',
      plots: 'प्लॉट्स',
      sqYards: 'चौरस यार्ड',
      sqFeet: 'चौरस फूट',
      facing: 'दिशा',
      east: 'पूर्व',
      west: 'पश्चिम',
      north: 'उत्तर',
      south: 'दक्षिण',
    }
  },

  bn: {
    // UI Labels (Bengali)
    uiLabels: {
      chatTitle: 'GV সাহায্য',
      chatSubtitle: 'সম্পত্তি সহায়ক',
      typePlaceholder: 'আপনার প্রশ্ন টাইপ করুন...',
      sendButton: 'পাঠান',
      closeButton: 'বন্ধ করুন',
      languageLabel: 'ভাষা',
    },
    greeting: 'GV ইনফ্রা প্রজেক্টসে আপনাকে স্বাগতম। আমি আপনার সম্পত্তি সহায়ক। আজ আমি কীভাবে আপনার সম্পত্তি অনুসন্ধানে সাহায্য করতে পারি?',
    resetMessage: 'আমি আমাদের কথোপকথন রিসেট করেছি। আমি কীভাবে আমাদের প্লট উন্নয়নের মাধ্যমে আপনাকে গাইড করতে পারি?',
    quickActions: {
      exploreProjects: 'প্রকল্পগুলি অন্বেষণ করুন',
      findPlot: 'প্লট খুঁজুন',
      viewMasterplan: '3D মাস্টারপ্ল্যান দেখুন',
      checkPricing: 'মূল্য ও EMI পরীক্ষা করুন',
      bookSiteVisit: 'সাইট পরিদর্শন বুক করুন',
      talkSales: 'বিক্রয়ের সাথে কথা বলুন',
      mainMenu: 'প্রধান মেনু',
      callNow: 'এখনই কল করুন',
      whatsapp: 'WhatsApp বিক্রয়',
      openMaps: 'Google Maps খুলুন ↗',
      backMenu: 'মেনুতে ফিরে যান',
      showAll: 'সমস্ত আকার দেখান',
      anyFacing: 'যেকোন দিক',
      viewAll: 'উপলব্ধ সমস্ত প্লট দেখুন',
      talkAdvisor: 'বিক্রয় উপদেষ্টার সাথে কথা বলুন',
      requestCallback: 'কলব্যাক অনুরোধ',
      submitForm: 'নিশ্চিত করুন এবং কলব্যাক অনুরোধ করুন →',
    },
    fallbackMessage: 'সেই নির্দিষ্ট প্রশ্নের জন্য আমার কাছে যাচাইকৃত তথ্য নেই। তবে, আপনার GV ইনফ্রা সম্পত্তি সহায়ক হিসাবে, আমি আপনাকে যাচাইকৃত প্রকল্পের বিবরণ দিয়ে সাহায্য করতে পারি:',
    errorMessage: 'আপনার অনুরোধ প্রক্রিয়া করতে আমি একটি সমস্যার সম্মুখীন হয়েছি। অনুগ্রহ করে আবার চেষ্টা করুন বা সরাসরি আমাদের বিক্রয় দলের সাথে যোগাযোগ করুন।',
    formLabels: {
      formTitle: 'শর্টলিস্ট এবং সাইট পরিদর্শন অনুরোধ',
      nameLabel: 'আপনার সম্পূর্ণ নাম',
      namePlaceholder: 'উদা. K. ভেঙ্কট রেড্ডি',
      phoneLabel: 'মোবাইল নম্বর',
      phonePlaceholder: '10-সংখ্যার মোবাইল নম্বর',
    },
    phrases: {
      available: 'উপলব্ধ',
      reserved: 'সংরক্ষিত',
      sold: 'বিক্রিত',
      plots: 'প্লট',
      sqYards: 'বর্গ গজ',
      sqFeet: 'বর্গ ফুট',
      facing: 'দিক',
      east: 'পূর্ব',
      west: 'পশ্চিম',
      north: 'উত্তর',
      south: 'দক্ষিণ',
    }
  }
};

// Utility function to get localized text
function getLocalizedText(lang, key) {
  const langData = CHATBOT_I18N[lang] || CHATBOT_I18N.en;
  const keys = key.split('.');
  let result = langData;
  for (const k of keys) {
    result = result?.[k];
    if (!result) return CHATBOT_I18N.en[keys[0]]?.[keys[1]] || key;
  }
  return result;
}

// Language persistence
function saveLanguagePreference(lang) {
  try {
    localStorage.setItem('gv_chatbot_lang', lang);
  } catch (e) {
    console.warn('[GV Chatbot] Could not save language preference:', e);
  }
}

function loadLanguagePreference() {
  try {
    return localStorage.getItem('gv_chatbot_lang') || 'en';
  } catch (e) {
    return 'en';
  }
}

if (typeof window !== 'undefined') {
  window.CHATBOT_I18N = CHATBOT_I18N;
  window.getLocalizedText = getLocalizedText;
  window.saveLanguagePreference = saveLanguagePreference;
  window.loadLanguagePreference = loadLanguagePreference;
}
