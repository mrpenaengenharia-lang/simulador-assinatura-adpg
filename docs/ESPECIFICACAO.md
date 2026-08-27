# Especificação da regra de negócio

Este documento descreve, em português e em fórmula, tudo o que `src/calculo.js` faz.
Serve para implementar o simulador em qualquer linguagem. Os números esperados de cada regra estão em `testes/casos.js`.

---

## 1. Entradas

| Campo | Tipo | Limites | Padrão |
|---|---|---|---|
| `precoCorte` | moeda | mínimo 1 | 50,00 |
| `comissaoPct` | percentual | 0 a 90 | 40 |
| `custoVar` | moeda | mínimo 0 | 5,00 |
| `custosFixos` | moeda | mínimo 0 | 8.000,00 |
| `precoPlano` | moeda | mínimo 1 | 89,90 |
| `cortes` (N) | inteiro | 1 a 8 | 2 |
| `assinantes` | inteiro | mínimo 1 | 100 |
| `usoMedio` | decimal | 0 a N | acompanha N |

Valores inválidos ou vazios caem no mínimo — a tela nunca quebra nem mostra `NaN`.

**Regra de ouro:** qualquer alteração em qualquer um desses campos recalcula a tela inteira. Não existe botão "calcular".

---

## 2. Valores derivados

```
comissaoCorte = precoCorte × comissaoPct / 100
custoDireto   = comissaoCorte + custoVar
```

`custoDireto` é o conceito central: o que efetivamente sai do caixa cada vez que o assinante usa um corte.

*Exemplo padrão:* comissão R$ 20,00 + variável R$ 5,00 = **R$ 25,00 por corte**.

---

## 3. Cenário por cliente

Dado um `preco` de assinatura e um `uso` (quantidade de cortes efetivamente consumidos no mês — pode ser fracionário):

```
comissao    = uso × comissaoCorte
variaveis   = uso × custoVar
fica        = preco − comissao              (o que fica na barbearia antes dos variáveis)
lucro       = fica − variaveis              (contribuição por assinante)
margem      = lucro / preco
avulso      = uso × precoCorte              (o que ele pagaria sem assinatura)
economia    = avulso − preco
economiaPct = economia / avulso
```

`lucro` é **contribuição**, não lucro líquido: os custos fixos já existem hoje e são cobertos pela operação inteira.

### Tabela de referência — preço R$ 89,90, barbearia padrão

| Uso | Comissão | Variáveis | Fica | Lucro | Margem | Economia do cliente |
|---|---|---|---|---|---|---|
| 1 corte | 20,00 | 5,00 | 69,90 | **64,90** | 72,2% | −39,90 |
| 2 cortes | 40,00 | 10,00 | 49,90 | **39,90** | 44,4% | 10,10 |
| 3 cortes | 60,00 | 15,00 | 29,90 | **14,90** | 16,6% | 60,10 |
| 4 cortes | 80,00 | 20,00 | 9,90 | **−10,10** | −11,2% | 110,10 |

---

## 4. Limite de uso

Quantos cortes o preço aguenta antes de virar prejuízo:

```
limiteDeUso = piso(preco / custoDireto)
```

Com R$ 89,90 e custo direto de R$ 25,00 → **3**. Ou seja: sustenta até 3 cortes; a partir do 4º o assinante dá prejuízo. Retorna 0 quando nem um único corte se paga.

---

## 5. Semáforo (classificação)

Recebe o cenário no uso previsto e o **mesmo cenário com 1 corte a mais** — é isso que permite avisar "saudável hoje, frágil se ele usar mais".

Os testes são avaliados **nesta ordem**, do problema mais grave para o menos grave, e o primeiro que bater define o resultado:

| # | Condição | Tom | Rótulo |
|---|---|---|---|
| 1 | `lucro ≤ 0` | 🔴 bad | Prejuízo |
| 2 | `economiaPct < 3%` | 🟡 warn | Sem vantagem |
| 3 | `margem < 25%` | 🔴 bad | Margem baixa |
| 4 | `margem < 40%` | 🟡 warn | Margem apertada |
| 5 | cenário com 1 corte a mais dá prejuízo | 🟡 warn | Saudável, com risco |
| 6 | nenhum dos anteriores | 🟢 ok | Saudável |

A ordem importa: um plano com margem de 60% mas sem desconto nenhum para o cliente é classificado como "Sem vantagem" (regra 2), não como "Saudável".

---

## 6. Preço sugerido para um plano de N cortes

```
custoDiretoPlano = N × custoDireto
preco            = arredonda90( custoDiretoPlano / (1 − MARGEM_ALVO) )

teto = N × precoCorte × 0,95      → precisa sobrar desconto para o cliente
piso = custoDiretoPlano × 1,15    → precisa sobrar margem para a barbearia

se preco > teto → preco = piso90(teto)
se preco < piso → preco = teto90(piso)
```

O teto é aplicado antes do piso, então **o teto vence** quando os dois brigam. Isso é proposital: numa barbearia de custo direto alto demais não existe preço que satisfaça os dois lados, e o semáforo é quem tem que acusar isso — não o arredondamento.

### Arredondamento para preço terminado em ",90"

```
arredonda90(x) = máx(9,90 ; arredonda((x − 9,9) / 10) × 10 + 9,9)
piso90(x)      = máx(9,90 ; piso((x − 9,9) / 10) × 10 + 9,9)
teto90(x)      = máx(9,90 ; teto((x − 9,9) / 10) × 10 + 9,9)
```

Produz 39,90 · 49,90 · 89,90 · 139,90. Nunca abaixo de R$ 9,90.

### Resultado na barbearia padrão

| Plano | Alvo bruto | Aplicado | Por quê |
|---|---|---|---|
| 1 corte | 45,45 → 49,90 | **39,90** | 49,90 estourou o teto de 47,50 |
| 2 cortes | 90,90 → **89,90** | 89,90 | dentro dos limites |
| 3 cortes | 136,36 → **139,90** | 139,90 | dentro dos limites |
| 4 cortes | 181,82 → **179,90** | 179,90 | dentro dos limites |

---

## 7. Pontuação de uma combinação (preço × N cortes)

Traduz em um número único o equilíbrio entre os três interesses em jogo:

```
score = BONUS_TOM[tom]                          ok: +100 · warn: 0 · bad: −100
      + margem × 100                            interesse da barbearia
      + mínimo(economiaPct × 100 ; 22)          interesse do cliente, com teto
      + (cenário com 1 corte a mais dá lucro ? 12 : 0)   resistência ao risco
```

O `BONUS_TOM` é o que garante coerência: **nenhuma opção âmbar ou vermelha pode ganhar de uma verde** só por ter mais desconto ou mais margem. Sem ele, R$ 79,90 (margem apertada, mas 20% de desconto) venceria R$ 89,90 (saudável) — e a tela mostraria um "recomendado" com etiqueta de alerta.

O teto de 22 pontos no desconto evita que o algoritmo persiga o preço mais baixo possível.

---

## 8. Os três cenários de preço

```
base   = precoSugerido(N)
opções = [ máx(9,90 ; base − 10) ,  base ,  base + 10 ]     (sem duplicatas)
```

Cada opção é pontuada pela regra 7; a de maior score é a recomendada.
A estrela "★ Recomendado" só aparece se essa opção também for **verde** — se a melhor das três for âmbar, a tela mostra o rótulo real dela em vez da estrela.

*Plano de 2 cortes na barbearia padrão:*

| Preço | Lucro | Margem | Desconto | Classificação | Score |
|---|---|---|---|---|---|
| 79,90 | 29,90 | 37,4% | 20,1% | 🟡 Margem apertada | 69,5 |
| **89,90** | **39,90** | **44,4%** | **10,1%** | 🟢 Saudável | **166,5** |
| 99,90 | 49,90 | 49,9% | 0,1% | 🟡 Sem vantagem | 62,0 |

---

## 9. Projeção da base de assinantes

`usoMedio` é o consumo médio real da base — pode ser fracionário e nunca passa de N. É o que separa o cenário de pior caso do cenário realista. Na interface o slider acompanha N automaticamente até o usuário mexer nele.

```
receita      = assinantes × preco
comissoes    = assinantes × usoMedio × comissaoCorte
variaveis    = assinantes × usoMedio × custoVar
contribuicao = receita − comissoes − variaveis

coberturaFixos            = contribuicao / custosFixos
assinantesParaCobrirFixos = teto( custosFixos / lucroPorAssinante )
```

`assinantesParaCobrirFixos` é nulo quando o lucro por assinante é zero ou negativo — nesse caso a tela avisa que **mais assinantes só aumentam o rombo**, em vez de mostrar um número sem sentido.

*100 assinantes a R$ 89,90 usando o plano cheio:* receita 8.990 · comissões 4.000 · variáveis 1.000 · **contribuição 3.990** · cobre 49,9% dos custos fixos · seriam necessários **201 assinantes** para bancar toda a estrutura fixa.

---

## 10. Recomendação do ADPG

```
para N em [1, 2, 3, 4]:
    candidato = pontuar( precoSugerido(N), N )
escolhe o candidato de maior score
empate → vence o N menor
```

O desempate pelo N menor é intencional: menos cortes inclusos significa menos risco operacional e um plano mais simples de vender.

*Barbearia padrão:* **2 cortes por mês a R$ 89,90** — lucro de R$ 39,90 por assinante, margem de 44,4%, economia de 10,1% para o cliente, plano 🟢 saudável.

---

## 11. Comportamentos da interface

- **Recálculo total a cada tecla.** Não existe botão "calcular". Todo input dispara o recálculo da tela inteira.
- **Clicar num cenário de preço aplica aquele preço** ao campo da assinatura e recalcula.
- **"Aplicar a recomendação"** ajusta preço e quantidade de cortes de uma vez.
- **O slider de uso médio acompanha o plano** até o usuário mexer nele; a partir daí fica independente. Trocar a quantidade de cortes religa o acompanhamento.
- **O gráfico vai de 1 até `máx(4 ; N + 2)` cortes**, com barras negativas para a esquerda do zero e a linha do cenário atual destacada.
- **Prejuízo nunca é escondido.** Na barra de composição, o prejuízo aparece como faixa vermelha estourando o valor pago.

---

## 12. Fora do escopo do protótipo

Não estão no cálculo e precisam de decisão do produto antes de virar produção:
impostos, taxa de cartão, inadimplência, churn, planos com serviços mistos (corte + barba), comissão fixa por corte em vez de percentual.
