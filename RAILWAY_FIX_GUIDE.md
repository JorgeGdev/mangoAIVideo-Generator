# 🚂 RAILWAY DEPLOYMENT - FIX GUIDE
## Solución para Errores de Scraper y Cron Jobs

---

## 🔍 PROBLEMAS IDENTIFICADOS

### ❌ Problema 1: Error de Node.js
```
ReferenceError: File is not defined
at Object.<anonymous> (/app/node_modules/undici/lib/web/webidl/index.js:531:48)
```

**Causa**: Node.js v18.20.8 tiene incompatibilidad con `undici` (usado por axios)  
**Solución**: Actualizar a Node.js v20+

### ❌ Problema 2: Cron Jobs no ejecutándose
```
Scraper automático NO se ejecuta a las 06:00, 10:00, 14:00, 18:00
```

**Causa**: Railway usa UTC por defecto, causando desfase de timezone  
**Solución**: Configurar TZ=America/Mexico_City correctamente

---

## ✅ SOLUCIONES IMPLEMENTADAS

### 1. **Dockerfile Actualizado**
- ✅ Node.js v20-alpine (en lugar de v18)
- ✅ Instalación de `tzdata` para soporte de timezones
- ✅ Variable de entorno `TZ=America/Mexico_City`
- ✅ Garbage collection habilitado (`--expose-gc`)

### 2. **Package.json Actualizado**
- ✅ Engine requirement: Node.js >=20.0.0

### 3. **Server.js Mejorado**
- ✅ Verificación de timezone al iniciar
- ✅ Configuración explícita de TZ en producción
- ✅ Logs detallados de horarios (sistema, México, UTC)
- ✅ Cron jobs con timezone explícito

### 4. **Scraper Mejorado**
- ✅ Detección de versión de Node.js
- ✅ Mensajes de diagnóstico específicos
- ✅ Exit codes correctos para debugging

---

## 🚀 PASOS PARA DEPLOYMENT EN RAILWAY

### **PASO 1: Actualizar Railway Settings**

1. Ve a tu proyecto en Railway: https://railway.app/dashboard
2. Selecciona tu servicio
3. Ve a **Settings** → **Environment**
4. Asegúrate de tener estas variables configuradas:

```bash
NODE_ENV=production
TZ=America/Mexico_City
PORT=3000

# Tus API keys existentes (NO las cambies)
SUPABASE_URL=...
SUPABASE_KEY=...
OPENAI_API_KEY=...
ELEVENLABS_API_KEY=...
HEDRA_API_KEY=...
BOT_TOKEN=...
CHAT_ID=...
```

### **PASO 2: Forzar Rebuild**

1. En Railway, ve a **Deployments**
2. Click en el último deployment fallido
3. Click en **"Redeploy"** o **"Trigger Deploy"**
4. Railway detectará el nuevo Dockerfile y usará Node.js v20

### **PASO 3: Verificar Build Logs**

Espera a que termine el build y busca estas líneas:

```
✅ Using Node.js v20.x.x
✅ Installing tzdata
✅ Setting TZ=America/Mexico_City
```

### **PASO 4: Verificar Runtime Logs**

Una vez desplegado, busca en los logs:

```
🌍 Current system timezone: America/Mexico_City
📅 RAG automático configurado: 06:00, 10:00, 14:00, 18:00 hrs (México)
✅ Programado RAG automático: 06:00 hrs (0 6 * * *)
✅ Programado RAG automático: 10:00 hrs (0 10 * * *)
✅ Programado RAG automático: 14:00 hrs (0 14 * * *)
✅ Programado RAG automático: 18:00 hrs (0 18 * * *)
```

### **PASO 5: Probar Scraper Manual**

1. Abre tu dashboard en Railway: `https://tu-app.railway.app`
2. Click en **"Update News"**
3. Verifica que NO aparezca el error `File is not defined`
4. Deberías ver logs normales del scraper

---

## 🕐 VERIFICACIÓN DE HORARIOS

### **Horarios Programados (Hora México City)**
- 🌅 **06:00 AM** - Actualización matutina
- ☕ **10:00 AM** - Actualización media mañana  
- 🌞 **02:00 PM** - Actualización tarde
- 🌆 **06:00 PM** - Actualización vespertina

### **Equivalencia en UTC (para debugging)**
México (America/Mexico_City) = UTC-6 (horario estándar) o UTC-5 (horario de verano)

**Horario Estándar (Invierno)**:
- 06:00 MX = 12:00 UTC
- 10:00 MX = 16:00 UTC
- 14:00 MX = 20:00 UTC
- 18:00 MX = 00:00 UTC (día siguiente)

**Horario de Verano**:
- 06:00 MX = 11:00 UTC
- 10:00 MX = 15:00 UTC
- 14:00 MX = 19:00 UTC
- 18:00 MX = 23:00 UTC

---

## 📊 MONITOREO POST-DEPLOYMENT

### **1. Verificar que el scraper manual funciona**
```bash
# En los logs deberías ver:
🚀 MANUAL SCRAPER: Iniciando scraper de noticias desde dashboard...
📰 MANUAL: AI VIDEO GENERATOR
📰 MANUAL: Node version: v20.x.x
✅ MANUAL SCRAPER: Completado exitosamente
```

### **2. Verificar próxima ejecución automática**
```bash
# En los logs al iniciar el servidor:
⏰ Próxima ejecución automática: 28/10/2025, 6:00:00 a.m.
```

### **3. Esperar a la próxima ejecución programada**
- El sistema ejecutará automáticamente a las 06:00, 10:00, 14:00, 18:00
- Verás en los logs:
```bash
🕐 AUTO RAG: Iniciando actualización programada a las 06:00
🕐 Hora actual México: 06:00, Hora sistema: 06:00:00
🚀 AUTO RAG: Iniciando scraper AUTOMÁTICO a las 06:00 hrs
```

---

## 🔧 TROUBLESHOOTING

### **Si sigue apareciendo "File is not defined"**
1. Verifica que Railway esté usando Node.js v20:
   - En logs de build busca: `Using Node v20.x.x`
2. Si sigue usando v18, forzar rebuild:
   ```bash
   git commit --allow-empty -m "Force rebuild with Node 20"
   git push
   ```

### **Si el cron job no se ejecuta a la hora correcta**
1. Verifica variable de entorno `TZ`:
   ```bash
   # En Railway Settings → Environment
   TZ=America/Mexico_City
   ```
2. Verifica logs de inicio:
   ```bash
   🌍 Current system timezone: America/Mexico_City
   ```
3. Si muestra UTC, el TZ no se aplicó correctamente

### **Si el scraper manual funciona pero el automático no**
1. Revisa que los cron jobs estén registrados:
   ```bash
   ✅ Programado RAG automático: 06:00 hrs (0 6 * * *)
   ```
2. Verifica que no haya crashes entre ejecuciones
3. Revisa memory usage en Railway (debe estar < 512MB)

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Dockerfile actualizado a Node 20-alpine
- [ ] Package.json requiere Node >=20.0.0
- [ ] Variable TZ=America/Mexico_City configurada en Railway
- [ ] Build exitoso sin errores
- [ ] Logs muestran Node version v20.x.x
- [ ] Logs muestran timezone: America/Mexico_City
- [ ] Scraper manual funciona sin error "File is not defined"
- [ ] Logs muestran 4 cron jobs programados
- [ ] Próxima ejecución automática calculada correctamente

---

## 🎯 PRÓXIMOS PASOS

1. **Hacer commit y push de los cambios**:
```bash
git add Dockerfile package.json server.js scraper-4-paises-final.js
git commit -m "Fix: Update to Node 20 and fix timezone for cron jobs"
git push
```

2. **Railway detectará los cambios automáticamente** y hará rebuild

3. **Monitorear logs** durante las próximas horas programadas

4. **Verificar** que el scraper se ejecute automáticamente

---

## 📞 SOPORTE

Si después de estos pasos sigues teniendo problemas:

1. Revisa los **Railway logs** completos
2. Verifica que todas las **API keys** estén configuradas
3. Confirma que el **scraper manual** funciona (Update News button)
4. Verifica **memory usage** (Railway Free tier: 512MB limit)

---

**Última actualización**: 28 de Octubre, 2025  
**Estado**: ✅ Soluciones implementadas y listas para deployment
