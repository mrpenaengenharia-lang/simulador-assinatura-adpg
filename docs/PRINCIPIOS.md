# Princípios destes simuladores

Decisões de produto que valem mais que qualquer detalhe de implementação. Se um dia alguém pedir para mudar alguma coisa que contraria o que está aqui, essa conversa precisa acontecer antes de mexer no código.

---

## 1. O simulador fala a verdade, mesmo quando desanima

Se a configuração não fecha, a tela diz que não fecha. Não existe amaciar o resultado para o dono se animar a usar o recurso.

**Por quê.** O dono que monta um plano ruim porque o ADPG deixou vai perder dinheiro por três ou quatro meses até perceber. E quando perceber, ele não vai culpar a própria conta — vai culpar o sistema que mandou ele fazer aquilo. Aí o ADPG perde o assinante, perde a indicação dele, e ainda ganha a fama de ter quebrado a barbearia do fulano. **Um "não" na tela custa infinitamente menos do que isso.**

É melhor o dono saber que não tem retorno antes, do que fazer e quebrar a cara.

Isso também é posicionamento: *"o único sistema que te avisa quando o plano não fecha"* é coisa que concorrente nenhum copia, porque exige coragem de contrariar o próprio cliente.

**O que isso proíbe na prática:**

- Afrouxar os limites do `CFG` para "dar menos vermelho".
- Esconder o cenário ruim (o assinante que usa 4 cortes, o combo que perde para a cadeira cheia).
- Trocar o veredito por um texto morno quando a conta é ruim.

Daqui a seis meses alguém vai olhar um painel cheio de âmbar e propor exatamente isso. A resposta está escrita aqui.

---

## 2. O simulador nunca dá um "não" sozinho

Toda vez que ele reprova uma configuração, mostra **o que mudar**: qual preço fecharia, quanto de desconto ainda cabe, ou em que situação aquilo funcionaria.

**Por quê.** É isso que separa "falar a verdade" de "desanimar o cliente". Um "não" sem saída faz o dono fechar a aba. Um "não" com caminho faz ele testar outra configuração — e continuar dentro do sistema.

As duas telas já funcionam assim:

- A de combos não diz só *"não vale"*. Diz *"teria que custar R$ 89,90"*, mostra quanto de desconto ainda cabe, e lembra que **no horário parado ele vale**, porque ali a cadeira renderia zero.
- A de assinatura mostra três preços com o motivo de cada um, e aponta a partir de quantos cortes o assinante vira prejuízo.

---

## 3. A conta nunca é escondida do dono, mas também não é jogada na cara dele

A tela pergunta o mínimo e responde uma coisa só. Toda a configuração fina — preços, tempos, materiais, comissões — chega preenchida e fica atrás de um "ajustar", para quem quiser conferir.

**Por quê.** O dono de barbearia não quer operar um painel, quer saber se pode vender. A primeira versão da tela de combos abria com uma tabela de 20 campos e foi rejeitada por isso: virou planilha, não ferramenta de decisão.

Regra prática: **se o número não muda a decisão que ele vai tomar agora, ele não aparece na primeira tela.**

---

## 4. Recálculo total, sempre

Não existe botão "calcular". Qualquer alteração em qualquer campo recalcula a tela inteira, na hora.

**Por quê.** O valor da ferramenta está em o dono mexer e ver o resultado mudar — é assim que ele entende a própria operação. Um botão "calcular" quebra esse laço.

---

## 5. A calculadora termina em ação, não em número

A tela de assinatura termina em **"Criar esse plano no ADPG"**; a de combos, em **"Criar esse combo no ADPG"** — já com os valores preenchidos, sem o dono digitar nada de novo.

**Por quê.** Sem isso o dono fecha a aba e esquece. Com isso, o caminho entre a dúvida e a primeira cobrança recorrente é de dois cliques. É o que transforma a calculadora de curiosidade em ferramenta de ativação — e é o que torna o valor dela mensurável: *quantos simularam → quantos criaram → quanto de recorrência entrou*.

No protótipo esses botões são só marcadores, sem função. No sistema é onde a calculadora se liga à cobrança recorrente e ao cadastro de serviços.

---

## 6. Lucro aqui é contribuição, e isso é dito na tela

O "lucro" mostrado é o que sobra depois da comissão e do material. Os custos fixos da barbearia já existem e são cobertos pela operação inteira.

**Por quê.** Se o dono achar que aquele número é lucro líquido, ele vai tomar decisão errada — e o princípio 1 vale aqui também. O rodapé das duas telas diz isso em português claro.
