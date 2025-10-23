# Railway Deployment Configuration

FROM node:18-alpine

# Install FFmpeg for Railway
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Create temporary directories
RUN mkdir -p /tmp/videos /tmp/audios /tmp/images /tmp/uploads

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]