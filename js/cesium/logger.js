class Logger {
  static info(module, message, data) {
    window.dispatchEvent(new CustomEvent('app:log', {
      detail: { level: 'info', module, message, data, timestamp: Date.now() }
    }));
  }
  static warn(module, message, data) {
    window.dispatchEvent(new CustomEvent('app:log', {
      detail: { level: 'warn', module, message, data, timestamp: Date.now() }
    }));
  }
  static error(module, message, data) {
    window.dispatchEvent(new CustomEvent('app:log', {
      detail: { level: 'error', module, message, data, timestamp: Date.now() }
    }));
  }
}

// Global Export
if (typeof window !== 'undefined') {
  window.Logger = Logger;
}
