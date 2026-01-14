/**
 * Locale detection for TecBlu domains
 * 
 * Domain structure:
 * - tecblu.ch, tecblu.at, tecblu.de → German
 * - en.tecblu.ch, en.tecblu.at, etc. → English
 * - fr.tecblu.ch, tecblu.fr → French
 * - it.tecblu.ch, tecblu.it → Italian
 */

// Import translations
import de from './i18n/de.json';
import en from './i18n/en.json';
import fr from './i18n/fr.json';
import it from './i18n/it.json';

const translations = { de, en, fr, it };

// Default prices per country (diesel)
const defaultPrices = {
  CH: { diesel: 1.95, heating: 1.35 },
  AT: { diesel: 1.55, heating: 1.10 },
  DE: { diesel: 1.65, heating: 1.05 },
  FR: { diesel: 1.75, heating: 1.15 },
  IT: { diesel: 1.80, heating: 1.20 }
};

/**
 * Detect locale from current URL
 * @returns {{ lang: string, country: string, currency: string, prices: object }}
 */
export function detectLocale() {
  const host = window.location.hostname.toLowerCase();
  
  // Extract subdomain and TLD
  const parts = host.split('.');
  const subdomain = parts.length > 2 ? parts[0] : null;
  const tld = parts[parts.length - 1];
  
  let lang = 'de';
  let country = 'CH';
  
  // 1. Check for language subdomain (en., fr., it.)
  if (subdomain && ['en', 'fr', 'it'].includes(subdomain)) {
    lang = subdomain;
  }
  // 2. Check TLD for non-prefixed domains
  else if (tld === 'fr') {
    lang = 'fr';
  } else if (tld === 'it') {
    lang = 'it';
  }
  // 3. Default: German
  
  // Determine country from TLD
  if (tld === 'at') country = 'AT';
  else if (tld === 'de') country = 'DE';
  else if (tld === 'fr') country = 'FR';
  else if (tld === 'it') country = 'IT';
  else country = 'CH';
  
  // Currency based on country
  const currency = country === 'CH' ? 'CHF' : 'EUR';
  
  // Default prices for this country
  const prices = defaultPrices[country] || defaultPrices.CH;
  
  return { lang, country, currency, prices };
}

/**
 * Get translation strings for a language
 * @param {string} lang - Language code (de, en, fr, it)
 * @returns {object} Translation object
 */
export function getTranslations(lang) {
  return translations[lang] || translations.de;
}

/**
 * Get number formatter for locale
 * @param {string} lang - Language code
 * @param {string} country - Country code
 * @returns {function} Formatter function
 */
export function getFormatter(lang, country) {
  // Map to proper locale codes
  const localeMap = {
    'de-CH': 'de-CH',
    'de-AT': 'de-AT',
    'de-DE': 'de-DE',
    'en-CH': 'en-CH',
    'en-AT': 'en-AT',
    'en-DE': 'en-DE',
    'en-FR': 'en-FR',
    'en-IT': 'en-IT',
    'fr-CH': 'fr-CH',
    'fr-FR': 'fr-FR',
    'it-CH': 'it-CH',
    'it-IT': 'it-IT'
  };
  
  const locale = localeMap[`${lang}-${country}`] || 'de-CH';
  
  return {
    number: (n, decimals = 0) => new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(n),
    
    currency: (n, currency) => {
      // Swiss style: "CHF 1'234.–"
      if (currency === 'CHF') {
        return `CHF ${new Intl.NumberFormat('de-CH').format(Math.round(n))}.–`;
      }
      // Euro style: "€ 1.234,–" or "1.234 €"
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(n);
    }
  };
}
