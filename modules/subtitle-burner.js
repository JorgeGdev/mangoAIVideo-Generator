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
    const vf = [
      "scale='if(gt(iw,1920),1920,iw)':'if(gt(ih,1080),1080,ih)':force_original_aspect_ratio=decrease",
      // Escapar correctamente para Windows
      `subtitles='${assPath.replace(/\\/g, '/').replace(/:/g, '\\:')}'`
    ].join(',');

    ffmpeg(inputPath)
      .videoFilters(vf)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast',
        '-crf 23',
        '-c:a copy'
      ])
      .on('error', (err) => reject(err))
      .on('end', () => resolve(outPath))
      .save(outPath);
  });
}

/**
 * Devuelve dimensiones del INPUT y del OUTPUT "fitted" a la caja 1920x1080,
 * emulando el filtro: force_original_aspect_ratio=decrease
 */
async function getTargetDimensions(inputPath) {
  const meta = await ffprobeAsync(inputPath);
  const stream = (meta.streams || []).find(s => s.width && s.height) || {};
  const iw = Number(stream.width) || 1920;
  const ih = Number(stream.height) || 1080;

  const { width, height } = fitBox(iw, ih, 1920, 1080);
  return { input: { width: iw, height: ih }, output: { width, height } };
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