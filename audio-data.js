/**
 * Extrai o manifesto de narração a partir do index.html.
 *
 * Uso:
 *   node audio-data.js              → gera audios/manifest.json
 *   const { buildManifest } = require('./audio-data');
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = __dirname;
const HTML_PATH = path.join(ROOT, 'index.html');
const OUTPUT_DIR = path.join(ROOT, 'audios');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

/** Sem overrides: a narração lê o HTML da página (e quizzes por pergunta). */
const NARRATION_OVERRIDES = {};

function cleanText(text) {
  return (text || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXTRACT_REMOVE_SELECTOR = [
  'script', 'iframe', 'svg', 'style', 'button:not(.epi-flip-card)',
  '.wave', '.nav-btn', '.zoom-btn', '[id$="-mobile-section"]',
  '[hidden]', '[aria-hidden="true"]',
  // Chrome da página (não é o conteúdo): tag emoji + breadcrumb do módulo
  '.section-tag',
  '.slide-subtitle',
  '.epi-flip-hint',
  '.epi-flip-carousel-hint',
  '.epi-flip-tap',
  '.epi-flip-back-foot',
  '.m2t-carousel-nav',
  '.m2d-carousel-nav',
  '#mod1-game-intro', '#mod1-game-result',
  '#epi-hier-result',
  '#mod2tf-intro', '#mod2tf-result',
].join(', ');

/**
 * Monta o texto de narração a partir do que importa na tela:
 * título + conteúdo principal (cards, parágrafos, listas).
 * Ignora tags "Introdução"/"Objetivo" e o subtítulo-breadcrumb do módulo.
 */
function extractSlideText(slide) {
  const custom = slide.getAttribute('data-audio-text');
  if (custom) return cleanText(custom);

  const parts = [];

  // Capa / intro de módulo: ler bloco principal
  if (slide.id === 's1') {
    const tag = slide.querySelector('.s1-tag');
    const h1 = slide.querySelector('h1');
    const p = slide.querySelector('.s1-text-col > p');
    if (tag) parts.push(cleanText(tag.textContent));
    if (h1) parts.push(cleanText(h1.textContent));
    if (p) parts.push(cleanText(p.textContent));
    slide.querySelectorAll('.s1-badge').forEach((badge) => {
      const strong = badge.querySelector('strong');
      const span = badge.querySelector('span');
      const line = [strong && strong.textContent, span && span.textContent]
        .map(cleanText)
        .filter(Boolean)
        .join('. ');
      if (line) parts.push(line);
    });
    return parts.filter(Boolean).join('. ');
  }

  if (slide.classList.contains('mod-intro-slide')) {
    const badge = slide.querySelector('.mod-intro-badge');
    const title = slide.querySelector('.mod-intro-title');
    const sub = slide.querySelector('.mod-intro-sub');
    if (badge) parts.push(cleanText(badge.textContent));
    if (title) parts.push(cleanText(title.textContent));
    if (sub) parts.push(cleanText(sub.textContent));
    return parts.filter(Boolean).join('. ');
  }

  const titleEl = slide.querySelector('.slide-title, h1');
  if (titleEl) parts.push(cleanText(titleEl.textContent));

  const content = slide.querySelector('.content-area');
  if (content) {
    const clone = content.cloneNode(true);

    // Cards viráveis: título + texto do verso (antes de remover botões genéricos)
    clone.querySelectorAll('button.epi-flip-card, .epi-flip-card').forEach((card) => {
      const title =
        cleanText(card.querySelector('.epi-flip-front h4')?.textContent || '') ||
        cleanText(card.querySelector('.epi-flip-back h4')?.textContent || '');
      const back = cleanText(card.querySelector('.epi-flip-back p')?.textContent || '');
      const span = slide.ownerDocument.createElement('span');
      span.textContent = [title, back].filter(Boolean).join('. ') + '. ';
      card.replaceWith(span);
    });

    clone.querySelectorAll(EXTRACT_REMOVE_SELECTOR).forEach((el) => el.remove());

    ['#mod1-game-play', '#epi-hier-intro', '#epi-hier-play', '#mod2tf-play'].forEach((sel) => {
      const orig = slide.querySelector(sel);
      const copy = clone.querySelector(sel);
      if (!orig || !copy) return;
      if (sel === '#epi-hier-intro' || sel === '#epi-hier-play') {
        const anyActive = slide.querySelector(
          '#epi-hier-intro.is-active, #epi-hier-play.is-active, #epi-hier-result.is-active'
        );
        if (!anyActive && sel === '#epi-hier-intro') return;
        if (!orig.classList.contains('is-active')) copy.remove();
      }
    });

    clone.querySelectorAll('img[alt]').forEach((img) => {
      const alt = cleanText(img.getAttribute('alt') || '');
      if (!alt) {
        img.remove();
        return;
      }
      const span = slide.ownerDocument.createElement('span');
      span.textContent = ` Imagem: ${alt}. `;
      img.replaceWith(span);
    });

    const body = cleanText(clone.textContent || '');
    if (body) parts.push(body);
  }

  let text = parts.filter(Boolean).join('. ');

  if (text.length < 40) {
    const iframeTitle = slide.querySelector('iframe[title]')?.getAttribute('title');
    const imgAlt = slide.querySelector('img[alt]')?.getAttribute('alt');
    const title = titleEl?.textContent;
    const fallback = [title, iframeTitle, imgAlt]
      .map(cleanText)
      .filter(Boolean)
      .filter((part, idx, arr) => arr.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === idx);
    if (fallback.length) text = fallback.join('. ');
  }

  return text;
}

function parseQuizQuestions(html) {
  const match = html.match(/const\s+q1_questions\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function parseQ5Questions(html) {
  const match = html.match(/const\s+q5_questions\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function parseM1gDeck(html) {
  const match = html.match(/const\s+m1gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];
  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

/** Texto de uma pergunta do quiz da página 8 (s2e), com alternativas A/B/C. */
function buildM1gQuestionNarration(item, index, total, pageLabel = 'Página 8 de 61.') {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const parts = [
    pageLabel,
    'Teste Rápido.',
    `Pergunta ${index + 1} de ${total}.`,
    cleanText(item.q),
  ];
  (item.opts || []).forEach((opt, i) => {
    parts.push(`Alternativa ${letters[i] || i + 1}: ${cleanText(opt)}`);
  });
  return parts.filter(Boolean).join(' ');
}

function parseEpiHierGame(html) {
  const block = html.match(/'epi-hier':\s*\{([\s\S]*?)\},\s*'epi-inp'/);
  if (!block) return { categories: [], deck: [] };
  let categories = [];
  let deck = [];
  try {
    const catsMatch = block[1].match(/categories:\s*(\[[\s\S]*?\])/);
    if (catsMatch) categories = Function(`"use strict"; return (${catsMatch[1]});`)();
  } catch { /* ignore */ }
  try {
    const deckMatch = block[1].match(/deck:\s*(\[[\s\S]*?\])\s*,\s*idx/);
    if (deckMatch) deck = Function(`"use strict"; return (${deckMatch[1]});`)();
  } catch { /* ignore */ }
  return { categories, deck };
}

function parseEpiInpGame(html) {
  const block = html.match(/'epi-inp':\s*\{([\s\S]*?)idx:\s*0/);
  if (!block) return { categories: [], deck: [] };
  let categories = [];
  let deck = [];
  try {
    const catsMatch = block[1].match(/categories:\s*(\[[\s\S]*?\])/);
    if (catsMatch) categories = Function(`"use strict"; return (${catsMatch[1]});`)();
  } catch { /* ignore */ }
  try {
    const deckMatch = block[1].match(/deck:\s*(\[[\s\S]*?\])\s*,/);
    if (deckMatch) deck = Function(`"use strict"; return (${deckMatch[1]});`)();
  } catch { /* ignore */ }
  return { categories, deck };
}

function buildS2gIntroNarration(pageLabel = 'Página 10 de 61.') {
  return cleanText(
    `${pageLabel} Quiz — Módulo 1. Leia cada frase e escolha a categoria correta: Eliminação, Redução ou Substituição, Engenharia, Administrativos ou EPI — da medida mais eficaz até a última barreira.`
  );
}

function buildS2gQuestionNarration(item, index, total, categories, pageLabel = 'Página 10 de 61.') {
  const parts = [
    pageLabel,
    'Quiz — Módulo 1.',
    `Situação ${index + 1} de ${total}.`,
    cleanText(item.text),
    'Escolha a categoria:',
  ];
  (categories || []).forEach((cat, i) => {
    parts.push(`Alternativa ${i + 1}: ${cleanText(cat)}.`);
  });
  return parts.filter(Boolean).join(' ');
}

function buildS2gResultNarration(pageLabel = 'Página 10 de 61.') {
  return cleanText(
    `${pageLabel} Associação concluída. Parabéns! Você associou corretamente as 5 categorias da hierarquia de controle de riscos.`
  );
}

function parseMod1GameDeck(html) {
  const match = html.match(/const\s+mod1GameDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function parseQm2Questions(html) {
  const match = html.match(/const\s+qm2_questions\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildMod1Narration(deck) {
  if (!deck.length) {
    return 'Quiz NR-06 — Módulo 1. Legislação e Requisitos. Responda a três perguntas rápidas sobre os conceitos legais do módulo e valide seu aprendizado.';
  }

  const parts = [
    'Quiz NR-06 — Módulo 1. Legislação e Requisitos. Responda a três perguntas rápidas sobre os conceitos legais do módulo e valide seu aprendizado.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Pergunta ${index + 1}: ${cleanText(item.text)}`);
    (item.options || []).forEach((opt) => {
      parts.push(`Alternativa ${opt.key}: ${cleanText(opt.text)}`);
    });
    parts.push(`Resposta correta: alternativa ${item.correct}. ${cleanText(item.tip)}`);
  });

  return parts.join(' ');
}

function parseMod2tfDeck(html) {
  const match = html.match(/const\s+mod2tfDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildMod2tfQuestionNarration(item, index, total, pageLabel = 'Página 15 de 61.') {
  return cleanText(
    [
      pageLabel,
      'Desafio — Verdadeiro ou Falso.',
      `Afirmação ${index + 1} de ${total}.`,
      item.text,
      'Alternativas: Verdadeiro ou Falso.',
    ].join(' ')
  );
}

function buildMod2tfIntroNarration(pageLabel = 'Página 15 de 61.') {
  return cleanText(
    `${pageLabel} Desafio — Verdadeiro ou Falso. Responda se cada afirmação sobre acidente de trabalho e doença ocupacional é verdadeira ou falsa.`
  );
}

function buildMod2tfNarration(deck) {
  if (!deck.length) {
    return 'Desafio Módulo 2 — Verdadeiro ou Falso. Responda afirmações sobre o módulo e valide o que você aprendeu.';
  }

  const parts = [
    'Desafio Módulo 2 — Verdadeiro ou Falso. Responda afirmações sobre acidente de trabalho e doença ocupacional.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Afirmação ${index + 1}: ${cleanText(item.text)}`);
    parts.push(`Alternativas: Verdadeiro ou Falso.`);
  });

  return parts.join(' ');
}

function buildMod2Narration(questions) {
  if (!questions.length) {
    return 'Quiz — Módulo 2. Acidente de Trabalho e Doença Ocupacional. Responda cinco perguntas sobre o equipamento. Acerte pelo menos três questões para concluir o módulo.';
  }

  const parts = [
    'Quiz. Acidente de Trabalho e Doença Ocupacional. Quiz — Módulo 2. Responda cinco perguntas sobre o conteúdo do módulo. Acerte pelo menos três questões para concluir o módulo.',
  ];

  questions.forEach((item, index) => {
    parts.push(`Pergunta ${index + 1}: ${cleanText(item.q)}`);
    item.opts.forEach((opt, optIndex) => {
      const marker = optIndex === item.correct ? 'Resposta correta' : `Alternativa ${optIndex + 1}`;
      parts.push(`${marker}: ${cleanText(opt)}`);
    });
    if (item.feedback_ok) {
      parts.push(cleanText(item.feedback_ok));
    }
  });

  return parts.join(' ');
}

function parseMod3BinaryDeck(html) {
  const match = html.match(/const\s+mod3BinaryDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function parseM3gDeck(html) {
  const match = html.match(/var\s+m3gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM3gNarration(deck) {
  if (!deck.length) {
    return 'Desafio Módulo 3 — Missão do Operador. Leia cinco situações reais de operação e escolha a atitude correta.';
  }

  const letters = ['A', 'B', 'C'];
  const parts = [
    'Desafio Módulo 3 — Missão do Operador. Leia cinco situações reais de operação e escolha a atitude correta.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Situação ${index + 1}: ${cleanText(item.sit)}`);
    item.opts.forEach((opt, optIndex) => {
      parts.push(`Alternativa ${letters[optIndex] || optIndex + 1}: ${cleanText(opt)}`);
    });
    parts.push(`Resposta correta: alternativa ${letters[item.ans] || item.ans + 1}. ${cleanText(item.fb)}`);
  });

  return parts.join(' ');
}

function parseM4gDeck(html) {
  const match = html.match(/var\s+m4gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM4gNarration(deck) {
  if (!deck.length) {
    return 'Quiz NR-06 — Módulo 4. Responda as perguntas sobre perigo e risco. Escolha a alternativa e toque em Verificar resposta.';
  }

  const letters = ['A', 'B', 'C', 'D'];
  const parts = [
    'Quiz NR-06 — Módulo 4. Responda as perguntas sobre perigo e risco. Escolha a alternativa e toque em Verificar resposta.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Pergunta ${index + 1}: ${cleanText(item.q)}`);
    (item.opts || []).forEach((opt, optIndex) => {
      parts.push(`Alternativa ${letters[optIndex] || optIndex + 1}: ${cleanText(opt)}`);
    });
    parts.push(`Resposta correta: alternativa ${letters[item.ans] || item.ans + 1}. ${cleanText(item.tipOk || item.tip || '')}`);
  });

  return parts.join(' ');
}

function parseM5gDeck(html) {
  const match = html.match(/var\s+m5gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM5gNarration(deck) {
  if (!deck.length) {
    return 'Quiz NR-06 — Módulo 5. Responda 6 perguntas sobre proteção auditiva. Escolha a alternativa e toque em Verificar resposta. Para avançar, é preciso acertar pelo menos 4 de 6.';
  }

  const letters = ['A', 'B', 'C', 'D'];
  const parts = [
    'Quiz NR-06 — Módulo 5. Responda 6 perguntas sobre proteção auditiva. Escolha a alternativa e toque em Verificar resposta. Para avançar, é preciso acertar pelo menos 4 de 6.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Pergunta ${index + 1}: ${cleanText(item.q)}`);
    (item.opts || []).forEach((opt, optIndex) => {
      parts.push(`Alternativa ${letters[optIndex] || optIndex + 1}: ${cleanText(opt)}`);
    });
    parts.push(`Resposta correta: alternativa ${letters[item.ans] || item.ans + 1}. ${cleanText(item.tipOk || item.fb || '')}`);
  });

  return parts.join(' ');
}

function parseM6gDeck(html) {
  const match = html.match(/var\s+m6gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM6gNarration(deck) {
  if (!deck.length) {
    return 'Quiz NR-06 — Módulo 6. Liberado ou Não? Avalie situações de proteção visual e diga se a prática está liberada ou não liberada.';
  }

  const parts = [
    'Quiz NR-06 — Módulo 6. Liberado ou Não? Avalie situações de proteção visual e diga se a prática está liberada ou não liberada.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Situação ${index + 1}: ${cleanText(item.sit)}`);
    parts.push(`Resposta correta: ${item.liberado ? 'Liberado' : 'Não liberado'}. ${cleanText(item.tipOk || '')}`);
  });

  return parts.join(' ');
}

function parseM8gDeck(html) {
  const match = html.match(/var\s+m8gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];
  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM8gNarration(deck) {
  if (!deck.length) {
    return 'Quiz NR-06 — Módulo 8. Atividade Luva Certa. Proteção das mãos. Leia a situação e toque na luva ou atitude correta.';
  }
  const parts = [
    'Quiz NR-06 — Módulo 8. Atividade Luva Certa. Proteção das mãos. Escolha a luva ou a atitude correta em cada situação.',
  ];
  deck.forEach((item, index) => {
    parts.push(`Situação ${index + 1}: ${cleanText(item.sit)}`);
    (item.opts || []).forEach((opt) => {
      const label = cleanText([opt.name, opt.desc].filter(Boolean).join('. '));
      parts.push(`${opt.ok ? 'Resposta correta' : 'Opção incorreta'}: ${label}`);
    });
  });
  return parts.join(' ');
}

function parseM7gDeck(html) {
  const match = html.match(/var\s+m7gDeck\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM7gNarration(deck) {
  if (!deck.length) {
    return 'Quiz NR-06 — Módulo 7. Filtro Certo. Escolha a proteção ou o cuidado adequado em cada situação de proteção respiratória.';
  }

  const parts = [
    'Quiz NR-06 — Módulo 7. Filtro Certo. Escolha a proteção ou o cuidado adequado em cada situação de proteção respiratória.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Situação ${index + 1}: ${cleanText(item.sit)}`);
    (item.opts || []).forEach((opt) => {
      parts.push(`${opt.ok ? 'Resposta correta' : 'Opção incorreta'}: ${cleanText(opt.t)}`);
    });
  });

  return parts.join(' ');
}

function parseQm4Questions(html) {
  const match = html.match(/const\s+qm4_data\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];
  try {
    return Function('"use strict"; return (' + match[1] + ');')();
  } catch {
    return [];
  }
}

function parseQm6Questions(html) {
  const match = html.match(/const\s+qm6_data\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];
  try {
    return Function('"use strict"; return (' + match[1] + ');')();
  } catch {
    return [];
  }
}

function buildMod3Narration(deck) {
  if (!deck.length) {
    return 'Desafio do Módulo 3. Permitido ou Proibido. Decida se cada prática de segurança no trabalho pode ou não ser realizada. Conclua o jogo para validar o módulo.';
  }

  const parts = [
    'Desafio do Módulo 3. Permitido ou Proibido. Decida se cada prática de segurança no trabalho pode ou não ser realizada. Cinco situações sobre inspeção, postura e procedimentos seguros.',
  ];

  deck.forEach((item, index) => {
    const answer = item.allowed ? 'Permitido' : 'Proibido';
    parts.push(`Situação ${index + 1}: ${cleanText(item.text)} Resposta correta: ${answer}. ${cleanText(item.tip)}`);
  });

  parts.push('Conclua o jogo para validar o módulo.');
  return parts.join(' ');
}

function buildQuizNarration(questions, moduleNum = 1) {
  if (!questions.length) {
    return `Quiz do Módulo ${moduleNum}. Responda às perguntas sobre os conceitos apresentados no módulo.`;
  }

  const parts = [
    `Quiz do Módulo ${moduleNum}. Responda às ${questions.length} perguntas sobre os conceitos do módulo.`,
  ];

  questions.forEach((item, index) => {
    parts.push(`Pergunta ${index + 1}: ${cleanText(item.q)}`);
    item.opts.forEach((opt, optIndex) => {
      parts.push(`Alternativa ${optIndex + 1}: ${cleanText(opt)}`);
    });
  });

  return parts.join(' ');
}

function slideTitle(slide) {
  const titleEl = slide.querySelector('.slide-title, .mod-intro-title, h1');
  return cleanText(titleEl?.textContent || slide.id);
}

function buildManifest(htmlPath = HTML_PATH) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const quizQuestions = parseQuizQuestions(html);
  const q5Questions = parseQ5Questions(html);
  const mod3Deck = parseMod3BinaryDeck(html);
    const mod1Deck = parseMod1GameDeck(html);
  const qm2Questions = parseQm2Questions(html);

  const allSlides = [...doc.querySelectorAll('#slides .slide')];
  const totalPages = allSlides.length;

  const slides = allSlides.map((slide, index) => {
    const id = slide.id || `slide-${index + 1}`;
    let text = NARRATION_OVERRIDES[id];

    if (text === null && id === 's7d') {
      text = buildQuizNarration(quizQuestions, 1);
    } else if (text === null && id === 's31') {
      text = buildQuizNarration(q5Questions, 5);
    } else if (text === null && id === 's26') {
      text = buildMod3Narration(mod3Deck);
    } else if (text === null && id === 's4f') {
      text = buildQuizNarration(parseQm4Questions(html), 4);
    } else if (text === null && id === 's6f') {
      text = buildQuizNarration(parseQm6Questions(html), 6);
    } else if (text === null && id === 's3f') {
      text = buildMod2Narration(qm2Questions);
    } else if ((text === undefined || text === null) && id === 's-mod2-game') {
      text = buildMod2tfNarration(parseMod2tfDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod3-game') {
      text = buildM3gNarration(parseM3gDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod4-game') {
      text = buildM4gNarration(parseM4gDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod5-game') {
      text = buildM5gNarration(parseM5gDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod6-game') {
      text = buildM6gNarration(parseM6gDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod8-game') {
      text = buildM8gNarration(parseM8gDeck(html));
    } else if ((text === undefined || text === null) && id === 's-mod7-game') {
      text = buildM7gNarration(parseM7gDeck(html));
    } else if (text === undefined || text === null) {
      // Lê o HTML da página (páginas 1–10 e demais sem override)
      text = extractSlideText(slide);
    }

    if (!text) {
      text = `Slide ${index + 1}. ${slideTitle(slide)}`;
    }

    const pageLabel = `Página ${index + 1} de ${totalPages}.`;
    if (!/^Página\s+\d+\s+de\s+\d+/i.test(text)) {
      text = cleanText(`${pageLabel} ${text}`);
    }

    return {
      index,
      id,
      title: slideTitle(slide),
      file: `audios/${id}.mp3`,
      text,
      audioReady: fs.existsSync(path.join(ROOT, 'audios', `${id}.mp3`)),
    };
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: path.basename(htmlPath),
    audioDir: 'audios',
    slides,
  };
}

function writeManifest(manifest, outputPath = MANIFEST_PATH) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf8');

  const jsPath = path.join(path.dirname(outputPath), 'audio-manifest.js');
  fs.writeFileSync(
    jsPath,
    `window.__AUDIO_NARRATION__ = ${JSON.stringify(manifest)};\n`,
    'utf8',
  );

  return outputPath;
}

if (require.main === module) {
  const manifest = buildManifest();
  const out = writeManifest(manifest);
  console.log(`Manifesto gerado: ${out}`);
  console.log(`${manifest.slides.length} slides encontrados.`);
  manifest.slides.forEach((slide) => {
    console.log(`  [${String(slide.index + 1).padStart(2, '0')}] ${slide.id} (${slide.text.length} chars)`);
  });
}

module.exports = {
  HTML_PATH,
  MANIFEST_PATH,
  OUTPUT_DIR,
  NARRATION_OVERRIDES,
  buildManifest,
  writeManifest,
  extractSlideText,
  cleanText,
  buildMod1Narration,
  parseMod1GameDeck,
  parseM1gDeck,
  buildM1gQuestionNarration,
  parseEpiHierGame,
  parseEpiInpGame,
  buildS2gIntroNarration,
  buildS2gQuestionNarration,
  buildS2gResultNarration,
  parseMod2tfDeck,
  buildMod2tfNarration,
  buildMod2tfQuestionNarration,
  buildMod2tfIntroNarration,
  buildMod2Narration,
  parseQm2Questions,
  parseM3gDeck,
  parseM4gDeck,
  parseM5gDeck,
  parseM6gDeck,
  parseM7gDeck,
  parseM8gDeck,
};
