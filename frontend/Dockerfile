# Multi-stage build for Frontend
# Stage 1: Build
FROM registry.access.redhat.com/ubi8/nodejs-18:latest AS builder

WORKDIR /opt/app-root/src

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Set API URL to use relative path (nginx will proxy to backend)
ENV VITE_API_URL=/api

# Build the application
RUN npm run build

# Stage 2: Production
FROM registry.access.redhat.com/ubi8/nginx-122:latest

# Copy built files from builder stage
COPY --from=builder /opt/app-root/src/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 8080

# Run nginx
CMD ["nginx", "-g", "daemon off;"]