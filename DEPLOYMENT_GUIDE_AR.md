# دليل نشر مشروع الشهادات الموحد على سيرفر Ubuntu

هذا الدليل يشرح كيفية رفع وتشغيل المشروع على سيرفر Ubuntu باستخدام طريقتين: **Docker** (الموصى بها) أو **PM2**.

---

## 🚀 المتطلبات الأساسية (Prerequisites)

1. **تحديث السيرفر وتثبيت الأدوات الأساسية:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install git curl build-essential -y
   ```

2. **تثبيت Docker (للطريقة الأولى):**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   # قم بتسجيل الخروج والمن دخول مرة أخرى لتفعيل الصلاحيات
   ```

3. **تثبيت Node.js & PM2 (للطريقة الثانية):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```

---

## 🛠️ الخطوة 1: رفع المشروع وإعداد البيئة

1. قم بفك ضغط المشروع أو سحبه من Git على السيرفر.
2. توجه إلى مجلد المشروع: `cd Certificates-despro`
3. أنشئ ملف `.env` من القالب الموجود:
   ```bash
   cp .env.example .env
   ```
4. **هام جداً:** قم بتعديل ملف `.env` ووضع القيم الصحيحة لسيرفرك (الدومين، المفاتيح السرية، إلخ):
   ```bash
   nano .env
   ```

---

## 🐳 الطريقة الأولى: التشغيل باستخدام Docker (الموصى بها)

هذه الطريقة تشمل بناء الواجهة (Frontend) والخلفية (Backend) تلقائياً داخل حاوية معزولة.

1. **تشغيل المشروع:**
   ```bash
   npm run docker:up
   ```
2. **التحقق من الحالة:**
   ```bash
   docker ps
   ```

*ملاحظة: إذا كنت تستخدم Nginx Proxy المدمج في الخطة، تأكد من إعداد شبكة `web-network` يدوياً أول مرة:*
```bash
docker network create web-network
```

---

## 🟢 الطريقة الثانية: التشغيل باستخدام PM2 (بدون Docker)

إذا كنت تفضل التشغيل المباشر على السيرفر:

1. **تثبيت المناديب:**
   ```bash
   npm run install-all
   ```
2. **بناء الواجهة الأمامية:**
   ```bash
   npm run build
   ```
3. **تشغيل المشروع بواسطة PM2:**
   ```bash
   npm run prod:start
   ```
4. **حفظ الحالة ليعمل تلقائياً عند إعادة تشغيل السيرفر:**
   ```bash
   pm2 save
   pm2 startup
   ```

---

## 🌐 الخطوة 3: إعداد Nginx وشهادة SSL

1. **تثبيت Nginx:**
   ```bash
   sudo apt install nginx -y
   ```
2. **إعداد التكوين:** قم بنسخ محتوى `nginx.conf.template` إلى ملف جديد في `/etc/nginx/sites-available/` وقم بتعديل الدومين.
3. **تفعيل الشهادة (SSL):**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d YOUR_DOMAIN.com
   ```

---

## 📂 ملاحظات هامة حول البيانات
- يتم تخزين البيانات (Admin, Certificates) في مجلد `server/data`.
- في حالة Docker، تم ربط هذا المجلد بـ Volume لضمان عدم فقدان البيانات عند تحديث الحاوية.
- تأكد من أخذ نسخة احتياطية (Backup) دورية لهذا المجلد.

---

**تم إعداد المشروع بنجاح! 🎉**
إذا واجهت أي مشكلة، يمكنك مراجعة السجلات (Logs) باستخدام:
- Docker: `docker logs certificates_backend`
- PM2: `pm2 logs certificates-unified`
