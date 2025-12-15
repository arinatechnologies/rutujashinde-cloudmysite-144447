# CloudMySite Eleventy Bolt Template

Opinionated Eleventy starter tailored to the Bolt workflow. The layout loads Bootstrap 5 and Font Awesome 6 via CDN, always includes header/footer styles, and keeps editable image overlays friendly for editors like GrapesJS.

## Getting started

1. `npm install`
2. `npm run start` (live-reload at `http://localhost:8080`)
3. `npm run build` to publish to `public/`

## Structure

- `src/_layouts`: shared page shell (loads `head`, `header`, and `footer`)
- `src/_partials`: reusable HTML fragments
- `src/pages`: content with optional `extra_css`/`extra_js`
- `css`: global styles pulled through passthrough copy
