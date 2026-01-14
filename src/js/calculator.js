/**
 * TecBlu Calculator - Core Calculation Logic
 */

import { formatCurrency, formatNumber } from './localization.js';

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
export function initCalculator(lang = 'de') {
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
export function setLanguage(lang) {
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

export { calculate, LIMITS, BUILDING_PRESETS };
