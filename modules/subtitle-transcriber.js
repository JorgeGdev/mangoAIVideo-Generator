// modules/subtitle-transcriber.js
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const fss = require('fs');
const path = require('path');
const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function extractWav(inputVideo, outWav) {
  // Ensure parent dir exists
  await fs.mkdir(path.dirname(outWav), { recursive: true });
  return new Promise((resolve, reject) => {
    ffmpeg(inputVideo)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .format('wav')
      .output(outWav)
      .on('end', () => resolve(outWav))
      .on('error', reject)
      .run();
  });
}

/**
 * Convert OpenAI word-level response to a list of { text, start, end }
 */
function normalizeOpenAIWords(data) {
  // OpenAI word timestamps typically live in segments[].words[] when requested.
  const words = [];
  const segments = (data?.segments || []);
  for (const seg of segments) {
    for (const w of (seg.words || [])) {
      // Some SDKs return {word, start, end} others {text, start, end}
      const txt = w.word || w.text || '';
      if (!txt.trim()) continue;
      words.push({
        text: txt,
        start: typeof w.start === 'number' ? w.start : seg.start,
        end: typeof w.end === 'number' ? w.end : seg.end
      });
    }
  }
  return words;
}

/**
 * Fallback: even-spread words if API gave plain text only
 */
function evenSpreadWords(plainText, totalSec) {
  const tokens = plainText.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const avg = Math.max(0.12, totalSec / tokens.length); // ~120ms min per word
  const out = [];
  let t = 0;
  for (const tok of tokens) {
    const start = t;
    const end = t + avg;
    out.push({ text: tok, start, end });
    t = end;
  }
  return out;
}

async function probeDurationSec(filePath) {
  // Quick probe via fluent-ffmpeg
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return resolve(0);
      resolve((data.format?.duration || 0));
    });
  });
}

async function transcribeToWords(inputVideo) {
  // 1) Extract WAV
  const tmpDir = process.env.NODE_ENV === 'production' ? '/tmp/subtitles' : 'tmp_subtitles';
  const wavPath = path.join(tmpDir, `${path.basename(inputVideo, path.extname(inputVideo))}.wav`);
  await extractWav(inputVideo, wavPath);

  // 2) Call OpenAI (or your provider) asking for word timestamps
  if (!openai) {
    throw new Error('OpenAI not configured (OPENAI_API_KEY missing)');
  }

  console.log(`🎤 Starting Whisper transcription with word timestamps for: ${inputVideo}`);

  // IMPORTANT: request word timestamps explicitly
  // For OpenAI Whisper API, request verbose JSON and word-level granularity.
  const resp = await openai.audio.transcriptions.create({
    file: fss.createReadStream(wavPath),
    model: 'whisper-1',                  // or 'gpt-4o-transcribe' if enabled in your account
    response_format: 'verbose_json',     // includes segments
    temperature: 0.0,
    // Some SDKs use "timestamp_granularities" or "enable_word_timestamps"
    // We'll be defensive and handle both:
    // @ts-ignore
    timestamp_granularities: ['word'],
    // @ts-ignore
    enable_word_timestamps: true
  });

  console.log(`📝 Whisper response received. Segments: ${(resp.segments || []).length}`);

  // 3) Normalize words
  let words = normalizeOpenAIWords(resp);

  // 4) Fallback if no words came back
  if (!words || words.length === 0) {
    console.log(`⚠️ No word-level timestamps received, using fallback distribution`);
    const dur = await probeDurationSec(wavPath);
    const plain = resp?.text || '';
    words = evenSpreadWords(plain, dur || 10);
  }

  console.log(`✅ Transcription completed. Words extracted: ${words.length}`);
  return words;
}

module.exports = { transcribeToWords };