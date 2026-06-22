# Use Node 18 slim as base image
FROM node:18-slim

# Install system dependencies required for canvas and other native libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only (with native rebuild support)
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
