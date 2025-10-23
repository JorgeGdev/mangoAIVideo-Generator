# 🤖 Scraper Automático - Guía Rápida

## ✅ ¿Qué se implementó?

Se agregó un **sistema de scraper automático** que actualiza la base de datos RAG **4 veces al día** sin necesidad de intervención manual.

## ⏰ Horarios de Ejecución

El scraper se ejecuta automáticamente en estos horarios:

| Hora | Descripción |
|------|-------------|
| **06:00** | Actualización matutina |
| **10:00** | Actualización media mañana |
| **14:00** | Actualización tarde |
| **18:00** | Actualización vespertina |

**Zona horaria:** America/Mexico_City

## 🔧 ¿El botón manual sigue funcionando?

**¡SÍ!** El botón manual del dashboard **NO fue modificado** y sigue funcionando exactamente igual que antes. Puedes usarlo cuando quieras hacer una actualización inmediata.

## 🚀 ¿Cómo funciona?

1. **Inicio del servidor**: Cuando ejecutas `node server.js`, el sistema automáticamente:
   - Programa las 4 ejecuciones diarias
   - Calcula la próxima ejecución
   - Muestra logs de confirmación

2. **Ejecución automática**: A las horas programadas:
   - El scraper se ejecuta automáticamente
   - Procesa las 4 fuentes RSS (NZ, AUS, UK, USA)
   - Actualiza la base de datos Supabase
   - Envía notificaciones a Telegram
   - Registra logs detallados

3. **Ejecución manual**: Cuando presionas el botón:
   - Funciona igual que siempre
   - Los logs muestran "MANUAL" para distinguirlo
   - No interfiere con las ejecuciones programadas

## 📊 Monitoreo

### Ver logs en tiempo real
Abre el dashboard en tu navegador y observa la consola de logs. Verás mensajes como:

**Scraper Automático:**
```
[06:00:00] 🕐 AUTO RAG: Iniciando actualización programada a las 06:00 hrs
[06:15:23] ✅ AUTO RAG: Actualización completada exitosamente
```

**Scraper Manual:**
```
[08:30:15] 🚀 MANUAL SCRAPER: Iniciando scraper desde dashboard...
[08:45:42] ✅ MANUAL SCRAPER: Completado exitosamente
```

### Ver estadísticas
Puedes consultar las estadísticas del scraper automático usando la API:

```bash
# Ver horarios y estado
curl http://localhost:3000/api/rag/schedule

# Ver estadísticas generales
curl http://localhost:3000/api/stats
```

## 🛠️ Configuración

### Cambiar horarios (opcional)

Si quieres modificar los horarios, edita `server.js` en la función `setupAutoRAG()` (línea ~1936):

```javascript
const schedules = [
  { time: '0 6 * * *', name: '06:00', hour: 6 },   // 06:00 hrs
  { time: '0 10 * * *', name: '10:00', hour: 10 }, // 10:00 hrs
  { time: '0 14 * * *', name: '14:00', hour: 14 }, // 14:00 hrs
  { time: '0 18 * * *', name: '18:00', hour: 18 }  // 18:00 hrs
];
```

**Formato Cron:**
- `0 6 * * *` = A las 06:00 todos los días
- `30 14 * * *` = A las 14:30 todos los días
- `0 */3 * * *` = Cada 3 horas

### Cambiar zona horaria (opcional)

Si tu zona horaria es diferente, edita la propiedad `timezone` en cada `cron.schedule`:

```javascript
cron.schedule(schedule.time, () => {
  // ... código ...
}, {
  timezone: "America/Mexico_City" // Cambia esto a tu zona horaria
});
```

Zonas horarias comunes:
- `America/Mexico_City` (México)
- `America/New_York` (USA Este)
- `America/Los_Angeles` (USA Oeste)
- `Europe/Madrid` (España)
- `America/Argentina/Buenos_Aires` (Argentina)

## ✅ Verificación

Al iniciar el servidor, debes ver estos mensajes:

```
📅 Setting up automatic RAG scraper...
⏰ Scraper will run at: 06:00, 10:00, 14:00, 18:00 daily
✅ Programado RAG automático: 06:00 hrs (0 6 * * *)
✅ Programado RAG automático: 10:00 hrs (0 10 * * *)
✅ Programado RAG automático: 14:00 hrs (0 14 * * *)
✅ Programado RAG automático: 18:00 hrs (0 18 * * *)
⏰ Próxima ejecución automática: [FECHA Y HORA]
📅 RAG automático configurado: 06:00, 10:00, 14:00, 18:00 hrs
🌍 Zona horaria: America/Mexico_City
⚡ El scraper manual sigue disponible en el dashboard
🎯 Automatic RAG scraper configured successfully
💡 Manual scraper button remains functional
```

Si ves estos mensajes, **todo está funcionando correctamente** ✅

## 🐛 Troubleshooting

### El scraper no se ejecuta automáticamente

**Verifica:**
1. El servidor está corriendo: `node server.js`
2. Los logs de inicio muestran la configuración
3. La hora del sistema está correcta

### Quiero detener el scraper automático temporalmente

El scraper automático **no se puede desactivar** mientras el servidor esté corriendo (es intencional para mantener la base de datos actualizada).

Si necesitas detenerlo:
1. Detén el servidor (Ctrl+C)
2. El scraper automático se detendrá
3. El scraper manual seguirá funcionando la próxima vez que inicies

### El scraper manual no responde

Si presionas el botón manual y no pasa nada:
- Verifica que no haya ya un scraper ejecutándose (automático o manual)
- Solo puede haber un scraper ejecutándose a la vez
- Revisa los logs para ver el estado actual

## 📚 Documentación Completa

Para más detalles técnicos, consulta: `AUTO_SCRAPER_DOCUMENTATION.md`

## 🎉 Resumen

✅ Scraper automático: **4 veces al día** (06:00, 10:00, 14:00, 18:00)  
✅ Scraper manual: **Sigue funcionando igual**  
✅ Sin conflictos: **No pueden ejecutarse al mismo tiempo**  
✅ Logs claros: **Distingue entre AUTO y MANUAL**  
✅ Fácil de monitorear: **Dashboard en tiempo real**  

---

**¡Listo!** Tu sistema ahora mantiene la base de datos actualizada automáticamente mientras duermes 😴💤

Si tienes preguntas, revisa los logs o consulta la documentación completa.
