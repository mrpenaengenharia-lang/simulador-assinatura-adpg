/*!
 * ADPG · Motor de cálculo do simulador de assinatura
 * ---------------------------------------------------------------------------
 * Funções puras, sem DOM e sem dependências. Toda a regra de negócio do
 * simulador vive aqui — a interface (index.html) só formata e desenha.
 *
 * Uso no navegador:   tag script apontando para src/calculo.js  →  window.ADPG
 * Uso no Node:        const ADPG = require("./src/calculo.js");
 *
 * A especificação escrita destas regras está em docs/ESPECIFICACAO.md e os
 * valores esperados de cada função estão em testes/casos.js.
 */
(function (raiz) {
  "use strict";

  /* ═══════════════════════════════════════════════════════════════════
     PARÂMETROS DE NEGÓCIO
     Constantes que definem o que o ADPG considera um plano saudável.
     Se o ADPG tiver benchmarks próprios, é aqui que se muda — nada mais
     no código precisa ser tocado.
     ═══════════════════════════════════════════════════════════════════ */
  var CFG = {
    MARGEM_ALVO: 0.45,          // margem que o preço sugerido persegue
    TETO_ATRATIVIDADE: 0.95,    // preço ≤ 95% do avulso equivalente (tem que haver desconto)
    PISO_SEGURANCA: 1.15,       // preço ≥ 115% do custo direto do plano
    MARGEM_SAUDAVEL: 0.40,      // ≥ 40% → verde
    MARGEM_ACEITAVEL: 0.25,     // 25%–40% → âmbar;  < 25% → vermelho
    DESCONTO_MINIMO: 0.03,      // desconto < 3% → o cliente não vê motivo para assinar
    PESO_DESCONTO_MAX: 22,      // teto do desconto na pontuação (evita "preço de graça")
    BONUS_RESISTE_RISCO: 12,    // pontos por continuar lucrativo com 1 corte a mais
    // O semáforo domina a pontuação: nenhuma opção classificada como âmbar ou
    // vermelha pode ganhar de uma verde só por ter mais desconto ou mais margem.
    BONUS_TOM: { ok: 100, warn: 0, bad: -100 },
    CORTES_AVALIADOS: [1, 2, 3, 4], // planos testados pela recomendação
    MAX_CORTES: 8               // limite do seletor de cortes na interface
  };

  /* ═══════════════════════════════════════════════════════════════════
     UTILITÁRIOS
     ═══════════════════════════════════════════════════════════════════ */
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /* Arredondamento para preço psicológico terminado em ",90" (49,90 · 89,90 · 139,90). */
  function round90(x) { return Math.max(9.9, Math.round((x - 9.9) / 10) * 10 + 9.9); }
  function floor90(x) { return Math.max(9.9, Math.floor((x - 9.9) / 10) * 10 + 9.9); }
  function ceil90(x)  { return Math.max(9.9, Math.ceil((x - 9.9) / 10) * 10 + 9.9); }

  /* ═══════════════════════════════════════════════════════════════════
     1. PARÂMETROS DA BARBEARIA
     Recebe o que o usuário digita e devolve o objeto derivado que todas
     as outras funções consomem.
     ═══════════════════════════════════════════════════════════════════ */
  function normalizar(entrada) {
    var precoCorte  = Math.max(1, Number(entrada.precoCorte) || 0);
    var comissaoPct = clamp(Number(entrada.comissaoPct) || 0, 0, 90);
    var custoVar    = Math.max(0, Number(entrada.custoVar) || 0);
    var custosFixos = Math.max(0, Number(entrada.custosFixos) || 0);

    var comissaoCorte = precoCorte * comissaoPct / 100;

    return {
      precoCorte: precoCorte,
      comissaoPct: comissaoPct,
      custoVar: custoVar,
      custosFixos: custosFixos,
      comissaoCorte: comissaoCorte,          // R$ que o colaborador leva por corte
      custoDireto: comissaoCorte + custoVar  // custo real de entregar 1 corte
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     2. CENÁRIO POR CLIENTE
     O coração do simulador: dado um preço de assinatura e uma quantidade
     de cortes efetivamente usados no mês, quanto sobra?
     `uso` pode ser fracionário (ex.: 1,6 corte = uso médio de uma base).
     ═══════════════════════════════════════════════════════════════════ */
  function cenario(p, preco, uso) {
    var comissao  = uso * p.comissaoCorte;
    var variaveis = uso * p.custoVar;
    var fica      = preco - comissao;   // o que fica na barbearia antes dos variáveis
    var lucro     = fica - variaveis;   // contribuição por assinante
    var avulso    = uso * p.precoCorte; // quanto ele pagaria sem assinatura

    return {
      uso: uso,
      preco: preco,
      comissao: comissao,
      variaveis: variaveis,
      fica: fica,
      lucro: lucro,
      margem: preco > 0 ? lucro / preco : 0,
      avulso: avulso,
      economia: avulso - preco,
      economiaPct: avulso > 0 ? (avulso - preco) / avulso : 0
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     3. CLASSIFICAÇÃO (semáforo)
     `cSeguinte` é o mesmo cenário com 1 corte a mais — é o que permite
     avisar "saudável hoje, mas frágil se o cliente usar mais".
     Retorna { tom: "ok" | "warn" | "bad", rotulo, texto }.
     A ordem dos testes importa: do problema mais grave para o menos grave.
     ═══════════════════════════════════════════════════════════════════ */
  function classificar(c, cSeguinte) {
    if (c.lucro <= 0) {
      return { tom: "bad", rotulo: "Prejuízo",
               texto: "Nesse uso a assinatura custa mais do que entrega." };
    }
    if (c.economiaPct < CFG.DESCONTO_MINIMO) {
      return { tom: "warn", rotulo: "Sem vantagem",
               texto: "Praticamente não há desconto — o cliente não vê motivo para assinar." };
    }
    if (c.margem < CFG.MARGEM_ACEITAVEL) {
      return { tom: "bad", rotulo: "Margem baixa",
               texto: "Sobra pouco para a barbearia: qualquer variação vira prejuízo." };
    }
    if (c.margem < CFG.MARGEM_SAUDAVEL) {
      return { tom: "warn", rotulo: "Margem apertada",
               texto: "Funciona, mas sem folga para o cliente usar mais do que o previsto." };
    }
    if (cSeguinte && cSeguinte.lucro < 0) {
      return { tom: "warn", rotulo: "Saudável, com risco",
               texto: "Boa margem no uso previsto, mas um corte a mais já derruba o resultado." };
    }
    return { tom: "ok", rotulo: "Saudável",
             texto: "Margem confortável e desconto real para o cliente." };
  }

  /* ═══════════════════════════════════════════════════════════════════
     4. PREÇO SUGERIDO PARA UM PLANO DE N CORTES
     Parte da margem-alvo, arredonda para ",90" e então respeita dois
     limites que nunca podem ser violados:
       teto → precisa sobrar desconto para o cliente;
       piso → precisa sobrar margem para a barbearia.
     O teto vence o piso quando os dois brigam (barbearia com custo direto
     alto demais: nesse caso nenhum preço serve e a classificação acusa).
     ═══════════════════════════════════════════════════════════════════ */
  function precoSugerido(p, n) {
    var custoDiretoPlano = n * p.custoDireto;
    var preco = round90(custoDiretoPlano / (1 - CFG.MARGEM_ALVO));

    var teto = n * p.precoCorte * CFG.TETO_ATRATIVIDADE;
    var piso = custoDiretoPlano * CFG.PISO_SEGURANCA;

    if (preco > teto) preco = floor90(teto);
    if (preco < piso) preco = ceil90(piso);
    return preco;
  }

  /* ═══════════════════════════════════════════════════════════════════
     5. PONTUAÇÃO DE UMA COMBINAÇÃO (preço × nº de cortes)
     Traduz em um número único o equilíbrio entre os três interesses:
       margem da barbearia + desconto do cliente + resistência ao uso extra.
     Usada tanto pelos três cenários de preço quanto pela recomendação.
     ═══════════════════════════════════════════════════════════════════ */
  function pontuar(p, preco, n) {
    var atual = cenario(p, preco, n);
    var risco = cenario(p, preco, n + 1);
    var classificacao = classificar(atual, risco);

    var score = CFG.BONUS_TOM[classificacao.tom]
              + atual.margem * 100
              + Math.min(atual.economiaPct * 100, CFG.PESO_DESCONTO_MAX)
              + (risco.lucro > 0 ? CFG.BONUS_RESISTE_RISCO : 0);

    return {
      preco: preco,
      cortes: n,
      cenario: atual,
      risco: risco,
      classificacao: classificacao,
      score: score
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     6. OS TRÊS CENÁRIOS DE PREÇO ("Qual preço devo cobrar?")
     Preço sugerido no meio, ±10 nas laterais. Sempre 3 opções, exceto se
     o piso de 9,90 fizer duas coincidirem.
     ═══════════════════════════════════════════════════════════════════ */
  function opcoesDePreco(p, n) {
    var base = precoSugerido(p, n);
    var brutos = [Math.max(9.9, base - 10), base, base + 10];

    var precos = [];
    for (var i = 0; i < brutos.length; i++) {
      if (precos.indexOf(brutos[i]) === -1) precos.push(brutos[i]);
    }

    var opcoes = precos.map(function (preco) { return pontuar(p, preco, n); });

    var melhorIndice = 0;
    for (var j = 1; j < opcoes.length; j++) {
      if (opcoes[j].score > opcoes[melhorIndice].score) melhorIndice = j;
    }
    return { opcoes: opcoes, melhorIndice: melhorIndice, base: base };
  }

  /* ═══════════════════════════════════════════════════════════════════
     7. LIMITE DE USO
     Quantos cortes o preço aguenta antes de virar prejuízo.
     Retorna 0 quando nem 1 corte se paga.
     ═══════════════════════════════════════════════════════════════════ */
  function limiteDeUso(p, preco) {
    if (p.custoDireto <= 0) return Infinity;
    return Math.floor(preco / p.custoDireto);
  }

  /* ═══════════════════════════════════════════════════════════════════
     8. CURVA LUCRO × UTILIZAÇÃO
     Uma linha por quantidade de cortes usados, de 1 até `ate`.
     ═══════════════════════════════════════════════════════════════════ */
  function curvaDeUtilizacao(p, preco, ate) {
    var linhas = [];
    for (var u = 1; u <= ate; u++) linhas.push(cenario(p, preco, u));
    return linhas;
  }

  /* ═══════════════════════════════════════════════════════════════════
     9. PROJEÇÃO DA BASE DE ASSINANTES
     `usoMedio` é o consumo médio real da base (pode ser fracionário e é
     sempre ≤ cortes do plano). É o que separa o cenário de pior caso do
     cenário realista.
     ═══════════════════════════════════════════════════════════════════ */
  function projetarBase(p, preco, assinantes, usoMedio) {
    var n = Math.max(1, Math.round(assinantes));
    var porAssinante = cenario(p, preco, usoMedio);

    var receita   = n * preco;
    var comissoes = n * porAssinante.comissao;
    var variaveis = n * porAssinante.variaveis;
    var contribuicao = receita - comissoes - variaveis;

    return {
      assinantes: n,
      usoMedio: usoMedio,
      porAssinante: porAssinante,
      receita: receita,
      comissoes: comissoes,
      variaveis: variaveis,
      contribuicao: contribuicao,
      // fração dos custos fixos que a assinatura sozinha cobre
      coberturaFixos: p.custosFixos > 0 ? contribuicao / p.custosFixos : 1,
      // quantos assinantes seriam necessários para bancar toda a estrutura fixa
      assinantesParaCobrirFixos: porAssinante.lucro > 0
        ? Math.ceil(p.custosFixos / porAssinante.lucro)
        : null
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     10. RECOMENDAÇÃO DO ADPG
     Testa cada plano de CORTES_AVALIADOS com o seu preço sugerido e
     escolhe o de maior pontuação. Empate → vence o plano menor (menos
     cortes = menos risco operacional e mais simples de vender).
     ═══════════════════════════════════════════════════════════════════ */
  function recomendar(p) {
    var melhor = null;
    for (var i = 0; i < CFG.CORTES_AVALIADOS.length; i++) {
      var n = CFG.CORTES_AVALIADOS[i];
      var cand = pontuar(p, precoSugerido(p, n), n);
      if (!melhor || cand.score > melhor.score + 0.001) melhor = cand;
    }
    return melhor;
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  var ADPG = {
    CFG: CFG,
    clamp: clamp, round90: round90, floor90: floor90, ceil90: ceil90,
    normalizar: normalizar,
    cenario: cenario,
    classificar: classificar,
    precoSugerido: precoSugerido,
    pontuar: pontuar,
    opcoesDePreco: opcoesDePreco,
    limiteDeUso: limiteDeUso,
    curvaDeUtilizacao: curvaDeUtilizacao,
    projetarBase: projetarBase,
    recomendar: recomendar
  };

  if (typeof module === "object" && module.exports) module.exports = ADPG;
  else raiz.ADPG = ADPG;

})(typeof self !== "undefined" ? self : this);
