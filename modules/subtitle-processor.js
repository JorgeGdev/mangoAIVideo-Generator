// modules/subtitle-processor.js
// -------- SUBTITLE PROCESSOR --------
// Procesa automáticamente videos para agregar subtítulos karaoke
// Integrado con el flujo principal de generación de videos

const fs = require('fs').promises;
const path = require('path');
const { transcribeToWords } = require('./subtitle-transcriber');
const { buildASS } = require('./subtitle-ass-builder');
const { burnWithASS, getTargetDimensions } = require('./subtitle-burner');

// Carpetas de destino
const SUBTITLED_VIDEOS_DIR = 'final_videos_subtitled';
const TMP_SUBTITLES_DIR = 'tmp_subtitles';

/**
 * Procesa un video para agregarle subtítulos karaoke
 * @param {string} videoPath - Ruta del video original
 * @param {string} sessionId - ID de sesión para logs
 * @returns {object} Información del video con subtítulos
 */
async function processVideoSubtitles(videoPath, sessionId) {
  try {
    console.log(`🎵 [${sessionId}] Starting subtitle processing for: ${videoPath}`);
    
    // Verificar que el archivo existe
    const videoExists = await fileExists(videoPath);
    if (!videoExists) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Crear directorios necesarios
    await ensureDirectories();

    // Generar nombres de archivos
    const videoName = path.basename(videoPath, '.mp4');
    const subtitledVideoName = `${videoName}_subtitled.mp4`;
    const subtitledVideoPath = path.join(SUBTITLED_VIDEOS_DIR, subtitledVideoName);
    
    // Archivos temporales
    const tmpDir = TMP_SUBTITLES_DIR;
    const assPath = path.join(tmpDir, `${videoName}.ass`);
    const wordsPath = path.join(tmpDir, `${videoName}.words.json`);

    console.log(`🎯 [${sessionId}] Output will be: ${subtitledVideoPath}`);

    // 1) Transcribir audio a palabras con timestamps
    console.log(`🎤 [${sessionId}] Transcribing audio with Whisper...`);
    const words = await transcribeToWords(videoPath);
    
    if (!words || words.length === 0) {
      throw new Error('No words extracted from transcription');
    }
    
    console.log(`📝 [${sessionId}] Extracted ${words.length} words from audio`);
    
    // Guardar palabras para debug
    await fs.writeFile(wordsPath, JSON.stringify({ words }, null, 2), 'utf8');

    // 2) Obtener dimensiones del video para escalar subtítulos
    console.log(`📐 [${sessionId}] Analyzing video dimensions...`);
    const dims = await getTargetDimensions(videoPath);
    const W = dims.output.width || 1920;
    const H = dims.output.height || 1080;

    // Calcular tamaño de fuente y margen basado en dimensiones
    const baseH = H * 0.052;             // ~5.2% de la altura
    const baseW = W * 0.070;             // ~7.0% del ancho
    const fontSize = Math.max(30, Math.round(Math.min(baseH, baseW)));
    const marginV = Math.round(H * 0.22); // ~22% de la altura

    console.log(`🎨 [${sessionId}] Font size: ${fontSize}, Margin: ${marginV} (${W}x${H})`);

    // 3) Generar archivo ASS con estilo karaoke
    console.log(`🎭 [${sessionId}] Building ASS subtitle file...`);
    const assContent = buildASS(words, {
      font: 'Montserrat',
      fontSize,
      marginV,
      primary: '&H00FFFFFF&',     // blanco
      secondary: '&H00FFCC66&',   // azul claro
      segment: {
        gapThresholdSec: 0.5,
        maxLineDurSec: 2.8,
        maxChars: 42
      },
      timing: {
        minWordSec: 0.10,
        leadSec: 0.20,
        tailSec: 0.24,
        warmupCs: 16,
        minInterGapSec: 0.06
      }
    });

    await fs.writeFile(assPath, assContent, 'utf8');
    console.log(`💾 [${sessionId}] ASS file saved: ${assPath}`);

    // 4) Quemar subtítulos en el video
    console.log(`🔥 [${sessionId}] Burning subtitles into video...`);
    await burnWithASS(videoPath, assPath, subtitledVideoPath);

    // 5) Verificar resultado
    const stats = await fs.stat(subtitledVideoPath);
    const videoSize = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ [${sessionId}] Subtitled video created: ${subtitledVideoPath} (${videoSize} MB)`);

    // Limpiar archivos temporales (opcional)
    try {
      await fs.unlink(assPath);
      await fs.unlink(wordsPath);
    } catch (cleanupError) {
      console.log(`⚠️ [${sessionId}] Warning: Could not cleanup temp files: ${cleanupError.message}`);
    }

    return {
      success: true,
      originalVideo: videoPath,
      subtitledVideo: subtitledVideoPath,
      subtitledVideoName,
      size: `${videoSize} MB`,
      wordsCount: words.length,
      sessionId
    };

  } catch (error) {
    console.error(`❌ [${sessionId}] Error processing subtitles: ${error.message}`);
    throw new Error(`Subtitle processing failed: ${error.message}`);
  }
}

/**
 * Crear directorios necesarios
 */
async function ensureDirectories() {
  await fs.mkdir(SUBTITLED_VIDEOS_DIR, { recursive: true });
  await fs.mkdir(TMP_SUBTITLES_DIR, { recursive: true });
}

/**
 * Verificar si un archivo existe
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtener lista de videos con subtítulos
 */
async function getSubtitledVideos() {
  try {
    await ensureDirectories();
    const files = await fs.readdir(SUBTITLED_VIDEOS_DIR);
    
    const videos = [];
    for (const file of files) {
      if (file.toLowerCase().endsWith('.mp4')) {
        const filePath = path.join(SUBTITLED_VIDEOS_DIR, file);
        const stats = await fs.stat(filePath);
        
        videos.push({
          filename: file,
          path: `/final_videos_subtitled/${file}`,
          size: Math.round(stats.size / (1024 * 1024)), // Size in MB
          created: stats.birthtime,
          modified: stats.mtime,
          title: file.replace('_subtitled.mp4', '').replace(/video_(\d{8})_(\d{6})/, 'Video $1 $2'),
          isSubtitled: true
        });
      }
    }
    
    return videos.sort((a, b) => b.created - a.created);
    
  } catch (error) {
    console.error('❌ Error getting subtitled videos:', error);
    return [];
  }
}

module.exports = {
  processVideoSubtitles,
  getSubtitledVideos,
  SUBTITLED_VIDEOS_DIR,
  TMP_SUBTITLES_DIR
};