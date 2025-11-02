// modules/subtitle-burner.js
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
// Muy importante en Windows: indicar dónde está ffprobe
ffmpeg.setFfprobePath(ffprobeInstaller.path);

async function getTargetDimensions(input) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(input, (err, data) => {
      if (err) return reject(err);
      const s = data.streams.find(s => s.width && s.height) || {};
      const width = s.width || 1920;
      const height = s.height || 1080;
      resolve({ input: { width, height }, output: { width, height } });
    });
  });
}

async function burnWithASS(inputVideo, assPath, outVideo) {
  await ensureDir(path.dirname(outVideo));

  return new Promise((resolve, reject) => {
    // Estilo seguro con DejaVu Sans y borde visible
    const safeStyle = "FontName=DejaVu Sans,Outline=2,BorderStyle=3,Shadow=0,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&";
    
    // Escapar la ruta del .ass para el filtro subtitles
    const assEsc = assPath.replace(/\\/g, '\\\\').replace(/:/g, '\\:');
    
    // Usar filtro subtitles con force_style
    const subtitlesFilter = `subtitles='${assEsc}':force_style='${safeStyle}'`;

    console.log(`🔥 Using subtitles filter: ${subtitlesFilter}`);
    console.log(`🎬 FFmpeg input: ${inputVideo}`);
    console.log(`📝 ASS file: ${assPath}`);
    console.log(`🎯 Output: ${outVideo}`);

    ffmpeg(inputVideo)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-vf', subtitlesFilter,
        '-preset', 'veryfast',
        '-crf', '23',
        '-movflags', '+faststart'
      ])
      .on('start', (commandLine) => {
        console.log('🚀 FFmpeg command:', commandLine);
      })
      .on('stderr', (stderrLine) => {
        // Logs detallados de ffmpeg para debug
        console.log('[ffmpeg stderr]:', stderrLine);
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
        resolve(outVideo);
      })
      .save(outVideo);
  });
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