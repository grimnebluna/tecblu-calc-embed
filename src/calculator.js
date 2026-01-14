/**
 * TecBlu Calculator - Main Logic
 */

import { detectLocale, getTranslations, getFormatter } from './locale.js';
import { generateTemplate } from './template.js';
import styles from './styles.css?inline';

// Constants
const TEC_COST = 0.0463;
const CO2_LITER = 2.65;
const MAX_OUT = 999999999999;
const BLDG = { single: 3000, multi: 8000, commercial: 50000 };
const LIM = {
  km: [1000, 300000],
  cons: [1, 150],
  vehicles: [1, 1000],
  heating: [500, 500000],
  price: [0.5, 5],
  savings: [1, 25]
};

export class TecCalculator {
  constructor(container, options = {}) {
    this.container = container;
    
    // Detect or override locale
    const detected = detectLocale();
    this.lang = options.lang || container.dataset.lang || detected.lang;
    this.country = options.country || container.dataset.country || detected.country;
    this.currency = options.currency || container.dataset.currency || detected.currency;
    this.defaultPrices = options.prices || detected.prices;
    
    // Get translations and formatter
    this.t = getTranslations(this.lang);
    this.fmt = getFormatter(this.lang, this.country);
    
    // State
    this.tab = 'diesel';
    this.vehicles = 5;
    
    this.init();
  }
  
  init() {
    this.injectStyles();
    this.render();
    this.bindEvents();
    this.calculate();
  }
  
  injectStyles() {
    if (!document.getElementById('tec-calc-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'tec-calc-styles';
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }
  }
  
  render() {
    this.container.innerHTML = generateTemplate(this.t, this.currency, this.defaultPrices);
    this.container.classList.add('tec-calc-wrapper');
  }
  
  // Helper methods
  $(id) { return this.container.querySelector(`#${id}`); }
  $$(sel) { return this.container.querySelectorAll(sel); }
  clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  
  fmtNum(n, d = 0) {
    return new Intl.NumberFormat(this.lang === 'de' ? 'de-CH' : this.lang, {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    }).format(Math.min(n, MAX_OUT));
  }
  
  fmtCurrency(n) {
    const val = this.fmtNum(Math.round(Math.min(n, MAX_OUT)));
    return this.currency === 'CHF' 
      ? `CHF ${val}.–`
      : `€ ${val}`;
  }
  
  bindEvents() {
    // Tab switching
    this.$$('.tec-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
    
    // Vehicle buttons
    this.$$('.tec-btn-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.val === 'custom') {
          this.toggleCustomVehicles();
        } else {
          this.setVehicles(parseInt(btn.dataset.val));
        }
      });
    });
    
    // Custom vehicles input
    const customVehicles = this.$('tec-custom-vehicles');
    if (customVehicles) {
      customVehicles.addEventListener('input', () => this.calculateRaw());
      customVehicles.addEventListener('blur', () => this.clampVehicles());
    }
    
    // KM slider/input
    const kmSlider = this.$('tec-km-slider');
    const kmInput = this.$('tec-km-input');
    if (kmSlider) kmSlider.addEventListener('input', () => this.syncKm('slider'));
    if (kmInput) {
      kmInput.addEventListener('input', () => this.syncKmRaw());
      kmInput.addEventListener('blur', () => this.clampKm());
    }
    
    // Price buttons
    this.$$('.tec-price-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'diesel-minus') this.adjustPrice('diesel', -0.05);
        else if (action === 'diesel-plus') this.adjustPrice('diesel', 0.05);
        else if (action === 'heating-minus') this.adjustPrice('heating', -0.05);
        else if (action === 'heating-plus') this.adjustPrice('heating', 0.05);
      });
    });
    
    // Price inputs
    const dieselPrice = this.$('tec-diesel-price');
    const heatingPrice = this.$('tec-heating-price');
    if (dieselPrice) dieselPrice.addEventListener('input', () => this.calculate());
    if (heatingPrice) heatingPrice.addEventListener('input', () => this.calculate());
    
    // Consumption select
    const consumption = this.$('tec-consumption');
    if (consumption) consumption.addEventListener('change', () => this.handleConsumption());
    
    // Custom consumption
    const customCons = this.$('tec-custom-consumption');
    if (customCons) {
      customCons.addEventListener('input', () => this.calculateRaw());
      customCons.addEventListener('blur', () => this.clampConsumption());
    }
    
    // Savings sliders
    const savingsSlider = this.$('tec-savings-slider');
    if (savingsSlider) savingsSlider.addEventListener('input', () => this.syncSavings());
    
    const heatingSavingsSlider = this.$('tec-heating-savings-slider');
    if (heatingSavingsSlider) heatingSavingsSlider.addEventListener('input', () => this.syncHeatingSavings());
    
    // Advanced toggle
    this.$$('.tec-advanced-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggleAdvanced(btn.dataset.panel, btn));
    });
    
    // Building buttons
    this.$$('.tec-building-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setBuilding(btn.dataset.type));
    });
    
    // Heating slider/input
    const heatingSlider = this.$('tec-heating-slider');
    const heatingInput = this.$('tec-heating-input');
    if (heatingSlider) heatingSlider.addEventListener('input', () => this.syncHeating('slider'));
    if (heatingInput) {
      heatingInput.addEventListener('input', () => this.syncHeatingRaw());
      heatingInput.addEventListener('blur', () => this.clampHeating());
    }
  }
  
  // Tab switching
  switchTab(t) {
    this.tab = t;
    this.$$('.tec-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    this.$('tec-diesel-calc').classList.toggle('tec-hidden', t !== 'diesel');
    this.$('tec-heating-calc').classList.toggle('tec-hidden', t !== 'heating');
    this.$('tec-diesel-results').classList.toggle('tec-hidden', t !== 'diesel');
    this.$('tec-heating-results').classList.toggle('tec-hidden', t !== 'heating');
    this.$('tec-compare').classList.toggle('tec-hidden', t !== 'diesel');
    this.$('tec-compare-heating').classList.toggle('tec-hidden', t !== 'heating');
    const hint = this.$('tec-mobile-hint');
    if (hint) hint.classList.toggle('tec-hidden', t !== 'diesel');
    this.calculate();
  }
  
  // Vehicle handling
  setVehicles(n) {
    this.vehicles = n;
    this.$('tec-custom-vehicles').classList.add('tec-hidden');
    this.$$('.tec-btn-opt').forEach(b => b.classList.toggle('active', b.dataset.val == n));
    this.calculate();
  }
  
  toggleCustomVehicles() {
    const input = this.$('tec-custom-vehicles');
    input.classList.remove('tec-hidden');
    input.focus();
    this.$$('.tec-btn-opt').forEach(b => b.classList.toggle('active', b.dataset.val === 'custom'));
  }
  
  clampVehicles() {
    const input = this.$('tec-custom-vehicles');
    this.vehicles = this.clamp(parseInt(input.value) || 1, LIM.vehicles[0], LIM.vehicles[1]);
    input.value = this.vehicles;
    this.calculate();
  }
  
  // KM handling
  syncKm(src) {
    const slider = this.$('tec-km-slider');
    const input = this.$('tec-km-input');
    if (src === 'slider') {
      input.value = slider.value;
    } else {
      slider.value = input.value;
    }
    this.calculate();
  }
  
  syncKmRaw() {
    const input = this.$('tec-km-input');
    const slider = this.$('tec-km-slider');
    slider.value = this.clamp(parseInt(input.value) || LIM.km[0], LIM.km[0], LIM.km[1]);
    this.calculate();
  }
  
  clampKm() {
    const input = this.$('tec-km-input');
    const slider = this.$('tec-km-slider');
    const v = this.clamp(parseInt(input.value) || LIM.km[0], LIM.km[0], LIM.km[1]);
    input.value = v;
    slider.value = v;
    this.calculate();
  }
  
  // Price handling
  adjustPrice(type, delta) {
    const el = this.$(type === 'diesel' ? 'tec-diesel-price' : 'tec-heating-price');
    el.value = this.clamp(parseFloat(el.value) + delta, LIM.price[0], LIM.price[1]).toFixed(2);
    this.calculate();
  }
  
  // Consumption handling
  handleConsumption() {
    const wrap = this.$('tec-custom-consumption-wrap');
    wrap.classList.toggle('tec-hidden', this.$('tec-consumption').value !== 'custom');
    this.calculate();
  }
  
  clampConsumption() {
    const input = this.$('tec-custom-consumption');
    input.value = this.clamp(parseInt(input.value) || 32, LIM.cons[0], LIM.cons[1]);
    this.calculate();
  }
  
  // Advanced toggle
  toggleAdvanced(type, btn) {
    const panel = this.$('tec-advanced-' + type);
    panel.classList.toggle('show');
    const t = this.t[type === 'diesel' ? 'diesel' : 'heating'];
    btn.textContent = panel.classList.contains('show') ? t.advancedHide : t.advancedShow;
  }
  
  // Savings sync
  syncSavings() {
    this.$('tec-savings-display').textContent = this.$('tec-savings-slider').value;
    this.calculate();
  }
  
  syncHeatingSavings() {
    this.$('tec-heating-savings-display').textContent = this.$('tec-heating-savings-slider').value;
    this.calculate();
  }
  
  // Building type
  setBuilding(type) {
    this.$$('.tec-building-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));
    this.$('tec-heating-slider').value = BLDG[type];
    this.$('tec-heating-input').value = BLDG[type];
    this.calculate();
  }
  
  // Heating sync
  syncHeating(src) {
    const slider = this.$('tec-heating-slider');
    const input = this.$('tec-heating-input');
    let v = this.clamp(parseInt(src === 'slider' ? slider.value : input.value) || LIM.heating[0], LIM.heating[0], LIM.heating[1]);
    slider.value = v;
    input.value = v;
    this.calculate();
  }
  
  syncHeatingRaw() {
    const input = this.$('tec-heating-input');
    const slider = this.$('tec-heating-slider');
    slider.value = this.clamp(parseInt(input.value) || 0, LIM.heating[0], LIM.heating[1]);
    this.calculate();
  }
  
  clampHeating() {
    const input = this.$('tec-heating-input');
    const slider = this.$('tec-heating-slider');
    let v = this.clamp(parseInt(input.value) || LIM.heating[0], LIM.heating[0], LIM.heating[1]);
    input.value = v;
    slider.value = v;
    this.calculate();
  }
  
  // Calculate without clamping (for live input)
  calculateRaw() {
    const customVehicles = this.$('tec-custom-vehicles');
    if (customVehicles && !customVehicles.classList.contains('tec-hidden')) {
      this.vehicles = parseInt(customVehicles.value) || 1;
    }
    this.calculate();
  }
  
  // Main calculation
  calculate() {
    if (this.tab === 'diesel') {
      this.calcDiesel();
    } else {
      this.calcHeating();
    }
  }
  
  calcDiesel() {
    const km = this.clamp(parseFloat(this.$('tec-km-input').value) || 80000, LIM.km[0], LIM.km[1]);
    const price = this.clamp(parseFloat(this.$('tec-diesel-price').value) || this.defaultPrices.diesel, LIM.price[0], LIM.price[1]);
    const consType = this.$('tec-consumption').value;
    let cons = consType === 'custom' 
      ? (parseFloat(this.$('tec-custom-consumption').value) || 32) 
      : parseFloat(consType);
    cons = this.clamp(cons, LIM.cons[0], LIM.cons[1]);
    const savePct = this.clamp(parseFloat(this.$('tec-savings-slider').value) || 7, LIM.savings[0], LIM.savings[1]);
    
    const litersPerVehicle = (km / 100) * cons;
    const totalLiters = litersPerVehicle * this.vehicles;
    const litersSaved = totalLiters * (savePct / 100);
    const gross = litersSaved * price;
    const tecCost = totalLiters * TEC_COST;
    const net = Math.max(0, gross - tecCost);
    const co2 = litersSaved * (CO2_LITER / 1000);
    const perVehicle = Math.max(0, net / this.vehicles);
    const costWithout = totalLiters * price;
    const costWith = costWithout - net;
    
    this.$('tec-primary-result').textContent = this.fmtCurrency(net);
    this.$('tec-r-diesel').textContent = this.fmtNum(litersSaved) + ' L';
    this.$('tec-r-co2').textContent = this.fmtNum(co2, 1) + ' t';
    this.$('tec-r-vehicle').textContent = this.fmtCurrency(perVehicle);
    this.$('tec-r-invest').textContent = this.fmtCurrency(tecCost);
    this.$('tec-c-without').textContent = this.fmtCurrency(costWithout);
    this.$('tec-c-with').textContent = this.fmtCurrency(costWith);
    this.$('tec-bar-with').style.width = (costWithout > 0 ? (costWith / costWithout) * 100 : 100) + '%';
    
    // Update CTA
    const ctaVal = this.container.querySelector('#tec-cta-val');
    if (ctaVal) ctaVal.textContent = this.fmtCurrency(net);
    this.$('tec-cta-link').href = '/offerte-einholen?type=diesel&savings=' + Math.round(net) + '&liters=' + Math.round(totalLiters);
  }
  
  calcHeating() {
    const liters = this.clamp(parseFloat(this.$('tec-heating-input').value) || 8000, LIM.heating[0], LIM.heating[1]);
    const price = this.clamp(parseFloat(this.$('tec-heating-price').value) || this.defaultPrices.heating, LIM.price[0], LIM.price[1]);
    const savePct = this.clamp(parseFloat(this.$('tec-heating-savings-slider').value) || 7, LIM.savings[0], LIM.savings[1]);
    
    const litersSaved = liters * (savePct / 100);
    const gross = litersSaved * price;
    const tecCost = liters * TEC_COST;
    const net = Math.max(0, gross - tecCost);
    const co2 = litersSaved * (CO2_LITER / 1000);
    const costWithout = liters * price;
    const costWith = costWithout - net;
    
    this.$('tec-primary-result').textContent = this.fmtCurrency(net);
    this.$('tec-rh-oil').textContent = this.fmtNum(litersSaved) + ' L';
    this.$('tec-rh-co2').textContent = this.fmtNum(co2, 2) + ' t';
    this.$('tec-rh-invest').textContent = this.fmtCurrency(tecCost);
    this.$('tec-ch-without').textContent = this.fmtCurrency(costWithout);
    this.$('tec-ch-with').textContent = this.fmtCurrency(costWith);
    this.$('tec-bar-h-with').style.width = (costWithout > 0 ? (costWith / costWithout) * 100 : 100) + '%';
    
    // Update CTA
    const ctaVal = this.container.querySelector('#tec-cta-val');
    if (ctaVal) ctaVal.textContent = this.fmtCurrency(net);
    this.$('tec-cta-link').href = '/offerte-einholen?type=heating&savings=' + Math.round(net) + '&liters=' + Math.round(liters);
  }
  
  // Public API: change language dynamically
  setLanguage(lang) {
    this.lang = lang;
    this.t = getTranslations(lang);
    this.render();
    this.bindEvents();
    this.calculate();
  }
}
