// modules/audio-processor.js
// -------- AUDIO PIPELINE (ElevenLabs -> Hedra Asset) --------
// Goal: keep all your original capabilities and add stable wrappers
// Exports: procesarAudio, generarAudio, crearAudioAsset, subirAudioFile, VOICE_CONFIG

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs").promises;
const path = require("path");

// ====== ENV ======
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const HEDRA_API_KEY = process.env.HEDRA_API_KEY;

console.log("🔊 AUDIO PROCESSOR INITIALIZED");

// ====== VOICES (extended set preserved) ======
const VOICE_CONFIG = {
  female: {
    id: process.env.ELEVENLABS_VOICE_ID, // default female voice
    name: "Female",
  },
  female_old: {
    id: process.env.ELEVENLABS_VOICE_ID_OLD || process.env.ELEVENLABS_VOICE_ID,
    name: "Female-Old",
  },
  male: {
    id: process.env.ELEVENLABS_VOICE_ID_MALE || "pNInz6obpgDQGcFmaJgB", // fallback Adam
    name: "Male",
  },
  male_old: {
    id:
      process.env.ELEVENLABS_VOICE_ID_MALE_OLD ||
      process.env.ELEVENLABS_VOICE_ID_MALE,
    name: "Male-Old",
  },
  // NEW voices
  female_soft: {
    id: process.env.ELEVENLABS_VOICE_ID_FEMALE_SOFT,
    name: "Female-Soft",
  },
  female_news: {
    id: process.env.ELEVENLABS_VOICE_ID_FEMALE_NEWS,
    name: "Female-News",
  },
  male_broadcast: {
    id: process.env.ELEVENLABS_VOICE_ID_MALE_BROADCAST,
    name: "Male-Broadcast",
  },
  male_casual: {
    id: process.env.ELEVENLABS_VOICE_ID_MALE_CASUAL,
    name: "Male-Casual",
  },
  neutral_news: {
    id: process.env.ELEVENLABS_VOICE_ID_NEUTRAL_NEWS,
    name: "Neutral-News",
  },
};

// --- Voice resolver and fallback families ---
function resolveVoiceKey(voiceType) {
  const key = String(voiceType || "").toLowerCase().trim();
  return VOICE_CONFIG[key] ? key : "female"; // default family
}

// Families organized by timbre and use case
const VOICE_FALLBACKS = {
  female: ["female", "female_soft", "female_news", "female_old"],
  female_old: ["female_old", "female", "female_soft"],
  female_soft: ["female_soft", "female", "female_news"],
  female_news: ["female_news", "female", "female_soft"],
  male: ["male", "male_broadcast", "male_casual", "male_old"],
  male_old: ["male_old", "male", "male_broadcast"],
  male_broadcast: ["male_broadcast", "male", "male_casual"],
  male_casual: ["male_casual", "male", "male_broadcast"],
  neutral_news: ["neutral_news", "female_news", "male_broadcast"],

  // default catch-all
  default: ["female", "female_soft", "female_news", "male", "male_broadcast"]
};

// ====== UTILS ======
function ensureEnv() {
  if (!ELEVENLABS_API_KEY) throw new Error("Missing ELEVENLABS_API_KEY");
  if (!HEDRA_API_KEY) throw new Error("Missing HEDRA_API_KEY");
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

function safeSubstring(str, n) {
  return String(str || "").substring(0, n);
}

// Robust cleaning (mantengo tu idea de limpieza “fuerte”)
function limpiarTextoParaAudio(texto) {
  let t = String(texto || "");

  try {
    t = t.normalize("NFKD");
  } catch {}

  // Remove emojis and pictographs
  try {
    t = t.replace(
      /\p{Extended_Pictographic}|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|\u200D/gu,
      ""
    );
  } catch {
    t = t.replace(
      /[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|\u200D/gu,
      ""
    );
  }

  // Smart quotes, dashes, etc.
  t = t.replace(/[\u2018\u2019]/g, "'");
  t = t.replace(/[\u201C\u201D]/g, '"');
  t = t.replace(/[–—]/g, "-");

  // Keep only basic punctuation
  t = t.replace(/[^\w\s.,!?;:'"()\-]/g, "");

  // Collapse whitespace
  t = t.replace(/\s+/g, " ").trim();

  return t;
}

// Alternate sanitizer kept for total compatibility (si algún módulo lo importa).
function sanitizeTextForTTS(text) {
  let out = String(text || "");
  out = out.replace(
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{1FB00}-\u{1FBFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
    ""
  );
  out = out.replace(/[^\w\s.,!?;:'"()\-]/g, "");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

// Optional: expose this if some part of the UI lists voices
function getAvailableVoices() {
  return Object.entries(VOICE_CONFIG)
    .filter(([, v]) => !!v.id)
    .map(([key, v]) => ({ key, name: v.name, id: v.id }));
}

// ====== CORE 1: ElevenLabs TTS ======
async function generarAudio(texto, sessionId, voiceType = "female") {
  ensureEnv();

  try {
    // Family and fallbacks selection (resolver + families)
    const resolvedKey = resolveVoiceKey(voiceType);
    let family = VOICE_FALLBACKS[resolvedKey] || VOICE_FALLBACKS.default;

    let fallbacks = family.map((k) => VOICE_CONFIG[k]).filter((v) => v && v.id);

    if (fallbacks.length === 0) {
      // final safety
      fallbacks = ["female", "male"]
        .map((k) => VOICE_CONFIG[k])
        .filter((v) => v && v.id);
    }

    // Clean + truncate
    let original = String(texto || "");
    console.log(
      `[${sessionId}] Original text: "${safeSubstring(original, 120)}..."`
    );

    let textoLimpio = limpiarTextoParaAudio(original);
    if (textoLimpio.length > 500) {
      textoLimpio = textoLimpio.substring(0, 497) + "...";
      console.log(
        `[${sessionId}] Text truncated to 500 chars for ElevenLabs`
      );
    }
    console.log(
      `[${sessionId}] Clean text: "${safeSubstring(textoLimpio, 120)}..."`
    );

    const palabras = original.split(/\s+/).filter(Boolean).length;

    let response;
    let selectedVoice = fallbacks[0];
    let lastError;

    for (const candidate of fallbacks) {
      try {
        console.log(
          `[${sessionId}] TTS with ${candidate.name} (${candidate.id})`
        );
        response = await axios.post(
          `https://api.elevenlabs.io/v1/text-to-speech/${candidate.id}`,
          {
            text: textoLimpio,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
              use_speaker_boost: true,
            },
          },
          {
            headers: {
              Accept: "audio/mpeg",
              "Content-Type": "application/json",
              "xi-api-key": ELEVENLABS_API_KEY,
            },
            responseType: "arraybuffer",
            timeout: 30000,
          }
        );
        selectedVoice = candidate;
        console.log(`[${sessionId}] TTS OK with ${candidate.name}`);
        break;
      } catch (err) {
        lastError = err;
        console.log(
          `[${sessionId}] ElevenLabs failed ${candidate.name}: ${
            err.response?.status || err.message
          }`
        );
      }
    }

    if (!response) {
      throw new Error(
        `All ElevenLabs voices failed: ${
          lastError?.response?.status || lastError?.message
        }`
      );
    }

    // File output (preserving your naming in generated_audios)
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const nameArchivo = `audio${dd}${mm}${hh}${mi}${ss}.mp3`;
    const audioDir = "generated_audios";
    await ensureDir(audioDir);

    const audioFile = path.join(audioDir, nameArchivo);
    const audioBuffer = Buffer.from(response.data);
    await fs.writeFile(audioFile, audioBuffer);

    console.log(`[${sessionId}] Audio saved: ${audioFile}`);

    // Duration placeholder (mantengo 20 como en tu flujo si dependes de ello)
    const duracion = 20;

    return {
      buffer: audioBuffer,
      archivo: audioFile,
      nameArchivo,
      duracion,
      voz: selectedVoice?.name || "Unknown",
      modelo: "eleven_multilingual_v2",
      palabras,
      voiceType,
    };
  } catch (error) {
    console.error(
      `[${sessionId}] Error generating audio:`,
      error.response?.status || error.message
    );
    throw new Error(`Error generando audio: ${error.message}`);
  }
}

// ====== CORE 2: Hedra Asset (JSON base64) ======
async function crearAudioAsset(audioBuffer, sessionId) {
  ensureEnv();

  try {
    console.log(`🎬 [${sessionId}] Creating Hedra audio asset...`);
    const audioBase64 = audioBuffer.toString("base64");

    const response = await axios.post(
      "https://api.hedra.com/web-app/public/assets",
      {
        name: "journalist-audio",
        type: "audio",
        data: audioBase64,
      },
      {
        headers: {
          "X-Api-Key": HEDRA_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const audioAssetId = response?.data?.id || response?.data?.asset?.id;
    if (!audioAssetId)
      throw new Error("Hedra no devolvió id de asset de audio");

    console.log(`✅ [${sessionId}] Audio asset created: ${audioAssetId}`);

    return {
      id: audioAssetId,
      type: "audio",
      name: "journalist-audio",
    };
  } catch (error) {
    console.error(
      `[${sessionId}] Error creating audio asset:`,
      error.response?.status || error.message
    );
    throw new Error(`Error creando audio asset: ${error.message}`);
  }
}

// ====== CORE 3: Hedra Upload (multipart) ======
async function subirAudioFile(audioBuffer, audioAssetId, sessionId) {
  ensureEnv();

  try {
    console.log(`📤 [${sessionId}] Uploading audio file to Hedra...`);

    const formData = new FormData();
    formData.append("file", audioBuffer, {
      filename: `audio_${sessionId}.mp3`,
      contentType: "audio/mpeg",
    });

    const response = await axios.post(
      `https://api.hedra.com/web-app/public/assets/${audioAssetId}/upload`,
      formData,
      {
        headers: {
          "X-Api-Key": HEDRA_API_KEY,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000,
      }
    );

    console.log(`[${sessionId}] Hedra upload OK`);

    return {
      id: audioAssetId,
      type: "audio",
      uploaded: true,
      asset: response.data,
    };
  } catch (error) {
    console.error(
      `[${sessionId}] Error uploading audio:`,
      error.response?.status || error.message
    );
    throw new Error(`Error subiendo audio file: ${error.message}`);
  }
}

// ====== WRAPPER: full pipeline ======
async function procesarAudio(texto, sessionId, voiceType = "female") {
  ensureEnv();

  try {
    console.log(`[${sessionId}] AUDIO PIPELINE START`);

    const audioData = await generarAudio(texto, sessionId, voiceType);
    const audioAsset = await crearAudioAsset(audioData.buffer, sessionId);
    const audioUpload = await subirAudioFile(
      audioData.buffer,
      audioAsset.id,
      sessionId
    );

    console.log(`✅ [${sessionId}] AUDIO PIPELINE OK (asset ${audioAsset.id})`);

    return {
      // ElevenLabs
      archivo: audioData.archivo,
      nameArchivo: audioData.nameArchivo,
      duracion: audioData.duracion,
      voz: audioData.voz,
      modelo: audioData.modelo,
      palabras: audioData.palabras,
      words: audioData.words,
      voiceType,

      // Hedra
      audioAssetId: audioUpload.id,
      hedraMetadata: audioAsset,
      hedraUpload: audioUpload,

      // buffer
      buffer: audioData.buffer,
      uploaded: audioUpload.uploaded === true,
    };
  } catch (error) {
    console.error(`[${sessionId}] Audio pipeline error: ${error.message}`);
    throw error;
  }
}

// ====== EXPORTS ======
module.exports = {
  // main
  procesarAudio,
  generarAudio,
  crearAudioAsset,
  subirAudioFile,
  getAvailableVoices,
  VOICE_CONFIG,
};
