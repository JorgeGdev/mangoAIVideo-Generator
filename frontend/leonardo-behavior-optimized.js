// ============================================
// LEONARDO BEHAVIOR OPTIMIZED
// ============================================

let isLeonardoInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
  if (isLeonardoInitialized) return;
  isLeonardoInitialized = true;
  
  console.log('🎨 Leonardo behavior initialized');
  
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
  
  console.log('✅ Leonardo behavior ready');
});