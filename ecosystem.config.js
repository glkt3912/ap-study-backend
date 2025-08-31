module.exports = {
  apps: [{
    name: 'ap-study-backend',
    script: 'dist/app.js',
    cwd: '/var/www/ap-study/ap-study-backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '400M',
    
    // 環境変数（.envから読み込み）
    env: {
      NODE_ENV: process.env.NODE_ENV || 'production',
      PORT: process.env.PORT || 8000,
      HOST: process.env.HOST || '0.0.0.0'
    },
    
    // ログ設定
    error_file: '/var/log/ap-study/error.log',
    out_file: '/var/log/ap-study/out.log',
    log_file: '/var/log/ap-study/combined.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // プロセス設定
    kill_timeout: 5000,
    listen_timeout: 10000,
    
    // ヘルスチェック
    health_check_grace_period: 3000,
    
    // 再起動設定
    max_restarts: 10,
    min_uptime: '10s',
    
    // Node.js設定（512MB VPS対応）
    node_args: ['--max-old-space-size=384'],
    
    // 環境設定ファイル
    env_file: '.env.production'
  }],
  
  // デプロイ設定
  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_VPS_IP',
      ref: 'origin/main',
      repo: 'https://github.com/USERNAME/ap-study-project.git',
      path: '/var/www/ap-study',
      'post-deploy': 'cd ap-study-backend && npm ci && npm run build && pm2 reload ecosystem.config.js',
      'pre-setup': 'apt update && apt install git nodejs npm -y'
    }
  }
};