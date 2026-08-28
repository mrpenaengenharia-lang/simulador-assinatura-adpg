/*
 * Casos de teste do motor de combos — sem dependências.
 * Rodar:  node testes/casos-combos.js
 *
 * Estes números são o contrato: se a implementação em outra linguagem
 * reproduzir todos eles, está correta.
 */
const COMBO = require("../src/combos.js");

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

/* Barbearia de referência ------------------------------------------------ */
const base = [
  { nome: "Corte",       preco: 50, minutos: 40, comissaoPct: 40, custoVar: 5, incluso: true,  carroChefe: true },
  { nome: "Barba",       preco: 35, minutos: 25, comissaoPct: 40, custoVar: 4, incluso: true },
  { nome: "Sobrancelha", preco: 15, minutos: 10, comissaoPct: 40, custoVar: 2 },
  { nome: "Pezinho",     preco: 20, minutos: 15, comissaoPct: 40, custoVar: 2 }
];
const S = COMBO.normalizarServicos(base);
const ref = COMBO.referencia(S);

grupo("Serviço isolado e referência da cadeira");
eq("o corte rende R$ 25,00 de lucro", ref.lucro, 25);
eq("em 40 minutos, ou 0,667 hora", ref.horas, 0.6667, 0.001);
eq("R$ 37,50 por hora de cadeira", ref.lucroHora, 37.50, 0.01);
eq("o carro-chefe marcado e o Corte", ref.servico.nome, "Corte");
eq("a barba sozinha renderia R$ 40,80/h", COMBO.isolado(S[1]).lucroHora, 40.80, 0.01);

grupo("Combo corte + barba a R$ 69,90 — barbearia absorve o desconto");
let a = COMBO.analisar(S, 69.90, "cheio");
eq("soma dos avulsos R$ 85,00", a.somaAvulso, 85);
eq("65 minutos de cadeira", a.minutos, 65);
eq("comissao R$ 34,00 (sobre o preco cheio)", a.comissao, 34);
eq("custos de material R$ 9,00", a.custoVar, 9);
eq("lucro R$ 26,90", a.lucro, 26.90);
eq("margem 38,5%", a.margem * 100, 38.48, 0.05);
eq("desconto 17,8%", a.descontoPct * 100, 17.76, 0.05);
eq("R$ 24,83 por hora de cadeira", a.lucroHora, 24.83, 0.01);
eq("veredito: so em horario ocioso", COMBO.classificar(a, ref).rotulo, "Só em horário ocioso");

grupo("O teste da cadeira");
let op = COMBO.oportunidade(a, ref);
eq("cabem 1,63 cortes no tempo do combo", op.cabem, 1.625, 0.001);
eq("que renderiam R$ 40,63", op.renderiam, 40.625, 0.01);
eq("o combo perde R$ 13,73 contra a cadeira cheia", op.diferenca, -13.725, 0.01);

grupo("Mesmo combo — barbearia e colaborador dividem o desconto");
let b = COMBO.analisar(S, 69.90, "combo");
eq("comissao R$ 27,96 (sobre o valor pago)", b.comissao, 27.96);
eq("lucro R$ 32,94", b.lucro, 32.94);
eq("margem 47,1%", b.margem * 100, 47.12, 0.05);
eq("R$ 30,41 por hora", b.lucroHora, 30.406, 0.01);
eq("continua so em horario ocioso", COMBO.classificar(b, ref).rotulo, "Só em horário ocioso");

grupo("Quanto vale a escolha da base de comissao");
const d = COMBO.diferencaDeBase(S, 69.90);
eq("R$ 6,04 por combo para a barbearia", d.diferencaLucro, 6.04);
eq("os mesmos R$ 6,04 saem do colaborador", d.diferencaComissao, 6.04);

grupo("Limites de preco (barbearia absorve)");
let L = COMBO.limites(S, "cheio", ref);
eq("piso de margem R$ 71,67", L.pisoMargem, 71.667, 0.01);
eq("piso da cadeira R$ 83,63", L.pisoCadeira, 83.625, 0.01);
eq("teto de atratividade R$ 80,75", L.teto, 80.75);
eq("desconto maximo 15,7%", L.descontoMaximoPct * 100, 15.69, 0.05);

grupo("Recomendacao — corte + barba nao fecha");
let r = COMBO.recomendar(S, "cheio", ref);
eq("declarado inviavel", r.viavel, false);
eq("o motivo e a cadeira, nao a margem", r.motivo, "cadeira");
eq("precisaria custar R$ 89,90", r.preco, 89.90);

grupo("Recomendacao — combo que fecha (barbearia de corte mais fraco)");
/* Aqui o carro-chefe rende menos por hora (R$ 26,67/h) e o servico agregado
   rende mais (R$ 40,80/h) - e o unico arranjo em que um combo com desconto
   real supera a cadeira ocupada so com o carro-chefe. */
const S2 = COMBO.normalizarServicos([
  { nome: "Corte", preco: 40, minutos: 45, comissaoPct: 40, custoVar: 4, incluso: true, carroChefe: true },
  { nome: "Barba", preco: 35, minutos: 25, comissaoPct: 40, custoVar: 4, incluso: true }
]);
const ref2 = COMBO.referencia(S2);
eq("o carro-chefe rende R$ 26,67/h", ref2.lucroHora, 26.667, 0.01);
let r2 = COMBO.recomendar(S2, "cheio", ref2);
eq("viavel", r2.viavel, true);
eq("preco recomendado R$ 69,90", r2.preco, 69.90);
eq("com desconto real ao cliente", r2.analise.descontoPct * 100, 6.8, 0.05);
eq("lucro R$ 31,90", r2.analise.lucro, 31.90);
eq("R$ 27,34 por hora", r2.analise.lucroHora, 27.343, 0.01);
eq("e vale sempre", r2.classificacao.rotulo, "Vale sempre");
eq("rende mais por hora que o carro-chefe sozinho", r2.analise.lucroHora > ref2.lucroHora, true);

grupo("Vereditos");
eq("prejuizo quando o preco nao cobre os custos",
   COMBO.classificar(COMBO.analisar(S, 30, "cheio"), ref).rotulo, "Dá prejuízo");
eq("sem vantagem quando o desconto e minusculo",
   COMBO.classificar(COMBO.analisar(S, 84, "cheio"), ref).rotulo, "Sem vantagem");
eq("nao e combo com um servico so",
   COMBO.classificar(COMBO.analisar(COMBO.normalizarServicos([base[0]]), 45, "cheio"), ref).rotulo,
   "Ainda não é combo");

grupo("Comissoes diferentes por servico");
const S3 = COMBO.normalizarServicos([
  { nome: "Corte", preco: 50, minutos: 40, comissaoPct: 40, custoVar: 5, incluso: true, carroChefe: true },
  { nome: "Barba", preco: 35, minutos: 25, comissaoPct: 20, custoVar: 4, incluso: true }
]);
let a3 = COMBO.analisar(S3, 69.90, "cheio");
eq("comissao R$ 27,00 (40% do corte + 20% da barba)", a3.comissao, 27);
eq("percentual efetivo do combo 31,8%", a3.percentualEfetivo * 100, 31.76, 0.05);
let b3 = COMBO.analisar(S3, 69.90, "combo");
eq("na base combo, R$ 22,20", b3.comissao, 22.20, 0.01);
const ref3 = COMBO.referencia(S3);
eq("a R$ 69,90 ainda perde para a cadeira", COMBO.classificar(b3, ref3).rotulo, "Só em horário ocioso");
/* mas agora existe um preco que fecha - com a comissao cheia nao existia */
let r3 = COMBO.recomendar(S3, "combo", ref3);
eq("baixar a comissao do servico agregado torna o combo viavel", r3.viavel, true);
eq("a R$ 79,90", r3.preco, 79.90);
eq("lucro R$ 45,52", r3.analise.lucro, 45.52);
eq("R$ 42,02 por hora, acima dos R$ 37,50 da cadeira", r3.analise.lucroHora, 42.018, 0.01);
eq("ainda com 6,0% de desconto ao cliente", r3.analise.descontoPct * 100, 6.0, 0.05);
eq("veredito vale sempre", r3.classificacao.rotulo, "Vale sempre");

grupo("Casos-limite");
eq("entrada vazia nao quebra", COMBO.normalizarServico({}).preco, 0);
eq("tempo minimo de 1 minuto", COMBO.normalizarServico({minutos:0}).minutos, 1);
eq("comissao travada em 90%", COMBO.normalizarServico({comissaoPct:150}).comissaoPct, 90);
eq("sem carro-chefe marcado, usa o de maior preco",
   COMBO.referencia(COMBO.normalizarServicos([base[1], base[2]])).servico.nome, "Barba");
eq("preco zero da prejuizo", COMBO.analisar(S, 0, "cheio").lucro < 0, true);

console.log("\n" + (falhas === 0
  ? "Todos os " + ok + " casos passaram."
  : falhas + " falha(s) em " + (ok + falhas) + " casos."));
process.exit(falhas === 0 ? 0 : 1);
