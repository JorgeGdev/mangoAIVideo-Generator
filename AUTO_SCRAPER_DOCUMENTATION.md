# 🤖 Sistema de Scraper Automático de Noticias

## 📋 Descripción

El sistema de scraper automático ejecuta el proceso de actualización de la base de datos RAG (Retrieval-Augmented Generation) en horarios específicos durante el día, manteniendo la información de noticias siempre actualizada.

## ⏰ Horarios Programados

El scraper se ejecuta automáticamente **4 veces al día**:

- **06:00 hrs** - Actualización matutina
- **10:00 hrs** - Actualización media mañana  
- **14:00 hrs** - Actualización tarde
- **18:00 hrs** - Actualización vespertina

**Zona horaria:** America/Mexico_City

## 🔄 Funcionalidades

### Scraper Automático
- ✅ Se ejecuta sin intervención manual en los horarios programados
- ✅ Procesa las 4 fuentes RSS configuradas:
  - New Zealand Herald (NZ)
  - ABC News Australia (AUS)
  - BBC News UK (UK)
  - New York Times USA (USA)
- ✅ Actualiza la base de datos Supabase con nuevos vectores
- ✅ Envía notificaciones a Telegram al completar
- ✅ Registra logs detallados en el dashboard
- ✅ Previene ejecuciones concurrentes (si ya está corriendo, espera a que termine)

### Scraper Manual
- ✅ **El botón manual del dashboard sigue funcionando**
- ✅ Puedes ejecutar el scraper manualmente cuando lo necesites
- ✅ No interfiere con las ejecuciones programadas
- ✅ Los logs distinguen entre ejecuciones manuales y automáticas

## 📊 Monitoreo y Estadísticas

### Endpoints API Disponibles

#### 1. Ver horarios y estado del scraper automático
```
GET /api/rag/schedule
```

**Respuesta:**
```json
{
  "success": true,
  "autoRAG": {
    "enabled": true,
    "timezone": "America/Mexico_City",
    "schedules": [
      { "time": "06:00", "cron": "0 6 * * *", "description": "Actualización matutina" },
      { "time": "10:00", "cron": "0 10 * * *", "description": "Actualización media mañana" },
      { "time": "14:00", "cron": "0 14 * * *", "description": "Actualización tarde" },
      { "time": "18:00", "cron": "0 18 * * *", "description": "Actualización vespertina" }
    ],
    "lastRun": "24/10/2025, 06:00:15",
    "lastRunSuccess": true,
    "nextRun": "24/10/2025, 10:00:00",
    "scraperActive": false,
    "stats": {
      "totalRuns": 15,
      "successfulRuns": 14,
      "failedRuns": 1,
      "successRate": "93%"
    }
  }
}
```

#### 2. Ejecutar scraper manualmente (adicional)
```
POST /api/rag/run-now
```

**Respuesta:**
```json
{
  "success": true,
  "message": "RAG scraper iniciado manualmente. Revisa los logs para seguir el progreso."
}
```

#### 3. Ver estadísticas generales (incluye info del auto-scraper)
```
GET /api/stats
```

**Respuesta:**
```json
{
  "vectores": 84,
  "videos": 12,
  "audios": 15,
  "exito": "100%",
  "scraperActive": false,
  "botActive": false,
  "autoRAG": {
    "enabled": true,
    "schedules": ["06:00", "10:00", "14:00", "18:00"],
    "timezone": "America/Mexico_City",
    "lastRun": "24/10/2025, 06:00:15",
    "lastRunSuccess": true,
    "nextRun": "24/10/2025, 10:00:00",
    "totalRuns": 15,
    "successfulRuns": 14
  }
}
```

## 🔍 Logs del Sistema

Los logs del sistema distinguen claramente entre ejecuciones:

### Logs de Scraper Automático:
```
[06:00:00] 🕐 AUTO RAG: Iniciando actualización programada a las 06:00 hrs
[06:00:01] 🚀 AUTO RAG: Iniciando scraper AUTOMÁTICO a las 06:00 hrs
[06:00:05] 📰 AUTO RAG: PROCESSING NEW ZEALAND
[06:15:23] ✅ AUTO RAG: Actualización completada exitosamente a las 06:00 hrs
[06:15:24] 📊 AUTO RAG: Base de datos actualizada, sistema listo para generar videos
[06:15:25] ⏰ Próxima ejecución automática: 24/10/2025, 10:00:00
```

### Logs de Scraper Manual:
```
[08:30:15] 🚀 MANUAL SCRAPER: Iniciando scraper de noticias desde dashboard...
[08:30:16] 🔧 Este es un scraper MANUAL - No interfiere con el scraper automático
[08:30:20] 📰 MANUAL: PROCESSING NEW ZEALAND
[08:45:42] ✅ MANUAL SCRAPER: Completado exitosamente
[08:45:43] 📊 Base de datos actualizada - Sistema listo para generar videos
```

## 🛠️ Configuración Técnica

### Archivos Modificados:
- `server.js` - Sistema de scraper automático implementado

### Dependencias:
- `node-cron` (v4.2.1) - Para programación de tareas ✅ Ya instalado

### Variables de Entorno Necesarias:
Las mismas que ya tienes configuradas para el scraper manual:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `OPENAI_API_KEY`
- `BOT_TOKEN` (Telegram)
- `CHAT_ID` (Telegram)

## 🚀 Inicio del Sistema

El scraper automático se activa automáticamente cuando inicias el servidor:

```bash
node server.js
```

**Logs de inicio:**
```
📅 Setting up automatic RAG scraper...
⏰ Scraper will run at: 06:00, 10:00, 14:00, 18:00 daily
✅ Programado RAG automático: 06:00 hrs (0 6 * * *)
✅ Programado RAG automático: 10:00 hrs (0 10 * * *)
✅ Programado RAG automático: 14:00 hrs (0 14 * * *)
✅ Programado RAG automático: 18:00 hrs (0 18 * * *)
⏰ Próxima ejecución automática: 24/10/2025, 14:00:00
📅 RAG automático configurado: 06:00, 10:00, 14:00, 18:00 hrs
🌍 Zona horaria: America/Mexico_City
⚡ El scraper manual sigue disponible en el dashboard
🎯 Automatic RAG scraper configured successfully
💡 Manual scraper button remains functional
```

## ✅ Verificaciones

### El scraper automático está funcionando si ves:
- ✅ Logs de inicio mostrando los 4 horarios programados
- ✅ Cálculo de próxima ejecución
- ✅ Mensajes confirmando que el manual sigue disponible

### Cómo probar:
1. **Ver estado actual:**
   ```bash
   curl http://localhost:3000/api/rag/schedule
   ```

2. **Ejecutar manualmente (para probar):**
   ```bash
   curl -X POST http://localhost:3000/api/rag/run-now
   ```

3. **Ver estadísticas:**
   ```bash
   curl http://localhost:3000/api/stats
   ```

## 🔐 Seguridad

- ✅ Todos los endpoints requieren autenticación (`requireAuth`)
- ✅ Solo usuarios autenticados pueden ver el estado o ejecutar manualmente
- ✅ El scraper automático no puede ser desactivado por accidente
- ✅ Prevención de ejecuciones concurrentes

## 📝 Notas Importantes

1. **Compatibilidad**: El scraper manual del dashboard **NO fue modificado**. Sigue funcionando exactamente igual.

2. **Prevención de Conflictos**: Si el scraper ya está ejecutándose (manual o automático), no se permite iniciar otro hasta que termine.

3. **Zona Horaria**: Configurada para `America/Mexico_City`. Puedes cambiarla en `server.js` línea ~1952.

4. **Duracion**: Cada ejecución del scraper toma aproximadamente 15-20 minutos (igual que manual).

5. **Notificaciones**: El scraper automático envía notificaciones a Telegram igual que el manual.

## 🐛 Troubleshooting

### El scraper automático no se ejecuta
1. Verifica que el servidor esté corriendo: `node server.js`
2. Verifica los logs de inicio para confirmar que se programó
3. Verifica la hora del sistema: debe estar en la zona horaria correcta

### Quiero cambiar los horarios
Edita `server.js`, busca la función `setupAutoRAG()` (línea ~1936) y modifica el array `schedules`:

```javascript
const schedules = [
  { time: '0 6 * * *', name: '06:00', hour: 6 },   // Formato cron: minuto hora * * *
  { time: '0 10 * * *', name: '10:00', hour: 10 },
  { time: '0 14 * * *', name: '14:00', hour: 14 },
  { time: '0 18 * * *', name: '18:00', hour: 18 }
];
```

**Formato Cron:**
- `0 6 * * *` = A las 06:00 todos los días
- `30 14 * * *` = A las 14:30 todos los días
- `0 */3 * * *` = Cada 3 horas

### Quiero ver logs en tiempo real
Abre el dashboard en el navegador y observa la consola de logs en tiempo real.

## 🎉 Resumen

✅ **Scraper automático funcionando** en: 06:00, 10:00, 14:00, 18:00 hrs  
✅ **Scraper manual intacto** - Botón del dashboard funcionando  
✅ **Sin interferencias** entre automático y manual  
✅ **Logs mejorados** - Distingue entre AUTO y MANUAL  
✅ **Estadísticas completas** - Historial de ejecuciones  
✅ **API endpoints** - Para monitoreo y control  

---

**Fecha de implementación:** 24/10/2025  
**Versión:** 1.0  
**Estado:** ✅ Producción
