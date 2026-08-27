/*
 * Casos de teste do motor de cálculo — sem dependências.
 * Rodar:  node testes/casos.js
 *
 * Estes números são o contrato: se a implementação em outra linguagem
 * (PHP, Python, TypeScript…) reproduzir todos eles, está correta.
 */
const ADPG = require("../src/calculo.js");

let ok = 0, falhas = 0;
function eq(rotulo, obtido, esperado, tol) {
  tol = tol === undefined ? 0.005 : tol;
  const passou = typeof esperado === "number"
    ? Math.abs(obtido - esperado) <= tol
    : obtido === esperado;
  if (passou) { ok++; console.log("  ok   " + rotulo); }
  else { falhas++; console.log("  FALHA " + rotulo + "\n        esperado: " + esperado + "\n        obtido:   " + obtido); }
}
const grupo = t => console.log("\n" + t);

/* Barbearia de referência do briefing ---------------------------------- */
const p = ADPG.normalizar({ precoCorte: 50, comissaoPct: 40, custoVar: 5, custosFixos: 8000 });

grupo("Parâmetros derivados");
eq("comissão por corte = R$ 20,00", p.comissaoCorte, 20);
eq("custo direto por corte = R$ 25,00", p.custoDireto, 25);

grupo("Cenário por cliente — R$ 89,90 com 2 cortes");
let c = ADPG.cenario(p, 89.90, 2);
eq("colaborador recebe R$ 40,00", c.comissao, 40);
eq("custos variáveis R$ 10,00", c.variaveis, 10);
eq("barbearia fica com R$ 49,90", c.fica, 49.90);
eq("lucro R$ 39,90", c.lucro, 39.90);
eq("margem 44,4%", c.margem * 100, 44.4, 0.05);
eq("cliente economiza R$ 10,10", c.economia, 10.10);
eq("classificação Saudável", ADPG.classificar(c, ADPG.cenario(p, 89.90, 3)).rotulo, "Saudável");

grupo("Cenário por cliente — R$ 89,90 com 3 cortes");
c = ADPG.cenario(p, 89.90, 3);
eq("colaborador recebe R$ 60,00", c.comissao, 60);
eq("custos variáveis R$ 15,00", c.variaveis, 15);
eq("barbearia fica com R$ 29,90", c.fica, 29.90);
eq("lucro R$ 14,90", c.lucro, 14.90);
eq("classificação Margem baixa", ADPG.classificar(c, ADPG.cenario(p, 89.90, 4)).rotulo, "Margem baixa");

grupo("Cenário por cliente — R$ 89,90 com 4 cortes");
c = ADPG.cenario(p, 89.90, 4);
eq("colaborador recebe R$ 80,00", c.comissao, 80);
eq("custos variáveis R$ 20,00", c.variaveis, 20);
eq("barbearia fica com R$ 9,90", c.fica, 9.90);
eq("prejuízo de R$ 10,10", c.lucro, -10.10);
eq("classificação Prejuízo", ADPG.classificar(c, ADPG.cenario(p, 89.90, 5)).rotulo, "Prejuízo");

grupo("Limite de uso");
eq("R$ 89,90 sustenta até 3 cortes", ADPG.limiteDeUso(p, 89.90), 3);
eq("R$ 50,00 sustenta até 2 cortes", ADPG.limiteDeUso(p, 50), 2);

grupo("Preço sugerido");
eq("plano de 1 corte (teto de atratividade derruba de 49,90 para 39,90)", ADPG.precoSugerido(p, 1), 39.90);
eq("plano de 2 cortes", ADPG.precoSugerido(p, 2), 89.90);
eq("plano de 3 cortes", ADPG.precoSugerido(p, 3), 139.90);
eq("plano de 4 cortes", ADPG.precoSugerido(p, 4), 179.90);

grupo("Três cenários de preço para o plano de 2 cortes");
const o = ADPG.opcoesDePreco(p, 2);
eq("opção 1 = R$ 79,90", o.opcoes[0].preco, 79.90);
eq("opção 2 = R$ 89,90", o.opcoes[1].preco, 89.90);
eq("opção 3 = R$ 99,90", o.opcoes[2].preco, 99.90);
eq("a recomendada é a do meio", o.melhorIndice, 1);
eq("R$ 79,90 → margem apertada", o.opcoes[0].classificacao.rotulo, "Margem apertada");
eq("R$ 89,90 → saudável", o.opcoes[1].classificacao.rotulo, "Saudável");
eq("R$ 99,90 → sem vantagem para o cliente", o.opcoes[2].classificacao.rotulo, "Sem vantagem");

grupo("Recomendação do ADPG");
const r = ADPG.recomendar(p);
eq("2 cortes por mês", r.cortes, 2);
eq("R$ 89,90", r.preco, 89.90);
eq("lucro por assinante R$ 39,90", r.cenario.lucro, 39.90);
eq("margem 44,4%", r.cenario.margem * 100, 44.4, 0.05);
eq("economia do cliente 10,1%", r.cenario.economiaPct * 100, 10.1, 0.05);
eq("plano saudável", r.classificacao.tom, "ok");

grupo("Base de 100 assinantes usando o plano cheio (2 cortes)");
let b = ADPG.projetarBase(p, 89.90, 100, 2);
eq("receita recorrente R$ 8.990", b.receita, 8990);
eq("colaboradores recebem R$ 4.000", b.comissoes, 4000);
eq("custos variáveis R$ 1.000", b.variaveis, 1000);
eq("contribuição R$ 3.990", b.contribuicao, 3990);
eq("cobre 49,9% dos custos fixos", b.coberturaFixos * 100, 49.875, 0.01);
eq("201 assinantes cobririam os fixos", b.assinantesParaCobrirFixos, 201);

grupo("Base de 100 assinantes com uso médio real de 1,6 corte");
b = ADPG.projetarBase(p, 89.90, 100, 1.6);
eq("colaboradores recebem R$ 3.200", b.comissoes, 3200);
eq("custos variáveis R$ 800", b.variaveis, 800);
eq("contribuição R$ 4.990", b.contribuicao, 4990);

grupo("Casos-limite");
const caro = ADPG.normalizar({ precoCorte: 50, comissaoPct: 80, custoVar: 20, custosFixos: 0 });
eq("comissão é travada em 90%", ADPG.normalizar({ precoCorte: 50, comissaoPct: 300 }).comissaoPct, 90);
eq("custo direto acima do avulso → limite de uso 0", ADPG.limiteDeUso(caro, 40), 0);
eq("preço nunca fica abaixo de R$ 9,90", ADPG.precoSugerido(ADPG.normalizar({ precoCorte: 1, comissaoPct: 0, custoVar: 0 }), 1), 9.90);
eq("entrada vazia não quebra", ADPG.normalizar({}).precoCorte, 1);
eq("uso zero → lucro é o preço cheio", ADPG.cenario(p, 89.90, 0).lucro, 89.90);

console.log("\n" + (falhas === 0
  ? "Todos os " + ok + " casos passaram."
  : falhas + " falha(s) em " + (ok + falhas) + " casos."));
process.exit(falhas === 0 ? 0 : 1);
