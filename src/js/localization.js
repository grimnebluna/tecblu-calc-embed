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

// Country configuration
export const COUNTRY_CONFIG = {
  CH: { currency: 'CHF', tecCost: 0.0463, dieselPrice: 1.95, heatingPrice: 1.35, locale: 'de-CH' },
  DE: { currency: 'EUR', tecCost: 0.049,  dieselPrice: 1.60, heatingPrice: 1.30, locale: 'de-DE' },
  AT: { currency: 'EUR', tecCost: 0.049,  dieselPrice: 1.60, heatingPrice: 1.30, locale: 'de-AT' },
  FR: { currency: 'EUR', tecCost: 0.049,  dieselPrice: 1.60, heatingPrice: 1.30, locale: 'fr-FR' },
  IT: { currency: 'EUR', tecCost: 0.058,  dieselPrice: 1.60, heatingPrice: 1.30, locale: 'it-IT' }
};

/**
 * Detect country based on:
 * 1. URL parameter (?country=XX) - for testing
 * 2. Hostname pattern matching
 * 3. Fallback to Switzerland (CH)
 */
export function detectCountry() {
  // 1. Check URL parameter first (useful for testing)
  const urlParams = new URLSearchParams(window.location.search);
  const countryParam = urlParams.get('country');
  if (countryParam && COUNTRY_CONFIG[countryParam.toUpperCase()]) {
    return countryParam.toUpperCase();
  }

  // 2. Check hostname patterns
  const hostname = window.location.hostname;
  if (hostname.includes('tecblu.de')) return 'DE';
  if (hostname.includes('tecblu.at')) return 'AT';
  if (hostname.includes('tecblu.fr')) return 'FR';
  if (hostname.includes('tecblu.it')) return 'IT';

  // 3. Default to Switzerland
  return 'CH';
}

/**
 * Get quote URL based on hostname
 * @param {Object} translations - All translations object {de: {...}, en: {...}, fr: {...}, it: {...}}
 */
export function getQuoteUrl(translations) {
  const hostname = window.location.hostname;

  // English subdomains get English URL
  if (hostname === 'en.tecblu.de' || hostname === 'en.tecblu.fr' ||
      hostname === 'en.tecblu.it' || hostname === 'en.tecblu.at') {
    return translations?.en?.cta?.quoteUrl || '/get-a-quote';
  }

  // French domain gets French URL
  if (hostname === 'tecblu.fr') {
    return translations?.fr?.cta?.quoteUrl || '/demande-de-devis';
  }

  // Italian domain gets Italian URL
  if (hostname === 'tecblu.it') {
    return translations?.it?.cta?.quoteUrl || '/richiedi-preventivo';
  }

  // Default: German URL (tecblu.ch, tecblu.de, tecblu.at, and all Swiss subdomains)
  return translations?.de?.cta?.quoteUrl || '/offerte-einholen';
}

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
  const rounded = Math.round(Math.min(value, 999999999999));

  if (currency === 'EUR') {
    // European format: 1.234,00 €
    const formatted = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(rounded);
    return `${formatted} €`;
  }

  // CHF format: CHF 1'234.–
  const formatted = new Intl.NumberFormat('de-CH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(rounded);
  return `CHF ${formatted}.–`;
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
