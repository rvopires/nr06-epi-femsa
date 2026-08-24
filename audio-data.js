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

/** Textos customizados para slides com pouco conteúdo textual ou conteúdo dinâmico. */
const NARRATION_OVERRIDES = {
  s1:
    'Módulo de Treinamento. Segurança do Trabalho. NR 06 — Equipamento de Proteção Individual. Treinamento sobre o uso correto de Equipamentos de Proteção Individual: conceitos, hierarquia de controle de riscos, acidentes e doenças ocupacionais, e a proteção auditiva, visual, respiratória e das mãos, conforme a NR-06.',
  s2:
    'Apresentação. Bem-vindo ao Treinamento. NR 06 — Equipamento de Proteção Individual. Assista ao vídeo de introdução e avance quando concluir.',
  s6:
    'Sumário. Conteúdo Programático. Módulo 1: Introdução, Objetivo, CA e Hierarquia de Controle de Riscos. Módulo 2: Acidente de Trabalho e Doença Ocupacional. Módulo 3: Comportamentos e Condições Inseguras. Módulo 4: Conceitos de Perigo e Risco. Módulo 5: Proteção Auditiva. Módulo 6: Proteção Visual. Módulo 7: Proteção Respiratória. Módulo 8: Proteção das Mãos.',
  's-mod1':
    'Início do Módulo 1. Introdução, Objetivo, CA e Hierarquia de Controle de Riscos.',
  s2b:
    'Introdução. O que são EPIs? Introdução, Objetivo, CA e Hierarquia de Controle de Riscos. Equipamento de Proteção Individual é todo equipamento de uso pessoal, utilizado pelo trabalhador para se proteger de riscos à sua segurança e saúde.',
  s2b2:
    'Objetivo. Objetivo do Treinamento. Introdução, Objetivo, CA e Hierarquia de Controle de Riscos. Proporcionar aos participantes o conhecimento básico relacionado aos riscos presentes no ambiente de trabalho e apresentar formas de controle por meio de cuidados e uso adequado de proteção.',
  s2b3:
    'Legislação. Certificado de Aprovação, CA. Introdução, Objetivo, CA e Hierarquia de Controle de Riscos. É um documento emitido pelo Ministério do Trabalho e Emprego, MTE, que comprova que um Equipamento de Proteção Individual foi testado e aprovado para proteger o trabalhador contra riscos específicos. Somente EPIs com CA válido podem ser comercializados e utilizados no Brasil. O CA garante que o equipamento atende aos requisitos técnicos de segurança, foi submetido a ensaios e avaliações de conformidade, e é adequado para a proteção indicada pelo fabricante.',
  s2e:
    'Quiz. Teste seu conhecimento. O que é CA, Certificado de Aprovação? Documento interno da empresa que comprova a entrega do EPI ao colaborador. Documento emitido pelo Ministério do Trabalho e Emprego que identifica se o EPI está em conformidade com as exigências da legislação vigente. Registro emitido pelo fabricante que indica apenas a validade comercial do produto.',
  s2f:
    'Vídeo. Hierarquia de Controle de Riscos. Assista ao vídeo e avance quando concluir.',
  s2g:
    'Associe. Hierarquia de Controle de Riscos. Associe cada conceito à categoria correta. A hierarquia organiza as medidas da mais eficaz até a menos eficaz: Eliminação, Redução ou Substituição, Controles de Engenharia, Controles Administrativos e EPI.',
  's-mod2':
    'Início do Módulo 2. Acidente de Trabalho e Doença Ocupacional.',
  's-mod2-acidente':
    'Conceito. O que é um Acidente de Trabalho? Acidente de Trabalho e Doença Ocupacional. Acidente de trabalho é aquele que ocorre a serviço da empresa ou em razão do trabalho, podendo causar lesões, doenças ou reduzir a capacidade de trabalho, de forma temporária ou permanente.',
  's-mod2-tipos':
    'Também são considerados. Outros Tipos de Acidente de Trabalho. Toque em cada card para saber mais. Acidentes Típicos: ocorrem pelo exercício do trabalho a serviço da empresa. Acidente de Trajeto: ocorre no percurso da residência para o local de trabalho. Doença Profissional ou do Trabalho: causada ou desencadeada pelas atividades realizadas no ambiente de trabalho.',
  's-mod2-doenca':
    'Conceito. Doença Ocupacional. Acidente de Trabalho e Doença Ocupacional. Doença ocupacional ou profissional é aquela causada ou desencadeada pelo trabalho, em razão da atividade exercida ou das condições do ambiente, podendo afetar a saúde do trabalhador ao longo do tempo. Exemplos mais comuns: Cervicalgia Ocupacional, Lombalgia Ocupacional e LER/DORT.',
  's-mod3-causas':
    'Comportamentos e Condições Inseguras. Por que os comportamentos inseguros acontecem? Na maioria das vezes, eles estão ligados a falhas humanas: seja por imperícia, negligência ou imprudência. Imperícia é a falta de conhecimento ou habilidade. Negligência é quando a pessoa sabe o que fazer, mas não faz com o devido cuidado. Imprudência é assumir riscos desnecessários.',
  's-mod3-jogo':
    'Associe. Imperícia, Negligência ou Imprudência. Associe cada situação ao conceito correto. Imperícia: falta de habilidade técnica e de conhecimento básico. Negligência: omissão de cuidados e precauções exigidas. Imprudência: ação sem a devida cautela, mesmo conhecendo os procedimentos corretos.',
  's-mod4-conceitos':
    'Conceitos. Perigo e Risco. Perigo: condição, situação ou agente com potencial de causar dano, contribuindo para a ocorrência de lesões, doenças ou outros prejuízos à saúde. Risco: chance de ocorrência de dano, considerando a probabilidade e a gravidade associada à exposição ao perigo. O perigo pode existir sem risco. O risco surge quando há exposição ao perigo. A consequência pode ser acidentes, lesões, doenças ou outro dano à saúde.',
  's-mod4-video':
    'Vídeo. Perigo e Risco. Conceitos de Perigo e Risco. Assista ao vídeo e avance quando concluir.',
  's-mod4-quiz':
    'Quiz. Teste seu conhecimento. Durante o trajeto ao trabalho, o que caracteriza corretamente o risco na situação apresentada? Dirigir em alta velocidade ou desrespeitar as leis de trânsito. Chegar ao destino com segurança. A possibilidade de ocorrer um acidente de trânsito devido à exposição a condições perigosas.',
  's-mod5-video':
    'Vídeo. Proteção Auditiva. Assista ao vídeo e avance quando concluir.',
  's-mod5-ruido':
    'Estamos expostos ao ruído no dia a dia. Em casa, no trabalho e até viajando ou nos divertindo, estamos expostos ao ruído em nossa vida diária. O ruído no trabalho se apresenta como a situação mais perigosa em função das muitas máquinas e equipamentos ruidosos existentes, e o longo tempo que passamos sob estas condições. Atenção: o ruído contínuo e excessivo pode causar a perda ou a redução da audição.',
  's-mod5-video-riscos':
    'Vídeo. Riscos do som. Proteção Auditiva. Assista ao vídeo e avance quando concluir.',
  's-mod5-fatores1':
    'O que influencia o risco? Parte 1. Tempo de exposição: quanto maior este tempo, maior o perigo. Tipos de ruído: contínuo ocorre sem parar; intermitente ocorre de vez em quando; de impacto ocorre de repente.',
  's-mod5-fatores2':
    'O que influencia o risco? Parte 2. Sensibilidade individual: varia de acordo com a idade e com a resistência do organismo de cada pessoa. Distância da fonte ruidosa: quanto mais próximo, maior o perigo. Intensidade: quanto maior a intensidade, maior o risco para o trabalhador.',
  's-mod5-efeito-trabalho':
    'Efeito do ruído no trabalho. Observe a imagem e avance quando estiver pronto.',
  's-mod5-efeito-organismo':
    'Efeito do ruído no organismo. Observe a imagem e avance quando estiver pronto.',
  's-mod5-perda':
    'Formas de perda auditiva. Toque em cada card para saber mais. Trauma acústico: perda auditiva repentina causada por ruídos de impacto, como explosões. Perda auditiva temporária: ocorre após exposição a ruído intenso e a audição volta ao normal após algum tempo longe do ruído. Perda auditiva permanente: ocorre pela exposição repetida durante longos períodos a ruídos de alta intensidade e é irreversível.',
  's-mod5-video-sinais':
    'Vídeo. Sinais de Perda Auditiva. Proteção Auditiva. Assista ao vídeo e avance quando concluir.',
  's-mod5-protetores':
    'Tipos de protetores. Toque em cada card para saber mais. Espuma moldável: adaptam-se aos canais auditivos, são descartáveis, confortáveis e permitem o uso com outros EPIs. Pré-moldados: feitos em silicone, reutilizáveis e devem ser higienizados. Tipo concha: protegem os dois ouvidos de forma igual, com diferentes níveis de proteção.',
  's-mod6':
    'Início do Módulo 6. Proteção Visual.',
  's-mod6-video':
    'Vídeo. Proteção Visual. Assista ao vídeo e avance quando concluir.',
  's-mod6-video-riscos':
    'Vídeo. Riscos que sua visão corre. Proteção Visual. Assista ao vídeo e avance quando concluir.',
  's-mod6-riscos':
    'Riscos que sua visão corre. No ambiente de trabalho, a visão está exposta a diversos riscos: partículas, respingos químicos, radiação, luminosidade intensa e impactos que podem causar lesões, muitas vezes irreversíveis. Por isso, conhecer esses riscos e usar corretamente a proteção visual é essencial para preservar um dos sentidos mais importantes para o trabalho e para a vida.',
  's-mod6-funcionamento':
    'Como funciona a visão e sua importância. A visão é o sentido que mais envia informações ao cérebro, sendo essencial para o aprendizado e a comunicação. Defesas naturais: quando um corpo estranho entra no olho, o organismo produz lágrimas automaticamente para ajudar a expulsá-lo. Outra defesa importante é o reflexo de fechar os olhos rapidamente ao perceber uma ameaça imediata.',
  's-mod6-armazenamento':
    'Armazenamento e substituição. Armazenamento: mantenha os óculos em local apropriado, como um armário, e nunca os deixe apoiados sobre as lentes, para evitar danos e garantir a proteção. Substituição: ao identificar danos ou desgaste que comprometam a visão, solicite imediatamente a substituição dos óculos por um novo.',
  's-mod6-higienizacao':
    'Higienização dos óculos. Utilize água e sabão neutro para limpar os óculos e evite o uso de solventes. Após a limpeza, seque com pano macio. Em óculos com tratamento antiembaçante, prefira a limpeza com pano seco, pois lavagens frequentes podem reduzir sua eficácia.',
  's-mod7':
    'Início do Módulo 7. Proteção Respiratória.',
  's-mod7-video':
    'Vídeo. Proteção Respiratória. Assista ao vídeo e avance quando concluir.',
  's-mod7-epr':
    'Como se proteger? Uma das formas de se proteger contra a inalação de contaminantes atmosféricos é através do uso de Equipamento de Proteção Respiratória, o EPR. Esses equipamentos, chamados respiradores ou máscaras, cobrem a boca e o nariz e protegem a respiração por meio de filtros ou fornecimento de ar.',
  's-mod7-video-tipos':
    'Vídeo. Tipos de Respiradores. Proteção Respiratória. Assista ao vídeo e avance quando concluir.',
  's-mod7-tipos':
    'Tipos de respiradores. Peça semifacial filtrante, PFF: máscara descartável que cobre nariz e boca, filtrando partículas presentes no ar, indicada para exposições a poeiras e névoas. Semifacial com filtro: respirador reutilizável, com corpo de borracha ou silicone e filtros ou cartuchos substituíveis, indicado para vapores orgânicos, gases e partículas. Máscara com fornecimento de ar: fornece ar respirável de uma fonte externa, usada em ambientes com atmosferas mais críticas ou deficientes de oxigênio.',
  's-mod7-pff':
    'Eficiência dos filtros PFF. PFF1: 80% de eficácia. PFF2: 94% de eficácia. PFF3: 99,9% de eficácia.',
  's-mod7-quiz':
    'Quiz. Qual alternativa não corresponde a um cuidado adequado com o respirador? Inspecionar se o respirador não está danificado. Lavar filtros e cartuchos para aumentar a durabilidade. Fazer o ajuste correto para evitar a entrada de contaminantes. Lavar respiradores reutilizáveis com água e detergente neutro.',
  's-mod8':
    'Início do Módulo 8. Proteção das Mãos.',
  's-mod8-riscos':
    'Conhecendo os riscos. Desatenção. Uso de adornos. Falta de proteção em máquinas e equipamentos. Uso de objetos cortantes, como estiletes e facas. Uso de equipamentos inadequados. Uso inadequado de produtos químicos. Importante: conhecendo os riscos existentes no seu local de trabalho, você conseguirá prevenir mais facilmente os acidentes.',
  's-mod8-prevenir':
    'Formas de prevenir. Identificar e conhecer os riscos do setor. Participar de treinamentos. Utilizar todos os EPIs recomendados. Trabalhar de maneira segura. Comunicar todas as condições de risco. Respeitar seus limites. Seguir as normas, procedimentos e regras da empresa. Atenção: trabalhar preventivamente é a melhor forma de evitar acidentes graves, portanto, seja preventivo.',
  's-mod8-quiz':
    'Quiz. Qual alternativa não é um tipo comum de lesão nas mãos? Corte. Crescimento das unhas. Perfuração. Queimaduras.',
  's-mod8-luvas-riscos':
    'Medidas de controle. Grupos de risco. Existem diversos modelos diferentes de luvas de segurança, e cada um deles oferece proteção para determinados grupos de risco. Riscos físicos ou mecânicos: cortes, abrasões, perfurações, choques. Riscos químicos ou biológicos: bactérias, fungos, parasitas, vírus.',
  's-mod8-luvas-tipos':
    'Principais modelos de luvas. Luva anticorte: protege contra cortes nas mãos. Luva de látex natural: flexível e resistente, protege contra ácidos, álcool e produtos químicos. Luva de látex nitrílica: excelente proteção contra óleos, solventes, gordura animal e graxa. Luva de PVC: flexível, excelente proteção contra ácidos, cáusticos, bases, álcoois e abrasões. Luva de vaqueta e raspa de couro: boas opções para o risco de abrasão e até mesmo solda, pois o couro é muito resistente.',
  's-fim':
    'Parabéns. Você concluiu o treinamento NR 06 — Equipamento de Proteção Individual. Por mérito, dedicação e compromisso com a segurança, você percorreu os oito módulos e demonstrou responsabilidade com a sua vida e com a vida dos seus colegas. A segurança é um direito de todos e um dever de cada um. Continue fazendo a sua parte.',
};

function cleanText(text) {
  return (text || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSlideText(slide) {
  const clone = slide.cloneNode(true);
  clone
    .querySelectorAll('script, iframe, svg, .wave, button, style, .nav-btn, .zoom-btn, [id$="-mobile-section"]')
    .forEach((el) => el.remove());

  const custom = slide.getAttribute('data-audio-text');
  if (custom) return cleanText(custom);

  let text = cleanText(clone.textContent || '');

  if (text.length < 40) {
    const iframeTitle = slide.querySelector('iframe[title]')?.getAttribute('title');
    const imgAlt = slide.querySelector('img[alt]')?.getAttribute('alt');
    const title = slide.querySelector('.slide-title')?.textContent;
    const parts = [title, iframeTitle, imgAlt].map(cleanText).filter(Boolean);
    if (parts.length) text = parts.join('. ');
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

function buildMod2tfNarration(deck) {
  if (!deck.length) {
    return 'Desafio Módulo 2 — Verdadeiro ou Falso. Responda seis afirmações sobre o equipamento e valide o que você aprendeu no módulo.';
  }

  const parts = [
    'Desafio Módulo 2 — Verdadeiro ou Falso. Responda seis afirmações sobre o equipamento e valide o que você aprendeu no módulo.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Afirmação ${index + 1}: ${cleanText(item.text)}`);
    parts.push(`Resposta correta: ${item.answer ? 'Verdadeiro' : 'Falso'}. ${cleanText(item.tip)}`);
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

function parseM7gDeck(html) {
  const match = html.match(/var\s+m7gRounds\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM7gNarration(deck) {
  if (!deck.length) {
    return 'Missão NR 06, Módulo 7. Cinco perguntas simples sobre a norma, os deveres do trabalhador, os riscos, os dispositivos e as condutas.';
  }

  const parts = [
    'Missão NR 06, Módulo 7. Cinco perguntas simples sobre a norma, os deveres do trabalhador, os riscos, os dispositivos e as condutas.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Etapa ${index + 1}: ${cleanText(item.title)}. ${cleanText(item.inst)}`);
    if (item.type === 'order') {
      parts.push('Ordem correta:');
      item.items.forEach((opt, optIndex) => {
        parts.push(`Passo ${optIndex + 1}: ${cleanText(opt.t)}`);
      });
    } else if (item.type === 'select') {
      const yes = item.items.filter((opt) => opt.ok).map((opt) => cleanText(opt.t));
      const no = item.items.filter((opt) => !opt.ok).map((opt) => cleanText(opt.t));
      parts.push(`Marque: ${yes.join('; ')}.`);
      if (no.length) parts.push(`Não marque: ${no.join('; ')}.`);
    } else {
      item.items.forEach((opt) => {
        parts.push(`${opt.ok ? 'Regra correta' : 'Opção incorreta'}: ${cleanText(opt.t)}`);
      });
    }
    parts.push(cleanText(item.fb));
  });

  return parts.join(' ');
}
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

  const slides = [...doc.querySelectorAll('#slides .slide')].map((slide, index) => {
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
    } else if (text === null && id === 's2e') {
      text = buildMod1Narration(mod1Deck);
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
    } else if ((text === undefined || text === null) && id === 's-mod7-game') {
      text = buildM7gNarration(parseM7gDeck(html));
    } else if (text === undefined || text === null) {
      text = extractSlideText(slide);
    }

    if (!text) {
      text = `Slide ${index + 1}. ${slideTitle(slide)}`;
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
  buildMod2Narration,
  parseQm2Questions,
};
