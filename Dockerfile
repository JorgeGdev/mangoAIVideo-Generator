# Railway Deployment Configuration

FROM node:20-alpine

# Install FFmpeg and timezone data for Railway
RUN apk add --no-cache ffmpeg tzdata

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

# Set timezone to Mexico City
ENV TZ=America/Mexico_City
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Expose port
EXPOSE 3000

# Start application with garbage collection enabled
CMD ["node", "--expose-gc", "server.js"]