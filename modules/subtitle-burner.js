// modules/subtitle-burner.js
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
// Muy importante en Windows: indicar dónde está ffprobe
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * Burn-in de subtítulos ASS y downscale a 1080p (manteniendo AR).
 * Salida con CRF 23, audio copy.
 */
async function burnWithASS(inputPath, assPath, outPath) {
  await ensureDir(path.dirname(outPath));

  return new Promise((resolve, reject) => {
    // Railway/Linux vs Windows path handling
    const isWindows = process.platform === 'win32';
    const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production';
    
    let subtitleFilter;
    if (isRailway || !isWindows) {
      // Railway/Linux: usar path directo, sin escape de ':'
      subtitleFilter = `subtitles='${assPath}'`;
    } else {
      // Windows local: escapar \ y :
      subtitleFilter = `subtitles='${assPath.replace(/\\/g, '/').replace(/:/g, '\\:')}'`;
    }
    
    console.log(`🔥 Subtitle filter: ${subtitleFilter}`);
    
    // FORCE 9:16 aspect ratio - Always vertical format
    const vf = [
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
      subtitleFilter
    ].join(',');

    console.log(`🎬 FFmpeg input: ${inputPath}`);
    console.log(`📝 ASS file: ${assPath}`);
    console.log(`🎯 Output: ${outPath}`);
    console.log(`🔧 Video filters: ${vf}`);
    
    ffmpeg(inputPath)
      .videoFilters(vf)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23',
        '-c:a copy'
      ])
      .on('start', (commandLine) => {
        console.log('🚀 FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`⏳ Subtitle burning progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg subtitle burning error:', err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('✅ Subtitle burning completed successfully');
        resolve(outPath);
      })
      .save(outPath);
  });
}

/**
 * Devuelve dimensiones del INPUT y del OUTPUT - SIEMPRE 9:16 (1080x1920)
 * Forzamos formato vertical para todos los videos
 */
async function getTargetDimensions(inputPath) {
  const meta = await ffprobeAsync(inputPath);
  const stream = (meta.streams || []).find(s => s.width && s.height) || {};
  const iw = Number(stream.width) || 1920;
  const ih = Number(stream.height) || 1080;

  // FORCE 9:16 - Always return 1080x1920 (vertical)
  return { 
    input: { width: iw, height: ih }, 
    output: { width: 1080, height: 1920 } 
  };
}

function fitBox(iw, ih, maxW, maxH) {
  if (iw <= maxW && ih <= maxH) return { width: iw, height: ih };
  const scale = Math.min(maxW / iw, maxH / ih);
  return {
    width: Math.round(iw * scale),
    height: Math.round(ih * scale)
  };
}

function ffprobeAsync(file) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

module.exports = { burnWithASS, getTargetDimensions };