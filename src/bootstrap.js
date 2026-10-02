// Opening the source page with Live Server uses the compiled, browser-ready site.
// Vite supplies import.meta.env in development and in the production bundle.
if (typeof import.meta.env === 'undefined') {
  const builtPage = new URL('./dist/index.html', window.location.href);
  builtPage.hash = window.location.hash;
  window.location.replace(builtPage.href);
} else {
  import('./main.js');
}
