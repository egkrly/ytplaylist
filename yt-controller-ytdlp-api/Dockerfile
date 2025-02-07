# yt-controller-ytdlp-api/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies required for yt-dlp
RUN apk add --no-cache python3 curl

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001
CMD ["npm", "start"]