# Frontend Dockerfile (frontend/Dockerfile)
FROM node:22-alpine

WORKDIR /app

# Accept build arguments
ARG VITE_API_URL=http://46.202.160.247:8000

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL

COPY front/ /app/
RUN npm install && npm run build

# Use nginx to serve the frontend
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
