# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/server/prisma ./apps/server/prisma
RUN npm ci --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web ./apps/web
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SOCKET_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
RUN npm run build -w @chatsphere/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/out ./public
USER nodejs
EXPOSE 3000
CMD ["node", "-e", "const http=require('http'),fs=require('fs'),path=require('path');const root=path.join(process.cwd(),'public');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ico':'image/x-icon'};http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);let f=path.join(root,p==='/'?'index.html':p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){f=path.join(root,'index.html');}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);}).listen(process.env.PORT||3000,process.env.HOSTNAME||'0.0.0.0');"]
