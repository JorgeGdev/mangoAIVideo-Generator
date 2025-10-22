require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser"); // NUEVO
const multer = require("multer"); // NUEVO para uploads
const chokidar = require("chokidar"); // NUEVO para watch de archivos
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// IMPORTAR SISTEMA DE AUTENTICACIÓN
const {
  requireAuth,
  requireAdmin,
  validarCredenciales,
  crearUser,
  listarUsers,
} = require("./modules/auth-manager"); // NUEVO

const app = express();
const PORT = 3000;

// Configurar multer para uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único: timestamp + extension original
    const extension = path.extname(file.originalname);
    const filename = `photo_${Date.now()}${extension}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: function (req, file, cb) {
    // Solo acepta imágenes
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten archivos de imagen"));
    }
  },
});

// Middleware
app.use(express.json());
app.use(cookieParser()); // NUEVO

// Static serve for transformed images (view influencer photos)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(
  "/images/modified",
  express.static(path.join(process.cwd(), "images", "modified"))
);
app.use("/frontend", express.static(path.join(process.cwd(), "frontend")));
// Serve subtitled videos
app.use("/final_videos_subtitled", express.static(path.join(process.cwd(), "final_videos_subtitled")));
app.use(express.static("."));

// Voices endpoint (fills the <select id="voiceSelect"> in the dashboard)
app.get('/api/voices', (req, res) => {
  try {
    const { getAvailableVoices } = require('./audio-processor'); // <- ruta correcta en tu repo
    const voices = getAvailableVoices(); // [{ key, name, id }]
    return res.json({ success: true, voices });
  } catch (e) {
    console.error('voices endpoint error:', e.message);
    return res.status(500).json({ success: false, message: 'Voices not available' });
  }
});


// Variables globales para procesos
let scraperProcess = null;
let botProcess = null;
let clients = []; // Para Server-Sent Events
let videoSessions = new Map(); // Para sesiones de video pendientes

console.log("🚀 EXPRESS SERVER STARTING...");

// ================================
// RUTAS DE AUTENTICACIÓN - NUEVAS
// ================================

// Ruta de login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({
        success: false,
        message: "User y password requeridos",
      });
    }

    const result = await validarCredenciales(username, password);

    if (result.success) {
      // Establecer cookie con el token
      res.cookie("auth_token", result.token, {
        httpOnly: true,
        secure: false, // En producción cambiar a true
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      broadcastLog(`✅ Login successful: ${username} (${result.user.role})`);

      res.json({
        success: true,
        message: "Login successful",
        user: result.user,
      });
    } else {
      broadcastLog(`❌ Login failed: ${username} - ${result.message}`);
      res.json(result);
    }
  } catch (error) {
    broadcastLog(`❌ Error in login: ${error.message}`);
    res.json({ success: false, message: "Error interno del servidor" });
  }
});

// Ruta de logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({ success: true, message: "Logout success" });
});

// Ruta para listar users (solo admin)
app.get("/api/auth/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await listarUsers();
    res.json(result);
  } catch (error) {
    res.json({ success: false, message: "Error cargando users" });
  }
});

// Ruta para crear user (solo admin)
// Ruta para crear user (solo admin) - VERSIÓN CON EMAIL
app.post(
  "/api/auth/create-user",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { username, password, name, email, role } = req.body; // AGREGAMOS EMAIL

      if (!username || !password || !name || !email) {
        // AGREGAMOS EMAIL A LA VALIDACIÓN
        return res.json({
          success: false,
          message: "Todos los campos son requeridos",
        });
      }

      const result = await crearUser(username, password, name, email, role); // AGREGAMOS EMAIL

      if (result.success) {
        broadcastLog(
          `✅ User created: ${username} (${email}) por ${req.user.username}`
        );
      }

      res.json(result);
    } catch (error) {
      res.json({ success: false, message: "Error creating user" });
    }
  }
);

// Verificar si el user está autenticado
app.get("/api/auth/check", requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// Endpoint para logs en tiempo real (Server-Sent Events)
app.get("/api/logs", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  clients.push(res);
  console.log(`📱 Client connected. Total: ${clients.length}`);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
    console.log(`📱 Client disconnected. Total: ${clients.length}`);
  });
});

// Function para enviar logs a todos los clientes
function broadcastLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}`;

  console.log(logMessage);

  clients.forEach((client) => {
    try {
      client.write(`data: ${JSON.stringify({ log: logMessage })}\n\n`);
    } catch (error) {
      // Client disconnected
    }
  });
}

// Broadcast custom events (for modals, etc)
function broadcastEvent(eventData) {
  console.log("📡 Broadcasting event:", eventData.type);

  clients.forEach((client) => {
    try {
      client.write(`data: ${JSON.stringify(eventData)}\n\n`);
    } catch (error) {
      // Client disconnected
    }
  });
}

// Endpoint para ejecutar scraper
app.post("/api/scraper/start", requireAuth, (req, res) => {
  if (scraperProcess) {
    return res.json({
      success: false,
      message: "Scraper ya está ejecutándose",
    });
  }

  broadcastLog("🚀 Starting scraper de noticias...");

  scraperProcess = spawn("node", ["scraper-4-paises-final.js"], {
    cwd: __dirname,
  });

  scraperProcess.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => broadcastLog(`${line}`));
  });

  scraperProcess.stderr.on("data", (data) => {
    broadcastLog(`❌ Error: ${data.toString()}`);
  });

  scraperProcess.on("close", (code) => {
    if (code === 0) {
      broadcastLog("✅ Scraper completed successfully");
    } else {
      broadcastLog(`❌ Scraper terminó con código: ${code}`);
    }
    scraperProcess = null;
  });

  res.json({ success: true, message: "Scraper initialized" });
});

// Endpoint para iniciar bot
app.post("/api/bot/start", requireAuth, (req, res) => {
  if (botProcess) {
    return res.json({ success: false, message: "Bot ya está ejecutándose" });
  }

  broadcastLog("🤖 Starting bot de Telegram...");

  botProcess = spawn("node", ["main.js"], {
    cwd: __dirname,
  });

  botProcess.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => broadcastLog(`🤖 ${line}`));
  });

  botProcess.stderr.on("data", (data) => {
    broadcastLog(`❌ Bot Error: ${data.toString()}`);
  });

  botProcess.on("close", (code) => {
    broadcastLog(`🤖 Bot terminado con código: ${code}`);
    botProcess = null;
  });

  res.json({ success: true, message: "Bot initialized" });
});

// Endpoint para detener bot
app.post("/api/bot/stop", requireAuth, (req, res) => {
  if (botProcess) {
    botProcess.kill("SIGTERM");
    broadcastLog("⏹️ Bot de Telegram detenido");
    botProcess = null;
    res.json({ success: true, message: "Bot stopped" });
  } else {
    res.json({ success: false, message: "Bot no está ejecutándose" });
  }
});

// Endpoint para generar video manual (CON APROBACIÓN)
app.post("/api/video/generate", requireAuth, async (req, res) => {
  const { image, query } = req.body;

  if (!image || !query) {
    return res.json({
      success: false,
      message: "Image y query son requeridas",
    });
  }

  const sessionId = `manual_${Date.now()}`;
  broadcastLog(`🎬 Generación manual: ${image}@${query}`);

  try {
    // Importar módulo de script
    const { generarScript } = require("./modules/script-generator");

    // PASO 1: Generar script SOLAMENTE
    broadcastLog("🤖 Consulting AI + RAG...");
    const scriptData = await generarScript(query, sessionId);

    if (!scriptData.encontrado) {
      broadcastLog("❌ No se encontraron data en RAG para esta query");
      return res.json({
        success: false,
        message: "No se encontraron data para esta query",
      });
    }

    // Guardar sesión pendiente
    videoSessions.set(sessionId, {
      image,
      query,
      script: scriptData.script,
      palabras: scriptData.palabras,
      timestamp: Date.now(),
    });

    // Enviar script para aprobación
    broadcastLog(`📝 SCRIPT GENERADO [${sessionId}]:`);
    broadcastLog(`📊 PALABRAS: ${scriptData.palabras}`);
    broadcastLog(
      `⏱️ DURACIÓN ESTIMADA: ${Math.floor(scriptData.palabras / 4)} seconds`
    );
    broadcastLog(`🤖 GENERADO CON: OpenAI + RAG`);
    broadcastLog(`📚 FUENTES: ${scriptData.documents} documents`);
    broadcastLog("");
    broadcastLog("❓ Revisa el script en la modal de aprobación");

    // Broadcast script approval event
    broadcastEvent({
      type: "script_approval",
      sessionId: sessionId,
      script: scriptData.script,
      query: query,
      palabras: scriptData.palabras,
      duracion: Math.floor(scriptData.palabras / 4),
      documents: scriptData.documents,
    });

    res.json({
      success: true,
      sessionId: sessionId,
      script: scriptData.script,
      palabras: scriptData.palabras,
      needsApproval: true,
      message: "Script generated - Requiere aprobación",
    });
  } catch (error) {
    broadcastLog(`❌ Error generando script: ${error.message}`);
    res.json({ success: false, message: error.message });
  }
});

// ============================================================================
// NUEVA RUTA: GENERACIÓN CON FOTO PERSONALIZADA + QUERY NATURAL
// ============================================================================
app.post(
  "/api/generate-custom-video",
  requireAuth,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { query, voiceType } = req.body;
      const uploadedFile = req.file;

      if (!uploadedFile) {
        return res.json({ success: false, message: "No photo uploaded" });
      }

      if (!query || !query.trim()) {
        return res.json({ success: false, message: "Query is required" });
      }

      // Validate voiceType using all configured voices (not just those with env vars)
      const { VOICE_CONFIG } = require("./modules/audio-processor");
      
      const availableVoices = Object.keys(VOICE_CONFIG);

      if (!voiceType || !availableVoices.includes(voiceType)) {
        return res.json({
          success: false,
          message: `voiceType is required and must be one of: ${availableVoices.join(", ")}`,
        });
      }

      const sessionId = `custom_${Date.now()}`;
      const photoPath = uploadedFile.path;

      broadcastLog(`📸 CUSTOM VIDEO GENERATION [${sessionId}]`);
      broadcastLog(
        `📁 Photo uploaded: ${uploadedFile.originalname} (${(
          uploadedFile.size / 1024
        ).toFixed(1)}KB)`
      );
      broadcastLog(`💾 Saved as: ${uploadedFile.filename}`);
      broadcastLog(`🔍 Query: "${query}"`);

      // Importar módulo de script
      const { generarScript } = require("./modules/script-generator");

      // PASO 1: Procesar query natural y generar script
      broadcastLog("🧠 Processing natural language query...");
      broadcastLog("🤖 Consulting AI + RAG database...");

      // Procesar query natural - expandir términos de búsqueda
      let processedQuery = query.toLowerCase();

      // Expandir consultas comunes
      if (processedQuery.includes("trump")) {
        processedQuery += " Donald Trump president politics election";
      }
      if (
        processedQuery.includes("france") ||
        processedQuery.includes("french")
      ) {
        processedQuery += " France French government macron";
      }
      if (processedQuery.includes("gaza")) {
        processedQuery += " Gaza Palestine Israel conflict war";
      }

      broadcastLog(`🔄 Expanded query: "${processedQuery}"`);

      const scriptData = await generarScript(processedQuery, sessionId);

      if (!scriptData.encontrado) {
        // Limpiar archivo subido
        fs.unlinkSync(photoPath);
        broadcastLog("❌ No relevant news found in RAG database");
        return res.json({
          success: false,
          message:
            "No relevant news found for your query. Try different keywords.",
        });
      }

      // Guardar sesión pendiente CON FOTO PERSONALIZADA Y VOZ
      videoSessions.set(sessionId, {
        image: photoPath, // Ruta a la foto subida
        customPhoto: true, // Marca que es foto personalizada
        originalName: uploadedFile.originalname,
        query: query,
        processedQuery: processedQuery,
        voiceType: voiceType, // Obligatorio y validado
        script: scriptData.script,
        palabras: scriptData.palabras,
        timestamp: Date.now(),
      });

      // Enviar script para aprobación
      broadcastLog(`📝 SCRIPT GENERATED [${sessionId}]:`);
      broadcastLog(`📊 Words: ${scriptData.palabras}`);
      broadcastLog(
        `⏱️ Estimated duration: ${Math.floor(scriptData.palabras / 4)} seconds`
      );
      broadcastLog(`🤖 Generated with: OpenAI + RAG`);
      broadcastLog(`📚 Sources: ${scriptData.documents} documents`);
      broadcastLog(`📸 Using custom photo: ${uploadedFile.originalname}`);
      broadcastLog("");
      broadcastLog("❓ Revisa el script en la modal de aprobación");

      // Broadcast script approval event
      broadcastEvent({
        type: "script_approval",
        sessionId: sessionId,
        script: scriptData.script,
        query: query,
        palabras: scriptData.palabras,
        duracion: Math.floor(scriptData.palabras / 4),
        documents: scriptData.documents,
        photoName: uploadedFile.originalname,
      });

      res.json({
        success: true,
        sessionId: sessionId,
        script: scriptData.script,
        palabras: scriptData.palabras,
        photoName: uploadedFile.originalname,
        needsApproval: true,
        message:
          "Script generated with custom photo - Will be transformed to influencer style",
        imageTransformation: {
          willTransform: true,
          note: "Your photo will be transformed into a professional influencer/podcast host when approved",
        },
      });
    } catch (error) {
      // Limpiar archivo si hay error
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Error cleaning up file:", cleanupError);
        }
      }

      broadcastLog(`❌ Error in custom video generation: ${error.message}`);
      res.json({ success: false, message: error.message });
    }
  }
);

// Endpoint para aprobar script (ULTRA ROBUSTO)
app.post("/api/video/approve/:sessionId", requireAuth, async (req, res) => {
  const { sessionId } = req.params;
  const session = videoSessions.get(sessionId);

  if (!session) {
    return res.json({
      success: false,
      message: "Session no encontrada o expirada",
    });
  }

  // Verificar que no haya pasado mucho tiempo (30 minutes max)
  const now = Date.now();
  if (now - session.timestamp > 30 * 60 * 1000) {
    videoSessions.delete(sessionId);
    return res.json({ success: false, message: "Session expirada (30 min)" });
  }

  // Responder inmediatamente para que el frontend no se cuelgue
  res.json({
    success: true,
    message: "Video initialized - Proceso puede tardar 8-10 minutes",
  });

  broadcastLog("✅ Script approved - Continuando con el proceso...");
  broadcastLog(`📋 Debug: Session data:`, JSON.stringify(session, null, 2));
  broadcastLog("⚠️  PROCESO LARGO - Esto tomará varios minutes");
  broadcastLog("📋 Puedes seguir el progreso en estos logs");

  try {
    // Importar módulos del sistema
    const { procesarAudio } = require("./modules/audio-processor");
    const { procesarImage } = require("./modules/image-processor");
    const { procesarVideoCompleto } = require("./modules/video-creator");

    // PASO 2: Procesar audio e image en paralelo
    broadcastLog("🔄 Starting procesos paralelos...");
    broadcastLog("⏳ Audio: ~2 minutes (ElevenLabs + Hedra)");
    broadcastLog("⏳ Image: ~30 seconds (Hedra upload)");

    // Delay inicial para evitar rate limits
    await new Promise((resolve) => setTimeout(resolve, 3000));

    let audioData, imageData;

    try {
      [audioData, imageData] = await Promise.all([
        procesarAudio(session.script, sessionId, session.voiceType),
        procesarImage(session.image, sessionId),
      ]);
    } catch (parallelError) {
      broadcastLog(`❌ Error in procesos paralelos: ${parallelError.message}`);

      if (parallelError.message.includes("429")) {
        broadcastLog("💡 Límite de ElevenLabs alcanzado");
        broadcastLog("🕐 Intenta de nuevo en 5-10 minutes");
      } else if (parallelError.message.includes("timeout")) {
        broadcastLog("💡 Timeout en Hedra");
        broadcastLog("🌐 Las APIs están lentas, intenta más tarde");
      }

      videoSessions.delete(sessionId);
      return;
    }

    broadcastLog("✅ PROCESAMIENTO COMPLETADO:");
    broadcastLog(`🔊 Audio: ${audioData.nameArchivo}`);
    broadcastLog(`📸 Image: ${imageData.name}`);

    // Enviar imágenes para comparación en el dashboard
    clients.forEach((client) => {
      try {
        client.write(
          `data: ${JSON.stringify({
            type: "image_comparison",
            originalPath: session.image,
            transformedPath: imageData.finalImagePath || imageData.archivo,
          })}\n\n`
        );
      } catch (error) {
        // Client disconnected
      }
    });

    // Mostrar información de transformación DALL-E si está disponible
    if (imageData.dalleTransformation) {
      const status = imageData.dalleTransformation.status;
      if (status === "ok") {
        broadcastLog(`🎨 ✅ DALL-E Transformation: SUCCESS`);
        broadcastLog(`🎨 Original: ${imageData.dalleTransformation.original}`);
        broadcastLog(`🎨 Transformed: ${imageData.finalImagePath}`);
      } else if (status === "disabled_by_flag") {
        broadcastLog(`🎨 ⚠️ DALL-E Transformation: DISABLED by flag`);
        broadcastLog(`🎨 Using original photo: ${imageData.archivo}`);
      } else if (status === "fallback_original") {
        broadcastLog(`🎨 ⚠️ DALL-E Transformation: FAILED`);
        broadcastLog(`🎨 Error: ${imageData.dalleTransformation.error}`);
        broadcastLog(`🎨 Using original photo as fallback`);
      }
    }

    broadcastLog(`🎬 Audio Asset: ${audioData.audioAssetId}`);
    broadcastLog(`📸 Image Asset: ${imageData.imageAssetId}`);
    broadcastLog("");
    broadcastLog("🔥 ¡ASSETS LISTOS! Procediendo a crear video...");
    broadcastLog("🎬 Creando video final con Hedra...");
    broadcastLog("⏳ Esta es la parte más lenta: 3-7 minutes");
    broadcastLog("🤖 Hedra está creando presentadora con sync de labios");
    broadcastLog(
      "💡 El sistema esperará 3 minutes y luego verificará 8 veces (total ~7 min)"
    );
    broadcastLog(
      '📊 Si Hedra está lento, el sistema intentará descargar manualmente'
    );

    // PASO 3: Crear video final
    let videoFinal;

    try {
      broadcastLog("🚀 INICIANDO CREACIÓN DE VIDEO...");
      broadcastLog("⚡ Llamando a procesarVideoCompleto()...");
      broadcastLog(
        `📋 Debug: audioData.audioAssetId = ${audioData.audioAssetId}`
      );
      broadcastLog(
        `📋 Debug: imageData.imageAssetId = ${imageData.imageAssetId}`
      );
      videoFinal = await procesarVideoCompleto(audioData, imageData, sessionId);
      broadcastLog("🎯 procesarVideoCompleto() COMPLETADO");
      broadcastLog(
        `📋 Debug: videoFinal recibido:`,
        JSON.stringify(videoFinal, null, 2)
      );
    } catch (videoError) {
      broadcastLog(`❌ Error creando video final: ${videoError.message}`);
      broadcastLog(`🔍 Error completo: ${JSON.stringify(videoError, null, 2)}`);

      if (videoError.message.includes("Timeout")) {
        broadcastLog("💡 El video puede estar aún procesándose en Hedra");
        broadcastLog(`🆔 Video ID: Revisa manualmente más tarde`);
      }

      videoSessions.delete(sessionId);
      return;
    }

    broadcastLog("");
    broadcastLog("🎉 VIDEO COMPLETADO EXITOSAMENTE! 🎉");
    broadcastLog(`📁 Archivo: ${videoFinal.nameArchivo}`);
    broadcastLog(`📏 Tamaño: ${videoFinal.tamaño}`);
    broadcastLog(`⏱️ Proceso total: ${videoFinal.duracionProceso}`);
    broadcastLog(`📅 Completed: ${new Date().toLocaleTimeString()}`);
    broadcastLog("📂 Ubicación: final_videos/");
    broadcastLog("🚀 ¡Tu video está listo para usar!");

    // ============================================================================
    // ENVIAR EVENTO DE VIDEO COMPLETADO AL DASHBOARD
    // ============================================================================
    try {
      // Extraer datos del video
      const videoPath = `/final_videos/${videoFinal.nameArchivo}`;
      const videoStats = fs.statSync(
        path.join(__dirname, "final_videos", videoFinal.nameArchivo)
      );
      const videoSizeBytes = videoStats.size;

      // Calcular duración del proceso en segundos
      const processDurationMatch =
        videoFinal.duracionProceso.match(/(\d+)m?\s*(\d+)?s?/);
      let processDurationSeconds = 0;
      if (processDurationMatch) {
        const minutes = parseInt(processDurationMatch[1]) || 0;
        const seconds = parseInt(processDurationMatch[2]) || 0;
        processDurationSeconds = minutes * 60 + seconds;
      }

      // Broadcast video completion event to all connected clients
      broadcastLog(
        `📡 ENVIANDO EVENTO video_completion a ${clients.length} clientes`
      );
      broadcastLog(
        `📋 Datos del evento: videoPath=${videoPath}, videoName=${videoFinal.nameArchivo}`
      );

      clients.forEach((client) => {
        try {
          const eventData = {
            type: "video_completion",
            videoPath: videoPath,
            videoName: videoFinal.nameArchivo,
            videoSize: videoSizeBytes,
            processDuration: processDurationSeconds,
            timestamp: Date.now(),
          };
          client.write(`data: ${JSON.stringify(eventData)}\n\n`);
          broadcastLog(`✅ Evento enviado a cliente`);
        } catch (error) {
          broadcastLog(`❌ Error enviando evento a cliente: ${error.message}`);
        }
      });

      broadcastLog("📡 ✅ EVENTO DE VIDEO COMPLETADO ENVIADO AL DASHBOARD");
    } catch (eventError) {
      broadcastLog(
        `⚠️ Error enviando evento (no crítico): ${eventError.message}`
      );
    }

    // ============================================================================
    // LIMPIEZA AUTOMÁTICA DE IMÁGENES TEMPORALES
    // ============================================================================
    broadcastLog("🧹 Iniciando limpieza de archivos temporales...");

    try {
      // Limpiar imagen original de /uploads
      if (session.image && fs.existsSync(session.image)) {
        fs.unlinkSync(session.image);
        broadcastLog(`✅ Eliminada imagen original: ${session.image}`);
      }

      // Limpiar imagen transformada de /images/modified
      if (imageData.finalImagePath && fs.existsSync(imageData.finalImagePath)) {
        fs.unlinkSync(imageData.finalImagePath);
        broadcastLog(
          `✅ Eliminada imagen transformada: ${imageData.finalImagePath}`
        );
      }

      broadcastLog("✨ Limpieza completada - Solo queda el video final");
    } catch (cleanupError) {
      broadcastLog(
        `⚠️ Error en limpieza (no crítico): ${cleanupError.message}`
      );
    }

    // Limpiar sesión
    videoSessions.delete(sessionId);
  } catch (error) {
    broadcastLog(`❌ Error inesperado: ${error.message}`);
    broadcastLog("🔧 Stack trace para debugging:");
    broadcastLog(error.stack || "No stack available");

    videoSessions.delete(sessionId);
  }
});

// Endpoint para rechazar script
app.post("/api/video/reject/:sessionId", requireAuth, (req, res) => {
  const { sessionId } = req.params;
  const session = videoSessions.get(sessionId);

  if (!session) {
    return res.json({ success: false, message: "Session no encontrada" });
  }

  broadcastLog("❌ PROCESO CANCELADO");
  broadcastLog("El script no fue aprobado.");
  broadcastLog("Puedes intentar con otra query.");

  videoSessions.delete(sessionId);

  res.json({ success: true, message: "Script rejected" });
});

// Endpoint para obtener estadísticas
app.get("/api/stats", requireAuth, (req, res) => {
  try {
    // Contar archivos en carpetas
    const videosDir = "final_videos";
    const audioDir = "generated_audios";

    let videosCount = 0;
    let audiosCount = 0;

    if (fs.existsSync(videosDir)) {
      videosCount = fs
        .readdirSync(videosDir)
        .filter((file) => file.endsWith(".mp4")).length;
    }

    if (fs.existsSync(audioDir)) {
      audiosCount = fs
        .readdirSync(audioDir)
        .filter((file) => file.endsWith(".mp3")).length;
    }

    res.json({
      vectores: 84, // Valor fijo por ahora
      videos: videosCount,
      audios: audiosCount,
      exito: videosCount > 0 ? "100%" : "0%",
      scraperActive: scraperProcess !== null,
      botActive: botProcess !== null,
    });
  } catch (error) {
    res.json({
      vectores: 0,
      videos: 0,
      audios: 0,
      exito: "0%",
      scraperActive: false,
      botActive: false,
    });
  }
});

// ============================================================================
// NUEVO ENDPOINT: CAROUSEL DE NOTICIAS (8 slides, 2 por país, cache 4 horas)
// ============================================================================

// Cache global para noticias del carrusel (LIMPIADO PARA NUEVA LÓGICA)
let carouselNewsCache = {
  news: [],
  lastUpdate: 0,
  CACHE_DURATION: 2 * 60 * 60 * 1000, // 2 horas en milisegundos (reducido para testing)
};

// Mapeo de países a sus fuentes y códigos (CON MÚLTIPLES DOMINIOS)
const COUNTRY_CONFIG = {
  NZ: {
    name: "NEW ZEALAND",
    flag: "NZ",
    source: "NZ Herald",
    domain: "nzherald.co.nz",
    alternativeDomains: ["nzherald", "stuff.co.nz", "newshub.co.nz"],
    image: "NZ.png",
  },
  AUS: {
    name: "AUSTRALIA",
    flag: "AUS",
    source: "ABC News",
    domain: "abc.net.au",
    alternativeDomains: ["abc.net.au", "smh.com.au", "theaustralian.com.au"],
    image: "AUS.png",
  },
  UK: {
    name: "UNITED KINGDOM",
    flag: "UK",
    source: "BBC",
    domain: "bbc.com",
    alternativeDomains: ["bbc.co.uk", "theguardian.com", "telegraph.co.uk"],
    image: "UK.png",
  },
  USA: {
    name: "UNITED STATES",
    flag: "USA",
    source: "New York Times",
    domain: "nytimes.com",
    alternativeDomains: ["cnn.com", "washingtonpost.com", "reuters.com"],
    image: "USA.png",
  },
};

// Function to get available images
function getAvailableImages() {
  const fs = require("fs");
  const path = require("path");
  const images = [];

  try {
    // First priority: images from modified folder
    const modifiedPath = path.join(process.cwd(), "images", "modified");
    if (fs.existsSync(modifiedPath)) {
      const modifiedFiles = fs
        .readdirSync(modifiedPath)
        .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map((file) => `/images/modified/${file}`);
      images.push(...modifiedFiles);
    }

    // Second priority: images from main images folder
    const imagesPath = path.join(process.cwd(), "images");
    if (fs.existsSync(imagesPath)) {
      const imageFiles = fs
        .readdirSync(imagesPath)
        .filter((file) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map((file) => `/images/${file}`);
      images.push(...imageFiles);
    }

    console.log(
      `📸 [Carousel] Found ${images.length} images: ${images.join(", ")}`
    );
  } catch (error) {
    console.error("❌ [Images] Error reading images:", error.message);
  }

  return images;
}

// Function to get default carousel news (fallback)
function getDefaultCarouselNews() {
  return [
    {
      title: "Welcome to AI Video Generator",
      summary:
        "Create amazing videos with our AI-powered platform. Upload your photo and let our system generate engaging content. Run the scraper to load real news!",
      country: "GLOBAL",
      flag: "",
      image: "default.png",
      source: "AI Generator",
      date: new Date().toISOString(),
      url: "#",
    },
  ];
}

app.get("/api/news/carousel", async (req, res) => {
  try {
    const now = Date.now();

    // Verificar si el cache sigue válido (menos de 4 horas)
    if (
      carouselNewsCache.news.length > 0 &&
      now - carouselNewsCache.lastUpdate < carouselNewsCache.CACHE_DURATION
    ) {
      console.log(
        `[Carousel] Returning cached news (age: ${Math.floor(
          (now - carouselNewsCache.lastUpdate) / 1000 / 60
        )} minutes)`
      );
      return res.json({
        success: true,
        news: carouselNewsCache.news,
        cached: true,
        nextUpdate: new Date(
          carouselNewsCache.lastUpdate + carouselNewsCache.CACHE_DURATION
        ).toISOString(),
      });
    }

    // Cache expirado o vacío - buscar noticias nuevas
    console.log(
      `[Carousel] Cache expired/empty - fetching fresh news from RAG`
    );

    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );

    // Buscar 2 noticias aleatorias por cada país (total 8)
    const carouselNews = [];

    for (const [countryCode, config] of Object.entries(COUNTRY_CONFIG)) {
      try {
        // BUSCAR POR FUENTE/DOMINIO PRIMERO (más confiable que metadatos de país)
        console.log(
          `🔍 [Carousel] Searching for ${countryCode} news from domain: ${config.domain}`
        );

        let countryNews = null;

        // 1. PRIORIDAD: Buscar por dominios conocidos del país (más confiable)
        const allDomains = [config.domain, ...config.alternativeDomains];
        const domainConditions = allDomains
          .map((domain) => `metadata->>link.ilike.%${domain}%`)
          .join(",");

        const domainResult = await supabase
          .from("documents")
          .select("content, metadata")
          .or(`${domainConditions},metadata->>source.ilike.%${config.source}%`)
          .limit(20);

        if (
          !domainResult.error &&
          domainResult.data &&
          domainResult.data.length > 0
        ) {
          countryNews = domainResult.data;
          console.log(
            `✅ [Carousel] Found ${countryNews.length} news from ${config.source} domain`
          );
        } else {
          // 2. FALLBACK: Buscar por términos del país (menos confiable)
          console.log(
            `⚠️ [Carousel] No domain matches for ${config.domain}, trying country terms...`
          );

          const searchTerms = [
            config.name,
            countryCode,
            countryCode.toLowerCase(),
          ];

          for (const term of searchTerms) {
            const result = await supabase
              .from("documents")
              .select("content, metadata")
              .or(
                `metadata->>country.ilike.%${term}%,metadata->>pais.ilike.%${term}%,content.ilike.%${term}%`
              )
              .limit(20);

            if (!result.error && result.data && result.data.length > 0) {
              countryNews = result.data;
              console.log(
                `✅ [Carousel] Found ${countryNews.length} news using country term: ${term}`
              );
              break;
            }
          }
        }

        if (!countryNews || countryNews.length === 0) {
          console.log(
            `⚠️ [Carousel] No news found for ${countryCode} (tried: ${searchTerms.join(
              ", "
            )})`
          );

          // FALLBACK: Crear noticias de ejemplo para demostración
          countryNews = [
            {
              content: `Breaking news from ${config.name}. Major developments are unfolding in the region. Local authorities are monitoring the situation closely. Stay tuned for more updates as the story develops.`,
              metadata: {
                title: `Latest Update from ${config.name}`,
                pubDate: new Date().toISOString(),
                country: config.name,
                link: `https://${config.domain}`,
              },
            },
            {
              content: `In ${config.name}, recent events have captured international attention. Experts weigh in on the implications. The situation continues to evolve rapidly with new information emerging hourly.`,
              metadata: {
                title: `${config.name} in Focus`,
                pubDate: new Date(Date.now() - 3600000).toISOString(),
                country: config.name,
                link: `https://${config.domain}`,
              },
            },
          ];

          console.log(`[Carousel] Using demo news for ${countryCode}`);
        }

        // FILTRAR chunks incompletos + VALIDAR que correspondan al país correcto
        const filteredNews = countryNews.filter((doc) => {
          const content = doc.content || "";
          const metadata = doc.metadata || {};

          // 1. Descartar chunks muy cortos (probablemente incompletos)
          if (content.length < 100) return false;

          // 2. Priorizar chunks que empiecen con mayúscula (inicio de noticia)
          const firstChar = content.trim().charAt(0);
          if (!firstChar.match(/[A-Z]/)) return false;

          // 3. Descartar chunks que empiecen con palabras conectoras (continuación)
          const startWords = content.toLowerCase().trim();
          const badStartWords = [
            "and",
            "but",
            "however",
            "meanwhile",
            "also",
            "the",
            "it",
            "this",
            "that",
            "wned",
            "ment",
            "tion",
          ];
          if (badStartWords.some((word) => startWords.startsWith(word)))
            return false;

          // 4. VALIDACIÓN DE PAÍS: Verificar que la fuente corresponda al país
          const link = metadata.link || metadata.url || "";
          const source = metadata.source || "";

          // Verificar que coincida con alguno de los dominios del país
          const allDomainsForCountry = [
            config.domain,
            ...config.alternativeDomains,
          ];
          const isValidSource = allDomainsForCountry.some(
            (domain) =>
              link.includes(domain) ||
              source.toLowerCase().includes(domain.split(".")[0])
          );

          if (link && !isValidSource && !source.includes(config.source)) {
            console.log(
              `⚠️ [Carousel] Skipping mismatched source: ${source} from ${link} (expected domains: ${allDomainsForCountry.join(
                ", "
              )})`
            );
            return false;
          }

          return true;
        });

        // Si no hay chunks filtrados, usar los originales pero limitados
        const newsToUse =
          filteredNews.length > 0 ? filteredNews : countryNews.slice(0, 4);

        // Seleccionar 2 noticias aleatorias de los chunks filtrados
        const shuffled = newsToUse.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);

        // Formatear las noticias para el carrusel
        selected.forEach((doc) => {
          const metadata = doc.metadata || {};

          // CREAR RESUMEN INTELIGENTE (máximo 50 palabras, terminando en oración completa)
          let summary = doc.content || "";
          const words = summary.split(" ");

          if (words.length > 50) {
            // Cortar a 50 palabras pero buscar un punto cercano para terminar la oración
            let cutText = words.slice(0, 50).join(" ");

            // Buscar el último punto en los últimos 10 palabras
            const lastTenWords = words.slice(40, 50).join(" ");
            const lastDotIndex = lastTenWords.lastIndexOf(".");

            if (lastDotIndex > -1) {
              // Si encontramos un punto, cortar ahí
              const wordsToLastDot = words.slice(
                0,
                40 +
                  lastTenWords.substring(0, lastDotIndex + 1).split(" ").length
              );
              summary = wordsToLastDot.join(" ");
            } else {
              // Si no hay punto, agregar puntos suspensivos
              summary = cutText + "...";
            }
          }

          // Limpiar texto cortado al inicio (por si quedó algo mal)
          summary = summary.replace(/^[a-z]/, (char) => char.toUpperCase());

          // Log detallado para debugging
          const actualSource = metadata.source || "Unknown";
          const actualLink = metadata.link || "No link";
          console.log(
            `[Carousel] Adding ${countryCode} news: "${
              metadata.title || "No title"
            }" from ${actualSource} (${actualLink})`
          );

          carouselNews.push({
            country: config.name,
            countryCode: countryCode,
            flag: countryCode,
            source: actualSource, // Usar fuente real de la metadata
            image: config.image,
            title: metadata.title || "Latest News",
            summary: summary,
            date: metadata.pubDate || new Date().toISOString(),
            url: metadata.link || "#",
          });
        });

        console.log(`✅ [Carousel] Found 2 news for ${countryCode}`);
      } catch (countryError) {
        console.error(
          `❌ [Carousel] Error processing ${countryCode}:`,
          countryError.message
        );
      }
    }

    // Verificar que tenemos al menos algunas noticias
    if (carouselNews.length === 0) {
      console.log(`❌ [Carousel] No news found in database`);
      return res.json({
        success: false,
        message: "No news available",
        news: [],
      });
    }

    // Mezclar el orden para variedad visual
    const shuffledNews = carouselNews.sort(() => 0.5 - Math.random());

    // Actualizar cache
    carouselNewsCache.news = shuffledNews;
    carouselNewsCache.lastUpdate = now;

    console.log(
      `✅ [Carousel] Fetched and cached ${shuffledNews.length} news items`
    );

    res.json({
      success: true,
      news: shuffledNews,
      cached: false,
      nextUpdate: new Date(
        now + carouselNewsCache.CACHE_DURATION
      ).toISOString(),
    });
  } catch (error) {
    console.error(`❌ [Carousel] Unexpected error:`, error.message);
    res.json({
      success: false,
      message: error.message,
      news: [],
    });
  }
});

// Endpoint for getting available images
app.get("/api/images/available", (req, res) => {
  try {
    const images = getAvailableImages();
    res.json({
      success: true,
      images: images,
      count: images.length,
    });
  } catch (error) {
    console.error("❌ [Images API] Error:", error);
    res.json({
      success: false,
      message: "Error loading images",
      images: [],
    });
  }
});

// Endpoint for getting random videos from final_videos folder
app.get("/api/videos/showcase", (req, res) => {
  try {
    const videosDir = path.join(__dirname, "final_videos");

    if (!fs.existsSync(videosDir)) {
      return res.json({
        success: false,
        message: "Videos directory not found",
        videos: [],
      });
    }

    // Get all MP4 files
    const allVideos = fs
      .readdirSync(videosDir)
      .filter((file) => file.toLowerCase().endsWith(".mp4"))
      .map((file) => {
        const filePath = path.join(videosDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: `/final_videos/${file}`,
          size: Math.round(stats.size / (1024 * 1024)), // Size in MB
          date: stats.mtime.toISOString(),
          title: file
            .replace(".mp4", "")
            .replace(/video_(\d{8})_(\d{6})/, "Video $1 $2"),
        };
      });

    // Shuffle and select 4 random videos
    const shuffled = allVideos.sort(() => 0.5 - Math.random());
    const randomVideos = shuffled.slice(0, 4);

    console.log(`📹 [Showcase] Returning ${randomVideos.length} random videos`);

    res.json({
      success: true,
      videos: randomVideos,
      total: allVideos.length,
    });
  } catch (error) {
    console.error("❌ [Videos API] Error:", error);
    res.json({
      success: false,
      message: "Error loading videos",
      videos: [],
    });
  }
});

// Endpoint para obtener videos aleatorios de final_videos
app.get("/api/videos/random", (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const videosDir = path.join(__dirname, "final_videos");

    if (!fs.existsSync(videosDir)) {
      return res.json({
        success: false,
        message: "Videos directory not found",
        videos: [],
      });
    }

    // Obtener todos los archivos .mp4
    const allVideos = fs
      .readdirSync(videosDir)
      .filter((file) => file.toLowerCase().endsWith(".mp4"))
      .map((filename) => {
        const filePath = path.join(videosDir, filename);
        const stats = fs.statSync(filePath);

        return {
          filename: filename,
          path: `/final_videos/${filename}`,
          size: stats.size,
          created: stats.birthtime,
          title: filename.replace(".mp4", "").replace(/_/g, " "),
        };
      })
      .sort((a, b) => b.created - a.created); // Ordenar por fecha, más recientes primero

    // Seleccionar 4 videos aleatorios
    const shuffled = allVideos.sort(() => 0.5 - Math.random());
    const randomVideos = shuffled.slice(0, 4);

    console.log(
      `📹 [Videos API] Found ${allVideos.length} videos, returning 4 random`
    );

    res.json({
      success: true,
      videos: randomVideos,
      totalVideos: allVideos.length,
    });
  } catch (error) {
    console.error("❌ [Videos API] Error:", error);
    res.json({
      success: false,
      message: "Error loading videos",
      videos: [],
    });
  }
});

// NEW: Endpoints for subtitled videos
// Endpoint para obtener videos con subtítulos
app.get("/api/videos/subtitled", (req, res) => {
  try {
    const { getSubtitledVideos } = require('./modules/subtitle-processor');
    
    getSubtitledVideos()
      .then(videos => {
        console.log(`[Subtitled Videos API] Found ${videos.length} subtitled videos`);
        
        res.json({
          success: true,
          videos,
          total: videos.length,
        });
      })
      .catch(error => {
        console.error("❌ [Subtitled Videos API] Error:", error);
        res.json({
          success: false,
          message: "Error loading subtitled videos",
          videos: [],
        });
      });
  } catch (error) {
    console.error("❌ [Subtitled Videos API] Error:", error);
    res.json({
      success: false,
      message: "Error loading subtitled videos",
      videos: [],
    });
  }
});

// Endpoint combinado que devuelve videos originales y con subtítulos
app.get("/api/videos/combined", (req, res) => {
  try {
    const videosDir = path.join(__dirname, "final_videos");
    const { getSubtitledVideos } = require('./modules/subtitle-processor');

    // Videos originales
    let originalVideos = [];
    if (fs.existsSync(videosDir)) {
      originalVideos = fs
        .readdirSync(videosDir)
        .filter((file) => file.toLowerCase().endsWith(".mp4"))
        .map((file) => {
          const filePath = path.join(videosDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            path: `/final_videos/${file}`,
            size: Math.round(stats.size / (1024 * 1024)),
            date: stats.mtime.toISOString(),
            created: stats.birthtime,
            title: file
              .replace(".mp4", "")
              .replace(/video_(\d{8})_(\d{6})/, "Video $1 $2"),
            isSubtitled: false,
            type: 'original'
          };
        });
    }

    // Videos con subtítulos
    getSubtitledVideos()
      .then(subtitledVideos => {
        // Agregar tipo para diferenciar
        const typedSubtitledVideos = subtitledVideos.map(video => ({
          ...video,
          type: 'subtitled'
        }));

        // Combinar y ordenar por fecha
        const allVideos = [...originalVideos, ...typedSubtitledVideos]
          .sort((a, b) => new Date(b.created || b.date) - new Date(a.created || a.date));

        console.log(`🎥 [Combined Videos API] Found ${originalVideos.length} original + ${subtitledVideos.length} subtitled videos`);

        res.json({
          success: true,
          videos: allVideos,
          stats: {
            total: allVideos.length,
            original: originalVideos.length,
            subtitled: subtitledVideos.length
          }
        });
      })
      .catch(error => {
        console.error("❌ [Combined Videos API] Error with subtitled videos:", error);
        
        // Si falla subtítulos, devolver solo originales
        res.json({
          success: true,
          videos: originalVideos,
          stats: {
            total: originalVideos.length,
            original: originalVideos.length,
            subtitled: 0
          },
          warning: "Could not load subtitled videos"
        });
      });
  } catch (error) {
    console.error("❌ [Combined Videos API] Error:", error);
    res.json({
      success: false,
      message: "Error loading videos",
      videos: [],
    });
  }
});

// Endpoint para limpiar logs
app.post("/api/logs/clear", requireAuth, (req, res) => {
  broadcastLog("🗑️ Logs limpiados");
  res.json({ success: true });
});

// Endpoint para limpiar cache del carousel
app.post("/api/news/clear-cache", requireAuth, (req, res) => {
  carouselNewsCache = {
    news: [],
    lastUpdate: 0,
    CACHE_DURATION: 2 * 60 * 60 * 1000,
  };
  broadcastLog(
    "🗑️ Cache del carousel limpiado - próxima carga usará filtros mejorados"
  );
  res.json({ success: true, message: "Carousel cache cleared" });
});

// ============================================================================
// TEST ENDPOINTS - Para probar el modal de progreso
// ============================================================================
app.post("/api/test/simulate-video", requireAuth, async (req, res) => {
  try {
    const { action, videoName } = req.body;
    
    if (action === 'simulate_arrival') {
      const timestamp = new Date().toISOString().replace(/[:\-T]/g, '').substring(0, 15);
      const newVideoName = videoName || `test_video_${timestamp}.mp4`;
      
      // Simular la llegada de un video copiando uno existente
      const sourceVideo = path.join(__dirname, 'final_videos', 'demo1.mp4');
      const destinationVideo = path.join(__dirname, 'final_videos', newVideoName);
      
      if (fs.existsSync(sourceVideo)) {
        fs.copyFileSync(sourceVideo, destinationVideo);
        
        broadcastLog(`🧪 Test: Video simulado creado - ${newVideoName}`);
        
        // Simular el evento de video completado
        setTimeout(() => {
          const videoStats = fs.statSync(destinationVideo);
          const videoData = {
            type: 'video_completion',
            videoPath: `/final_videos/${newVideoName}`,
            videoName: newVideoName,
            videoSize: videoStats.size,
            size: `${(videoStats.size / (1024 * 1024)).toFixed(2)} MB`,
            sessionId: 'test_session_' + timestamp
          };
          
          // Enviar evento SSE
          clients.forEach(client => {
            try {
              client.write(`data: ${JSON.stringify(videoData)}\n\n`);
              console.log('✅ Video completion event sent to client');
            } catch (e) {
              console.log('Error enviando test event:', e.message);
            }
          });
          
          broadcastLog(`🎬 Test: Evento video_completion enviado para ${newVideoName}`);
          console.log('📹 Video data sent:', videoData);
        }, 1000);
        
        res.json({ 
          success: true, 
          message: 'Video simulation started',
          videoName: newVideoName 
        });
      } else {
        res.json({ 
          success: false, 
          message: 'Source video not found' 
        });
      }
    } else {
      res.json({ 
        success: false, 
        message: 'Unknown action' 
      });
    }
  } catch (error) {
    console.error('Error in simulate-video:', error);
    res.json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Servir página de login
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "login.html"));
});

// NUEVA RUTA - Redirigir root a login si no está autenticado
app.get("/", (req, res) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    // No hay token, redirigir a login
    return res.redirect("/login.html");
  }

  // Verificar token
  const { verificarToken } = require("./modules/auth-manager");
  const verification = verificarToken(token);

  if (!verification.success) {
    // Invalid token, redirigir a login
    return res.redirect("/login.html");
  }

  // Token válido, mostrar dashboard NUEVO estilo Leonardo
  res.sendFile(path.join(__dirname, "frontend", "dashboard-new.html"));
});

// Servir panel de admin (solo admin) - VERSIÓN REFORZADA
app.get("/admin.html", requireAuth, requireAdmin, (req, res) => {
  // Doble verificación de seguridad
  if (req.user.role !== "admin") {
    broadcastLog(
      `❌ Access denied al panel admin: ${req.user.username} (${req.user.role})`
    );
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only.",
    });
  }

  broadcastLog(`✅ Acceso admin autorizado: ${req.user.username}`);
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Redirigir a login si no está autenticado
app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    res.redirect("/login.html");
  } else {
    next(err);
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Server initialized at http://localhost:${PORT}`);
  console.log("📋 Dashboard available in browser");
  console.log("⚡ APIs ready to connect frontend with backend");

  broadcastLog("🌐 Servidor Express initialized");
  broadcastLog("📋 Dashboard web disponible");
  broadcastLog("⚡ System ready to use");
  
  // Iniciar watcher de videos
  setupVideoWatcher();
  
  // Iniciar scraper automático cada 4 horas
  setupAutoScraper();
});

// ============================================================================
// AUTO SCRAPER - Ejecutar cada 4 horas automáticamente
// ============================================================================
function setupAutoScraper() {
  console.log('🤖 Setting up automatic scraper (every 4 hours)...');
  
  // Ejecutar inmediatamente al iniciar (opcional)
  setTimeout(() => {
    runScraper('auto_startup');
  }, 30000); // 30 segundos después del inicio
  
  // Configurar intervalo cada 4 horas (4 * 60 * 60 * 1000 = 14400000 ms)
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  
  setInterval(() => {
    runScraper('auto_scheduled');
  }, FOUR_HOURS);
  
  console.log('✅ Auto scraper scheduled - will run every 4 hours');
  broadcastLog('🤖 Auto scraper configurado - cada 4 horas');
}

function runScraper(source = 'manual') {
  // Verificar si ya hay un scraper ejecutándose
  if (scraperProcess) {
    console.log('⚠️ Scraper already running, skipping...');
    return;
  }
  
  const timestamp = new Date().toLocaleString();
  console.log(`🚀 [${timestamp}] Starting auto scraper (${source})...`);
  broadcastLog(`🚀 Auto scraper iniciado (${source})`);
  
  scraperProcess = spawn("node", ["scraper-4-paises-final.js"], {
    stdio: "pipe",
  });

  scraperProcess.stdout.on("data", (data) => {
    const message = data.toString().trim();
    console.log(`[SCRAPER] ${message}`);
    broadcastLog(`${message}`);
  });

  scraperProcess.stderr.on("data", (data) => {
    console.error(`[SCRAPER ERROR] ${data}`);
  });

  scraperProcess.on("close", (code) => {
    const timestamp = new Date().toLocaleString();
    if (code === 0) {
      console.log(`✅ [${timestamp}] Auto scraper completed successfully`);
      broadcastLog("✅ Auto scraper completado exitosamente");
    } else {
      console.log(`❌ [${timestamp}] Auto scraper failed with code: ${code}`);
      broadcastLog(`❌ Auto scraper falló con código: ${code}`);
    }
    scraperProcess = null;
  });
}

// ============================================================================
// FILE WATCHER - Detectar videos nuevos automáticamente
// ============================================================================
function setupVideoWatcher() {
  const finalVideosPath = path.join(__dirname, 'final_videos');
  const subtitledVideosPath = path.join(__dirname, 'final_videos_subtitled');
  
  console.log('📁 Setting up video file watcher...');
  
  // Watcher para final_videos
  const watcher = chokidar.watch([finalVideosPath, subtitledVideosPath], {
    ignored: /^\./, 
    persistent: true,
    ignoreInitial: true // Solo nuevos archivos, no los existentes
  });
  
  watcher.on('add', (filePath) => {
    if (path.extname(filePath).toLowerCase() === '.mp4') {
      const videoName = path.basename(filePath);
      const videoStats = fs.statSync(filePath);
      const isSubtitled = filePath.includes('final_videos_subtitled');
      
      console.log(`🎬 New video detected: ${videoName} (${isSubtitled ? 'subtitled' : 'normal'})`);
      
      // Generar evento de video completado
      setTimeout(() => {
        const videoData = {
          type: 'video_completion',
          videoPath: isSubtitled ? `/final_videos_subtitled/${videoName}` : `/final_videos/${videoName}`,
          videoName: videoName,
          videoSize: videoStats.size,
          size: `${(videoStats.size / (1024 * 1024)).toFixed(2)} MB`,
          sessionId: 'auto_detected_' + Date.now(),
          isSubtitled: isSubtitled
        };
        
        // Enviar evento SSE a todos los clientes
        clients.forEach(client => {
          try {
            client.write(`data: ${JSON.stringify(videoData)}\n\n`);
          } catch (e) {
            console.log('Error sending auto-detected video event:', e.message);
          }
        });
        
        broadcastLog(`🎬 Auto-detected video: ${videoName} - Event sent to clients`);
        console.log('📹 Auto-detected video data:', videoData);
      }, 500); // Small delay to ensure file is fully written
    }
  });
  
  watcher.on('error', (error) => {
    console.error('📁 File watcher error:', error);
  });
  
  console.log('✅ Video file watcher active');
  return watcher;
}

// Manejo de cierre del servidor
process.on("SIGINT", () => {
  console.log("\n🛑 Closing server...");

  if (scraperProcess) {
    scraperProcess.kill("SIGTERM");
  }

  if (botProcess) {
    botProcess.kill("SIGTERM");
  }

  process.exit(0);
});
