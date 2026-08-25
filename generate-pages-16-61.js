/**
 * Gera narrações das páginas 16–61 (MP3 em audios/), no mesmo padrão das 1–15.
 * Uso: node generate-pages-16-61.js [--force]
 */
const fs = require('fs');
const path = require('path');
const {
  buildManifest,
  writeManifest,
  MANIFEST_PATH,
  HTML_PATH,
  cleanText,
  parseEpiHierGame,
  parseEpiInpGame,
  parseMod2tfDeck,
  parseM4gDeck,
  parseM5gDeck,
  parseM6gDeck,
  parseM7gDeck,
  parseM8gDeck,
} = require('./audio-data');

const API_BASE = 'https://texttospeech.escolatecnocursos.cloud';
const FORCE = process.argv.includes('--force');

const QUIZ_SLIDE_IDS = new Set([
  's-mod3-game',
  's-mod4-game',
  's-mod5-game',
  's-mod6-game',
  's-mod7-game',
  's-mod8-game',
]);

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
  if (!res.ok) throw new Error(`Login falhou (${res.status}): ${await res.text()}`);
  return (await res.json()).token;
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
  if (!res.ok) throw new Error(`TTS falhou (${res.status}): ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function writeAudio(fileRel, text, token) {
  const outputPath = path.join(__dirname, fileRel);
  if (!FORCE && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    console.log(`⏭ ${fileRel}`);
    return;
  }
  process.stdout.write(`▶ ${fileRel} (${text.length} chars)... `);
  try {
    const audio = await synthesize(text, token);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, audio);
    console.log(`ok (${audio.length} bytes)`);
  } catch (err) {
    console.log('falhou');
    console.error(`  ${err.message}`);
  }
}

function pageLabel(n, total) {
  return `Página ${n} de ${total}.`;
}

function letters(n) {
  return ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, n);
}

async function genEpiMatch(prefix, pageNum, total, title, game, token) {
  const label = pageLabel(pageNum, total);
  await writeAudio(
    `audios/${prefix}-intro.mp3`,
    cleanText(`${label} ${title}. Associe cada frase à categoria correta.`),
    token
  );
  for (let i = 0; i < game.deck.length; i++) {
    const parts = [
      label,
      title + '.',
      `Situação ${i + 1} de ${game.deck.length}.`,
      game.deck[i].text,
      'Escolha a categoria:',
    ];
    (game.categories || []).forEach((cat, ci) => {
      parts.push(`Alternativa ${ci + 1}: ${cat}.`);
    });
    await writeAudio(`audios/${prefix}-q${i + 1}.mp3`, cleanText(parts.join(' ')), token);
  }
  await writeAudio(
    `audios/${prefix}-result.mp3`,
    cleanText(`${label} Associação concluída. Parabéns!`),
    token
  );
}

async function genMcq(prefix, pageNum, total, title, deck, token, qField = 'q') {
  const label = pageLabel(pageNum, total);
  await writeAudio(
    `audios/${prefix}-intro.mp3`,
    cleanText(`${label} ${title}. Responda às perguntas escolhendo a alternativa correta.`),
    token
  );
  for (let i = 0; i < deck.length; i++) {
    const item = deck[i];
    const opts = item.opts || [];
    const lets = letters(opts.length);
    const parts = [
      label,
      title + '.',
      `Pergunta ${i + 1} de ${deck.length}.`,
      cleanText(item[qField] || item.sit || item.text || ''),
    ];
    opts.forEach((opt, oi) => {
      if (typeof opt === 'string') {
        parts.push(`Alternativa ${lets[oi]}: ${cleanText(opt)}`);
      } else if (opt.t) {
        parts.push(`Alternativa ${lets[oi]}: ${cleanText(opt.chip || '')}. ${cleanText(opt.t)}`);
      } else if (opt.name) {
        parts.push(`Alternativa ${lets[oi]}: ${cleanText(opt.name)}. ${cleanText(opt.desc || '')}`);
      }
    });
    await writeAudio(`audios/${prefix}-q${i + 1}.mp3`, cleanText(parts.join(' ')), token);
  }
}

async function genLiberado(prefix, pageNum, total, title, deck, token) {
  const label = pageLabel(pageNum, total);
  await writeAudio(
    `audios/${prefix}-intro.mp3`,
    cleanText(`${label} ${title}. Decida se cada prática está liberada ou não liberada.`),
    token
  );
  for (let i = 0; i < deck.length; i++) {
    const text = cleanText(
      [
        label,
        title + '.',
        `Situação ${i + 1} de ${deck.length}.`,
        deck[i].sit,
        'Alternativas: Liberado ou Não liberado.',
      ].join(' ')
    );
    await writeAudio(`audios/${prefix}-q${i + 1}.mp3`, text, token);
  }
}

async function main() {
  loadEnvFile();
  if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD) {
    console.error('Defina AUTH_USERNAME e AUTH_PASSWORD no .env');
    process.exit(1);
  }

  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const manifest = buildManifest();
  const total = manifest.slides.length;
  const fromIdx = 15; // 0-based -> página 16

  console.log('Autenticando no proxy...');
  const token = await login();
  console.log('Login ok.\n');

  // Estáticos 16–61 (exceto quizzes com arquivos por pergunta)
  for (let i = fromIdx; i < manifest.slides.length; i++) {
    const slide = manifest.slides[i];
    if (QUIZ_SLIDE_IDS.has(slide.id)) continue;
    await writeAudio(slide.file, slide.text, token);
  }

  // Quizzes
  console.log('\n--- Quizzes ---');
  await genEpiMatch(
    's-mod3-game',
    18,
    total,
    'Quiz — Módulo 3',
    parseEpiInpGame(html),
    token
  );
  await genMcq('s-mod4-game', 22, total, 'Quiz — Módulo 4', parseM4gDeck(html), token, 'q');
  await genMcq('s-mod5-game', 34, total, 'Quiz — Módulo 5', parseM5gDeck(html), token, 'q');
  await genLiberado('s-mod6-game', 42, total, 'Quiz — Módulo 6', parseM6gDeck(html), token);
  await genMcq('s-mod7-game', 53, total, 'Quiz — Módulo 7', parseM7gDeck(html), token, 'sit');
  await genMcq('s-mod8-game', 60, total, 'Quiz — Módulo 8', parseM8gDeck(html), token, 'sit');

  writeManifest(buildManifest(), MANIFEST_PATH);
  console.log('\nManifesto atualizado.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
