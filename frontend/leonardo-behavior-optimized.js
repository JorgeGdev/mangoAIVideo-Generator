// ============================================
// LEONARDO BEHAVIOR OPTIMIZED
// ============================================

// 🔒 PRODUCTION LOGGING SYSTEM
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const logger = {
  log: (...args) => isDevelopment && logger.log(...args),
  warn: (...args) => isDevelopment && console.warn(...args),
  error: (...args) => console.error(...args), // Errores siempre se muestran
  info: (...args) => isDevelopment && console.info(...args)
};

let isLeonardoInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
  if (isLeonardoInitialized) return;
  isLeonardoInitialized = true;
  
  logger.log('🎨 Leonardo behavior initialized');
  
  // Header shrink effect (throttled)
  let ticking = false;
  
  function updateHeader() {
    const scrollY = window.pageYOffset;
    const header = document.querySelector('.header-leo');
    
    if (header) {
      if (scrollY > 100) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
    
    ticking = false;
  }
  
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }
  
  window.addEventListener('scroll', onScroll, { passive: true });
  
  // Showcase loader with timeout
  function initShowcaseLoader() {
    const showcase = document.querySelector('.showcase-grid-leo');
    if (showcase) {
      showcase.classList.add('loaded');
    }
  }
  
  setTimeout(initShowcaseLoader, 1000);
  
  logger.log('✅ Leonardo behavior ready');
});
