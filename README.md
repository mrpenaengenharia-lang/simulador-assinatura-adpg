# Simuladores ADPG para barbearias

Duas ferramentas de decisão para o dono de barbearia, na mesma base de código:

| Tela | A pergunta que responde |
|---|---|
| [`index.html`](index.html) &mdash; **Assinatura** | Esse plano se paga? E se o cliente usar mais do que eu previ? |
| [`combos.html`](combos.html) &mdash; **Combos** | Esse combo compensa? E em qual horário? |

Em ambas, o dono mexe em qualquer valor e **tudo recalcula em tempo real**. Nenhuma tem botão "calcular".

**Assinatura** — o risco é o cliente *usar demais*: um plano saudável com 2 cortes pode dar prejuízo com 4. Mostra margem por cliente, a curva inteira de utilização, preço recomendado e projeção da base de assinantes.

**Combos** — o risco é o combo *ocupar a cadeira demais*: ele aumenta o ticket e pode derrubar o lucro por hora. Mostra o teste da cadeira (quantos carros-chefe caberiam naquele tempo e quanto renderiam), até onde dá para descontar e o preço recomendado.

> Este repositório é o **protótipo funcional + a especificação da regra de negócio**. A ideia é que sirva de referência para a implementação dentro do ADPG, não que seja o código final de produção.

---

## Como rodar

Não tem build, não tem dependência. Abra o `index.html` no navegador.

```bash
# ou, se preferir servir por HTTP:
npx serve .
```

Para rodar os testes das duas regras de negócio (109 casos):

```bash
npm test
```

---

## Estrutura

```
index.html                      Tela da assinatura
combos.html                     Tela dos combos
src/estilo.css                  Estilos compartilhados pelas duas telas
src/calculo.js                  Motor da assinatura - funções puras, sem DOM
src/combos.js                   Motor dos combos - funções puras, sem DOM
testes/casos.js                 52 casos com os números esperados da assinatura
testes/casos-combos.js          57 casos com os números esperados dos combos
docs/ESPECIFICACAO.md           Regra de negócio da assinatura
docs/ESPECIFICACAO-COMBOS.md    Regra de negócio dos combos
```

**A separação é proposital.** Toda a regra de negócio está em `src/calculo.js` e `src/combos.js`, e em nenhum outro lugar. As telas só leem input, formatam número e desenham. Para portar para React, Vue, Livewire ou o que for, os arquivos a traduzir são esses dois — e as suítes de teste provam que a tradução ficou correta.

---

## O que as telas fazem

### Tela de assinatura

| Seção | O que resolve |
|---|---|
| **Dados da barbearia** | Preço do corte, comissão, custo variável e custos fixos |
| **Monte sua assinatura** | Preço do plano e quantos cortes ele inclui |
| **Veredito** | Semáforo verde/âmbar/vermelho com a frase explicando o porquê |
| **Resultado por cliente** | Quanto o cliente paga, quanto o colaborador leva, quanto sobra |
| **O que muda para o cliente** | Avulso × assinatura e a economia real |
| **Lucro × utilização** | O gráfico de risco: o que acontece se ele usar 1, 2, 3, 4 cortes |
| **Qual preço devo cobrar** | Três cenários calculados, clicáveis, com a recomendação marcada |
| **Base de assinantes** | Receita recorrente, contribuição e quanto cobre dos custos fixos |
| **O ADPG recomenda** | O plano de melhor equilíbrio entre margem, desconto e risco |

### Tela de combos

Três perguntas, uma resposta. Tudo o que não é decisão fica escondido atrás de "Ajustar meus preços".

| Passo | O que pergunta |
|---|---|
| **1. O que entra no combo?** | Serviços em botões grandes, com preço e tempo já preenchidos |
| **2. Por quanto você vende?** | Preço e desconto no mesmo controle |
| **3. O barbeiro ganha em cima de quê?** | Duas opções mostrando o valor em reais de cada uma |
| **A resposta** | Uma frase grande: *pode vender* / *só com a cadeira vazia* / *dá prejuízo* — e o porquê em linguagem de barbearia |
| **Três números** | Quanto você lucra, quanto sobra de cada R$ 100, quanto tempo prende a cadeira |
| **A sugestão** | O melhor preço para esse combo, clicável — ou o motivo de não existir preço que feche |

---

## Os conceitos que sustentam tudo

### Assinatura

1. **Custo direto por corte** = comissão do colaborador + custo variável.
   É o que sai do caixa toda vez que o assinante aparece. No exemplo padrão: R$ 20 + R$ 5 = **R$ 25**.

2. **Lucro por assinante** = preço da assinatura − (cortes usados × custo direto).
   É contribuição, não lucro líquido: os custos fixos já existem hoje e são cobertos pela operação inteira.

3. **Risco de utilização.** O plano pode ser saudável com 2 cortes e dar prejuízo com 4. Por isso o simulador nunca mostra um número só — mostra a curva inteira e avisa a partir de quantos cortes o assinante vira despesa.

### Combos

1. **Lucro por hora de cadeira** = lucro do combo ÷ tempo que ele ocupa a cadeira.
   É a única unidade que permite comparar coisas de durações diferentes.

2. **Carro-chefe** = o serviço que mais enche a agenda. É a régua: no horário de pico, cada hora vendida em combo é uma hora que deixou de vender carro-chefe.

3. **Quem absorve o desconto.** A comissão pode incidir sobre o preço de tabela ou sobre o valor que o cliente pagou. No exemplo padrão isso muda o lucro em R$ 6,04 por combo — é a variável mais pesada da tela, e a decisão é do dono.

> **O achado que a ferramenta entrega:** corte + barba a R$ 69,90 sobe o ticket de R$ 50 para R$ 69,90 e **derruba** o lucro por hora de R$ 37,50 para R$ 24,83. No tempo desse combo cabem 1,63 cortes, que renderiam R$ 40,63 — contra R$ 26,90 do combo. Ele é um instrumento de **horário ocioso**, não de pico.

---

## Configuração da regra de negócio

Os parâmetros do que o ADPG considera "saudável" estão isolados no objeto `CFG`, no topo de cada motor. Na assinatura (`src/calculo.js`):

| Constante | Padrão | O que significa |
|---|---|---|
| `MARGEM_ALVO` | 45% | Margem que o preço sugerido persegue |
| `TETO_ATRATIVIDADE` | 95% | O preço nunca passa de 95% do avulso equivalente |
| `PISO_SEGURANCA` | 115% | O preço nunca fica abaixo de 115% do custo direto |
| `MARGEM_SAUDAVEL` | 40% | A partir daqui o semáforo fica verde |
| `MARGEM_ACEITAVEL` | 25% | Abaixo daqui fica vermelho |
| `DESCONTO_MINIMO` | 3% | Menos que isso e o cliente não vê motivo para assinar |

Nos combos (`src/combos.js`): `MARGEM_SAUDAVEL` 40%, `MARGEM_ACEITAVEL` 25%, `DESCONTO_MINIMO` 5%, `TETO_ATRATIVIDADE` 95%.

Se o ADPG tiver benchmarks próprios de mercado, muda-se só o `CFG` — nada mais no código precisa ser tocado.

---

## Pendências para a versão de produção

Coisas que ficaram deliberadamente de fora do protótipo e que precisam de decisão antes de virar produto:

- [ ] **Taxa de cartão e impostos.** Numa assinatura recorrente a taxa pesa. Entraria como um `%` sobre a receita, aplicado antes do lucro.
- [ ] **Inadimplência / churn.** Hoje a projeção assume 100% de adimplência.
- [ ] **Planos com serviços diferentes** (corte + barba, por exemplo) com custos e comissões distintos.
- [ ] **Comissão fixa por corte** como alternativa à comissão percentual.
- [ ] **Salvar/carregar cenários** por barbearia dentro do ADPG.
- [ ] **Exportar em PDF** o resultado para o dono levar para a reunião.
- [ ] Validar o `MARGEM_ALVO` de 45% contra o benchmark real do ADPG.
- [ ] **Tempo de limpeza entre atendimentos** — hoje o tempo de cadeira do combo é a soma pura dos serviços.
- [ ] **Combo dentro da assinatura** — a combinação das duas ferramentas.

---

## Origem

Protótipo desenhado a partir do briefing do produto. Os números padrão (corte R$ 50, comissão 40%, custo variável R$ 5, fixos R$ 8.000) reproduzem exatamente o exemplo do briefing — inclusive o plano de R$ 89,90 com 2 cortes gerando R$ 39,90 de lucro por assinante e o cenário de 4 cortes gerando R$ 10,10 de prejuízo.
