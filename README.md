# 🥭 Mango AI Video Generator

AI-powered video generation platform with real-time news scraping capabilities.

## 🚀 Features

- **AI Video Generation**: Upload photos and generate AI-powered videos  
- **Real-time News Scraping**: Automatic scraping from 4 international sources every 4 hours
- **User Management**: Admin panel for user creation and management
- **Live Progress Tracking**: Real-time video generation progress with modal interface
- **Telegram Integration**: Bot integration for notifications
- **Supabase Integration**: Cloud database for news storage

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4, DALL-E
- **File Processing**: FFmpeg, Sharp
- **Real-time**: Server-Sent Events (SSE)
- **Authentication**: JWT with bcrypt

## 🌐 Deploy to Railway

This project is optimized for Railway deployment with automatic configurations.

### Prerequisites
- OpenAI API Key
- Supabase Project (URL + Key)
- Telegram Bot Token (optional)

### Environment Variables Required
```env
NODE_ENV=production
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
BOT_TOKEN=your_telegram_bot_token
CHAT_ID=your_telegram_chat_id
JWT_SECRET=your_jwt_secret
```

### Deploy Steps
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard  
3. Deploy automatically - Railway will detect Node.js and use `server.js`

## 📁 Project Structure

```
├── server.js              # Main server file
├── admin.html             # Admin panel UI
├── scraper-4-paises-final.js  # News scraper
├── frontend/              # Frontend assets
├── modules/               # Backend modules
├── final_videos/          # Generated videos
├── final_videos_subtitled/ # Videos with subtitles
├── generated_audios/      # Audio files
├── images/               # Image processing
└── uploads/              # User uploads
```

## 🔄 Automatic Features

- **Auto Scraper**: Runs every 4 hours automatically
- **File Watching**: Detects new videos and processes them
- **Health Monitoring**: Built-in system monitoring

## 👨‍💼 Admin Access

Default admin credentials:
- Username: `admin`
- Access admin panel via `/admin.html` (requires admin role)

## 🎥 Video Generation Process

1. User uploads photo and selects voice
2. AI generates script based on news query
3. Admin approves/rejects script
4. System generates video with AI voice
5. Automatic subtitle generation and burning
6. Real-time progress tracking with modals

## 📱 API Endpoints

- `POST /api/auth/login` - User login
- `GET /api/auth/users` - List users (admin only)
- `POST /api/auth/create-user` - Create user (admin only)
- `POST /api/scraper/start` - Manual scraper trigger
- `GET /api/logs` - Real-time logs (SSE)
- `POST /api/video/generate` - Generate video
- `GET /admin.html` - Admin panel (admin only)

---

Made with 💛 by **Cheeky Mango AI Studio**
