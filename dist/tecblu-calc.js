/**
 * TecBlu Calculator Widget
 * Embeddable savings calculator for TecBlu products
 *
 * Usage:
 *   <div id="tecblu-calculator"></div>
 *   <script src="https://cdn.jsdelivr.net/gh/grimnebluna/tecblu-calc-embed@main/dist/tecblu-calc.js"></script>
 *
 * Language is auto-detected from hostname, or use ?lang=de|en|fr|it
 */

(function() {
  'use strict';

  // ==================== LOCALIZATION ====================

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
function detectLanguage() {
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
function applyTranslations(container, translations) {
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
function formatCurrency(value, currency = 'CHF', lang = 'de') {
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
function formatNumber(value, decimals = 0, lang = 'de') {
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

  // ==================== CALCULATOR ====================

/**
 * TecBlu Calculator - Core Calculation Logic
 */

// Constants
const TEC_COST = 0.0463;
const CO2_LITER = 2.65;
const MAX_OUT = 999999999999;

// Building presets for heating oil consumption
const BUILDING_PRESETS = {
  single: 3000,
  multi: 8000,
  commercial: 50000
};

// Input limits
const LIMITS = {
  km: [1000, 300000],
  cons: [1, 150],
  vehicles: [1, 1000],
  heating: [500, 500000],
  price: [0.5, 5],
  savings: [1, 25]
};

// State
let currentTab = 'diesel';
let vehicles = 5;
let currentLang = 'de';

// DOM helpers
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Initialize the calculator
 * @param {string} lang - Language code
 */
function initCalculator(lang = 'de') {
  currentLang = lang;

  // Bind all functions to window for onclick handlers
  window.tecSwitchTab = switchTab;
  window.tecSetVehicles = setVehicles;
  window.tecToggleCustomVehicles = toggleCustomVehicles;
  window.tecCalcRaw = calcRaw;
  window.tecCalcRawVehicles = calcRawVehicles;
  window.tecClampVehicles = clampVehicles;
  window.tecClampConsumption = clampConsumption;
  window.tecSyncKm = syncKm;
  window.tecSyncKmRaw = syncKmRaw;
  window.tecClampKm = clampKm;
  window.tecAdjustPrice = adjustPrice;
  window.tecHandleConsumption = handleConsumption;
  window.tecToggleAdvanced = toggleAdvanced;
  window.tecSyncSavings = syncSavings;
  window.tecSetBuilding = setBuilding;
  window.tecSyncHeating = syncHeating;
  window.tecSyncHeatingRaw = syncHeatingRaw;
  window.tecClampHeating = clampHeating;
  window.tecSyncHeatingSavings = syncHeatingSavings;
  window.tecCalc = calculate;

  // Initial calculation
  calculate();
}

/**
 * Set the current language
 * @param {string} lang - Language code
 */
function setLanguage(lang) {
  currentLang = lang;
  calculate();
}

/**
 * Switch between diesel and heating tabs
 */
function switchTab(tab) {
  currentTab = tab;
  $$('.tec-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('tec-diesel-calc').classList.toggle('tec-hidden', tab !== 'diesel');
  $('tec-heating-calc').classList.toggle('tec-hidden', tab !== 'heating');
  $('tec-diesel-results').classList.toggle('tec-hidden', tab !== 'diesel');
  $('tec-heating-results').classList.toggle('tec-hidden', tab !== 'heating');
  $('tec-compare').classList.toggle('tec-hidden', tab !== 'diesel');
  $('tec-compare-heating').classList.toggle('tec-hidden', tab !== 'heating');

  const hint = $('tec-mobile-hint');
  if (hint) hint.classList.toggle('tec-hidden', tab !== 'diesel');

  const fuelTypeLabel = $('tec-fuel-type-diesel');
  const heatingTypeLabel = $('tec-fuel-type-heating');
  if (fuelTypeLabel) fuelTypeLabel.classList.toggle('tec-hidden', tab !== 'diesel');
  if (heatingTypeLabel) heatingTypeLabel.classList.toggle('tec-hidden', tab !== 'heating');

  calculate();
}

/**
 * Set number of vehicles
 */
function setVehicles(n) {
  vehicles = n;
  $('tec-custom-vehicles').value = n;
  $('tec-custom-vehicles').classList.add('tec-hidden');
  $$('.tec-btn-opt').forEach(b => b.classList.toggle('active', b.dataset.val == n));
  calculate();
}

/**
 * Toggle custom vehicles input
 */
function toggleCustomVehicles() {
  $('tec-custom-vehicles').classList.remove('tec-hidden');
  $('tec-custom-vehicles').focus();
  $$('.tec-btn-opt').forEach(b => b.classList.toggle('active', b.dataset.val === 'custom'));
}

/**
 * Calculate with custom vehicles (for live input)
 */
function calcRawVehicles() {
  vehicles = parseInt($('tec-custom-vehicles').value) || 1;
  calculate();
}

/**
 * Calculate without updating vehicles (for consumption input)
 */
function calcRaw() {
  calculate();
}

/**
 * Clamp vehicles input on blur
 */
function clampVehicles() {
  vehicles = clamp(parseInt($('tec-custom-vehicles').value) || 1, LIMITS.vehicles[0], LIMITS.vehicles[1]);
  $('tec-custom-vehicles').value = vehicles;
  calculate();
}

/**
 * Clamp consumption input on blur
 */
function clampConsumption() {
  const el = $('tec-custom-consumption');
  el.value = clamp(parseFloat(el.value) || 1, LIMITS.cons[0], LIMITS.cons[1]);
  calculate();
}

/**
 * Sync km slider and input
 */
function syncKm(src) {
  let v = clamp(
    parseInt(src === 'slider' ? $('tec-km-slider').value : $('tec-km-input').value) || LIMITS.km[0],
    LIMITS.km[0],
    LIMITS.km[1]
  );
  $('tec-km-slider').value = v;
  $('tec-km-input').value = v;
  calculate();
}

/**
 * Sync km without clamping
 */
function syncKmRaw() {
  let v = parseInt($('tec-km-input').value) || 0;
  $('tec-km-slider').value = clamp(v, LIMITS.km[0], LIMITS.km[1]);
  calculate();
}

/**
 * Clamp km on blur
 */
function clampKm() {
  let v = clamp(parseInt($('tec-km-input').value) || LIMITS.km[0], LIMITS.km[0], LIMITS.km[1]);
  $('tec-km-input').value = v;
  $('tec-km-slider').value = v;
  calculate();
}

/**
 * Adjust price with +/- buttons
 */
function adjustPrice(type, delta) {
  const el = $(type === 'diesel' ? 'tec-diesel-price' : 'tec-heating-price');
  el.value = clamp(parseFloat(el.value) + delta, LIMITS.price[0], LIMITS.price[1]).toFixed(2);
  calculate();
}

/**
 * Handle consumption dropdown change
 */
function handleConsumption() {
  $('tec-custom-consumption-wrap').classList.toggle('tec-hidden', $('tec-consumption').value !== 'custom');
  calculate();
}

/**
 * Toggle advanced settings panel
 */
function toggleAdvanced(type) {
  const panel = $('tec-advanced-' + type);
  const toggle = panel.previousElementSibling;
  panel.classList.toggle('show');

  // Get translations from container
  const wrapper = document.querySelector('.tec-calc-wrapper');
  const translations = wrapper._tecTranslations;

  if (translations) {
    const key = type === 'diesel' ? 'diesel' : 'heating';
    if (panel.classList.contains('show')) {
      toggle.textContent = translations[key].advancedToggleClose;
    } else {
      toggle.textContent = translations[key].advancedToggle;
    }
  } else {
    // Fallback to German
    toggle.textContent = panel.classList.contains('show') ? '− Weniger anzeigen' : '+ Erweiterte Einstellungen';
  }
}

/**
 * Sync savings slider
 */
function syncSavings() {
  $('tec-savings-display').textContent = $('tec-savings-slider').value;
  calculate();
}

/**
 * Set building type for heating
 */
function setBuilding(type) {
  $$('.tec-building-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  $('tec-heating-slider').value = BUILDING_PRESETS[type];
  $('tec-heating-input').value = BUILDING_PRESETS[type];
  calculate();
}

/**
 * Sync heating slider
 */
function syncHeating(src) {
  let v = clamp(
    parseInt(src === 'slider' ? $('tec-heating-slider').value : $('tec-heating-input').value) || LIMITS.heating[0],
    LIMITS.heating[0],
    LIMITS.heating[1]
  );
  $('tec-heating-slider').value = v;
  $('tec-heating-input').value = v;
  calculate();
}

/**
 * Sync heating without clamping
 */
function syncHeatingRaw() {
  let v = parseInt($('tec-heating-input').value) || 0;
  $('tec-heating-slider').value = clamp(v, LIMITS.heating[0], LIMITS.heating[1]);
  calculate();
}

/**
 * Clamp heating on blur
 */
function clampHeating() {
  let v = clamp(parseInt($('tec-heating-input').value) || LIMITS.heating[0], LIMITS.heating[0], LIMITS.heating[1]);
  $('tec-heating-input').value = v;
  $('tec-heating-slider').value = v;
  calculate();
}

/**
 * Sync heating savings slider
 */
function syncHeatingSavings() {
  $('tec-heating-savings-display').textContent = $('tec-heating-savings-slider').value;
  calculate();
}

/**
 * Main calculation dispatcher
 */
function calculate() {
  if (currentTab === 'diesel') {
    calculateDiesel();
  } else {
    calculateHeating();
  }
}

/**
 * Calculate diesel/fuel savings
 */
function calculateDiesel() {
  const km = clamp(parseFloat($('tec-km-input').value) || 80000, LIMITS.km[0], LIMITS.km[1]);
  const price = clamp(parseFloat($('tec-diesel-price').value) || 1.95, LIMITS.price[0], LIMITS.price[1]);
  const consType = $('tec-consumption').value;

  let cons = consType === 'custom'
    ? (parseFloat($('tec-custom-consumption').value) || 32)
    : parseFloat(consType);
  cons = clamp(cons, LIMITS.cons[0], LIMITS.cons[1]);

  const savePct = clamp(parseFloat($('tec-savings-slider').value) || 7, LIMITS.savings[0], LIMITS.savings[1]);

  // Calculations
  const litersPerVehicle = (km / 100) * cons;
  const totalLiters = litersPerVehicle * vehicles;
  const litersSaved = totalLiters * (savePct / 100);
  const gross = litersSaved * price;
  const tecCost = totalLiters * TEC_COST;
  const net = Math.max(0, gross - tecCost);
  const co2 = litersSaved * (CO2_LITER / 1000);
  const perVehicle = Math.max(0, net / vehicles);
  const costWithout = totalLiters * price;
  const costWith = costWithout - net;

  // Update UI
  $('tec-primary-result').textContent = formatCurrency(net, 'CHF', currentLang);
  $('tec-r-diesel').textContent = formatNumber(litersSaved, 0, currentLang) + ' L';
  $('tec-r-co2').textContent = formatNumber(co2, 1, currentLang) + ' t';
  $('tec-r-vehicle').textContent = formatCurrency(perVehicle, 'CHF', currentLang);
  $('tec-r-invest').textContent = formatCurrency(tecCost, 'CHF', currentLang);
  $('tec-c-without').textContent = formatCurrency(costWithout, 'CHF', currentLang);
  $('tec-c-with').textContent = formatCurrency(costWith, 'CHF', currentLang);
  $('tec-bar-with').style.width = (costWithout > 0 ? (costWith / costWithout) * 100 : 100) + '%';
  $('tec-cta-val').textContent = formatCurrency(net, 'CHF', currentLang);
  $('tec-cta-link').href = '/offerte-einholen?type=diesel&savings=' + Math.round(net) + '&liters=' + Math.round(totalLiters);
}

/**
 * Calculate heating oil savings
 */
function calculateHeating() {
  const liters = clamp(parseFloat($('tec-heating-input').value) || 8000, LIMITS.heating[0], LIMITS.heating[1]);
  const price = clamp(parseFloat($('tec-heating-price').value) || 1.35, LIMITS.price[0], LIMITS.price[1]);
  const savePct = clamp(parseFloat($('tec-heating-savings-slider').value) || 7, LIMITS.savings[0], LIMITS.savings[1]);

  // Calculations
  const litersSaved = liters * (savePct / 100);
  const gross = litersSaved * price;
  const tecCost = liters * TEC_COST;
  const net = Math.max(0, gross - tecCost);
  const co2 = litersSaved * (CO2_LITER / 1000);
  const costWithout = liters * price;
  const costWith = costWithout - net;

  // Update UI
  $('tec-primary-result').textContent = formatCurrency(net, 'CHF', currentLang);
  $('tec-rh-oil').textContent = formatNumber(litersSaved, 0, currentLang) + ' L';
  $('tec-rh-co2').textContent = formatNumber(co2, 2, currentLang) + ' t';
  $('tec-rh-invest').textContent = formatCurrency(tecCost, 'CHF', currentLang);
  $('tec-ch-without').textContent = formatCurrency(costWithout, 'CHF', currentLang);
  $('tec-ch-with').textContent = formatCurrency(costWith, 'CHF', currentLang);
  $('tec-bar-h-with').style.width = (costWithout > 0 ? (costWith / costWithout) * 100 : 100) + '%';
  $('tec-cta-val').textContent = formatCurrency(net, 'CHF', currentLang);
  $('tec-cta-link').href = '/offerte-einholen?type=heating&savings=' + Math.round(net) + '&liters=' + Math.round(liters);
}

  // ==================== ASSETS ====================

  const CSS_CONTENT = '.tec-calc-wrapper{--tg:#80ac75;--tgd:#6a9460;--tgl:#e8f0e6;--tt:#25a2b6;--ttd:#1e8a9c;--ttl:#e0f4f7;--tgr:#ecf0f3;--tx:#2d3748;--txm:#64748b;--neu:-2px -2px 6px 1px #ffffff40,2px 2px 6px 2px #00000026;--neuin:inset -4px -4px 5px -1px #ffffff80,inset 2px 2px 8px -1px #0000001a;font-family:\'Inter\',-apple-system,BlinkMacSystemFont,sans-serif;max-width:1600px;margin:0;padding:0;color:var(--tx)}.tec-calc-wrapper *{box-sizing:border-box}.tec-header{text-align:center;margin-bottom:32px}.tec-header h2{font-size:32px;font-weight:700;margin:0 0 8px;color:var(--tx)}.tec-header p{color:var(--txm);margin:0;font-size:16px}.tec-tabs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}.tec-tab-wrap{display:flex;flex-direction:column}.tec-tab-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px 14px 22px;border:none;border-radius:12px;background:var(--tgr);color:var(--txm);font-size:15px;font-weight:600;cursor:pointer;transition:all 0.25s;font-family:inherit;box-shadow:var(--neu)}.tec-tab-btn:hover{color:var(--tg)}.tec-tab-btn.active{background:var(--tg);color:#fff;box-shadow:var(--neuin)}.tec-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}@media (max-width:850px){.tec-grid{grid-template-columns:1fr}}.tec-card,.tec-results-card{background:var(--tgr);border-radius:16px;padding:28px;box-shadow:6px 6px 14px 2px #0000001a,-6px -6px 14px 2px #ffffffbf}.tec-field{margin-bottom:24px}.tec-label{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--txm);margin-bottom:10px;font-weight:500}.tec-btn-group{display:flex;flex-wrap:wrap;gap:8px}.tec-btn-opt{padding:10px 18px;border:none;border-radius:8px;background:var(--tgr);color:var(--tx);font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s;font-family:inherit;box-shadow:var(--neu)}.tec-btn-opt:hover{color:var(--tg)}.tec-btn-opt.active{background:var(--tg);color:#fff;box-shadow:var(--neuin)}.tec-slider-wrap{display:flex;align-items:center;gap:16px}.tec-slider{flex:1;-webkit-appearance:none;height:8px;background:#dde3e8;border-radius:4px;outline:none;box-shadow:inset 1px 1px 3px #0000001a}.tec-slider::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;background:var(--tg);border-radius:50%;cursor:pointer;box-shadow:var(--neu)}.tec-slider::-moz-range-thumb{width:22px;height:22px;background:var(--tg);border-radius:50%;cursor:pointer;border:none;box-shadow:var(--neu)}.tec-slider-val{display:flex;align-items:center;gap:4px;background:#e8f0e6;padding:10px 14px;border-radius:8px;min-width:130px;box-shadow:var(--neuin)}.tec-slider-input{flex:1;min-width:50px;border:none;background:transparent;text-align:right;font-size:15px;font-weight:500;color:var(--tx);outline:none;font-family:inherit}.tec-slider-unit{color:var(--txm);font-size:14px}.tec-price-wrap{display:inline-flex;border-radius:8px;overflow:hidden;box-shadow:-2px -2px 6px 1px #ffffff95,2px 2px 8px 2px #00000015;background:#e8f0e6}.tec-price-btn{width:40px;height:44px;border:none;background:#dce7d9;color:var(--tx);font-size:18px;cursor:pointer;transition:background 0.2s}.tec-price-btn:hover{background:#d0dece}.tec-price-btn:active{background:#c4d5c2}.tec-price-inner{display:flex;align-items:center;gap:4px;padding:0 12px;background:#e8f0e6}.tec-price-currency{color:var(--txm);font-size:14px}.tec-price-input{width:60px;border:none;background:transparent;text-align:center;font-size:15px;font-weight:500;color:var(--tx);outline:none;font-family:inherit}.tec-hint{font-size:12px;color:var(--txm);margin-top:6px}.tec-consumption-wrap{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.tec-select{flex:1;min-width:200px;padding:12px 40px 12px 14px;border:none;border-radius:8px;background:#e8f0e6 url(\"data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\' fill=\'none\'%3E%3Cpath stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E\") no-repeat right 12px center/18px;font-size:15px;color:var(--tx);cursor:pointer;-webkit-appearance:none;outline:none;font-family:inherit;box-shadow:var(--neuin)}.tec-building-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.tec-building-btn{padding:20px 8px 10px 10px;border:none;border-radius:12px;background:var(--tgr);text-align:center;cursor:pointer;transition:all 0.2s;box-shadow:var(--neu)}.tec-building-btn:hover{color:var(--tg)}.tec-building-btn.active{background:var(--tg);box-shadow:var(--neuin)}.tec-building-icon{font-size:28px;margin-bottom:6px}.tec-building-label{font-size:12px;color:var(--txm);font-weight:500}.tec-building-btn.active .tec-building-label{color:#fff}.tec-advanced-toggle{background:transparent;border:none;color:var(--tt);font-size:14px;font-weight:500;cursor:pointer;padding:0;margin-top:8px;font-family:inherit}.tec-advanced-toggle:hover{color:var(--ttd)}.tec-advanced-panel{margin-top:16px;padding:16px;background:#e4e9ed;border-radius:10px;display:none;box-shadow:var(--neuin)}.tec-advanced-panel.show{display:block}.tec-advanced-panel .tec-slider{background:#fff}.tec-advanced-panel .tec-slider-val{background:#e4e9ed;box-shadow:none}.tec-fuel-type-label{text-align:center;font-size:15px;font-weight:600;color:var(--tgd);margin-bottom:12px;margin-top:-13px}.tec-primary-result{text-align:center;padding:18px 28px 28px 28px;background:linear-gradient(135deg,var(--tgl),#d4e7cf);border-radius:14px;margin-bottom:20px;box-shadow:var(--neuin)}.tec-primary-label{font-size:14px;color:var(--tgd);margin-bottom:8px;font-weight:500}.tec-primary-value{font-size:42px;line-height:1;font-weight:700;color:var(--tgd)}@media (max-width:500px){.tec-primary-value{font-size:32px}}.tec-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}.tec-result-item{padding:18px;background:var(--tgr);border-radius:10px;box-shadow:var(--neuin)}.tec-result-item.highlight{background:var(--ttl)}.tec-result-label{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txm);margin-bottom:4px}.tec-result-value{font-size:18px;font-weight:600;color:var(--tx)}.tec-result-item.highlight .tec-result-value{color:var(--ttd)}.tec-compare{padding:20px 18px;background:var(--tgr);border-radius:12px;margin-bottom:20px;box-shadow:var(--neuin)}.tec-compare-title{font-size:14px;color:var(--txm);margin-bottom:14px;font-weight:500}.tec-compare-row{margin-bottom:12px}.tec-compare-row:last-child{margin-bottom:0}.tec-compare-header{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px}.tec-compare-label{color:var(--txm)}.tec-compare-label.green{color:var(--tg);font-weight:600}.tec-compare-val-red{color:#c0392b}.tec-compare-val-green{color:var(--tg);font-weight:600}.tec-compare-track{height:24px;background:#dde3e8;border-radius:12px;overflow:hidden;box-shadow:inset 1px 1px 3px #0000001a}.tec-compare-bar{height:100%;border-radius:12px;transition:width 0.5s}.tec-compare-bar.red{background:linear-gradient(90deg,#e7863c96,#c0392bba)}.tec-compare-bar.green{background:linear-gradient(90deg,var(--tg),var(--tgd))}.tec-cta{text-align:center;padding:24px;background:linear-gradient(135deg,var(--ttl),#cceef3);border-radius:14px;box-shadow:var(--neuin)}.tec-cta-text{font-size:15px;color:var(--tx);margin-bottom:16px}.tec-cta-savings{color:var(--tgd);font-weight:700}.tec-cta-btn{display:inline-flex;align-items:center;gap:8px;padding:14px 32px;background:var(--tt);color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;text-decoration:none;transition:all 0.25s;box-shadow:var(--neu);font-family:inherit}.tec-cta-btn:hover{background:var(--ttd);transform:translateY(-2px)}.tec-cta-btn:active{box-shadow:var(--neuin);transform:translateY(0)}.tec-cta-btn svg{width:18px;height:18px}.tec-cta-phone{font-size:13px;color:var(--txm);margin-top:14px}.tec-cta-phone a{color:var(--tt);text-decoration:none}.tec-hidden{display:none !important}.tec-custom-input{width:80px;padding:10px 14px;border:none;border-radius:8px;font-size:14px;color:var(--tx);outline:none;font-family:inherit;background:#e8f0e6;box-shadow:var(--neuin)}.tec-tooltip{position:relative;cursor:help;border-bottom:1px dashed var(--txm)}.tec-tooltip-text{visibility:hidden;position:absolute;bottom:125%;left:50%;transform:translateX(-50%);background:var(--tx);color:#fff;padding:8px 12px;border-radius:6px;font-size:12px;white-space:nowrap;z-index:100;opacity:0;transition:opacity 0.2s}.tec-tooltip-text::after{content:\'\';position:absolute;top:100%;left:50%;margin-left:-5px;border:5px solid transparent;border-top-color:var(--tx)}.tec-tooltip:hover .tec-tooltip-text{visibility:visible;opacity:1}.tec-mobile-hint{display:none;text-align:center;font-size:11px;color:var(--txm);margin-top:4px;padding:4px 8px;background:transparent;border-radius:8px}@media (max-width:768px){.tec-slider-input,.tec-price-input,.tec-select,.tec-custom-input{font-size:16px}}@media (max-width:420px){.tec-mobile-hint{display:block}.tec-mobile-hint.tec-hidden{display:none}.tec-tooltip{border-bottom:none;cursor:default}.tec-tooltip-text{display:none}.tec-calc-wrapper{padding:0}.tec-header h2{font-size:24px}.tec-header p{font-size:14px}.tec-header{margin-bottom:20px}.tec-tabs{gap:8px;margin-bottom:20px}.tec-tab-btn{padding:10px 16px 10px 12px;font-size:14px;gap:6px}.tec-card,.tec-results-card{padding:16px;border-radius:12px}.tec-field{margin-bottom:16px}.tec-label{font-size:14px;flex-wrap:wrap}.tec-btn-opt{padding:10px 14px;font-size:14px}.tec-slider-wrap{flex-wrap:wrap;gap:10px}.tec-slider{width:100%;flex:none}.tec-slider-val{min-width:110px;padding:10px 12px}.tec-price-btn{width:38px;height:44px}.tec-price-input{width:55px}.tec-select{min-width:100%;padding:12px 36px 12px 12px}.tec-building-icon{font-size:24px}.tec-building-label{font-size:12px}.tec-building-btn{padding:14px 6px}.tec-primary-result{padding:20px}.tec-primary-value{font-size:28px}.tec-result-grid{gap:8px}.tec-result-item{padding:14px}.tec-result-label{font-size:11px}.tec-result-value{font-size:15px}.tec-compare{padding:14px}.tec-compare-title{font-size:13px}.tec-cta-phone{font-size:12px}.tec-compare-header{font-size:11px}.tec-compare-track{height:20px}.tec-cta{padding:14px}.tec-cta-text{font-size:13px}.tec-cta-btn{padding:12px 20px;font-size:14px;width:100%}.tec-custom-input{width:75px;padding:10px 12px}.tec-advanced-panel{padding:12px}}@media (max-width:340px){.tec-header h2{font-size:20px}.tec-tabs{grid-template-columns:1fr}.tec-building-grid{grid-template-columns:1fr;gap:8px}.tec-building-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;text-align:left}.tec-building-icon{font-size:20px;margin-bottom:0}.tec-result-grid{grid-template-columns:1fr}.tec-result-item[style*=\"grid-column\"]{grid-column:auto !important}.tec-primary-value{font-size:24px}.tec-btn-opt{padding:8px 10px;font-size:13px}.tec-select{min-width:0;width:100%;padding:10px 32px 10px 10px;background-position:right 8px center;background-size:16px}}';

  const HTML_CONTENT = '<div class=\"tec-calc-wrapper\" data-wg-notranslate=\"true\"> <!-- <div class=\"tec-header\"> <h2 data-i18n=\"header.title\">Ersparnis-Rechner</h2> <p data-i18n=\"header.subtitle\">Berechnen Sie, wie viel Sie mit TecBlu sparen können</p> </div> --> <div class=\"tec-grid\"> <div> <div class=\"tec-tabs\"> <div class=\"tec-tab-wrap\"> <button class=\"tec-tab-btn active\" data-tab=\"diesel\" onclick=\"tecSwitchTab(\'diesel\')\"> <span>⛽</span> <span data-i18n=\"tabs.fuel\">Treibstoff</span> </button> <div class=\"tec-mobile-hint\" id=\"tec-mobile-hint\" data-i18n=\"mobileHint\">Treibstoff: Diesel, Benzin, Biodiesel oder HVO</div> </div> <button class=\"tec-tab-btn\" data-tab=\"heating\" onclick=\"tecSwitchTab(\'heating\')\"> <span>🔥</span> <span data-i18n=\"tabs.heating\">Heizöl</span> </button> </div> <!-- Diesel/Fuel Calculator --> <div class=\"tec-card\" id=\"tec-diesel-calc\"> <div class=\"tec-field\"> <label class=\"tec-label\"><span>🚛</span> <span data-i18n=\"diesel.vehiclesLabel\">Anzahl Fahrzeuge</span></label> <div class=\"tec-btn-group\"> <button class=\"tec-btn-opt\" data-val=\"1\" onclick=\"tecSetVehicles(1)\">1</button> <button class=\"tec-btn-opt active\" data-val=\"5\" onclick=\"tecSetVehicles(5)\">5</button> <button class=\"tec-btn-opt\" data-val=\"10\" onclick=\"tecSetVehicles(10)\">10</button> <button class=\"tec-btn-opt\" data-val=\"20\" onclick=\"tecSetVehicles(20)\">20</button> <button class=\"tec-btn-opt\" data-val=\"custom\" onclick=\"tecToggleCustomVehicles()\" data-i18n=\"diesel.vehiclesOther\">Andere</button> <input type=\"number\" id=\"tec-custom-vehicles\" class=\"tec-custom-input tec-hidden\" value=\"5\" min=\"1\" max=\"1000\" oninput=\"tecCalcRawVehicles()\" onblur=\"tecClampVehicles()\"> </div> </div> <div class=\"tec-field\"> <label class=\"tec-label\"><span>📍</span> <span data-i18n=\"diesel.kmLabel\">Ø km pro Fahrzeug / Jahr</span></label> <div class=\"tec-slider-wrap\"> <input type=\"range\" class=\"tec-slider\" id=\"tec-km-slider\" value=\"80000\" min=\"1000\" max=\"300000\" step=\"1000\" oninput=\"tecSyncKm(\'slider\')\"> <div class=\"tec-slider-val\"> <input type=\"number\" class=\"tec-slider-input\" id=\"tec-km-input\" value=\"80000\" min=\"1000\" max=\"300000\" oninput=\"tecSyncKmRaw()\" onblur=\"tecClampKm()\"> <span class=\"tec-slider-unit\" data-i18n=\"diesel.kmUnit\">km</span> </div> </div> </div> <div class=\"tec-field\"> <label class=\"tec-label\"> <span>⛽</span> <span class=\"tec-tooltip\" data-i18n=\"diesel.priceLabel\" data-i18n-tooltip=\"diesel.priceTooltip\">Treibstoffpreis<span class=\"tec-tooltip-text\">Diesel, Benzin, Biodiesel oder HVO</span></span> <span data-i18n=\"diesel.pricePerLiter\">pro Liter</span> </label> <div class=\"tec-price-wrap\"> <button class=\"tec-price-btn\" onclick=\"tecAdjustPrice(\'diesel\',-0.05)\">−</button> <div class=\"tec-price-inner\"> <span class=\"tec-price-currency\" data-i18n=\"currency\">CHF</span> <input type=\"number\" class=\"tec-price-input\" id=\"tec-diesel-price\" value=\"1.95\" step=\"0.05\" min=\"0.5\" max=\"5\" oninput=\"tecCalc()\"> </div> <button class=\"tec-price-btn\" onclick=\"tecAdjustPrice(\'diesel\',0.05)\">+</button> </div> </div> <div class=\"tec-field\"> <label class=\"tec-label\"><span>📊</span> <span data-i18n=\"diesel.consumptionLabel\">Durchschnittlicher Verbrauch</span></label> <div class=\"tec-consumption-wrap\"> <select class=\"tec-select\" id=\"tec-consumption\" onchange=\"tecHandleConsumption()\"> <option value=\"32\" data-i18n=\"diesel.consumptionOptions.truck\">LKW (32 L/100km)</option> <option value=\"12\" data-i18n=\"diesel.consumptionOptions.van\">Lieferwagen (12 L/100km)</option> <option value=\"9\" data-i18n=\"diesel.consumptionOptions.transporter\">Transporter (9 L/100km)</option> <option value=\"7\" data-i18n=\"diesel.consumptionOptions.car\">PKW (7 L/100km)</option> <option value=\"custom\" data-i18n=\"diesel.consumptionOptions.custom\">Andere</option> </select> <div id=\"tec-custom-consumption-wrap\" class=\"tec-hidden\"> <div class=\"tec-slider-val\" style=\"display:inline-flex\"> <input type=\"number\" class=\"tec-slider-input\" id=\"tec-custom-consumption\" value=\"32\" min=\"1\" max=\"150\" style=\"width:50px\" oninput=\"tecCalcRaw()\" onblur=\"tecClampConsumption()\"> <span class=\"tec-slider-unit\" data-i18n=\"diesel.consumptionUnit\">L/100km</span> </div> </div> </div> </div> <button class=\"tec-advanced-toggle\" onclick=\"tecToggleAdvanced(\'diesel\')\" data-i18n=\"diesel.advancedToggle\" data-i18n-toggle-close=\"diesel.advancedToggleClose\">+ Erweiterte Einstellungen</button> <div class=\"tec-advanced-panel\" id=\"tec-advanced-diesel\"> <div class=\"tec-field\" style=\"margin-bottom:12px\"> <label class=\"tec-label\"><span>📈</span> <span data-i18n=\"diesel.savingsLabel\">Erwartete Treibstoffeinsparung</span></label> <div class=\"tec-slider-wrap\"> <input type=\"range\" class=\"tec-slider\" id=\"tec-savings-slider\" value=\"7\" min=\"5\" max=\"12\" step=\"1\" oninput=\"tecSyncSavings()\"> <div class=\"tec-slider-val\" style=\"min-width:70px\"> <span id=\"tec-savings-display\">7</span> <span class=\"tec-slider-unit\" data-i18n=\"units.percent\">%</span> </div> </div> </div> <p class=\"tec-hint\" data-i18n=\"diesel.tecbluCost\">TecBlu®: CHF 0.0463 pro Liter</p> </div> </div> <!-- Heating Calculator --> <div class=\"tec-card tec-hidden\" id=\"tec-heating-calc\"> <div class=\"tec-field\"> <label class=\"tec-label\" data-i18n=\"heating.buildingLabel\">Gebäudetyp</label> <div class=\"tec-building-grid\"> <button class=\"tec-building-btn\" data-type=\"single\" onclick=\"tecSetBuilding(\'single\')\"> <div class=\"tec-building-icon\">🏠</div> <div class=\"tec-building-label\" data-i18n=\"heating.buildingTypes.single\">Einfamilienhaus</div> </button> <button class=\"tec-building-btn active\" data-type=\"multi\" onclick=\"tecSetBuilding(\'multi\')\"> <div class=\"tec-building-icon\">🏢</div> <div class=\"tec-building-label\" data-i18n=\"heating.buildingTypes.multi\">Mehrfamilienhaus</div> </button> <button class=\"tec-building-btn\" data-type=\"commercial\" onclick=\"tecSetBuilding(\'commercial\')\"> <div class=\"tec-building-icon\">🏭</div> <div class=\"tec-building-label\" data-i18n=\"heating.buildingTypes.commercial\">Gewerbe</div> </button> </div> </div> <div class=\"tec-field\"> <label class=\"tec-label\"><span>🛢️</span> <span data-i18n=\"heating.consumptionLabel\">Jährlicher Heizölverbrauch</span></label> <div class=\"tec-slider-wrap\"> <input type=\"range\" class=\"tec-slider\" id=\"tec-heating-slider\" value=\"8000\" min=\"500\" max=\"500000\" step=\"500\" oninput=\"tecSyncHeating(\'slider\')\"> <div class=\"tec-slider-val\"> <input type=\"number\" class=\"tec-slider-input\" id=\"tec-heating-input\" value=\"8000\" min=\"500\" max=\"500000\" oninput=\"tecSyncHeatingRaw()\" onblur=\"tecClampHeating()\"> <span class=\"tec-slider-unit\" data-i18n=\"heating.consumptionUnit\">L</span> </div> </div> </div> <div class=\"tec-field\"> <label class=\"tec-label\"><span>💰</span> <span data-i18n=\"heating.priceLabel\">Heizölpreis pro Liter</span></label> <div class=\"tec-price-wrap\"> <button class=\"tec-price-btn\" onclick=\"tecAdjustPrice(\'heating\',-0.05)\">−</button> <div class=\"tec-price-inner\"> <span class=\"tec-price-currency\" data-i18n=\"currency\">CHF</span> <input type=\"number\" class=\"tec-price-input\" id=\"tec-heating-price\" value=\"1.35\" step=\"0.05\" min=\"0.5\" max=\"5\" oninput=\"tecCalc()\"> </div> <button class=\"tec-price-btn\" onclick=\"tecAdjustPrice(\'heating\',0.05)\">+</button> </div> </div> <button class=\"tec-advanced-toggle\" onclick=\"tecToggleAdvanced(\'heating\')\" data-i18n=\"heating.advancedToggle\" data-i18n-toggle-close=\"heating.advancedToggleClose\">+ Erweiterte Einstellungen</button> <div class=\"tec-advanced-panel\" id=\"tec-advanced-heating\"> <div class=\"tec-field\" style=\"margin-bottom:0\"> <label class=\"tec-label\"><span>📈</span> <span data-i18n=\"heating.savingsLabel\">Erwartete Heizöleinsparung</span></label> <div class=\"tec-slider-wrap\"> <input type=\"range\" class=\"tec-slider\" id=\"tec-heating-savings-slider\" value=\"7\" min=\"5\" max=\"12\" step=\"1\" oninput=\"tecSyncHeatingSavings()\"> <div class=\"tec-slider-val\" style=\"min-width:70px\"> <span id=\"tec-heating-savings-display\">7</span> <span class=\"tec-slider-unit\" data-i18n=\"units.percent\">%</span> </div> </div> </div> </div> </div> </div> <!-- Results Panel --> <div> <div class=\"tec-results-card\"> <div class=\"tec-fuel-type-label\" id=\"tec-fuel-type-diesel\" data-i18n=\"tabs.fuelTooltip\">Diesel, Benzin, Biodiesel oder HVO</div> <div class=\"tec-fuel-type-label tec-hidden\" id=\"tec-fuel-type-heating\" data-i18n=\"tabs.heating\">Heizöl</div> <div class=\"tec-primary-result\"> <div class=\"tec-primary-label\" data-i18n=\"results.primaryLabel\">Jährliche Nettoersparnis</div> <div class=\"tec-primary-value\" id=\"tec-primary-result\">CHF 0.–</div> </div> <!-- Diesel Results --> <div class=\"tec-result-grid\" id=\"tec-diesel-results\"> <div class=\"tec-result-item\"> <div class=\"tec-result-label\"> <span>💧</span> <span data-i18n=\"results.fuelSaved\">Treibstoff gespart</span> </div> <div class=\"tec-result-value\" id=\"tec-r-diesel\">0 L</div> </div> <div class=\"tec-result-item highlight\"> <div class=\"tec-result-label\"><span>🌱</span> <span data-i18n=\"results.co2Reduced\">CO₂ reduziert</span></div> <div class=\"tec-result-value\" id=\"tec-r-co2\">0 t</div> </div> <div class=\"tec-result-item\"> <div class=\"tec-result-label\"><span>🚛</span> <span data-i18n=\"results.perVehicle\">Pro Fahrzeug</span></div> <div class=\"tec-result-value\" id=\"tec-r-vehicle\">CHF 0.–</div> </div> <div class=\"tec-result-item\"> <div class=\"tec-result-label\"><span>📦</span> <span data-i18n=\"results.investment\">TecBlu-Investition</span></div> <div class=\"tec-result-value\" id=\"tec-r-invest\">CHF 0.–</div> </div> </div> <!-- Heating Results --> <div class=\"tec-result-grid tec-hidden\" id=\"tec-heating-results\"> <div class=\"tec-result-item\"> <div class=\"tec-result-label\"><span>💧</span> <span data-i18n=\"results.oilSaved\">Heizöl gespart</span></div> <div class=\"tec-result-value\" id=\"tec-rh-oil\">0 L</div> </div> <div class=\"tec-result-item highlight\"> <div class=\"tec-result-label\"><span>🌱</span> <span data-i18n=\"results.co2Reduced\">CO₂ reduziert</span></div> <div class=\"tec-result-value\" id=\"tec-rh-co2\">0 t</div> </div> <div class=\"tec-result-item\" style=\"grid-column:span 2\"> <div class=\"tec-result-label\"><span>📦</span> <span data-i18n=\"results.investment\">TecBlu-Investition</span></div> <div class=\"tec-result-value\" id=\"tec-rh-invest\">CHF 0.–</div> </div> </div> <!-- Heating Comparison --> <div class=\"tec-compare tec-hidden\" id=\"tec-compare-heating\"> <div class=\"tec-compare-title\" data-i18n=\"results.heatingCompareTitle\">Jährliche Heizölkosten im Vergleich</div> <div class=\"tec-compare-row\"> <div class=\"tec-compare-header\"> <span class=\"tec-compare-label\" data-i18n=\"results.withoutTecblu\">Ohne TecBlu</span> <span class=\"tec-compare-val-red\" id=\"tec-ch-without\">CHF 0.–</span> </div> <div class=\"tec-compare-track\"> <div class=\"tec-compare-bar red\" id=\"tec-bar-h-without\" style=\"width:100%\"></div> </div> </div> <div class=\"tec-compare-row\"> <div class=\"tec-compare-header\"> <span class=\"tec-compare-label green\" data-i18n=\"results.withTecblu\">Mit TecBlu</span> <span class=\"tec-compare-val-green\" id=\"tec-ch-with\">CHF 0.–</span> </div> <div class=\"tec-compare-track\"> <div class=\"tec-compare-bar green\" id=\"tec-bar-h-with\" style=\"width:93%\"></div> </div> </div> </div> <!-- Fuel Comparison --> <div class=\"tec-compare\" id=\"tec-compare\"> <div class=\"tec-compare-title\" data-i18n=\"results.fuelCompareTitle\">Jährliche Treibstoffkosten im Vergleich</div> <div class=\"tec-compare-row\"> <div class=\"tec-compare-header\"> <span class=\"tec-compare-label\" data-i18n=\"results.withoutTecblu\">Ohne TecBlu</span> <span class=\"tec-compare-val-red\" id=\"tec-c-without\">CHF 0.–</span> </div> <div class=\"tec-compare-track\"> <div class=\"tec-compare-bar red\" id=\"tec-bar-without\" style=\"width:100%\"></div> </div> </div> <div class=\"tec-compare-row\"> <div class=\"tec-compare-header\"> <span class=\"tec-compare-label green\" data-i18n=\"results.withTecblu\">Mit TecBlu</span> <span class=\"tec-compare-val-green\" id=\"tec-c-with\">CHF 0.–</span> </div> <div class=\"tec-compare-track\"> <div class=\"tec-compare-bar green\" id=\"tec-bar-with\" style=\"width:93%\"></div> </div> </div> </div> <!-- CTA --> <div class=\"tec-cta\"> <p class=\"tec-cta-text\"> <span data-i18n=\"cta.textBefore\">Jetzt </span><span class=\"tec-cta-savings\" id=\"tec-cta-val\">CHF 0.–</span><span data-i18n=\"cta.textAfter\"> pro Jahr sparen und gleichzeitig die Umwelt schonen.</span> </p> <a href=\"/offerte-einholen\" class=\"tec-cta-btn\" id=\"tec-cta-link\"> <span data-i18n=\"cta.button\">Kostenlose Offerte anfragen</span> <svg fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"> <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M17 8l4 4m0 0l-4 4m4-4H3\"/> </svg> </a> <p class=\"tec-cta-phone\"> <span data-i18n=\"cta.phone\">Noch Fragen?</span> <a href=\"tel:+41438880012\" data-i18n=\"cta.phoneNumber\">+41 43 888 00 12</a> </p> </div> </div> </div> </div> </div>';

  const TRANSLATIONS = {"de":{"header":{"title":"Ersparnis-Rechner","subtitle":"Berechnen Sie, wie viel Sie mit TecBlu sparen können"},"tabs":{"fuel":"Treibstoff","fuelTooltip":"Diesel, Benzin, Biodiesel oder HVO","heating":"Heizöl"},"mobileHint":"Treibstoff: Diesel, Benzin, Biodiesel oder HVO","diesel":{"vehiclesLabel":"Anzahl Fahrzeuge","vehiclesOther":"Andere","kmLabel":"Ø km pro Fahrzeug / Jahr","kmUnit":"km","priceLabel":"Treibstoffpreis","priceTooltip":"Diesel, Benzin, Biodiesel oder HVO","pricePerLiter":"pro Liter","priceHint":"Durchschnitt Stand Januar 2026","consumptionLabel":"Durchschnittlicher Verbrauch","consumptionOptions":{"truck":"LKW (32 L/100km)","van":"Lieferwagen (12 L/100km)","transporter":"Transporter (9 L/100km)","car":"PKW (7 L/100km)","custom":"Andere"},"consumptionUnit":"L/100km","advancedToggle":"+ Erweiterte Einstellungen","advancedToggleClose":"− Weniger anzeigen","savingsLabel":"Erwartete Treibstoffeinsparung","tecbluCost":"TecBlu®: CHF 0.0463 pro Liter"},"heating":{"buildingLabel":"Gebäudetyp","buildingTypes":{"single":"Einfamilienhaus","multi":"Mehrfamilienhaus","commercial":"Gewerbe"},"consumptionLabel":"Jährlicher Heizölverbrauch","consumptionUnit":"L","priceLabel":"Heizölpreis pro Liter","priceHint":"Durchschnitt Stand Januar 2026","advancedToggle":"+ Erweiterte Einstellungen","advancedToggleClose":"− Weniger anzeigen","savingsLabel":"Erwartete Heizöleinsparung"},"results":{"primaryLabel":"Jährliche Nettoersparnis","fuelSaved":"Treibstoff gespart","fuelSavedTooltip":"Diesel, Benzin, Biodiesel oder HVO","oilSaved":"Heizöl gespart","co2Reduced":"CO₂ reduziert","perVehicle":"Pro Fahrzeug","investment":"TecBlu-Investition","fuelCompareTitle":"Jährliche Treibstoffkosten im Vergleich","heatingCompareTitle":"Jährliche Heizölkosten im Vergleich","withoutTecblu":"Ohne TecBlu","withTecblu":"Mit TecBlu"},"cta":{"textBefore":"Jetzt ","textAfter":" pro Jahr sparen und gleichzeitig die Umwelt schonen.","button":"Gratis Offerte einholen","phone":"Noch Fragen?","phoneNumber":"+41 43 888 00 12"},"currency":"CHF","units":{"liters":"L","tons":"t","percent":"%"}},"en":{"header":{"title":"Savings Calculator","subtitle":"Discover how much you can save with TecBlu"},"tabs":{"fuel":"Fuel","fuelTooltip":"Diesel, Petrol, Biodiesel or HVO","heating":"Heating Oil"},"mobileHint":"Fuel: Diesel, Petrol, Biodiesel or HVO","diesel":{"vehiclesLabel":"Number of Vehicles","vehiclesOther":"Other","kmLabel":"Avg. km per Vehicle / Year","kmUnit":"km","priceLabel":"Fuel Price","priceTooltip":"Diesel, Petrol, Biodiesel or HVO","pricePerLiter":"per Liter","priceHint":"Average as of January 2026","consumptionLabel":"Average Consumption","consumptionOptions":{"truck":"Truck (32 L/100km)","van":"Delivery Van (12 L/100km)","transporter":"Transporter (9 L/100km)","car":"Car (7 L/100km)","custom":"Other"},"consumptionUnit":"L/100km","advancedToggle":"+ Advanced Settings","advancedToggleClose":"− Show Less","savingsLabel":"Expected Fuel Savings","tecbluCost":"TecBlu®: CHF 0.0463 per Liter"},"heating":{"buildingLabel":"Building Type","buildingTypes":{"single":"Single-family House","multi":"Multi-family House","commercial":"Commercial"},"consumptionLabel":"Annual Heating Oil Consumption","consumptionUnit":"L","priceLabel":"Heating Oil Price per Liter","priceHint":"Average as of January 2026","advancedToggle":"+ Advanced Settings","advancedToggleClose":"− Show Less","savingsLabel":"Expected Heating Oil Savings"},"results":{"primaryLabel":"Annual Net Savings","fuelSaved":"Fuel Saved","fuelSavedTooltip":"Diesel, Petrol, Biodiesel or HVO","oilSaved":"Heating Oil Saved","co2Reduced":"CO₂ Reduced","perVehicle":"Per Vehicle","investment":"TecBlu Investment","fuelCompareTitle":"Annual Fuel Costs Comparison","heatingCompareTitle":"Annual Heating Oil Costs Comparison","withoutTecblu":"Without TecBlu","withTecblu":"With TecBlu"},"cta":{"textBefore":"Save ","textAfter":" per year while protecting the environment.","button":"Get a Free Quote","phone":"Questions?","phoneNumber":"+41 43 888 00 12"},"currency":"CHF","units":{"liters":"L","tons":"t","percent":"%"}},"fr":{"header":{"title":"Calculateur d'économies","subtitle":"Calculez combien vous pouvez économiser avec TecBlu"},"tabs":{"fuel":"Carburant","fuelTooltip":"Diesel, Essence, Biodiesel ou HVO","heating":"Mazout"},"mobileHint":"Carburant: Diesel, Essence, Biodiesel ou HVO","diesel":{"vehiclesLabel":"Nombre de véhicules","vehiclesOther":"Autre","kmLabel":"Km moyen par véhicule / an","kmUnit":"km","priceLabel":"Prix du carburant","priceTooltip":"Diesel, Essence, Biodiesel ou HVO","pricePerLiter":"par litre","priceHint":"Moyenne en janvier 2026","consumptionLabel":"Consommation moyenne","consumptionOptions":{"truck":"Camion (32 L/100km)","van":"Camionnette (12 L/100km)","transporter":"Utilitaire (9 L/100km)","car":"Voiture (7 L/100km)","custom":"Autre"},"consumptionUnit":"L/100km","advancedToggle":"+ Paramètres avancés","advancedToggleClose":"− Moins d'options","savingsLabel":"Économie de carburant attendue","tecbluCost":"TecBlu®: CHF 0.0463 par litre"},"heating":{"buildingLabel":"Type de bâtiment","buildingTypes":{"single":"Maison individuelle","multi":"Immeuble résidentiel","commercial":"Commercial"},"consumptionLabel":"Consommation annuelle de mazout","consumptionUnit":"L","priceLabel":"Prix du mazout par litre","priceHint":"Moyenne en janvier 2026","advancedToggle":"+ Paramètres avancés","advancedToggleClose":"− Moins d'options","savingsLabel":"Économie de mazout attendue"},"results":{"primaryLabel":"Économie nette annuelle","fuelSaved":"Carburant économisé","fuelSavedTooltip":"Diesel, Essence, Biodiesel ou HVO","oilSaved":"Mazout économisé","co2Reduced":"CO₂ réduit","perVehicle":"Par véhicule","investment":"Investissement TecBlu","fuelCompareTitle":"Comparaison des coûts de carburant annuels","heatingCompareTitle":"Comparaison des coûts de mazout annuels","withoutTecblu":"Sans TecBlu","withTecblu":"Avec TecBlu"},"cta":{"textBefore":"Économisez ","textAfter":" par an tout en préservant l'environnement.","button":"Obtenez un devis gratuit","phone":"Des questions?","phoneNumber":"+41 43 888 00 12"},"currency":"CHF","units":{"liters":"L","tons":"t","percent":"%"}},"it":{"header":{"title":"Calcolatore di risparmio","subtitle":"Calcola quanto puoi risparmiare con TecBlu"},"tabs":{"fuel":"Carburante","fuelTooltip":"Diesel, Benzina, Biodiesel o HVO","heating":"Gasolio da riscaldamento"},"mobileHint":"Carburante: Diesel, Benzina, Biodiesel o HVO","diesel":{"vehiclesLabel":"Numero di veicoli","vehiclesOther":"Altro","kmLabel":"Media km per veicolo / anno","kmUnit":"km","priceLabel":"Prezzo carburante","priceTooltip":"Diesel, Benzina, Biodiesel o HVO","pricePerLiter":"per litro","priceHint":"Media a gennaio 2026","consumptionLabel":"Consumo medio","consumptionOptions":{"truck":"Camion (32 L/100km)","van":"Furgone (12 L/100km)","transporter":"Furgone (9 L/100km)","car":"Auto (7 L/100km)","custom":"Altro"},"consumptionUnit":"L/100km","advancedToggle":"+ Impostazioni avanzate","advancedToggleClose":"− Mostra meno","savingsLabel":"Risparmio carburante previsto","tecbluCost":"TecBlu®: CHF 0.0463 per litro"},"heating":{"buildingLabel":"Tipo di edificio","buildingTypes":{"single":"Casa unifamiliare","multi":"Condominio","commercial":"Commerciale"},"consumptionLabel":"Consumo annuale gasolio","consumptionUnit":"L","priceLabel":"Prezzo gasolio per litro","priceHint":"Media a gennaio 2026","advancedToggle":"+ Impostazioni avanzate","advancedToggleClose":"− Mostra meno","savingsLabel":"Risparmio gasolio previsto"},"results":{"primaryLabel":"Risparmio netto annuale","fuelSaved":"Carburante risparmiato","fuelSavedTooltip":"Diesel, Benzina, Biodiesel o HVO","oilSaved":"Gasolio risparmiato","co2Reduced":"CO₂ ridotto","perVehicle":"Per veicolo","investment":"Investimento TecBlu","fuelCompareTitle":"Confronto costi carburante annuali","heatingCompareTitle":"Confronto costi gasolio annuali","withoutTecblu":"Senza TecBlu","withTecblu":"Con TecBlu"},"cta":{"textBefore":"Risparmia ","textAfter":" all'anno proteggendo l'ambiente.","button":"Richiedi un preventivo gratuito","phone":"Domande?","phoneNumber":"+41 43 888 00 12"},"currency":"CHF","units":{"liters":"L","tons":"t","percent":"%"}}};

  // ==================== INITIALIZATION ====================

  function loadFonts() {
    if (document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')) return;

    const p1 = document.createElement('link');
    p1.rel = 'preconnect';
    p1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(p1);

    const p2 = document.createElement('link');
    p2.rel = 'preconnect';
    p2.href = 'https://fonts.gstatic.com';
    p2.crossOrigin = 'anonymous';
    document.head.appendChild(p2);

    const f = document.createElement('link');
    f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(f);
  }

  function injectStyles() {
    if (document.getElementById('tecblu-calc-styles')) return;
    const s = document.createElement('style');
    s.id = 'tecblu-calc-styles';
    s.textContent = CSS_CONTENT;
    document.head.appendChild(s);
  }

  function init() {
    const container = document.getElementById('tecblu-calculator');
    if (!container) {
      console.warn('TecBlu Calculator: Container #tecblu-calculator not found');
      return;
    }

    const lang = detectLanguage();
    loadFonts();
    injectStyles();
    container.innerHTML = HTML_CONTENT;

    const translations = TRANSLATIONS[lang] || TRANSLATIONS.de;
    const wrapper = container.querySelector('.tec-calc-wrapper');
    if (wrapper) applyTranslations(wrapper, translations);

    initCalculator(lang);
    container.dataset.tecbluInit = 'true';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TecBluCalc = { init: init, detectLanguage: detectLanguage };
})();
