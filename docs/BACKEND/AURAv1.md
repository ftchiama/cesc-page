AURA — Sistema de Distribuição de Alunos (v1.0)

Autor: Francisco Tchiama
Companhia: TCLabs
Data: 30/10/2026
Versão: 1.0

Este documento descreve a arquitetura, o modelo de dados e o funcionamento do AURA, o algoritmo de distribuição de alunos do Complexo Escolar Santa Catarina (CESC).

---

1. O que é o AURA

O AURA é composto por dois módulos independentes, que trabalham em momentos diferentes do ano letivo:

1. O JUIZ (Fim do Ano) — Lê as notas do professor, aplica as regras de aprovação e marca cada aluno como aprovado ou reprovado.
2. O DISTRIBUIDOR (Início do Ano) — Coloca os alunos nas salas físicas, respeitando a alocação definida pela Secretária e a capacidade das salas.

Princípio fundamental: O AURA não calcula notas. Ele lê o que o professor já lançou e aplica regras configuradas pelo Diretor.

---

2. Fluxo de Trabalho (Ciclo Completo)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DIRETOR define OFERTA LETIVA (salas por curso/turno)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. DIRETOR define REGRAS (negativas críticas e secundárias) │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SECRETÁRIA cria SALAS FÍSICAS (Pav, Sala, Turno, Cap.)  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ALUNOS inscrevem-se e pagam → 'matricula_paga'           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. JUIZ avalia (aprova/reprova) — fim do ano letivo         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. TRANSIÇÃO: aprovados sobem, reprovados repetem, novos    │
│    entram. Cria inscrições para o novo ano.                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. DISTRIBUIDOR coloca alunos nas salas — início do ano     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. RESULTADO: aluno com Classe, Curso, Sala, Pav, Turno,   │
│    Nº de Aluno.                                              │
└─────────────────────────────────────────────────────────────┘
```

---

3. Modelo de Dados

3.1. Tabelas usadas pelo AURA

Tabela Papel na AURA
cesc.alunos Identidade do aluno (BI, nome, dados pessoais). O AURA só lê.
cesc.inscricoes Peça central. Define classe/curso, tipo (novo/aprovado/reprovado) e estado (matricula_paga). O JUIZ escreve o tipo.
cesc.matriculas Peça central. Liga o aluno ao ano letivo, classe, curso, sala (sala_id) e número de aluno (numero_aluno). O DISTRIBUIDOR escreve sala_id e numero_aluno.
cesc.notas_trimestrais O JUIZ lê o mfd de cada disciplina e trimestre.
cesc.regras_aura Regras de aprovação (máximo de negativas críticas e secundárias), por classe/curso.
cesc.salas Salas físicas (pavilhão, turno, capacidade). O DISTRIBUIDOR lê.
cesc.alocacao_salas Alocação definida pela Secretária (ex: Pav 1, Salas 1-3, 10ª CFB, Matinal).
cesc.candidatos Ficha persistente do candidato. A transição lê/escreve.

3.2. Estrutura das tabelas do AURA

cesc.regras_aura

```sql
id uuid PK
ano_lectivo varchar NOT NULL
classe varchar NOT NULL
curso varchar (nullable)
max_negativas_criticas integer DEFAULT 0
max_negativas_secundarias integer DEFAULT 2
tem_exame_nacional boolean DEFAULT false
peso_exame_nacional integer DEFAULT 50
UNIQUE(ano_lectivo, classe, curso)
```

Nota: O JUIZ já não filtra por ano_lectivo — a regra é global por classe/curso. O campo ano_lectivo existe apenas por compatibilidade histórica.

cesc.alocacao_salas

```sql
id uuid PK
ano_lectivo varchar NOT NULL
turno varchar NOT NULL
pavilhao varchar NOT NULL
sala_inicio integer NOT NULL
sala_fim integer NOT NULL
classe varchar NOT NULL
curso varchar (nullable)
UNIQUE(ano_lectivo, turno, pavilhao, sala_inicio, sala_fim, classe, curso)
```

cesc.pagamentos

```sql
id uuid PK
inscricao_id uuid FK
tipo varchar ('inscricao' ou 'matricula')
valor numeric(10,2)
metodo varchar ('GPO')
merchant_transaction_id varchar UNIQUE
referencia_externa varchar
estado varchar ('pendente', 'pago', 'falhado')
resposta_gateway jsonb
criado_em timestamp
pago_em timestamp
```

---

4. O JUIZ (cesc_aura_julgar)

4.1. O que faz

1. Percorre todas as inscrições com estado = 'matricula_paga' e tipo = 'novo' no ano letivo em questão.
2. Para cada aluno, busca a regra correspondente (classe + curso) na tabela cesc.regras_aura.
3. Conta as negativas do aluno (notas com mfd < 10):
   · Negativas críticas: Matemática, Biologia, Química, Física.
   · Negativas secundárias: todas as outras.
4. Compara com os limites da regra.
5. Marca a inscrição com tipo = 'aprovado' ou 'reprovado'.

4.2. Regras de aprovação

Um aluno é aprovado se:

```
neg_criticas <= max_negativas_criticas
E
neg_secundarias <= max_negativas_secundarias
```

Caso contrário, é reprovado.

4.3. Regras configuradas (exemplo)

Classe Curso Máx. Críticas Máx. Secundárias
8ª (nenhum) 0 2
9ª (nenhum) 0 2
10ª C.F.B 0 2
11ª C.F.B 0 2
11ª C.E.J 0 2
12ª C.E.J 0 2

4.4. Assinatura

```sql
cesc.cesc_aura_julgar(p_token varchar, p_ano_lectivo varchar)
RETURNS json
```

Retorno:

```json
{
  "ok": true,
  "total": 34,
  "aprovados": 26,
  "reprovados": 8
}
```

---

5. O DISTRIBUIDOR (cesc_aura_distribuir)

5.1. O que faz

1. Percorre todas as alocações da tabela cesc.alocacao_salas para o ano letivo em questão.
2. Para cada alocação (ex: 10ª C.F.B, Matinal, Pavilhão 3, Salas 1-2):
   · Busca todas as inscrições matricula_paga dessa classe/curso que ainda não têm sala_id.
   · Percorre as salas correspondentes (por nome/número) até encher a capacidade.
   · Atribui sala_id e numero_aluno (sequencial) a cada aluno.

5.2. Regras de distribuição

· Por Classe + Curso: cada aluno é colocado na sala correspondente à sua classe/curso.
· Respeita a capacidade: quando a sala enche, passa para a seguinte.
· Nº de aluno sequencial: 1, 2, 3... por ordem de chegada.
· Sem distinção de tipo: aprovados, reprovados e novos da mesma classe/curso ficam juntos.

5.3. Assinatura

```sql
cesc.cesc_aura_distribuir(p_token varchar, p_ano_lectivo varchar)
RETURNS json
```

Retorno:

```json
{
  "ok": true,
  "distribuidos": 34
}
```

---

6. A Transição (Fim do Ano)

6.1. O que faz

A transição é o processo que cria as inscrições do novo ano letivo. É feita manualmente por SQL (ou, no futuro, por uma RPC dedicada).

Para cada aluno de 2026/2027:

· Se aprovado: cria inscrição em 2027/2028 com a classe seguinte (8ª→9ª, 9ª→10ª com curso C.F.B, 10ª→11ª, 11ª→12ª).
· Se reprovado: cria inscrição em 2027/2028 com a mesma classe.
· Alunos novos: cria inscrição em 2027/2028 com a classe/curso que escolheram.

6.2. Regras de transição

Classe atual Aprovado → Reprovado →
8ª 9ª 8ª
9ª 10ª C.F.B 9ª
10ª C.F.B 11ª C.F.B 10ª C.F.B
11ª C.E.J 12ª C.E.J 11ª C.E.J

Nota: A transição da 9ª para a 10ª atribui o curso C.F.B por defeito. No futuro, a Secretária poderá escolher o curso de cada aluno.

---

7. Alocação de Salas (Secretária)

7.1. Estrutura da alocação

A Secretária define, por exemplo:

· 2027/2028, Matinal, Pavilhão 1, Sala 1 → 8ª Classe.
· 2027/2028, Matinal, Pavilhão 2, Sala 1 → 9ª Classe.
· 2027/2028, Vespertino, Pavilhão 3, Salas 1-2 → 10ª Classe C.F.B.
· 2027/2028, Vespertino, Pavilhão 3, Salas 3-4 → 11ª Classe C.F.B.
· 2027/2028, Vespertino, Pavilhão 3, Sala 5 → 11ª Classe C.E.J.
· 2027/2028, Vespertino, Pavilhão 3, Sala 6 → 12ª Classe C.E.J.

7.2. RPC para definir alocação

```sql
cesc.cesc_definir_alocacao(
  p_token varchar,
  p_ano_lectivo varchar,
  p_turno varchar,
  p_pavilhao varchar,
  p_sala_inicio int,
  p_sala_fim int,
  p_classe varchar,
  p_curso varchar
)
RETURNS json
```

---

8. Estrutura de Salas (8 salas + 2 reserva)

# Pavilhão Sala Turno Capacidade
1 Pavilhão 1 Sala 1 Matinal 40
2 Pavilhão 2 Sala 1 Matinal 40
3 Pavilhão 3 Sala 1 Vespertino 40
4 Pavilhão 3 Sala 2 Vespertino 40
5 Pavilhão 3 Sala 3 Vespertino 40
6 Pavilhão 3 Sala 4 Vespertino 40
7 Pavilhão 3 Sala 5 Vespertino 40
8 Pavilhão 3 Sala 6 Vespertino 40
9 Pavilhão 4 Sala 1 Matinal 40 (reserva)
10 Pavilhão 4 Sala 2 Matinal 40 (reserva)

---

9. Resultados da Auditoria (v1.0)

O AURA foi submetido a uma auditoria completa, aluno a aluno, em dois anos letivos consecutivos:

9.1. 2026/2027 (24 alunos)

Classe Curso Aprovados Reprovados Total Com Sala
8ª — 4 2 6 6
9ª — 4 2 6 6
10ª C.F.B 4 2 6 6
11ª C.E.J 4 2 6 6
Total  16 8 24 24

JUIZ: aprovados: 16, reprovados: 8.
DISTRIBUIDOR: distribuidos: 24.

9.2. 2027/2028 (34 alunos, após transição)

Classe Curso Aprovados Reprovados Total Com Sala
8ª — 2+2 2 6 6
9ª — 4+2 2 8 8
10ª C.F.B 8 2 12 12
11ª C.F.B 4 2 6 6
11ª C.E.J 4 2 6 6
12ª C.E.J 4+2 0 6 6
Total  26 8 34 34

JUIZ: aprovados: 26, reprovados: 8.
DISTRIBUIDOR: distribuidos: 34.

9.3. Verificação final

· Todos os 58 alunos (24 de 2026/2027 + 34 de 2027/2028) têm sala e número de aluno.
· Nenhum aluno foi esquecido.
· Nenhum erro de veredito: todos os registos dizem OK: aprovado ou OK: reprovado.
· Transição correta: aprovados subiram de classe, reprovados repetiram, novos entraram.

Conclusão: O motor da AURA está 100% validado.

---

10. O que falta implementar

10.1. Curto prazo

· Frontend do AURA — interface para o Diretor/Secretária:
  · Ver e editar as regras de aprovação.
  · Ver e editar a alocação de salas.
  · Executar o JUIZ e o DISTRIBUIDOR com um clique.
  · Ver os resultados (alunos com sala, número, etc.).

10.2. Médio prazo

· Renovação de Matrícula — automatizar a transição entre anos letivos (hoje feita por SQL manual).
· Exame Nacional — cálculo do MFD com o peso do exame (50/50) para a 12ª classe.
· Atribuição de Professores — associar professores às turmas (disciplina + sala + turno).

10.3. Longo prazo

· Algoritmo de distribuição equilibrada — evitar polos (turmas com mais alunos que outras).
· Gestão de horários e salas — evitar conflitos de horário.
· Relatórios e estatísticas — dashboards para o Diretor.

---

11. Riscos conhecidos

1. Sem regra, o JUIZ reprova automaticamente. Se uma classe/curso não tem regra, o aluno é reprovado sem base pedagógica.
2. Transição manual. Hoje é feita por SQL. Se houver erro humano, alunos podem ser esquecidos ou duplicados.
3. Distribuição sequencial. Os alunos são distribuídos por ordem alfabética. Não há balanceamento de género ou desempenho.
4. Sem exame nacional. O MFD não considera o exame (50/50), o que é obrigatório para a 12ª classe.
5. Sem atribuição de professores. O AURA distribui alunos, mas não atribui professores às turmas.

---

12. Contacto

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com

---

Última atualização: 30/10/2026
