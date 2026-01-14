/**
 * TecBlu Calculator Widget - Main Entry Point
 * This file is the entry point for the bundled embed script
 */

import { detectLanguage, applyTranslations } from './localization.js';
import { initCalculator } from './calculator.js';

// These will be replaced by the build script with actual content
const CSS_CONTENT = '/* __CSS_PLACEHOLDER__ */';
const HTML_CONTENT = '<!-- __HTML_PLACEHOLDER__ -->';
const TRANSLATIONS = {
  de: '__DE_PLACEHOLDER__',
  en: '__EN_PLACEHOLDER__',
  fr: '__FR_PLACEHOLDER__',
  it: '__IT_PLACEHOLDER__'
};

// Font loading
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';

/**
 * Initialize the TecBlu Calculator Widget
 */
function init() {
  // Find the container element
  const container = document.getElementById('tecblu-calculator');

  if (!container) {
    console.warn('TecBlu Calculator: Container element #tecblu-calculator not found');
    return;
  }

  // Detect language
  const lang = detectLanguage();

  // Load Google Fonts
  loadFonts();

  // Inject CSS
  injectStyles();

  // Inject HTML
  container.innerHTML = HTML_CONTENT;

  // Get translations
  const translations = TRANSLATIONS[lang] || TRANSLATIONS.de;

  // Apply translations
  const wrapper = container.querySelector('.tec-calc-wrapper');
  if (wrapper) {
    applyTranslations(wrapper, translations);
  }

  // Initialize calculator logic
  initCalculator(lang);

  // Mark as initialized
  container.dataset.tecbluInit = 'true';
}

/**
 * Load Google Fonts
 */
function loadFonts() {
  // Check if font is already loaded
  if (document.querySelector(`link[href*="fonts.googleapis.com/css2?family=Inter"]`)) {
    return;
  }

  // Add preconnect hints
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect2);

  // Load font stylesheet
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = FONT_URL;
  document.head.appendChild(fontLink);
}

/**
 * Inject CSS styles into the document
 */
function injectStyles() {
  // Check if styles are already injected
  if (document.getElementById('tecblu-calc-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'tecblu-calc-styles';
  style.textContent = CSS_CONTENT;
  document.head.appendChild(style);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for manual initialization if needed
window.TecBluCalc = {
  init,
  detectLanguage
};
