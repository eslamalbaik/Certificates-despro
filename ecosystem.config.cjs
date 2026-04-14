module.exports = {
  apps: [
    {
      name: "certificates-unified",
      script: "./server/server.js",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      // تأكد من وجود المجلدات اللازمة قبل التشغيل
      pre_start_action: "npm run build:client",
    },
  ],
};
