#!/bin/bash
# Railway setup script
# This ensures all required directories exist

echo "🚀 Setting up Mango AI Video Generator for Railway..."

# Create directories if they don't exist
mkdir -p final_videos
mkdir -p final_videos_subtitled  
mkdir -p generated_audios
mkdir -p images/modified
mkdir -p uploads
mkdir -p tmp_subtitles

echo "📁 All directories created successfully"
echo "✅ Railway setup complete - ready to deploy!"