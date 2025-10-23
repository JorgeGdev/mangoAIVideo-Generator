// modules/video-creator.js
// -------- VIDEO PIPELINE (Hedra) --------
// Railway compatible version with temporary storage
// Exports: procesarVideoCompleto, sincronizarAssets, crearVideo, verificarStatusVideo, descargarVideo

const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

// RAILWAY STORAGE INTEGRATION
const { STORAGE_CONFIG, isRailway } = require('./railway-storage');

// ====== ENV ======
const HEDRA_API_KEY = process.env.HEDRA_API_KEY;

// ====== HEDRA DEFAULTS (easier tuning) ======
const HEDRA_MODEL_ID =
  process.env.HEDRA_MODEL_ID || "d1dd37a3-e39a-4854-a298-6510289f9cf2";
const HEDRA_RESOLUTION = process.env.HEDRA_RESOLUTION || "720p";
const HEDRA_ASPECT_RATIO = process.env.HEDRA_ASPECT_RATIO || "9:16";
const HEDRA_DURATION_MS = Number(process.env.HEDRA_DURATION_MS || 20000);

// Poll tuning
const FIRST_WAIT_MS = Number(process.env.HEDRA_FIRST_WAIT_MS || 120000); // first wait after create (2 minutes)
const POLL_INTERVAL_MS = Number(process.env.HEDRA_POLL_INTERVAL_MS || 30000);
const POLL_MAX_TRIES = Number(process.env.HEDRA_POLL_MAX_TRIES || 5); // 5 intentos

console.log("🎬 VIDEO CREATOR INITIALIZED");

// ====== LOG + optional Telegram ======
async function logAndNotify(sessionId, message, sendToTelegram = true) {
  const fullMessage = `[${sessionId}] ${message}`;
  console.log(fullMessage);

  if (!sendToTelegram) return;

  try {
    // Lazy import to avoid cycles when not needed
    const { enviarMensaje, CHAT_ID } = require("./telegram-handler");
    await enviarMensaje(CHAT_ID, fullMessage);
  } catch (error) {
    console.log("⚠️ Could not send to Telegram:", error.message);
  }
}

// ====== SYNC ASSETS ======
async function sincronizarAssets(audioData, imageData, sessionId) {
  try {
    await logAndNotify(sessionId, "🔄 Synchronizing assets for Hedra");
    await logAndNotify(
      sessionId,
      `📸 Image Asset ID: ${imageData?.imageAssetId || "N/A"}`
    );
    await logAndNotify(
      sessionId,
      `🔊 Audio Asset ID: ${audioData?.audioAssetId || "N/A"}`
    );

    if (!audioData?.audioAssetId) throw new Error("Missing audioAssetId");
    if (!imageData?.imageAssetId) throw new Error("Missing imageAssetId");

    await logAndNotify(sessionId, "⏳ Waiting Hedra to settle assets (30s)...");
    await new Promise((r) => setTimeout(r, 30000));

    await logAndNotify(sessionId, "✅ Assets synchronized");

    return {
      imageAssetId: imageData.imageAssetId,
      audioAssetId: audioData.audioAssetId,
      duracionEstimada: audioData.duracion,
      sincronizado: true,
    };
  } catch (error) {
    await logAndNotify(sessionId, `❌ Asset sync error: ${error.message}`);
    throw error;
  }
}

// ====== CREATE VIDEO ======
async function crearVideo(assetsSync, sessionId) {
  try {
    await logAndNotify(sessionId, "🎬 Creating video with Hedra...");

    const videoRequest = {
      type: "video",
      ai_model_id: HEDRA_MODEL_ID,
      start_keyframe_id: assetsSync.imageAssetId,
      audio_id: assetsSync.audioAssetId,
      generated_video_inputs: {
        text_prompt:
          "Professional news presenter speaking naturally. Preserve exact person identity and appearance. Natural expressions, eye contact, lip-sync. 9:16 vertical format, 20s max.",
        resolution: HEDRA_RESOLUTION,
        aspect_ratio: HEDRA_ASPECT_RATIO,
        duration_ms: HEDRA_DURATION_MS,
      },
    };

    await logAndNotify(sessionId, `� Request: ${videoRequest.type} | Model: ${videoRequest.ai_model_id.substring(0, 8)}...`, false);

    const response = await axios.post(
      "https://api.hedra.com/web-app/public/generations",
      videoRequest,
      {
        headers: {
          "X-Api-Key": HEDRA_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    await logAndNotify(sessionId, `� Hedra response received - Generation initiated`, false);

    // Extract both IDs - we need asset_id for status checks
    const generationId = response?.data?.id;
    const assetId = response?.data?.asset_id;

    if (!assetId && !generationId) {
      await logAndNotify(sessionId, `❌ No generation/asset ID found in response: ${JSON.stringify(response.data)}`, false);
      throw new Error("Hedra did not return a generation or asset id");
    }

    // Use asset_id for status checks (this is what Hedra expects)
    const videoId = assetId || generationId;

    await logAndNotify(
      sessionId,
      `🎬 Video initialized in Hedra: ${videoId} (generation: ${generationId}, asset: ${assetId})`
    );

    return {
      generationId: videoId, // This will be used for status checks
      status: "processing",
    };
  } catch (error) {
    await logAndNotify(
      sessionId,
      `❌ Error creating video: ${error.response?.status || error.message}`
    );
    throw new Error(`Error creating video: ${error.message}`);
  }
}

// ====== CHECK STATUS ======
async function verificarStatusVideo(generationId, sessionId) {
  try {
    await logAndNotify(
      sessionId,
      `🔍 Checking video status: ${generationId}`,
      false
    );

    // Hedra assets endpoint supports query by ids
    const response = await axios.get(
      `https://api.hedra.com/web-app/public/assets?type=video&ids=${encodeURIComponent(
        generationId
      )}`,
      {
        headers: { "X-Api-Key": HEDRA_API_KEY },
        timeout: 30000,
      }
    );

    const videoData = Array.isArray(response.data)
      ? response.data[0]
      : response.data;
    const status = videoData?.status || "unknown";

    // Robust URL extraction
    const url = videoData?.asset?.url || videoData?.url || null;

    const errorText = videoData?.error || null;

    await logAndNotify(sessionId, `📊 Video status: ${status}`, false);
    
    // Only log full response if we have meaningful data
    if (videoData && Object.keys(videoData).length > 0) {
      await logAndNotify(sessionId, `🔍 Video data received (${Object.keys(videoData).length} fields)`, false);
    } else {
      await logAndNotify(sessionId, `🔍 Video still processing by Hedra...`, false);
    }

    // More flexible ready detection - if we have a URL, video is ready
    const isReady = !!url || (videoData?.asset?.url) || (videoData?.asset?.download_url);
    const finalUrl = url || videoData?.asset?.url || videoData?.asset?.download_url;
    
    return {
      status,
      ready: isReady,
      url: finalUrl,
      error: errorText,
    };
  } catch (error) {
    await logAndNotify(sessionId, `❌ Error checking status: ${error.message}`);
    throw error;
  }
}

// ====== DOWNLOAD FINAL VIDEO ======
async function descargarVideo(videoUrl, sessionId) {
  try {
    await logAndNotify(sessionId, "📥 Downloading final video...");

    const response = await axios.get(videoUrl, {
      responseType: "arraybuffer",
      timeout: 120000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.data || response.data.byteLength === 0) {
      throw new Error("Downloaded video is empty");
    }

    await logAndNotify(
      sessionId,
      `📊 Video bytes: ${response.data.byteLength}`
    );

    const now = new Date();
    const fecha = now.toISOString().slice(0, 10).replace(/-/g, "");
    const hora = now.toTimeString().slice(0, 8).replace(/:/g, "");
    const nameVideo = `video_${fecha}_${hora}.mp4`;

    // RAILWAY COMPATIBLE: Use storage config
    const videoDir = STORAGE_CONFIG.videos;
    await fs.mkdir(videoDir, { recursive: true });
    const videoPath = path.join(videoDir, nameVideo);

    await fs.writeFile(videoPath, Buffer.from(response.data));

    const stats = await fs.stat(videoPath);
    const videoSize = (stats.size / (1024 * 1024)).toFixed(2);

    await logAndNotify(
      sessionId,
      `✅ Video saved: ${videoPath} (${videoSize} MB)`
    );
    await logAndNotify(sessionId, `🔍 File verified: ${stats.size} bytes`);
    
    if (isRailway) {
      await logAndNotify(sessionId, "🚂 Railway: Video stored in temporary location");
      await logAndNotify(sessionId, "💾 Auto-download will be triggered after completion");
    }

    // 🎵 NUEVO: Generar automáticamente subtítulos
    let subtitledVideoInfo = null;
    try {
      await logAndNotify(sessionId, "🎵 Starting automatic subtitle generation...");
      
      // Importar el procesador de subtítulos
      const { processVideoSubtitles } = require('./subtitle-processor');
      
      // Procesar subtítulos de manera no bloqueante
      subtitledVideoInfo = await processVideoSubtitles(videoPath, sessionId);
      
      await logAndNotify(
        sessionId,
        `✅ Subtitled video created: ${subtitledVideoInfo.subtitledVideoName} (${subtitledVideoInfo.size})`
      );
      
    } catch (subtitleError) {
      await logAndNotify(
        sessionId,
        `⚠️ Warning: Could not generate subtitles: ${subtitleError.message}`
      );
      // No fallar todo el proceso por un error de subtítulos
      console.error(`[${sessionId}] Subtitle error (non-fatal):`, subtitleError);
    }

    // 🎵 NUEVO: Generar automáticamente subtítulos
    let subtitledVideoInfo = null;
    try {
      await logAndNotify(sessionId, "🎵 Starting automatic subtitle generation...");
      
      // Importar el procesador de subtítulos
      const { processVideoSubtitles } = require('./subtitle-processor');
      
      // Procesar subtítulos de manera no bloqueante
      subtitledVideoInfo = await processVideoSubtitles(videoPath, sessionId);
      
      await logAndNotify(
        sessionId,
        `✅ Subtitled video created: ${subtitledVideoInfo.subtitledVideoName} (${subtitledVideoInfo.size})`
      );
      
    } catch (subtitleError) {
      await logAndNotify(
        sessionId,
        `⚠️ Warning: Could not generate subtitles: ${subtitleError.message}`
      );
      // No fallar todo el proceso por un error de subtítulos
      console.error(`[${sessionId}] Subtitle error (non-fatal):`, subtitleError);
    }

    return {
      archivo: videoPath,
      nameArchivo: nameVideo,
      tamaño: `${videoSize} MB`,
      buffer: Buffer.from(response.data),
      url: videoUrl,
      subtitles: subtitledVideoInfo // Información de subtítulos si se generaron
    };
  } catch (error) {
    await logAndNotify(
      sessionId,
      `❌ Error downloading video: ${error.message}`
    );
    throw error;
  }
}

// ====== MAIN ORCHESTRATION ======
async function procesarVideoCompleto(audioData, imageData, sessionId) {
  try {
    await logAndNotify(sessionId, "🎬 STARTING FULL VIDEO CREATION");

    // Step 1: sync assets
    const assetsSync = await sincronizarAssets(audioData, imageData, sessionId);

    // Step 2: create generation
    const videoGeneration = await crearVideo(assetsSync, sessionId);

    // Step 3: first wait
    await logAndNotify(
      sessionId,
      `⏳ Waiting video generation (${Math.round(FIRST_WAIT_MS / 1000)}s)...`
    );
    await new Promise((r) => setTimeout(r, FIRST_WAIT_MS));

    // Step 4: poll for status (8 intentos = ~4 minutes)
    let intentos = 0;
    let videoListo = false;
    let videoUrl = null;

    while (!videoListo && intentos < POLL_MAX_TRIES) {
      const estado = await verificarStatusVideo(
        videoGeneration.generationId,
        sessionId
      );

      if (estado.ready && estado.url) {
        videoListo = true;
        videoUrl = estado.url;
        await logAndNotify(sessionId, `🎉 ¡Video listo! Generado correctamente por Hedra`);
      } else if (estado.error) {
        throw new Error(`Error in Hedra: ${estado.error}`);
      } else {
        await logAndNotify(
          sessionId,
          `⏳ Video aún processing... intento ${intentos + 1}/${POLL_MAX_TRIES}`
        );
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        intentos++;
      }
    }

    // Step 5: *** EMPUJÓN CRÍTICO *** (SI NO ESTÁ LISTO, INTENTAR OBTENERLO DIRECTAMENTE)
    if (!videoListo) {
      await logAndNotify(
        sessionId,
        "⚠️ Timeout en verificaciones, intentando descarga directa..."
      );

      // EMPUJÓN: Intentar obtener el video una vez más
      const estadoFinal = await verificarStatusVideo(
        videoGeneration.generationId,
        sessionId
      );
      if (estadoFinal.url) {
        videoUrl = estadoFinal.url;
        videoListo = true; // *** CRÍTICO: Marcar como listo ***
        await logAndNotify(sessionId, "✅ Video completado por Hedra - Iniciando descarga");
      } else {
        // ÚLTIMO RECURSO: Guardar ID para rescate manual
        await logAndNotify(
          sessionId,
          `❌ Video no completed tras ${intentos} intentos (4 minutes).`
        );
        await logAndNotify(
          sessionId,
          `🆔 ID para rescate manual: ${videoGeneration.generationId}`
        );
        await logAndNotify(
          sessionId,
          `💡 Hedra puede estar lento - intenta más tarde`
        );
        throw new Error(
          `Video no completed tras ${intentos} intentos. ID: ${videoGeneration.generationId}`
        );
      }
    }

    let finalUrl = videoUrl;

    // Step 6: download
    const videoFinal = await descargarVideo(finalUrl, sessionId);

    await logAndNotify(sessionId, "🎉 VIDEO COMPLETED SUCCESSFULLY");

    return {
      archivo: videoFinal.archivo,
      nameArchivo: videoFinal.nameArchivo,
      tamaño: videoFinal.tamaño,
      generationId: videoGeneration.generationId,
      success: true,
    };
  } catch (error) {
    await logAndNotify(sessionId, `❌ Error in full process: ${error.message}`);
    throw error;
  }
}

// ====== EXPORTS ======
module.exports = {
  procesarVideoCompleto,
  sincronizarAssets,
  crearVideo,
  verificarStatusVideo,
  descargarVideo,
};
