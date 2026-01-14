/**
 * HTML Template generator with i18n
 */

export function generateTemplate(t, currency, prices) {
  return `
<div class="tec-header">
  <h2>${t.header.title}</h2>
  <p>${t.header.subtitle}</p>
</div>
<div class="tec-tabs">
  <button class="tec-tab-btn active" data-tab="diesel">
    <span>⛽</span> 
    <span class="tec-tooltip">${t.tabs.fuel}<span class="tec-tooltip-text">${t.tabs.fuelTooltip}</span></span>
  </button>
  <button class="tec-tab-btn" data-tab="heating">
    <span>🔥</span> ${t.tabs.heating}
  </button>
</div>
<div class="tec-mobile-hint" id="tec-mobile-hint">${t.mobileHint}</div>
<div class="tec-grid">
  <div>
    <!-- DIESEL FORM -->
    <div class="tec-card" id="tec-diesel-calc">
      <div class="tec-field">
        <label class="tec-label"><span>🚛</span> ${t.diesel.vehicles}</label>
        <div class="tec-btn-group">
          <button class="tec-btn-opt" data-val="1">1</button>
          <button class="tec-btn-opt active" data-val="5">5</button>
          <button class="tec-btn-opt" data-val="10">10</button>
          <button class="tec-btn-opt" data-val="20">20</button>
          <button class="tec-btn-opt" data-val="custom">${t.diesel.vehiclesOther}</button>
          <input type="number" id="tec-custom-vehicles" class="tec-custom-input tec-hidden" value="5" min="1" max="1000">
        </div>
      </div>
      <div class="tec-field">
        <label class="tec-label"><span>📍</span> ${t.diesel.kmPerYear}</label>
        <div class="tec-slider-wrap">
          <input type="range" class="tec-slider" id="tec-km-slider" value="80000" min="1000" max="300000" step="1000">
          <div class="tec-slider-val">
            <input type="number" class="tec-slider-input" id="tec-km-input" value="80000" min="1000" max="300000">
            <span class="tec-slider-unit">km</span>
          </div>
        </div>
      </div>
      <div class="tec-field">
        <label class="tec-label">
          <span>⛽</span> 
          <span class="tec-tooltip">${t.diesel.fuelPrice}<span class="tec-tooltip-text">${t.tabs.fuelTooltip}</span></span> 
          ${t.diesel.fuelPricePerLiter}
        </label>
        <div class="tec-price-wrap">
          <button class="tec-price-btn" data-action="diesel-minus">−</button>
          <div class="tec-price-inner">
            <span class="tec-price-currency">${currency}</span>
            <input type="number" class="tec-price-input" id="tec-diesel-price" value="${prices.diesel.toFixed(2)}" step="0.05" min="0.5" max="5">
          </div>
          <button class="tec-price-btn" data-action="diesel-plus">+</button>
        </div>
        <p class="tec-hint">${t.diesel.priceHint}</p>
      </div>
      <div class="tec-field">
        <label class="tec-label"><span>📊</span> ${t.diesel.consumption}</label>
        <div class="tec-consumption-wrap">
          <select class="tec-select" id="tec-consumption">
            <option value="32">${t.diesel.consumptionTruck} (32 L/100km)</option>
            <option value="12">${t.diesel.consumptionVan} (12 L/100km)</option>
            <option value="9">${t.diesel.consumptionTransporter} (9 L/100km)</option>
            <option value="7">${t.diesel.consumptionCar} (7 L/100km)</option>
            <option value="custom">${t.diesel.consumptionOther}</option>
          </select>
          <div id="tec-custom-consumption-wrap" class="tec-hidden">
            <div class="tec-slider-val" style="display:inline-flex">
              <input type="number" class="tec-slider-input" id="tec-custom-consumption" value="32" min="1" max="150" style="width:50px">
              <span class="tec-slider-unit">L/100km</span>
            </div>
          </div>
        </div>
      </div>
      <button class="tec-advanced-toggle" data-panel="diesel">${t.diesel.advancedShow}</button>
      <div class="tec-advanced-panel" id="tec-advanced-diesel">
        <div class="tec-field" style="margin-bottom:12px">
          <label class="tec-label"><span>📈</span> ${t.diesel.expectedSavings}</label>
          <div class="tec-slider-wrap">
            <input type="range" class="tec-slider" id="tec-savings-slider" value="7" min="5" max="12" step="1">
            <div class="tec-slider-val" style="min-width:70px">
              <span id="tec-savings-display">7</span>
              <span class="tec-slider-unit">%</span>
            </div>
          </div>
        </div>
        <p class="tec-hint">${t.diesel.tecbluCost.replace('{currency}', currency)}</p>
      </div>
    </div>
    
    <!-- HEATING FORM -->
    <div class="tec-card tec-hidden" id="tec-heating-calc">
      <div class="tec-field">
        <label class="tec-label">${t.heating.buildingType}</label>
        <div class="tec-building-grid">
          <button class="tec-building-btn" data-type="single">
            <div class="tec-building-icon">🏠</div>
            <div class="tec-building-label">${t.heating.buildingSingle}</div>
          </button>
          <button class="tec-building-btn active" data-type="multi">
            <div class="tec-building-icon">🏢</div>
            <div class="tec-building-label">${t.heating.buildingMulti}</div>
          </button>
          <button class="tec-building-btn" data-type="commercial">
            <div class="tec-building-icon">🏭</div>
            <div class="tec-building-label">${t.heating.buildingCommercial}</div>
          </button>
        </div>
      </div>
      <div class="tec-field">
        <label class="tec-label"><span>🛢️</span> ${t.heating.yearlyConsumption}</label>
        <div class="tec-slider-wrap">
          <input type="range" class="tec-slider" id="tec-heating-slider" value="8000" min="500" max="500000" step="500">
          <div class="tec-slider-val">
            <input type="number" class="tec-slider-input" id="tec-heating-input" value="8000" min="500" max="500000">
            <span class="tec-slider-unit">L</span>
          </div>
        </div>
      </div>
      <div class="tec-field">
        <label class="tec-label"><span>💰</span> ${t.heating.heatingPrice}</label>
        <div class="tec-price-wrap">
          <button class="tec-price-btn" data-action="heating-minus">−</button>
          <div class="tec-price-inner">
            <span class="tec-price-currency">${currency}</span>
            <input type="number" class="tec-price-input" id="tec-heating-price" value="${prices.heating.toFixed(2)}" step="0.05" min="0.5" max="5">
          </div>
          <button class="tec-price-btn" data-action="heating-plus">+</button>
        </div>
        <p class="tec-hint">${t.heating.priceHint}</p>
      </div>
      <button class="tec-advanced-toggle" data-panel="heating">${t.heating.advancedShow}</button>
      <div class="tec-advanced-panel" id="tec-advanced-heating">
        <div class="tec-field" style="margin-bottom:0">
          <label class="tec-label"><span>📈</span> ${t.heating.expectedSavings}</label>
          <div class="tec-slider-wrap">
            <input type="range" class="tec-slider" id="tec-heating-savings-slider" value="7" min="5" max="12" step="1">
            <div class="tec-slider-val" style="min-width:70px">
              <span id="tec-heating-savings-display">7</span>
              <span class="tec-slider-unit">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- RESULTS PANEL -->
  <div>
    <div class="tec-results-card">
      <div class="tec-primary-result">
        <div class="tec-primary-label">${t.results.netSavings}</div>
        <div class="tec-primary-value" id="tec-primary-result">${currency} 0.–</div>
      </div>
      
      <!-- Diesel results -->
      <div class="tec-result-grid" id="tec-diesel-results">
        <div class="tec-result-item">
          <div class="tec-result-label">
            <span>💧</span> 
            <span class="tec-tooltip">${t.results.fuelSaved}<span class="tec-tooltip-text">${t.tabs.fuelTooltip}</span></span>
          </div>
          <div class="tec-result-value" id="tec-r-diesel">0 L</div>
        </div>
        <div class="tec-result-item highlight">
          <div class="tec-result-label"><span>🌱</span> ${t.results.co2Reduced}</div>
          <div class="tec-result-value" id="tec-r-co2">0 t</div>
        </div>
        <div class="tec-result-item">
          <div class="tec-result-label"><span>🚛</span> ${t.results.perVehicle}</div>
          <div class="tec-result-value" id="tec-r-vehicle">${currency} 0.–</div>
        </div>
        <div class="tec-result-item">
          <div class="tec-result-label"><span>📦</span> ${t.results.investment}</div>
          <div class="tec-result-value" id="tec-r-invest">${currency} 0.–</div>
        </div>
      </div>
      
      <!-- Heating results -->
      <div class="tec-result-grid tec-hidden" id="tec-heating-results">
        <div class="tec-result-item">
          <div class="tec-result-label"><span>💧</span> ${t.results.heatingOilSaved}</div>
          <div class="tec-result-value" id="tec-rh-oil">0 L</div>
        </div>
        <div class="tec-result-item highlight">
          <div class="tec-result-label"><span>🌱</span> ${t.results.co2Reduced}</div>
          <div class="tec-result-value" id="tec-rh-co2">0 t</div>
        </div>
        <div class="tec-result-item" style="grid-column:span 2">
          <div class="tec-result-label"><span>📦</span> ${t.results.investment}</div>
          <div class="tec-result-value" id="tec-rh-invest">${currency} 0.–</div>
        </div>
      </div>
      
      <!-- Heating comparison -->
      <div class="tec-compare tec-hidden" id="tec-compare-heating">
        <div class="tec-compare-title">${t.compare.titleHeating}</div>
        <div class="tec-compare-row">
          <div class="tec-compare-header">
            <span class="tec-compare-label">${t.compare.without}</span>
            <span class="tec-compare-val-red" id="tec-ch-without">${currency} 0.–</span>
          </div>
          <div class="tec-compare-track">
            <div class="tec-compare-bar red" id="tec-bar-h-without" style="width:100%"></div>
          </div>
        </div>
        <div class="tec-compare-row">
          <div class="tec-compare-header">
            <span class="tec-compare-label green">${t.compare.with}</span>
            <span class="tec-compare-val-green" id="tec-ch-with">${currency} 0.–</span>
          </div>
          <div class="tec-compare-track">
            <div class="tec-compare-bar green" id="tec-bar-h-with" style="width:93%"></div>
          </div>
        </div>
      </div>
      
      <!-- Diesel comparison -->
      <div class="tec-compare" id="tec-compare">
        <div class="tec-compare-title">${t.compare.titleFuel}</div>
        <div class="tec-compare-row">
          <div class="tec-compare-header">
            <span class="tec-compare-label">${t.compare.without}</span>
            <span class="tec-compare-val-red" id="tec-c-without">${currency} 0.–</span>
          </div>
          <div class="tec-compare-track">
            <div class="tec-compare-bar red" id="tec-bar-without" style="width:100%"></div>
          </div>
        </div>
        <div class="tec-compare-row">
          <div class="tec-compare-header">
            <span class="tec-compare-label green">${t.compare.with}</span>
            <span class="tec-compare-val-green" id="tec-c-with">${currency} 0.–</span>
          </div>
          <div class="tec-compare-track">
            <div class="tec-compare-bar green" id="tec-bar-with" style="width:93%"></div>
          </div>
        </div>
      </div>
      
      <!-- CTA -->
      <div class="tec-cta">
        <p class="tec-cta-text">${t.cta.text.replace('{savings}', `${currency} 0.–`)}</p>
        <a href="/offerte-einholen" class="tec-cta-btn" id="tec-cta-link">
          ${t.cta.button}
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
          </svg>
        </a>
        <p class="tec-cta-phone">${t.cta.questions} <a href="tel:+41438880012">+41 43 888 00 12</a></p>
      </div>
    </div>
  </div>
</div>`;
}
