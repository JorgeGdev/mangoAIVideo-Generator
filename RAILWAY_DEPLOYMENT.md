# Railway Deployment Instructions

Este proyecto está listo para deployarse en Railway con las siguientes configuraciones:

## 🚂 Configuración Automática

1. **FFmpeg**: Se instala automáticamente vía `@ffmpeg-installer/ffmpeg`
2. **Storage**: Usa almacenamiento temporal con descarga automática
3. **Environment**: Se detecta automáticamente Railway vs Local

## 🔧 Variables de Entorno Requeridas

Configurar en Railway Dashboard:

### APIs Principales
```
OPENAI_API_KEY=tu_openai_api_key
HEDRA_API_KEY=tu_hedra_api_key
SUPABASE_URL=tu_supabase_url
SUPABASE_KEY=tu_supabase_key
```

### Telegram Bot (Opcional)
```
BOT_TOKEN=tu_bot_token
CHAT_ID=tu_chat_id
```

### ElevenLabs (Opcional - para voces premium)
```
ELEVENLABS_API_KEY=tu_elevenlabs_key
```

## 🎯 Características Railway

### ✅ **Funcionamiento Automático**
- Los videos se generan en `/tmp/` (temporal)
- Descarga automática al completarse
- URLs temporales con TTL de 30 minutos
- Limpieza automática de archivos

### ✅ **Compatibilidad Completa**
- Auto-scraper funciona (4 veces al día)
- Sistema de autenticación
- Subtítulos automáticos
- Todas las APIs funcionan

### ✅ **Optimizaciones Railway**
- Memory management para Railway
- Ephemeral storage compatible
- Health checks configurados
- Error handling robusto

## 🚀 Deployment Steps

1. **Conectar Repository**:
   ```
   railway login
   railway link [your-project]
   ```

2. **Deploy**:
   ```
   railway up
   ```

3. **Configurar Variables**:
   - Ve al Railway Dashboard
   - Agrega todas las variables de entorno
   - El deploy se actualizará automáticamente

## 📋 **Post-Deployment Checklist**

- [ ] Variables de entorno configuradas
- [ ] Supabase conectado (vectores RAG)
- [ ] OpenAI API funcionando
- [ ] Hedra API funcionando
- [ ] Auto-scraper iniciado
- [ ] Sistema de descarga Railway activo

## 🔍 **Verificación**

Una vez deployado, verifica:

1. **Dashboard Login**: `https://tu-app.railway.app/`
2. **API Health**: `https://tu-app.railway.app/api/stats` 
3. **Scheduler**: Ver logs de auto-scraper
4. **Downloads**: Generar un video de prueba

## ⚠️ **Notas Importantes**

### Railway Specifics:
- Los archivos se borran al reiniciar el contenedor
- Videos deben descargarse inmediatamente
- No hay almacenamiento persistente de videos
- URLs de descarga tienen TTL de 30 minutos

### Local vs Railway:
- **Local**: Videos en `./final_videos/` 
- **Railway**: Videos temporales en `/tmp/` con auto-descarga

## 📞 **Troubleshooting**

### Si la descarga automática no funciona:
1. Verificar JavaScript habilitado
2. Verificar que es ambiente Railway
3. Verificar endpoints `/api/temp/videos/*`

### Si FFmpeg falla:
- Railway instala FFmpeg automáticamente
- Verificar logs de startup

### Si faltan variables de entorno:
- Railway Dashboard > Variables
- Redeploy automático al agregar variables