/*!
 * ADPG · Motor de cálculo do simulador de combos
 * ---------------------------------------------------------------------------
 * Funções puras, sem DOM. Reaproveita os utilitários de src/calculo.js.
 *
 * A pergunta que este motor responde não é "quanto lucro dá o combo", e sim
 * "QUANDO esse combo vale". A diferença está no tempo de cadeira: um combo
 * aumenta o ticket e ocupa a cadeira por mais tempo. Se o lucro por hora ficar
 * abaixo do que o carro-chefe renderia naquele mesmo tempo, o combo só faz
 * sentido para preencher agenda vazia — no horário de pico ele destrói margem.
 *
 * A especificação escrita está em docs/ESPECIFICACAO-COMBOS.md e os valores
 * esperados de cada função estão em testes/casos-combos.js.
 */
(function (raiz) {
  "use strict";

  var base = (typeof require === "function") ? require("./calculo.js") : raiz.ADPG;

  /* ═══════════════════════════════════════════════════════════════════
     PARÂMETROS DE NEGÓCIO
     ═══════════════════════════════════════════════════════════════════ */
  var CFG = {
    MARGEM_SAUDAVEL: 0.40,     // >= 40% -> verde
    MARGEM_ACEITAVEL: 0.25,    // < 25%  -> vermelho
    DESCONTO_MINIMO: 0.05,     // combo sem desconto de verdade não é combo
    TETO_ATRATIVIDADE: 0.95,   // o preço nunca passa de 95% da soma dos avulsos
    MIN_SERVICOS: 2            // abaixo disso não é combo, é serviço avulso
  };

  /* Base de cálculo da comissão — a escolha mais pesada da tela.
     "cheio": o colaborador recebe sobre o preço de tabela de cada serviço,
              como se não houvesse combo. A barbearia banca o desconto sozinha.
     "combo": o colaborador recebe sobre o que o cliente realmente pagou.
              O desconto é dividido entre a barbearia e o colaborador. */
  var BASES = ["cheio", "combo"];

  /* ═══════════════════════════════════════════════════════════════════
     1. SERVIÇOS
     ═══════════════════════════════════════════════════════════════════ */
  function normalizarServico(s) {
    return {
      nome: String(s.nome || "Serviço"),
      preco: Math.max(0, Number(s.preco) || 0),
      minutos: Math.max(1, Number(s.minutos) || 1),
      comissaoPct: base.clamp(Number(s.comissaoPct) || 0, 0, 90),
      custoVar: Math.max(0, Number(s.custoVar) || 0),
      incluso: !!s.incluso,
      carroChefe: !!s.carroChefe
    };
  }
  function normalizarServicos(lista) {
    return (lista || []).map(normalizarServico);
  }

  /* Rendimento de um serviço vendido sozinho. É a unidade de comparação
     de tudo neste motor: reais de lucro por hora de cadeira ocupada. */
  function isolado(s) {
    var comissao = s.preco * s.comissaoPct / 100;
    var lucro = s.preco - comissao - s.custoVar;
    var horas = s.minutos / 60;
    return {
      servico: s,
      comissao: comissao,
      lucro: lucro,
      horas: horas,
      lucroHora: horas > 0 ? lucro / horas : 0
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     2. REFERÊNCIA DA CADEIRA
     O que aquela hora de cadeira renderia sem o combo.
     Usa o serviço marcado como carro-chefe — o que enche a agenda. Se
     nenhum estiver marcado, cai no de maior faturamento.
     Deliberadamente NÃO usa o serviço de maior lucro/hora: dá para render
     muito com sobrancelha de 10 minutos, mas não dá para encher o dia com ela.
     ═══════════════════════════════════════════════════════════════════ */
  function referencia(servicos) {
    if (!servicos.length) return null;
    var escolhido = null;
    for (var i = 0; i < servicos.length; i++) {
      if (servicos[i].carroChefe) { escolhido = servicos[i]; break; }
    }
    if (!escolhido) {
      escolhido = servicos.reduce(function (a, b) { return b.preco > a.preco ? b : a; });
    }
    return isolado(escolhido);
  }

  /* ═══════════════════════════════════════════════════════════════════
     3. ANÁLISE DO COMBO
     ═══════════════════════════════════════════════════════════════════ */
  function analisar(servicos, precoCombo, baseComissao) {
    if (BASES.indexOf(baseComissao) === -1) baseComissao = "cheio";
    var inclusos = servicos.filter(function (s) { return s.incluso; });

    var somaAvulso = 0, minutos = 0, custoVar = 0, comissaoCheia = 0;
    inclusos.forEach(function (s) {
      somaAvulso += s.preco;
      minutos += s.minutos;
      custoVar += s.custoVar;
      comissaoCheia += s.preco * s.comissaoPct / 100;
    });

    var preco = Math.max(0, Number(precoCombo) || 0);
    var horas = minutos / 60;

    /* Na base "combo" o preço com desconto é rateado entre os serviços na
       proporção do preço de tabela de cada um, e cada fatia recebe o seu
       próprio percentual — assim comissões diferentes por serviço continuam
       valendo. `k` é o percentual efetivo do combo inteiro. */
    var k = somaAvulso > 0 ? comissaoCheia / somaAvulso : 0;
    var comissao = baseComissao === "combo" ? preco * k : comissaoCheia;

    var lucro = preco - comissao - custoVar;
    var desconto = somaAvulso - preco;

    return {
      servicos: inclusos,
      quantidade: inclusos.length,
      baseComissao: baseComissao,
      preco: preco,
      somaAvulso: somaAvulso,
      minutos: minutos,
      horas: horas,
      comissao: comissao,
      comissaoCheia: comissaoCheia,
      percentualEfetivo: k,
      custoVar: custoVar,
      lucro: lucro,
      margem: preco > 0 ? lucro / preco : 0,
      desconto: desconto,
      descontoPct: somaAvulso > 0 ? desconto / somaAvulso : 0,
      lucroHora: horas > 0 ? lucro / horas : 0
    };
  }

  /* Quanto custa (ou rende) escolher uma base de comissão em vez da outra. */
  function diferencaDeBase(servicos, precoCombo) {
    var a = analisar(servicos, precoCombo, "cheio");
    var b = analisar(servicos, precoCombo, "combo");
    return {
      cheio: a, combo: b,
      diferencaLucro: b.lucro - a.lucro,        // quanto a barbearia ganha na base "combo"
      diferencaComissao: a.comissao - b.comissao // quanto o colaborador deixa de receber
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     4. CUSTO DE OPORTUNIDADE DA CADEIRA
     No tempo desse combo, quantos carros-chefe caberiam e quanto eles
     renderiam? É a comparação que decide o combo no horário de pico.
     ═══════════════════════════════════════════════════════════════════ */
  function oportunidade(a, ref) {
    if (!ref || a.horas <= 0) return null;
    var cabem = a.minutos / ref.servico.minutos;
    var renderiam = cabem * ref.lucro;
    return {
      referencia: ref,
      cabem: cabem,
      renderiam: renderiam,
      diferenca: a.lucro - renderiam,   // negativo = o combo perde para a cadeira cheia
      lucroHoraReferencia: ref.lucroHora
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     5. VEREDITO
     Ordem do problema mais grave para o menos grave; o primeiro que bater
     define o resultado.
     ═══════════════════════════════════════════════════════════════════ */
  function classificar(a, ref) {
    if (a.quantidade < CFG.MIN_SERVICOS) {
      return { tom: "warn", rotulo: "Ainda não é combo",
               texto: "Escolha pelo menos dois serviços para montar o combo." };
    }
    if (a.lucro <= 0) {
      return { tom: "bad", rotulo: "Dá prejuízo",
               texto: "O que o cliente paga não cobre a comissão e os custos do combo." };
    }
    if (a.descontoPct < CFG.DESCONTO_MINIMO) {
      return { tom: "warn", rotulo: "Sem vantagem",
               texto: "O desconto é pequeno demais: o cliente não vê motivo para levar o combo." };
    }
    if (a.margem < CFG.MARGEM_ACEITAVEL) {
      return { tom: "bad", rotulo: "Margem baixa",
               texto: "Sobra pouco para a barbearia: qualquer imprevisto vira prejuízo." };
    }
    if (ref && a.lucroHora < ref.lucroHora) {
      return { tom: "warn", rotulo: "Só em horário ocioso",
               texto: "Rende menos por hora de cadeira do que o carro-chefe. Serve para preencher agenda vazia, não para o horário de pico." };
    }
    return { tom: "ok", rotulo: "Vale sempre",
             texto: "Rende mais por hora de cadeira do que o carro-chefe, e ainda dá desconto real ao cliente." };
  }

  /* ═══════════════════════════════════════════════════════════════════
     6. LIMITES DE PREÇO
     Três preços que interessam ao dono, todos exatos (sem arredondar):
       pisoMargem  -> menor preço que mantém a margem saudável
       pisoCadeira -> menor preço que iguala o lucro/hora do carro-chefe
       teto        -> maior preço que ainda entrega desconto ao cliente
     ═══════════════════════════════════════════════════════════════════ */
  function limites(servicos, baseComissao, ref) {
    var a = analisar(servicos, 0, baseComissao);
    var m = CFG.MARGEM_SAUDAVEL;
    var C = a.comissaoCheia, V = a.custoVar, k = a.percentualEfetivo;

    var pisoMargem, pisoCadeira;
    var precisa = ref ? ref.lucroHora * a.horas : 0;  // lucro necessário para empatar com a cadeira

    if (baseComissao === "combo") {
      /* lucro = P(1-k) - V  ->  margem >= m  =>  P >= V / (1 - k - m) */
      var d = 1 - k - m;
      pisoMargem = d > 0 ? V / d : Infinity;
      pisoCadeira = (1 - k) > 0 ? (precisa + V) / (1 - k) : Infinity;
    } else {
      /* lucro = P - C - V  ->  margem >= m  =>  P >= (C + V) / (1 - m) */
      pisoMargem = (C + V) / (1 - m);
      pisoCadeira = precisa + C + V;
    }

    var teto = a.somaAvulso * CFG.TETO_ATRATIVIDADE;
    return {
      pisoMargem: pisoMargem,
      pisoCadeira: pisoCadeira,
      teto: teto,
      somaAvulso: a.somaAvulso,
      /* maior desconto possível mantendo a margem saudável */
      descontoMaximoPct: a.somaAvulso > 0 && isFinite(pisoMargem)
        ? Math.max(0, (a.somaAvulso - pisoMargem) / a.somaAvulso) : 0
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     7. PREÇO RECOMENDADO
     O menor preço que satisfaz margem E cadeira, arredondado para ",90".
     Quando esse preço não cabe embaixo do teto de atratividade, o combo é
     declarado inviável — e o motor diz qual dos dois limites estourou, para
     a tela poder sugerir o que mexer.
     ═══════════════════════════════════════════════════════════════════ */
  function recomendar(servicos, baseComissao, ref) {
    var L = limites(servicos, baseComissao, ref);
    var alvo = Math.max(L.pisoMargem, L.pisoCadeira);
    if (!isFinite(alvo)) {
      return { viavel: false, motivo: "comissao", limites: L,
               texto: "Com essa comissão não existe preço que feche a conta." };
    }
    var preco = base.ceil90(alvo);
    if (preco > L.teto) {
      return { viavel: false, preco: preco, limites: L,
               motivo: L.pisoCadeira > L.pisoMargem ? "cadeira" : "margem",
               texto: L.pisoCadeira > L.pisoMargem
                 ? "Para empatar com o carro-chefe por hora de cadeira, o combo teria que custar mais do que os serviços avulsos — ou seja, sem desconto nenhum."
                 : "Para manter a margem saudável, o combo teria que custar mais do que os serviços avulsos." };
    }
    var a = analisar(servicos, preco, baseComissao);
    return { viavel: true, preco: preco, limites: L, analise: a,
             classificacao: classificar(a, ref) };
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  var COMBO = {
    CFG: CFG, BASES: BASES,
    normalizarServico: normalizarServico,
    normalizarServicos: normalizarServicos,
    isolado: isolado,
    referencia: referencia,
    analisar: analisar,
    diferencaDeBase: diferencaDeBase,
    oportunidade: oportunidade,
    classificar: classificar,
    limites: limites,
    recomendar: recomendar
  };

  if (typeof module === "object" && module.exports) module.exports = COMBO;
  else raiz.COMBO = COMBO;

})(typeof self !== "undefined" ? self : this);
