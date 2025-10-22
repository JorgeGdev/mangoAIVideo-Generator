// ============================================
// DASHBOARD OPTIMIZED - SINGLE INITIALIZATION
// ============================================

// 🔒 PRODUCTION LOGGING SYSTEM
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const logger = {
  log: (...args) => isDevelopment && logger.log(...args),
  warn: (...args) => isDevelopment && console.warn(...args),
  error: (...args) => console.error(...args), // Errores siempre se muestran
  info: (...args) => isDevelopment && console.info(...args)
};

let eventSource = null;
let currentSessionId = null;
let isInitialized = false;

// Prevent multiple initializations
if (isInitialized) {
  logger.log('Dashboard already initialized');
} else {
  logger.log('🚀 Initializing Dashboard...');
  isInitialized = true;
}

// ============================================================================
// CAROUSEL STATE (SIMPLIFIED)
// ============================================================================
let carouselState = {
  news: [],
  currentIndex: 0,
  autoplayInterval: null,
  isPaused: false,
  transitionDuration: 8000 // 8 seconds between slides
};

// ============================================================================
// FETCH CAROUSEL NEWS (OPTIMIZED)
// ============================================================================
async function fetchCarouselNews() {
  try {
    logger.log("[Carousel] Fetching news...");
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch("/api/news/carousel", {
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.news.length > 0) {
      carouselState.news = result.news;
      logger.log(`✅ [Carousel] Loaded ${result.news.length} news items`);
      initializeCarousel();
    } else {
      console.error("❌ [Carousel] No news available");
      showCarouselError();
    }
  } catch (error) {
    console.error("❌ [Carousel] Error:", error.message);
    showCarouselError();
  }
}

// ============================================================================
// INITIALIZE CAROUSEL (SIMPLIFIED)
// ============================================================================
function initializeCarousel() {
  const slidesContainer = document.getElementById("carouselSlides");
  const dotsContainer = document.getElementById("carouselDots");

  if (!slidesContainer || !dotsContainer) {
    logger.log("⚠️ [Carousel] Elements not found");
    return;
  }

  // Clear existing content
  slidesContainer.innerHTML = "";
  dotsContainer.innerHTML = "";

  // Create slides (8 slides: 2 per country)
  const maxSlides = Math.min(carouselState.news.length, 8);
  
  for (let i = 0; i < maxSlides; i++) {
    const news = carouselState.news[i];
    
    // Create slide
    const slide = document.createElement("div");
    slide.className = `carousel-slide ${i === 0 ? "active" : ""}`;

    // Format date
    const date = new Date(news.date);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Determine background style using country images
    let backgroundStyle = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
    if (news.image) {
      const imagePath = `/images/${news.image}`;
      backgroundStyle = `
        background: 
          linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%),
          url('${imagePath}') center/cover no-repeat;
      `;
    }

    slide.innerHTML = `
      <div class="carousel-image" style="${backgroundStyle}">
        <div class="carousel-overlay"></div>
        <div class="carousel-content">
          <div class="carousel-country">
            <span class="carousel-flag">${news.flag}</span>
            <span>${news.country}</span>
          </div>
          <h2 class="carousel-title">${news.title}</h2>
          <p class="carousel-summary">${news.summary}</p>
          <div class="carousel-meta">
            <span class="carousel-source">${news.source}</span>
            <span class="carousel-date">${formattedDate}</span>
          </div>
        </div>
      </div>
    `;

    slidesContainer.appendChild(slide);

    // Create dot
    const dot = document.createElement("div");
    dot.className = `carousel-dot ${i === 0 ? "active" : ""}`;
    dot.addEventListener("click", () => goToSlide(i));
    dotsContainer.appendChild(dot);
  }

  // Setup navigation
  setupCarouselNavigation();
  
  // Start autoplay (only once)
  if (!carouselState.autoplayInterval) {
    startAutoplay();
  }
}

// ============================================================================
// CAROUSEL NAVIGATION (OPTIMIZED)
// ============================================================================
function setupCarouselNavigation() {
  const prevButton = document.getElementById("carouselPrev");
  const nextButton = document.getElementById("carouselNext");

  if (prevButton && nextButton) {
    // Remove existing listeners to prevent duplicates
    prevButton.replaceWith(prevButton.cloneNode(true));
    nextButton.replaceWith(nextButton.cloneNode(true));
    
    // Add new listeners
    document.getElementById("carouselPrev").addEventListener("click", previousSlide);
    document.getElementById("carouselNext").addEventListener("click", nextSlide);
  }
}

function goToSlide(index) {
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.querySelectorAll(".carousel-dot");

  // Remove active classes
  slides.forEach(s => s.classList.remove("active"));
  dots.forEach(d => d.classList.remove("active"));

  // Add active to new slide
  if (slides[index] && dots[index]) {
    slides[index].classList.add("active");
    dots[index].classList.add("active");
    carouselState.currentIndex = index;
  }
}

function nextSlide() {
  const nextIndex = (carouselState.currentIndex + 1) % Math.min(carouselState.news.length, 8);
  goToSlide(nextIndex);
}

function previousSlide() {
  const prevIndex = (carouselState.currentIndex - 1 + Math.min(carouselState.news.length, 8)) % Math.min(carouselState.news.length, 8);
  goToSlide(prevIndex);
}

function startAutoplay() {
  if (carouselState.autoplayInterval) {
    clearInterval(carouselState.autoplayInterval);
  }
  
  carouselState.autoplayInterval = setInterval(() => {
    if (!carouselState.isPaused && carouselState.news.length > 1) {
      nextSlide();
    }
  }, carouselState.transitionDuration);
}

function showCarouselError() {
  const slidesContainer = document.getElementById("carouselSlides");
  if (slidesContainer) {
    slidesContainer.innerHTML = `
      <div class="carousel-slide active">
        <div class="carousel-image" style="
          background: 
            linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%),
            url('/images/modified/influencer_1760829988513.jpg') center/cover no-repeat;
        ">
          <div class="carousel-overlay"></div>
          <div class="carousel-content">
            <div class="carousel-loader">
              <p>📰 Loading latest news...</p>
              <p style="font-size: 0.9rem; opacity: 0.8;">Connecting to news sources...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// LOGS CONNECTION (OPTIMIZED)
// ============================================================================
function conectarLogs() {
  if (eventSource) { eventSource.close(); }
  eventSource = new EventSource('/api/logs');

  eventSource.onmessage = function(event) {
    let data;
    try { data = JSON.parse(event.data); } catch { data = {}; }

    // 1) LOGS NORMALES
    if (data.log) {
      const originalLog = document.getElementById('logOutput');
      const newLog = document.querySelector('.log-output-leo');
      if (originalLog) { originalLog.textContent += data.log + '\n'; }
      if (newLog) { 
        newLog.textContent += data.log + '\n'; 
        newLog.scrollTop = newLog.scrollHeight; 
      }

      // Add to progress modal logs if open
      if (window.Modals && window.Modals.addProgressLog) {
        window.Modals.addProgressLog(data.log);
      }

      // Update progress based on log content (only if progress modal is open)
      if (window.Modals && window.Modals.updateProgressStep && document.getElementById('progressDialog')?.open) {
        if (data.log.includes('Script approved') || data.log.includes('Continuando con el proceso')) {
          window.Modals.updateProgressStep(2); // Processing Audio (just approved)
        } else if (data.log.includes('Audio: ~2 minutes') || data.log.includes('Starting procesos paralelos')) {
          window.Modals.updateProgressStep(2); // Processing Audio
        } else if (data.log.includes('PROCESAMIENTO COMPLETADO') || data.log.includes('ASSETS LISTOS')) {
          window.Modals.updateProgressStep(3); // Processing Image
        } else if (data.log.includes('INICIANDO CREACIÓN DE VIDEO') || data.log.includes('Creando video final')) {
          window.Modals.updateProgressStep(4); // Creating Video
        }
      }

      return; // evitamos seguir si es sólo log
    }

    // 2) APPROVAL: abrir diálogo
    if (data.type === 'script_approval') {
      // guarda session para aprobar/rechazar rápido con los botones inline (si los usas)
      currentSessionId = data.sessionId;
      logger.log('[SSE] script_approval', data);

      if (window.Modals && typeof window.Modals.showApprovalDialog === 'function') {
        window.Modals.showApprovalDialog(data.sessionId, data.script, data.query);
      } else {
        alert('Script listo para revisión:\n\n' + (data.script || '(vacío)'));
      }
      return;
    }

    // 3) COMPARACIÓN DE IMAGEN: mostrar bloque
    if (data.type === 'image_comparison') {
      logger.log('[SSE] image_comparison', data);
      mostrarComparacionImagenes(data.originalPath, data.transformedPath);
      return;
    }

    // 4) VIDEO COMPLETADO: abrir diálogo
    if (data.type === 'video_completion') {
      logger.log('🎬 Video completion received:', data);
      logger.log('🎬 isSubtitled:', data.isSubtitled);
      logger.log('🎬 Modal system available:', !!window.Modals);
      
      // Check if this is the subtitled version (FINAL step)
      if (data.isSubtitled) {
        logger.log('� SUBTITLED VIDEO ARRIVED - Showing success message!');
        
        // Update to final step and show success message
        if (window.Modals && window.Modals.showSubtitledVideoComplete) {
          window.Modals.showSubtitledVideoComplete();
        }
        
        // Also show the video in the modal
        if (window.Modals && window.Modals.showProgressVideo) {
          window.Modals.showProgressVideo(data);
          window.Modals.addProgressLog(`📹 Subtitled video: ${data.videoName}`);
        }
      } else {
        // This is the normal video (first one) - just show it, no success message yet
        logger.log('📹 Normal video arrived - waiting for subtitled version...');
        
        // Update to step 4 (creating video complete, but not final yet)
        if (window.Modals && window.Modals.updateProgressStep) {
          window.Modals.updateProgressStep(4);
        }

        // Show the video in modal
        setTimeout(() => {
          if (window.Modals && typeof window.Modals.showVideoDialog === 'function') {
            logger.log('🎬 Opening video modal...');
            window.Modals.showVideoDialog(data);
          } else {
            console.error('❌ Modal system not available');
            alert('Video generated: ' + (data.videoPath || '(no path)'));
          }
        }, 1000);
      }
      
      return;
    }
  };

  eventSource.onerror = function() {
    logger.log('Log connection error');
  };
}


function mostrarComparacionImagenes(originalPath, transformedPath) {
  // soporta dos sets de ids (viejos y nuevos)
  const block = document.getElementById('imageComparison') || document.querySelector('.image-comparison');
  const originalImg = document.getElementById('originalImage') || document.getElementById('originalComparisonImage');
  const transformedImg = document.getElementById('transformedImage') || document.getElementById('transformedComparisonImage');

  if (!block || !originalImg || !transformedImg) {
    console.warn('[image] contenedor/ids de comparación no encontrados');
    return;
  }
  
  logger.log('📷 Setting image comparison:');
  logger.log('   Original:', originalPath);
  logger.log('   Transformed:', transformedPath);
  
  originalImg.src = originalPath || '';
  transformedImg.src = transformedPath || '';
  block.style.display = 'block';
  
  // Force update progress modal image comparison if it's open
  if (window.Modals && window.Modals.forceUpdateImageComparison) {
    logger.log('🔄 Updating progress modal image comparison...');
    window.Modals.forceUpdateImageComparison();
  }
}


// ============================================================================
// STATISTICS (THROTTLED)
// ============================================================================
let statsTimeout = null;

async function actualizarEstadisticas() {
  // Prevent multiple rapid calls
  if (statsTimeout) return;
  
  statsTimeout = setTimeout(() => {
    statsTimeout = null;
  }, 3000);
  
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    
    // Update stats in both locations
    updateStatElement('vectorCount', stats.vectores || 0);
    updateStatElement('videosCount', stats.videos || 0);
    updateStatElement('successRate', stats.exito || '0%');
    
  } catch (error) {
    logger.log('Stats update error:', error.message);
  }
}

function updateStatElement(id, value) {
  const elements = document.querySelectorAll(`#${id}, [data-stat="${id}"]`);
  elements.forEach(el => {
    if (el) el.textContent = value;
  });
}

// ============================================================================
// AUTH CHECK
// ============================================================================
async function verificarAuth() {
  try {
    const response = await fetch('/api/auth/check');
    const result = await response.json();
    
    if (!result.success) {
      window.location.href = '/login.html';
    }
  } catch (error) {
    logger.log('Auth check error');
  }
}

// ============================================================================
// MAIN FUNCTIONS (PRESERVED)
// ============================================================================

// Scraper function
async function ejecutarScraper() {
  const scraperBtn = document.getElementById('scraperBtn');
  const scraperStatus = document.getElementById('scraperStatus');
  
  if (scraperBtn) scraperBtn.disabled = true;
  if (scraperStatus) {
    scraperStatus.textContent = 'Running';
    scraperStatus.className = 'status-badge-leo active';
  }
  
  try {
    const response = await fetch('/api/scraper/start', { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      logger.log('✅ Scraper started');
    }
  } catch (error) {
    console.error('❌ Scraper error:', error);
  } finally {
    setTimeout(() => {
      if (scraperBtn) scraperBtn.disabled = false;
      if (scraperStatus) {
        scraperStatus.textContent = 'Idle';
        scraperStatus.className = 'status-badge-leo idle';
      }
    }, 3000);
  }
}

// Bot functions
async function iniciarBot() {
  const botBtn = document.getElementById('botBtn');
  const stopBtn = document.getElementById('stopBotBtn');
  const botStatus = document.getElementById('botStatus');
  
  try {
    const response = await fetch('/api/bot/start', { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      if (botBtn) botBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = false;
      if (botStatus) {
        botStatus.textContent = 'Active';
        botStatus.className = 'status-badge-leo active';
      }
    }
  } catch (error) {
    console.error('❌ Bot error:', error);
  }
}

async function detenerBot() {
  const botBtn = document.getElementById('botBtn');
  const stopBtn = document.getElementById('stopBotBtn');
  const botStatus = document.getElementById('botStatus');
  
  try {
    const response = await fetch('/api/bot/stop', { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      if (botBtn) botBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      if (botStatus) {
        botStatus.textContent = 'Inactive';
        botStatus.className = 'status-badge-leo idle';
      }
    }
  } catch (error) {
    console.error('❌ Stop bot error:', error);
  }
}

// Video generation
async function generarVideoManual() {
  const photoUpload = document.getElementById("photoUpload");
  const consultaInput = document.getElementById("consultaInput");
  const generateBtn = document.getElementById("generateBtn");
  const voiceSelect = document.getElementById("voiceSelect");

  // Validations
  if (!photoUpload?.files[0]) {
    alert("Please upload a photo first");
    return;
  }

  if (!consultaInput?.value.trim()) {
    alert("Please enter a news query");
    return;
  }

  if (!voiceSelect?.value) {
    alert("Please select a voice type");
    return;
  }

  // Disable button
  if (generateBtn) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>Generating...</span>';
  }

  try {
    const formData = new FormData();
    formData.append("photo", photoUpload.files[0]);
    formData.append("query", consultaInput.value.trim());
    formData.append("voiceType", voiceSelect.value);

    const response = await fetch("/api/generate-custom-video", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      currentSessionId = result.sessionId;
      logger.log("✅ Video generation started");
    } else {
      alert("Error: " + result.message);
    }
  } catch (error) {
    console.error("❌ Generation error:", error);
    alert("Error generating video");
  } finally {
    // Re-enable button
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span>Generate Video</span>';
    }
  }
}

// Approval functions
async function aprobarScript() {
  if (!currentSessionId) {
    alert("No session to approve");
    return;
  }

  try {
    const response = await fetch(`/api/video/approve/${currentSessionId}`, {
      method: "POST",
    });
    const result = await response.json();

    if (result.success) {
      logger.log("✅ Script approved");
    } else {
      alert("Error: " + result.message);
    }
  } catch (error) {
    console.error("❌ Approval error:", error);
    alert("Error approving script");
  }
}

async function rechazarScript() {
  if (!currentSessionId) {
    alert("No session to reject");
    return;
  }

  try {
    const response = await fetch(`/api/video/reject/${currentSessionId}`, {
      method: "POST",
    });
    const result = await response.json();

    if (result.success) {
      logger.log("✅ Script rejected");
      currentSessionId = null;
    }
  } catch (error) {
    console.error("❌ Rejection error:", error);
  }
}

// Clear logs
async function limpiarLogs() {
  try {
    await fetch('/api/logs/clear', { method: 'POST' });
    
    const originalLog = document.getElementById('logOutput');
    const newLog = document.querySelector('.log-output-leo');
    
    if (originalLog) originalLog.textContent = '';
    if (newLog) newLog.textContent = '';
    
  } catch (error) {
    console.error('❌ Clear logs error:', error);
  }
}

// Clear carousel cache and refresh news
async function limpiarCacheCarousel() {
  try {
    logger.log('🔄 Clearing carousel cache and fetching fresh news...');
    
    // Clear cache on server
    await fetch('/api/news/clear-cache', { method: 'POST' });
    
    // Fetch fresh news
    await fetchCarouselNews();
    
    logger.log('✅ Carousel refreshed with improved filters');
  } catch (error) {
    console.error('❌ Carousel refresh error:', error);
  }
}




function playVideo(videoPath) {
  // Create a modal to play the video
  const modal = document.createElement('div');
  modal.className = 'video-modal';
  modal.innerHTML = `
    <div class="video-modal-content">
      <button class="video-modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      <video controls autoplay style="width: 100%; max-width: 800px; border-radius: 12px;">
        <source src="${videoPath}" type="video/mp4">
      </video>
    </div>
  `;
  
  // Add modal styles
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  modal.querySelector('.video-modal-content').style.cssText = `
    position: relative;
    background: #000;
    border-radius: 12px;
    padding: 20px;
  `;
  
  modal.querySelector('.video-modal-close').style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    border-radius: 50%;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  document.body.appendChild(modal);
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Logout
async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  } catch (error) {
    window.location.href = '/login.html';
  }
}

// ============================================================================
// SHOWCASE VIDEOS (DYNAMIC LOADING)
// ============================================================================
async function loadShowcaseVideos() {
  try {
    logger.log('📹 [Showcase] Loading videos (original + subtitled)...');
    
    const response = await fetch('/api/videos/combined');
    const result = await response.json();
    
    if (result.success && result.videos.length > 0) {
      // Shuffle and select 4 random videos
      const shuffled = result.videos.sort(() => 0.5 - Math.random());
      const randomVideos = shuffled.slice(0, 4);
      
      displayShowcaseVideos(randomVideos);
      
      logger.log(`✅ [Showcase] Loaded ${result.stats?.total || result.videos.length} total videos (${result.stats?.original || 0} original, ${result.stats?.subtitled || 0} subtitled)`);
    } else {
      logger.log('⚠️ [Showcase] No videos found, showing placeholder');
      showShowcasePlaceholder();
    }
  } catch (error) {
    console.error('❌ [Showcase] Error loading videos:', error);
    showShowcasePlaceholder();
  }
}

function displayShowcaseVideos(videos) {
  const showcaseGrid = document.getElementById('showcaseGrid');
  if (!showcaseGrid) return;
  
  showcaseGrid.innerHTML = '';
  
  videos.forEach(video => {
    const videoCard = document.createElement('div');
    videoCard.className = 'showcase-card';
    
    // Add badge for subtitled videos
    const subtitleBadge = video.isSubtitled || video.type === 'subtitled' ? 
      '<div class="subtitle-badge">Subtitled</div>' : '';
    
    videoCard.innerHTML = `
      <video 
        src="${video.path}" 
        muted 
        autoplay 
        loop 
        playsinline
        onloadedmetadata="this.currentTime=0"
        ontimeupdate="if(this.currentTime>=5){this.currentTime=0}"
      ></video>
      ${subtitleBadge}
    `;
    
    showcaseGrid.appendChild(videoCard);
  });
  
  logger.log(`✅ [Showcase] Displayed ${videos.length} videos`);
}

function showShowcasePlaceholder() {
  const showcaseGrid = document.getElementById('showcaseGrid');
  if (!showcaseGrid) return;
  
  showcaseGrid.innerHTML = `
    <div class="showcase-card">
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: var(--color-bg-elevated);
        color: var(--color-text-muted);
        font-size: 1rem;
      ">
        No videos yet
      </div>
    </div>
  `;
}


document.addEventListener('DOMContentLoaded', function() {
  logger.log('🚀 Dashboard loading...');
  
  // Initialize core functions
  verificarAuth();
  
  // Initialize components
  setTimeout(() => {
    fetchCarouselNews();
    loadShowcaseVideos();
    conectarLogs();
    actualizarEstadisticas();
  }, 100);
  
  // Stats update interval
  setInterval(() => {
    actualizarEstadisticas();
  }, 10000);
  
  logger.log('✅ Dashboard ready');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
  if (eventSource) {
    eventSource.close();
  }
  if (carouselState.autoplayInterval) {
    clearInterval(carouselState.autoplayInterval);
  }
});

// Dashboard optimized - production ready
