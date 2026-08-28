# Especificação da regra de negócio — Combos

Descreve tudo o que `src/combos.js` faz. Os números esperados de cada regra estão em `testes/casos-combos.js`.

> **A pergunta que este motor responde não é "quanto lucro dá o combo", é "QUANDO esse combo vale".**
> Um combo aumenta o ticket e ocupa a cadeira por mais tempo. Se o lucro por hora ficar abaixo do que o carro-chefe renderia naquele mesmo tempo, o combo só serve para preencher agenda vazia — no horário de pico ele destrói margem.

---

## 1. Entradas

### Por serviço

| Campo | Tipo | Limites | Exemplo |
|---|---|---|---|
| `nome` | texto | — | Corte |
| `preco` | moeda | mínimo 0 | 50,00 |
| `minutos` | inteiro | mínimo 1 | 40 |
| `custoVar` | moeda | mínimo 0 | 5,00 |
| `comissaoPct` | percentual | 0 a 90 | 40 |
| `incluso` | sim/não | — | sim |
| `carroChefe` | sim/não | só um serviço | sim |

### Do combo

| Campo | Tipo | Padrão |
|---|---|---|
| `precoCombo` | moeda | 69,90 |
| `baseComissao` | `"cheio"` ou `"combo"` | `"cheio"` |

**Regra de ouro:** qualquer alteração recalcula a tela inteira. Não existe botão "calcular".

Na interface, **preço e desconto são o mesmo controle visto de dois jeitos** — o que o dono mexeu por último manda, o outro acompanha.

---

## 2. A escolha que mais pesa: a base da comissão

Quando o combo tem desconto, alguém absorve esse desconto. Quem, é decisão do dono — não do programador. As duas opções:

| Base | O colaborador recebe sobre | Quem absorve o desconto |
|---|---|---|
| `cheio` | o preço de tabela de cada serviço, como se não houvesse combo | a barbearia, sozinha |
| `combo` | o valor que o cliente realmente pagou | barbearia e colaborador, proporcionalmente |

```
comissaoCheia = Σ (preco_i × comissaoPct_i / 100)
k             = comissaoCheia / somaAvulso        (percentual efetivo do combo)

base "cheio":  comissao = comissaoCheia
base "combo":  comissao = precoCombo × k
```

O rateio pelo `k` faz o preço com desconto ser distribuído entre os serviços na proporção do preço de tabela de cada um, e cada fatia recebe o seu próprio percentual — assim **comissões diferentes por serviço continuam valendo**.

No exemplo padrão (corte + barba a R$ 69,90) essa escolha vale **R$ 6,04 por combo**: a comissão vai de R$ 34,00 para R$ 27,96 e o lucro de R$ 26,90 para R$ 32,94. A tela mostra os dois números lado a lado para o dono decidir vendo o impacto.

---

## 3. Análise do combo

```
somaAvulso = Σ preco_i           (só dos serviços inclusos)
minutos    = Σ minutos_i
custoVar   = Σ custoVar_i
horas      = minutos / 60

lucro       = precoCombo − comissao − custoVar
margem      = lucro / precoCombo
desconto    = somaAvulso − precoCombo
descontoPct = desconto / somaAvulso
lucroHora   = lucro / horas
```

`lucro` é **contribuição**: os custos fixos da barbearia já existem e são cobertos pela operação inteira.

---

## 4. A referência da cadeira

O que aquela hora de cadeira renderia sem o combo.

```
lucroServico     = preco − (preco × comissaoPct/100) − custoVar
lucroHoraServico = lucroServico / (minutos / 60)

referencia = lucroHora do serviço marcado como CARRO-CHEFE
```

Se nenhum estiver marcado, usa o de maior preço.

**Por que o carro-chefe e não o de maior lucro/hora?** Porque dá para render muito com uma sobrancelha de 10 minutos, mas não dá para encher o dia com ela. A régua tem que ser o serviço que realmente ocupa a agenda.

*Barbearia padrão:* corte a R$ 50 em 40 min → lucro R$ 25,00 → **R$ 37,50 por hora de cadeira**.

---

## 5. O teste da cadeira (custo de oportunidade)

```
cabem      = minutosDoCombo / minutosDoCarroChefe
renderiam  = cabem × lucroDoCarroChefe
diferenca  = lucroDoCombo − renderiam
```

*Corte + barba a R$ 69,90:* no tempo do combo (65 min) cabem **1,63 cortes**, que renderiam **R$ 40,63**. O combo rende **R$ 26,90** — **R$ 13,73 a menos**.

É essa frase que o dono precisa ler. O ticket subiu de R$ 50 para R$ 69,90 e o lucro por hora caiu de R$ 37,50 para R$ 24,83.

---

## 6. Semáforo

Avaliado **nesta ordem**; o primeiro que bater define o resultado.

| # | Condição | Tom | Rótulo |
|---|---|---|---|
| 1 | menos de 2 serviços | 🟡 warn | Ainda não é combo |
| 2 | `lucro ≤ 0` | 🔴 bad | Dá prejuízo |
| 3 | `descontoPct < 5%` | 🟡 warn | Sem vantagem |
| 4 | `margem < 25%` | 🔴 bad | Margem baixa |
| 5 | `lucroHora < referência` | 🟡 warn | Só em horário ocioso |
| 6 | nenhum dos anteriores | 🟢 ok | Vale sempre |

A regra 5 é a que diferencia esta ferramenta de uma calculadora de margem comum: o combo pode ter margem excelente e ainda assim ser um mau negócio no horário de pico.

---

## 7. Limites de preço

Três preços que interessam ao dono, todos exatos (sem arredondamento):

```
base "cheio":   pisoMargem  = (comissaoCheia + custoVar) / (1 − 0,40)
                pisoCadeira = (referencia × horas) + comissaoCheia + custoVar

base "combo":   pisoMargem  = custoVar / (1 − k − 0,40)
                pisoCadeira = ((referencia × horas) + custoVar) / (1 − k)

teto = somaAvulso × 0,95        precisa sobrar desconto para o cliente

descontoMaximoPct = (somaAvulso − pisoMargem) / somaAvulso
```

*Corte + barba, base cheio:* piso de margem **R$ 71,67**, piso da cadeira **R$ 83,63**, teto **R$ 80,75**, desconto máximo **15,7%**.

---

## 8. Preço recomendado

```
alvo  = máximo(pisoMargem ; pisoCadeira)
preco = arredondaParaCima90(alvo)

se preco > teto  ->  o combo é declarado INVIÁVEL
```

Quando é inviável, o motor diz **qual dos dois limites estourou** (`motivo: "cadeira"` ou `"margem"`), para a tela poder sugerir o que mexer em vez de só dar um "não".

*Corte + barba:* precisaria custar **R$ 89,90** para empatar com a cadeira, mas o teto é R$ 80,75 → **não fecha**. Só sobra 1,6% de desconto, abaixo do mínimo de 5%. A tela então diz o que é verdade: **é um combo de horário ocioso** — naquela hora a cadeira renderia zero, então R$ 26,90 é lucro que não existiria.

### Quando um combo fecha

Só quando o serviço agregado rende **mais por hora** do que o carro-chefe, com folga suficiente para bancar o desconto:

- Corte fraco (R$ 40 em 45 min = R$ 26,67/h) + barba (R$ 40,80/h) → recomendado **R$ 69,90**, 6,8% de desconto, R$ 27,34/h → 🟢 vale sempre.
- Corte forte (R$ 37,50/h) + barba com comissão reduzida a 20% → recomendado **R$ 79,90**, 6,0% de desconto, R$ 42,02/h → 🟢 vale sempre.

Ou seja: as alavancas do dono são **reduzir o desconto**, **reduzir a comissão do serviço agregado** ou **dividir o desconto com o colaborador**.

---

## 9. Comportamentos da interface

- Recálculo total a cada tecla; preço e desconto são espelhos um do outro.
- A escolha da base de comissão mostra os dois cenários com números, lado a lado, antes de decidir.
- Serviços podem ser adicionados e removidos; o mínimo é 2 na lista.
- Remover o carro-chefe promove o primeiro serviço restante — nunca fica sem referência.
- Valores vazios ou inválidos caem no mínimo. A tela nunca quebra nem mostra `NaN`.
- Quando o combo não fecha, a tela nunca dá só um "não": mostra o preço que seria necessário, o quanto de desconto ainda cabe e a alternativa do horário ocioso.

---

## 10. Fora do escopo

Impostos, taxa de cartão, no-show, tempo de limpeza entre atendimentos, combos com validade (pacote de sessões) e combos vendidos dentro de um plano de assinatura — a combinação das duas ferramentas.
