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
    'Módulo de Treinamento. Segurança do Trabalho. NR 06 — EMPILHADEIRA. Inclui conteúdo complementar da NR 12. Treinamento de capacitação e reciclagem em movimentação, armazenagem e manuseio de materiais com empilhadeira conforme NR-06.',
  s2:
    'Apresentação. Bem-vindo ao Treinamento. NR06 - OPERADOR DE TRANSPALETEIRA. Assista ao vídeo de introdução e avance quando concluir.',
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
  's-mod5-fatores1':
    'O que influencia o risco? Parte 1. Tempo de exposição: quanto maior este tempo, maior o perigo. Tipos de ruído: contínuo ocorre sem parar; intermitente ocorre de vez em quando; de impacto ocorre de repente.',
  's-mod5-fatores2':
    'O que influencia o risco? Parte 2. Sensibilidade individual: varia de acordo com a idade e com a resistência do organismo de cada pessoa. Distância da fonte ruidosa: quanto mais próximo, maior o perigo. Intensidade: quanto maior a intensidade, maior o risco para o trabalhador.',
  's-mod5-efeito-trabalho':
    'Efeito do ruído no trabalho. O ruído excessivo prejudica a concentração, a comunicação entre colegas e a percepção de sinais de alerta, aumentando o risco de acidentes.',
  's-mod6':
    'Início do Módulo 6. Proteção Visual.',
  's-mod6-video':
    'Vídeo. O Pit Stop e as Regras de Entrada. Proteção Visual. Assista ao vídeo sobre o pit stop e as regras de entrada. Avance quando concluir.',
  's-mod6-video2':
    'Vídeo. Proibições Críticas no Abastecimento. Proteção Visual. Assista ao vídeo sobre as proibições críticas no abastecimento. Avance quando concluir.',
  's-mod6-guia':
    'Guia rápido de segurança do Pit Stop. Regras fundamentais para a baia de abastecimento de GLP e baterias. A área de abastecimento é uma das zonas de maior risco químico e de explosão do armazém. Três regras de acesso e operação. Primeira: permitido apenas um equipamento por vez dentro da baia. Aguarde a sua vez na fila recuada. Segunda: o operador deve apenas estacionar, desligar a máquina e puxar o freio. A troca do cilindro de GLP ou a conexão das baterias é de responsabilidade exclusiva do técnico abastecedor habilitado. Terceira: respeite os avisos de piso e mantenha as saídas do Pit Stop sempre totalmente livres. Fontes de ignição proibidas, tolerância zero. Proibido fumar ou portar qualquer chama exposta. Proibido manusear celulares ou qualquer dispositivo eletrônico ligado, pelo perigo de faíscas estáticas e distração.',
  's-mod6-video3':
    'Vídeo. Manobra de Abastecimento pelo Técnico. Proteção Visual. Assista ao vídeo sobre a manobra de abastecimento pelo técnico. Avance quando concluir.',
  's-mod6-zonas':
    'Zoneamento de risco do armazém. Entenda onde cada máquina e pessoa deve circular. Para evitar colisões e atropelamentos, o armazém é dividido em três setores de fluxo. Conhecer e respeitar essas barreiras invisíveis é um dever de todos. Zona vermelha: movimentação de empilhadeira. Risco altíssimo de atropelamento e prensagem. Pedestres e ajudantes são proibidos nas ruas de estoque, salvo com bloqueio de segurança. Zona amarela: operações mistas. Risco médio, tráfego compartilhado controlado. Permitido apenas ajudantes com paleteiras e conferentes em auditoria de cargas. Zona verde: paleteiras e pedestres. Risco baixo. Empilhadeiras motorizadas são proibidas nestas vias.',
  's-mod6-video4':
    'Vídeo. Condições Adversas de Luz e Ofuscamento. Proteção Visual. Assista ao vídeo sobre condições adversas de luz e ofuscamento. Avance quando concluir.',
  's-mod6-video5':
    'Vídeo. Comportamento e a Tolerância Zero a Brincadeiras. Proteção Visual. Assista ao vídeo sobre comportamento e a tolerância zero a brincadeiras. Avance quando concluir.',
  's-mod6-video6':
    'Vídeo. Compromisso Coletivo e Encerramento. Proteção Visual. Assista ao vídeo de compromisso coletivo e encerramento. Avance quando concluir.',
  's-mod7':
    'Início do Módulo 7. Proteção Respiratória.',
  's-mod7-video':
    'Vídeo. O que é a NR 12 e o seu Objetivo. Proteção Respiratória. Assista ao vídeo sobre o que é a NR 12 e o seu objetivo. Avance quando concluir.',
  's-mod7-video2':
    'Vídeo. Os Deveres e Responsabilidades do Operador. Proteção Respiratória. Assista ao vídeo sobre os deveres e responsabilidades do operador. Avance quando concluir.',
  's-mod7-pilares':
    'Os quatro pilares de responsabilidade do operador. A sua atitude determina a segurança de todos. A NR 12 estabelece quatro responsabilidades diárias. Primeiro: inspeção diária. Verifique o estado mecânico e os sistemas de segurança antes de iniciar o turno, sem nenhuma exceção. Segundo: comunicação de falhas. Barulho estranho, mau funcionamento, folga no freio ou falha em luzes: não opere. Comunique imediatamente o supervisor ou a manutenção. Terceiro: respeito absoluto à capacidade. Nunca exceda o limite máximo de carga da placa do fabricante. A sobrecarga gera perda de controle e tombamentos. Quarto: seguir os procedimentos internos de tráfego, manuseio e segurança da empresa.',
  's-mod7-video3':
    'Vídeo. Identificando os Riscos Mecânicos e Elétricos. Proteção Respiratória. Assista ao vídeo sobre os riscos mecânicos e elétricos. Avance quando concluir.',
  's-mod7-video4':
    'Vídeo. Dispositivos de Segurança Obrigatórios. Proteção Respiratória. Assista ao vídeo sobre os dispositivos de segurança obrigatórios. Avance quando concluir.',
  's-mod7-protecao':
    'Sistemas de proteção e regras de proteção física. Dispositivos obrigatórios: seus escudos contra acidentes. Nunca neutralize, altere ou opere com qualquer dispositivo de segurança desligado ou danificado. Verifique diariamente: a grade de proteção superior, que resguarda a cabeça em caso de queda de objetos; o botão de desligamento de emergência, que trava a energia, a tração e a hidráulica; e a buzina, o giroflex e o alarme de ré, que avisam pedestres em áreas ruidosas. Duas regras de ouro: o cinto de segurança é obrigatório em todos os deslocamentos — em um tombamento, evita que o operador seja arremessado e esmagado pelo chassi. E o corpo deve permanecer sempre dentro do perímetro da cabine: nunca apoie o corpo na coluna de elevação nem coloque membros para fora com o veículo em movimento.',
  's-mod7-video5':
    'Vídeo. Condutas Proibidas e Boas Práticas. Proteção Respiratória. Assista ao vídeo sobre condutas proibidas e boas práticas. Avance quando concluir.',
  's-mod8':
    'Início do Módulo 8. Proteção das Mãos.',
  's-fim':
    'Parabéns. Você concluiu o treinamento NR 06 — Operador de Empilhadeira, com conteúdo complementar da NR 12. Por mérito, dedicação e compromisso com a segurança, você percorreu os sete módulos e demonstrou responsabilidade com a sua vida e com a vida dos seus colegas. A segurança é um direito de todos e um dever de cada um. Continue fazendo a sua parte.',
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
    'Quiz. Acidente de Trabalho e Doença Ocupacional. Quiz — Módulo 2. Responda cinco perguntas sobre tipos de transpaleteiras, capacidade de carga, componentes principais, painel de controle e funcionamento do timão. Acerte pelo menos três questões para concluir o módulo.',
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
    return 'Desafio Módulo 4 — Turno Relâmpago. Responda Certo ou Errado para cinco afirmações sobre estabilidade de carga, paletes, tipos de carga e armazenamento.';
  }

  const parts = [
    'Desafio Módulo 4 — Turno Relâmpago. Responda Certo ou Errado para cinco afirmações sobre estabilidade de carga, paletes, tipos de carga e armazenamento.',
  ];

  deck.forEach((item, index) => {
    parts.push(`Afirmação ${index + 1}: ${cleanText(item.text)}`);
    parts.push(`Resposta correta: ${item.ans ? 'Certo' : 'Errado'}. ${cleanText(item.tip)}`);
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
    return 'Desafio Módulo 5 — Picking, Docas e Protocolos. Leia cinco situações reais e escolha a atitude correta.';
  }

  const letters = ['A', 'B', 'C'];
  const parts = [
    'Desafio Módulo 5 — Picking, Docas e Protocolos. Leia cinco situações reais e escolha a atitude correta.',
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

function parseM6gDeck(html) {
  const match = html.match(/var\s+m6gRounds\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  if (!match) return [];

  try {
    return Function(`"use strict"; return (${match[1]});`)();
  } catch {
    return [];
  }
}

function buildM6gNarration(deck) {
  if (!deck.length) {
    return 'Missão Pit Stop, Módulo 6. Três etapas práticas: acesso ao Pit Stop, proibições e ordem da manobra.';
  }

  const parts = [
    'Missão Pit Stop, Módulo 6. Três etapas práticas: acesso ao Pit Stop, proibições e ordem da manobra.',
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
    return 'Missão NR 12, Módulo 7. Cinco perguntas simples sobre a norma, os deveres do operador, os riscos, os dispositivos e as condutas.';
  }

  const parts = [
    'Missão NR 12, Módulo 7. Cinco perguntas simples sobre a norma, os deveres do operador, os riscos, os dispositivos e as condutas.',
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
    return 'Desafio do Módulo 3. Permitido ou Proibido. Decida se cada prática de procedimento operacional ou condução de transpaleteira pode ou não ser realizada. Conclua o jogo para validar o módulo.';
  }

  const parts = [
    'Desafio do Módulo 3. Permitido ou Proibido. Decida se cada prática de procedimento operacional ou condução de transpaleteira pode ou não ser realizada. Cinco situações sobre inspeção, trânsito interno, postura e estacionamento seguro.',
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
