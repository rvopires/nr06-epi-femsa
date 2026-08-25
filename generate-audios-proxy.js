/**
 * Gera arquivos MP3 de narração via o proxy interno TecnoCursos
 * (https://texttospeech.escolatecnocursos.cloud), que por sua vez chama a ElevenLabs.
 *
 * Uso:
 *   node generate-audios-proxy.js s2b s2b2 s2b3 s2e
 *   node generate-audios-proxy.js --force s2e
 */

const fs = require('fs');
const path = require('path');
const {
  buildManifest,
  writeManifest,
  MANIFEST_PATH,
  parseM1gDeck,
  buildM1gQuestionNarration,
  parseEpiHierGame,
  buildS2gIntroNarration,
  buildS2gQuestionNarration,
  buildS2gResultNarration,
  parseMod2tfDeck,
  buildMod2tfQuestionNarration,
  buildMod2tfIntroNarration,
  HTML_PATH,
} = require('./audio-data');

const API_BASE = 'https://texttospeech.escolatecnocursos.cloud';

function loadEnvFile() {
  for (const filename of ['.env', '.env.local']) {
    const envPath = path.join(__dirname, filename);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function login() {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.AUTH_USERNAME,
      password: process.env.AUTH_PASSWORD,
    }),
  });
  if (!res.ok) {
    throw new Error(`Login falhou (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

async function synthesize(text, token) {
  const res = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`TTS falhou (${res.status}): ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function writeAudio(fileRel, text, token, force) {
  const outputPath = path.join(__dirname, fileRel);
  if (!force && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    console.log(`⏭ ${fileRel} — já existe (use --force para regenerar)`);
    return;
  }
  process.stdout.write(`▶ ${fileRel} (${text.length} chars)... `);
  try {
    const audio = await synthesize(text, token);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, audio);
    console.log(`ok (${audio.length} bytes)`);
  } catch (error) {
    console.log('falhou');
    console.error(`  ${error.message}`);
  }
}

async function generateS2eQuestions(token, force, totalPages) {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const deck = parseM1gDeck(html);
  if (!deck.length) {
    console.error('✗ s2e — m1gDeck não encontrado no index.html');
    return;
  }
  const pageLabel = `Página 8 de ${totalPages}.`;
  for (let i = 0; i < deck.length; i++) {
    const text = buildM1gQuestionNarration(deck[i], i, deck.length, pageLabel);
    await writeAudio(`audios/s2e-q${i + 1}.mp3`, text, token, force);
  }
}

async function generateS2gQuestions(token, force, totalPages) {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const game = parseEpiHierGame(html);
  if (!game.deck.length) {
    console.error('✗ s2g — deck epi-hier não encontrado no index.html');
    return;
  }
  const pageLabel = `Página 10 de ${totalPages}.`;
  await writeAudio('audios/s2g-intro.mp3', buildS2gIntroNarration(pageLabel), token, force);
  for (let i = 0; i < game.deck.length; i++) {
    const text = buildS2gQuestionNarration(game.deck[i], i, game.deck.length, game.categories, pageLabel);
    await writeAudio(`audios/s2g-q${i + 1}.mp3`, text, token, force);
  }
  await writeAudio('audios/s2g-result.mp3', buildS2gResultNarration(pageLabel), token, force);
}

async function generateMod2tfQuestions(token, force, totalPages) {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const deck = parseMod2tfDeck(html);
  if (!deck.length) {
    console.error('✗ s-mod2-game — mod2tfDeck não encontrado no index.html');
    return;
  }
  const pageLabel = `Página 15 de ${totalPages}.`;
  await writeAudio('audios/s-mod2-game-intro.mp3', buildMod2tfIntroNarration(pageLabel), token, force);
  for (let i = 0; i < deck.length; i++) {
    const text = buildMod2tfQuestionNarration(deck[i], i, deck.length, pageLabel);
    await writeAudio(`audios/s-mod2-game-q${i + 1}.mp3`, text, token, force);
  }
}

async function main() {
  loadEnvFile();

  const rawArgs = process.argv.slice(2);
  const force = rawArgs.includes('--force');
  const ids = rawArgs
    .filter((a) => a !== '--force')
    .map((a) => a.replace(/^--slide=/, ''));
  if (!ids.length) {
    console.error('Informe ao menos um id de slide. Ex.: node generate-audios-proxy.js s2b s2c');
    process.exit(1);
  }
  if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD) {
    console.error('Defina AUTH_USERNAME e AUTH_PASSWORD no .env');
    process.exit(1);
  }

  const manifest = buildManifest();
  const totalPages = manifest.slides.length;

  console.log('Autenticando no proxy...');
  const token = await login();
  console.log('Login ok.\n');

  for (const id of ids) {
    if (id === 's2e') {
      await generateS2eQuestions(token, force, totalPages);
      continue;
    }
    if (id === 's2g') {
      await generateS2gQuestions(token, force, totalPages);
      continue;
    }
    if (id === 's-mod2-game') {
      await generateMod2tfQuestions(token, force, totalPages);
      continue;
    }

    const slide = manifest.slides.find((s) => s.id === id);
    if (!slide) {
      console.error(`✗ ${id} — não encontrado no manifesto (verifique o id do slide)`);
      continue;
    }

    await writeAudio(slide.file, slide.text, token, force);
  }

  const refreshed = buildManifest();
  writeManifest(refreshed, MANIFEST_PATH);
  console.log('\nManifesto atualizado (manifest.json + audio-manifest.js).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
