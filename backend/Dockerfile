# Backend Dockerfile for OpenShift
FROM registry.access.redhat.com/ubi8/nodejs-18:latest

# Set working directory
WORKDIR /opt/app-root/src

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files (excluding data directory - will use PVC)
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts
COPY server.js ./

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001

# Run the application
CMD ["node", "server.js"]