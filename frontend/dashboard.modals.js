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
    
    if (!mainComparison || !cache.progressImageComparison) return;
    
    // Check if main comparison is visible (meaning images are loaded)
    if (mainComparison.style.display === 'none') {
      cache.progressImageComparison.style.display = 'none';
      return;
    }
    
    // Get images from main comparison
    const originalImg = Q('originalImage');
    const transformedImg = Q('transformedImage');
    
    if (originalImg && transformedImg && cache.progressOriginalImage && cache.progressTransformedImage) {
      // Copy image sources
      cache.progressOriginalImage.src = originalImg.src;
      cache.progressTransformedImage.src = transformedImg.src;
      
      // Show the progress comparison
      cache.progressImageComparison.style.display = 'block';
      
      console.log('✅ Image comparison copied to progress modal');
    } else {
      cache.progressImageComparison.style.display = 'none';
    }
  }

  function showProgressDialog() {
    wireProgressIfNeeded();
    
    if (!cache.progress) {
      console.warn('[modals] progressDialog not available');
      return;
    }

    // Copy image comparison if available
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
    
    // Show video preview in LOOP mode (silent)
    if (cache.progressVideo && cache.progressVideoSrc) {
      const src = videoData.videoPath || videoData.path || '';
      cache.progressVideoSrc.src = src;
      
      // Configure video for preview loop
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

    // Update container state to preview
    if (cache.videoContainer) {
      cache.videoContainer.className = 'video-container preview';
    }

    // Auto play loop immediately
    setTimeout(() => {
      if (cache.progressVideo && cache.progressVideo.play) {
        cache.progressVideo.play().catch(()=>{});
        addProgressLog("▶️ Video preview started (silent loop)");
        
        // After 3 seconds, finalize the video and show close button
        setTimeout(() => {
          finalizeProgressVideo();
        }, 3000);
      }
    }, 100);
  }
  
  function finalizeProgressVideo() {
    wireProgressIfNeeded();
    if (!cache.progress || !cache.progress.open) return;
    
    addProgressLog("✅ Video generation completed successfully!");
    addProgressLog("🎉 Process finished - Ready to close");
    
    // Stop loop and enable controls
    if (cache.progressVideo) {
      cache.progressVideo.loop = false;
      cache.progressVideo.muted = false;
      cache.progressVideo.controls = true;
      cache.progressVideo.currentTime = 0; // Reset to start
    }
    
    // Update container to final state
    if (cache.videoContainer) {
      cache.videoContainer.className = 'video-container complete';
    }
    
    // Show close button
    if (cache.progressCloseBtn) {
      cache.progressCloseBtn.style.display = 'block';
      cache.progressCloseBtn.style.animation = 'fadeIn 0.5s ease';
    }
    
    // Update final step
    updateProgressStep(5);
  }

  function hideProgressDialog() {
    wireProgressIfNeeded();
    if (cache.progress) {
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



  // Exponer API (aunque falten nodos, no fallamos)
  window.Modals = { 
    showApprovalDialog, 
    showVideoDialog, 
    showProgressDialog, 
    hideProgressDialog, 
    updateProgressStep, 
    addProgressLog,
    showProgressVideo,
    finalizeProgressVideo
  };
  console.log('[modals] ready');
})();
