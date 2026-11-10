Aqui tens o segundo ficheiro, docs/AURAv2.md, completo.

```markdown
# AURA — Sistema de Distribuição de Alunos (v2.0)

**Autor:** Francisco Tchiama  
**Companhia:** TCLabs  
**Data:** 10/11/2026  
**Versão:** 2.0

Este documento descreve a arquitetura, o modelo de dados e o funcionamento do AURA, o algoritmo de distribuição de alunos do Complexo Escolar Santa Catarina (CESC), na sua versão 2.

---

## 1. O que é o AURA

O AURA é composto por **três módulos independentes**, que trabalham em momentos diferentes do ano letivo:

1. **O JUIZ (Fim do Ano)** — Lê as notas do professor, cruza com a Grelha Curricular e aplica as regras de aprovação. Marca cada aluno como `aprovado` ou `reprovado`.
2. **A TRANSIÇÃO (Fim do Ano / Início do Novo)** — Lê os alunos `matriculado`, cria as inscrições `matricula_paga` para o novo ano e prepara o ciclo seguinte. Ignora a 9ª e a 12ª (concluem o ciclo).
3. **O DISTRIBUIDOR (Início do Ano)** — Coloca os alunos nas salas físicas, usando a planta da escola (atemporal). Muda o estado para `matriculado`.

**Princípio fundamental:** O AURA não calcula notas. Ele lê o que o professor lançou e aplica as regras configuradas pelo Diretor.

---

## 2. Fluxo de Trabalho (Ciclo Completo)

```

┌─────────────────────────────────────────────────────────────┐
│ 1. DIRETOR define REGRAS (negativas críticas e secundárias) │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 2. DIRETOR define a GRELHA CURRICULAR (disciplinas críticas │
│    e secundárias por classe/curso)                          │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SECRETÁRIA cria SALAS FÍSICAS (Pav, Sala, Turno, Cap.)  │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DIRETOR define a ALOCAÇÃO DE SALAS (planta da escola)   │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PROFESSORES lançam as notas                              │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 6. DIRETOR corre o JUIZ (avalia e aprova/reprova)           │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 7. DIRETOR corre a TRANSIÇÃO (cria inscrições do novo ano)  │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 8. NOVOS ALUNOS inscrevem-se e ficam 'matricula_paga'       │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 9. DIRETOR corre o DISTRIBUIDOR (coloca nas salas)          │
└─────────────────────────────────────────────────────────────┘
↓
┌─────────────────────────────────────────────────────────────┐
│ 10. RESULTADO: aluno com Classe, Curso, Sala, Pav, Turno,  │
│     Nº de Aluno.                                            │
└─────────────────────────────────────────────────────────────┘

```

---

## 3. Modelo de Dados

### 3.1. Tabelas usadas pelo AURA

| Tabela | Papel na AURA |
|---|---|
| `cesc.alunos` | Identidade do aluno (BI, nome, dados pessoais). O AURA só lê. |
| `cesc.inscricoes` | Peça central. Define classe/curso, tipo (novo/aprovado/reprovado) e estado (matricula_paga, matriculado). |
| `cesc.matriculas` | Liga o aluno ao ano letivo, classe, curso, sala (`sala_id`) e número de aluno (`numero_aluno`). |
| `cesc.notas_trimestrais` | O JUIZ lê o `mfd` de cada disciplina. |
| `cesc.regras_aura` | Regras de aprovação (máximo de negativas críticas e secundárias), por classe/curso. **Atemporal** (sem ano letivo). |
| `cesc.grelha_curricular` | Define quais disciplinas pertencem a cada classe/curso e se são críticas ou secundárias. |
| `cesc.salas` | Salas físicas (pavilhão, turno, capacidade). |
| `cesc.alocacao_salas` | Planta da escola (ex: Pav 1, Salas 1-3, 10ª CFB, Matinal). **Atemporal** (sem ano letivo). |

### 3.2. Estrutura das tabelas do AURA

**`cesc.regras_aura`**
```sql
id uuid PK
classe varchar NOT NULL
curso varchar (nullable)
max_negativas_criticas integer DEFAULT 0
max_negativas_secundarias integer DEFAULT 2
criado_em timestamp
UNIQUE(classe, curso)
```

cesc.alocacao_salas

```sql
id uuid PK
ano_lectivo varchar (nullable, guarda o ano de criação)
turno varchar NOT NULL
pavilhao varchar NOT NULL
sala_inicio integer NOT NULL
sala_fim integer NOT NULL
classe varchar NOT NULL
curso varchar (nullable)
criado_em timestamp
UNIQUE(ano_lectivo, turno, pavilhao, sala_inicio, sala_fim, classe, curso)
```

cesc.grelha_curricular

```sql
id uuid PK
classe_id uuid FK
curso_id uuid FK
disciplina_id uuid FK
critica boolean DEFAULT false
UNIQUE(classe_id, curso_id, disciplina_id)
```

---

4. O JUIZ (cesc_aura_julgar)

4.1. O que faz

1. Percorre todas as inscrições com estado = 'matricula_paga' e tipo = 'novo' no ano letivo.
2. Para cada aluno, procura a regra correspondente em cesc.regras_aura (classe + curso).
3. Vai à cesc.grelha_curricular e conta as negativas (notas com mfd < 10):
   · Negativas críticas: disciplinas com g.critica = true.
   · Negativas secundárias: disciplinas com g.critica = false.
4. Compara com os limites da regra.
5. Marca a inscrição com tipo = 'aprovado' ou 'reprovado'.

4.2. Proteções (v2)

O JUIZ bloqueia e devolve mensagem clara se:

· As inscrições estiverem abertas.
· A Grelha Curricular estiver vazia.
· Não existirem regras configuradas.
· Houver alunos matricula_paga sem regra para a sua classe/curso.
· Houver alunos matricula_paga sem grelha para a sua classe/curso.
· Ocorrer algum erro SQL (rollback via EXCEPTION).

4.3. Assinatura

```sql
cesc.cesc_aura_julgar(p_token varchar, p_ano_lectivo varchar)
RETURNS json
```

Retorno:

```json
{"ok": true, "total": 34, "aprovados": 26, "reprovados": 8}
```

---

5. A TRANSIÇÃO (cesc_aura_transicao)

5.1. O que faz

1. Percorre todas as inscrições com estado = 'matriculado' e tipo definido (aprovado ou reprovado).
2. Ignora a 9ª e a 12ª (concluem o ciclo, ficam no histórico).
3. Para os restantes:
   · Se tipo = 'reprovado', fica na mesma classe/curso.
   · Se tipo = 'aprovado', sobe de classe (8ª→9ª, 10ª→11ª, 11ª→12ª).
4. Cria uma nova inscrição no novo ano letivo, com estado = 'matricula_paga' e tipo = 'novo'.

5.2. Proteções (v2)

A TRANSIÇÃO bloqueia e devolve mensagem clara se:

· As inscrições estiverem abertas.
· Já existirem inscrições no novo ano letivo (evita duplicação).
· Ocorrer algum erro SQL.

5.3. Assinatura

```sql
cesc.cesc_aura_transicao(
    p_token varchar, 
    p_ano_lectivo_actual varchar, 
    p_novo_ano_lectivo varchar
)
RETURNS json
```

Retorno:

```json
{"ok": true, "total_analisados": 8, "novas_inscricoes_criadas": 6}
```

---

6. O DISTRIBUIDOR (cesc_aura_distribuir)

6.1. O que faz

1. Lê a planta da escola (cesc.alocacao_salas) — atemporal (não filtra por ano).
2. Para cada alocação (ex: Pav 1, Sala 1, 8ª Classe):
   · Procura as inscrições matricula_paga daquela classe/curso no ano letivo atual.
   · Coloca os alunos nas salas correspondentes, respeitando a capacidade.
   · Atribui um número de aluno sequencial (global para a escola).
   · Cria a matrícula se ela não existir.
   · Muda o estado da inscrição para matriculado.

6.2. Proteções (v2)

O DISTRIBUIDOR bloqueia e devolve mensagem clara se:

· As inscrições estiverem abertas.
· Não existirem alocações.
· Houver alunos matricula_paga sem alocação para a sua classe/curso.
· A capacidade das salas for insuficiente (avisa quantos alunos por sala são necessários).
· Ocorrer algum erro SQL (rollback via EXCEPTION e LOCK TABLE para evitar concorrência).

6.3. Assinatura

```sql
cesc.cesc_aura_distribuir(p_token varchar, p_ano_lectivo varchar)
RETURNS json
```

Retorno:

```json
{"ok": true, "distribuidos": 34}
```

---

7. A Grelha Curricular

7.1. Porque é importante

A Grelha Curricular é a fonte de verdade das disciplinas por classe/curso. Ela diz ao JUIZ:

· Quais disciplinas um aluno deve ter naquele ano.
· Quais são críticas (pesam mais na reprovação) e quais são secundárias.

7.2. Exemplo de configuração

· 7ª Classe (Tronco Comum): Matemática (Crítica), Língua Portuguesa (Secundária), História (Secundária), etc.
· 10ª Classe C.F.B: Matemática (Crítica), Biologia (Crítica), Física (Crítica), Química (Crítica), Língua Portuguesa (Secundária), etc.
· 10ª Classe C.E.J: Matemática (Crítica), Direito (Crítica), Economia (Crítica), Língua Portuguesa (Secundária), etc.

---

8. Auditoria de Validação (v2)

O AURA v2 foi validado com 10 alunos de teste:

Aluno Classe Curso Notas Resultado
1 8ª — 8 a Matemática (crítica) Reprovado
2 8ª — 14 a tudo Aprovado
3 9ª — 14 a tudo Aprovado (mas não transita)
4 9ª — 14 a tudo Aprovado (mas não transita)
5 10ª C.F.B 8 a Biologia (crítica) Reprovado
6 10ª C.F.B 14 a tudo Aprovado
7 11ª C.E.J 8 a Direito (crítica) Reprovado
8 11ª C.E.J 14 a tudo Aprovado
9 10ª C.E.J 8 a Economia (crítica) Reprovado
10 10ª C.E.J 14 a tudo Aprovado

Resultado do JUIZ: total: 10, aprovados: 5, reprovados: 5.

Resultado do DISTRIBUIDOR: colocou os alunos com alocação nas salas certas, criou as matrículas e mudou o estado para matriculado. Os alunos sem alocação ficaram pendurados.

Resultado da TRANSIÇÃO: criou 6 novas inscrições no ano seguinte (8ª→9ª, 10ª→11ª, 11ª→12ª e os reprovados na mesma classe), ignorando os 2 da 9ª.

---

9. O que falta implementar

Curto prazo

· Área do Encarregado.

Médio prazo

· Ciclo de vida do aluno (concluído, transferido, desistente).
· Exame Nacional (MFD 50/50 para a 12ª).
· Renovação de matrícula automatizada (a Transição já faz parte, mas falta a interface de confirmação).

Longo prazo

· Algoritmo de distribuição equilibrada (evitar polos).
· Gestão de horários e salas.
· Relatórios e estatísticas no Diretor.

---

10. Riscos conhecidos

1. Se a Grelha Curricular estiver incompleta, o JUIZ bloqueia (proteção aplicada).
2. Se as Regras estiverem incompletas, o JUIZ bloqueia (proteção aplicada).
3. Se as Alocações estiverem incompletas, o DISTRIBUIDOR bloqueia (proteção aplicada).
4. Se a capacidade das salas for insuficiente, o DISTRIBUIDOR bloqueia e avisa (proteção aplicada).

---

11. Contacto

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com

---

Última atualização: 10/11/2026