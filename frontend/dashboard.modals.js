// dashboard.modals.js
(function () {
  // Utilidad: consulta segura (si no existe, devuelve null)
  const Q = (sel) => document.getElementById(sel);

  // Estado actual
  let currentApproval = null;

  // Cache perezoso de nodos (se rellena cuando se abre el modal)
  const cache = {
    approval: null,
    progress: null,
    dlgSessionId: null,
    dlgQuery: null,
    dlgWordCount: null,
    dlgScript: null,
    btnApprove: null,
    btnReject: null,
    step1: null,
    step2: null,
    step3: null,
    step4: null,
    step5: null,
    progressLogs: null,
    videoContainer: null,
    progressLoader: null,
    progressVideo: null,
    progressVideoSrc: null,
    progressVideoName: null,
    progressVideoSize: null,
    progressVideoInfo: null,
    progressCloseBtn: null,
    wiredApproval: false,
    wiredProgress: false
  };

  function wireApprovalIfNeeded() {
    if (cache.wiredApproval) return;

    cache.approval     = Q('approvalDialog');
    cache.dlgSessionId = Q('dlgSessionId');
    cache.dlgQuery     = Q('dlgQuery');
    cache.dlgWordCount = Q('dlgWordCount');
    cache.dlgScript    = Q('dlgScript');
    cache.btnApprove   = Q('dlgApprove');
    cache.btnReject    = Q('dlgReject');

    // Si falta el dialog, no intentamos más (pero no rompemos la app)
    if (!cache.approval) {
      console.warn('[modals] approvalDialog not found in DOM');
      return;
    }

    // Bind sólo si existen
    if (cache.btnApprove) cache.btnApprove.addEventListener('click', approve);
    if (cache.btnReject)  cache.btnReject.addEventListener('click', reject);

    cache.wiredApproval = true;
  }



  function wireProgressIfNeeded() {
    if (cache.wiredProgress) return;

    cache.progress = Q('progressDialog');
    cache.step1 = Q('step1');
    cache.step2 = Q('step2'); 
    cache.step3 = Q('step3');
    cache.step4 = Q('step4');
    cache.step5 = Q('step5');
    cache.progressLogs = Q('progressLogs');
    cache.videoContainer = Q('videoContainer');
    cache.progressLoader = Q('progressLoader');
    cache.progressVideo = Q('progressVideo');
    cache.progressVideoSrc = Q('progressVideoSrc');
    cache.progressVideoName = Q('progressVideoName');
    cache.progressVideoSize = Q('progressVideoSize');
    cache.progressVideoInfo = Q('progressVideoInfo');
    
    // Image comparison elements
    cache.progressImageComparison = Q('progressImageComparison');
    cache.progressOriginalImage = Q('progressOriginalImage');
    cache.progressTransformedImage = Q('progressTransformedImage');
    
    // Close button
    cache.progressCloseBtn = Q('progressCloseBtn');

    if (!cache.progress) {
      console.warn('[modals] progressDialog not found in DOM');
      return;
    }

    cache.wiredProgress = true;
  }

  // Abre dialog con fallback si showModal falla
  function safeShowModal(dialogEl) {
    if (!dialogEl) return;
    try {
      if (typeof dialogEl.showModal === 'function') {
        dialogEl.showModal();
        return;
      }
    } catch (e) {
      console.warn('[dialog] showModal error, using fallback:', e.message);
    }
    dialogEl.setAttribute('open', 'open');
    dialogEl.classList.add('dialog-fallback');
    document.documentElement.classList.add('dialog-open');
  }

  function safeClose(dialogEl) {
    if (!dialogEl) return;
    try {
      if (typeof dialogEl.close === 'function') {
        dialogEl.close();
        return;
      }
    } catch {}
    dialogEl.removeAttribute('open');
    dialogEl.classList.remove('dialog-fallback');
    document.documentElement.classList.remove('dialog-open');
  }

  // API
  function showApprovalDialog(sessionId, script, query) {
    wireApprovalIfNeeded();

    if (!cache.approval) {
      alert('Script ready:\n\n' + (script || '(empty)')); // último fallback
      return;
    }

    currentApproval = { sessionId, script, query };

    if (cache.dlgSessionId) cache.dlgSessionId.textContent = sessionId || '-';
    if (cache.dlgQuery)     cache.dlgQuery.textContent     = query || 'N/A';
    if (cache.dlgScript)    cache.dlgScript.textContent    = script || '';

    const words = (script || '').trim().split(/\s+/).filter(Boolean).length;
    if (cache.dlgWordCount) cache.dlgWordCount.textContent = words + ' words';

    safeShowModal(cache.approval);
  }

  async function approve() {
    if (!currentApproval) return;
    const { sessionId } = currentApproval;
    
    // Show progress modal immediately when user approves
    showProgressDialog();
    
    try {
      const r = await fetch(`/api/video/approve/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'Approve failed');
      
      // Close approval modal
      safeClose(cache.approval);
    } catch (e) {
      // Hide progress modal on error
      hideProgressDialog();
      alert('Error approving: ' + e.message);
    }
  }

  async function reject() {
    if (!currentApproval) return;
    const { sessionId } = currentApproval;
    try {
      const r = await fetch(`/api/video/reject/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'Reject failed');
      safeClose(cache.approval);
      
      // Hide progress modal if it was shown
      hideProgressDialog();
    } catch (e) {
      alert('Error rejecting: ' + e.message);
    }
  }

  function showVideoDialog(videoData) {
    // Solo mostrar en el modal de progreso
    showProgressVideo(videoData);
  }

  // Copy image comparison from main page to progress modal
  function copyImageComparison() {
    const mainComparison = Q('imageComparison');
    
    if (!mainComparison || !cache.progressImageComparison) {
      console.log('⚠️ Main comparison or progress comparison not found');
      return;
    }
    
    // Get images from main comparison
    const originalImg = Q('originalImage');
    const transformedImg = Q('transformedImage');
    
    if (originalImg && transformedImg && cache.progressOriginalImage && cache.progressTransformedImage) {
      // Only update if the main images have real content (not empty or default)
      const originalSrc = originalImg.src;
      const transformedSrc = transformedImg.src;
      
      // Check if main comparison has real images loaded (not default ones)
      if (originalSrc && transformedSrc && 
          !originalSrc.includes('before.png') && 
          !originalSrc.includes('after.png') &&
          originalSrc !== '' && transformedSrc !== '') {
        
        // Copy real image sources
        cache.progressOriginalImage.src = originalSrc;
        cache.progressTransformedImage.src = transformedSrc;
        
        // Show the progress comparison
        cache.progressImageComparison.style.display = 'block';
        
        
      } else {
        
        // Keep showing the comparison with default images
        cache.progressImageComparison.style.display = 'block';
      }
    } else {
      console.log('⚠️ Image elements not found, keeping defaults');
      // Keep showing the comparison with default images
      if (cache.progressImageComparison) {
        cache.progressImageComparison.style.display = 'block';
      }
    }
  }

  // Force copy image comparison (called externally when images are loaded)
  function forceUpdateImageComparison() {
    wireProgressIfNeeded();
    if (cache.progress && cache.progress.open) {
      setTimeout(copyImageComparison, 100); // Small delay to ensure images are loaded
    }
  }

  function showProgressDialog() {
    wireProgressIfNeeded();
    
    if (!cache.progress) {
      console.warn('[modals] progressDialog not available');
      return;
    }

    // Show image comparison immediately with default images
    if (cache.progressImageComparison) {
      cache.progressImageComparison.style.display = 'block';
      
      
      // Set default images if no images are loaded yet
      if (cache.progressOriginalImage && cache.progressTransformedImage) {
        // Use before.png and after.png as defaults
        cache.progressOriginalImage.src = '/images/before.png';
        cache.progressTransformedImage.src = '/images/after.png';
                
        // Add error handlers to check if images load
        cache.progressOriginalImage.onerror = function() {
          console.error('❌ Failed to load original default image');
        };
        cache.progressTransformedImage.onerror = function() {
          console.error('❌ Failed to load transformed default image');
        };
        
        cache.progressOriginalImage.onload = function() {
          
        };
        cache.progressTransformedImage.onload = function() {
          
        };
      }
    }

    // Copy image comparison if available (this will override defaults if real images exist)
    copyImageComparison();

    // Reset all steps
    [cache.step1, cache.step2, cache.step3, cache.step4, cache.step5].forEach(step => {
      if (step) {
        step.classList.remove('active', 'completed');
      }
    });

    // Set initial state: Step 1 completed (script approved), Step 2 active (processing audio)
    if (cache.step1) cache.step1.classList.add('completed');
    if (cache.step2) cache.step2.classList.add('active');

    // Reset logs and video container
    if (cache.progressLogs) cache.progressLogs.textContent = 'System logs will appear here...';
    if (cache.videoContainer) {
      cache.videoContainer.className = 'video-container loading';
    }
    if (cache.progressLoader) cache.progressLoader.style.display = 'flex';
    if (cache.progressVideo) {
      cache.progressVideo.style.display = 'none';
      cache.progressVideo.loop = false; // Reset loop
      cache.progressVideo.muted = false; // Reset muted
    }
    if (cache.progressVideoInfo) cache.progressVideoInfo.style.display = 'none';
    
    // Hide close button initially
    if (cache.progressCloseBtn) cache.progressCloseBtn.style.display = 'none';

    safeShowModal(cache.progress);
  }

  function addProgressLog(message) {
    wireProgressIfNeeded();
    if (cache.progressLogs && cache.progress && cache.progress.open) {
      const timestamp = new Date().toLocaleTimeString();
      const logLine = `[${timestamp}] ${message}`;
      
      if (cache.progressLogs.textContent === 'System logs will appear here...') {
        cache.progressLogs.textContent = logLine;
      } else {
        cache.progressLogs.textContent += '\n' + logLine;
      }
      
      // Auto scroll to bottom
      cache.progressLogs.scrollTop = cache.progressLogs.scrollHeight;
    }
  }

  function showProgressVideo(videoData) {
    wireProgressIfNeeded();
    if (!cache.progress || !cache.progress.open) return;

    // Hide loader first
    if (cache.progressLoader) cache.progressLoader.style.display = 'none';
    
    // Show video preview in LOOP mode (silent) - KEEP YELLOW BORDER
    if (cache.progressVideo && cache.progressVideoSrc) {
      const src = videoData.videoPath || videoData.path || '';
      cache.progressVideoSrc.src = src;
      
      // Configure video for preview loop - STAY IN PREVIEW MODE
      cache.progressVideo.loop = true;
      cache.progressVideo.muted = true; 
      cache.progressVideo.controls = false; // No controls during preview
      cache.progressVideo.load();
      cache.progressVideo.style.display = 'block';
      
      addProgressLog("🎬 Video preview ready - Playing in loop...");
    }

    // Update video info
    if (cache.progressVideoName) {
      cache.progressVideoName.textContent = videoData.videoName || videoData.name || 'video.mp4';
    }
    
    if (cache.progressVideoSize) {
      const sizeBytes = videoData.videoSize || videoData.size || 0;
      cache.progressVideoSize.textContent = 
        sizeBytes >= 1024*1024 ? (sizeBytes / (1024*1024)).toFixed(2) + ' MB' : (sizeBytes / 1024).toFixed(2) + ' KB';
    }

    if (cache.progressVideoInfo) cache.progressVideoInfo.style.display = 'block';

    // KEEP YELLOW BORDER - Stay in preview mode, don't change to complete
    if (cache.videoContainer) {
      cache.videoContainer.className = 'video-container preview';
    }

    // Auto play loop immediately
    setTimeout(() => {
      if (cache.progressVideo && cache.progressVideo.play) {
        cache.progressVideo.play().catch(()=>{});
        addProgressLog("▶️ Video preview started (silent loop)");
        
        // Make video clickeable for download
        cache.progressVideo.style.cursor = 'pointer';
        cache.progressVideo.title = `Click to download ${videoData.videoName || 'video'}`;
        
        // Add click handler for download
        cache.progressVideo.onclick = () => {
          const isSubtitled = videoData.isSubtitled || false;
          const videoName = videoData.videoName || videoData.name;
          
          if (videoName) {
            downloadVideo(videoData.videoPath, videoName, isSubtitled);
          }
        };
        
        // DON'T show success message here - it will be shown when subtitled video arrives
        // Just update progress and show close button after delay
        setTimeout(() => {
          addProgressLog("✅ Video generated! Processing subtitles...");
          addProgressLog("⏳ Waiting for subtitled version...");
          addProgressLog("👆 Click video preview to download");
          
          // Show close button but DON'T show success message yet
          if (cache.progressCloseBtn) {
            cache.progressCloseBtn.style.display = 'block';
            cache.progressCloseBtn.style.animation = 'fadeIn 0.5s ease';
          }
          
          // Update to step 4 (not final yet, waiting for subtitles)
          updateProgressStep(4);
        }, 2000);
      }
    }, 100);
  }

  // Called when subtitled video arrives (final step)
  function showSubtitledVideoComplete() {
    wireProgressIfNeeded();
    
    // Update to final step
    updateProgressStep(5);
    addProgressLog("🎉 Subtitled video ready!");
    addProgressLog("✅ PROCESS COMPLETE - Both videos generated");
    
    // Show success message after short delay
    setTimeout(() => {
      showSuccessMessage();
    }, 1000);
  }

  function showSuccessMessage() {
    // Prevent multiple success messages
    if (document.getElementById('videoSuccessOverlay')) {
      console.log('🚫 Success message already showing, preventing duplicate');
      return;
    }
    
    // Create success overlay
    const successOverlay = document.createElement('div');
    successOverlay.id = 'videoSuccessOverlay';
    successOverlay.innerHTML = `
      <div class="success-content">
        <div class="success-icon">🎉</div>
        <h2 class="success-title">VIDEO GENERATED SUCCESSFULLY!</h2>
        <p class="success-subtitle">Your AI-powered video is ready to watch and download</p>
        <div class="success-confetti">
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
          <div class="confetti"></div>
        </div>
        <button class="success-close-btn" onclick="window.Modals.hideSuccessMessage()">
          ✨ Awesome! Generate Another
        </button>
      </div>
    `;
    document.body.appendChild(successOverlay);
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      #videoSuccessOverlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: successFadeIn 0.5s ease;
      }
      
      .success-content {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 60px 40px;
        border-radius: 20px;
        text-align: center;
        color: white;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        position: relative;
        overflow: hidden;
        max-width: 500px;
        transform: scale(0.8);
        animation: successPopIn 0.6s ease forwards;
      }
      
      .success-icon {
        font-size: 80px;
        margin-bottom: 20px;
        animation: bounce 2s infinite;
      }
      
      .success-title {
        font-size: 28px;
        font-weight: bold;
        margin: 0 0 15px 0;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .success-subtitle {
        font-size: 16px;
        margin: 0 0 30px 0;
        opacity: 0.9;
      }
      
      .success-close-btn {
        background: #fff;
        color: #667eea;
        border: none;
        padding: 15px 30px;
        border-radius: 50px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
      }
      
      .success-close-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      }
      
      .success-confetti {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      
      .confetti {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #FFD700;
        animation: confettiFall 3s linear infinite;
      }
      
      .confetti:nth-child(1) { left: 10%; animation-delay: 0s; background: #FF6B6B; }
      .confetti:nth-child(2) { left: 30%; animation-delay: 0.5s; background: #4ECDC4; }
      .confetti:nth-child(3) { left: 50%; animation-delay: 1s; background: #45B7D1; }
      .confetti:nth-child(4) { left: 70%; animation-delay: 1.5s; background: #96CEB4; }
      .confetti:nth-child(5) { left: 90%; animation-delay: 2s; background: #FFEAA7; }
      
      @keyframes successFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes successPopIn {
        from { transform: scale(0.5) translateY(50px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
      
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-20px); }
        60% { transform: translateY(-10px); }
      }
      
      @keyframes confettiFall {
        0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    // Show the overlay
    successOverlay.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideSuccessMessage();
    }, 5000);
  }

  function hideSuccessMessage() {
    const successOverlay = document.getElementById('videoSuccessOverlay');
    if (successOverlay) {
      successOverlay.style.animation = 'successFadeIn 0.5s ease reverse';
      setTimeout(() => {
        successOverlay.style.display = 'none';
        // ONLY remove overlay from DOM after fade animation
        setTimeout(() => {
          if (successOverlay.parentNode) {
            successOverlay.parentNode.removeChild(successOverlay);
          }
        }, 100);
      }, 500);
    }
    
    // STOP VIDEO COMPLETELY to prevent audio leakage
    if (cache.progressVideo) {
      cache.progressVideo.pause();
      cache.progressVideo.currentTime = 0;
      cache.progressVideo.src = '';
      cache.progressVideo.load(); // Force reload to clear everything
      console.log('🔇 Video completely stopped and cleared');
    }
    
    // IMPORTANT: Now reset everything for new generation AFTER success message disappears
    setTimeout(() => {
      resetForNewGeneration();
    }, 600); // Wait for fade animation to complete
  }

  function resetForNewGeneration() {
    // Close progress modal
    hideProgressDialog();
    
    // Reset main form
    const photoUpload = document.getElementById('photoUpload');
    const voiceSelect = document.getElementById('voiceSelect');
    const consultaInput = document.getElementById('consultaInput');
    const previewImage = document.getElementById('previewImage');
    const uploadText = document.getElementById('uploadText');
    const imageComparison = document.getElementById('imageComparison');
    
    if (photoUpload) photoUpload.value = '';
    if (voiceSelect) voiceSelect.value = '';
    if (consultaInput) consultaInput.value = '';
    if (previewImage) previewImage.style.display = 'none';
    if (uploadText) uploadText.textContent = 'Drag & drop your photo here or click to browse';
    if (imageComparison) imageComparison.style.display = 'none';
    
    // Clear current session
    if (window.currentSessionId) {
      window.currentSessionId = null;
    }
    
    console.log('✨ Everything reset for new generation');
  }

  function hideProgressDialog() {
    wireProgressIfNeeded();
    if (cache.progress) {
      // STOP VIDEO COMPLETELY before closing
      if (cache.progressVideo) {
        cache.progressVideo.pause();
        cache.progressVideo.currentTime = 0;
        cache.progressVideo.src = '';
        cache.progressVideo.load();
        console.log('Video stopped when closing modal');
      }
      safeClose(cache.progress);
    }
  }

  function updateProgressStep(stepNumber) {
    wireProgressIfNeeded();
    
    const steps = [cache.step1, cache.step2, cache.step3, cache.step4, cache.step5];
    
    steps.forEach((step, index) => {
      if (!step) return;
      
      if (index < stepNumber - 1) {
        step.classList.remove('active');
        step.classList.add('completed');
      } else if (index === stepNumber - 1) {
        step.classList.remove('completed');
        step.classList.add('active');
      } else {
        step.classList.remove('active', 'completed');
      }
    });
  }

  // ============================================================================
  // ROBUST VIDEO DOWNLOAD FUNCTIONALITY  
  // ============================================================================
  
  async function downloadVideo(videoPath, videoName, isSubtitled = false) {
    try {
      console.log(`📥 Starting download: ${videoName} (subtitled: ${isSubtitled})`);
      
      // Determine video type and filename
      const videoType = isSubtitled ? 'subtitled' : 'normal';
      const filename = videoName || 'video.mp4';
      
      // Create download link using robust endpoint
      const downloadUrl = `/api/video/download/${videoType}/${filename}`;
      
      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`🎉 Download initiated: ${filename}`);
      addProgressLog(`📥 Downloading ${filename}...`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Download failed: ${error.message}`);
      alert(`Download failed: ${error.message}`);
      return false;
    }
  }

  // Exponer API (aunque falten nodos, no fallamos)
  window.Modals = { 
    showApprovalDialog, 
    showVideoDialog, 
    showProgressDialog, 
    hideProgressDialog, 
    updateProgressStep, 
    addProgressLog,
    showProgressVideo,
    showSubtitledVideoComplete,
    forceUpdateImageComparison,
    showSuccessMessage,
    hideSuccessMessage,
    resetForNewGeneration,
    downloadVideo
  };
  
})();
