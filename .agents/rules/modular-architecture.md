# ICE LOGIX — Modular Architecture Guidelines

<!-- Всегда сохранять модульность. Любая новая фича — отдельный файл в public/js/modules/ -->

## Rules for AI Agents:
1. Never inline JavaScript into `index.html` or `public/app.html`.
2. Keep `index.html` and `public/app.html` under 250 lines of pure semantic HTML markup.
3. Every feature screen must be in `public/js/modules/<name>.js`.
4. Register global exports on `window` for inter-module accessibility.
5. Always verify syntax with `npm run build` before completing turns.
