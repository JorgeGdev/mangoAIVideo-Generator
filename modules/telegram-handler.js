const TelegramBot = require('node-telegram-bot-api');

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const IMAGENES_DISPONIBLES = ['sofia1', 'sofia2', 'sofia3', 'sofia4', 'sofia5', 'sofia6', 'sofia7', 'sofia8', 'sofia9'];

// Initialize bot with better error handling
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

// Status de sesiones activas
const sesionesActivas = new Map();

console.log('🤖 TELEGRAM HANDLER INITIALIZED');
console.log('📱 Waiting messages...');

// Verificar bot con retry
async function verificarBot() {
  try {
    const info = await bot.getMe();
    console.log(`✅ Bot conectado: @${info.username}`);
    return true;
  } catch (error) {
    console.error('❌ Error conectando bot:', error.message);
    console.log('🔄 Reintentando conexión en 5 segundos...');
    setTimeout(verificarBot, 5000);
    return false;
  }
}

verificarBot();

// Function para enviar messages con retry
async function enviarMensaje(chatId, texto, reintentos = 3) {
  for (let i = 0; i < reintentos; i++) {
    try {
      await bot.sendMessage(chatId, texto);
      return true;
    } catch (error) {
      console.error(`❌ Error sending message (intento ${i + 1}/${reintentos}):`, error.message);
      if (i === reintentos - 1) {
        console.error('Max retries reached - message not sent');
        return false;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Function para validar formato de message
function validarMensaje(texto) {
  if (!texto || !texto.includes('@')) {
    return {
      valido: false,
      error: `Formato: image@query\n📸 Imágenes: ${IMAGENES_DISPONIBLES.join(', ')}\n💡 Ejemplo:`
    };
  }

  const [imageName, query] = texto.split('@');
  const imageClean = imageName.trim().toLowerCase();
  const queryClean = query.trim();

  if (!IMAGENES_DISPONIBLES.includes(imageClean)) {
    return {
      valido: false,
      error: `❌ Image no disponible: ${imageClean}\n📸 Options: ${IMAGENES_DISPONIBLES.join(', ')}`
    };
  }

  if (queryClean.length < 3) {
    return {
      valido: false,
      error: '❌ Query muy corta. Mínimo 3 caracteres.'
    };
  }

  return {
    valido: true,
    image: imageClean,
    query: queryClean
  };
}

// Function para manejar aprobaciones
function manejarAprobacion(chatId, response, callback) {
  if (!sesionesActivas.has(chatId)) {
    enviarMensaje(chatId, '⚠️ No hay ningún script pendiente de aprobación');
    return;
  }

  const sesion = sesionesActivas.get(chatId);
  
  if (response === 'si' || response === 'sí') {
    enviarMensaje(chatId, '✅ Script approved - Continuando con el proceso...');
    sesionesActivas.delete(chatId);
    callback(null, sesion);
  } else {
    enviarMensaje(chatId, '❌ PROCESO CANCELADO\n\nEl script no fue aprobado.\nPuedes intentar con otra query.');
    sesionesActivas.delete(chatId);
    callback('cancelado', null);
  }
}

// Function para registrar sesión pendiente
function registrarSesion(chatId, dataSecion) {
  sesionesActivas.set(chatId, dataSecion);
}

// Function para configurar handlers de messages
function configurarHandlers(onNuevoVideo, onAprobacion) {
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text = msg.text;

      if (chatId.toString() !== CHAT_ID) return;

      // Manejar responses si/no para aprobación
      if (text && ['si', 'sí', 'no'].includes(text.toLowerCase().trim())) {
        const response = text.toLowerCase().trim();
        manejarAprobacion(chatId, response, onAprobacion);
        return;
      }

      // Validar formato del message
      const validacion = validarMensaje(text);
      if (!validacion.valido) {
        await enviarMensaje(chatId, validacion.error);
        return;
      }

      // Procesar nuevo video
      await onNuevoVideo(chatId, validacion.query, validacion.image);

    } catch (error) {
      console.error('❌ Error in message:', error.message);
      await enviarMensaje(msg.chat.id, `❌ Error processing message: ${error.message}`);
    }
  });

  bot.on('polling_error', () => {
    console.log('⚠️ Polling error (reintentando...)');
  });

  bot.on('error', (error) => {
    console.error('❌ Error withl bot:', error.message);
  });
}

// Exportar funciones públicas
module.exports = {
  bot,
  enviarMensaje,
  registrarSesion,
  configurarHandlers,
  CHAT_ID,
  IMAGENES_DISPONIBLES
};