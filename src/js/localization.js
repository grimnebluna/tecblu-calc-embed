/**
 * TecBlu Calculator - Localization Module
 * Handles language detection and translation application
 */

// URL patterns for language detection
const URL_PATTERNS = {
  de: [/^tecblu\.(ch|at|de)$/],
  en: [/^en\.tecblu\.(ch|at|de|fr|it)$/],
  fr: [/^fr\.tecblu\.ch$/, /^tecblu\.fr$/],
  it: [/^it\.tecblu\.ch$/, /^tecblu\.it$/]
};

// Supported languages
const SUPPORTED_LANGS = ['de', 'en', 'fr', 'it'];

/**
 * Detect language based on:
 * 1. URL parameter (?lang=xx) - for testing
 * 2. Hostname pattern matching
 * 3. Fallback to German (de)
 */
export function detectLanguage() {
  // 1. Check URL parameter first (useful for testing)
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam && SUPPORTED_LANGS.includes(langParam)) {
    return langParam;
  }

  // 2. Check hostname patterns
  const hostname = window.location.hostname;
  for (const [lang, patterns] of Object.entries(URL_PATTERNS)) {
    if (patterns.some(p => p.test(hostname))) {
      return lang;
    }
  }

  // 3. Default to German
  return 'de';
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - The object to search
 * @param {string} path - Dot notation path (e.g., "header.title")
 * @returns {string|undefined} The value or undefined if not found
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Apply translations to all elements with data-i18n attribute
 * @param {HTMLElement} container - The container element
 * @param {Object} translations - The translation object
 */
export function applyTranslations(container, translations) {
  // Find all elements with data-i18n attribute
  const elements = container.querySelectorAll('[data-i18n]');

  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = getNestedValue(translations, key);

    if (translation) {
      // Handle special cases
      if (el.tagName === 'OPTION') {
        el.textContent = translation;
      } else if (el.classList.contains('tec-tooltip')) {
        // For tooltips, only update the text node, not the tooltip span
        const tooltipSpan = el.querySelector('.tec-tooltip-text');
        const tooltipKey = el.getAttribute('data-i18n-tooltip');

        // Update main text (first text node)
        const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
        if (textNode) {
          textNode.textContent = translation;
        } else {
          // Insert text before tooltip span
          if (tooltipSpan) {
            el.insertBefore(document.createTextNode(translation), tooltipSpan);
          } else {
            el.textContent = translation;
          }
        }

        // Update tooltip text if exists
        if (tooltipSpan && tooltipKey) {
          const tooltipTranslation = getNestedValue(translations, tooltipKey);
          if (tooltipTranslation) {
            tooltipSpan.textContent = tooltipTranslation;
          }
        }
      } else {
        // Standard text replacement
        el.textContent = translation;
      }
    }
  });

  // Store translations reference for dynamic updates
  container._tecTranslations = translations;
}

/**
 * Format currency value
 * @param {number} value - The number to format
 * @param {string} currency - Currency code (default: CHF)
 * @param {string} lang - Language code for locale
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'CHF', lang = 'de') {
  const localeMap = {
    de: 'de-CH',
    en: 'en-CH',
    fr: 'fr-CH',
    it: 'it-CH'
  };

  const locale = localeMap[lang] || 'de-CH';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(Math.min(value, 999999999999)));

  return `${currency} ${formatted}.–`;
}

/**
 * Format number with locale
 * @param {number} value - The number to format
 * @param {number} decimals - Decimal places
 * @param {string} lang - Language code
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 0, lang = 'de') {
  const localeMap = {
    de: 'de-CH',
    en: 'en-CH',
    fr: 'fr-CH',
    it: 'it-CH'
  };

  const locale = localeMap[lang] || 'de-CH';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Math.min(value, 999999999999));
}

export { SUPPORTED_LANGS };
