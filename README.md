# TecBlu Savings Calculator

Embeddable fuel and heating oil savings calculator with automatic language/country detection.

## Quick Start

```html
<div data-tec-calc></div>
<script src="https://cdn.jsdelivr.net/gh/grimnebluna/tecblu-calc-embed@1.0.0/dist/tec-calc.iife.js"></script>
```

## Language Detection

Auto-detects from URL:

| Domain | Language | Currency |
|--------|----------|----------|
| `tecblu.ch` | German | CHF |
| `tecblu.at`, `tecblu.de` | German | EUR |
| `en.tecblu.*` | English | based on TLD |
| `fr.tecblu.ch`, `tecblu.fr` | French | CHF/EUR |
| `it.tecblu.ch`, `tecblu.it` | Italian | CHF/EUR |

### Override

```html
<div data-tec-calc data-lang="en" data-currency="EUR"></div>
```

## Development

```bash
npm install
npm run dev      # Dev server with demo.html
npm run build    # Output: dist/tec-calc.iife.js
```

## Hosting

**jsDelivr (recommended):**
```
https://cdn.jsdelivr.net/gh/grimnebluna/tecblu-calc-embed@1.0.0/dist/tec-calc.iife.js
```

**Self-hosted:**
Upload `dist/tec-calc.iife.js` to your server.

## Adding Languages

1. Create `src/i18n/xx.json`
2. Import in `src/locale.js`
3. `npm run build`
