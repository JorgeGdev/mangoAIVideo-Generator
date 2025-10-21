# 🥭 **MANGO AI Video Studio** - Advanced News Video Generation Platform

> **Sistema revolucionario de generación automática de videos de noticias usando IA** - Combina RAG, síntesis de voz avanzada, y generación de video con sincronización labial perfecta. Interfaz moderna con Leonardo.AI theme.

**Made with 💛 by Cheeky Mango AI Studio** | Version 2.1 | October 2025

---

## 🌟 **Novedades 2025 - Características Implementadas**

### ✨ **Funcionalidades Revolucionarias**
- **🖼️ Drag & Drop Upload**: Sistema intuitivo de carga de imágenes con validación automática
- **🎠 Carousel Inteligente**: Visualiza 8 noticias internacionales de 4 países simultáneamente  
- **🎨 Leonardo.AI Theme**: Interface moderna con gradientes púrpura/rosa y efectos glassmorphism
- **💝 Animated Hearts**: Emojis animados estilo Google en el banner del sistema
- **🔄 AI Preview**: Vista previa side-by-side de transformaciones de imagen con IA
- **📱 Responsive Design**: Optimizado para desktop, tablet y mobile

### 🎬 **Generación de Videos Inteligente**
- **Custom Photo Upload**: Sube tu propia foto para videos personalizados
- **Dual Voice System**: Elige entre voz femenina (Nathalia) o masculina (Adam)  
- **Natural Language Queries**: Pregunta naturalmente: "news about Trump", "China situation"
- **20-Second Videos**: Optimizados para redes sociales con timing perfecto
- **HD Quality**: Videos de alta calidad con sincronización labial perfecta

### 🧠 **RAG (Retrieval-Augmented Generation)**
- **120+ News Vectors**: Base de datos con noticias internacionales actualizadas
- **4 Countries**: New Zealand, Australia, UK, USA con imágenes de fondo temáticas
- **Smart Search**: Encuentra noticias relevantes automáticamente
- **Real-time Updates**: Scraper automático de fuentes RSS con notificaciones

### 🤖 **Interfaces Duales Mejoradas**
- **Modern Web Dashboard**: Control total con interfaz Leonardo.AI theme
- **Telegram Bot Avanzado**: Interacción natural por chat con aprobación de scripts
- **Real-time Monitoring**: Logs y métricas en vivo con filtros avanzados
- **Modal System**: Diálogos modernos para aprobación de contenido

---

## 📋 **Tabla de Contenidos**

- [🎯 Descripción General](#-descripción-general)
- [🏗️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [⚙️ Funcionalidades Principales](#️-funcionalidades-principales)  
- [🛠️ Instalación](#️-instalación)
- [🔧 Configuración](#-configuración)
- [🚀 Uso del Sistema](#-uso-del-sistema)
- [📁 Estructura de Archivos](#-estructura-de-archivos)
- [🔄 Flujo de Trabajo](#-flujo-de-trabajo)
- [🔌 APIs y Servicios](#-apis-y-servicios)
- [🎨 Sistema de UI](#-sistema-de-ui)
- [🔐 Sistema de Autenticación](#-sistema-de-autenticación)
- [📊 Base de Datos](#-base-de-datos)
- [🤖 Módulos IA](#-módulos-ia)
- [📝 Logs y Monitoreo](#-logs-y-monitoreo)
- [🐛 Troubleshooting](#-troubleshooting)
- [📋 FAQ](#-faq)

---

## 🎯 **Descripción General**

**MANGO AI Video Studio** es una plataforma completa que automatiza la creación de contenido audiovisual inteligente con las últimas tecnologías de IA. El sistema integra:

1. **Recopila noticias** internacionales de múltiples fuentes RSS
2. **Almacena información** en una base de datos vectorial avanzada (RAG)
3. **Genera scripts** personalizados usando GPT-4 con contexto real
4. **Produce audio** natural con síntesis de voz de ElevenLabs
5. **Crea videos** HD con sincronización labial perfecta via Hedra AI
6. **Distribuye contenido** automáticamente via Telegram Bot y Web Dashboard

### 🚀 **Caso de Uso Principal**
Crear videos informativos profesionales de forma automatizada, donde el usuario simplemente sube una foto, solicita información (ej: "noticias del Real Madrid") y recibe un video completo con narración profesional y efectos visuales modernos.

---

## 🏗️ **Arquitectura del Sistema**

### 📁 **Estructura del Proyecto**

```
📦 MANGO AI Video Studio/
├── 🚀 server.js                    # Servidor Express principal
├── 🌐 dashboard-new.html           # Dashboard moderno con Leonardo theme
├── 🌐 dashboard.html               # Panel administrativo clásico  
├── 🎨 modals.leonardo.css          # Estilos Leonardo.AI + animaciones
├── 🎨 styles.*.css                 # Sistema de estilos modular
├── ⚙️ dashboard-optimized.js       # Lógica frontend con carousel 8-items
├── ⚙️ newdashboard.js              # Sistema drag & drop + upload
├── ⚙️ dashboard.modals.js          # Gestión de modales y aprobación
├── 📰 scraper-4-paises-final.js    # Scraper multi-país con RAG
├── 👥 users.json                   # Base de datos de usuarios
├── 🔐 login.html                   # Autenticación con tema moderno
│
├── 📁 modules/                     # Módulos principales renovados
│   ├── 🤖 telegram-handler.js      # Bot Telegram con aprobación
│   ├── 📝 script-generator.js      # IA + RAG optimizado
│   ├── 🔊 audio-processor.js       # ElevenLabs con dual voice
│   ├── 📸 image-processor.js       # Procesamiento avanzado
│   ├── 🎬 video-creator.js         # Hedra AI integration
│   └── 🔒 auth-manager.js          # JWT + roles avanzados
│
├── 📁 uploads/                     # Drag & drop uploads
├── 📁 generated_audios/            # Audio ElevenLabs output
├── 📁 final_videos/                # Video Hedra output  
└── 📁 images/                      # Assets + country backgrounds
    ├── 🖼️ NZ.png, AUS.png, UK.png, USA.png  # Country themes
    └── 📂 modified/                # AI processed images
```

### 🔄 **Flujo de Arquitectura Moderna**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MANGO AI Video Studio 2025                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │  LEONARDO UI    │    │   TELEGRAM BOT  │    │   API BACKEND   │  │
│  │                 │    │                 │    │                 │  │
│  │ • Drag & Drop   │◄──►│ • Script Review │◄──►│ • Express.js    │  │
│  │ • 8-News Feed   │    │ • Voice Choice  │    │ • Supabase RAG  │  │
│  │ • AI Preview    │    │ • Auto Delivery │    │ • JWT Auth      │  │
│  │ • Modal System  │    │ • Real-time Log │    │ • Rate Limiting │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
│           │                        │                        │       │
│           └────────────────────────┼────────────────────────┘       │
│                                    │                                │
│  ┌─────────────────────────────────┼─────────────────────────────┐  │
│  │                    AI PIPELINE  │                             │  │
│  │                                 ▼                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │    GPT-4     │  │ ELEVENLABS   │  │   HEDRA AI   │       │  │
│  │  │              │  │              │  │              │       │  │
│  │  │ • RAG Query  │  │ • Dual Voice │  │ • Lip Sync   │       │  │
│  │  │ • Context    │  │ • HD Audio   │  │ • 20s Videos │       │  │
│  │  │ • Script Gen │  │ • Natural    │  │ • MP4 Output │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ **Funcionalidades Principales**

### 🎠 **Sistema de Carousel Avanzado**
- **8 Noticias Simultáneas**: Visualización de 2 noticias por país (NZ, AUS, UK, USA)
- **Navegación Suave**: Transiciones animadas con controles intuitivos
- **Imágenes Temáticas**: Fondos específicos por país con diseño moderno
- **Auto-refresh**: Actualización automática desde base de datos Supabase
- **Responsive**: Adaptable a diferentes tamaños de pantalla

### 🖼️ **Upload System con Drag & Drop**
- **Interfaz Intuitiva**: Zona de arrastre con indicadores visuales
- **Validación Automática**: Verificación de formato, tamaño y tipo de archivo
- **Preview Instantáneo**: Vista previa inmediata de la imagen subida
- **Progress Indicators**: Barras de progreso durante la carga
- **Error Handling**: Mensajes claros para errores de validación
- **Single Click**: Funcionalidad mejorada sin necesidad de doble clic

### 🎨 **Leonardo.AI Theme System**
- **Gradientes Modernos**: Paleta púrpura/rosa con efectos glassmorphism
- **Animaciones Suaves**: Transiciones CSS3 profesionales
- **Responsive Grid**: Layout adaptativo para diferentes dispositivos
- **Micro-interactions**: Hover effects y feedback visual
- **Consistency**: Tema coherente en todos los componentes

### 💖 **Animated Heart System**
- **Google-style Animation**: Emojis animados con efecto heartbeat
- **Multiple Variants**: heartBeat, heartBeatSubtle, heartPulse
- **CSS Keyframes**: Animaciones suaves y optimizadas
- **Brand Integration**: "Made with 💛 by Cheeky Mango AI Studio"

### 🔄 **AI Transformation Preview**
- **Side-by-Side Layout**: Comparación visual Original vs AI
- **Responsive Images**: Auto-resize manteniendo aspect ratio
- **70% Viewport**: Optimización de espacio para mejor visualización  
- **Loading States**: Indicadores durante procesamiento AI
- **Quality Optimization**: Imágenes HD con compresión inteligente

### 📋 **Modal System Mejorado**
- **Script Approval**: Sistema de revisión antes de generar video final
- **Modern Design**: Diálogos con efectos glassmorphism
- **Keyboard Support**: Navegación completa por teclado (ESC, Enter)
- **Overlay Protection**: Prevención de clics accidentales
- **Animation System**: Fade-in/out suaves

---

## 🛠️ **Instalación y Configuración**

### 📋 **Prerrequisitos**
```bash
Node.js 18+ (Recomendado: Node.js 20 LTS)
npm/yarn/pnpm
Git
Windows 10/11, macOS 12+, o Ubuntu 20.04+
```

### 🔑 **APIs Requeridas**
- **OpenAI**: GPT-4 para generación de scripts contextualizados
- **ElevenLabs**: Síntesis de voz natural HD (Dual Voice: Femenina/Masculina)
- **Hedra AI**: Generación de videos con sincronización labial perfecta
- **Supabase**: Base de datos vectorial para RAG + Storage
- **Telegram**: Bot token para interfaz de chat (opcional)

### ⚡ **Instalación Rápida (2025)**

1. **Clonar e instalar**
```bash
git clone [repository-url] "MANGO AI Video Studio"
cd "MANGO AI Video Studio"
npm install --production
```

2. **Configurar variables de entorno** (`.env`)
```env
# === OPENAI (Required) ===
OPENAI_API_KEY=sk-proj-tu-openai-key

# === ELEVENLABS (Required) ===
ELEVENLABS_API_KEY=sk_tu-elevenlabs-key
ELEVENLABS_VOICE_ID=voice_id_femenina
ELEVENLABS_VOICE_ID_MALE=voice_id_masculina

# === HEDRA AI (Required) ===
HEDRA_API_KEY=tu_hedra_api_key

# === SUPABASE (RAG Database - Required) ===
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_supabase_service_role_key

# === TELEGRAM (Optional) ===
BOT_TOKEN=tu_bot_token_aqui
CHAT_ID=tu_chat_id_aqui
```

3. **Iniciar el sistema**
```bash
npm start
```

4. **Acceder al dashboard**
```
http://localhost:3000
Login: admin / admin
```

---

## 🚀 **Uso del Sistema**

### 🌐 **Dashboard Web Moderno** (Recomendado)

1. **Acceder**: `http://localhost:3000`
2. **Login**: admin/admin (cambiar en producción)
3. **Funcionalidades Principales**:
   - **📰 Carousel**: Ve las 8 últimas noticias de 4 países
   - **🖼️ Upload**: Arrastra tu foto o haz clic para seleccionar
   - **🎙️ Voice**: Elige voz femenina o masculina
   - **📝 Query**: Escribe tu consulta en lenguaje natural
   - **🎬 Generate**: Crea el video automáticamente
   - **✅ Approve**: Revisa y aprueba el script generado

### 📱 **Telegram Bot** (Opcional)

1. **Iniciar Bot**: Botón "🤖 Start" en dashboard
2. **Comandos Disponibles**:
```
/start - Iniciar interacción
/help - Mostrar ayuda
/video [consulta] - Generar video
/status - Estado del sistema
```

3. **Flujo de Generación**:
   - Envía: `/video noticias del Real Madrid`
   - Bot busca información relevante
   - Genera script con IA
   - Solicita aprobación
   - Produce y entrega video final

---

## 🔄 **Flujo de Trabajo Detallado**

### 🎬 **Generación de Video Completo**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VIDEO GENERATION FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

1️⃣  USER INPUT
    ├── Dashboard: Drag & drop photo + query
    └── Telegram: "/video Barcelona vs Real Madrid"

2️⃣  IMAGE PROCESSING  
    ├── Validate file format and size
    ├── Generate preview
    └── Prepare for AI processing

3️⃣  RAG SEARCH
    ├── Query Supabase vector DB (120+ articles)
    ├── Semantic similarity search across 4 countries
    ├── Retrieve relevant documents
    └── Rank by relevance and recency

4️⃣  SCRIPT GENERATION
    ├── Send context to GPT-4
    ├── Generate coherent 65-70 word narrative
    ├── Validate content quality and timing
    └── Return structured script

5️⃣  USER APPROVAL (Modal System)
    ├── Display script in modern modal dialog
    ├── Show AI transformation preview (side-by-side)
    ├── Wait for ✅ approval or ❌ rejection
    └── Handle user feedback

6️⃣  AUDIO SYNTHESIS (ElevenLabs)
    ├── Select voice (Female/Male)
    ├── Generate natural HD speech
    ├── Download optimized MP3
    └── Validate audio quality (20s target)

7️⃣  VIDEO CREATION (Hedra AI)
    ├── Upload image + audio to Hedra
    ├── Generate lip-sync video with AI
    ├── Monitor processing status
    └── Download final MP4 (HD quality)

8️⃣  DELIVERY & NOTIFICATION
    ├── Save to final_videos/ directory
    ├── Send via Telegram (if enabled)
    ├── Update dashboard statistics
    └── Log completion with animated heart ❤️
```

---

## 🔌 **APIs y Servicios Integrados**

### 🤖 **OpenAI Integration**
**Modelo**: GPT-4 Turbo  
**Uso**: Generación de scripts contextualizados con RAG

```javascript
const prompt = `
Eres un narrador profesional de noticias. 
Basándote en las siguientes noticias reales de ${países}:

${contextoRAG}

Crea un script de exactamente 65-70 palabras sobre: "${consulta}"

Requisitos:
- Tono profesional pero accesible
- Información verificada y actual  
- Formato narrativo fluido
- Duración apropiada para video de 20 segundos
- Sin palabras técnicas complejas
`;
```

### 🎵 **ElevenLabs Voice System**
**Voces Configuradas**:
- **Femenina**: Nathalia (Español neutro, profesional)
- **Masculina**: Adam (Español neutro, autoridad)

```javascript
const voiceSettings = {
  stability: 0.85,          // Consistencia natural
  similarity_boost: 0.75,   // Mantiene características
  style: 0.2,              // Estilo profesional
  use_speaker_boost: true   // Optimización HD
};
```

### 🎥 **Hedra AI Video Generation**
**Características**:
- Lip-sync realista con IA avanzada
- Soporte para imágenes hasta 4K
- Output MP4 optimizado para redes sociales

```javascript
const hedraConfig = {
  aspect_ratio: "1:1",      // Formato cuadrado
  quality: "high",          // Máxima calidad
  length: "auto",          // Basado en audio
  voice_settings: "natural" // Sincronización natural
};
```

### 🗄️ **Supabase Database (RAG)**
**Tabla**: `documents` con embeddings vectoriales
```sql
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536), -- OpenAI embeddings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda vectorial
CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

---

## 🎨 **Sistema de UI Leonardo.AI**

### 🌈 **Paleta de Colores**
```css
:root {
  --primary-purple: #8B5CF6;
  --secondary-pink: #EC4899; 
  --glassmorphism: rgba(255, 255, 255, 0.1);
  --gradient-main: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
  --text-light: rgba(255, 255, 255, 0.9);
  --border-glass: rgba(255, 255, 255, 0.2);
}
```

### ✨ **Características Visuales**
- **Glassmorphism Effects**: Transparencias con blur backdrop
- **Smooth Animations**: Transiciones CSS3 de 300ms
- **Responsive Grid**: Flexbox + CSS Grid híbrido
- **Micro-interactions**: Hover states y feedback visual
- **Heart Animations**: 3 variantes (heartBeat, subtle, pulse)

### 📱 **Responsive Design**
```css
/* Mobile First Approach */
.container { width: 100%; padding: 1rem; }

@media (min-width: 768px) {
  .container { max-width: 768px; padding: 2rem; }
}

@media (min-width: 1024px) {
  .container { max-width: 1200px; padding: 3rem; }
}
```

---

## 📊 **Base de Datos y Storage**

### 🗄️ **Estructura de Datos**
```json
{
  "documents": {
    "id": 1,
    "content": "Real Madrid vence 2-1 al Barcelona en El Clásico...",
    "metadata": {
      "title": "El Clásico - Victoria del Madrid",
      "source": "marca.com", 
      "country": "España",
      "url": "https://marca.com/futbol/...",
      "published_date": "2025-10-20T15:30:00Z",
      "tags": ["real madrid", "barcelona", "el clasico"],
      "word_count": 450,
      "language": "es"
    },
    "embedding": [0.123, -0.456, 0.789, ...], // 1536 dimensions
    "created_at": "2025-10-20T16:00:00Z"
  }
}
```

### 📁 **File Storage Structure**
```
/uploads/           # User uploaded photos
  ├── user_123_image.jpg
  └── temp_uploads/

/generated_audios/  # ElevenLabs output
  ├── session_456_female.mp3
  └── session_456_male.mp3

/final_videos/      # Hedra AI output
  ├── session_456_final.mp4
  └── thumbnails/

/images/           # System assets
  ├── NZ.png, AUS.png, UK.png, USA.png
  └── modified/    # AI processed images
```

---

## 📝 **Logs y Monitoreo**

### 📊 **Dashboard Metrics**
- **📊 RAG Vectors**: Total de documentos indexados
- **🎬 Videos Generated**: Contador de videos exitosos
- **📈 Success Rate**: Porcentaje de éxito del sistema
- **⏱️ Avg Generation Time**: Tiempo promedio por video
- **🌍 Countries Updated**: Última actualización por país

### 🔍 **Real-time Logging**
```javascript
// Formato de logs estructurado
console.log(`[${timestamp}] ${level} [${module}] ${message}`);

// Ejemplos:
// [15:30:45] INFO [CAROUSEL] Loading 8 news from 4 countries
// [15:31:10] SUCCESS [UPLOAD] File validated: user_photo.jpg (2.3MB)
// [15:31:25] PROCESSING [AI] Generating script with GPT-4...
// [15:31:40] SUCCESS [HEDRA] Video generation completed (18.5s)
```

### 🚨 **Error Monitoring**
- **API Failures**: Alertas automáticas por fallos de servicios
- **Upload Errors**: Tracking de errores de carga de archivos  
- **Generation Timeouts**: Monitoreo de procesos colgados
- **Database Issues**: Alertas de conectividad RAG

---

## 🐛 **Troubleshooting**

### ❌ **Problemas Comunes**

#### **Error: "Carousel shows only 4 news instead of 8"**
```javascript
// Solución: Verificar configuración en dashboard-optimized.js
const maxSlides = 8; // Debe ser 8, no 4
```

#### **Error: "Drag & Drop not working"**
```javascript
// Verificar que newdashboard.js esté cargado
<script src="newdashboard.js"></script>
```

#### **Error: "Modal not appearing for script approval"**
```javascript  
// Verificar inclusión de dashboard.modals.js
<script src="dashboard.modals.js"></script>
```

#### **Error: "Heart animation not working"**
```css
/* Verificar que modals.leonardo.css esté incluido */
@keyframes heartBeat {
  0%, 50%, 100% { transform: scale(1); }
  25%, 75% { transform: scale(1.1); }
}
```

### 🔧 **Comandos de Diagnóstico**
```bash
# Verificar configuración del sistema
node -e "console.log('Node:', process.version)"
npm -v

# Probar conexiones API
curl -X POST "https://api.openai.com/v1/models" \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Verificar archivos críticos
ls -la dashboard-new.html newdashboard.js modals.leonardo.css

# Reiniciar con logs detallados
DEBUG=* npm start
```

---

## 📋 **FAQ**

### ❓ **Preguntas Frecuentes 2025**

**P: ¿Cómo funciona el nuevo sistema de drag & drop?**  
R: Simplemente arrastra tu imagen a la zona destacada o haz clic para seleccionar. El sistema valida automáticamente formato, tamaño y calidad.

**P: ¿Qué significa el carousel de 8 noticias?**  
R: Muestra 2 noticias recientes de cada uno de los 4 países (Nueva Zelanda, Australia, Reino Unido, Estados Unidos) con fondos temáticos.

**P: ¿Cómo funciona el sistema de aprobación de scripts?**  
R: Después de generar el script con IA, aparece un modal moderno donde puedes revisar el contenido y aprobarlo antes de crear el video final.

**P: ¿Las animaciones de corazón afectan el rendimiento?**  
R: No, utilizan CSS keyframes optimizadas que consumen recursos mínimos y se ejecutan en el GPU.

**P: ¿Puedo cambiar el tema Leonardo.AI?**  
R: Sí, puedes modificar las variables CSS en `modals.leonardo.css` o cambiar a `dashboard.html` para el tema clásico.

**P: ¿El sistema funciona en móviles?**  
```markdown
# 🥭 MANGO AI Video Studio — Advanced News Video Generation Platform

> A single platform that automates professional news video production using modern AI: RAG-based retrieval, high-quality voice synthesis, and AI-driven video generation with lip-sync. Clean Leonardo-style UI.

Made with � by Cheeky Mango AI Studio | Version 2.1 | October 2025

---

## What's New (2025)

Key features implemented:

- Drag & Drop image upload with validation
- Intelligent carousel showing 8 news items (4 countries)
- Leonardo.AI themed UI (glassmorphism + gradients)
- Side-by-side AI transform preview
- Responsive design (desktop, tablet, mobile)
- Modal-driven approval workflow and real-time logs

### Video generation highlights

- Custom photo uploads for personalized videos
- Dual-voice support (female / male)
- Natural-language queries for content selection
- Short social-ready videos (≈20 seconds)
- HD output with lip-sync via Hedra AI

---

## Table of Contents

- Overview
- Architecture
- Features
- Installation
- Configuration
- Usage
- Project structure
- Workflow
- APIs & Services
- Troubleshooting
- FAQ

---

## Overview

MANGO AI Video Studio is a complete system that automates audiovisual content production using modern AI components. The platform:

1. Crawls and indexes news from multiple sources (RAG)
2. Generates a short script using GPT-4 (context-aware)
3. Produces natural audio (ElevenLabs)
4. Renders a lip-synced video using Hedra AI
5. Delivers final output via the web dashboard and optional Telegram bot

Primary use case: produce short, professional news videos from a user-uploaded photo and a natural-language query.

---

## Project Structure (summary)

```
MANGO AI Video Studio/
├── server.js
├── dashboard-new.html
├── frontend/
│   ├── leonardo-style.css
│   ├── modals.leonardo.css
│   └── dashboard.modals.js
├── modules/
│   ├── audio-processor.js
│   ├── image-processor.js
│   ├── script-generator.js
│   └── video-creator.js
├── uploads/
├── generated_audios/
└── final_videos/
```

---

## Features (high level)

- Intelligent 8-item carousel (2 items per country)
- Drag & Drop upload with instant preview
- Side-by-side image transformation preview
- Modal-based approval flow before video creation
- Telegram Bot integration (optional)

---

## Installation

Requirements:

```bash
Node.js 18+ (Node 20 recommended)
Git
```

Quick start:

```bash
git clone https://github.com/JorgeGdev/mangoAIVideo-Generator.git
cd mangoAIVideo-Generator
npm install
```

Create a `.env` file with the required API keys (see Configuration below), then run:

```bash
npm start
```

Open the dashboard at: http://localhost:3000 (default login: admin / admin)

---

## Configuration (environment variables)

Create a `.env` with the following keys (examples):

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key

# Hedra AI
HEDRA_API_KEY=your_hedra_api_key

# Supabase (RAG storage)
SUPABASE_URL=https://your-supabase-url
SUPABASE_KEY=your-service-role-key

# Telegram (optional)
BOT_TOKEN=your_bot_token
CHAT_ID=your_chat_id
```

Do not commit `.env` — a `.gitignore` is included to prevent accidental commits.

---

## Usage

1. Start the server: `npm start`
2. Open `http://localhost:3000`
3. Upload a photo, choose a voice, enter a query, and generate the video

Telegram flow (optional): use the bot to request videos via chat with approval steps.

---

## Workflow (video generation)

1. User uploads image and submits a textual query
2. System performs RAG search and builds context
3. GPT-4 generates a concise script (≈65–70 words)
4. ElevenLabs synthesizes audio
5. Hedra creates the lip-synced video
6. Final MP4 is saved under `final_videos/` and (optionally) delivered via Telegram

---

## APIs & Services

- OpenAI (GPT-4) — script generation
- ElevenLabs — high-quality speech synthesis
- Hedra AI — video generation and lip-sync
- Supabase — vector DB / storage
- Telegram — optional delivery and control

---

## Troubleshooting & Diagnostics

Quick checks:

```bash
node -e "console.log('Node:', process.version)"
npm -v
```

Check logs in the dashboard at `http://localhost:3000`.

---

## Contributing

- Open issues on GitHub with logs and reproduction steps
- Send pull requests with a clear description and tests

---

## License & Credits

Made with 💛 by Cheeky Mango AI Studio — October 2025

``` 