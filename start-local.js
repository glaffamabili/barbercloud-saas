const { spawn } = require('child_process');
const path = require('path');

const baseEnv = {
  ...process.env,
  DB_HOST: process.env.DB_HOST || '35.226.64.52',
  DB_USER: process.env.DB_USER || 'IAC_2026_02_amabili_flor',
  DB_PASSWORD: process.env.DB_PASSWORD || 'OLv1YqcvRAjZws',
  DB_NAME: process.env.DB_NAME || 'IAC_2026_02_amabili_flor',
  LOG_SERVICE_HOST: '127.0.0.1',
  LOG_SERVICE_PORT: '3002',
  LOG_SERVICE_URL: 'http://127.0.0.1:3002',
  AUTH_SERVICE_URL: 'http://127.0.0.1:3001',
  APP_URL: 'http://localhost:8200'
};

function startService(name, dir, port) {
  const proc = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, dir),
    env: { ...baseEnv, PORT: String(port) },
    stdio: 'inherit'
  });
  proc.on('exit', (code) => {
    console.log(`[${name}] finalizado com código ${code}`);
  });
  return proc;
}

console.log('🚀 Iniciando ecossistema BarberCloud SaaS localmente...');
startService('log-service', 'log-service', 3002);
startService('auth-service', 'auth-service', 3001);
startService('catalog-service', 'catalog-service', 8200);
