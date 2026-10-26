import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ts from 'typescript';

// Local Hyperdrive emulation keeps database TLS in Node, where the Supabase CA
// can be verified. Secrets remain in the child environment, never CLI arguments.
process.loadEnvFile('.env');
if (!process.env.SUPABASE_DB_URL) throw new Error('Isi SUPABASE_DB_URL di .env terlebih dahulu.');
const config = ts.parseConfigFileTextToJson(
  'wrangler.jsonc',
  fs.readFileSync('wrangler.jsonc', 'utf8'),
).config;
config.main = path.resolve(config.main);
config.assets.directory = path.resolve(config.assets.directory);
config.hyperdrive = [{ binding: 'HYPERDRIVE', id: '00000000000000000000000000000000' }];
fs.mkdirSync('artifacts', { recursive: true });
const configPath = 'artifacts/cloudflare-local.json';
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
const devVars = ['GEMINI_API_KEY', 'GEMINI_MODEL']
  .filter((key) => process.env[key])
  .map((key) => key + '=' + JSON.stringify(process.env[key]));
fs.writeFileSync('artifacts/.dev.vars', [...devVars, 'SECURE_COOKIES="false"'].join('\n') + '\n');
const url = new URL(process.env.SUPABASE_DB_URL);
url.searchParams.set('sslmode', 'verify-full');
url.searchParams.set('sslrootcert', path.resolve('certs/prod-supabase.cer'));
const child = spawn(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'dev',
    '--config',
    configPath,
    '--port',
    '8787',
    '--ip',
    '127.0.0.1',
    '--show-interactive-dev-session=false',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: url.toString(),
    },
  },
);
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
