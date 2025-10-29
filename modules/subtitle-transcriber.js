// modules/subtitle-transcriber.js
const fs = require('fs');
const OpenAI = require('openai');

// Nota: usa OPENAI_API_KEY desde .env
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Transcribe un MP4 corto (18–30s) en inglés y devuelve
 * un arreglo de palabras con tiempos aproximados:
 *   [{ text, start, end }]
 *
 * Estrategia:
 * - Pedimos formato verbose (segmentos con start/end y texto).
 * - Si el API no da word-level, distribuimos el tiempo del segmento
 *   proporcionalmente entre las palabras (funciona bien en clips cortos).
 */
async function transcribeToWords(inputPath) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  console.log(`🎤 Starting Whisper transcription for: ${inputPath}`);

  const file = fs.createReadStream(inputPath);

  const resp = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    temperature: 0
  });

  console.log(`📝 Whisper response received. Segments: ${(resp.segments || []).length}`);

  // resp.segments: [{ start, end, text }, ...]
  const words = [];
  const segments = resp.segments || [];

  for (const seg of segments) {
    const segText = (seg.text || '').trim();
    if (!segText) continue;

    console.log(`🔍 Processing segment: "${segText}" (${seg.start}s - ${seg.end}s)`);

    const tokens = segText.split(/\s+/);
    const segDuration = Math.max(0.01, (seg.end ?? 0) - (seg.start ?? 0));
    const per = segDuration / Math.max(1, tokens.length);

    let cursor = seg.start ?? 0;
    for (const t of tokens) {
      const clean = t.replace(/[^\p{L}\p{N}''.-]/gu, '');
      if (clean) {  // Only add non-empty words
        const start = cursor;
        const end = cursor + per;
        words.push({ text: clean, start, end });
        cursor = end;
      }
    }
  }

  // Fallback: si no hay segmentos, devolvemos todo como 1 palabra fake
  if (words.length === 0 && resp.text) {
    console.log(`⚠️ No segments found, using full text as fallback: "${resp.text}"`);
    words.push({ text: resp.text.trim(), start: 0, end: 2.0 });
  }

  console.log(`✅ Transcription completed. Words extracted: ${words.length}`);
  return words;
}

module.exports = { transcribeToWords };