/**
 * TecBlu Calculator Widget - Build Script
 *
 * This script bundles all source files into a single embeddable JavaScript file.
 *
 * Usage:
 *   node build.js          - Build once
 *   node build.js --watch  - Watch for changes and rebuild
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// Paths
const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'tecblu-calc.js');

// Read source files
function readFile(filepath) {
  return fs.readFileSync(filepath, 'utf-8');
}

// Minify CSS (simple minification)
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .replace(/\s*([{}:;,>+~])\s*/g, '$1') // Remove spaces around special chars
    .replace(/;}/g, '}')               // Remove last semicolon in blocks
    .trim();
}

// Escape string for JavaScript
function escapeJS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

// Create the bundle entry point with inlined assets
function createBundleEntry() {
  console.log('Reading source files...');

  // Read CSS
  const cssContent = readFile(path.join(SRC_DIR, 'styles', 'calculator.css'));
  const minifiedCSS = minifyCSS(cssContent);

  // Read HTML template
  const htmlContent = readFile(path.join(SRC_DIR, 'templates', 'calculator.html'));
  const minifiedHTML = htmlContent.replace(/\s+/g, ' ').trim();

  // Read translations
  const translations = {
    de: JSON.parse(readFile(path.join(SRC_DIR, 'i18n', 'de.json'))),
    en: JSON.parse(readFile(path.join(SRC_DIR, 'i18n', 'en.json'))),
    fr: JSON.parse(readFile(path.join(SRC_DIR, 'i18n', 'fr.json'))),
    it: JSON.parse(readFile(path.join(SRC_DIR, 'i18n', 'it.json')))
  };

  // Create the entry file content with actual values
  const entryContent = `
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

  const URL_PATTERNS = {
    de: [/^tecblu\\.(ch|at|de)$/],
    en: [/^en\\.tecblu\\.(ch|at|de|fr|it)$/],
    fr: [/^fr\\.tecblu\\.ch$/, /^tecblu\\.fr$/],
    it: [/^it\\.tecblu\\.ch$/, /^tecblu\\.it$/]
  };

  const SUPPORTED_LANGS = ['de', 'en', 'fr', 'it'];

  function detectLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    if (langParam && SUPPORTED_LANGS.includes(langParam)) {
      return langParam;
    }

    const hostname = window.location.hostname;
    for (const [lang, patterns] of Object.entries(URL_PATTERNS)) {
      if (patterns.some(p => p.test(hostname))) {
        return lang;
      }
    }

    return 'de';
  }

  function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  function applyTranslations(container, translations) {
    const elements = container.querySelectorAll('[data-i18n]');

    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = getNestedValue(translations, key);

      if (translation) {
        if (el.tagName === 'OPTION') {
          el.textContent = translation;
        } else if (el.classList.contains('tec-tooltip')) {
          const tooltipSpan = el.querySelector('.tec-tooltip-text');
          const tooltipKey = el.getAttribute('data-i18n-tooltip');

          const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
          if (textNode) {
            textNode.textContent = translation;
          } else if (tooltipSpan) {
            el.insertBefore(document.createTextNode(translation), tooltipSpan);
          } else {
            el.textContent = translation;
          }

          if (tooltipSpan && tooltipKey) {
            const tooltipTranslation = getNestedValue(translations, tooltipKey);
            if (tooltipTranslation) {
              tooltipSpan.textContent = tooltipTranslation;
            }
          }
        } else {
          el.textContent = translation;
        }
      }
    });

    container._tecTranslations = translations;
  }

  function formatCurrency(value, currency, lang) {
    const localeMap = { de: 'de-CH', en: 'en-CH', fr: 'fr-CH', it: 'it-CH' };
    const locale = localeMap[lang] || 'de-CH';
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(Math.min(value, 999999999999)));
    return currency + ' ' + formatted + '.–';
  }

  function formatNumber(value, decimals, lang) {
    const localeMap = { de: 'de-CH', en: 'en-CH', fr: 'fr-CH', it: 'it-CH' };
    const locale = localeMap[lang] || 'de-CH';
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(Math.min(value, 999999999999));
  }

  // ==================== CALCULATOR ====================

  const TEC_COST = 0.0463;
  const CO2_LITER = 2.65;
  const BUILDING_PRESETS = { single: 3000, multi: 8000, commercial: 50000 };
  const LIMITS = {
    km: [1000, 300000],
    cons: [1, 150],
    vehicles: [1, 1000],
    heating: [500, 500000],
    price: [0.5, 5],
    savings: [1, 25]
  };

  let currentTab = 'diesel';
  let vehicles = 5;
  let currentLang = 'de';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function initCalculator(lang) {
    currentLang = lang || 'de';

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

    calculate();
  }

  function switchTab(tab) {
    currentTab = tab;
    $$('.tec-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $('tec-diesel-calc').classList.toggle('tec-hidden', tab !== 'diesel');
    $('tec-heating-calc').classList.toggle('tec-hidden', tab !== 'heating');
    $('tec-diesel-results').classList.toggle('tec-hidden', tab !== 'diesel');
    $('tec-heating-results').classList.toggle('tec-hidden', tab !== 'heating');
    $('tec-compare').classList.toggle('tec-hidden', tab !== 'diesel');
    $('tec-compare-heating').classList.toggle('tec-hidden', tab !== 'heating');
    var h = $('tec-mobile-hint'); if (h) h.classList.toggle('tec-hidden', tab !== 'diesel');
    var fd = $('tec-fuel-type-diesel'); if (fd) fd.classList.toggle('tec-hidden', tab !== 'diesel');
    var fh = $('tec-fuel-type-heating'); if (fh) fh.classList.toggle('tec-hidden', tab !== 'heating');
    calculate();
  }

  function setVehicles(n) {
    vehicles = n;
    $('tec-custom-vehicles').value = n;
    $('tec-custom-vehicles').classList.add('tec-hidden');
    $$('.tec-btn-opt').forEach(b => b.classList.toggle('active', b.dataset.val == n));
    calculate();
  }

  function toggleCustomVehicles() {
    $('tec-custom-vehicles').classList.remove('tec-hidden');
    $('tec-custom-vehicles').focus();
    $$('.tec-btn-opt').forEach(b => b.classList.toggle('active', b.dataset.val === 'custom'));
  }

  function calcRawVehicles() {
    vehicles = parseInt($('tec-custom-vehicles').value) || 1;
    calculate();
  }

  function calcRaw() {
    calculate();
  }

  function clampVehicles() {
    vehicles = clamp(parseInt($('tec-custom-vehicles').value) || 1, LIMITS.vehicles[0], LIMITS.vehicles[1]);
    $('tec-custom-vehicles').value = vehicles;
    calculate();
  }

  function clampConsumption() {
    const el = $('tec-custom-consumption');
    el.value = clamp(parseFloat(el.value) || 1, LIMITS.cons[0], LIMITS.cons[1]);
    calculate();
  }

  function syncKm(src) {
    let v = clamp(parseInt(src === 'slider' ? $('tec-km-slider').value : $('tec-km-input').value) || LIMITS.km[0], LIMITS.km[0], LIMITS.km[1]);
    $('tec-km-slider').value = v;
    $('tec-km-input').value = v;
    calculate();
  }

  function syncKmRaw() {
    let v = parseInt($('tec-km-input').value) || 0;
    $('tec-km-slider').value = clamp(v, LIMITS.km[0], LIMITS.km[1]);
    calculate();
  }

  function clampKm() {
    let v = clamp(parseInt($('tec-km-input').value) || LIMITS.km[0], LIMITS.km[0], LIMITS.km[1]);
    $('tec-km-input').value = v;
    $('tec-km-slider').value = v;
    calculate();
  }

  function adjustPrice(type, delta) {
    const el = $(type === 'diesel' ? 'tec-diesel-price' : 'tec-heating-price');
    el.value = clamp(parseFloat(el.value) + delta, LIMITS.price[0], LIMITS.price[1]).toFixed(2);
    calculate();
  }

  function handleConsumption() {
    $('tec-custom-consumption-wrap').classList.toggle('tec-hidden', $('tec-consumption').value !== 'custom');
    calculate();
  }

  function toggleAdvanced(type) {
    const panel = $('tec-advanced-' + type);
    const toggle = panel.previousElementSibling;
    panel.classList.toggle('show');
    const wrapper = document.querySelector('.tec-calc-wrapper');
    const translations = wrapper._tecTranslations;
    if (translations) {
      const key = type === 'diesel' ? 'diesel' : 'heating';
      toggle.textContent = panel.classList.contains('show') ? translations[key].advancedToggleClose : translations[key].advancedToggle;
    } else {
      toggle.textContent = panel.classList.contains('show') ? '− Weniger anzeigen' : '+ Erweiterte Einstellungen';
    }
  }

  function syncSavings() { $('tec-savings-display').textContent = $('tec-savings-slider').value; calculate(); }

  function setBuilding(type) {
    $$('.tec-building-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
    $('tec-heating-slider').value = BUILDING_PRESETS[type];
    $('tec-heating-input').value = BUILDING_PRESETS[type];
    calculate();
  }

  function syncHeating(src) {
    let v = clamp(parseInt(src === 'slider' ? $('tec-heating-slider').value : $('tec-heating-input').value) || LIMITS.heating[0], LIMITS.heating[0], LIMITS.heating[1]);
    $('tec-heating-slider').value = v;
    $('tec-heating-input').value = v;
    calculate();
  }

  function syncHeatingRaw() {
    let v = parseInt($('tec-heating-input').value) || 0;
    $('tec-heating-slider').value = clamp(v, LIMITS.heating[0], LIMITS.heating[1]);
    calculate();
  }

  function clampHeating() {
    let v = clamp(parseInt($('tec-heating-input').value) || LIMITS.heating[0], LIMITS.heating[0], LIMITS.heating[1]);
    $('tec-heating-input').value = v;
    $('tec-heating-slider').value = v;
    calculate();
  }

  function syncHeatingSavings() { $('tec-heating-savings-display').textContent = $('tec-heating-savings-slider').value; calculate(); }

  function calculate() { currentTab === 'diesel' ? calculateDiesel() : calculateHeating(); }

  function calculateDiesel() {
    const km = clamp(parseFloat($('tec-km-input').value) || 80000, LIMITS.km[0], LIMITS.km[1]);
    const price = clamp(parseFloat($('tec-diesel-price').value) || 1.95, LIMITS.price[0], LIMITS.price[1]);
    const consType = $('tec-consumption').value;
    let cons = consType === 'custom' ? (parseFloat($('tec-custom-consumption').value) || 32) : parseFloat(consType);
    cons = clamp(cons, LIMITS.cons[0], LIMITS.cons[1]);
    const savePct = clamp(parseFloat($('tec-savings-slider').value) || 7, LIMITS.savings[0], LIMITS.savings[1]);
    const litersPerVehicle = (km / 100) * cons, totalLiters = litersPerVehicle * vehicles;
    const litersSaved = totalLiters * (savePct / 100), gross = litersSaved * price;
    const tecCost = totalLiters * TEC_COST, net = Math.max(0, gross - tecCost);
    const co2 = litersSaved * (CO2_LITER / 1000), perVehicle = Math.max(0, net / vehicles);
    const costWithout = totalLiters * price, costWith = costWithout - net;
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

  function calculateHeating() {
    const liters = clamp(parseFloat($('tec-heating-input').value) || 8000, LIMITS.heating[0], LIMITS.heating[1]);
    const price = clamp(parseFloat($('tec-heating-price').value) || 1.35, LIMITS.price[0], LIMITS.price[1]);
    const savePct = clamp(parseFloat($('tec-heating-savings-slider').value) || 7, LIMITS.savings[0], LIMITS.savings[1]);
    const litersSaved = liters * (savePct / 100), gross = litersSaved * price;
    const tecCost = liters * TEC_COST, net = Math.max(0, gross - tecCost);
    const co2 = litersSaved * (CO2_LITER / 1000);
    const costWithout = liters * price, costWith = costWithout - net;
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

  const CSS_CONTENT = '${escapeJS(minifiedCSS)}';

  const HTML_CONTENT = '${escapeJS(minifiedHTML)}';

  const TRANSLATIONS = ${JSON.stringify(translations)};

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
`;

  return entryContent;
}

// Build function
async function build() {
  console.log('Building TecBlu Calculator Widget...');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Create bundle content
  const bundleContent = createBundleEntry();

  // Write directly (no esbuild needed since we're creating a self-contained IIFE)
  fs.writeFileSync(OUTPUT_FILE, bundleContent, 'utf-8');

  // Get file size
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeKB = (stats.size / 1024).toFixed(2);

  console.log(`✓ Built ${OUTPUT_FILE} (${sizeKB} KB)`);
}

// Watch mode
async function watch() {
  console.log('Watching for changes...');

  const watchDirs = [
    path.join(SRC_DIR, 'styles'),
    path.join(SRC_DIR, 'templates'),
    path.join(SRC_DIR, 'js'),
    path.join(SRC_DIR, 'i18n')
  ];

  // Initial build
  await build();

  // Watch for changes
  watchDirs.forEach(dir => {
    fs.watch(dir, { recursive: true }, async (eventType, filename) => {
      if (filename) {
        console.log(`\nFile changed: ${filename}`);
        try {
          await build();
        } catch (err) {
          console.error('Build error:', err.message);
        }
      }
    });
  });

  console.log('Press Ctrl+C to stop watching.');
}

// Main
const isWatch = process.argv.includes('--watch');

if (isWatch) {
  watch().catch(console.error);
} else {
  build().catch(console.error);
}
