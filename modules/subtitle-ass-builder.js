// modules/subtitle-ass-builder.js

/**
 * Construye un archivo .ASS con estilo karaoke a partir de
 * words: [{ text, start, end }]
 * - Segmenta en bloques por pausas/duración/longitud
 * - Aplica \k por palabra
 * - Warmup inicial con espacio duro (\h) para evitar "1ª palabra perdida"
 * - Evita SOLAPES entre líneas con un gap mínimo
 *
 * timing:
 *   - minWordSec : mínimo por palabra
 *   - leadSec    : colchón antes del bloque
 *   - tailSec    : colchón después del bloque
 *   - warmupCs   : centésimas de warmup (\k inicial)
 *   - minInterGapSec : separación mínima entre fin de una línea y comienzo de la siguiente
 *
 * estilo:
 *   - primary/secondary/outline/shadow/marginV/align/font/fontSize/resX/resY
 */

function buildASS(words, opts = {}) {
  const {
    resX = 1920,
    resY = 1080,
    font = 'Montserrat',
    fontSize = 80,               // 🔍 AUMENTADO de 60 → 80 (+33% más grande)
    primary = '&H00FFFFFF&',     // blanco
    secondary = '&H00FFCC66&',   // azul claro (#66CCFF -> &H00FFCC66&)
    outline = 4,                 // 🔍 AUMENTADO de 3 → 4 (mejor legibilidad con texto grande)
    shadow = 0,
    align = 2,                   // bottom-center
    marginV = 60,
    segment = {},
    timing = {}
  } = opts;

  const {
    gapThresholdSec = 0.5,
    maxLineDurSec   = 2.8,
    maxChars        = 42
  } = segment;

  const {
    minWordSec     = 0.10,
    leadSec        = 0.20,
    tailSec        = 0.24,
    warmupCs       = 16,
    minInterGapSec = 0.06
  } = timing;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Kara,${font},${fontSize},${primary},${secondary},&H00111111,&H7F000000,0,0,0,0,100,100,0,0,1,${outline},${shadow},${align},80,80,${marginV},0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  if (!Array.isArray(words) || words.length === 0) return header;

  const safe = words
    .map(w => ({
      text: String(w.text || '').trim(),
      start: Number.isFinite(w.start) ? w.start : 0,
      end:   Number.isFinite(w.end)   ? w.end   : 0
    }))
    .filter(w => w.text && (w.end > w.start || (w.end === w.start && w.end > 0)));

  if (safe.length === 0) return header;

  // --- Segmentación en líneas ---
  const rawLines = [];
  let current = initLine(safe[0]);

  for (let i = 0; i < safe.length; i++) {
    const w = safe[i];
    if (i === 0) { addWord(current, w); continue; }

    const prev = safe[i - 1];
    const gap = w.start - prev.end;
    const nextDur  = (Math.max(w.end, current.end) - current.start);
    const nextChars = current.textLength + 1 + w.text.length;

    const shouldBreak =
      gap > gapThresholdSec ||
      nextDur > maxLineDurSec ||
      nextChars > maxChars;

    if (shouldBreak) {
      finalizeLine(rawLines, current);
      current = initLine(w);
    } else {
      addWord(current, w);
    }
  }
  finalizeLine(rawLines, current);

  // --- Construcción de Events sin solapes ---
  let events = '';
  const warmupSec = Math.max(0, warmupCs / 100);
  let prevEnd = 0;

  for (const L of rawLines) {
    if (L.words.length === 0) continue;

    // \k por palabra con mínimo
    const kDurations = L.words.map(w => Math.max(minWordSec, Math.max(0, w.end - w.start)));
    const totalK = kDurations.reduce((a, b) => a + b, 0);

    // Ventana base sugerida
    let start = Math.max(0, L.start - leadSec);
    let end   = start + warmupSec + totalK + tailSec;

    // Evitar solape con la línea anterior
    if (start < prevEnd + minInterGapSec) {
      const delta = (prevEnd + minInterGapSec) - start;
      start += delta;
      end   += delta;
    }
    prevEnd = end;

    // Texto ASS: warmup + tokens
    let text = `{\\k${Math.max(1, Math.round(warmupCs))}}\\h`;
    for (let i = 0; i < L.words.length; i++) {
      const token = L.words[i].text;
      const durCs = Math.max(1, Math.round(kDurations[i] * 100));
      text += `{\\k${durCs}}${token}${i < L.words.length - 1 ? ' ' : ''}`;
    }

    events += `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},Kara,,0,0,0,,${text}\n`;
  }

  return header + events;
}

function initLine(firstWord) {
  return {
    words: [],
    start: firstWord.start,
    end: firstWord.end,
    textLength: 0
  };
}

function addWord(line, w) {
  line.words.push(w);
  line.end = Math.max(line.end, w.end);
  line.textLength += (line.words.length > 1 ? 1 : 0) + w.text.length;
}

function finalizeLine(lines, line) {
  if (line && line.words.length) lines.push(line);
}

function toAssTime(t) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = (t % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${s}`;
}

module.exports = { buildASS };