// simulate-video-arrival.js
// Script para simular la llegada de un video nuevo sin generar uno real

const fs = require('fs');
const path = require('path');

function simulateNewVideo() {
  const sourceVideo = path.join(__dirname, 'final_videos', 'demo1.mp4');
  
  // Generar timestamp ACTUAL con formato correcto YYYYMMDD_HHMMSS
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  const newVideoName = `video_${timestamp}.mp4`;
  const destinationVideo = path.join(__dirname, 'final_videos', newVideoName);
  
  try {
    // Verificar que el video fuente existe
    if (!fs.existsSync(sourceVideo)) {
      console.error('❌ Video fuente no encontrado:', sourceVideo);
      console.log('📁 Videos disponibles:');
      const videos = fs.readdirSync(path.join(__dirname, 'final_videos'));
      videos.forEach(v => console.log('   -', v));
      return;
    }
    
    // Copiar el video con nuevo nombre
    fs.copyFileSync(sourceVideo, destinationVideo);
    
    console.log('✅ Video simulado creado:');
    console.log('📁 Ubicación:', destinationVideo);
    console.log('📊 Tamaño:', fs.statSync(destinationVideo).size, 'bytes');
    console.log('🕐 Timestamp:', timestamp, '(Current time)');
    console.log('');
    console.log('🎯 Ahora el sistema debería detectar este video automáticamente');
    console.log('💡 Si tienes el servidor corriendo, debería aparecer en el modal');
    console.log('');
    console.log('🧪 Para probar:');
    console.log('1. Asegúrate de que el servidor esté corriendo (node server.js)');
    console.log('2. Abre el dashboard en el navegador');
    console.log('3. Inicia una generación de video para abrir el modal');
    console.log('4. El video debería aparecer automáticamente');
    
  } catch (error) {
    console.error('❌ Error copiando video:', error.message);
  }
}

// También crear una versión con subtítulos
function simulateSubtitledVideo() {
  const sourceVideo = path.join(__dirname, 'final_videos', 'demo1.mp4');
  
  // Generar timestamp ACTUAL
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
  const newVideoName = `video_${timestamp}_subtitled.mp4`;
  
  // Crear directorio de subtítulos si no existe
  const subtitledDir = path.join(__dirname, 'final_videos_subtitled');
  if (!fs.existsSync(subtitledDir)) {
    fs.mkdirSync(subtitledDir, { recursive: true });
  }
  
  const destinationVideo = path.join(subtitledDir, newVideoName);
  
  try {
    if (!fs.existsSync(sourceVideo)) {
      console.error('❌ Video fuente no encontrado:', sourceVideo);
      return;
    }
    
    fs.copyFileSync(sourceVideo, destinationVideo);
    
    console.log('✅ Video con subtítulos simulado:');
    console.log('📁 Ubicación:', destinationVideo);
    console.log('📊 Tamaño:', fs.statSync(destinationVideo).size, 'bytes');
    console.log('🕐 Timestamp:', timestamp, '(Current time)');
    
  } catch (error) {
    console.error('❌ Error copiando video con subtítulos:', error.message);
  }
}

// Ejecutar según argumento
const comando = process.argv[2];

if (comando === 'subtitled') {
  simulateSubtitledVideo();
} else {
  simulateNewVideo();
}

console.log('');
console.log('💡 Comandos disponibles:');
console.log('   node simulate-video-arrival.js        - Simula video normal');
console.log('   node simulate-video-arrival.js subtitled - Simula video con subtítulos');