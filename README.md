🥭 MANGO AI Video Studio - Advanced News Video Generation Platform

Revolutionary automatic news video generation system using AI - Combines RAG, advanced voice synthesis, and video generation with perfect lip synchronization. Modern interface with Leonardo.AI theme.

Made with 💛 by Cheeky Mango AI Studio | Version 2.1 | October 2025

🌟 What's New 2025 - Implemented Features
✨ Revolutionary Features

🖼️ Drag & Drop Upload: Intuitive image upload system with automatic validation
🎠 Intelligent Carousel: Visualize 8 international news items from 4 countries simultaneously
🎨 Leonardo.AI Theme: Modern interface with purple/pink gradients and glassmorphism effects
💝 Animated Hearts: Google-style animated emojis in the system banner
🔄 AI Preview: Side-by-side preview of AI image transformations
📱 Responsive Design: Optimized for desktop, tablet, and mobile

🎬 Intelligent Video Generation

Custom Photo Upload: Upload your own photo for personalized videos
Dual Voice System: Choose between female voice (Nathalia) or male voice (Adam)
Natural Language Queries: Ask naturally: "news about Trump", "China situation"
20-Second Videos: Optimized for social media with perfect timing
HD Quality: High-quality videos with perfect lip synchronization

🧠 RAG (Retrieval-Augmented Generation)

120+ News Vectors: Database with updated international news
4 Countries: New Zealand, Australia, UK, USA with thematic background images
Smart Search: Automatically find relevant news
Real-time Updates: Automatic RSS scraper from sources with notifications

🤖 Enhanced Dual Interfaces

Modern Web Dashboard: Full control with Leonardo.AI theme interface
Advanced Telegram Bot: Natural chat interaction with script approval
Real-time Monitoring: Live logs and metrics with advanced filters
Modal System: Modern dialogs for content approval


📋 Table of Contents

🎯 General Description
🏗️ System Architecture
⚙️ Main Features
🛠️ Installation
🔧 Configuration
🚀 System Usage
📁 File Structure
🔄 Workflow
🔌 APIs and Services
🎨 UI System
🔐 Authentication System
📊 Database
🤖 AI Modules
📝 Logs and Monitoring
🐛 Troubleshooting
📋 FAQ


🎯 General Description
MANGO AI Video Studio is a complete platform that automates the creation of intelligent audiovisual content using the latest AI technologies. The system integrates:

Collects international news from multiple RSS sources
Stores information in an advanced vector database (RAG)
Generates customized scripts using GPT-4 with real context
Produces natural audio with ElevenLabs voice synthesis
Creates HD videos with perfect lip synchronization via Hedra AI
Distributes content automatically via Telegram Bot and Web Dashboard

🚀 Main Use Case
Create professional informative videos automatically, where the user simply uploads a photo, requests information (e.g., "news about Real Madrid"), and receives a complete video with professional narration and modern visual effects.

🏗️ System Architecture
📁 Project Structure
text📦 MANGO AI Video Studio/
├── 🚀 server.js                    # Main Express server
├── 🌐 dashboard-new.html           # Modern dashboard with Leonardo theme
├── 🌐 dashboard.html               # Classic admin panel  
├── 🎨 modals.leonardo.css          # Leonardo.AI styles + animations
├── 🎨 styles.*.css                 # Modular style system
├── ⚙️ dashboard-optimized.js       # Frontend logic with 8-item carousel
├── ⚙️ newdashboard.js              # Drag & drop + upload system
├── ⚙️ dashboard.modals.js          # Modal management and approval
├── 📰 scraper-4-paises-final.js    # Multi-country scraper with RAG
├── 👥 users.json                   # User database
├── 🔐 login.html                   # Authentication with modern theme
│
├── 📁 modules/                     # Main renewed modules
│   ├── 🤖 telegram-handler.js      # Telegram bot with approval
│   ├── 📝 script-generator.js      # AI + optimized RAG
│   ├── 🔊 audio-processor.js       # ElevenLabs with dual voice
│   ├── 📸 image-processor.js       # Advanced processing
│   ├── 🎬 video-creator.js         # Hedra AI integration
│   └── 🔒 auth-manager.js          # JWT + advanced roles
│
├── 📁 uploads/                     # Drag & drop uploads
├── 📁 generated_audios/            # ElevenLabs audio output
├── 📁 final_videos/                # Hedra video output  
└── 📁 images/                      # Assets + country backgrounds
    ├── 🖼️ NZ.png, AUS.png, UK.png, USA.png  # Country themes
    └── 📂 modified/                # AI processed images
🔄 Modern Architecture Flow
text┌─────────────────────────────────────────────────────────────────────┐
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

⚙️ Main Features
🎠 Advanced Carousel System

8 Simultaneous News Items: Visualization of 2 news items per country (NZ, AUS, UK, USA)
Smooth Navigation: Animated transitions with intuitive controls
Thematic Images: Specific backgrounds per country with modern design
Auto-refresh: Automatic update from Supabase database
Responsive: Adaptable to different screen sizes

🖼️ Upload System with Drag & Drop

Intuitive Interface: Drag zone with visual indicators
Automatic Validation: Verification of format, size, and file type
Instant Preview: Immediate preview of the uploaded image
Progress Indicators: Progress bars during upload
Error Handling: Clear messages for validation errors
Single Click: Enhanced functionality without double-click requirement

🎨 Leonardo.AI Theme System

Modern Gradients: Purple/pink palette with glassmorphism effects
Smooth Animations: Professional CSS3 transitions
Responsive Grid: Adaptive layout for different devices
Micro-interactions: Hover effects and visual feedback
Consistency: Coherent theme across all components

💖 Animated Heart System

Google-style Animation: Animated emojis with heartbeat effect
Multiple Variants: heartBeat, heartBeatSubtle, heartPulse
CSS Keyframes: Smooth and optimized animations
Brand Integration: "Made with 💛 by Cheeky Mango AI Studio"

🔄 AI Transformation Preview

Side-by-Side Layout: Visual comparison Original vs AI
Responsive Images: Auto-resize maintaining aspect ratio
70% Viewport: Space optimization for better visualization
Loading States: Indicators during AI processing
Quality Optimization: HD images with intelligent compression

📋 Enhanced Modal System

Script Approval: Review system before final video generation
Modern Design: Dialogs with glassmorphism effects
Keyboard Support: Full keyboard navigation (ESC, Enter)
Overlay Protection: Prevention of accidental clicks
Animation System: Smooth fade-in/out


🛠️ Installation and Configuration
📋 Prerequisites
bashNode.js 18+ (Recommended: Node.js 20 LTS)
npm/yarn/pnpm
Git
Windows 10/11, macOS 12+, or Ubuntu 20.04+
🔑 Required APIs

OpenAI: GPT-4 for contextualized script generation
ElevenLabs: Natural HD voice synthesis (Dual Voice: Female/Male)
Hedra AI: Video generation with perfect lip synchronization
Supabase: Vector database for RAG + Storage
Telegram: Bot token for chat interface (optional)

⚡ Quick Installation (2025)

Clone and install

bashgit clone [repository-url] "MANGO AI Video Studio"
cd "MANGO AI Video Studio"
npm install --production

Configure environment variables (.env)

env# === OPENAI (Required) ===
OPENAI_API_KEY=sk-proj-your-openai-key

# === ELEVENLABS (Required) ===
ELEVENLABS_API_KEY=sk-your-elevenlabs-key
ELEVENLABS_VOICE_ID=voice_id_female
ELEVENLABS_VOICE_ID_MALE=voice_id_male

# === HEDRA AI (Required) ===
HEDRA_API_KEY=your_hedra_api_key

# === SUPABASE (RAG Database - Required) ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# === TELEGRAM (Optional) ===
BOT_TOKEN=your_bot_token_here
CHAT_ID=your_chat_id_here

Start the system

bashnpm start

Access the dashboard

texthttp://localhost:3000
Login: admin / admin

🚀 System Usage
🌐 Modern Web Dashboard (Recommended)

Access: http://localhost:3000
Login: admin/admin (change in production)
Main Features:

📰 Carousel: View the 8 latest news from 4 countries
🖼️ Upload: Drag your photo or click to select
🎙️ Voice: Choose female or male voice
📝 Query: Write your query in natural language
🎬 Generate: Create the video automatically
✅ Approve: Review and approve the generated script



📱 Telegram Bot (Optional)

Start Bot: "🤖 Start" button in dashboard
Available Commands:

text/start - Start interaction
/help - Show help
/video [query] - Generate video
/status - System status

Generation Flow:

Send: /video news about Real Madrid
Bot searches for relevant information
Generates script with AI
Requests approval
Produces and delivers final video




🔄 Detailed Workflow
🎬 Complete Video Generation
text┌─────────────────────────────────────────────────────────────────────┐
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

🔌 Integrated APIs and Services
🤖 OpenAI Integration
Model: GPT-4 Turbo
Use: Contextualized script generation with RAG
javascriptconst prompt = `
You are a professional news narrator. 
Based on the following real news from ${countries}:

${RAG_context}

Create a script of exactly 65-70 words about: "${query}"

Requirements:
- Professional but accessible tone
- Verified and up-to-date information  
- Fluid narrative format
- Appropriate duration for 20-second video
- No complex technical words
`;
🎵 ElevenLabs Voice System
Configured Voices:

Female: Nathalia (Neutral Spanish, professional)
Male: Adam (Neutral Spanish, authoritative)

javascriptconst voiceSettings = {
  stability: 0.85,          // Natural consistency
  similarity_boost: 0.75,   // Maintains characteristics
  style: 0.2,              // Professional style
  use_speaker_boost: true   // HD optimization
};
🎥 Hedra AI Video Generation
Features:

Realistic lip-sync with advanced AI
Support for images up to 4K
MP4 output optimized for social media

javascriptconst hedraConfig = {
  aspect_ratio: "1:1",      // Square format
  quality: "high",          // Maximum quality
  length: "auto",          // Based on audio
  voice_settings: "natural" // Natural synchronization
};
🗄️ Supabase Database (RAG)
Table: documents with vector embeddings
sqlCREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  embedding vector(1536), -- OpenAI embeddings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for vector search
CREATE INDEX ON documents 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

🎨 Leonardo.AI UI System
🌈 Color Palette
css:root {
  --primary-purple: #8B5CF6;
  --secondary-pink: #EC4899; 
  --glassmorphism: rgba(255, 255, 255, 0.1);
  --gradient-main: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
  --text-light: rgba(255, 255, 255, 0.9);
  --border-glass: rgba(255, 255, 255, 0.2);
}
✨ Visual Features

Glassmorphism Effects: Transparencies with backdrop blur
Smooth Animations: 300ms CSS3 transitions
Responsive Grid: Hybrid Flexbox + CSS Grid
Micro-interactions: Hover states and visual feedback
Heart Animations: 3 variants (heartBeat, subtle, pulse)

📱 Responsive Design
css/* Mobile First Approach */
.container { width: 100%; padding: 1rem; }

@media (min-width: 768px) {
  .container { max-width: 768px; padding: 2rem; }
}

@media (min-width: 1024px) {
  .container { max-width: 1200px; padding: 3rem; }
}

📊 Database and Storage
🗄️ Data Structure
json{
  "documents": {
    "id": 1,
    "content": "Real Madrid defeats Barcelona 2-1 in El Clásico...",
    "metadata": {
      "title": "El Clásico - Madrid Victory",
      "source": "marca.com", 
      "country": "Spain",
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
📁 File Storage Structure
text/uploads/           # User uploaded photos
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

📝 Logs and Monitoring
📊 Dashboard Metrics

📊 RAG Vectors: Total indexed documents
🎬 Videos Generated: Successful video counter
📈 Success Rate: System success percentage
⏱️ Avg Generation Time: Average time per video
🌍 Countries Updated: Last update per country

🔍 Real-time Logging
javascript// Structured log format
console.log(`[${timestamp}] ${level} [${module}] ${message}`);

// Examples:
// [15:30:45] INFO [CAROUSEL] Loading 8 news from 4 countries
// [15:31:10] SUCCESS [UPLOAD] File validated: user_photo.jpg (2.3MB)
// [15:31:25] PROCESSING [AI] Generating script with GPT-4...
// [15:31:40] SUCCESS [HEDRA] Video generation completed (18.5s)
🚨 Error Monitoring

API Failures: Automatic alerts for service failures
Upload Errors: Tracking of upload errors
Generation Timeouts: Monitoring of stuck processes
Database Issues: RAG connectivity alerts


🐛 Troubleshooting
❌ Common Issues
Error: "Carousel shows only 4 news instead of 8"
javascript// Solution: Check configuration in dashboard-optimized.js
const maxSlides = 8; // Must be 8, not 4
Error: "Drag & Drop not working"
javascript// Verify that newdashboard.js is loaded
<script src="newdashboard.js"></script>
Error: "Modal not appearing for script approval"
javascript// Verify inclusion of dashboard.modals.js
<script src="dashboard.modals.js"></script>
Error: "Heart animation not working"
css/* Verify that modals.leonardo.css is included */
@keyframes heartBeat {
  0%, 50%, 100% { transform: scale(1); }
  25%, 75% { transform: scale(1.1); }
}
🔧 Diagnostic Commands
bash# Check system configuration
node -e "console.log('Node:', process.version)"
npm -v

# Test API connections
curl -X POST "https://api.openai.com/v1/models" \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Verify critical files
ls -la dashboard-new.html newdashboard.js modals.leonardo.css

# Restart with detailed logs
DEBUG=* npm start

📋 FAQ
❓ Frequently Asked Questions 2025
Q: How does the new drag & drop system work?
A: Simply drag your image to the highlighted zone or click to select. The system automatically validates format, size, and quality.
Q: What does the 8-news carousel mean?
A: It shows 2 recent news items from each of the 4 countries (New Zealand, Australia, United Kingdom, United States) with thematic backgrounds.
Q: How does the script approval system work?
A: After generating the script with AI, a modern modal appears where you can review the content and approve it before creating the final video.
Q: Do the heart animations affect performance?
A: No, they use optimized CSS keyframes that consume minimal resources and run on the GPU.
Q: Can I change the Leonardo.AI theme?
A: Yes, you can modify the CSS variables in modals.leonardo.css or switch to dashboard.html for the classic theme.
Q: Does the system work on mobile?
A: Yes, the responsive design ensures full functionality on mobile devices.

🥭 MANGO AI Video Studio — Advanced News Video Generation Platform

A single platform that automates professional news video production using modern AI: RAG-based retrieval, high-quality voice synthesis, and AI-driven video generation with lip-sync. Clean Leonardo-style UI.

Made with 💛 by Cheeky Mango AI Studio | Version 2.1 | October 2025

What's New (2025)
Key features implemented:

Drag & Drop image upload with validation
Intelligent carousel showing 8 news items (4 countries)
Leonardo.AI themed UI (glassmorphism + gradients)
Side-by-side AI transform preview
Responsive design (desktop, tablet, mobile)
Modal-driven approval workflow and real-time logs

Video generation highlights

Custom photo uploads for personalized videos
Dual-voice support (female / male)
Natural-language queries for content selection
Short social-ready videos (≈20 seconds)
HD output with lip-sync via Hedra AI


Table of Contents

Overview
Architecture
Features
Installation
Configuration
Usage
Project structure
Workflow
APIs & Services
Troubleshooting
FAQ


Overview
MANGO AI Video Studio is a complete system that automates audiovisual content production using modern AI components. The platform:

Crawls and indexes news from multiple sources (RAG)
Generates a short script using GPT-4 (context-aware)
Produces natural audio (ElevenLabs)
Renders a lip-synced video using Hedra AI
Delivers final output via the web dashboard and optional Telegram bot

Primary use case: produce short, professional news videos from a user-uploaded photo and a natural-language query.

Project Structure (summary)
textMANGO AI Video Studio/
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

Features (high level)

Intelligent 8-item carousel (2 items per country)
Drag & Drop upload with instant preview
Side-by-side image transformation preview
Modal-based approval flow before video creation
Telegram Bot integration (optional)


Installation
Requirements:
bashNode.js 18+ (Node 20 recommended)
Git
Quick start:
bashgit clone https://github.com/JorgeGdev/mangoAIVideo-Generator.git
cd mangoAIVideo-Generator
npm install
Create a .env file with the required API keys (see Configuration below), then run:
bashnpm start
Open the dashboard at: http://localhost:3000 (default login: admin / admin)

Configuration (environment variables)
Create a .env with the following keys (examples):
env# OpenAI
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
Do not commit .env — a .gitignore is included to prevent accidental commits.

Usage

Start the server: npm start
Open http://localhost:3000
Upload a photo, choose a voice, enter a query, and generate the video

Telegram flow (optional): use the bot to request videos via chat with approval steps.

Workflow (video generation)

User uploads image and submits a textual query
System performs RAG search and builds context
GPT-4 generates a concise script (≈65–70 words)
ElevenLabs synthesizes audio
Hedra creates the lip-synced video
Final MP4 is saved under final_videos/ and (optionally) delivered via Telegram


APIs & Services

OpenAI (GPT-4) — script generation
ElevenLabs — high-quality speech synthesis
Hedra AI — video generation and lip-sync
Supabase — vector DB / storage
Telegram — optional delivery and control


Troubleshooting & Diagnostics
Quick checks:
bashnode -e "console.log('Node:', process.version)"
npm -v
Check logs in the dashboard at http://localhost:3000.

Contributing

Open issues on GitHub with logs and reproduction steps
Send pull requests with a clear description and tests


License & Credits
Made with 💛 by Cheeky Mango AI Studio — October 2025
