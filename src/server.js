const env = require('./config/env');
const { createApp, ensureReady } = require('./app');

async function start() {
  try {
    await ensureReady();

    const app = createApp();
    app.listen(env.app.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Avatar Expo 服务启动: http://localhost:${env.app.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('服务启动失败:', error.message);
    process.exit(1);
  }
}

start();
