// ============================================================================
// RAILWAY AUTO-DOWNLOAD HANDLER - Manejo de descargas automáticas para Railway
// ============================================================================

// Detectar si estamos en Railway
const isRailwayEnvironment = () => {
  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || 
                 hostname === '127.0.0.1' ||
                 hostname.includes('192.168') ||
                 hostname.includes('10.0.') ||
                 hostname.includes('172.16.');
  
  const isRailway = !isLocal;
  
  console.log(`🌍 Hostname: ${hostname}`);
  console.log(`🚂 Is Railway: ${isRailway}`);
  
  return isRailway;
};

// Auto-descarga en Railway
function triggerRailwayDownload(videoData) {
  const isRailway = isRailwayEnvironment();
  
    
  if (!isRailway || !videoData.autoDownload) {
    
    return false;
  }
  
  const downloadUrl = videoData.downloadUrl || videoData.videoPath;
  if (!downloadUrl) {
    
    return false;
  }
  
  // Crear elemento de descarga temporal
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = videoData.videoName;
  downloadLink.style.display = 'none';
  
  // Agregar al DOM, hacer click, y remover
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  // Mostrar notificación de descarga
  showRailwayDownloadNotification(videoData.videoName);
  
  console.log('✅ Railway download link clicked successfully');
  return true;
}

// Mostrar notificación de descarga en Railway
function showRailwayDownloadNotification(videoName) {
  // Crear notificación temporal
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="font-size: 20px;">🚂</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Railway Download</div>
        <div style="opacity: 0.9; font-size: 13px;">${videoName} started downloading</div>
      </div>
    </div>
  `;
  
  // Agregar animación CSS
  if (!document.getElementById('railway-download-styles')) {
    const styles = document.createElement('style');
    styles.id = 'railway-download-styles';
    styles.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(styles);
  }
  
  document.body.appendChild(notification);
  
  // Auto-remover después de 5 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Integración con el sistema de eventos existente
function handleVideoCompletionForRailway(eventData) {
  if (eventData.type === 'video_completion' && eventData.isRailway) {
    
    
    // Intentar descarga automática para AMBOS tipos de video
    const downloadTriggered = triggerRailwayDownload(eventData);
    
    if (downloadTriggered) {
      
      
      // Para video subtitulado, mostrar mensaje adicional
      if (eventData.isSubtitled) {
        
      }
    } else {
      
    }
  }
}

// Función para descargar manualmente desde Railway
function downloadFromRailway(videoPath, videoName) {
  if (!isRailwayEnvironment()) {
    console.log('Not in Railway environment, using normal download');
    return false;
  }
  
  const downloadData = {
    autoDownload: true,
    downloadUrl: videoPath,
    videoName: videoName,
    isRailway: true
  };
  
  return triggerRailwayDownload(downloadData);
}

// Exportar funciones para uso global
window.railwayDownloadHandler = {
  isRailway: isRailwayEnvironment,
  triggerDownload: triggerRailwayDownload,
  showNotification: showRailwayDownloadNotification,
  handleVideoCompletion: handleVideoCompletionForRailway,
  downloadFromRailway: downloadFromRailway
};

