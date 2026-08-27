# Simulador de Assinatura ADPG

Ferramenta de decisão para o dono de barbearia montar um plano de assinatura e enxergar, na hora, se ele se paga.

O dono mexe em qualquer valor — preço do corte, comissão, custo variável, custos fixos, preço da assinatura, quantidade de cortes — e **tudo recalcula em tempo real**: margem por cliente, risco de o cliente usar mais do que o previsto, preço recomendado e projeção da base de assinantes.

> Este repositório é o **protótipo funcional + a especificação da regra de negócio**. A ideia é que sirva de referência para a implementação dentro do ADPG, não que seja o código final de produção.

---

## Como rodar

Não tem build, não tem dependência. Abra o `index.html` no navegador.

```bash
# ou, se preferir servir por HTTP:
npx serve .
```

Para rodar os testes da regra de negócio:

```bash
node testes/casos.js
```

---

## Estrutura

```
index.html              Protótipo completo (interface + estilos)
src/calculo.js          Motor de cálculo — funções puras, sem DOM, sem dependências
testes/casos.js         52 casos de teste com os números esperados
docs/ESPECIFICACAO.md   A regra de negócio escrita: fórmulas, limites e semáforo
```

**A separação é proposital.** Toda a regra de negócio está em `src/calculo.js` e nada mais.
O `index.html` só lê input, formata número e desenha. Para portar para React, Vue, Livewire ou o que for, o arquivo a traduzir é `calculo.js` — e `testes/casos.js` prova que a tradução ficou correta.

---

## O que a tela faz

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

---

## Os três conceitos que sustentam tudo

1. **Custo direto por corte** = comissão do colaborador + custo variável.
   É o que sai do caixa toda vez que o assinante aparece. No exemplo padrão: R$ 20 + R$ 5 = **R$ 25**.

2. **Lucro por assinante** = preço da assinatura − (cortes usados × custo direto).
   É contribuição, não lucro líquido: os custos fixos já existem hoje e são cobertos pela operação inteira.

3. **Risco de utilização.** O plano pode ser saudável com 2 cortes e dar prejuízo com 4. Por isso o simulador nunca mostra um número só — mostra a curva inteira e avisa a partir de quantos cortes o assinante vira despesa.

---

## Configuração da regra de negócio

Os parâmetros do que o ADPG considera "saudável" estão isolados no objeto `CFG`, no topo de `src/calculo.js`:

| Constante | Padrão | O que significa |
|---|---|---|
| `MARGEM_ALVO` | 45% | Margem que o preço sugerido persegue |
| `TETO_ATRATIVIDADE` | 95% | O preço nunca passa de 95% do avulso equivalente |
| `PISO_SEGURANCA` | 115% | O preço nunca fica abaixo de 115% do custo direto |
| `MARGEM_SAUDAVEL` | 40% | A partir daqui o semáforo fica verde |
| `MARGEM_ACEITAVEL` | 25% | Abaixo daqui fica vermelho |
| `DESCONTO_MINIMO` | 3% | Menos que isso e o cliente não vê motivo para assinar |

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

---

## Origem

Protótipo desenhado a partir do briefing do produto. Os números padrão (corte R$ 50, comissão 40%, custo variável R$ 5, fixos R$ 8.000) reproduzem exatamente o exemplo do briefing — inclusive o plano de R$ 89,90 com 2 cortes gerando R$ 39,90 de lucro por assinante e o cenário de 4 cortes gerando R$ 10,10 de prejuízo.
