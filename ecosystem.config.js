module.exports = {
  apps: [
    {
      name: 'stair-up-web',
      script: '.next/standalone/server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000, // 部署后运行的端口
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
    },
  ],
};
