import { createApp } from './app.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const app = await createApp(env);

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
