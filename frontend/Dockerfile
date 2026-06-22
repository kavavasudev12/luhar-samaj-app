# Stage 1: Build the React app
FROM node:18-slim as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy built static files to Nginx public folder
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration if needed, or fallback to default
# Ensure routing works for React router (redirecting all non-file requests to index.html)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
