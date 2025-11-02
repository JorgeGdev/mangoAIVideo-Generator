// ============================================================================
// RAILWAY STORAGE MANAGER - Manejo de archivos temporales para Railway
// ============================================================================

const fs = require('fs');
const path = require('path');

// Determinar si estamos en Railway (ambiente de producción)
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';

// Configuración de directorios
const STORAGE_CONFIG = {
  // En Railway usar /tmp (temporal), en local usar carpetas normales
  videos: isRailway ? '/tmp/videos' : './final_videos',
  audios: isRailway ? '/tmp/audios' : './generated_audios',
  images: isRailway ? '/tmp/images' : './images/modified',
  uploads: isRailway ? '/tmp/uploads' : './uploads',
  
  // URLs para servir archivos
  videoUrl: isRailway ? '/api/temp/videos' : '/final_videos',
  audioUrl: isRailway ? '/api/temp/audios' : '/generated_audios',
  imageUrl: isRailway ? '/api/temp/images' : '/images/modified',
};

// Crear directorios si no existen
function ensureDirectories() {
  Object.values(STORAGE_CONFIG).forEach(dir => {
    if (dir.startsWith('/') || dir.startsWith('./')) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        }
      } catch (error) {
        console.error(`❌ Error creating directory ${dir}:`, error.message);
      }
    }
  });
}

// Cache de archivos temporales (para Railway)
const tempFileCache = new Map();

// Registrar archivo temporal con TTL (Time To Live)
function registerTempFile(filename, filePath, type = 'video', ttlMinutes = 30) {
  if (!isRailway) return; // Solo en Railway
  
  const expireAt = Date.now() + (ttlMinutes * 60 * 1000);
  
  tempFileCache.set(filename, {
    path: filePath,
    type: type,
    createdAt: Date.now(),
    expireAt: expireAt,
    downloaded: false
  });
  
  console.log(`⏰ Registered temp file: ${filename} (expires in ${ttlMinutes}min)`);
  
  // Auto-cleanup después del TTL
  setTimeout(() => {
    cleanupTempFile(filename);
  }, ttlMinutes * 60 * 1000);
}

// Marcar archivo como descargado
function markAsDownloaded(filename) {
  if (tempFileCache.has(filename)) {
    tempFileCache.get(filename).downloaded = true;
    console.log(`✅ File marked as downloaded: ${filename}`);
  }
}

// Limpiar archivo temporal
function cleanupTempFile(filename) {
  if (!tempFileCache.has(filename)) return;
  
  const fileInfo = tempFileCache.get(filename);
  
  try {
    if (fs.existsSync(fileInfo.path)) {
      fs.unlinkSync(fileInfo.path);
      console.log(`🗑️ Cleaned up temp file: ${filename}`);
    }
  } catch (error) {
    console.error(`❌ Error cleaning file ${filename}:`, error.message);
  }
  
  tempFileCache.delete(filename);
}

// Obtener información de archivo temporal
function getTempFileInfo(filename) {
  return tempFileCache.get(filename) || null;
}

// Limpiar archivos expirados
function cleanupExpiredFiles() {
  const now = Date.now();
  
  for (const [filename, fileInfo] of tempFileCache.entries()) {
    if (now > fileInfo.expireAt) {
      console.log(`⏰ Cleaning expired file: ${filename}`);
      cleanupTempFile(filename);
    }
  }
}

// Obtener estadísticas de archivos temporales
function getTempFileStats() {
  const total = tempFileCache.size;
  const downloaded = Array.from(tempFileCache.values()).filter(f => f.downloaded).length;
  const pending = total - downloaded;
  
  return {
    total,
    downloaded, 
    pending,
    files: Array.from(tempFileCache.entries()).map(([name, info]) => ({
      name,
      type: info.type,
      createdAt: new Date(info.createdAt).toISOString(),
      expireAt: new Date(info.expireAt).toISOString(),
      downloaded: info.downloaded
    }))
  };
}

// Inicializar sistema de storage
function initStorage() {
  
  
  ensureDirectories();
  
  if (isRailway) {
    
    
    // Limpieza periódica de archivos expirados (cada 10 minutos)
    setInterval(() => {
      cleanupExpiredFiles();
    }, 10 * 60 * 1000);
  } else {
    
  }
  
  
  return STORAGE_CONFIG;
}

module.exports = {
  STORAGE_CONFIG,
  isRailway,
  ensureDirectories,
  registerTempFile,
  markAsDownloaded,
  cleanupTempFile,
  getTempFileInfo,
  cleanupExpiredFiles,
  getTempFileStats,
  initStorage,
  tempFileCache // Export cache for debugging
};