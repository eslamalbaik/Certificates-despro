# --- المرحلة الأولى: بناء الواجهة الأمامية (Frontend Build) ---
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- المرحلة الثانية: تجهيز الخادم (Backend Setup) ---
FROM node:22-alpine
WORKDIR /app/server

# تثبيت المناديب للخادم
COPY server/package*.json ./
RUN npm install --production

# نسخ ملفات الخادم
COPY server/ ./

# نسخ ملفات الواجهة الأمامية المبنية إلى المسار المتوقع
COPY --from=client-builder /app/client/dist /app/client/dist

# إعداد المتغيرات البيئية
ENV NODE_ENV=production
ENV PORT=5000

# فتح المنفذ
EXPOSE 5000

# تشغيل الخادم
CMD ["node", "server.js"]
