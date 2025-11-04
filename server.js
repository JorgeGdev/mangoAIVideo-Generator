require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser"); // NUEVO
const multer = require("multer"); // NUEVO para uploads
const chokidar = require("chokidar"); // NUEVO para watch de archivos
const cron = require("node-cron"); // Para RAG automático
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// RAILWAY STORAGE MANAGER - Para manejo de archivos temporales
const { 
  STORAGE_CONFIG, 
  isRailway, 
  registerTempFile, 
  markAsDownloaded,
  getTempFileInfo,
  getTempFileStats,
  initStorage,
  tempFileCache 
} = require('./modules/railway-storage');

// ============================================================================
// RAILWAY OPTIMIZATION - Memory and process management
// ============================================================================
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  // Don't exit on Railway - just log
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on Railway - just log
});

// Memory management for Railway
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    if (global.gc) {
      global.gc();
    }
  }, 30000); // Force garbage collection every 30 seconds
}

// IMPORTAR SISTEMA DE AUTENTICACIÓN
const {
  requireAuth,
  requireAdmin,
  validarCredenciales,
  crearUser,
  listarUsers,
} = require("./modules/auth-manager"); // NUEVO

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar multer para uploads (RAILWAY COMPATIBLE)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = STORAGE_CONFIG.uploads;
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

// Static serve for transformed images (RAILWAY COMPATIBLE)
app.use("/uploads", express.static(STORAGE_CONFIG.uploads));
app.use("/images/modified", express.static(STORAGE_CONFIG.images));
app.use("/frontend", express.static(path.join(process.cwd(), "frontend")));

// Serve videos with proper range support for streaming (RAILWAY COMPATIBLE)
if (!isRailway) {
  // Solo en desarrollo local - Railway usa endpoints de descarga temporal
  app.use("/final_videos", express.static(STORAGE_CONFIG.videos, {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.mp4') {
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', 'video/mp4');
      }
    }
  }));


}

app.use(express.static("."));

// Voices endpoint (fills the <select id="voiceSelect"> in the dashboard)
app.get('/api/voices', (req, res) => {
  try {
    const { getAvailableVoices } = require('./modules/audio-processor'); // <- ruta correcta en tu repo
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
  // Fix HTTP/2 protocol error in Railway
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
    "X-Accel-Buffering": "no" // Disable nginx buffering
  });

  clients.push(res);
  console.log(`📱 Client connected. Total: ${clients.length}`);

  // Send initial connection confirmation
  try {
    res.write(`data: ${JSON.stringify({ log: `[${new Date().toLocaleTimeString()}] ✅ Connected to server logs` })}\n\n`);
  } catch (error) {
    console.log('Error sending initial log:', error.message);
  }

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);
    console.log(`📱 Client disconnected. Total: ${clients.length}`);
  });

  req.on("error", (error) => {
    console.log(`📱 SSE connection error: ${error.message}`);
    clients = clients.filter((client) => client !== res);
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

// Endpoint para ejecutar scraper (MANUAL - desde botón del dashboard)
app.post("/api/scraper/start", requireAuth, (req, res) => {
  if (scraperProcess) {
    return res.json({
      success: false,
      message: "Scraper ya está ejecutándose",
    });
  }

  broadcastLog("🚀 MANUAL SCRAPER: Iniciando scraper de noticias desde dashboard...");
  broadcastLog("🔧 Este es un scraper MANUAL - No interfiere con el scraper automático");

  scraperProcess = spawn("node", ["scraper-4-paises-final.js"], {
    cwd: __dirname,
  });

  scraperProcess.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim());
    lines.forEach((line) => broadcastLog(`MANUAL: ${line}`));
  });

  scraperProcess.stderr.on("data", (data) => {
    broadcastLog(`❌ MANUAL Error: ${data.toString()}`);
  });

  scraperProcess.on("close", (code) => {
    if (code === 0) {
      broadcastLog("MANUAL SCRAPER: Completed successfully");
      broadcastLog("Database updated - System ready to generate videos");
    } else {
      broadcastLog(`MANUAL SCRAPER: Finished with code: ${code}`);
    }
    scraperProcess = null;
  });

  res.json({ 
    success: true, 
    message: "Manual scraper started - Check the logs to follow the progress" 
  });
});

// Endpoint para iniciar bot
app.post("/api/bot/start", requireAuth, (req, res) => {
  if (botProcess) {
    return res.json({ success: false, message: "Bot is already running" });
  }

  broadcastLog("🤖 Starting Telegram bot...");

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
    broadcastLog(`Telegram bot finished with code: ${code}`);
    botProcess = null;
  });

  res.json({ success: true, message: "Bot initialized" });
});

// Endpoint para detener bot
app.post("/api/bot/stop", requireAuth, (req, res) => {
  if (botProcess) {
    botProcess.kill("SIGTERM");
    broadcastLog("Telegram bot stopped");
    botProcess = null;
    res.json({ success: true, message: "Bot stopped" });
  } else {
    res.json({ success: false, message: "Bot is not running" });
  }
});

// Endpoint para generar video manual (CON APROBACIÓN)
app.post("/api/video/generate", requireAuth, async (req, res) => {
  const { image, query } = req.body;

  if (!image || !query) {
    return res.json({
      success: false,
      message: "Image and query are required",
    });
  }

  const sessionId = `manual_${Date.now()}`;
  broadcastLog(`Manual Generation: ${image}@${query}`);

  try {
    // Importar módulo de script
    const { generarScript } = require("./modules/script-generator");

    // PASO 1: Generar script SOLAMENTE
    broadcastLog("🤖 Consulting AI + RAG...");
    const scriptData = await generarScript(query, sessionId);

    if (!scriptData.encontrado) {
      broadcastLog("No data found in RAG for this query");
      return res.json({
        success: false,
        message: "No data found for this query",
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
    broadcastLog(`SCRIPT GENERATED [${sessionId}]:`);
    broadcastLog(`WORDS: ${scriptData.palabras}`);
    broadcastLog(
      `ESTIMATED DURATION: ${Math.floor(scriptData.palabras / 4)} seconds`
    );
    broadcastLog(`GENERATED WITH: OpenAI + RAG`);
    broadcastLog(`SOURCES: ${scriptData.documents} documents`);
    broadcastLog("");
    broadcastLog("check the script in the approval modal");

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
      message: "Script generated - Requires approval",
    });
  } catch (error) {
    broadcastLog(`❌ Error generating script: ${error.message}`);
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

      broadcastLog(`CUSTOM VIDEO GENERATION [${sessionId}]`);
      broadcastLog(
        `Photo uploaded: ${uploadedFile.originalname} (${(
          uploadedFile.size / 1024
        ).toFixed(1)}KB)`
      );
      broadcastLog(`Saved as: ${uploadedFile.filename}`);
      broadcastLog(`Query: "${query}"`);

      // Importar módulo de script
      const { generarScript } = require("./modules/script-generator");

      // PASO 1: Procesar query natural y generar script
      broadcastLog("Processing natural language query...");
      broadcastLog("Consulting AI + RAG database...");

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

      broadcastLog(`Expanded query: "${processedQuery}"`);

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
      broadcastLog(`SCRIPT GENERATED [${sessionId}]:`);
      broadcastLog(`Words: ${scriptData.palabras}`);
      broadcastLog(
        `⏱️ Estimated duration: ${Math.floor(scriptData.palabras / 4)} seconds`
      );
      broadcastLog(`Generated with: OpenAI + RAG`);
      broadcastLog(`Sources: ${scriptData.documents} documents`);
      broadcastLog(`Using custom photo: ${uploadedFile.originalname}`);
      broadcastLog("");
      broadcastLog("Check the script in the approval modal");

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

      broadcastLog(`Error in custom video generation: ${error.message}`);
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
      message: "Session not found or expired",
    });
  }

  // Verificar que no haya pasado mucho tiempo (30 minutes max)
  const now = Date.now();
  if (now - session.timestamp > 30 * 60 * 1000) {
    videoSessions.delete(sessionId);
    return res.json({ success: false, message: "Session expired (30 min)" });
  }

  // Responder inmediatamente para que el frontend no se cuelgue
  res.json({
    success: true,
    message: "Video initialized - Process may take 8-10 minutes",
  });

  broadcastLog("Script approved - continuing to video generation...");
  broadcastLog(`Debug: Session data:`, JSON.stringify(session, null, 2));
  broadcastLog("LONG PROCESS - This will take several minutes");
  broadcastLog("You can follow the progress in these logs");

  try {
    // Importar módulos del sistema
    const { procesarAudio } = require("./modules/audio-processor");
    const { procesarImage } = require("./modules/image-processor");
    const { procesarVideoCompleto } = require("./modules/video-creator");

    // PASO 2: Procesar audio e image en paralelo
    broadcastLog("Starting parallel processes...");
    broadcastLog("Audio: ~2 minutes (ElevenLabs + Hedra)");
    broadcastLog("Image: ~30 seconds (Hedra upload)");

    // Delay inicial para evitar rate limits
    await new Promise((resolve) => setTimeout(resolve, 3000));

    let audioData, imageData;

    try {
      [audioData, imageData] = await Promise.all([
        procesarAudio(session.script, sessionId, session.voiceType),
        procesarImage(session.image, sessionId),
      ]);
    } catch (parallelError) {
      broadcastLog(`Error in parallel processes: ${parallelError.message}`);

      if (parallelError.message.includes("429")) {
        broadcastLog("ElevenLab limit reached");
        broadcastLog("Try again in 5-10 minutes");
      } else if (parallelError.message.includes("timeout")) {
        broadcastLog("Timeout in Hedra");
        broadcastLog("APIs are slow, please try again later");
      }

      videoSessions.delete(sessionId);
      return;
    }

    broadcastLog("PROCESSING COMPLETED:");
    broadcastLog(`Audio: ${audioData.nameArchivo}`);
    broadcastLog(`Image: ${imageData.name}`);

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
        broadcastLog(`DALL-E Transformation: SUCCESS`);
        broadcastLog(`Original: ${imageData.dalleTransformation.original}`);
        broadcastLog(`Transformed: ${imageData.finalImagePath}`);
      } else if (status === "disabled_by_flag") {
        broadcastLog(`DALL-E Transformation: DISABLED by flag`);
        broadcastLog(`Using original photo: ${imageData.archivo}`);
      } else if (status === "fallback_original") {
        broadcastLog(`DALL-E Transformation: FAILED`);
        broadcastLog(`Error: ${imageData.dalleTransformation.error}`);
        broadcastLog(`Using original photo as fallback`);
      }
    }

    broadcastLog(`Audio Asset: ${audioData.audioAssetId}`);
    broadcastLog(`Image Asset: ${imageData.imageAssetId}`);
    broadcastLog("");
    broadcastLog("ASSETS READY! Proceeding to create the video...");
    broadcastLog("Creating final video with Hedra...");
    broadcastLog("This is the slowest part: 3-7 minutes");
    broadcastLog("Hedra is creating presenter with lip sync");
    broadcastLog(
      "💡 The system will wait 3 minutes and then check 8 times (total ~7 min)"
    );
    broadcastLog(
      'If Hedra is slow, the system will try to download the video as soon as it is ready'
    );

    // PASO 3: Crear video final
    let videoFinal;

    try {
      broadcastLog("STARTING VIDEO CREATION...");
      broadcastLog("Calling procesarVideoCompleto()...");
      broadcastLog(
        `Debug: audioData.audioAssetId = ${audioData.audioAssetId}`
      );
      broadcastLog(
        `Debug: imageData.imageAssetId = ${imageData.imageAssetId}`
      );
      
      // Capturar tiempo de inicio
      const startTime = Date.now();
      
      videoFinal = await procesarVideoCompleto(audioData, imageData, sessionId);
      
      const endTime = Date.now();
      const processTime = Math.round((endTime - startTime) / 1000);
      videoFinal.duracionProceso = `${Math.floor(processTime / 60)}m ${processTime % 60}s`;
      
      broadcastLog("procesarVideoCompleto() COMPLETED");
      broadcastLog(`Total process time: ${videoFinal.duracionProceso}`);
      broadcastLog(
        `Debug: videoFinal received - nameArchivo: ${videoFinal.nameArchivo}, tamaño: ${videoFinal.tamaño}`
      );
    } catch (videoError) {
      broadcastLog(`Error creating final video: ${videoError.message}`);
      
      // Logging más detallado para debugging
      if (videoError.stack) {
        broadcastLog(`Stack trace: ${videoError.stack.split('\n')[0]}`);
      }

      if (videoError.message.includes("Timeout")) {
        broadcastLog("The video may still be processing in Hedra");
        broadcastLog(`Check your Hedra dashboard manually`);
        broadcastLog(`Try generating another video in 5-10 minutes`);
      } else if (videoError.message.includes("no completed")) {
        broadcastLog("Hedra is processing very slowly today");
        broadcastLog(`The video may be completed in a few more minutes`);
      } else if (videoError.message.includes("download")) {
        broadcastLog("Error downloading - video generated but not downloaded");
        broadcastLog(`Check network connection and disk space`);
      }

      videoSessions.delete(sessionId);
      return;
    }

    broadcastLog("");
    broadcastLog("VIDEO COMPLETED SUCCESSFULLY! 🎉");
    broadcastLog(`File: ${videoFinal.nameArchivo}`);
    broadcastLog(`Size: ${videoFinal.tamaño}`);
    broadcastLog(`Total process: ${videoFinal.duracionProceso}`);
    broadcastLog(`Completed: ${new Date().toLocaleTimeString()}`);
    broadcastLog("Location: final_videos/");
    broadcastLog("Your video is ready to use!");

    // ============================================================================
    // SEND VIDEO COMPLETED EVENT TO DASHBOARD (RAILWAY COMPATIBLE)
    // ============================================================================
    try {
      // Determine paths based on environment
      const videoFilePath = isRailway 
        ? path.join(STORAGE_CONFIG.videos, videoFinal.nameArchivo)
        : path.join(__dirname, "final_videos", videoFinal.nameArchivo);
      
      const videoStats = fs.statSync(videoFilePath);
      const videoSizeBytes = videoStats.size;

      // En Railway, registrar archivo como temporal para descarga
      if (isRailway) {
        registerTempFile(videoFinal.nameArchivo, videoFilePath, 'video', 30);
        broadcastLog(`Railway: Video registered for temporary download (30 min)`);
        broadcastLog(`Railway: File saved in: ${videoFilePath}`);
        broadcastLog(`Railway: Download URL: /api/temp/videos/${videoFinal.nameArchivo}`);
      }

      // Calcular duración del proceso en segundos
      const processDurationMatch =
        videoFinal.duracionProceso.match(/(\d+)m?\s*(\d+)?s?/);
      let processDurationSeconds = 0;
      if (processDurationMatch) {
        const minutes = parseInt(processDurationMatch[1]) || 0;
        const seconds = parseInt(processDurationMatch[2]) || 0;
        processDurationSeconds = minutes * 60 + seconds;
      }

      // Configurar URL del video según ambiente
      const videoUrl = isRailway 
        ? `/api/temp/videos/${videoFinal.nameArchivo}`
        : `/final_videos/${videoFinal.nameArchivo}`;

      // Broadcast video completion event to all connected clients
      broadcastLog(
        `SENDING video_completion EVENT TO ${clients.length} clients`
      );
      broadcastLog(
        `Event data: videoPath=${videoUrl}, videoName=${videoFinal.nameArchivo}`
      );

      clients.forEach((client) => {
        try {
          const eventData = {
            type: "video_completion",
            videoPath: videoUrl,
            videoName: videoFinal.nameArchivo,
            videoSize: videoSizeBytes,
            processDuration: processDurationSeconds,
            timestamp: Date.now(),
            isRailway: isRailway,
            downloadUrl: isRailway ? videoUrl : null, // URL especial para descarga en Railway
            autoDownload: isRailway, // Indicar si debe auto-descargar
          };
          client.write(`data: ${JSON.stringify(eventData)}\n\n`);
          broadcastLog(`Event sent to client`);
        } catch (error) {
          broadcastLog(`Error sending event to client: ${error.message}`);
        }
      });

      broadcastLog("VIDEO COMPLETED EVENT SENT TO DASHBOARD");

      if (isRailway) {
        broadcastLog("Railway: Video ready for immediate download");
        broadcastLog(`Download URL: ${videoUrl}`);
      }
      
    } catch (eventError) {
      broadcastLog(
        `Error sending event (non-critical): ${eventError.message}`
      );
    }



    // ============================================================================
    // AUTOMATIC CLEANUP OF TEMPORARY IMAGES
    // ============================================================================
    broadcastLog("Starting cleanup of temporary files...");

    try {
      // Clean original image from /uploads
      if (session.image && fs.existsSync(session.image)) {
        fs.unlinkSync(session.image);
        broadcastLog(`Cleaned original image: ${session.image}`);
      }

      // Clean transformed image from /images/modified
      if (imageData.finalImagePath && fs.existsSync(imageData.finalImagePath)) {
        fs.unlinkSync(imageData.finalImagePath);
        broadcastLog(
          `Cleaned transformed image: ${imageData.finalImagePath}`
        );
      }

      broadcastLog("Cleanup completed - Only the final video remains");
    } catch (cleanupError) {
      broadcastLog(
        `Error sending cleanup (non-critical): ${cleanupError.message}`
      );
    }

    // Clean session
    videoSessions.delete(sessionId);
  } catch (error) {
    broadcastLog(`Unexpected error: ${error.message}`);
    broadcastLog("Stack trace for debugging:");
    broadcastLog(error.stack || "No stack available");

    videoSessions.delete(sessionId);
  }
});

// Endpoint para rechazar script
app.post("/api/video/reject/:sessionId", requireAuth, (req, res) => {
  const { sessionId } = req.params;
  const session = videoSessions.get(sessionId);

  if (!session) {
    return res.json({ success: false, message: "Session not found" });
  }

  broadcastLog("PROCESS CANCELLED");
  broadcastLog("The script was not approved.");
  broadcastLog("You can try with another query.");

  videoSessions.delete(sessionId);

  res.json({ success: true, message: "Script rejected" });
});

// Endpoint para obtener estadísticas (RAILWAY COMPATIBLE)
app.get("/api/stats", requireAuth, (req, res) => {
  try {
    // Contar archivos en carpetas (Railway compatible)
    const videosDir = STORAGE_CONFIG.videos;
    const audioDir = STORAGE_CONFIG.audios;

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

    // En Railway, incluir stats de archivos temporales
    const railwayStats = isRailway ? getTempFileStats() : null;

    res.json({
      vectores: 84, // Valor fijo por ahora
      videos: videosCount,
      audios: audiosCount,
      exito: videosCount > 0 ? "100%" : "0%",
      scraperActive: scraperProcess !== null,
      botActive: botProcess !== null,
      environment: isRailway ? 'Railway (Production)' : 'Local Development',
      storage: {
        type: isRailway ? 'Temporary' : 'Persistent',
        videosDir: videosDir,
        audioDir: audioDir
      },
      railway: railwayStats,
      autoRAG: {
        enabled: true,
        schedules: ['06:00', '10:00', '14:00', '18:00'],
        timezone: "America/Mexico_City",
        lastRun: autoRAGStatus.lastRun 
          ? new Date(autoRAGStatus.lastRun).toLocaleString('es-MX')
          : 'Nunca ejecutado',
        lastRunSuccess: autoRAGStatus.lastRunSuccess,
        nextRun: autoRAGStatus.nextScheduledRun
          ? new Date(autoRAGStatus.nextScheduledRun).toLocaleString('es-MX')
          : 'Calculando...',
        totalRuns: autoRAGStatus.totalRuns,
        successfulRuns: autoRAGStatus.successfulRuns
      }
    });
  } catch (error) {
    res.json({
      vectores: 0,
      videos: 0,
      audios: 0,
      exito: "0%",
      scraperActive: false,
      botActive: false,
      environment: isRailway ? 'Railway (Production)' : 'Local Development',
      error: error.message,
      autoRAG: {
        enabled: true,
        schedules: ['06:00', '10:00', '14:00', '18:00'],
        timezone: "America/Mexico_City",
        lastRun: 'Error',
        nextRun: 'Error'
      }
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
      `[Carousel] Found ${images.length} images: ${images.join(", ")}`
    );
  } catch (error) {
    console.error("[Images] Error reading images:", error.message);
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
          `[Carousel] Searching for ${countryCode} news from domain: ${config.domain}`
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
            `[Carousel] Found ${countryNews.length} news from ${config.source} domain`
          );
        } else {
          // 2. FALLBACK: Buscar por términos del país (menos confiable)
          console.log(
            `[Carousel] No domain matches for ${config.domain}, trying country terms...`
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
                `[Carousel] Found ${countryNews.length} news using country term: ${term}`
              );
              break;
            }
          }
        }

        if (!countryNews || countryNews.length === 0) {
          console.log(
            `[Carousel] No news found for ${countryCode} (tried: ${searchTerms.join(
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
              `[Carousel] Skipping mismatched source: ${source} from ${link} (expected domains: ${allDomainsForCountry.join(
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

        console.log(`[Carousel] Found 2 news for ${countryCode}`);
      } catch (countryError) {
        console.error(
          `[Carousel] Error processing ${countryCode}:`,
          countryError.message
        );
      }
    }

    // Verificar que tenemos al menos algunas noticias
    if (carouselNews.length === 0) {
      console.log(`[Carousel] No news found in database`);
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
      `[Carousel] Fetched and cached ${shuffledNews.length} news items`
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
    console.error(`[Carousel] Unexpected error:`, error.message);
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
    console.error("[Images API] Error:", error);
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
    console.error("[Videos API] Error:", error);
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
      `[Videos API] Found ${allVideos.length} videos, returning 4 random`
    );

    res.json({
      success: true,
      videos: randomVideos,
      totalVideos: allVideos.length,
    });
  } catch (error) {
    console.error("[Videos API] Error:", error);
    res.json({
      success: false,
      message: "Error loading videos",
      videos: [],
    });
  }
});





// Endpoint para limpiar logs
app.post("/api/logs/clear", requireAuth, (req, res) => {
  broadcastLog("Logs limpiados");
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
    "Carousel cache cleared - next load will use improved filters"
  );
  res.json({ success: true, message: "Carousel cache cleared" });
});

// ============================================================================
// RAILWAY TEMPORARY FILE ENDPOINTS - Descarga de archivos temporales
// ============================================================================

// Endpoint para descargar videos temporales en Railway
app.get('/api/temp/videos/:filename', (req, res) => {
  console.log(`Railway download request: ${req.params.filename}`);
  
  if (!isRailway) {
    console.log('Not in Railway environment');
    return res.status(404).json({ error: 'Only available in Railway environment' });
  }
  
  const { filename } = req.params;
  console.log(`Looking for temp file: ${filename}`);
  
  const fileInfo = getTempFileInfo(filename);
  
  if (!fileInfo) {
    console.log(`File info not found for: ${filename}`);
    console.log('Available temp files:', Object.keys(tempFileCache || {}));
    return res.status(404).json({ error: 'File not found or expired' });
  }
  
  const filePath = fileInfo.path;
  console.log(`File path: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Physical file not found: ${filePath}`);
    return res.status(404).json({ error: 'Physical file not found' });
  }
  
  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    
    // Marcar como descargado
    markAsDownloaded(filename);
    
    // Configurar headers para descarga CON CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Stream del archivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    console.log(`📥 Railway: Video downloaded - ${filename}`);
    
  } catch (error) {
    console.error(`Railway download error: ${error.message}`);
    res.status(500).json({ error: 'Download failed' });
  }
});



// Endpoint para obtener estadísticas de archivos temporales (Railway)
app.get('/api/temp/stats', (req, res) => {
  if (!isRailway) {
    return res.json({ 
      railway: false, 
      message: 'Local development mode' 
    });
  }
  
  const stats = getTempFileStats();
  
  res.json({
    railway: true,
    environment: 'production',
    tempFiles: stats,
    timestamp: new Date().toISOString()
  });
});

// Endpoint de debug para ver archivos temporales disponibles
app.get('/api/debug/temp-files', (req, res) => {
  console.log('Debug: Listing temporary files...');
  
  const stats = getTempFileStats();
  const tempCacheEntries = Array.from(tempFileCache.entries() || []);
  
  console.log('Current temp files:', tempCacheEntries.length);
  
  res.json({
    environment: isRailway ? 'Railway' : 'Local',
    isRailway,
    tempCacheSize: tempCacheEntries.length,
    tempFiles: tempCacheEntries.map(([filename, info]) => ({
      filename,
      type: info.type,
      path: info.path,
      exists: fs.existsSync(info.path),
      createdAt: new Date(info.createdAt).toISOString(),
      expireAt: new Date(info.expireAt).toISOString(),
      downloaded: info.downloaded
    })),
    stats,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// MODIFICAR ENDPOINTS EXISTENTES PARA RAILWAY COMPATIBILITY
// ============================================================================

// Endpoint para descargar videos con manejo correcto de rangos
app.get('/api/video/download/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    
    let videoDir;
    if (type === 'normal') {
      videoDir = path.join(__dirname, 'final_videos');
    } else {
      return res.status(400).json({ error: 'Invalid video type' });
    }
    
    const videoPath = path.join(videoDir, filename);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(videoPath)) {
      console.log(`Video not found: ${videoPath}`);
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      if (start >= fileSize) {
        res.status(416).send('Range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }
      
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // No range, send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `attachment; filename="${filename}"`
      };
      
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
    
    console.log(`Video download: ${filename} (${type})`);
    
  } catch (error) {
    console.error(`Video download error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint para verificar si un video existe
app.get('/api/video/exists/:type/:filename', (req, res) => {
  try {
    const { type, filename } = req.params;
    
    let videoDir;
    if (type === 'normal') {
      videoDir = path.join(__dirname, 'final_videos');
    } else {
      return res.status(400).json({ error: 'Invalid video type' });
    }
    
    const videoPath = path.join(videoDir, filename);
    const exists = fs.existsSync(videoPath);
    
    if (exists) {
      const stat = fs.statSync(videoPath);
      res.json({
        exists: true,
        size: stat.size,
        sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
        modified: stat.mtime
      });
    } else {
      res.json({ exists: false });
    }
    
  } catch (error) {
    console.error(`Video exists check error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// TEST ENDPOINTS - Para probar el modal de progreso (RAILWAY COMPATIBLE)
// ============================================================================
app.post("/api/test/simulate-video", requireAuth, async (req, res) => {
  try {
    const { action, videoName } = req.body;
    
    if (action === 'simulate_arrival') {
      const timestamp = new Date().toISOString().replace(/[:\-T]/g, '').substring(0, 15);
      const newVideoName = videoName || `test_video_${timestamp}.mp4`;
      
      // Railway compatible paths
      const sourceVideo = isRailway 
        ? path.join(STORAGE_CONFIG.videos, 'demo1.mp4')
        : path.join(__dirname, 'final_videos', 'demo1.mp4');
      const destinationVideo = isRailway 
        ? path.join(STORAGE_CONFIG.videos, newVideoName)
        : path.join(__dirname, 'final_videos', newVideoName);
      
      // Crear video de prueba (si no existe fuente, crear uno simple)
      let videoCreated = false;
      
      if (fs.existsSync(sourceVideo)) {
        fs.copyFileSync(sourceVideo, destinationVideo);
        videoCreated = true;
        broadcastLog(`Test: Video simulado copiado - ${newVideoName}`);
      } else {
        // Crear video de prueba mínimo (100KB de datos dummy)
        const dummyVideoData = Buffer.alloc(100 * 1024, 0); // 100KB dummy data
        fs.writeFileSync(destinationVideo, dummyVideoData);
        videoCreated = true;
        broadcastLog(`Test: Video dummy creado - ${newVideoName} (100KB)`);
      }
      
      if (videoCreated) {
        // En Railway, registrar archivo temporal
        if (isRailway) {
          registerTempFile(newVideoName, destinationVideo, 'video', 30);
          broadcastLog(`Railway: Test video registrado para descarga temporal`);
        }
        
        // Simular el evento de video completado
        setTimeout(() => {
          const videoStats = fs.statSync(destinationVideo);
          
          // Railway compatible video path
          const videoPath = isRailway 
            ? `/api/temp/videos/${newVideoName}`
            : `/final_videos/${newVideoName}`;
          
          const videoData = {
            type: 'video_completion',
            videoPath: videoPath,
            videoName: newVideoName,
            videoSize: videoStats.size,
            size: `${(videoStats.size / (1024 * 1024)).toFixed(2)} MB`,
            sessionId: 'test_session_' + timestamp,
            isRailway: isRailway,
            autoDownload: isRailway,
            downloadUrl: isRailway ? videoPath : null
          };
          
          // Enviar evento SSE
          clients.forEach(client => {
            try {
              client.write(`data: ${JSON.stringify(videoData)}\n\n`);
              console.log('Test video completion event sent to client');
            } catch (e) {
              console.log('Error sending test event:', e.message);
            }
          });
          
          broadcastLog(`Test: Event video_completion sent for ${newVideoName}`);
          console.log('Test video data sent:', videoData);
          
          if (isRailway) {
            broadcastLog(`Railway: Test video ready for download at ${videoPath}`);
          }
          
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
      `Access denied al panel admin: ${req.user.username} (${req.user.role})`
    );
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only.",
    });
  }

  broadcastLog(`Acceso admin autorized: ${req.user.username}`);
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
  console.log(`🚀 Server running on http://localhost:${PORT}`);

  
  
  // Inicializar sistema de storage (Railway compatible)
  initStorage();
  
  // Iniciar watcher de videos (solo en desarrollo local)
  if (!isRailway) {
    setupVideoWatcher();
  } else {
    
  }
  
  // Iniciar scraper automático con horarios específicos
  setupAutoRAG();
});

// ============================================================================
// FILE WATCHER - Detectar videos nuevos automáticamente
// ============================================================================
function setupVideoWatcher() {
  const finalVideosPath = path.join(__dirname, 'final_videos');
  
  console.log('📁 Setting up video file watcher...');
  
  // Watcher para final_videos
  const watcher = chokidar.watch([finalVideosPath], {
    ignored: /^\./, 
    persistent: true,
    ignoreInitial: true // Solo nuevos archivos, no los existentes
  });
  
  watcher.on('add', (filePath) => {
    if (path.extname(filePath).toLowerCase() === '.mp4') {
      const videoName = path.basename(filePath);
      const videoStats = fs.statSync(filePath);
      
      console.log(`🎬 New video detected: ${videoName}`);
      
      // Generar evento de video completado
      setTimeout(() => {
        const videoData = {
          type: 'video_completion',
          videoPath: `/final_videos/${videoName}`,
          videoName: videoName,
          videoSize: videoStats.size,
          size: `${(videoStats.size / (1024 * 1024)).toFixed(2)} MB`,
          sessionId: 'auto_detected_' + Date.now(),
          isSubtitled: false
        };
        
        // Enviar evento SSE a todos los clientes
        clients.forEach(client => {
          try {
            client.write(`data: ${JSON.stringify(videoData)}\n\n`);
          } catch (e) {
            console.log('Error sending auto-detected video event:', e.message);
          }
        });
        
        broadcastLog(`Auto-detected video: ${videoName} - Event sent to clients`);
        console.log('Auto-detected video data:', videoData);
      }, 500); // Small delay to ensure file is fully written
    }
  });
  
  watcher.on('error', (error) => {
    console.error('📁 File watcher error:', error);
  });
  
  console.log('✅ Video file watcher active');
  return watcher;
}

// ============================================================================
// AUTO RAG SCRAPER - Ejecutar a horas específicas diariamente
// ============================================================================

// Variable global para tracking de ejecuciones
let autoRAGStatus = {
  lastRun: null,
  lastRunSuccess: null,
  nextScheduledRun: null,
  totalRuns: 0,
  successfulRuns: 0,
  failedRuns: 0
};

function setupAutoRAG() {
  
  
  // Verificar timezone actual
  const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  
  // Si estamos en Railway/Production, asegurar que el timezone esté configurado
  if (process.env.NODE_ENV === 'production' && !process.env.TZ) {
    process.env.TZ = 'America/Mexico_City';
    // Setting timezone for Railway
  }
  
  // Configurar horarios específicos: 6:00 AM, 10:00 AM, 2:00 PM, 6:00 PM
  // IMPORTANTE: Estos horarios son en la zona horaria configurada (Mexico City)
  const schedules = [
    { time: '0 6 * * *', name: '06:00', hour: 6 },   // 6:00 AM todos los días
    { time: '0 10 * * *', name: '10:00', hour: 10 }, // 10:00 AM todos los días  
    { time: '0 14 * * *', name: '14:00', hour: 14 }, // 2:00 PM todos los días
    { time: '0 18 * * *', name: '18:00', hour: 18 }  // 6:00 PM todos los días
  ];
  
  // Configurar cada tarea programada
  schedules.forEach(schedule => {
    const task = cron.schedule(schedule.time, () => {
      const now = new Date();
      const currentHourMX = now.toLocaleString('es-MX', { 
        timeZone: 'America/Mexico_City', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      console.log(`AUTO RAG: Starting scheduled update at ${schedule.name}`);
      console.log(`Mexico current time: ${currentHourMX}, System time: ${now.toLocaleTimeString()}`);
      broadcastLog(`AUTO RAG: Scheduled update started (${schedule.name})`);
      
      // Actualizar stats
      autoRAGStatus.totalRuns++;
      autoRAGStatus.lastRun = new Date().toISOString();
      
      // Ejecutar scraper
      runAutoScraper(`scheduled_${schedule.name}`, schedule.name);
    }, {
      timezone: "America/Mexico_City", // Zona horaria México
      scheduled: true
    });
    
    // Scheduled: ${schedule.name}
    
  });
  
  // Calcular próxima ejecución
  calculateNextRun(schedules);
  
    
  
  
  // Timezone verification skipped
}

// Calcular próxima ejecución programada
function calculateNextRun(schedules) {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Encontrar la próxima hora programada
    const scheduledHours = schedules.map(s => s.hour).sort((a, b) => a - b);
    let nextHour = null;
    
    for (const hour of scheduledHours) {
      if (hour > currentHour || (hour === currentHour && currentMinute < 5)) {
        nextHour = hour;
        break;
      }
    }
    
    // Si no hay ninguna hora mayor hoy, la próxima es la primera de mañana
    if (nextHour === null) {
      nextHour = scheduledHours[0];
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(nextHour, 0, 0, 0);
      autoRAGStatus.nextScheduledRun = tomorrow.toISOString();
    } else {
      const nextRun = new Date(now);
      nextRun.setHours(nextHour, 0, 0, 0);
      autoRAGStatus.nextScheduledRun = nextRun.toISOString();
    }
    
    const nextRunDate = new Date(autoRAGStatus.nextScheduledRun);
    console.log(`Next auto-scraper: ${nextRunDate.toLocaleString('es-MX')}`);
    
  } catch (error) {
    console.error('Error calculando próxima ejecución:', error.message);
  }
}

// Función para ejecutar el scraper automáticamente
function runAutoScraper(source = 'auto', scheduleName = null) {
  // Verificar si ya hay un scraper ejecutándose
  if (scraperProcess !== null) {
    broadcastLog(`AUTO RAG: Scraper is already running - skipping scheduled run`);
    console.log('AUTO RAG: Skipping scheduled run - scraper already running');
    
    // Contar como fallida
    if (source.startsWith('scheduled_')) {
      autoRAGStatus.failedRuns++;
    }
    return;
  }
  
  try {
    const isScheduled = source.startsWith('scheduled_');
    const displayName = scheduleName ? `a las ${scheduleName} hrs` : `(${source})`;

    broadcastLog(`AUTO RAG: Starting scraper ${isScheduled ? 'AUTOMÁTICO' : 'MANUAL'} ${displayName}`);
    console.log(`AUTO RAG: Starting ${isScheduled ? 'automatic' : 'manual'} scraper from ${source}`);
    
    scraperProcess = spawn("node", ["scraper-4-paises-final.js"], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'] // Para capturar output
    });

    scraperProcess.stdout.on("data", (data) => {
      const lines = data
        .toString()
        .split("\n")
        .filter((line) => line.trim());
      lines.forEach((line) => {
        console.log(`${isScheduled ? 'AUTO' : 'MANUAL'} RAG: ${line}`);
        broadcastLog(`${isScheduled ? 'AUTO' : 'MANUAL'} RAG: ${line}`);
      });
    });

    scraperProcess.stderr.on("data", (data) => {
      const errorMsg = data.toString();
      console.error(`AUTO RAG Error: ${errorMsg}`);
      broadcastLog(`AUTO RAG Error: ${errorMsg}`);
    });

    scraperProcess.on("close", (code) => {
      const success = code === 0;
      
      if (success) {
        broadcastLog(`${isScheduled ? 'AUTO' : 'MANUAL'} RAG: Update completed successfully ${displayName}`);
        console.log(`AUTO RAG: Completed successfully from ${source}`);
        
        // Actualizar stats
        if (isScheduled) {
          autoRAGStatus.successfulRuns++;
          autoRAGStatus.lastRunSuccess = true;
        }
      } else {
        broadcastLog(`${isScheduled ? 'AUTO' : 'MANUAL'} RAG: Failed with code ${code} ${displayName}`);
        console.error(`AUTO RAG: Failed with code ${code} from ${source}`);
        
        // Actualizar stats
        if (isScheduled) {
          autoRAGStatus.failedRuns++;
          autoRAGStatus.lastRunSuccess = false;
        }
      }
      
      scraperProcess = null;
      
      // Enviar notificación de finalización
      broadcastLog(`${isScheduled ? 'AUTO' : 'MANUAL'} RAG: Database updated, system ready to generate videos`);
      
      // Recalcular próxima ejecución si es programada
      if (isScheduled) {
        const schedules = [
          { time: '0 6 * * *', name: '06:00', hour: 6 },
          { time: '0 10 * * *', name: '10:00', hour: 10 },
          { time: '0 14 * * *', name: '14:00', hour: 14 },
          { time: '0 18 * * *', name: '18:00', hour: 18 }
        ];
        calculateNextRun(schedules);
      }
    });

    scraperProcess.on("error", (error) => {
      console.error(`AUTO RAG Process Error: ${error.message}`);
      broadcastLog(`AUTO RAG Process Error: ${error.message}`);
      scraperProcess = null;
      
      // Actualizar stats
      if (isScheduled) {
        autoRAGStatus.failedRuns++;
        autoRAGStatus.lastRunSuccess = false;
      }
    });
    
  } catch (error) {
    console.error(`AUTO RAG: Error starting scraper: ${error.message}`);
    broadcastLog(`AUTO RAG: Error starting scraper: ${error.message}`);
    scraperProcess = null;
    
    // Actualizar stats
    if (source.startsWith('scheduled_')) {
      autoRAGStatus.failedRuns++;
      autoRAGStatus.lastRunSuccess = false;
    }
  }
}

// Endpoint para configurar/ver horarios de RAG automático
app.get("/api/rag/schedule", requireAuth, (req, res) => {
  const schedules = [
    { time: '06:00', cron: '0 6 * * *', description: 'Morning update' },
    { time: '10:00', cron: '0 10 * * *', description: 'Mid-morning update' },
    { time: '14:00', cron: '0 14 * * *', description: 'Afternoon update' },
    { time: '18:00', cron: '0 18 * * *', description: 'Evening update' }
  ];
  
  const status = {
    enabled: true,
    timezone: 'America/Mexico_City',
    schedules: schedules,
    lastRun: autoRAGStatus.lastRun 
      ? new Date(autoRAGStatus.lastRun).toLocaleString('es-MX') 
      : 'Nunca ejecutado',
    lastRunSuccess: autoRAGStatus.lastRunSuccess,
    nextRun: autoRAGStatus.nextScheduledRun 
      ? new Date(autoRAGStatus.nextScheduledRun).toLocaleString('es-MX')
      : 'Calculando...',
    scraperActive: scraperProcess !== null,
    stats: {
      totalRuns: autoRAGStatus.totalRuns,
      successfulRuns: autoRAGStatus.successfulRuns,
      failedRuns: autoRAGStatus.failedRuns,
      successRate: autoRAGStatus.totalRuns > 0 
        ? Math.round((autoRAGStatus.successfulRuns / autoRAGStatus.totalRuns) * 100) + '%'
        : 'N/A'
    }
  };
  
  res.json({ success: true, autoRAG: status });
});

// Endpoint para ejecutar RAG manualmente (sin interferir con automático)
app.post("/api/rag/run-now", requireAuth, (req, res) => {
  if (scraperProcess !== null) {
    return res.json({
      success: false,
      message: "RAG scraper is already running. Please wait until it finishes."
    });
  }
  
  broadcastLog("RAG: Manual execution requested by user");
  runAutoScraper('manual_dashboard', 'MANUAL');
  
  res.json({
    success: true,
    message: "RAG scraper started manually. Check the logs to follow the progress."
  });
});



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
