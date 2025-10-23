# 🚀 Railway Deployment Guide
## Mango AI Video Generator

### ✅ Pre-deployment Checklist

Tu aplicación está **100% lista** para Railway! Los siguientes elementos han sido configurados:

- ✅ `PORT` dinámico configurado (`process.env.PORT || 3000`)
- ✅ `Procfile` optimizado para Railway
- ✅ `package.json` con configuraciones Railway
- ✅ Variables de entorno documentadas
- ✅ Rutas estáticas optimizadas
- ✅ Gestión de memoria para entorno cloud
- ✅ Directorios con `.gitkeep` para estructura

---

## 🔧 Variables de Entorno Requeridas

Configura estas variables en Railway Dashboard **antes del deploy**:

### 🚨 **CRÍTICAS** (Sin estas no funcionará):
```env
OPENAI_API_KEY=sk-your-openai-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
HEDRA_API_KEY=your-hedra-api-key
ELEVENLABS_API_KEY=your-elevenlabs-key
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

### 📢 **VOCES** (Para sistema de audio):
```env
ELEVENLABS_VOICE_ID=your-default-female-voice
ELEVENLABS_VOICE_ID_MALE=your-male-voice-id
```

### 🤖 **TELEGRAM** (Opcional pero recomendado):
```env
BOT_TOKEN=your-telegram-bot-token
CHAT_ID=your-telegram-chat-id
```

### 🎨 **AVANZADAS** (Opcionales):
```env
GOOGLE_AI_API_KEY=your-gemini-key
ENABLE_INFLUENCER_TRANSFORM=true
NODE_ENV=production
```

---

## 📋 Pasos de Despliegue

### 1. **Conectar Repositorio**
- Ve a [Railway.app](https://railway.app)
- Conecta tu cuenta GitHub
- Selecciona este repositorio

### 2. **Configurar Variables**
- En Railway Dashboard → Variables
- Añade **todas** las variables de arriba
- ⚠️ **IMPORTANTE**: Sin `OPENAI_API_KEY`, `SUPABASE_URL`, `HEDRA_API_KEY` no funcionará

### 3. **Deploy Automático**
- Railway detectará automáticamente:
  - `package.json` → Node.js app
  - `Procfile` → Comando de inicio optimizado
  - `server.js` → Entry point

### 4. **Verificación Post-Deploy**
```bash
# Railway te dará una URL como:
https://your-app-name.railway.app

# Verifica estos endpoints:
GET /                    # → Dashboard (requiere login)
GET /login.html          # → Página de login
GET /api/stats          # → Estadísticas del sistema
POST /api/auth/login    # → Sistema de autenticación
```

---

## 🔍 Testing en Railway

### **Crear Usuario Admin** (Primera vez):
```javascript
// En Railway terminal o consola:
const { crearUser } = require('./modules/auth-manager');
await crearUser('admin', 'tu-password', 'Administrator', 'admin@tu-dominio.com', 'admin');
```

### **Probar Sistema Completo**:
1. **Login** → `https://tu-app.railway.app/login.html`
2. **Dashboard** → Upload foto + query
3. **Scraper** → Botón "Start Scraper" para cargar noticias
4. **Video Generation** → Should work end-to-end

---

## 🚨 Troubleshooting

### **Error: Cannot connect to Railway**
- ✅ Verifica que PORT sea dinámico: `process.env.PORT || 3000`
- ✅ Check Procfile: `web: node --max-old-space-size=512 server.js`

### **Error: Missing environment variables**
- ✅ All critical variables set in Railway Dashboard
- ✅ No spaces in variable names
- ✅ Copy keys exactly (no extra quotes)

### **Error: 500 Internal Server Error**
- ✅ Check Railway logs: Dashboard → Deployments → View Logs
- ✅ Verify Supabase connection
- ✅ Verify OpenAI API key is valid

### **Videos no se generan**
- ✅ Check `HEDRA_API_KEY` and `ELEVENLABS_API_KEY`
- ✅ Verify credit/quota on both services
- ✅ Check Railway logs for API errors

---

## 🎯 Performance en Railway

### **Recursos Optimizados**:
- Memory limit: 512MB (configurado en Procfile)
- Auto garbage collection cada 30s
- Error handling para uncaught exceptions
- Procesos background optimizados

### **File Storage**:
- Videos se almacenan en `/final_videos`
- Uploads temporales en `/uploads`
- Auto-cleanup después de procesamiento

---

## 🚀 Tu App Está Lista!

Todo configurado para Railway. Solo necesitas:

1. **Subir a GitHub** (si no lo has hecho)
2. **Conectar a Railway**
3. **Configurar variables de entorno**
4. **Deploy automático**

¡El sistema funcionará igual que en local pero en la nube! 🌩️

---

### 📞 Support

Si tienes problemas:
1. Check Railway logs first
2. Verify all environment variables
3. Test API keys individually
4. Check Supabase connection

**Railway Dashboard URL**: https://railway.app/dashboard