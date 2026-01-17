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

// Strip ES module syntax from source file
function stripModuleSyntax(code) {
  return code
    // Remove import statements
    .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
    // Remove export keywords but keep the declarations
    .replace(/^export\s+(function|const|let|var|class)\s+/gm, '$1 ')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    // Clean up extra blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Create the bundle
function createBundle() {
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

  // Read JS source files and strip module syntax
  const localizationJS = stripModuleSyntax(
    readFile(path.join(SRC_DIR, 'js', 'localization.js'))
  );
  const calculatorJS = stripModuleSyntax(
    readFile(path.join(SRC_DIR, 'js', 'calculator.js'))
  );

  // Create the bundled output
  const bundle = `/**
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

${localizationJS}

  // ==================== CALCULATOR ====================

${calculatorJS}

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
    const country = detectCountry();
    loadFonts();
    injectStyles();
    container.innerHTML = HTML_CONTENT;

    const translations = TRANSLATIONS[lang] || TRANSLATIONS.de;
    const wrapper = container.querySelector('.tec-calc-wrapper');
    if (wrapper) applyTranslations(wrapper, translations);

    initCalculator(lang, country);
    container.dataset.tecbluInit = 'true';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TecBluCalc = { init: init, detectLanguage: detectLanguage, detectCountry: detectCountry };
})();
`;

  return bundle;
}

// Build function
async function build() {
  console.log('Building TecBlu Calculator Widget...');

  // Ensure dist directory exists
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  // Create bundle content
  const bundleContent = createBundle();

  // Write the bundle
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
