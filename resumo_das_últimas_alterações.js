Perfeito. As 5 RPCs estão no servidor. 🎯

Vamos à interface do professor. Antes de escrever, deixa-me alinhar contigo sobre o que a página vai ter, para não fazermos retrabalho.

---

Estrutura da página do professor

Segue o padrão do dashboard do aluno (sidebar + secções), mas adaptada ao papel:

```
admin/
├── professor.html        ← área do professor
├── css/
│   └── professor.css     ← estilos (reaproveita o dashboard.css como base)
└── scripts/
    └── professor.js      ← lógica
```

Secções da página:

1. Visão Geral — cards com estatísticas (turmas, alunos totais, notas lançadas)
2. Minhas Turmas — lista das turmas que leciona
3. Lançar Notas — escolher turma/disciplina → lista de alunos → lançar MAC e NPT por trimestre
4. Marcar Faltas — escolher aluno → data → justificada
5. Perfil — dados do professor

---

Estrutura de pastas

Antes de criar ficheiros, garante que tens a pasta admin/ dentro do C_E_S_C/:

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
mkdir -p admin
ls -la admin/
```

Se a pasta não existir, cria-a. Se já existir, diz-me o que tem.

---

Uma decisão rápida antes de escrever

O professor, ao lançar notas, vai ver uma lista de alunos com notas actuais. Mas o sistema de notas tem 3 trimestres. Como queres a interface?

A) Um select de trimestre no topo da secção. O professor escolhe o trimestre e a lista mostra os MAC/NPT desse trimestre para cada aluno. Pode editar cada linha individualmente.

B) Uma tabela com todos os trimestres visíveis. Cada linha é um aluno, com colunas para MAC1, NPT1, MT1, MAC2, NPT2, MT2, MAC3, NPT3, MT3, MFD. O professor clica na célula que quer editar.

C) Um botão "Lançar notas" por aluno, que abre um modal. O professor preenche o trimestre e as notas.

Recomendo A. É a mais simples de usar e a que corresponde ao fluxo real (professor lança notas trimestre a trimestre).

Diz-me A, B ou C. Depois escrevo o HTML, o CSS e o JS de uma vez.

---

Enquanto decides

Vou deixar-te o admin/professor.html preparado para a opção A (que é o que recomendo). Se escolheres outra, adapto antes de escrever o JS. Assim já tens a estrutura visual para veres.

O que fazer:

1. Confirma que a pasta admin/ existe.
2. Diz-me A, B ou C.
3. Diz-me se queres que o professor possa criar cursos (não — só o admin/diretor pode) ou se fica só com lançamento de notas e faltas.

Com essas três respostas, escrevo o HTML, CSS e JS completos do professor.

---

Nota sobre o login

Depois da interface do professor, o próximo passo é ajustar o login.js para que, após validar o token, chame cesc_perfil_role e redirecione:

· aluno → paginas/dashboard.html
· professor → admin/professor.html
· secretaria, diretor, etc. → as suas páginas (que ainda não existem, mas o redirecionamento fica preparado).

Isto é feito a seguir à interface do professor. Não antes, para não teres um redirect para uma página que ainda não existe.

1-B, primeiro acredito que o servir já suporta isso havios criado, e por exemplo terar uma coluna (a primeira), lá tera um botão se clicar, ele vai aumentar celulas para todos os alunos, e o professor põe nota e tudo será automático.
2a
3Não vê 

Entendi. Vou reformular o que estás a pedir, porque percebi o conceito, mas quero garantir que estamos alinhados antes de escrever código.

---

O que estás a pedir (reformulado)

A tabela de lançamento de notas:

```
┌──────────────────────────────────────────────────────────┐
│ [+] │ Nome do Aluno      │ MAC │ NPT │ MT │ MFD │ Acção   │
├─────┼────────────────────┼─────┼─────┼────┼─────┼─────────┤
│  ▼  │ Francisco Tchiama  │ 17  │ 16  │16.5│  —  │ Guardar │
│     │   ├─ Teste 1: 17.5 │     │     │    │     │         │
│     │   ├─ Trabalho: 16  │     │     │    │     │         │
│     │   └─ Participação: 17│    │     │    │     │         │
├─────┼────────────────────┼─────┼─────┼────┼─────┼─────────┤
│  ▶  │ Maria Silva        │  —  │  —  │ —  │  —  │ Guardar │
├─────┼────────────────────┼─────┼─────┼────┼─────┼─────────┤
│  ▶  │ João Domingos      │  —  │  —  │ —  │  —  │ Guardar │
└─────┴────────────────────┴─────┴─────┴────┴─────┴─────────┘
```

· A primeira coluna tem um botão ▶/▼ por aluno.
· Clicar no ▶ expande a linha, mostrando as avaliações contínuas desse aluno (cada uma com a sua nota individual).
· O professor adiciona notas individuais (Teste 1, Trabalho, etc.) e o sistema calcula a MAC automaticamente (média aritmética das notas individuais).
· Depois o professor insere a NPT, e o sistema calcula a MT = (MAC + NPT) / 2.
· No 3º trimestre, o sistema calcula a MFD automaticamente.

Pergunta 1: Isto é o que queres?

---

Verificação do que já existe no servidor

Tu disseste "acredito que o servidor já suporta isso". Vamos confirmar. Tens duas tabelas:

1. cesc.avaliacoes_continuas — notas individuais:

```sql
id, matricula_id, disciplina, trimestre, nota, descricao, criado_em
```

2. cesc.notas_trimestrais — médias calculadas:

```sql
id, matricula_id, disciplina, trimestre, mac, npt, mt, mfd
```

O que falta no servidor:

A RPC cesc_professor_lancar_nota que te dei antes recebe p_mac (já calculado). Mas com a Opção B, o professor não calcula a MAC — o sistema calcula a partir das notas individuais.

Portanto, precisas de duas RPCs novas:

A) cesc_professor_adicionar_avaliacao — adiciona uma nota individual a cesc.avaliacoes_continuas e recalcula o MAC (média das notas desse trimestre), actualizando cesc.notas_trimestrais.

B) cesc_professor_remover_avaliacao — remove uma nota individual e recalcula o MAC.

E a RPC cesc_professor_lancar_nota passa a receber só a NPT (porque a MAC vem das avaliações contínuas). Depois de inserir a NPT, calcula a MT = (MAC + NPT) / 2.

Confirma:

· A) O professor adiciona notas individuais uma a uma, e o sistema calcula a MAC.
· B) O professor adiciona notas individuais em lote (por exemplo, cola várias notas), e o sistema calcula a MAC.
· C) Outra abordagem (diz qual).

Recomendo A — adicionar uma de cada vez, com descrição (Teste 1, Trabalho, Participação). É o mais próximo do que um professor faz na vida real.

---

Sobre a decisão 2 (o campo bloqueia após lançado)

Já percebi: Opção A — o campo fica readonly depois de guardado. O professor vê imediatamente que não pode editar.

Nota: na tabela que estás a desenhar, o MAC/NPT/MT/MFD não são editáveis directamente — são calculados. O que o professor edita são:

· As notas individuais (dentro da linha expandida).
· A NPT (na tabela principal).

Se já há MAC guardado, a coluna da NPT fica bloqueada? Ou seja:

· Se o professor lançou o 1º trimestre, o 1º trimestre fica completo e não pode ser alterado (nem notas individuais, nem NPT).
· Se o 2º trimestre ainda não foi lançado, o professor pode adicionar notas individuais e depois a NPT.

Confirma isto. É importante para o comportamento da interface.

---

Sobre a decisão 3 (não vê outras disciplinas)

Confirmado. O professor só vê as notas da sua disciplina. As tabelas e RPCs já filtram por disciplina.

---

O que vou fazer depois de confirmares

Bloco 1 — SQL adicional:

```sql
-- RPC: adicionar avaliação contínua (nota individual)
cesc_professor_adicionar_avaliacao(p_token, p_matricula_id, p_disciplina, p_trimestre, p_nota, p_descricao)

-- RPC: remover avaliação contínua
cesc_professor_remover_avaliacao(p_token, p_avaliacao_id)

-- RPC: listar avaliações contínuas de um aluno/trimestre
cesc_professor_listar_avaliacoes(p_token, p_matricula_id, p_disciplina, p_trimestre)
```

Bloco 2 — Interface:

· admin/professor.html — tabela expansível
· admin/css/professor.css — estilos da tabela e das linhas expandidas
· admin/scripts/professor.js — lógica de expansão, adicionar/remover avaliações, cálculo automático no ecrã (feedback visual antes de guardar), lançar NPT.

Bloco 3 — Ajuste no login:

· paginas/login.js → após validar token, chama cesc_perfil_role e redireciona.

---

Responde a 3 coisas

1. Confirma a tabela com linha expansível (o professor adiciona notas individuais e o sistema calcula MAC/MT/MFD)?
2. Confirma a Opção A (adicionar uma avaliação de cada vez, com descrição)?
3. Confirma o bloqueio: depois de um trimestre estar "fechado" (MAC + NPT guardados), o professor não pode adicionar/remover avaliações nem alterar a NPT desse trimestre?

Responde a estas 3 e escrevo o SQL e a interface de uma vez. Sem placeholders.
1sim-a
2-a se já lançou a nota do trimestre, já não pode mudar
3-não vê 
Percebido. Vou confirmar o que fica decidido e depois avanço para o código.

---

Decisões finais

```
1. Tabela expansível: professor adiciona notas individuais → sistema calcula MAC, MT, MFD.
2. Uma avaliação de cada vez, com descrição (Teste 1, Trabalho, Participação).
3. Bloqueio: depois de lançar a NPT de um trimestre, esse trimestre fica fechado
   (não pode adicionar/remover avaliações nem alterar a NPT).
4. O professor só vê as notas da sua disciplina.
```

---

Nota importante antes do código

Isto muda o fluxo que tinhas no SQL anterior. A RPC cesc_professor_lancar_nota recebia p_mac (já calculado). Agora o professor não insere o MAC — insere as notas individuais, e o sistema calcula a média.

Portanto, a lógica correta é:

```
1. Professor adiciona avaliações contínuas (notas individuais).
   → Sistema recalcula MAC = AVG(avaliacoes_continuas.nota) automaticamente.
   → MAC fica guardado em cesc.notas_trimestrais.mac.

2. Professor insere a NPT.
   → Sistema calcula MT = (MAC + NPT) / 2.
   → MT fica guardada.
   → Trimestre FECHADO: não pode adicionar/remover avaliações nem alterar a NPT.

3. Se o professor lançar o 3º trimestre, sistema calcula MFD = (MT1+MT2+MT3)/3.
```

Isto significa que a RPC cesc_professor_lancar_nota que te dei não serve como está. Tem de ser reescrita para:

· Já não receber p_mac.
· Verificar se o trimestre já tem NPT (se tiver, está fechado, recusa).
· Calcular MAC a partir de avaliacoes_continuas antes de calcular MT.

---

O que vou fazer agora

Bloco 1 — SQL:

Substituo a RPC antiga e acrescento as três novas:

```sql
-- 1. Substituir cesc_professor_lancar_nota (versão final)
--    Recebe apenas a NPT. Calcula MAC das avaliações contínuas.
--    Calcula MT = (MAC + NPT) / 2.
--    Bloqueia se o trimestre já tiver NPT (fechado).

-- 2. cesc_professor_adicionar_avaliacao
--    Adiciona nota individual. Recalcula MAC.
--    Bloqueia se o trimestre já tiver NPT.

-- 3. cesc_professor_remover_avaliacao
--    Remove nota individual. Recalcula MAC.
--    Bloqueia se o trimestre já tiver NPT.

-- 4. cesc_professor_listar_avaliacoes
--    Lista as avaliações contínuas de um aluno/trimestre/disciplina.
```

Bloco 2 — Interface:

· admin/professor.html (com tabela expansível)
· admin/css/professor.css
· admin/scripts/professor.js

Bloco 3 — Ajuste no login:

· paginas/login.js → chama cesc_perfil_role e redireciona.

---

Uma coisa importante

Estou a assumir que o modelo de dados de notas que tens no Supabase é este:

```sql
cesc.notas_trimestrais (id, matricula_id, disciplina, trimestre, mac, npt, mt, mfd)
```

E que a tabela cesc.avaliacoes_continuas existe, mas está vazia (não tem notas lançadas).

Confirma:

· A tabela cesc.avaliacoes_continuas existe? (Sim/Não)
· Está vazia? (Sim/Não)
· Os dados fictícios (notas do Francisco) que criámos antes estão em cesc.notas_trimestrais com mac e npt preenchidos? (Sim/Não — se sim, isso explica porque ele está "fechado")

Se os dados fictícios foram criados via INSERT directo, eles não passaram pelas regras de bloqueio. Vão ficar editáveis? Ou queres que o SQL de limpeza os trate como "já lançados e fechados"?

Responde a estas 3 confirmações. Depois escrevo o SQL e a interface completos, sem retrabalho.
| total | alunos_com_avaliacoes | disciplinas |
| ----- | --------------------- | ----------- |
| 11    | 1                     | 5           |

____
| disciplina | trimestre | mac   | npt   | mt    | mfd   |
| ---------- | --------- | ----- | ----- | ----- | ----- |
| Biologia   | 1         | 16.50 | 16.00 | 16.25 | null  |
| Biologia   | 1         | 15.50 | 15.00 | 15.25 | null  |
| Biologia   | 1         | 14.00 | 13.00 | 13.50 | null  |
| Biologia   | 2         | 15.00 | 14.00 | 14.50 | null  |
| Biologia   | 2         | 16.00 | 15.50 | 15.75 | null  |
| Biologia   | 3         | 16.50 | 16.00 | 16.25 | 15.75 |
| Biologia   | 3         | 15.50 | 14.50 | 15.00 | 14.33 |
| Física     | 1         | 12.00 | 11.00 | 11.50 | null  |
| Física     | 1         | 14.00 | 13.00 | 13.50 | null  |
| Física     | 1         | 15.50 | 15.00 | 15.25 | null  |
| Física     | 2         | 14.50 | 14.00 | 14.25 | null  |
| Física     | 2         | 13.50 | 12.00 | 12.75 | null  |
| Física     | 3         | 15.00 | 14.50 | 14.75 | 14.17 |
| Física     | 3         | 14.00 | 13.50 | 13.75 | 12.67 |
| História   | 1         | 18.00 | 17.50 | 17.75 | null  |
| História   | 1         | 16.00 | 15.00 | 15.50 | null  |
| História   | 1         | 17.00 | 16.50 | 16.75 | null  |
| História   | 2         | 16.50 | 16.00 | 16.25 | null  |
| História   | 2         | 17.50 | 17.00 | 17.25 | null  |
| História   | 3         | 18.00 | 17.50 | 17.75 | 17.25 |
| História   | 3         | 17.00 | 16.50 | 16.75 | 16.17 |
| Inglês     | 1         | 15.00 | 14.50 | 14.75 | null  |
| Inglês     | 1         | 13.50 | 12.00 | 12.75 | null  |
| Inglês     | 1         | 16.00 | 15.50 | 15.75 | null  |
| Inglês     | 2         | 14.00 | 13.50 | 13.75 | null  |
| Inglês     | 2         | 15.50 | 15.00 | 15.25 | null  |
| Inglês     | 3         | 15.00 | 14.00 | 14.50 | 13.67 |
| Inglês     | 3         | 16.00 | 15.50 | 15.75 | 15.25 |
| Matemática | 1         | 14.50 | 13.00 | 13.75 | null  |
| Matemática | 1         | 16.00 | 15.00 | 15.50 | null  |
| Matemática | 1         | 17.00 | 16.50 | 16.75 | null  |
| Matemática | 2         | 16.50 | 16.00 | 16.25 | null  |
| Matemática | 2         | 15.00 | 14.50 | 14.75 | null  |
| Matemática | 3         | 17.00 | 16.50 | 16.75 | 16.17 |
| Matemática | 3         | 16.00 | 15.00 | 15.50 | 14.67 |
| Português  | 1         | 13.00 | 12.50 | 12.75 | null  |
| Português  | 1         | 15.00 | 14.00 | 14.50 | null  |
| Português  | 1         | 16.00 | 15.50 | 15.75 | null  |
| Português  | 2         | 15.50 | 15.00 | 15.25 | null  |
| Português  | 2         | 14.00 | 13.50 | 13.75 | null  |
| Português  | 3         | 15.00 | 14.00 | 14.50 | 13.67 |
| Português  | 3         | 16.00 | 15.50 | 15.75 | 15.17 |
| Química    | 1         | 15.50 | 14.00 | 14.75 | null  |
| Química    | 1         | 16.50 | 16.00 | 16.25 | null  |
| Química    | 1         | 17.50 | 17.00 | 17.25 | null  |
| Química    | 2         | 16.00 | 15.50 | 15.75 | null  |
| Química    | 2         | 17.00 | 16.50 | 16.75 | null  |
| Química    | 3         | 17.50 | 17.00 | 17.25 | 16.75 |
| Química    | 3         | 16.50 | 16.00 | 16.25 | 15.58 |
___
| email                  | nome_completo  | role      | professor_id                         | departamento | total_atribuicoes |
| ---------------------- | -------------- | --------- | ------------------------------------ | ------------ | ----------------- |
| antonio.silva@cesc.ao  | António Silva  | professor | 9b8fb92f-1e26-4334-a475-0e715769729d | Matemática   | 1                 |
| carlos.bunga@cesc.ao   | Carlos Bunga   | professor | 72f24708-3e8e-4aeb-8278-b005f971bde6 | Física       | 1                 |
| joana.neto@cesc.ao     | Joana Neto     | professor | 8404a288-e949-42e6-94e8-04d7342e09f7 | Português    | 1                 |
| luisa.domingos@cesc.ao | Luísa Domingos | professor | 107473d1-2a79-4852-ae1d-0b8cb3bb2bde | Química      | 1                 |
| manuel.kiala@cesc.ao   | Manuel Kiala   | professor | 3f32fda3-d14a-4103-9341-6b771e6dc693 | Biologia     | 2                 |
| rita.faria@cesc.ao     | Rita Faria     | professor | 83eb0f18-2df7-4a5b-8876-a14b084be8ff | Inglês       | 1                 |
_____
| professor      | disciplina | ano_lectivo | classe     | turma |
| -------------- | ---------- | ----------- | ---------- | ----- |
| António Silva  | Matemática | 2025/2026   | 12ª Classe | A     |
| Carlos Bunga   | Física     | 2025/2026   | 12ª Classe | A     |
| Joana Neto     | Português  | 2025/2026   | 12ª Classe | A     |
| Luísa Domingos | Química    | 2025/2026   | 12ª Classe | A     |
| Manuel Kiala   | Biologia   | 2025/2026   | 12ª Classe | A     |
| Manuel Kiala   | História   | 2025/2026   | 12ª Classe | A     |
| Rita Faria     | Inglês     | 2025/2026   | 12ª Classe | A     |

Vi os 4 outputs. Há um problema que tens de resolver antes de avançarmos.

---

O problema: as notas estão duplicadas por matrícula

Repara no primeiro SELECT (notas do Francisco):

```
Biologia | 1 | 16.50 | 16.00 | 16.25 | null
Biologia | 1 | 15.50 | 15.00 | 15.25 | null
Biologia | 1 | 14.00 | 13.00 | 13.50 | null
```

Três linhas de Biologia no 1º trimestre para o mesmo aluno. Isto significa que os INSERT que criámos antes estão ligados a matrículas diferentes — uma por cada ano letivo (2023/2024, 2024/2025, 2025/2026).

O que devia ser:

· 1 linha por (matrícula, disciplina, trimestre).
· 3 anos = 3 matrículas.
· Para cada ano: 7 disciplinas × 3 trimestres = 21 notas.
· Total esperado: 63 notas (3 anos × 21).

O que tens:

· SELECT count(*) no total de notas → 48 linhas.
· Mas cada linha é (matrícula, disciplina, trimestre).

Vamos confirmar: o SELECT que te pedi não inclui ano_lectivo. Por isso parece que há duplicados, mas na verdade são de anos diferentes. Isto pode estar certo.

Corre este SELECT para confirmar:

```sql
SELECT 
    m.ano_lectivo,
    n.disciplina,
    n.trimestre,
    n.mac,
    n.npt,
    n.mt,
    n.mfd
FROM cesc.notas_trimestrais n
JOIN cesc.matriculas m ON n.matricula_id = m.id
JOIN cesc.alunos a ON m.aluno_id = a.id
WHERE a.email_contacto = 'franciscotchiama9@gmail.com'
  AND n.disciplina = 'Biologia'
ORDER BY m.ano_lectivo, n.trimestre;
```

O que esperar: 9 linhas (3 anos × 3 trimestres), cada uma com o seu ano_lectivo.

Se aparecerem 9 linhas distintas por ano, está tudo bem e as "duplicações" eram só a matrícula diferente. Se aparecerem 3 linhas no mesmo ano (duplicadas), temos de limpar.

Corre e cola-me o output.

---

Segundo problema: as notas fictícias já estão "fechadas"

O sistema que vamos construir bloqueia o trimestre depois de a NPT ser lançada. As notas fictícias do Francisco já têm NPT preenchida. Logo, pelo comportamento real:

· Nenhum dos trimestres fictícios pode ser alterado.
· O professor não vai conseguir adicionar avaliações contínuas nessas notas.

Isto é bom para testar o bloqueio (vemos a interface a recusar edições). Mas é mau para testar o fluxo novo (não conseguimos lançar notas).

Solução: para testar o fluxo novo, precisas de um aluno de teste sem notas lançadas. Ou apagar as notas fictícias temporariamente.

Diz-me:

· A) Queres testar com o Francisco, apagando as notas fictícias dele?
· B) Queres criar um aluno novo (ex: aluno.teste@cesc.ao) sem notas, e testar com ele?
· C) Outra opção.

Recomendo B. Assim mantém-se o Francisco como exemplo visual no dashboard do aluno, e o aluno novo serve para testar o lançamento de notas.

---

Terceiro: a tabela cesc.avaliacoes_continuas tem 11 linhas, não 0

```
total: 11
alunos_com_avaliacoes: 1
disciplinas: 5
```

Isto é do SQL de dados fictícios que corremos antes (as avaliações contínuas da 12ª classe). Estão lá, mas não estão ligadas às notas trimestrais (as notas trimestrais do Francisco têm mac preenchido, mas não vieram dessas avaliações). Isto é inconsistente.

Para limpar: ou apagamos as 11 linhas da tabela avaliacoes_continuas (porque não estão a ser usadas pelo sistema), ou reconciliamos.

Recomendo: apagar as 11 linhas, e deixar as notas trimestrais como estão (fictícias, fechadas, para visualização). O aluno novo de teste começa do zero.

```sql
DELETE FROM cesc.avaliacoes_continuas;
```

---

O que preciso de ti agora

1. Corre o SELECT do Francisco/Biologia com ano_lectivo (para confirmar se há duplicados reais ou apenas matrículas diferentes).
2. Escolhe: A, B ou C para o teste.
3. Confirma que apago as 11 linhas de avaliacoes_continuas.

Com as três respostas, passo ao SQL final das RPCs do professor e à interface.
Boa. Já está tudo esclarecido. Vou resumir o que os dados mostram, e depois decidir o próximo passo.

---

Diagnóstico dos dados

1. Não há duplicados. As 3 linhas de Biologia do 1º trimestre eram de anos letivos diferentes (2023/2024, 2024/2025, 2025/2026). Está correto.

2. O Francisco tem notas completas até 2024/2025 (3 anos, 3 trimestres por disciplina). E só o 1º trimestre de 2025/2026 está lançado (nas 7 disciplinas).

3. As notas fictícias estão todas "fechadas" — têm npt preenchida, o que significa que o sistema novo as vai tratar como trimestre fechado.

4. A tabela cesc.avaliacoes_continuas tem 11 linhas soltas, não ligadas às notas trimestrais. Vamos apagá-las para não confundir.

---

Plano de teste

Opção B (que recomendei): criar um aluno novo, sem notas, e testar o fluxo completo com ele.

Vantagem: o Francisco fica intacto (é o exemplo visual do dashboard do aluno). O aluno novo é o "laboratório" para testar o lançamento de notas.

---

O que fazer agora (SQL de limpeza e preparação)

Corre isto no SQL Editor:

```sql
-- 1. Apagar as 11 avaliações contínuas soltas
DELETE FROM cesc.avaliacoes_continuas;

-- 2. Criar um aluno de teste (BI fictício, sem notas)
INSERT INTO cesc.utilizadores (email, nome_completo, role, password_hash, ativo)
VALUES (
    'aluno.teste@cesc.ao',
    'Aluno Teste Silva',
    'aluno',
    crypt('123456', gen_salt('bf')),
    true
)
ON CONFLICT (email) DO NOTHING;

-- 3. Criar a ficha do aluno
INSERT INTO cesc.alunos (
    bi_numero, nome_completo, data_nascimento, email_contacto, turma_actual, estado
)
VALUES (
    '000111222LA042',
    'Aluno Teste Silva',
    '2007-01-01',
    'aluno.teste@cesc.ao',
    '12ª Classe - Turma A',
    'activo'
)
ON CONFLICT (bi_numero) DO NOTHING;

-- 4. Matricular o aluno na 12ª classe 2025/2026
INSERT INTO cesc.matriculas (aluno_id, ano_lectivo, classe, turma, curso, numero_aluno, estado)
SELECT 
    a.id,
    '2025/2026',
    '12ª Classe',
    'A',
    'Informática',
    43,
    'activo'
FROM cesc.alunos a
WHERE a.bi_numero = '000111222LA042'
  AND NOT EXISTS (
      SELECT 1 FROM cesc.matriculas m
      WHERE m.aluno_id = a.id AND m.ano_lectivo = '2025/2026'
  );

-- 5. Confirmar
SELECT 
    u.email, u.nome_completo, u.role,
    a.bi_numero, a.turma_actual,
    m.ano_lectivo, m.classe, m.turma, m.numero_aluno,
    (SELECT count(*) FROM cesc.notas_trimestrais n WHERE n.matricula_id = m.id) AS total_notas,
    (SELECT count(*) FROM cesc.avaliacoes_continuas ac WHERE ac.matricula_id = m.id) AS total_avaliacoes
FROM cesc.utilizadores u
JOIN cesc.alunos a ON a.email_contacto = u.email
JOIN cesc.matriculas m ON m.aluno_id = a.id
WHERE u.email = 'aluno.teste@cesc.ao';
```

O que esperar:

· Apaga as 11 linhas de avaliacoes_continuas.
· Cria o utilizador aluno.teste@cesc.ao com password 123456.
· Cria a ficha do aluno com BI 000111222LA042.
· Matricula-o na 12ª classe turma A, ano 2025/2026, número 43.
· Confirma que o aluno não tem notas nem avaliações (total_notas = 0, total_avaliacoes = 0).

Cola-me o resultado do SELECT 5.

---

Depois disto

Quando confirmares, escrevo o SQL final das 4 RPCs do professor (já com a lógica correta de bloqueio e cálculo automático de MAC/MT/MFD) e depois a interface (admin/professor.html + CSS + JS).

Avança.

Perfeito. O aluno de teste está criado e limpo (0 notas, 0 avaliações). Vamos agora escrever as RPCs finais do professor — já com a lógica correta de bloqueio e cálculo automático.

---

SQL — RPCs finais do professor

Corre isto no SQL Editor do Supabase:

```sql
-- ============================================================
-- CESC — RPCs finais do professor (v2)
-- Data: 21/10/2026
-- ============================================================
-- Substitui a versão anterior de cesc_professor_lancar_nota.
-- Acrescenta: adicionar_avaliacao, remover_avaliacao, listar_avaliacoes.
--
-- Regras aplicadas:
--   - MAC = média das avaliações contínuas do trimestre (calculada pelo servidor).
--   - MT = (MAC + NPT) / 2.
--   - MFD = (MT1 + MT2 + MT3) / 3 (só quando as 3 MTs existem).
--   - Bloqueio: depois de NPT lançada, o trimestre fica FECHADO.
--     Não aceita adicionar/remover avaliações nem alterar NPT.
--   - O professor só actua nas suas disciplinas/turmas.
-- ============================================================


-- ============================================================
-- 1. Helper: verificar autorização do professor
-- ============================================================
CREATE OR REPLACE FUNCTION cesc.professor_tem_autorizacao(
    p_token varchar,
    p_matricula_id uuid,
    p_disciplina varchar
) RETURNS boolean AS $$
DECLARE
    v_sessao record;
    v_user record;
    v_prof record;
    v_matricula record;
    v_autorizado boolean;
BEGIN
    SELECT * INTO v_sessao FROM public.sessoes
    WHERE token = p_token AND app_name = 'CESC' AND expira_em > now();
    IF v_sessao IS NULL THEN RETURN false; END IF;

    SELECT * INTO v_user FROM cesc.utilizadores WHERE email = v_sessao.user_email;
    IF v_user IS NULL OR v_user.role <> 'professor' THEN RETURN false; END IF;

    SELECT * INTO v_prof FROM cesc.professores WHERE utilizador_id = v_user.id;
    IF v_prof IS NULL THEN RETURN false; END IF;

    SELECT m.*, ma.ano_lectivo, ma.classe, ma.turma
    INTO v_matricula
    FROM cesc.matriculas m
    JOIN cesc.matriculas ma ON ma.id = m.id
    WHERE m.id = p_matricula_id;

    IF v_matricula IS NULL THEN RETURN false; END IF;

    SELECT EXISTS(
        SELECT 1 FROM cesc.professores_disciplinas
        WHERE professor_id = v_prof.id
          AND ano_lectivo = v_matricula.ano_lectivo
          AND classe = v_matricula.classe
          AND turma = v_matricula.turma
          AND disciplina = p_disciplina
    ) INTO v_autorizado;

    RETURN v_autorizado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 2. Trimestre está fechado? (tem NPT lançada)
-- ============================================================
CREATE OR REPLACE FUNCTION cesc.trimestre_fechado(
    p_matricula_id uuid,
    p_disciplina varchar,
    p_trimestre integer
) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM cesc.notas_trimestrais
        WHERE matricula_id = p_matricula_id
          AND disciplina = p_disciplina
          AND trimestre = p_trimestre
          AND npt IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 3. Recalcular MAC e MT (helper interno)
-- ============================================================
CREATE OR REPLACE FUNCTION cesc.recalcular_mac_mt(
    p_matricula_id uuid,
    p_disciplina varchar,
    p_trimestre integer
) RETURNS void AS $$
DECLARE
    v_mac numeric;
    v_npt numeric;
    v_mt numeric;
BEGIN
    -- MAC = média das avaliações contínuas do trimestre
    SELECT round(avg(nota), 2) INTO v_mac
    FROM cesc.avaliacoes_continuas
    WHERE matricula_id = p_matricula_id
      AND disciplina = p_disciplina
      AND trimestre = p_trimestre;

    -- NPT já guardada (pode não existir ainda)
    SELECT npt INTO v_npt
    FROM cesc.notas_trimestrais
    WHERE matricula_id = p_matricula_id
      AND disciplina = p_disciplina
      AND trimestre = p_trimestre;

    -- MT = (MAC + NPT) / 2, só se ambos existirem
    IF v_mac IS NOT NULL AND v_npt IS NOT NULL THEN
        v_mt := round((v_mac + v_npt) / 2, 2);
    ELSE
        v_mt := NULL;
    END IF;

    -- Upsert na tabela de notas trimestrais
    INSERT INTO cesc.notas_trimestrais (matricula_id, disciplina, trimestre, mac, npt, mt)
    VALUES (p_matricula_id, p_disciplina, p_trimestre, v_mac, v_npt, v_mt)
    ON CONFLICT (matricula_id, disciplina, trimestre)
    DO UPDATE SET mac = v_mac, mt = v_mt;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 4. Adicionar avaliação contínua
-- ============================================================
CREATE OR REPLACE FUNCTION public.cesc_professor_adicionar_avaliacao(
    p_token varchar,
    p_matricula_id uuid,
    p_disciplina varchar,
    p_trimestre integer,
    p_nota numeric,
    p_descricao varchar
) RETURNS json AS $$
BEGIN
    IF NOT cesc.professor_tem_autorizacao(p_token, p_matricula_id, p_disciplina) THEN
        RETURN json_build_object('ok', false, 'erro', 'Não autorizado.');
    END IF;

    IF cesc.trimestre_fechado(p_matricula_id, p_disciplina, p_trimestre) THEN
        RETURN json_build_object('ok', false, 'erro', 'Trimestre fechado. Não é possível adicionar avaliações.');
    END IF;

    IF p_nota < 0 OR p_nota > 20 THEN
        RETURN json_build_object('ok', false, 'erro', 'Nota deve estar entre 0 e 20.');
    END IF;

    INSERT INTO cesc.avaliacoes_continuas (matricula_id, disciplina, trimestre, nota, descricao)
    VALUES (p_matricula_id, p_disciplina, p_trimestre, p_nota, p_descricao);

    PERFORM cesc.recalcular_mac_mt(p_matricula_id, p_disciplina, p_trimestre);

    RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 5. Remover avaliação contínua
-- ============================================================
CREATE OR REPLACE FUNCTION public.cesc_professor_remover_avaliacao(
    p_token varchar,
    p_avaliacao_id uuid
) RETURNS json AS $$
DECLARE
    v_av record;
BEGIN
    SELECT * INTO v_av FROM cesc.avaliacoes_continuas WHERE id = p_avaliacao_id;
    IF v_av IS NULL THEN
        RETURN json_build_object('ok', false, 'erro', 'Avaliação não encontrada.');
    END IF;

    IF NOT cesc.professor_tem_autorizacao(p_token, v_av.matricula_id, v_av.disciplina) THEN
        RETURN json_build_object('ok', false, 'erro', 'Não autorizado.');
    END IF;

    IF cesc.trimestre_fechado(v_av.matricula_id, v_av.disciplina, v_av.trimestre) THEN
        RETURN json_build_object('ok', false, 'erro', 'Trimestre fechado. Não é possível remover avaliações.');
    END IF;

    DELETE FROM cesc.avaliacoes_continuas WHERE id = p_avaliacao_id;

    PERFORM cesc.recalcular_mac_mt(v_av.matricula_id, v_av.disciplina, v_av.trimestre);

    RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 6. Listar avaliações contínuas de um aluno/trimestre
-- ============================================================
CREATE OR REPLACE FUNCTION public.cesc_professor_listar_avaliacoes(
    p_token varchar,
    p_matricula_id uuid,
    p_disciplina varchar,
    p_trimestre integer
) RETURNS json AS $$
BEGIN
    IF NOT cesc.professor_tem_autorizacao(p_token, p_matricula_id, p_disciplina) THEN
        RETURN json_build_object('ok', false, 'erro', 'Não autorizado.');
    END IF;

    RETURN json_build_object(
        'ok', true,
        'fechado', cesc.trimestre_fechado(p_matricula_id, p_disciplina, p_trimestre),
        'avaliacoes', COALESCE((
            SELECT json_agg(json_build_object(
                'id', ac.id,
                'nota', ac.nota,
                'descricao', ac.descricao,
                'criado_em', ac.criado_em
            ) ORDER BY ac.criado_em)
            FROM cesc.avaliacoes_continuas ac
            WHERE ac.matricula_id = p_matricula_id
              AND ac.disciplina = p_disciplina
              AND ac.trimestre = p_trimestre
        ), '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 7. Lançar NPT (fecha o trimestre)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cesc_professor_lancar_npt(
    p_token varchar,
    p_matricula_id uuid,
    p_disciplina varchar,
    p_trimestre integer,
    p_npt numeric
) RETURNS json AS $$
DECLARE
    v_mac numeric;
    v_mt numeric;
    v_mfd numeric;
    v_mt1 numeric;
    v_mt2 numeric;
    v_mt3 numeric;
BEGIN
    IF NOT cesc.professor_tem_autorizacao(p_token, p_matricula_id, p_disciplina) THEN
        RETURN json_build_object('ok', false, 'erro', 'Não autorizado.');
    END IF;

    IF cesc.trimestre_fechado(p_matricula_id, p_disciplina, p_trimestre) THEN
        RETURN json_build_object('ok', false, 'erro', 'Trimestre já fechado. Contacta o coordenador.');
    END IF;

    IF p_npt < 0 OR p_npt > 20 THEN
        RETURN json_build_object('ok', false, 'erro', 'NPT deve estar entre 0 e 20.');
    END IF;

    -- MAC calculada das avaliações contínuas
    SELECT round(avg(nota), 2) INTO v_mac
    FROM cesc.avaliacoes_continuas
    WHERE matricula_id = p_matricula_id
      AND disciplina = p_disciplina
      AND trimestre = p_trimestre;

    IF v_mac IS NULL THEN
        RETURN json_build_object('ok', false, 'erro', 'Adiciona pelo menos uma avaliação contínua antes de lançar a NPT.');
    END IF;

    v_mt := round((v_mac + p_npt) / 2, 2);

    INSERT INTO cesc.notas_trimestrais (matricula_id, disciplina, trimestre, mac, npt, mt)
    VALUES (p_matricula_id, p_disciplina, p_trimestre, v_mac, p_npt, v_mt)
    ON CONFLICT (matricula_id, disciplina, trimestre)
    DO UPDATE SET mac = v_mac, npt = p_npt, mt = v_mt;

    -- Se for o 3º trimestre, calcular MFD
    IF p_trimestre = 3 THEN
        SELECT 
            MAX(CASE WHEN trimestre = 1 THEN mt END),
            MAX(CASE WHEN trimestre = 2 THEN mt END),
            MAX(CASE WHEN trimestre = 3 THEN mt END)
        INTO v_mt1, v_mt2, v_mt3
        FROM cesc.notas_trimestrais
        WHERE matricula_id = p_matricula_id AND disciplina = p_disciplina;

        IF v_mt1 IS NOT NULL AND v_mt2 IS NOT NULL AND v_mt3 IS NOT NULL THEN
            v_mfd := round((v_mt1 + v_mt2 + v_mt3) / 3, 2);
            UPDATE cesc.notas_trimestrais
            SET mfd = v_mfd
            WHERE matricula_id = p_matricula_id
              AND disciplina = p_disciplina
              AND trimestre = 3;
        END IF;
    END IF;

    RETURN json_build_object('ok', true, 'mac', v_mac, 'mt', v_mt, 'mfd', v_mfd);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 8. Verificação
-- ============================================================
SELECT 'RPCs criadas: ' || count(*) FROM pg_proc
WHERE proname IN (
    'cesc_professor_adicionar_avaliacao',
    'cesc_professor_remover_avaliacao',
    'cesc_professor_listar_avaliacoes',
    'cesc_professor_lancar_npt'
);
```

---

O que este SQL faz

RPC O que faz Bloqueia se…
cesc_professor_adicionar_avaliacao Adiciona nota individual, recalcula MAC automaticamente Trimestre fechado, nota fora de 0–20, sem autorização
cesc_professor_remover_avaliacao Remove nota individual, recalcula MAC Trimestre fechado, sem autorização
cesc_professor_listar_avaliacoes Lista as avaliações contínuas de um aluno/trimestre Sem autorização (só verifica)
cesc_professor_lancar_npt Lança a NPT, calcula MT, fecha o trimestre. Se for o 3º, calcula MFD Trimestre fechado, NPT fora de 0–20, sem MAC

A lógica está no servidor. O frontend só chama as RPCs.

---

Como testar (depois de correr o SQL)

Vou dar-te 2 testes rápidos para confirmares que funciona antes de escrever a interface.

Teste A — Lançar uma avaliação contínua no aluno de teste

Precisas de 3 coisas:

1. Um token válido do professor António Silva (antonio.silva@cesc.ao, password prof123).
2. O matricula_id do aluno de teste.
3. O professor_id do António (que já vimos: 9b8fb92f-1e26-4334-a475-0e715769729d).

Mas o login do professor ainda não está na interface. Para este teste, tens duas opções:

A) Fazer login via curl:

```bash
# Passo 1: login
curl -X POST "https://kmdixtzvnhvtwkpsicoq.supabase.co/rest/v1/rpc/cursos_login_password" ... 
# (mas isto é dos cursos, não do CESC)
```

Atenção: o CESC tem a sua própria cesc_login e cesc_validar_codigo. Vou usar essas.

B) Ou o teste é feito depois de escrevermos a interface.

Recomendo B. Escrevemos a interface (login já existe em paginas/login.html), testamos o fluxo completo no browser, e só se algo falhar vamos ao curl.

---

O que fazer agora

1. Corre o SQL acima no Supabase.
2. Cola-me o output do SELECT final — deve dizer RPCs criadas: 4.
3. Se tudo bem, avanço para a interface do professor (admin/professor.html + CSS + JS).

Corre e diz-me.

Vamos ao cliente. Vou escrever a interface do professor em 3 ficheiros:

1. admin/professor.html
2. admin/css/professor.css
3. admin/scripts/professor.js

Antes de colar, uma nota importante: o api.js que tens no CESC está em scripts/api.js (na raiz). A página admin/professor.html vai carregá-lo com ../scripts/api.js. Confirma que o caminho está certo — se tiveres o api.js noutro sítio, ajusta o <script>.

---

1. admin/professor.html

```html
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Área do Professor — CESC</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="../css/base.css">
    <link rel="stylesheet" href="../css/dashboard.css">
    <link rel="stylesheet" href="css/professor.css">
</head>
<body class="dashboard-body">

    <!-- Overlay para mobile -->
    <div class="sidebar-overlay" id="sidebarOverlay"></div>

    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar">
        <div class="sidebar-topo">
            <div class="sidebar-logo">
                <div class="logo-icone"><i class="fas fa-graduation-cap"></i></div>
                <div class="logo-texto">
                    <span class="logo-nome">CESC</span>
                    <span class="logo-sub">Área do Professor</span>
                </div>
            </div>
            <button class="sidebar-fechar" id="sidebarFechar"><i class="fas fa-times"></i></button>
        </div>

        <div class="sidebar-perfil">
            <div class="perfil-avatar" id="prof-avatar">-</div>
            <div class="perfil-info">
                <strong id="prof-nome-sidebar">A carregar...</strong>
                <span id="prof-dept-sidebar">-</span>
            </div>
        </div>

        <nav class="sidebar-nav">
            <span class="nav-rotulo">Menu</span>
            <a href="#" class="nav-item ativo" data-seccao="visao-geral">
                <i class="fas fa-home"></i> Visão Geral
            </a>
            <a href="#" class="nav-item" data-seccao="turmas">
                <i class="fas fa-chalkboard-teacher"></i> Minhas Turmas
            </a>
            <a href="#" class="nav-item" data-seccao="notas">
                <i class="fas fa-edit"></i> Lançar Notas
            </a>
            <a href="#" class="nav-item" data-seccao="faltas">
                <i class="fas fa-user-clock"></i> Marcar Faltas
            </a>
            <a href="#" class="nav-item" data-seccao="perfil">
                <i class="fas fa-user"></i> Perfil
            </a>
        </nav>

        <div class="sidebar-rodape">
            <a href="../index.html" class="nav-item"><i class="fas fa-globe"></i> Voltar ao site</a>
            <a href="#" class="nav-item nav-sair" id="link-sair"><i class="fas fa-sign-out-alt"></i> Sair</a>
        </div>
    </aside>

    <!-- Conteúdo -->
    <main class="dashboard-main">
        <header class="dashboard-header-mobile">
            <button class="menu-mobile-btn" id="menuMobileBtn"><i class="fas fa-bars"></i></button>
            <span>CESC · Professor</span>
            <a href="../index.html" class="header-voltar"><i class="fas fa-globe"></i></a>
        </header>

        <div class="loader-container" id="loader">
            <div class="loader"></div>
            <p>A carregar os teus dados...</p>
        </div>

        <div class="dashboard-conteudo" id="dashboard-conteudo" style="display:none;">

            <!-- VISÃO GERAL -->
            <section class="pagina-seccao ativa" id="seccao-visao-geral">
                <div class="pagina-cabecalho">
                    <h1>Visão Geral</h1>
                    <p id="boas-vindas">Bem-vindo de volta.</p>
                </div>

                <div class="stats-grelha">
                    <div class="stat-card">
                        <div class="stat-header"><i class="fas fa-chalkboard-teacher"></i> Turmas</div>
                        <div class="stat-valor" id="stat-turmas">0</div>
                        <div class="stat-subtexto">que lecionas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header"><i class="fas fa-users"></i> Alunos</div>
                        <div class="stat-valor" id="stat-alunos">0</div>
                        <div class="stat-subtexto">total nas tuas turmas</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header"><i class="fas fa-edit"></i> Notas Lançadas</div>
                        <div class="stat-valor" id="stat-notas">0</div>
                        <div class="stat-subtexto">nas tuas disciplinas</div>
                    </div>
                </div>

                <div class="card-info">
                    <h3><i class="fas fa-chalkboard-teacher"></i> As tuas turmas</h3>
                    <div id="lista-turmas-visao-geral"></div>
                </div>
            </section>

            <!-- MINHAS TURMAS -->
            <section class="pagina-seccao" id="seccao-turmas">
                <div class="pagina-cabecalho">
                    <h1>Minhas Turmas</h1>
                    <p>Turmas e disciplinas que lecionas.</p>
                </div>
                <div id="lista-turmas" class="turmas-grelha"></div>
            </section>

            <!-- LANÇAR NOTAS -->
            <section class="pagina-seccao" id="seccao-notas">
                <div class="pagina-cabecalho">
                    <h1>Lançar Notas</h1>
                    <p>Escolhe uma turma, disciplina e trimestre.</p>
                </div>

                <div class="notas-filtros">
                    <div class="campo-grupo">
                        <label for="sel-turma-notas">Turma</label>
                        <select id="sel-turma-notas" class="campo-select"></select>
                    </div>
                    <div class="campo-grupo">
                        <label for="sel-trimestre">Trimestre</label>
                        <select id="sel-trimestre" class="campo-select">
                            <option value="1">1º Trimestre</option>
                            <option value="2">2º Trimestre</option>
                            <option value="3">3º Trimestre</option>
                        </select>
                    </div>
                </div>

                <div id="notas-info" class="notas-info" style="display:none;"></div>
                <div id="tabela-notas" class="tabela-notas-wrapper"></div>
            </section>

            <!-- MARCAR FALTAS -->
            <section class="pagina-seccao" id="seccao-faltas">
                <div class="pagina-cabecalho">
                    <h1>Marcar Faltas</h1>
                    <p>Escolhe uma turma e regista faltas.</p>
                </div>

                <div class="notas-filtros">
                    <div class="campo-grupo">
                        <label for="sel-turma-faltas">Turma</label>
                        <select id="sel-turma-faltas" class="campo-select"></select>
                    </div>
                </div>

                <div id="tabela-faltas" class="tabela-notas-wrapper"></div>
            </section>

            <!-- PERFIL -->
            <section class="pagina-seccao" id="seccao-perfil">
                <div class="pagina-cabecalho">
                    <h1>O Meu Perfil</h1>
                    <p>Os teus dados registados no CESC.</p>
                </div>
                <div id="lista-perfil"></div>
            </section>

        </div>
    </main>

    <script src="../scripts/api.js"></script>
    <script src="scripts/professor.js"></script>
</body>
</html>
```

---

2. admin/css/professor.css

```css
/*
 Estilos específicos da área do professor.
 Reaproveita dashboard.css (sidebar, cards, secções).
 Acrescenta: tabela de notas expansível, filtros, turmas.
 */

/* ===== Filtros (turma / trimestre) ===== */
.notas-filtros {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    padding: 20px;
    background-color: #fff;
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio);
    align-items: flex-end;
}

.notas-filtros .campo-grupo {
    flex: 1 1 220px;
    margin-bottom: 0;
}

.notas-filtros label {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--cor-texto-suave);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}

.notas-info {
    padding: 14px 18px;
    background-color: var(--cor-azul-muito-claro);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: var(--raio);
    color: var(--cor-azul);
    font-size: 0.9rem;
    margin-bottom: 16px;
}

/* ===== Tabela de notas ===== */
.tabela-notas-wrapper {
    overflow-x: auto;
    background-color: #fff;
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio);
}

.tabela-notas {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    min-width: 720px;
}

.tabela-notas thead th {
    background-color: var(--cor-fundo);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--cor-texto-suave);
    font-weight: 700;
    text-align: left;
    padding: 12px 14px;
    border-bottom: 1px solid var(--cor-borda);
    white-space: nowrap;
}

.tabela-notas thead th.centro {
    text-align: center;
}

.tabela-notas td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--cor-borda);
    vertical-align: middle;
}

.tabela-notas tr:last-child td {
    border-bottom: none;
}

.tabela-notas tr.aluno-aberto {
    background-color: rgba(59, 130, 246, 0.03);
}

.col-expandir {
    width: 40px;
    text-align: center;
}

.btn-expandir {
    width: 28px;
    height: 28px;
    border: 1px solid var(--cor-borda);
    border-radius: 6px;
    background-color: #fff;
    color: var(--cor-azul);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    transition: all 0.2s;
}

.btn-expandir:hover {
    border-color: var(--cor-azul);
    background-color: var(--cor-azul-muito-claro);
}

.btn-expandir i {
    transition: transform 0.2s;
}

.btn-expandir.expandido i {
    transform: rotate(90deg);
}

.aluno-nome-cell strong {
    color: var(--cor-texto);
    display: block;
    font-size: 0.92rem;
}

.aluno-nome-cell span {
    color: var(--cor-texto-suave);
    font-size: 0.78rem;
}

.celula-nota {
    text-align: center;
    font-weight: 600;
    color: var(--cor-azul);
}

.celula-nota.vazia {
    color: var(--cor-texto-leve);
    font-weight: 400;
}

.celula-fechada {
    color: var(--cor-texto-leve);
    font-size: 0.78rem;
    font-style: italic;
    text-align: center;
}

/* ===== Linha expandida (avaliações contínuas) ===== */
.linha-expandida {
    background-color: #f8fafc;
    border-bottom: 1px solid var(--cor-borda);
}

.linha-expandida > td {
    padding: 20px 24px 24px;
    border-bottom: none;
}

.expandido-cabecalho {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
}

.expandido-titulo {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--cor-texto);
    display: flex;
    align-items: center;
    gap: 8px;
}

.expandido-titulo .mac-valor {
    color: var(--cor-azul);
    background-color: var(--cor-azul-muito-claro);
    padding: 2px 10px;
    border-radius: 100px;
    font-size: 0.82rem;
}

.btn-adicionar-avaliacao {
    padding: 8px 14px;
    background-color: var(--cor-azul);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.2s;
    font-family: inherit;
}

.btn-adicionar-avaliacao:hover {
    background-color: #172554;
}

.btn-adicionar-avaliacao:disabled {
    background-color: var(--cor-texto-leve);
    cursor: not-allowed;
}

.lista-avaliacoes {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
}

.avaliacao-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 14px;
    background-color: #fff;
    border: 1px solid var(--cor-borda);
    border-radius: 8px;
    font-size: 0.86rem;
}

.avaliacao-item .av-desc {
    flex: 1;
    color: var(--cor-texto-suave);
}

.avaliacao-item .av-nota {
    font-weight: 700;
    color: var(--cor-azul);
    font-size: 0.95rem;
}

.avaliacao-item .av-remover {
    background: none;
    border: none;
    color: var(--cor-erro);
    cursor: pointer;
    padding: 4px;
    font-size: 0.85rem;
    border-radius: 4px;
    transition: background 0.2s;
}

.avaliacao-item .av-remover:hover {
    background-color: var(--cor-erro-fundo);
}

.avaliacoes-vazio {
    padding: 12px 16px;
    font-size: 0.85rem;
    color: var(--cor-texto-leve);
    font-style: italic;
    background-color: #fff;
    border: 1px dashed var(--cor-borda);
    border-radius: 8px;
    margin-bottom: 16px;
}

/* Formulário inline de nova avaliação */
.form-nova-avaliacao {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-wrap: wrap;
    padding: 12px;
    background-color: #fff;
    border: 1px solid var(--cor-borda);
    border-radius: 8px;
    margin-bottom: 16px;
}

.form-nova-avaliacao .campo-grupo {
    margin-bottom: 0;
    flex: 1 1 140px;
}

.form-nova-avaliacao label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--cor-texto-suave);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}

.form-nova-avaliacao input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--cor-borda);
    border-radius: 6px;
    font-size: 0.85rem;
    font-family: inherit;
    box-sizing: border-box;
}

.form-nova-avaliacao input:focus {
    outline: none;
    border-color: var(--cor-azul);
}

.form-nova-avaliacao .btn-confirmar {
    padding: 9px 16px;
    background-color: var(--cor-azul);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s;
}

.form-nova-avaliacao .btn-confirmar:hover {
    background-color: #172554;
}

.form-nova-avaliacao .btn-cancelar {
    padding: 9px 16px;
    background-color: transparent;
    color: var(--cor-texto-suave);
    border: 1px solid var(--cor-borda);
    border-radius: 6px;
    font-size: 0.82rem;
    cursor: pointer;
    font-family: inherit;
}

.form-nova-avaliacao .btn-cancelar:hover {
    background-color: var(--cor-fundo);
}

/* NPT inline */
.npt-wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 4px;
}

.npt-wrapper input {
    padding: 6px 8px;
    border: 1px solid var(--cor-borda);
    border-radius: 6px;
    font-size: 0.85rem;
    width: 70px;
    text-align: center;
    font-family: inherit;
}

.npt-wrapper input:focus {
    outline: none;
    border-color: var(--cor-azul);
}

.btn-lancar-npt {
    padding: 6px 10px;
    background-color: var(--cor-azul);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s;
    white-space: nowrap;
}

.btn-lancar-npt:hover {
    background-color: #172554;
}

.btn-lancar-npt:disabled {
    background-color: var(--cor-texto-leve);
    cursor: not-allowed;
}

/* ===== Grelha de turmas ===== */
.turmas-grelha {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
}

.turma-card {
    background-color: #fff;
    border: 1px solid var(--cor-borda);
    border-radius: var(--raio);
    padding: 22px;
    transition: all 0.2s;
}

.turma-card:hover {
    border-color: var(--cor-azul-claro);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}

.turma-card-titulo {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--cor-azul);
    margin: 0 0 4px;
    font-family: 'Playfair Display', serif;
}

.turma-card-meta {
    font-size: 0.82rem;
    color: var(--cor-texto-suave);
    margin-bottom: 16px;
    line-height: 1.5;
}

.turma-card-acoes {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.turma-card-acoes button {
    flex: 1 1 auto;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    border: 1px solid var(--cor-azul);
    background-color: transparent;
    color: var(--cor-azul);
    transition: all 0.2s;
}

.turma-card-acoes button:hover {
    background-color: var(--cor-azul);
    color: #fff;
}

/* ===== Faltas ===== */
.falta-btn {
    padding: 6px 12px;
    background-color: var(--cor-erro-fundo);
    color: var(--cor-erro);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
}

.falta-btn:hover {
    background-color: var(--cor-erro);
    color: #fff;
}

.faltas-contador {
    font-weight: 700;
    color: var(--cor-erro);
    text-align: center;
}

/* ===== Responsivo ===== */
@media (max-width: 768px) {
    .notas-filtros {
        flex-direction: column;
    }

    .notas-filtros .campo-grupo {
        flex: 1 1 100%;
    }

    .form-nova-avaliacao {
        flex-direction: column;
        align-items: stretch;
    }

    .form-nova-avaliacao .campo-grupo {
        flex: 1 1 100%;
    }

    .expandido-cabecalho {
        flex-direction: column;
        align-items: flex-start;
    }

    .turma-card-acoes {
        flex-direction: column;
    }

    .turma-card-acoes button {
        flex: 1 1 100%;
    }
}
```

---

3. admin/scripts/professor.js

```javascript
/*
 CESC - Área do professor
 Data: 21/10/2026

 - Valida token e role (professor).
 - Carrega dados do professor (turmas).
 - Lançar notas: tabela expansível com avaliações contínuas + NPT.
 - Marcar faltas.
 */

let dadosProf = null;
let turmaActualNotas = null;
let trimestreActual = 1;

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
    const token = exigirLogin();
    if (!token) return;

    // Sidebar mobile
    const menuBtn = document.getElementById("menuMobileBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarFechar = document.getElementById("sidebarFechar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuBtn) menuBtn.addEventListener("click", function () {
        sidebar.classList.add("aberta");
        overlay.classList.add("ativo");
    });
    if (sidebarFechar) sidebarFechar.addEventListener("click", fecharSidebar);
    if (overlay) overlay.addEventListener("click", fecharSidebar);

    function fecharSidebar() {
        sidebar.classList.remove("aberta");
        overlay.classList.remove("ativo");
    }

    // Navegação
    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (item) {
        item.addEventListener("click", function (e) {
            e.preventDefault();
            mostrarSeccao(item.getAttribute("data-seccao"));
            fecharSidebar();
        });
    });

    // Sair
    const linkSair = document.getElementById("link-sair");
    if (linkSair) {
        linkSair.addEventListener("click", function (e) {
            e.preventDefault();
            fazerLogout();
        });
    }

    // Carregar dados do professor
    const dados = await chamarRPC("cesc_professor_dashboard", { p_token: token });

    if (!dados.ok) {
        // Se o role não for professor, manda para o dashboard do aluno
        if (dados.erro && dados.erro.indexOf("autorizado") !== -1) {
            window.location.href = "../paginas/dashboard.html";
            return;
        }
        document.getElementById("loader").innerHTML =
            '<p style="color:var(--cor-erro);">' + esc(dados.erro || "Erro ao carregar.") + '</p>';
        return;
    }

    dadosProf = dados;
    renderizarTudo(dados);
    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";
});

// ============================================================
// NAVEGAÇÃO
// ============================================================
function mostrarSeccao(id) {
    document.querySelectorAll(".pagina-seccao").forEach(function (s) {
        s.classList.remove("ativa");
    });
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (n) {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// RENDERIZAÇÃO INICIAL
// ============================================================
function renderizarTudo(dados) {
    const prof = dados.professor;
    const turmas = dados.turmas || [];

    // Sidebar
    const inicial = (prof.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("prof-avatar").textContent = inicial;
    document.getElementById("prof-nome-sidebar").textContent = prof.nome_completo;
    document.getElementById("prof-dept-sidebar").textContent = prof.departamento || "—";

    // Boas-vindas
    const primeiroNome = prof.nome_completo.split(" ")[0];
    document.getElementById("boas-vindas").textContent = "Bem-vindo de volta, " + primeiroNome + ".";

    // Stats
    document.getElementById("stat-turmas").textContent = turmas.length;
    const totalAlunos = turmas.reduce(function (s, t) { return s + (t.total_alunos || 0); }, 0);
    document.getElementById("stat-alunos").textContent = totalAlunos;
    // Notas lançadas — como não temos este número directamente, mostramos 0.
    // Podemos calcular no futuro.
    document.getElementById("stat-notas").textContent = "—";

    // Turmas na visão geral
    const listaVG = document.getElementById("lista-turmas-visao-geral");
    if (turmas.length === 0) {
        listaVG.innerHTML = '<p style="color:var(--cor-texto-suave); font-size:0.9rem;">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t) {
            html += '<div class="info-linha">';
            html += '<span class="rotulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + ' · ' + esc(t.disciplina) + '</span>';
            html += '<span class="valor">' + (t.total_alunos || 0) + ' alunos</span>';
            html += '</div>';
        });
        listaVG.innerHTML = html;
    }

    // Turmas (grelha)
    const listaTurmas = document.getElementById("lista-turmas");
    if (turmas.length === 0) {
        listaTurmas.innerHTML = '<p style="color:var(--cor-texto-suave);">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t, idx) {
            html += '<div class="turma-card">';
            html += '  <h3 class="turma-card-titulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + '</h3>';
            html += '  <p class="turma-card-meta">' + esc(t.disciplina) + ' · ' + esc(t.ano_lectivo) + '<br>' + (t.total_alunos || 0) + ' alunos</p>';
            html += '  <div class="turma-card-acoes">';
            html += '    <button onclick="irParaNotas(' + idx + ')">Lançar notas</button>';
            html += '    <button onclick="irParaFaltas(' + idx + ')">Marcar faltas</button>';
            html += '  </div>';
            html += '</div>';
        });
        listaTurmas.innerHTML = html;
    }

    // Preencher selects
    const selNotas = document.getElementById("sel-turma-notas");
    const selFaltas = document.getElementById("sel-turma-faltas");
    [selNotas, selFaltas].forEach(function (sel) {
        if (!sel) return;
        sel.innerHTML = "";
        turmas.forEach(function (t, idx) {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = t.classe + " · " + t.turma + " · " + t.disciplina;
            sel.appendChild(opt);
        });
        sel.addEventListener("change", function () {
            if (sel === selNotas) carregarNotas();
            else carregarFaltas();
        });
    });

    // Trimestre
    const selTrim = document.getElementById("sel-trimestre");
    if (selTrim) {
        selTrim.addEventListener("change", function () {
            trimestreActual = parseInt(this.value, 10);
            carregarNotas();
        });
    }

    // Perfil
    const perfil = document.getElementById("lista-perfil");
    let html = '<div class="card-info"><h3><i class="fas fa-user"></i> Dados</h3>';
    html += linhaInfo("Nome", prof.nome_completo);
    html += linhaInfo("Email", prof.email);
    html += linhaInfo("Departamento", prof.departamento);
    html += linhaInfo("Turmas", turmas.length);
    html += '</div>';
    perfil.innerHTML = html;
}

function linhaInfo(rotulo, valor) {
    return '<div class="info-linha"><span class="rotulo">' + rotulo +
        '</span><span class="valor">' + (valor || "—") + '</span></div>';
}

// ============================================================
// IR PARA SECÇÕES (a partir dos botões da turma)
// ============================================================
function irParaNotas(idx) {
    document.getElementById("sel-turma-notas").value = String(idx);
    mostrarSeccao("notas");
    carregarNotas();
}

function irParaFaltas(idx) {
    document.getElementById("sel-turma-faltas").value = String(idx);
    mostrarSeccao("faltas");
    carregarFaltas();
}

// ============================================================
// LANÇAR NOTAS
// ============================================================
async function carregarNotas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-notas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    turmaActualNotas = dadosProf.turmas[idx];
    const infoEl = document.getElementById("notas-info");
    infoEl.style.display = "block";
    infoEl.textContent = "A carregar alunos...";

    const tabelaEl = document.getElementById("tabela-notas");
    tabelaEl.innerHTML = "";

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turmaActualNotas.ano_lectivo,
        p_classe: turmaActualNotas.classe,
        p_turma: turmaActualNotas.turma,
        p_disciplina: turmaActualNotas.disciplina
    });

    if (!dados.ok) {
        infoEl.textContent = dados.erro || "Erro ao carregar alunos.";
        return;
    }

    const alunos = dados.alunos || [];
    infoEl.textContent = alunos.length + " alunos em " + turmaActualNotas.classe + " · Turma " + turmaActualNotas.turma + " (" + turmaActualNotas.disciplina + ")";

    renderizarTabelaNotas(alunos);
}

function renderizarTabelaNotas(alunos) {
    const container = document.getElementById("tabela-notas");
    if (!container) return;

    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    let html = '<table class="tabela-notas">';
    html += '<thead><tr>';
    html += '  <th class="col-expandir"></th>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">MAC</th>';
    html += '  <th class="centro">NPT</th>';
    html += '  <th class="centro">MT</th>';
    html += '  <th class="centro">MFD</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const notas = (a.notas || []).find(function (n) { return n.trimestre === trimestreActual; }) || {};
        const mac = notas.mac;
        const npt = notas.npt;
        const mt = notas.mt;
        const mfd = notas.mfd;
        const fechado = npt !== null && npt !== undefined;

        html += '<tr data-aluno-idx="' + idx + '">';
        html += '  <td class="col-expandir">';
        html += '    <button class="btn-expandir" data-expandir="' + idx + '"><i class="fas fa-chevron-right"></i></button>';
        html += '  </td>';
        html += '  <td class="aluno-nome-cell">';
        html += '    <strong>' + esc(a.nome_completo) + '</strong>';
        html += '    <span>BI: ' + esc(a.bi_numero) + ' · Nº ' + (a.numero_aluno || "—") + '</span>';
        html += '  </td>';
        html += '  <td class="celula-nota ' + (mac == null ? "vazia" : "") + '">' + (mac != null ? Number(mac).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (npt == null ? "vazia" : "") + '">' + (npt != null ? Number(npt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mt == null ? "vazia" : "") + '">' + (mt != null ? Number(mt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mfd == null ? "vazia" : "") + '">' + (mfd != null ? Number(mfd).toFixed(1) : "—") + '</td>';
        html += '</tr>';

        // Linha expandida (escondida)
        html += '<tr class="linha-expandida" data-expandida="' + idx + '" style="display:none;"><td colspan="6">';
        html += '  <div class="expandido-conteudo" data-conteudo="' + idx + '">A carregar...</div>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Ligar botões de expandir
    container.querySelectorAll("[data-expandir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = this.getAttribute("data-expandir");
            const linha = container.querySelector('[data-expandida="' + idx + '"]');
            const estaAberta = linha.style.display !== "none";
            if (estaAberta) {
                linha.style.display = "none";
                btn.classList.remove("expandido");
            } else {
                linha.style.display = "table-row";
                btn.classList.add("expandido");
                carregarExpandido(alunos[parseInt(idx, 10)], parseInt(idx, 10));
            }
        });
    });
}

async function carregarExpandido(aluno, idx) {
    const token = obterToken();
    const container = document.querySelector('[data-conteudo="' + idx + '"]');
    if (!container) return;

    const dados = await chamarRPC("cesc_professor_listar_avaliacoes", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual
    });

    if (!dados.ok) {
        container.innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>';
        return;
    }

    const avaliacoes = dados.avaliacoes || [];
    const fechado = dados.fechado;

    // Calcular MAC
    let soma = 0;
    avaliacoes.forEach(function (a) { soma += Number(a.nota); });
    const mac = avaliacoes.length > 0 ? (soma / avaliacoes.length).toFixed(2) : null;

    let html = '<div class="expandido-cabecalho">';
    html += '<div class="expandido-titulo"><i class="fas fa-list-check"></i> Avaliações contínuas';
    if (mac !== null) html += ' <span class="mac-valor">MAC: ' + mac + '</span>';
    html += '</div>';
    if (fechado) {
        html += '<span style="font-size:0.8rem; color:var(--cor-texto-leve); font-style:italic;">Trimestre fechado — não editável</span>';
    } else {
        html += '<button class="btn-adicionar-avaliacao" data-add="' + idx + '"><i class="fas fa-plus"></i> Adicionar avaliação</button>';
    }
    html += '</div>';

    // Lista de avaliações
    if (avaliacoes.length === 0) {
        html += '<div class="avaliacoes-vazio">Ainda sem avaliações contínuas neste trimestre.</div>';
    } else {
        html += '<div class="lista-avaliacoes">';
        avaliacoes.forEach(function (av) {
            html += '<div class="avaliacao-item">';
            html += '  <span class="av-desc">' + esc(av.descricao || "Avaliação") + '</span>';
            html += '  <span class="av-nota">' + Number(av.nota).toFixed(1) + '</span>';
            if (!fechado) {
                html += '  <button class="av-remover" data-remover="' + av.id + '" data-aluno-idx="' + idx + '"><i class="fas fa-trash"></i></button>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    // Formulário de nova avaliação (escondido)
    html += '<div class="form-nova-avaliacao" data-form="' + idx + '" style="display:none;">';
    html += '  <div class="campo-grupo">';
    html += '    <label>Nota (0-20)</label>';
    html += '    <input type="number" min="0" max="20" step="0.1" data-input-nota="' + idx + '">';
    html += '  </div>';
    html += '  <div class="campo-grupo">';
    html += '    <label>Descrição</label>';
    html += '    <input type="text" placeholder="Ex: Teste 1" data-input-desc="' + idx + '">';
    html += '  </div>';
    html += '  <button class="btn-confirmar" data-confirmar="' + idx + '">Adicionar</button>';
    html += '  <button class="btn-cancelar" data-cancelar="' + idx + '">Cancelar</button>';
    html += '</div>';

    // NPT inline
    if (!fechado) {
        const nptActual = (aluno.notas || []).find(function (n) { return n.trimestre === trimestreActual; });
        html += '<div style="border-top:1px solid var(--cor-borda); padding-top:16px; margin-top:8px;">';
        html += '<div class="expandido-titulo" style="margin-bottom:12px;"><i class="fas fa-clipboard-check"></i> Nota da Prova Trimestral (NPT)</div>';
        html += '<div class="npt-wrapper" style="flex-direction:row; align-items:center; gap:8px;">';
        html += '<input type="number" min="0" max="20" step="0.1" data-input-npt="' + idx + '" placeholder="NPT" value="' + (nptActual && nptActual.npt != null ? nptActual.npt : "") + '">';
        html += '<button class="btn-lancar-npt" data-lancar-npt="' + idx + '">Lançar NPT e fechar trimestre</button>';
        html += '</div>';
        html += '</div>';
    }

    container.innerHTML = html;

    // Ligar eventos
    const addBtn = container.querySelector('[data-add="' + idx + '"]');
    const formEl = container.querySelector('[data-form="' + idx + '"]');
    if (addBtn && formEl) {
        addBtn.addEventListener("click", function () {
            formEl.style.display = formEl.style.display === "none" ? "flex" : "none";
        });
    }

    const confirmarBtn = container.querySelector('[data-confirmar="' + idx + '"]');
    if (confirmarBtn) {
        confirmarBtn.addEventListener("click", function () {
            adicionarAvaliacao(aluno, idx);
        });
    }

    const cancelarBtn = container.querySelector('[data-cancelar="' + idx + '"]');
    if (cancelarBtn && formEl) {
        cancelarBtn.addEventListener("click", function () {
            formEl.style.display = "none";
        });
    }

    container.querySelectorAll("[data-remover]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (confirm("Remover esta avaliação?")) {
                removerAvaliacao(this.getAttribute("data-remover"), aluno, idx);
            }
        });
    });

    const lancarNptBtn = container.querySelector('[data-lancar-npt="' + idx + '"]');
    if (lancarNptBtn) {
        lancarNptBtn.addEventListener("click", function () {
            lancarNPT(aluno, idx);
        });
    }
}

async function adicionarAvaliacao(aluno, idx) {
    const token = obterToken();
    const notaInput = document.querySelector('[data-input-nota="' + idx + '"]');
    const descInput = document.querySelector('[data-input-desc="' + idx + '"]');
    const nota = parseFloat(notaInput.value);
    const desc = descInput.value.trim() || "Avaliação";

    if (isNaN(nota) || nota < 0 || nota > 20) {
        alert("Nota inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_adicionar_avaliacao", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_nota: nota,
        p_descricao: desc
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao adicionar avaliação.");
        return;
    }

    // Recarregar o expandido e a tabela
    carregarExpandido(aluno, idx);
    carregarNotas();
}

async function removerAvaliacao(avaliacaoId, aluno, idx) {
    const token = obterToken();
    const dados = await chamarRPC("cesc_professor_remover_avaliacao", {
        p_token: token,
        p_avaliacao_id: avaliacaoId
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao remover.");
        return;
    }

    carregarExpandido(aluno, idx);
    carregarNotas();
}

async function lancarNPT(aluno, idx) {
    const token = obterToken();
    const inputNpt = document.querySelector('[data-input-npt="' + idx + '"]');
    const npt = parseFloat(inputNpt.value);

    if (isNaN(npt) || npt < 0 || npt > 20) {
        alert("NPT inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_lancar_npt", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_npt: npt
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao lançar NPT.");
        return;
    }

    alert("NPT lançada. MAC: " + dados.mac + ", MT: " + dados.mt + (dados.mfd != null ? ", MFD: " + dados.mfd : ""));
    carregarNotas();
}

// ============================================================
// MARCAR FALTAS
// ============================================================
async function carregarFaltas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-faltas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    const turma = dadosProf.turmas[idx];
    const container = document.getElementById("tabela-faltas");
    container.innerHTML = '<div class="cursos-loader-container" style="padding:40px;"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turma.ano_lectivo,
        p_classe: turma.classe,
        p_turma: turma.turma,
        p_disciplina: turma.disciplina
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>';
        return;
    }

    const alunos = dados.alunos || [];
    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    let html = '<table class="tabela-notas">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">Acção</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        html += '<tr>';
        html += '<td class="aluno-nome-cell"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></td>';
        html += '<td class="centro"><button class="falta-btn" data-falta-idx="' + idx + '">+ Falta hoje</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll("[data-falta-idx]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = parseInt(this.getAttribute("data-falta-idx"), 10);
            marcarFalta(alunos[i], turma);
        });
    });
}

async function marcarFalta(aluno, turma) {
    const token = obterToken();
    const hoje = new Date();
    const data = hoje.toISOString().slice(0, 10);
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mes = meses[hoje.getMonth()];

    const justificada = confirm("Marcar como justificada?\n\nOK = Justificada\nCancelar = Não justificada");

    const dados = await chamarRPC("cesc_professor_marcar_falta", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turma.disciplina,
        p_mes: mes,
        p_data: data,
        p_justificada: justificada
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao marcar falta.");
        return;
    }

    alert("Falta registada para " + aluno.nome_completo + ".");
}
```

---

Como testar

1. Coloca os 3 ficheiros nas pastas certas:
   · admin/professor.html
   · admin/css/professor.css
   · admin/scripts/professor.js
2. Confirma que o api.js está em scripts/api.js (na raiz do C_E_S_C/). A página carrega ../scripts/api.js.
3. Inicia o servidor:

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
python3 -m http.server 8080
```

4. Faz login com o professor António Silva:
   · Vai a http://localhost:8080/paginas/login.html
   · Email: antonio.silva@cesc.ao
   · Password: prof123
   · Recebe o código por e-mail (ou vai ao Render/Brevo ver o código)
   · Insere o código

Problema: o login.js ainda não redireciona o professor para admin/professor.html. Vai redirecionar para area-aluno.html (que ainda não existe na pasta paginas/ — não sei onde está).

Solução temporária: depois de fazer login, vai manualmente a:

```
http://localhost:8080/admin/professor.html
```

O professor.js vai validar o token, chamar cesc_professor_dashboard e carregar.

5. O que deves ver:
   · Sidebar com "CESC · Área do Professor", nome do António, departamento "Matemática".
   · Visão Geral com 1 turma e 43 alunos (12ª A Matemática).
   · Clica em "Minhas Turmas" → vê o card da turma.
   · Clica em "Lançar Notas" → vê a tabela de alunos.
   · Expande um aluno → vê as avaliações contínuas + campo NPT.

Teste com o aluno de teste (Aluno Teste Silva, BI 000111222LA042):

· Adiciona uma avaliação (ex: nota 17, "Teste 1").
· Adiciona outra (ex: nota 15, "Trabalho").
· Vê a MAC a atualizar para 16.0.
· Insere NPT 14 → vê MT = 15.0.
· Tenta adicionar outra avaliação → deve recusar (trimestre fechado).

---

Testa e diz-me:

· A página carrega?
· A turma aparece?
· Consegues expandir um aluno e adicionar avaliações?
· O bloqueio do trimestre funciona?

Se estiver tudo bem, o próximo passo é ajustar o login.js para redirecionar o professor para admin/professor.html automaticamente.
Boa pergunta. Vou explicar passo a passo, porque há três coisas a testar e cada uma depende da anterior.

---

O que está a acontecer

Tens três ficheiros novos em admin/:

· admin/professor.html
· admin/css/professor.css
· admin/scripts/professor.js

Mas para os testar, precisas de:

1. Um servidor HTTP a correr (para o browser carregar os ficheiros).
2. Um token válido (para o professor.js saber que estás autenticado como professor).
3. Abrir o professor.html com esse token no sessionStorage.

O problema: o login.js ainda não redireciona o professor para admin/professor.html. Quando fazes login com antonio.silva@cesc.ao, ele redireciona para area-aluno.html (que provavelmente não existe na pasta paginas/). E o professor.html não sabe que estás autenticado.

Vou dar-te três formas de testar. A primeira é a mais simples. As outras duas são mais realistas.

---

Forma 1 — O caminho completo (recomendado)

Isto implica duas alterações no login e depois testar tudo junto. É o mais próximo do que vai acontecer na vida real.

Passo 1 — Alterar o login.js (o que faz login actualmente)

Abre paginas/login.js e procura a função que corre após validação do código com sucesso (a que faz window.location.href = "area-aluno.html" ou similar).

Substitui essa linha por:

```javascript
// Após validar o código, verificar o role e redirecionar
const perfil = await chamarRPC("cesc_perfil_role", { p_token: dados.token });

if (perfil.ok) {
    if (perfil.role === "professor") {
        window.location.href = "../admin/professor.html";
    } else if (perfil.role === "aluno") {
        window.location.href = "area-aluno.html";
    } else {
        // diretor, secretaria, coordenador — para já vão para a área do aluno
        window.location.href = "area-aluno.html";
    }
} else {
    window.location.href = "area-aluno.html";
}
```

Nota: o login.js actual usa a chave SUPABASE_ANON_KEY (do CESC). Confirma que esse ficheiro tem essa constante declarada. Se não tiver, o chamarRPC do api.js não vai funcionar.

Se o login.js do CESC não tem o api.js carregado, tens de acrescentar no login.html:

```html
<script src="../scripts/api.js"></script>
<script src="../scripts/login.js"></script>
```

Isto é o passo mais importante. Sem ele, o professor nunca vai para admin/professor.html.

Passo 2 — Iniciar o servidor

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
python3 -m http.server 8080
```

Deixa o servidor a correr num terminal. Não feches.

Passo 3 — Fazer login

Abre no browser:

```
http://localhost:8080/paginas/login.html
```

Faz login com:

· Email: antonio.silva@cesc.ao
· Password: prof123
· Clica "Receber código"
· Vai ao teu Gmail (ou ao log do Render) e copia o código de 6 dígitos
· Insere o código e clica "Entrar"

O que esperar: com o login.js alterado, deves ser redirecionado automaticamente para admin/professor.html.

Se fores para area-aluno.html, significa que o login.js não foi alterado correctamente, ou o cesc_perfil_role não está a devolver role: "professor".

Passo 4 — Confirmar que estás na página certa

Se tudo correu bem, deves ver:

· Sidebar com "CESC · Área do Professor"
· Nome "António Silva" e "Matemática"
· Cards com 1 turma e 43 alunos
· Menu: Visão Geral, Minhas Turmas, Lançar Notas, Marcar Faltas, Perfil

---

Forma 2 — Sem alterar o login.js (truque)

Se não quiseres alterar o login.js agora, podes fazer login como aluno, e depois mudar o token manualmente no browser para o do professor.

Passo 1 — Iniciar o servidor

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
python3 -m http.server 8080
```

Passo 2 — Fazer login como aluno (para obter um token válido)

```
http://localhost:8080/paginas/login.html
```

Usa o aluno de teste:

· Email: aluno.teste@cesc.ao
· Password: 123456
· Recebe o código (vai ao Gmail/log do Render)

Após login, o sessionStorage tem um token.

Passo 3 — Abrir o admin/professor.html e substituir o token

Abre a consola do browser (F12 → Console) e cola isto:

```javascript
// Guardar o email e password do professor
const emailProf = "antonio.silva@cesc.ao";
const passProf = "prof123";

// Fazer login via fetch para obter o token do professor
fetch("https://kmdixtzvnhvtwkpsicoq.supabase.co/rest/v1/rpc/cesc_login_password", {
    method: "POST",
    headers: {
        "apikey": "sb_publishable_NtqePgTlOPZsx3DuC40bfg_lu6CKrs9",
        "Authorization": "Bearer sb_publishable_NtqePgTlOPZsx3DuC40bfg_lu6CKrs9",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_email: emailProf, p_password: passProf })
}).then(r => r.json()).then(d => {
    if (!d.ok) { console.error("Login falhou:", d.erro); return; }
    console.log("Código:", d.codigo);
    // Vai ao teu email e pega o código. Depois corre:
    // window._codigo = "123456"; // substitui pelo código real
}).catch(e => console.error(e));
```

O que vais ver na consola:

```
Código: 482913
```

Esse é o código que foi enviado para o email do professor.

Passo 4 — Validar o código e guardar o token

Ainda na consola, cola isto (substitui o código pelo que recebeste):

```javascript
fetch("https://kmdixtzvnhvtwkpsicoq.supabase.co/rest/v1/rpc/cesc_validar_codigo", {
    method: "POST",
    headers: {
        "apikey": "sb_publishable_NtqePgTlOPZsx3DuC40bfg_lu6CKrs9",
        "Authorization": "Bearer sb_publishable_NtqePgTlOPZsx3DuC40bfg_lu6CKrs9",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_email: emailProf, p_codigo: "COLOCA_O_CODIGO_AQUI" })
}).then(r => r.json()).then(d => {
    if (!d.ok) { console.error("Falhou:", d.erro); return; }
    sessionStorage.setItem("cesc_token", d.token);
    console.log("Token guardado. A recarregar...");
    window.location.reload();
});
```

O que esperar: o browser recarrega e a página admin/professor.html carrega com o token do professor. Deves ver "Área do Professor" com o nome do António.

---

Forma 3 — Só para ver a página (sem autenticação)

Se só queres ver a interface, sem te preocupares com o token:

1. Inicia o servidor:

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
python3 -m http.server 8080
```

2. Abre directamente:

```
http://localhost:8080/admin/professor.html
```

O que vais ver: a página vai tentar carregar, mas como não há token, o exigirLogin() do api.js vai redirecionar para login.html. Não vais ver nada.

Conclusão: a Forma 3 não funciona sem token. Usa a Forma 1 ou 2.

---

Qual escolher?

Forma O que faz Trabalho
1 Altera o login.js para redirecionar o professor 5 minutos de edição + teste completo
2 Truque na consola para obter token do professor Sem alterações, mas mais cliques
3 Não funciona ❌

Recomendo a Forma 1. É a mais realista e prepara o sistema para quando tiveres secretaria, diretor, etc. Só precisas de alterar uma linha no login.js.

---

O que preciso de ti

Confirma:

1. Tens o login.js do CESC? (Sim/Não)
2. O login.html já carrega o api.js? Abre o login.html e vê se tem <script src="../scripts/api.js"></script> antes do login.js.
3. A pasta scripts/ do CESC tem o api.js? (Sim/Não)

Se responderes "Sim" às três, altera o login.js (Forma 1) e testa. Se der erro, cola-me o log da consola (F12).

Se o login.js não carrega o api.js, temos de corrigir isso primeiro. Diz-me e eu ajudo.


Percebido. O CESC tem auth.js (não login.js). Vou dar-te a alteração mínima e o caminho de teste.

---

O que está a acontecer agora

No auth.js, quando o código é validado com sucesso, faz:

```javascript
if (dados.ok && dados.token) {
    guardarToken(dados.token);
    window.location.href = "dashboard.html";   // ← sempre para o dashboard do aluno
}
```

Isto é o problema. O professor faz login e vai parar ao dashboard.html (área do aluno). Tem de ir para ../admin/professor.html.

---

A correção — alterar o auth.js

Procura a função validarCodigo. Substitui o bloco do sucesso por este:

```javascript
    if (dados.ok && dados.token) {
        guardarToken(dados.token);

        // Verificar o role do utilizador e redirecionar
        const perfil = await chamarRPC("cesc_perfil_role", { p_token: dados.token });

        if (perfil.ok && perfil.role === "professor") {
            window.location.href = "../admin/professor.html";
        } else if (perfil.ok && (perfil.role === "diretor" || perfil.role === "sub_diretor" || perfil.role === "secretaria" || perfil.role === "coordenador")) {
            // Páginas que ainda não existem. Por agora, mandar para o dashboard do aluno.
            window.location.href = "dashboard.html";
        } else {
            // Aluno
            window.location.href = "dashboard.html";
        }
    } else {
        mostrarErroAuth("msg-erro-2", dados.erro || "Código inválido ou expirado.");
    }
```

Nota: os window.location.href estão relativos à página onde o script corre. Como o auth.js corre dentro de paginas/login.html, o caminho ../admin/professor.html está correcto (sobe um nível e entra em admin/).

---

Como testar — passo a passo

1. Iniciar o servidor

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
python3 -m http.server 8080
```

Deixa o terminal aberto. Se fechares, o site deixa de funcionar.

Aviso: se já tens outro servidor a correr na porta 8080 (por exemplo, o do AnaJunju ou o do ProjectoTclabsPage), usa outra porta:

```bash
python3 -m http.server 8090
```

E depois adapta os URLs (http://localhost:8090/...).

2. Fazer login como professor

Abre no browser:

```
http://localhost:8080/paginas/login.html
```

Preenche:

· Email: antonio.silva@cesc.ao
· Password: prof123
· Clica em "Receber código de acesso"

O que vai acontecer:

· O auth.js chama a Edge Function enviar-codigo.
· A Edge Function valida a password (via cesc.verificar_password_cesc).
· Gera um código de 6 dígitos.
· Envia o código por e-mail via Render/Brevo (para antonio.silva@cesc.ao, que é fictício).

⚠️ Atenção: o e-mail antonio.silva@cesc.ao é fictício. O Render não vai conseguir entregar o e-mail (não existe domínio cesc.ao). O envio pode falhar, ou o código vai para o vazio.

Para contornar isto:

Opção A — Ver o código no log do Render. O Render imprime no log o que tentou enviar. Vai ao painel do Render → serviço tclabs-email-api → Logs. Procura o código.

Opção B — Obter o código via consola do browser. Antes de clicar em "Receber código", abre a consola (F12) e escreve:

```javascript
const _origChamarEdge = chamarEdge;
chamarEdge = async function(nome, body) {
    const r = await _origChamarEdge(nome, body);
    if (r && r.codigo) console.log("CÓDIGO:", r.codigo);
    return r;
};
```

Depois clica em "Receber código". O código aparece na consola. Não é seguro para produção (porque a Edge Function não devolve o código na versão real). Mas na versão actual da Edge Function do CESC, o código é devolvido na resposta? Vamos ver:

A Edge Function actual (que te dei antes) devolve {"ok": true} sem código. Portanto a consola não vai mostrar código.

Opção C — Alterar temporariamente a Edge Function para devolver o código. Não recomendado para produção, mas para testar:

Na Edge Function enviar-codigo, na resposta final, acrescenta o código:

```typescript
return new Response(
    JSON.stringify({ ok: true, codigo: codigo }),  // <-- acrescentar codigo
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

Depois de fazer deploy, a consola mostra o código no log do chamarEdge. Depois remove o codigo da resposta.

Opção D — Usar o e-mail real do Francisco. Mas o e-mail franciscotchiama9@gmail.com está registado como aluno na tabela cesc.utilizadores, não como professor. Se fizeres login com ele, vais para o dashboard do aluno.

Opção E — Pedir ao Render para enviar o e-mail para o teu Gmail real, mas com o email do professor como destinatário "virtual". Isto exige alterar o Render para aceitar to diferente do email autenticado. Complexo para testar agora.

Recomendo a Opção C (temporária) para testar o fluxo. Depois reverte.

3. Com o código em mãos

Insere o código no ecrã 2 e clica "Entrar".

O que vai acontecer:

· O auth.js chama cesc_validar_codigo.
· Guarda o token em sessionStorage.
· Chama cesc_perfil_role com o token.
· Recebe {"ok": true, "role": "professor", "nome": "António Silva"}.
· Redireciona para ../admin/professor.html.

4. Ver a página do professor

O professor.js vai:

1. Chamar exigirLogin() — vê o token em sessionStorage → OK.
2. Chamar cesc_professor_dashboard.
3. Recebe o professor + turmas.
4. Renderiza tudo.

O que deves ver:

· Sidebar com "Área do Professor" + nome "António Silva" + "Matemática".
· Visão Geral com 1 turma e 43 alunos.
· Menu com 5 secções.

---

Resumo do que fazer

1. Alterar o auth.js (substituir o bloco de sucesso do validarCodigo).
2. Alterar a Edge Function (acrescentar codigo na resposta — temporário).
3. Iniciar o servidor (python3 -m http.server 8080).
4. Login com antonio.silva@cesc.ao / prof123.
5. Copiar o código da consola.
6. Inserir o código.
7. Ver a página do professor.

---

Diz-me:

1. Alteraste o auth.js?
2. Conseguiste obter o código (via consola, log do Render, ou Opção C)?
3. Chegaste à página admin/professor.html?

Se algum passo falhar, cola-me o log da consola (F12 → Console).
Boa ideia. Isso resolve o problema do e-mail fictício para testar.

Atenção: o tclabs.suporte@gmail.com é um Gmail real, então consegues receber o código. Mas tens de fazer duas coisas:

1. Criar o utilizador professor com esse e-mail (não com antonio.silva@cesc.ao).
2. Alterar o Render (ou a Edge Function) para deixar de verificar app_name = 'CESC' de forma restritiva e aceitar este e-mail.

Vou dar-te os passos.

---

Passo 1 — Criar utilizador professor com tclabs.suporte@gmail.com

Corre isto no SQL Editor do Supabase:

```sql
-- Criar utilizador professor com o e-mail real
INSERT INTO cesc.utilizadores (email, nome_completo, role, password_hash, ativo)
VALUES (
    'tclabs.suporte@gmail.com',
    'Prof. Teste (Suporte TCLabs)',
    'professor',
    crypt('prof123', gen_salt('bf')),
    true
)
ON CONFLICT (email) DO UPDATE 
SET password_hash = crypt('prof123', gen_salt('bf')), role = 'professor';

-- Criar o perfil de professor ligado a esse utilizador
INSERT INTO cesc.professores (utilizador_id, departamento, is_coordenador)
SELECT id, 'Matemática', false
FROM cesc.utilizadores 
WHERE email = 'tclabs.suporte@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Atribuir a disciplina Matemática, 12ª A, 2025/2026
INSERT INTO cesc.professores_disciplinas (professor_id, disciplina, ano_lectivo, classe, turma)
SELECT p.id, 'Matemática', '2025/2026', '12ª Classe', 'A'
FROM cesc.professores p
JOIN cesc.utilizadores u ON p.utilizador_id = u.id
WHERE u.email = 'tclabs.suporte@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM cesc.professores_disciplinas pd
    WHERE pd.professor_id = p.id 
      AND pd.disciplina = 'Matemática'
      AND pd.ano_lectivo = '2025/2026'
);

-- Confirmar
SELECT u.email, u.nome_completo, u.role, 
       p.id AS professor_id, p.departamento,
       (SELECT count(*) FROM cesc.professores_disciplinas pd WHERE pd.professor_id = p.id) AS atribuicoes
FROM cesc.utilizadores u
LEFT JOIN cesc.professores p ON p.utilizador_id = u.id
WHERE u.email = 'tclabs.suporte@gmail.com';
```

O que esperar: 1 linha com role = 'professor', departamento = 'Matemática', atribuicoes = 1.

---

Passo 2 — Verificar o Render (endpoint /send-email)

A Edge Function enviar-codigo chama o Render (tclabs-email-api). O Render verifica se o destinatário existe em três sítios:

· public.users (Kandamy) com app_name = 'Kandamy'
· cesc.utilizadores (CESC)
· cursos.utilizadores (TCLabsCursos)

O problema: o e-mail tclabs.suporte@gmail.com está agora em cesc.utilizadores, mas o Render só verifica app_name = 'Kandamy' em public.users e cesc.utilizadores (sem filtro de app_name, verifica todos os registos da tabela).

Se o Render estiver configurado corretamente (versão 1.3), ele já encontra o e-mail em cesc.utilizadores. Deve funcionar.

Mas há uma questão que precisas de confirmar: o Render está a enviar para tclabs.suporte@gmail.com porque a Edge Function passa to: email (o e-mail que o utilizador inseriu no login). Se o utilizador inserir tclabs.suporte@gmail.com no login, o Render recebe esse to. E o Render valida em cesc.utilizadores → encontra → envia via Brevo.

Então, à partida, funciona. Faz o teste.

---

Passo 3 — Testar o login

1. Inicia o servidor:

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
python3 -m http.server 8080
```

2. Abre:

```
http://localhost:8080/paginas/login.html
```

3. Faz login com:

· Email: tclabs.suporte@gmail.com
· Password: prof123

4. Clica "Receber código de acesso".

O que deve acontecer:

· auth.js → chamarEdge("enviar-codigo", {email, password})
· Edge Function → valida a password em cesc.utilizadores → gera código → chama Render
· Render → verifica em cesc.utilizadores → encontra → chama Brevo
· Brevo → envia o e-mail para tclabs.suporte@gmail.com
· Verifica a caixa de entrada do tclabs.suporte@gmail.com — deve chegar o e-mail com o código.

5. Insere o código no ecrã 2.

O que deve acontecer:

· auth.js → chamarRPC("cesc_validar_codigo", ...) → devolve token
· auth.js → chamarRPC("cesc_perfil_role", ...) → devolve role: "professor"
· auth.js → redireciona para ../admin/professor.html

6. Ver a página do professor.

---

Se o e-mail não chegar

Diagnóstico:

1. Vai ao painel do Render (dashboard.render.com) → serviço tclabs-email-api → Logs.
2. Procura linhas recentes. Vais ver algo como:
   ```
   existe_utilizador(tclabs.suporte@gmail.com) -> false
   Email nao registado: tclabs.suporte@gmail.com
   ```
   ou
   ```
   Brevo erro: 400 { ... }
   ```

Se aparecer "Email nao registado": o Render não encontrou o e-mail em cesc.utilizadores. Isto pode acontecer se:

· A SUPABASE_SERVICE_ROLE_KEY não está configurada no Render.
· O Render ainda tem a versão 1.2 (que só verifica public.users).

Solução: confirma a versão no Render. No painel → serviço → vê o ficheiro server.js → deve ter o bloco que verifica cesc.utilizadores (versão 1.3).

Se aparecer "Brevo erro": o Brevo rejeitou o envio. Verifica se o tclabs.suporte@gmail.com está autorizado como remetente no Brevo (ou se o plano é válido).

---

Resumo do que fazer

1. Corre o SQL do Passo 1 (criar professor com tclabs.suporte@gmail.com).
2. Confirma que o Render é a versão 1.3 (verifica cesc.utilizadores).
3. Inicia o servidor.
4. Faz login com tclabs.suporte@gmail.com / prof123.
5. Verifica o Gmail de tclabs.suporte@gmail.com.
6. Insere o código.
7. Confirma que cai no admin/professor.html.

Corre os passos e diz-me:

· O SQL do Passo 1 deu erro?
· O e-mail chegou?
· Entraste na página do professor?O ficheiro professor.js está colado duas vezes seguidas. Repara:

```javascript
// ... primeira cópia completa ...

async function marcarFalta(aluno, turma) {
    // ...
    alert("Falta registada para " + aluno.nome_completo + ".");
}/* CESC - Área do professor
 Data: 21/10/2026

// ... segunda cópia começa aqui ...
```

Falta um } para fechar a função marcarFalta e, em vez disso, o comentário /* CESC - Área do professor está colado ao } da função. Isso faz com que o ficheiro tenha a estrutura errada, resultando em duas declarações de dadosProf.

---

Solução

Apaga o admin/scripts/professor.js inteiro e cola uma única cópia do código. Aqui está o ficheiro completo, sem duplicação, pronto a colar:

```javascript
/*
 CESC - Área do professor
 Data: 21/10/2026

 - Valida token e role (professor).
 - Carrega dados do professor (turmas).
 - Lançar notas: tabela expansível com avaliações contínuas + NPT.
 - Marcar faltas.
 */

let dadosProf = null;
let turmaActualNotas = null;
let trimestreActual = 1;

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
    const token = exigirLogin();
    if (!token) return;

    // Sidebar mobile
    const menuBtn = document.getElementById("menuMobileBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarFechar = document.getElementById("sidebarFechar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuBtn) menuBtn.addEventListener("click", function () {
        sidebar.classList.add("aberta");
        overlay.classList.add("ativo");
    });
    if (sidebarFechar) sidebarFechar.addEventListener("click", fecharSidebar);
    if (overlay) overlay.addEventListener("click", fecharSidebar);

    function fecharSidebar() {
        sidebar.classList.remove("aberta");
        overlay.classList.remove("ativo");
    }

    // Navegação
    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (item) {
        item.addEventListener("click", function (e) {
            e.preventDefault();
            mostrarSeccao(item.getAttribute("data-seccao"));
            fecharSidebar();
        });
    });

    // Sair
    const linkSair = document.getElementById("link-sair");
    if (linkSair) {
        linkSair.addEventListener("click", function (e) {
            e.preventDefault();
            fazerLogout();
        });
    }

    // Carregar dados do professor
    const dados = await chamarRPC("cesc_professor_dashboard", { p_token: token });

    if (!dados.ok) {
        if (dados.erro && dados.erro.indexOf("autorizado") !== -1) {
            window.location.href = "../paginas/dashboard.html";
            return;
        }
        document.getElementById("loader").innerHTML =
            '<p style="color:var(--cor-erro);">' + esc(dados.erro || "Erro ao carregar.") + '</p>';
        return;
    }

    dadosProf = dados;
    renderizarTudo(dados);
    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";
});

// ============================================================
// NAVEGAÇÃO
// ============================================================
function mostrarSeccao(id) {
    document.querySelectorAll(".pagina-seccao").forEach(function (s) {
        s.classList.remove("ativa");
    });
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (n) {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// RENDERIZAÇÃO INICIAL
// ============================================================
function renderizarTudo(dados) {
    const prof = dados.professor;
    const turmas = dados.turmas || [];

    const inicial = (prof.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("prof-avatar").textContent = inicial;
    document.getElementById("prof-nome-sidebar").textContent = prof.nome_completo;
    document.getElementById("prof-dept-sidebar").textContent = prof.departamento || "—";

    const primeiroNome = prof.nome_completo.split(" ")[0];
    document.getElementById("boas-vindas").textContent = "Bem-vindo de volta, " + primeiroNome + ".";

    document.getElementById("stat-turmas").textContent = turmas.length;
    const totalAlunos = turmas.reduce(function (s, t) { return s + (t.total_alunos || 0); }, 0);
    document.getElementById("stat-alunos").textContent = totalAlunos;
    document.getElementById("stat-notas").textContent = "—";

    const listaVG = document.getElementById("lista-turmas-visao-geral");
    if (turmas.length === 0) {
        listaVG.innerHTML = '<p style="color:var(--cor-texto-suave); font-size:0.9rem;">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t) {
            html += '<div class="info-linha">';
            html += '<span class="rotulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + ' · ' + esc(t.disciplina) + '</span>';
            html += '<span class="valor">' + (t.total_alunos || 0) + ' alunos</span>';
            html += '</div>';
        });
        listaVG.innerHTML = html;
    }

    const listaTurmas = document.getElementById("lista-turmas");
    if (turmas.length === 0) {
        listaTurmas.innerHTML = '<p style="color:var(--cor-texto-suave);">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t, idx) {
            html += '<div class="turma-card">';
            html += '  <h3 class="turma-card-titulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + '</h3>';
            html += '  <p class="turma-card-meta">' + esc(t.disciplina) + ' · ' + esc(t.ano_lectivo) + '<br>' + (t.total_alunos || 0) + ' alunos</p>';
            html += '  <div class="turma-card-acoes">';
            html += '    <button onclick="irParaNotas(' + idx + ')">Lançar notas</button>';
            html += '    <button onclick="irParaFaltas(' + idx + ')">Marcar faltas</button>';
            html += '  </div>';
            html += '</div>';
        });
        listaTurmas.innerHTML = html;
    }

    const selNotas = document.getElementById("sel-turma-notas");
    const selFaltas = document.getElementById("sel-turma-faltas");
    [selNotas, selFaltas].forEach(function (sel) {
        if (!sel) return;
        sel.innerHTML = "";
        turmas.forEach(function (t, idx) {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = t.classe + " · " + t.turma + " · " + t.disciplina;
            sel.appendChild(opt);
        });
        sel.addEventListener("change", function () {
            if (sel === selNotas) carregarNotas();
            else carregarFaltas();
        });
    });

    const selTrim = document.getElementById("sel-trimestre");
    if (selTrim) {
        selTrim.addEventListener("change", function () {
            trimestreActual = parseInt(this.value, 10);
            carregarNotas();
        });
    }

    const perfil = document.getElementById("lista-perfil");
    let html = '<div class="card-info"><h3><i class="fas fa-user"></i> Dados</h3>';
    html += linhaInfo("Nome", prof.nome_completo);
    html += linhaInfo("Email", prof.email);
    html += linhaInfo("Departamento", prof.departamento);
    html += linhaInfo("Turmas", turmas.length);
    html += '</div>';
    perfil.innerHTML = html;
}

function linhaInfo(rotulo, valor) {
    return '<div class="info-linha"><span class="rotulo">' + rotulo +
        '</span><span class="valor">' + (valor || "—") + '</span></div>';
}

function irParaNotas(idx) {
    document.getElementById("sel-turma-notas").value = String(idx);
    mostrarSeccao("notas");
    carregarNotas();
}

function irParaFaltas(idx) {
    document.getElementById("sel-turma-faltas").value = String(idx);
    mostrarSeccao("faltas");
    carregarFaltas();
}

// ============================================================
// LANÇAR NOTAS
// ============================================================
async function carregarNotas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-notas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    turmaActualNotas = dadosProf.turmas[idx];
    const infoEl = document.getElementById("notas-info");
    infoEl.style.display = "block";
    infoEl.textContent = "A carregar alunos...";

    const tabelaEl = document.getElementById("tabela-notas");
    tabelaEl.innerHTML = "";

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turmaActualNotas.ano_lectivo,
        p_classe: turmaActualNotas.classe,
        p_turma: turmaActualNotas.turma,
        p_disciplina: turmaActualNotas.disciplina
    });

    if (!dados.ok) {
        infoEl.textContent = dados.erro || "Erro ao carregar alunos.";
        return;
    }

    const alunos = dados.alunos || [];
    infoEl.textContent = alunos.length + " alunos em " + turmaActualNotas.classe + " · Turma " + turmaActualNotas.turma + " (" + turmaActualNotas.disciplina + ")";

    renderizarTabelaNotas(alunos);
}

function renderizarTabelaNotas(alunos) {
    const container = document.getElementById("tabela-notas");
    if (!container) return;

    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    let html = '<table class="tabela-notas">';
    html += '<thead><tr>';
    html += '  <th class="col-expandir"></th>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">MAC</th>';
    html += '  <th class="centro">NPT</th>';
    html += '  <th class="centro">MT</th>';
    html += '  <th class="centro">MFD</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const notas = (a.notas || []).find(function (n) { return n.trimestre === trimestreActual; }) || {};
        const mac = notas.mac;
        const npt = notas.npt;
        const mt = notas.mt;
        const mfd = notas.mfd;

        html += '<tr data-aluno-idx="' + idx + '">';
        html += '  <td class="col-expandir">';
        html += '    <button class="btn-expandir" data-expandir="' + idx + '"><i class="fas fa-chevron-right"></i></button>';
        html += '  </td>';
        html += '  <td class="aluno-nome-cell">';
        html += '    <strong>' + esc(a.nome_completo) + '</strong>';
        html += '    <span>BI: ' + esc(a.bi_numero) + ' · Nº ' + (a.numero_aluno || "—") + '</span>';
        html += '  </td>';
        html += '  <td class="celula-nota ' + (mac == null ? "vazia" : "") + '">' + (mac != null ? Number(mac).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (npt == null ? "vazia" : "") + '">' + (npt != null ? Number(npt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mt == null ? "vazia" : "") + '">' + (mt != null ? Number(mt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mfd == null ? "vazia" : "") + '">' + (mfd != null ? Number(mfd).toFixed(1) : "—") + '</td>';
        html += '</tr>';

        html += '<tr class="linha-expandida" data-expandida="' + idx + '" style="display:none;"><td colspan="6">';
        html += '  <div class="expandido-conteudo" data-conteudo="' + idx + '">A carregar...</div>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll("[data-expandir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = this.getAttribute("data-expandir");
            const linha = container.querySelector('[data-expandida="' + idx + '"]');
            const estaAberta = linha.style.display !== "none";
            if (estaAberta) {
                linha.style.display = "none";
                btn.classList.remove("expandido");
            } else {
                linha.style.display = "table-row";
                btn.classList.add("expandido");
                carregarExpandido(alunos[parseInt(idx, 10)], parseInt(idx, 10));
            }
        });
    });
}

async function carregarExpandido(aluno, idx) {
    const token = obterToken();
    const container = document.querySelector('[data-conteudo="' + idx + '"]');
    if (!container) return;

    const dados = await chamarRPC("cesc_professor_listar_avaliacoes", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual
    });

    if (!dados.ok) {
        container.innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>';
        return;
    }

    const avaliacoes = dados.avaliacoes || [];
    const fechado = dados.fechado;

    let soma = 0;
    avaliacoes.forEach(function (a) { soma += Number(a.nota); });
    const mac = avaliacoes.length > 0 ? (soma / avaliacoes.length).toFixed(2) : null;

    let html = '<div class="expandido-cabecalho">';
    html += '<div class="expandido-titulo"><i class="fas fa-list-check"></i> Avaliações contínuas';
    if (mac !== null) html += ' <span class="mac-valor">MAC: ' + mac + '</span>';
    html += '</div>';
    if (fechado) {
        html += '<span style="font-size:0.8rem; color:var(--cor-texto-leve); font-style:italic;">Trimestre fechado — não editável</span>';
    } else {
        html += '<button class="btn-adicionar-avaliacao" data-add="' + idx + '"><i class="fas fa-plus"></i> Adicionar avaliação</button>';
    }
    html += '</div>';

    if (avaliacoes.length === 0) {
        html += '<div class="avaliacoes-vazio">Ainda sem avaliações contínuas neste trimestre.</div>';
    } else {
        html += '<div class="lista-avaliacoes">';
        avaliacoes.forEach(function (av) {
            html += '<div class="avaliacao-item">';
            html += '  <span class="av-desc">' + esc(av.descricao || "Avaliação") + '</span>';
            html += '  <span class="av-nota">' + Number(av.nota).toFixed(1) + '</span>';
            if (!fechado) {
                html += '  <button class="av-remover" data-remover="' + av.id + '" data-aluno-idx="' + idx + '"><i class="fas fa-trash"></i></button>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    html += '<div class="form-nova-avaliacao" data-form="' + idx + '" style="display:none;">';
    html += '  <div class="campo-grupo">';
    html += '    <label>Nota (0-20)</label>';
    html += '    <input type="number" min="0" max="20" step="0.1" data-input-nota="' + idx + '">';
    html += '  </div>';
    html += '  <div class="campo-grupo">';
    html += '    <label>Descrição</label>';
    html += '    <input type="text" placeholder="Ex: Teste 1" data-input-desc="' + idx + '">';
    html += '  </div>';
    html += '  <button class="btn-confirmar" data-confirmar="' + idx + '">Adicionar</button>';
    html += '  <button class="btn-cancelar" data-cancelar="' + idx + '">Cancelar</button>';
    html += '</div>';

    if (!fechado) {
        const nptActual = (aluno.notas || []).find(function (n) { return n.trimestre === trimestreActual; });
        html += '<div style="border-top:1px solid var(--cor-borda); padding-top:16px; margin-top:8px;">';
        html += '<div class="expandido-titulo" style="margin-bottom:12px;"><i class="fas fa-clipboard-check"></i> Nota da Prova Trimestral (NPT)</div>';
        html += '<div class="npt-wrapper" style="flex-direction:row; align-items:center; gap:8px;">';
        html += '<input type="number" min="0" max="20" step="0.1" data-input-npt="' + idx + '" placeholder="NPT" value="' + (nptActual && nptActual.npt != null ? nptActual.npt : "") + '">';
        html += '<button class="btn-lancar-npt" data-lancar-npt="' + idx + '">Lançar NPT e fechar trimestre</button>';
        html += '</div>';
        html += '</div>';
    }

    container.innerHTML = html;

    const addBtn = container.querySelector('[data-add="' + idx + '"]');
    const formEl = container.querySelector('[data-form="' + idx + '"]');
    if (addBtn && formEl) {
        addBtn.addEventListener("click", function () {
            formEl.style.display = formEl.style.display === "none" ? "flex" : "none";
        });
    }

    const confirmarBtn = container.querySelector('[data-confirmar="' + idx + '"]');
    if (confirmarBtn) {
        confirmarBtn.addEventListener("click", function () {
            adicionarAvaliacao(aluno, idx);
        });
    }

    const cancelarBtn = container.querySelector('[data-cancelar="' + idx + '"]');
    if (cancelarBtn && formEl) {
        cancelarBtn.addEventListener("click", function () {
            formEl.style.display = "none";
        });
    }

    container.querySelectorAll("[data-remover]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (confirm("Remover esta avaliação?")) {
                removerAvaliacao(this.getAttribute("data-remover"), aluno, idx);
            }
        });
    });

    const lancarNptBtn = container.querySelector('[data-lancar-npt="' + idx + '"]');
    if (lancarNptBtn) {
        lancarNptBtn.addEventListener("click", function () {
            lancarNPT(aluno, idx);
        });
    }
}

async function adicionarAvaliacao(aluno, idx) {
    const token = obterToken();
    const notaInput = document.querySelector('[data-input-nota="' + idx + '"]');
    const descInput = document.querySelector('[data-input-desc="' + idx + '"]');
    const nota = parseFloat(notaInput.value);
    const desc = descInput.value.trim() || "Avaliação";

    if (isNaN(nota) || nota < 0 || nota > 20) {
        alert("Nota inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_adicionar_avaliacao", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_nota: nota,
        p_descricao: desc
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao adicionar avaliação.");
        return;
    }

    carregarExpandido(aluno, idx);
    carregarNotas();
}

async function removerAvaliacao(avaliacaoId, aluno, idx) {
    const token = obterToken();
    const dados = await chamarRPC("cesc_professor_remover_avaliacao", {
        p_token: token,
        p_avaliacao_id: avaliacaoId
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao remover.");
        return;
    }

    carregarExpandido(aluno, idx);
    carregarNotas();
}

async function lancarNPT(aluno, idx) {
    const token = obterToken();
    const inputNpt = document.querySelector('[data-input-npt="' + idx + '"]');
    const npt = parseFloat(inputNpt.value);

    if (isNaN(npt) || npt < 0 || npt > 20) {
        alert("NPT inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_lancar_npt", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_npt: npt
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao lançar NPT.");
        return;
    }

    alert("NPT lançada. MAC: " + dados.mac + ", MT: " + dados.mt + (dados.mfd != null ? ", MFD: " + dados.mfd : ""));
    carregarNotas();
}

// ============================================================
// MARCAR FALTAS
// ============================================================
async function carregarFaltas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-faltas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    const turma = dadosProf.turmas[idx];
    const container = document.getElementById("tabela-faltas");
    container.innerHTML = '<div class="cursos-loader-container" style="padding:40px;"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turma.ano_lectivo,
        p_classe: turma.classe,
        p_turma: turma.turma,
        p_disciplina: turma.disciplina
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>';
        return;
    }

    const alunos = dados.alunos || [];
    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    let html = '<table class="tabela-notas">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">Acção</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        html += '<tr>';
        html += '<td class="aluno-nome-cell"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></td>';
        html += '<td class="centro"><button class="falta-btn" data-falta-idx="' + idx + '">+ Falta hoje</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll("[data-falta-idx]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = parseInt(this.getAttribute("data-falta-idx"), 10);
            marcarFalta(alunos[i], turma);
        });
    });
}

async function marcarFalta(aluno, turma) {
    const token = obterToken();
    const hoje = new Date();
    const data = hoje.toISOString().slice(0, 10);
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mes = meses[hoje.getMonth()];

    const justificada = confirm("Marcar como justificada?\n\nOK = Justificada\nCancelar = Não justificada");

    const dados = await chamarRPC("cesc_professor_marcar_falta", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turma.disciplina,
        p_mes: mes,
        p_data: data,
        p_justificada: justificada
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao marcar falta.");
        return;
    }

    alert("Falta registada para " + aluno.nome_completo + ".");
}
```

Nota: não há carregarExpandido duplicado. O ficheiro tem apenas uma função de cada. Copia este bloco inteiro de uma vez.

---

Depois de colar

1. Guarda o ficheiro.
2. Recarrega o browser (Ctrl+Shift+R ou fecha e abre novamente).
3. Vai ao admin/professor.html.
4. O erro Identifier 'dadosProf' has already been declared deve desaparecer.

Se aparecer outro erro, cola-me o log da consola. Se carregar bem, deves ver a página com o menu lateral, o teu nome e as turmas.

Confirmado: 875 linhas, 2 declarações de dadosProf. O ficheiro está mesmo duplicado. O guardar anterior não funcionou.

Vou dar-te o método mais fiável para substituir. Sem nano, sem editor do CodeStudio, sem cache. Tudo pelo terminal.

---

Passo 1 — Fazer backup do ficheiro antigo (por segurança)

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C/admin/scripts
mv professor.js professor.js.bak
```

Isto renomeia o ficheiro antigo (875 linhas) para professor.js.bak. Se algo correr mal, podes restaurar com mv professor.js.bak professor.js.

---

Passo 2 — Confirmar que o ficheiro já não existe

```bash
ls -la
```

O que esperar: vês professor.js.bak (não professor.js).

---

Passo 3 — Criar o professor.js novo, via heredoc

Este é o passo mais fiável. Copia o bloco todo e cola no terminal.

IMPORTANTE: o EOF no fim tem de estar na sua própria linha, sem espaços antes nem depois. Se não estiver, o heredoc não fecha.

```bash
cat > professor.js << 'EOF'
/*
 CESC - Área do professor
 Data: 21/10/2026

 - Valida token e role (professor).
 - Carrega dados do professor (turmas).
 - Lançar notas: tabela expansível com avaliações contínuas + NPT.
 - Marcar faltas.
 */

let dadosProf = null;
let turmaActualNotas = null;
let trimestreActual = 1;

document.addEventListener("DOMContentLoaded", async function () {
    const token = exigirLogin();
    if (!token) return;

    const menuBtn = document.getElementById("menuMobileBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarFechar = document.getElementById("sidebarFechar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuBtn) menuBtn.addEventListener("click", function () {
        sidebar.classList.add("aberta");
        overlay.classList.add("ativo");
    });
    if (sidebarFechar) sidebarFechar.addEventListener("click", fecharSidebar);
    if (overlay) overlay.addEventListener("click", fecharSidebar);

    function fecharSidebar() {
        sidebar.classList.remove("aberta");
        overlay.classList.remove("ativo");
    }

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (item) {
        item.addEventListener("click", function (e) {
            e.preventDefault();
            mostrarSeccao(item.getAttribute("data-seccao"));
            fecharSidebar();
        });
    });

    const linkSair = document.getElementById("link-sair");
    if (linkSair) {
        linkSair.addEventListener("click", function (e) {
            e.preventDefault();
            fazerLogout();
        });
    }

    const dados = await chamarRPC("cesc_professor_dashboard", { p_token: token });

    if (!dados.ok) {
        if (dados.erro && dados.erro.indexOf("autorizado") !== -1) {
            window.location.href = "../paginas/dashboard.html";
            return;
        }
        document.getElementById("loader").innerHTML =
            '<p style="color:var(--cor-erro);">' + esc(dados.erro || "Erro ao carregar.") + '</p>';
        return;
    }

    dadosProf = dados;
    renderizarTudo(dados);
    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";
});

function mostrarSeccao(id) {
    document.querySelectorAll(".pagina-seccao").forEach(function (s) {
        s.classList.remove("ativa");
    });
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (n) {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderizarTudo(dados) {
    const prof = dados.professor;
    const turmas = dados.turmas || [];

    const inicial = (prof.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("prof-avatar").textContent = inicial;
    document.getElementById("prof-nome-sidebar").textContent = prof.nome_completo;
    document.getElementById("prof-dept-sidebar").textContent = prof.departamento || "—";

    const primeiroNome = prof.nome_completo.split(" ")[0];
    document.getElementById("boas-vindas").textContent = "Bem-vindo de volta, " + primeiroNome + ".";

    document.getElementById("stat-turmas").textContent = turmas.length;
    const totalAlunos = turmas.reduce(function (s, t) { return s + (t.total_alunos || 0); }, 0);
    document.getElementById("stat-alunos").textContent = totalAlunos;
    document.getElementById("stat-notas").textContent = "—";

    const listaVG = document.getElementById("lista-turmas-visao-geral");
    if (turmas.length === 0) {
        listaVG.innerHTML = '<p style="color:var(--cor-texto-suave); font-size:0.9rem;">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t) {
            html += '<div class="info-linha">';
            html += '<span class="rotulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + ' · ' + esc(t.disciplina) + '</span>';
            html += '<span class="valor">' + (t.total_alunos || 0) + ' alunos</span>';
            html += '</div>';
        });
        listaVG.innerHTML = html;
    }

    const listaTurmas = document.getElementById("lista-turmas");
    if (turmas.length === 0) {
        listaTurmas.innerHTML = '<p style="color:var(--cor-texto-suave);">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t, idx) {
            html += '<div class="turma-card">';
            html += '  <h3 class="turma-card-titulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + '</h3>';
            html += '  <p class="turma-card-meta">' + esc(t.disciplina) + ' · ' + esc(t.ano_lectivo) + '<br>' + (t.total_alunos || 0) + ' alunos</p>';
            html += '  <div class="turma-card-acoes">';
            html += '    <button onclick="irParaNotas(' + idx + ')">Lançar notas</button>';
            html += '    <button onclick="irParaFaltas(' + idx + ')">Marcar faltas</button>';
            html += '  </div>';
            html += '</div>';
        });
        listaTurmas.innerHTML = html;
    }

    const selNotas = document.getElementById("sel-turma-notas");
    const selFaltas = document.getElementById("sel-turma-faltas");
    [selNotas, selFaltas].forEach(function (sel) {
        if (!sel) return;
        sel.innerHTML = "";
        turmas.forEach(function (t, idx) {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = t.classe + " · " + t.turma + " · " + t.disciplina;
            sel.appendChild(opt);
        });
        sel.addEventListener("change", function () {
            if (sel === selNotas) carregarNotas();
            else carregarFaltas();
        });
    });

    const selTrim = document.getElementById("sel-trimestre");
    if (selTrim) {
        selTrim.addEventListener("change", function () {
            trimestreActual = parseInt(this.value, 10);
            carregarNotas();
        });
    }

    const perfil = document.getElementById("lista-perfil");
    let html = '<div class="card-info"><h3><i class="fas fa-user"></i> Dados</h3>';
    html += linhaInfo("Nome", prof.nome_completo);
    html += linhaInfo("Email", prof.email);
    html += linhaInfo("Departamento", prof.departamento);
    html += linhaInfo("Turmas", turmas.length);
    html += '</div>';
    perfil.innerHTML = html;
}

function linhaInfo(rotulo, valor) {
    return '<div class="info-linha"><span class="rotulo">' + rotulo +
        '</span><span class="valor">' + (valor || "—") + '</span></div>';
}

function irParaNotas(idx) {
    document.getElementById("sel-turma-notas").value = String(idx);
    mostrarSeccao("notas");
    carregarNotas();
}

function irParaFaltas(idx) {
    document.getElementById("sel-turma-faltas").value = String(idx);
    mostrarSeccao("faltas");
    carregarFaltas();
}

async function carregarNotas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-notas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    turmaActualNotas = dadosProf.turmas[idx];
    const infoEl = document.getElementById("notas-info");
    infoEl.style.display = "block";
    infoEl.textContent = "A carregar alunos...";

    const tabelaEl = document.getElementById("tabela-notas");
    tabelaEl.innerHTML = "";

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turmaActualNotas.ano_lectivo,
        p_classe: turmaActualNotas.classe,
        p_turma: turmaActualNotas.turma,
        p_disciplina: turmaActualNotas.disciplina
    });

    if (!dados.ok) {
        infoEl.textContent = dados.erro || "Erro ao carregar alunos.";
        return;
    }

    const alunos = dados.alunos || [];
    infoEl.textContent = alunos.length + " alunos em " + turmaActualNotas.classe + " · Turma " + turmaActualNotas.turma + " (" + turmaActualNotas.disciplina + ")";

    renderizarTabelaNotas(alunos);
}

function renderizarTabelaNotas(alunos) {
    const container = document.getElementById("tabela-notas");
    if (!container) return;

    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    let html = '<table class="tabela-notas">';
    html += '<thead><tr>';
    html += '  <th class="col-expandir"></th>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">MAC</th>';
    html += '  <th class="centro">NPT</th>';
    html += '  <th class="centro">MT</th>';
    html += '  <th class="centro">MFD</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const notas = (a.notas || []).find(function (n) { return n.trimestre === trimestreActual; }) || {};
        const mac = notas.mac;
        const npt = notas.npt;
        const mt = notas.mt;
        const mfd = notas.mfd;

        html += '<tr data-aluno-idx="' + idx + '">';
        html += '  <td class="col-expandir">';
        html += '    <button class="btn-expandir" data-expandir="' + idx + '"><i class="fas fa-chevron-right"></i></button>';
        html += '  </td>';
        html += '  <td class="aluno-nome-cell">';
        html += '    <strong>' + esc(a.nome_completo) + '</strong>';
        html += '    <span>BI: ' + esc(a.bi_numero) + ' · Nº ' + (a.numero_aluno || "—") + '</span>';
        html += '  </td>';
        html += '  <td class="celula-nota ' + (mac == null ? "vazia" : "") + '">' + (mac != null ? Number(mac).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (npt == null ? "vazia" : "") + '">' + (npt != null ? Number(npt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mt == null ? "vazia" : "") + '">' + (mt != null ? Number(mt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mfd == null ? "vazia" : "") + '">' + (mfd != null ? Number(mfd).toFixed(1) : "—") + '</td>';
        html += '</tr>';

        html += '<tr class="linha-expandida" data-expandida="' + idx + '" style="display:none;"><td colspan="6">';
        html += '  <div class="expandido-conteudo" data-conteudo="' + idx + '">A carregar...</div>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll("[data-expandir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = this.getAttribute("data-expandir");
            const linha = container.querySelector('[data-expandida="' + idx + '"]');
            const estaAberta = linha.style.display !== "none";
            if (estaAberta) {
                linha.style.display = "none";
                btn.classList.remove("expandido");
            } else {
                linha.style.display = "table-row";
                btn.classList.add("expandido");
                carregarExpandido(alunos[parseInt(idx, 10)], parseInt(idx, 10));
            }
        });
    });
}

async function carregarExpandido(aluno, idx) {
    const token = obterToken();
    const container = document.querySelector('[data-conteudo="' + idx + '"]');
    if (!container) return;

    const dados = await chamarRPC("cesc_professor_listar_avaliacoes", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual
    });

    if (!dados.ok) {
        container.innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>';
        return;
    }

    const avaliacoes = dados.avaliacoes || [];
    const fechado = dados.fechado;

    let soma = 0;
    avaliacoes.forEach(function (a) { soma += Number(a.nota); });
    const mac = avaliacoes.length > 0 ? (soma / avaliacoes.length).toFixed(2) : null;

    let html = '<div class="expandido-cabecalho">';
    html += '<div class="expandido-titulo"><i class="fas fa-list-check"></i> Avaliações contínuas';
    if (mac !== null) html += ' <span class="mac-valor">MAC: ' + mac + '</span>';
    html += '</div>';
    if (fechado) {
        html += '<span style="font-size:0.8rem; color:var(--cor-texto-leve); font-style:italic;">Trimestre fechado — não editável</span>';
    } else {
        html += '<button class="btn-adicionar-avaliacao" data-add="' + idx + '"><i class="fas fa-plus"></i> Adicionar avaliação</button>';
    }
    html += '</div>';

    if (avaliacoes.length === 0) {
        html += '<div class="avaliacoes-vazio">Ainda sem avaliações contínuas neste trimestre.</div>';
    } else {
        html += '<div class="lista-avaliacoes">';
        avaliacoes.forEach(function (av) {
            html += '<div class="avaliacao-item">';
            html += '  <span class="av-desc">' + esc(av.descricao || "Avaliação") + '</span>';
            html += '  <span class="av-nota">' + Number(av.nota).toFixed(1) + '</span>';
            if (!fechado) {
                html += '  <button class="av-remover" data-remover="' + av.id + '" data-aluno-idx="' + idx + '"><i class="fas fa-trash"></i></button>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    html += '<div class="form-nova-avaliacao" data-form="' + idx + '" style="display:none;">';
    html += '  <div class="campo-grupo">';
    html += '    <label>Nota (0-20)</label>';
    html += '    <input type="number" min="0" max="20" step="0.1" data-input-nota="' + idx + '">';
    html += '  </div>';
    html += '  <div class="campo-grupo">';
    html += '    <label>Descrição</label>';
    html += '    <input type="text" placeholder="Ex: Teste 1" data-input-desc="' + idx + '">';
    html += '  </div>';
    html += '  <button class="btn-confirmar" data-confirmar="' + idx + '">Adicionar</button>';
    html += '  <button class="btn-cancelar" data-cancelar="' + idx + '">Cancelar</button>';
    html += '</div>';

    if (!fechado) {
        const nptActual = (aluno.notas || []).find(function (n) { return n.trimestre === trimestreActual; });
        html += '<div style="border-top:1px solid var(--cor-borda); padding-top:16px; margin-top:8px;">';
        html += '<div class="expandido-titulo" style="margin-bottom:12px;"><i class="fas fa-clipboard-check"></i> Nota da Prova Trimestral (NPT)</div>';
        html += '<div class="npt-wrapper" style="flex-direction:row; align-items:center; gap:8px;">';
        html += '<input type="number" min="0" max="20" step="0.1" data-input-npt="' + idx + '" placeholder="NPT" value="' + (nptActual && nptActual.npt != null ? nptActual.npt : "") + '">';
        html += '<button class="btn-lancar-npt" data-lancar-npt="' + idx + '">Lançar NPT e fechar trimestre</button>';
        html += '</div>';
        html += '</div>';
    }

    container.innerHTML = html;

    const addBtn = container.querySelector('[data-add="' + idx + '"]');
    const formEl = container.querySelector('[data-form="' + idx + '"]');
    if (addBtn && formEl) {
        addBtn.addEventListener("click", function () {
            formEl.style.display = formEl.style.display === "none" ? "flex" : "none";
        });
    }

    const confirmarBtn = container.querySelector('[data-confirmar="' + idx + '"]');
    if (confirmarBtn) {
        confirmarBtn.addEventListener("click", function () {
            adicionarAvaliacao(aluno, idx);
        });
    }

    const cancelarBtn = container.querySelector('[data-cancelar="' + idx + '"]');
    if (cancelarBtn && formEl) {
        cancelarBtn.addEventListener("click", function () {
            formEl.style.display = "none";
        });
    }

    container.querySelectorAll("[data-remover]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (confirm("Remover esta avaliação?")) {
                removerAvaliacao(this.getAttribute("data-remover"), aluno, idx);
            }
        });
    });

    const lancarNptBtn = container.querySelector('[data-lancar-npt="' + idx + '"]');
    if (lancarNptBtn) {
        lancarNptBtn.addEventListener("click", function () {
            lancarNPT(aluno, idx);
        });
    }
}

async function adicionarAvaliacao(aluno, idx) {
    const token = obterToken();
    const notaInput = document.querySelector('[data-input-nota="' + idx + '"]');
    const descInput = document.querySelector('[data-input-desc="' + idx + '"]');
    const nota = parseFloat(notaInput.value);
    const desc = descInput.value.trim() || "Avaliação";

    if (isNaN(nota) || nota < 0 || nota > 20) {
        alert("Nota inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_adicionar_avaliacao", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_nota: nota,
        p_descricao: desc
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao adicionar avaliação.");
        return;
    }

    carregarExpandido(aluno, idx);
    carregarNotas();
}

async function removerAvaliacao(avaliacaoId, aluno, idx) {
    const token = obterToken();
    const dados = await chamarRPC("cesc_professor_remover_avaliacao", {
        p_token: token,
        p_avaliacao_id: avaliacaoId
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao remover.");
        return;
    }

    carregarExpandido(aluno, idx);
    carregarNotas();
}

async function lancarNPT(aluno, idx) {
    const token = obterToken();
    const inputNpt = document.querySelector('[data-input-npt="' + idx + '"]');
    const npt = parseFloat(inputNpt.value);

    if (isNaN(npt) || npt < 0 || npt > 20) {
        alert("NPT inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_lancar_npt", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_npt: npt
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao lançar NPT.");
        return;
    }

    alert("NPT lançada. MAC: " + dados.mac + ", MT: " + dados.mt + (dados.mfd != null ? ", MFD: " + dados.mfd : ""));
    carregarNotas();
}

async function carregarFaltas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-faltas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    const turma = dadosProf.turmas[idx];
    const container = document.getElementById("tabela-faltas");
    container.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turma.ano_lectivo,
        p_classe: turma.classe,
        p_turma: turma.turma,
        p_disciplina: turma.disciplina
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>';
        return;
    }

    const alunos = dados.alunos || [];
    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    let html = '<table class="tabela-notas">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">Acção</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        html += '<tr>';
        html += '<td class="aluno-nome-cell"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></td>';
        html += '<td class="centro"><button class="falta-btn" data-falta-idx="' + idx + '">+ Falta hoje</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll("[data-falta-idx]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = parseInt(this.getAttribute("data-falta-idx"), 10);
            marcarFalta(alunos[i], turma);
        });
    });
}

async function marcarFalta(aluno, turma) {
    const token = obterToken();
    const hoje = new Date();
    const data = hoje.toISOString().slice(0, 10);
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mes = meses[hoje.getMonth()];

    const justificada = confirm("Marcar como justificada?\n\nOK = Justificada\nCancelar = Não justificada");

    const dados = await chamarRPC("cesc_professor_marcar_falta", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turma.disciplina,
        p_mes: mes,
        p_data: data,
        p_justificada: justificada
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao marcar falta.");
        return;
    }

    alert("Falta registada para " + aluno.nome_completo + ".");
}
EOF
```

Depois de colar, prime Enter (para garantir que o EOF é processado).

---

Passo 4 — Confirmar que o ficheiro ficou certo

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
wc -l admin/scripts/professor.js
grep -c "let dadosProf" admin/scripts/professor.js
```

O que esperar:

· wc -l → cerca de 490 linhas (não 875).
· grep -c → 1 (não 2).

Se grep -c der 1, está bom. Passa ao passo 5.

Se grep -c der 2, o EOF não fechou corretamente e o ficheiro ficou mal. Nesse caso, diz-me e usamos outra abordagem.

---

Passo 5 — Testar no browser

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
python3 -m http.server 8080
```

E abre:

```
http://localhost:8080/admin/professor.html
```

O erro Identifier 'dadosProf' has already been declared deve desaparecer.

---

Corre os passos 1 a 4 e cola-me o output do Passo 4. Se grep -c der 1, avançamos.


O sistema está bom... mas a ui não ajuda para o mobile, sabe-se que uma boa parte dos professores não têm computadores, e é possível que eles usei o sistema pelo telefone, temos levar isso em conta e aplicar a responsividade


Tens toda a razão. E é uma falha grave de design — Angola, professores, telemóvel como ferramenta principal. A versão atual do professor.html quebra em mobile em vários sítios: a tabela de notas tem 6 colunas (não cabe em 360px), o formulário de avaliações tem inputs lado a lado, os filtros ficam apertados, etc.

Antes de escrever CSS, deixa-me ser claro sobre os problemas concretos e como os vou resolver.

---

O que está mal em mobile (no professor)

Elemento Problema Solução
Sidebar Já funciona (drawer) ✅ Manter
Tabela de notas 6 colunas + linha expandível → scroll horizontal forçado, sem contexto Reformular para "cartões" por aluno em mobile
Filtros (turma/trimestre) Lado a lado, ficam apertados Empilhar em coluna
Formulário de nova avaliação Inputs lado a lado Empilhar
NPT inline Input + botão lado a lado Empilhar
Stats (3 cards) Ficam lado a lado, apertados Empilhar ou 1 por linha
Turmas (grelha) Cards em grelha 1 por linha
Header mobile Já existe, mas o título pode cortar Ajustar font-size

A grande mudança é a tabela. Em mobile, uma tabela de 6 colunas é inutilizável. Vou transformá-la em cartões por aluno, cada um com:

· Nome + BI + Nº
· MAC, NPT, MT, MFD (em linha compacta)
· Botão "Ver avaliações" que expande o painel

Isto mantém a funcionalidade toda, mas em formato vertical.

---

Antes de escrever — 2 confirmações

1. A abordagem dos cartões em mobile

A) Em mobile, a tabela desaparece e aparece uma lista de cartões (1 por aluno). Em desktop, mantém-se a tabela.

B) A tabela fica sempre, mas com scroll horizontal e colunas mais estreitas.

C) Outra (diz qual).

Recomendo A. É o padrão de plataformas sérias (Google Classroom, Notion). Cartões em mobile, tabela em desktop.

2. O breakpoint

· A) 768px (tablet pequeno para baixo já é "mobile")
· B) 640px (só telemóveis)
· C) 900px (inclui tablets)

Recomendo A. 768px é o padrão.

---

O que vou fazer (assim que confirmares)

1. Alterar admin/professor.html:

· Nada de mudanças estruturais, só acrescentar classes CSS que o JS usa para decidir o que mostrar.

2. Alterar admin/scripts/professor.js:

· A função renderizarTabelaNotas passa a gerar dois blocos: a <table> (visível em desktop via CSS) e uma <div class="cartoes-alunos"> (visível em mobile via CSS). O JS preenche ambos. O CSS esconde um ou outro conforme o breakpoint.
· Ou, mais simples: gerar só cartões e usar CSS para os transformar em tabela em desktop? Não — em desktop a tabela é melhor.
· Abordagem escolhida: o JS gera os dois formatos, o CSS decide qual mostrar. É o mais fiável.

3. Alterar admin/css/professor.css:

· Adicionar regras @media (max-width: 768px) para:
  · Esconder a <table>
  · Mostrar .cartoes-alunos
  · Empilhar filtros
  · Empilhar formulário de avaliação
  · Empilhar NPT
  · Stats em coluna
  · Turmas em coluna

---

Confirma e avanço

Responde:

1. Opção A, B ou C para os cartões?
2. Breakpoint: A, B ou C?

Depois disso, escrevo:

· O novo renderizarTabelaNotas (gera tabela + cartões)
· O novo carregarExpandido (idêntico, mas funciona nos dois)
· O CSS responsivo

Aviso: o carregarExpandido é chamado tanto pelo botão da tabela quanto pelo botão do cartão. Vou garantir que ambos funcionam.

Aqui está o admin/scripts/professor.js completo, com as alterações de responsividade (tabela + cartões) já integradas.

```javascript
/*
 CESC - Área do professor
 Data: 22/10/2026

 - Valida token e role (professor).
 - Carrega dados do professor (turmas).
 - Lançar notas: tabela (desktop) + cartões (mobile), ambos com
   avaliações contínuas + NPT.
 - Marcar faltas.

 Versão 2.0:
 - renderizarTabelaNotas gera tabela (desktop) e cartões (mobile).
 - carregarExpandido aceita parâmetro "éMobile" para decidir onde renderizar.
 - CSS responsivo (no professor.css) decide qual mostrar.
 */

let dadosProf = null;
let turmaActualNotas = null;
let trimestreActual = 1;

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
    const token = exigirLogin();
    if (!token) return;

    const menuBtn = document.getElementById("menuMobileBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarFechar = document.getElementById("sidebarFechar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuBtn) menuBtn.addEventListener("click", function () {
        sidebar.classList.add("aberta");
        overlay.classList.add("ativo");
    });
    if (sidebarFechar) sidebarFechar.addEventListener("click", fecharSidebar);
    if (overlay) overlay.addEventListener("click", fecharSidebar);

    function fecharSidebar() {
        sidebar.classList.remove("aberta");
        overlay.classList.remove("ativo");
    }

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (item) {
        item.addEventListener("click", function (e) {
            e.preventDefault();
            mostrarSeccao(item.getAttribute("data-seccao"));
            fecharSidebar();
        });
    });

    const linkSair = document.getElementById("link-sair");
    if (linkSair) {
        linkSair.addEventListener("click", function (e) {
            e.preventDefault();
            fazerLogout();
        });
    }

    const dados = await chamarRPC("cesc_professor_dashboard", { p_token: token });

    if (!dados.ok) {
        if (dados.erro && dados.erro.indexOf("autorizado") !== -1) {
            window.location.href = "../paginas/dashboard.html";
            return;
        }
        document.getElementById("loader").innerHTML =
            '<p style="color:var(--cor-erro);">' + esc(dados.erro || "Erro ao carregar.") + '</p>';
        return;
    }

    dadosProf = dados;
    renderizarTudo(dados);
    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";
});

// ============================================================
// NAVEGAÇÃO
// ============================================================
function mostrarSeccao(id) {
    document.querySelectorAll(".pagina-seccao").forEach(function (s) {
        s.classList.remove("ativa");
    });
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (n) {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// RENDERIZAÇÃO INICIAL
// ============================================================
function renderizarTudo(dados) {
    const prof = dados.professor;
    const turmas = dados.turmas || [];

    const inicial = (prof.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("prof-avatar").textContent = inicial;
    document.getElementById("prof-nome-sidebar").textContent = prof.nome_completo;
    document.getElementById("prof-dept-sidebar").textContent = prof.departamento || "—";

    const primeiroNome = prof.nome_completo.split(" ")[0];
    document.getElementById("boas-vindas").textContent = "Bem-vindo de volta, " + primeiroNome + ".";

    document.getElementById("stat-turmas").textContent = turmas.length;
    const totalAlunos = turmas.reduce(function (s, t) { return s + (t.total_alunos || 0); }, 0);
    document.getElementById("stat-alunos").textContent = totalAlunos;
    document.getElementById("stat-notas").textContent = "—";

    const listaVG = document.getElementById("lista-turmas-visao-geral");
    if (turmas.length === 0) {
        listaVG.innerHTML = '<p style="color:var(--cor-texto-suave); font-size:0.9rem;">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t) {
            html += '<div class="info-linha">';
            html += '<span class="rotulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + ' · ' + esc(t.disciplina) + '</span>';
            html += '<span class="valor">' + (t.total_alunos || 0) + ' alunos</span>';
            html += '</div>';
        });
        listaVG.innerHTML = html;
    }

    const listaTurmas = document.getElementById("lista-turmas");
    if (turmas.length === 0) {
        listaTurmas.innerHTML = '<p style="color:var(--cor-texto-suave);">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t, idx) {
            html += '<div class="turma-card">';
            html += '  <h3 class="turma-card-titulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + '</h3>';
            html += '  <p class="turma-card-meta">' + esc(t.disciplina) + ' · ' + esc(t.ano_lectivo) + '<br>' + (t.total_alunos || 0) + ' alunos</p>';
            html += '  <div class="turma-card-acoes">';
            html += '    <button onclick="irParaNotas(' + idx + ')">Lançar notas</button>';
            html += '    <button onclick="irParaFaltas(' + idx + ')">Marcar faltas</button>';
            html += '  </div>';
            html += '</div>';
        });
        listaTurmas.innerHTML = html;
    }

    const selNotas = document.getElementById("sel-turma-notas");
    const selFaltas = document.getElementById("sel-turma-faltas");
    [selNotas, selFaltas].forEach(function (sel) {
        if (!sel) return;
        sel.innerHTML = "";
        turmas.forEach(function (t, idx) {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = t.classe + " · " + t.turma + " · " + t.disciplina;
            sel.appendChild(opt);
        });
        sel.addEventListener("change", function () {
            if (sel === selNotas) carregarNotas();
            else carregarFaltas();
        });
    });

    const selTrim = document.getElementById("sel-trimestre");
    if (selTrim) {
        selTrim.addEventListener("change", function () {
            trimestreActual = parseInt(this.value, 10);
            carregarNotas();
        });
    }

    const perfil = document.getElementById("lista-perfil");
    let html = '<div class="card-info"><h3><i class="fas fa-user"></i> Dados</h3>';
    html += linhaInfo("Nome", prof.nome_completo);
    html += linhaInfo("Email", prof.email);
    html += linhaInfo("Departamento", prof.departamento);
    html += linhaInfo("Turmas", turmas.length);
    html += '</div>';
    perfil.innerHTML = html;
}

function linhaInfo(rotulo, valor) {
    return '<div class="info-linha"><span class="rotulo">' + rotulo +
        '</span><span class="valor">' + (valor || "—") + '</span></div>';
}

// ============================================================
// IR PARA SECÇÕES (a partir dos botões da turma)
// ============================================================
function irParaNotas(idx) {
    document.getElementById("sel-turma-notas").value = String(idx);
    mostrarSeccao("notas");
    carregarNotas();
}

function irParaFaltas(idx) {
    document.getElementById("sel-turma-faltas").value = String(idx);
    mostrarSeccao("faltas");
    carregarFaltas();
}

// ============================================================
// LANÇAR NOTAS
// ============================================================
async function carregarNotas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-notas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    turmaActualNotas = dadosProf.turmas[idx];
    const infoEl = document.getElementById("notas-info");
    infoEl.style.display = "block";
    infoEl.textContent = "A carregar alunos...";

    const tabelaEl = document.getElementById("tabela-notas");
    tabelaEl.innerHTML = "";

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turmaActualNotas.ano_lectivo,
        p_classe: turmaActualNotas.classe,
        p_turma: turmaActualNotas.turma,
        p_disciplina: turmaActualNotas.disciplina
    });

    if (!dados.ok) {
        infoEl.textContent = dados.erro || "Erro ao carregar alunos.";
        return;
    }

    const alunos = dados.alunos || [];
    infoEl.textContent = alunos.length + " alunos em " + turmaActualNotas.classe + " · Turma " + turmaActualNotas.turma + " (" + turmaActualNotas.disciplina + ")";

    renderizarTabelaNotas(alunos);
}

function renderizarTabelaNotas(alunos) {
    const container = document.getElementById("tabela-notas");
    if (!container) return;

    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    // ===== TABELA (visível em desktop) =====
    let html = '<table class="tabela-notas tabela-desktop">';
    html += '<thead><tr>';
    html += '  <th class="col-expandir"></th>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">MAC</th>';
    html += '  <th class="centro">NPT</th>';
    html += '  <th class="centro">MT</th>';
    html += '  <th class="centro">MFD</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const notas = (a.notas || []).find(function (n) { return n.trimestre === trimestreActual; }) || {};
        const mac = notas.mac;
        const npt = notas.npt;
        const mt = notas.mt;
        const mfd = notas.mfd;

        html += '<tr data-aluno-idx="' + idx + '">';
        html += '  <td class="col-expandir">';
        html += '    <button class="btn-expandir" data-expandir="' + idx + '"><i class="fas fa-chevron-right"></i></button>';
        html += '  </td>';
        html += '  <td class="aluno-nome-cell">';
        html += '    <strong>' + esc(a.nome_completo) + '</strong>';
        html += '    <span>BI: ' + esc(a.bi_numero) + ' · Nº ' + (a.numero_aluno || "—") + '</span>';
        html += '  </td>';
        html += '  <td class="celula-nota ' + (mac == null ? "vazia" : "") + '">' + (mac != null ? Number(mac).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (npt == null ? "vazia" : "") + '">' + (npt != null ? Number(npt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mt == null ? "vazia" : "") + '">' + (mt != null ? Number(mt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mfd == null ? "vazia" : "") + '">' + (mfd != null ? Number(mfd).toFixed(1) : "—") + '</td>';
        html += '</tr>';

        html += '<tr class="linha-expandida" data-expandida="' + idx + '" style="display:none;"><td colspan="6">';
        html += '  <div class="expandido-conteudo" data-conteudo="' + idx + '">A carregar...</div>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';

    // ===== CARTÕES (visíveis em mobile) =====
    html += '<div class="cartoes-alunos">';

    alunos.forEach(function (a, idx) {
        const notas = (a.notas || []).find(function (n) { return n.trimestre === trimestreActual; }) || {};
        const mac = notas.mac;
        const npt = notas.npt;
        const mt = notas.mt;
        const mfd = notas.mfd;

        html += '<div class="cartao-aluno" data-cartao-idx="' + idx + '">';
        html += '  <div class="cartao-aluno-topo">';
        html += '    <div class="cartao-aluno-info">';
        html += '      <strong>' + esc(a.nome_completo) + '</strong>';
        html += '      <span>BI: ' + esc(a.bi_numero) + ' · Nº ' + (a.numero_aluno || "—") + '</span>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div class="cartao-aluno-notas">';
        html += '    <div class="cartao-nota"><span class="rotulo">MAC</span><span class="valor ' + (mac == null ? "vazia" : "") + '">' + (mac != null ? Number(mac).toFixed(1) : "—") + '</span></div>';
        html += '    <div class="cartao-nota"><span class="rotulo">NPT</span><span class="valor ' + (npt == null ? "vazia" : "") + '">' + (npt != null ? Number(npt).toFixed(1) : "—") + '</span></div>';
        html += '    <div class="cartao-nota"><span class="rotulo">MT</span><span class="valor ' + (mt == null ? "vazia" : "") + '">' + (mt != null ? Number(mt).toFixed(1) : "—") + '</span></div>';
        html += '    <div class="cartao-nota"><span class="rotulo">MFD</span><span class="valor ' + (mfd == null ? "vazia" : "") + '">' + (mfd != null ? Number(mfd).toFixed(1) : "—") + '</span></div>';
        html += '  </div>';

        html += '  <button class="cartao-aluno-toggle" data-toggle-cartao="' + idx + '">';
        html += '    <i class="fas fa-chevron-down"></i> Ver avaliações';
        html += '  </button>';

        html += '  <div class="cartao-aluno-expandido" data-cartao-expandido="' + idx + '" style="display:none;">';
        html += '    <div class="expandido-conteudo" data-conteudo-mobile="' + idx + '">A carregar...</div>';
        html += '  </div>';

        html += '</div>';
    });

    html += '</div>';

    container.innerHTML = html;

    // ===== Ligar eventos: tabela (desktop) =====
    container.querySelectorAll("[data-expandir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = this.getAttribute("data-expandir");
            const linha = container.querySelector('[data-expandida="' + idx + '"]');
            const estaAberta = linha.style.display !== "none";
            if (estaAberta) {
                linha.style.display = "none";
                btn.classList.remove("expandido");
            } else {
                linha.style.display = "table-row";
                btn.classList.add("expandido");
                carregarExpandido(alunos[parseInt(idx, 10)], parseInt(idx, 10), false);
            }
        });
    });

    // ===== Ligar eventos: cartões (mobile) =====
    container.querySelectorAll("[data-toggle-cartao]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = this.getAttribute("data-toggle-cartao");
            const painel = container.querySelector('[data-cartao-expandido="' + idx + '"]');
            const estaAberto = painel.style.display !== "none";
            if (estaAberto) {
                painel.style.display = "none";
                this.innerHTML = '<i class="fas fa-chevron-down"></i> Ver avaliações';
            } else {
                painel.style.display = "block";
                this.innerHTML = '<i class="fas fa-chevron-up"></i> Fechar';
                carregarExpandido(alunos[parseInt(idx, 10)], parseInt(idx, 10), true);
            }
        });
    });
}

async function carregarExpandido(aluno, idx, éMobile) {
    const token = obterToken();
    const seletor = éMobile
        ? '[data-conteudo-mobile="' + idx + '"]'
        : '[data-conteudo="' + idx + '"]';
    const container = document.querySelector(seletor);
    if (!container) return;

    const dados = await chamarRPC("cesc_professor_listar_avaliacoes", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual
    });

    if (!dados.ok) {
        container.innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>';
        return;
    }

    const avaliacoes = dados.avaliacoes || [];
    const fechado = dados.fechado;

    let soma = 0;
    avaliacoes.forEach(function (a) { soma += Number(a.nota); });
    const mac = avaliacoes.length > 0 ? (soma / avaliacoes.length).toFixed(2) : null;

    let html = '<div class="expandido-cabecalho">';
    html += '<div class="expandido-titulo"><i class="fas fa-list-check"></i> Avaliações contínuas';
    if (mac !== null) html += ' <span class="mac-valor">MAC: ' + mac + '</span>';
    html += '</div>';
    if (fechado) {
        html += '<span style="font-size:0.8rem; color:var(--cor-texto-leve); font-style:italic;">Trimestre fechado — não editável</span>';
    } else {
        html += '<button class="btn-adicionar-avaliacao" data-add="' + idx + '"><i class="fas fa-plus"></i> Adicionar avaliação</button>';
    }
    html += '</div>';

    if (avaliacoes.length === 0) {
        html += '<div class="avaliacoes-vazio">Ainda sem avaliações contínuas neste trimestre.</div>';
    } else {
        html += '<div class="lista-avaliacoes">';
        avaliacoes.forEach(function (av) {
            html += '<div class="avaliacao-item">';
            html += '  <span class="av-desc">' + esc(av.descricao || "Avaliação") + '</span>';
            html += '  <span class="av-nota">' + Number(av.nota).toFixed(1) + '</span>';
            if (!fechado) {
                html += '  <button class="av-remover" data-remover="' + av.id + '" data-aluno-idx="' + idx + '"><i class="fas fa-trash"></i></button>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    html += '<div class="form-nova-avaliacao" data-form="' + idx + '" style="display:none;">';
    html += '  <div class="campo-grupo">';
    html += '    <label>Nota (0-20)</label>';
    html += '    <input type="number" min="0" max="20" step="0.1" data-input-nota="' + idx + '">';
    html += '  </div>';
    html += '  <div class="campo-grupo">';
    html += '    <label>Descrição</label>';
    html += '    <input type="text" placeholder="Ex: Teste 1" data-input-desc="' + idx + '">';
    html += '  </div>';
    html += '  <button class="btn-confirmar" data-confirmar="' + idx + '">Adicionar</button>';
    html += '  <button class="btn-cancelar" data-cancelar="' + idx + '">Cancelar</button>';
    html += '</div>';

    if (!fechado) {
        const nptActual = (aluno.notas || []).find(function (n) { return n.trimestre === trimestreActual; });
        html += '<div style="border-top:1px solid var(--cor-borda); padding-top:16px; margin-top:8px;">';
        html += '<div class="expandido-titulo" style="margin-bottom:12px;"><i class="fas fa-clipboard-check"></i> Nota da Prova Trimestral (NPT)</div>';
        html += '<div class="npt-wrapper">';
        html += '<input type="number" min="0" max="20" step="0.1" data-input-npt="' + idx + '" placeholder="NPT" value="' + (nptActual && nptActual.npt != null ? nptActual.npt : "") + '">';
        html += '<button class="btn-lancar-npt" data-lancar-npt="' + idx + '">Lançar NPT e fechar trimestre</button>';
        html += '</div>';
        html += '</div>';
    }

    container.innerHTML = html;

    const addBtn = container.querySelector('[data-add="' + idx + '"]');
    const formEl = container.querySelector('[data-form="' + idx + '"]');
    if (addBtn && formEl) {
        addBtn.addEventListener("click", function () {
            formEl.style.display = formEl.style.display === "none" ? "flex" : "none";
        });
    }

    const confirmarBtn = container.querySelector('[data-confirmar="' + idx + '"]');
    if (confirmarBtn) {
        confirmarBtn.addEventListener("click", function () {
            adicionarAvaliacao(aluno, idx);
        });
    }

    const cancelarBtn = container.querySelector('[data-cancelar="' + idx + '"]');
    if (cancelarBtn && formEl) {
        cancelarBtn.addEventListener("click", function () {
            formEl.style.display = "none";
        });
    }

    container.querySelectorAll("[data-remover]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (confirm("Remover esta avaliação?")) {
                removerAvaliacao(this.getAttribute("data-remover"), aluno, idx);
            }
        });
    });

    const lancarNptBtn = container.querySelector('[data-lancar-npt="' + idx + '"]');
    if (lancarNptBtn) {
        lancarNptBtn.addEventListener("click", function () {
            lancarNPT(aluno, idx);
        });
    }
}

async function adicionarAvaliacao(aluno, idx) {
    const token = obterToken();
    const notaInput = document.querySelector('[data-input-nota="' + idx + '"]');
    const descInput = document.querySelector('[data-input-desc="' + idx + '"]');
    const nota = parseFloat(notaInput.value);
    const desc = descInput.value.trim() || "Avaliação";

    if (isNaN(nota) || nota < 0 || nota > 20) {
        alert("Nota inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_adicionar_avaliacao", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_nota: nota,
        p_descricao: desc
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao adicionar avaliação.");
        return;
    }

    // Recarregar o expandido e a tabela
    // Usamos false para renderizar na tabela (desktop), mas como
    // a tabela é recarregada inteira, ambos são atualizados.
    carregarExpandido(aluno, idx, false);
    carregarNotas();
}

async function removerAvaliacao(avaliacaoId, aluno, idx) {
    const token = obterToken();
    const dados = await chamarRPC("cesc_professor_remover_avaliacao", {
        p_token: token,
        p_avaliacao_id: avaliacaoId
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao remover.");
        return;
    }

    carregarExpandido(aluno, idx, false);
    carregarNotas();
}

async function lancarNPT(aluno, idx) {
    const token = obterToken();
    const inputNpt = document.querySelector('[data-input-npt="' + idx + '"]');
    const npt = parseFloat(inputNpt.value);

    if (isNaN(npt) || npt < 0 || npt > 20) {
        alert("NPT inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_lancar_npt", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_npt: npt
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao lançar NPT.");
        return;
    }

    alert("NPT lançada. MAC: " + dados.mac + ", MT: " + dados.mt + (dados.mfd != null ? ", MFD: " + dados.mfd : ""));
    carregarNotas();
}

// ============================================================
// MARCAR FALTAS
// ============================================================
async function carregarFaltas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-faltas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    const turma = dadosProf.turmas[idx];
    const container = document.getElementById("tabela-faltas");
    container.innerHTML = '<div class="loader-container"><div class="loader"></div><p>A carregar...</p></div>';

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turma.ano_lectivo,
        p_classe: turma.classe,
        p_turma: turma.turma,
        p_disciplina: turma.disciplina
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>';
        return;
    }

    const alunos = dados.alunos || [];
    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    let html = '<table class="tabela-notas">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">Acção</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        html += '<tr>';
        html += '<td class="aluno-nome-cell"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></td>';
        html += '<td class="centro"><button class="falta-btn" data-falta-idx="' + idx + '">+ Falta hoje</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll("[data-falta-idx]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = parseInt(this.getAttribute("data-falta-idx"), 10);
            marcarFalta(alunos[i], turma);
        });
    });
}

async function marcarFalta(aluno, turma) {
    const token = obterToken();
    const hoje = new Date();
    const data = hoje.toISOString().slice(0, 10);
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mes = meses[hoje.getMonth()];

    const justificada = confirm("Marcar como justificada?\n\nOK = Justificada\nCancelar = Não justificada");

    const dados = await chamarRPC("cesc_professor_marcar_falta", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turma.disciplina,
        p_mes: mes,
        p_data: data,
        p_justificada: justificada
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao marcar falta.");
        return;
    }

    alert("Falta registada para " + aluno.nome_completo + ".");
}
```

Antes de testar, confirma:

1. O CSS já tem o bloco responsivo que te dei no final da mensagem anterior? Se não, acrescenta ao admin/css/professor.css.
2. O renderizarTabelaNotas foi substituído inteiro (não parcialmente).
3. O carregarExpandido foi substituído inteiro (tem agora o parâmetro éMobile).

Testa:

· Em desktop: tabela com ▶. Clicar expande.
· Em mobile (redimensiona a janela ou abre no telemóvel): cartões com "Ver avaliações". Clicar expande.

Diz-me o que acontece. Se quebrar, cola-me o erro da consola.
Dois problemas distintos. Vamos resolver os dois.

---

Problema 1 — "Marcar Faltas" e "Lançar Notas" não aparecem em mobile quando clicados pelo menu

Causa: o CSS responsivo que te dei esconde a tabela em mobile (.tabela-desktop { display: none; }) mas o conteúdo de "Marcar Faltas" usa a mesma classe .tabela-notas — e não tem alternativa em cartões. Ou seja:

· "Lançar Notas": tem tabela (desktop) + cartões (mobile). ✅ Deve funcionar.
· "Marcar Faltas": só tem <table class="tabela-notas"> → em mobile é escondida pelo CSS da tabela, e não há cartões alternativos. ❌ Fica vazia.

Além disso, o .tabela-notas tem display: table por defeito, mas o CSS responsivo que te dei aplica .tabela-desktop { display: none } apenas à tabela de notas (que tem a classe tabela-desktop). A tabela de faltas não tem essa classe — portanto não devia ser escondida. Mas — verifica se o CSS não tem uma regra genérica tipo .tabela-notas { display: none } em mobile. Se tiver, esconde as duas.

Vou resolver de forma robusta:

1. Adicionar cartões para faltas em mobile (mesmo padrão dos cartões de notas).
2. Garantir que a tabela de faltas tem a classe tabela-desktop para ser escondida apenas em mobile.

---

Problema 2 — RPC cesc_professor_marcar_falta falha com erro SQL

```
ERROR: 42P01: missing FROM-clause entry for table "a"
```

A RPC que te dei antes tem um bug: usa uma variável a (alias) que não existe no SELECT. Vou reescrevê-la corretamente.

---

O que fazer — 2 blocos

Bloco 1 — Corrigir a RPC cesc_professor_marcar_falta no Supabase

Corre isto no SQL Editor:

```sql
-- ============================================================
-- Corrigir RPC cesc_professor_marcar_falta
-- ============================================================
CREATE OR REPLACE FUNCTION public.cesc_professor_marcar_falta(
    p_token varchar,
    p_matricula_id uuid,
    p_disciplina varchar,
    p_mes varchar,
    p_data date,
    p_justificada boolean
) RETURNS json AS $$
DECLARE
    v_sessao record;
    v_user record;
    v_prof record;
    v_matricula record;
    v_autorizado boolean;
BEGIN
    -- 1. Validar sessão
    SELECT * INTO v_sessao FROM public.sessoes
    WHERE token = p_token AND app_name = 'CESC' AND expira_em > now();
    IF v_sessao IS NULL THEN
        RETURN json_build_object('ok', false, 'erro', 'Sessão inválida.');
    END IF;

    -- 2. Validar utilizador (professor)
    SELECT * INTO v_user FROM cesc.utilizadores WHERE email = v_sessao.user_email;
    IF v_user IS NULL OR v_user.role <> 'professor' THEN
        RETURN json_build_object('ok', false, 'erro', 'Não autorizado.');
    END IF;

    SELECT * INTO v_prof FROM cesc.professores WHERE utilizador_id = v_user.id;
    IF v_prof IS NULL THEN
        RETURN json_build_object('ok', false, 'erro', 'Perfil de professor não encontrado.');
    END IF;

    -- 3. Buscar matrícula
    SELECT * INTO v_matricula FROM cesc.matriculas WHERE id = p_matricula_id;
    IF v_matricula IS NULL THEN
        RETURN json_build_object('ok', false, 'erro', 'Matrícula não encontrada.');
    END IF;

    -- 4. Verificar autorização (leciona esta disciplina nesta turma)
    SELECT EXISTS(
        SELECT 1 FROM cesc.professores_disciplinas
        WHERE professor_id = v_prof.id
          AND ano_lectivo = v_matricula.ano_lectivo
          AND classe = v_matricula.classe
          AND turma = v_matricula.turma
          AND disciplina = p_disciplina
    ) INTO v_autorizado;

    IF NOT v_autorizado THEN
        RETURN json_build_object('ok', false, 'erro', 'Não lecionas esta disciplina nesta turma.');
    END IF;

    -- 5. Inserir falta
    INSERT INTO cesc.faltas (matricula_id, disciplina, mes, data_falta, quantidade, justificada)
    VALUES (p_matricula_id, p_disciplina, p_mes, p_data, 1, p_justificada);

    RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

O que mudou: o SELECT da matrícula já não usa a coluna ano_lectivo, classe, turma do JOIN com alunos (que não existe na tabela cesc.alunos). A matrícula já tem esses campos (ano_lectivo, classe, turma) directamente. Agora funciona.

Testa depois: cesc_professor_marcar_falta deve devolver {"ok": true}.

---

Bloco 2 — Adicionar cartões de faltas em mobile

2.1. No admin/scripts/professor.js, substitui a função carregarFaltas inteira por:

```javascript
async function carregarFaltas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-faltas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    const turma = dadosProf.turmas[idx];
    const container = document.getElementById("tabela-faltas");
    container.innerHTML = '<div class="loader-container"><div class="loader"></div><p>A carregar...</p></div>';

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turma.ano_lectivo,
        p_classe: turma.classe,
        p_turma: turma.turma,
        p_disciplina: turma.disciplina
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>';
        return;
    }

    const alunos = dados.alunos || [];
    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    // ===== TABELA (desktop) =====
    let html = '<table class="tabela-notas tabela-desktop">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">Acção</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        html += '<tr>';
        html += '<td class="aluno-nome-cell"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></td>';
        html += '<td class="centro"><button class="falta-btn" data-falta-idx="' + idx + '">+ Falta hoje</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';

    // ===== CARTÕES (mobile) =====
    html += '<div class="cartoes-alunos">';
    alunos.forEach(function (a, idx) {
        html += '<div class="cartao-aluno">';
        html += '  <div class="cartao-aluno-topo">';
        html += '    <div class="cartao-aluno-info">';
        html += '      <strong>' + esc(a.nome_completo) + '</strong>';
        html += '      <span>BI: ' + esc(a.bi_numero) + '</span>';
        html += '    </div>';
        html += '  </div>';
        html += '  <button class="falta-btn falta-btn-grande" data-falta-idx-mobile="' + idx + '">';
        html += '    <i class="fas fa-user-clock"></i> + Marcar falta hoje';
        html += '  </button>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    // Ligar botões da tabela (desktop)
    container.querySelectorAll("[data-falta-idx]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = parseInt(this.getAttribute("data-falta-idx"), 10);
            marcarFalta(alunos[i], turma);
        });
    });

    // Ligar botões dos cartões (mobile)
    container.querySelectorAll("[data-falta-idx-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = parseInt(this.getAttribute("data-falta-idx-mobile"), 10);
            marcarFalta(alunos[i], turma);
        });
    });
}
```

O que mudou: a função agora gera tabela + cartões, exatamente como a renderizarTabelaNotas faz. A tabela tem a classe tabela-desktop (escondida em mobile). Os cartões são visíveis em mobile.

---

2.2. No admin/css/professor.css, acrescenta ao fim (se ainda não tiveres o bloco mobile, este é o complemento):

```css
/* Botão de falta grande (mobile) */
.falta-btn-grande {
    width: 100%;
    padding: 12px 16px;
    font-size: 0.9rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

/* As tabelas marcadas como "tabela-desktop" escondem-se em mobile */
@media (max-width: 768px) {
    .tabela-notas.tabela-desktop {
        display: none;
    }
    .cartoes-alunos {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
}
```

---

Problema 3 — "Clicar em Marcar Faltas / Lançar Notas no menu não mostra nada" (em mobile)

Isto acontecia porque o conteúdo existia (a tabela) mas era escondido em mobile pela classe tabela-desktop, e não havia alternativa (cartões). Com o Bloco 2, os cartões passam a existir.

Mas há outra coisa que pode estar a falhar: o carregarNotas só é chamado quando o select muda, ou quando clicas num botão da turma. Se clicares apenas no link "Lançar Notas" no menu, o select já tem uma turma seleccionada por defeito (a primeira), mas o carregarNotas não é chamado automaticamente.

Solução: quando o utilizador clica no menu "Lançar Notas" ou "Marcar Faltas", chamar carregarNotas() / carregarFaltas() automaticamente.

2.3. No admin/scripts/professor.js, substitui a função mostrarSeccao por:

```javascript
function mostrarSeccao(id) {
    document.querySelectorAll(".pagina-seccao").forEach(function (s) {
        s.classList.remove("ativa");
    });
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (n) {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    // Carregar dados da secção quando entra
    if (id === "notas" && dadosProf) {
        carregarNotas();
    } else if (id === "faltas" && dadosProf) {
        carregarFaltas();
    } else if (id === "turmas" && dadosProf) {
        // A grelha de turmas já está no HTML, só mostramos.
        // Nada a fazer.
    } else if (id === "perfil" && dadosProf) {
        // Perfil já está preenchido.
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}
```

O que mudou: ao clicar em "Lançar Notas" no menu, o carregarNotas() corre. Ao clicar em "Marcar Faltas", o carregarFaltas() corre. Assim o conteúdo aparece sempre, mesmo sem clicar em botões da turma.

---

Resumo das alterações

Ficheiro Alteração
Supabase (SQL) Corrigir cesc_professor_marcar_falta (bug do FROM)
admin/scripts/professor.js Substituir carregarFaltas (tabela + cartões)
admin/scripts/professor.js Substituir mostrarSeccao (chama carregar ao entrar na secção)
admin/css/professor.css Acrescentar .falta-btn-grande + regras mobile para faltas

---

Como testar (depois de aplicar tudo)

1. SQL: corre a RPC corrigida.
2. JS: aplica as duas substituições.
3. CSS: acrescenta o bloco.
4. Recarrega o browser.
5. Testa em desktop:
   · Menu → Lançar Notas → tabela aparece.
   · Menu → Marcar Faltas → tabela aparece.
   · Clicar em "+ Falta hoje" → deve funcionar (agora a RPC corrigida devolve ok).
6. Testa em mobile:
   · Menu → Lançar Notas → cartões aparecem.
   · Menu → Marcar Faltas → cartões com botão "+ Marcar falta hoje" aparecem.
   · Clicar no botão → falta registada.

---

Diz-me:

· A RPC corrigida deu erro no Supabase?
· Depois de aplicar as alterações, o menu "Lançar Notas" e "Marcar Faltas" mostra conteúdo em mobile?
· O botão de falta funciona?
Aqui está o admin/scripts/professor.js completo, com todas as correções aplicadas (responsividade de faltas, mostrarSeccao a carregar, e tabela + cartões nas faltas).

```javascript
/*
 CESC - Área do professor
 Data: 22/10/2026

 - Valida token e role (professor).
 - Carrega dados do professor (turmas).
 - Lançar notas: tabela (desktop) + cartões (mobile), ambos com
   avaliações contínuas + NPT.
 - Marcar faltas: tabela (desktop) + cartões (mobile).

 Versão 2.1:
 - mostrarSeccao chama carregarNotas/carregarFaltas ao entrar na secção.
 - carregarFaltas gera tabela + cartões (como renderizarTabelaNotas).
 - Corrige bug de faltas não aparecerem em mobile.
 */

let dadosProf = null;
let turmaActualNotas = null;
let trimestreActual = 1;

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
    const token = exigirLogin();
    if (!token) return;

    const menuBtn = document.getElementById("menuMobileBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarFechar = document.getElementById("sidebarFechar");
    const overlay = document.getElementById("sidebarOverlay");

    if (menuBtn) menuBtn.addEventListener("click", function () {
        sidebar.classList.add("aberta");
        overlay.classList.add("ativo");
    });
    if (sidebarFechar) sidebarFechar.addEventListener("click", fecharSidebar);
    if (overlay) overlay.addEventListener("click", fecharSidebar);

    function fecharSidebar() {
        sidebar.classList.remove("aberta");
        overlay.classList.remove("ativo");
    }

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (item) {
        item.addEventListener("click", function (e) {
            e.preventDefault();
            mostrarSeccao(item.getAttribute("data-seccao"));
            fecharSidebar();
        });
    });

    const linkSair = document.getElementById("link-sair");
    if (linkSair) {
        linkSair.addEventListener("click", function (e) {
            e.preventDefault();
            fazerLogout();
        });
    }

    const dados = await chamarRPC("cesc_professor_dashboard", { p_token: token });

    if (!dados.ok) {
        if (dados.erro && dados.erro.indexOf("autorizado") !== -1) {
            window.location.href = "../paginas/dashboard.html";
            return;
        }
        document.getElementById("loader").innerHTML =
            '<p style="color:var(--cor-erro);">' + esc(dados.erro || "Erro ao carregar.") + '</p>';
        return;
    }

    dadosProf = dados;
    renderizarTudo(dados);
    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";
});

// ============================================================
// NAVEGAÇÃO
// ============================================================
function mostrarSeccao(id) {
    document.querySelectorAll(".pagina-seccao").forEach(function (s) {
        s.classList.remove("ativa");
    });
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (n) {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    // Carregar conteúdo da secção ao entrar
    if (id === "notas" && dadosProf) {
        carregarNotas();
    } else if (id === "faltas" && dadosProf) {
        carregarFaltas();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// RENDERIZAÇÃO INICIAL
// ============================================================
function renderizarTudo(dados) {
    const prof = dados.professor;
    const turmas = dados.turmas || [];

    const inicial = (prof.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("prof-avatar").textContent = inicial;
    document.getElementById("prof-nome-sidebar").textContent = prof.nome_completo;
    document.getElementById("prof-dept-sidebar").textContent = prof.departamento || "—";

    const primeiroNome = prof.nome_completo.split(" ")[0];
    document.getElementById("boas-vindas").textContent = "Bem-vindo de volta, " + primeiroNome + ".";

    document.getElementById("stat-turmas").textContent = turmas.length;
    const totalAlunos = turmas.reduce(function (s, t) { return s + (t.total_alunos || 0); }, 0);
    document.getElementById("stat-alunos").textContent = totalAlunos;
    document.getElementById("stat-notas").textContent = "—";

    const listaVG = document.getElementById("lista-turmas-visao-geral");
    if (turmas.length === 0) {
        listaVG.innerHTML = '<p style="color:var(--cor-texto-suave); font-size:0.9rem;">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t) {
            html += '<div class="info-linha">';
            html += '<span class="rotulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + ' · ' + esc(t.disciplina) + '</span>';
            html += '<span class="valor">' + (t.total_alunos || 0) + ' alunos</span>';
            html += '</div>';
        });
        listaVG.innerHTML = html;
    }

    const listaTurmas = document.getElementById("lista-turmas");
    if (turmas.length === 0) {
        listaTurmas.innerHTML = '<p style="color:var(--cor-texto-suave);">Não lecionas nenhuma turma.</p>';
    } else {
        let html = "";
        turmas.forEach(function (t, idx) {
            html += '<div class="turma-card">';
            html += '  <h3 class="turma-card-titulo">' + esc(t.classe) + ' · Turma ' + esc(t.turma) + '</h3>';
            html += '  <p class="turma-card-meta">' + esc(t.disciplina) + ' · ' + esc(t.ano_lectivo) + '<br>' + (t.total_alunos || 0) + ' alunos</p>';
            html += '  <div class="turma-card-acoes">';
            html += '    <button onclick="irParaNotas(' + idx + ')">Lançar notas</button>';
            html += '    <button onclick="irParaFaltas(' + idx + ')">Marcar faltas</button>';
            html += '  </div>';
            html += '</div>';
        });
        listaTurmas.innerHTML = html;
    }

    const selNotas = document.getElementById("sel-turma-notas");
    const selFaltas = document.getElementById("sel-turma-faltas");
    [selNotas, selFaltas].forEach(function (sel) {
        if (!sel) return;
        sel.innerHTML = "";
        turmas.forEach(function (t, idx) {
            const opt = document.createElement("option");
            opt.value = idx;
            opt.textContent = t.classe + " · " + t.turma + " · " + t.disciplina;
            sel.appendChild(opt);
        });
        sel.addEventListener("change", function () {
            if (sel === selNotas) carregarNotas();
            else carregarFaltas();
        });
    });

    const selTrim = document.getElementById("sel-trimestre");
    if (selTrim) {
        selTrim.addEventListener("change", function () {
            trimestreActual = parseInt(this.value, 10);
            carregarNotas();
        });
    }

    const perfil = document.getElementById("lista-perfil");
    let html = '<div class="card-info"><h3><i class="fas fa-user"></i> Dados</h3>';
    html += linhaInfo("Nome", prof.nome_completo);
    html += linhaInfo("Email", prof.email);
    html += linhaInfo("Departamento", prof.departamento);
    html += linhaInfo("Turmas", turmas.length);
    html += '</div>';
    perfil.innerHTML = html;
}

function linhaInfo(rotulo, valor) {
    return '<div class="info-linha"><span class="rotulo">' + rotulo +
        '</span><span class="valor">' + (valor || "—") + '</span></div>';
}

// ============================================================
// IR PARA SECÇÕES (a partir dos botões da turma)
// ============================================================
function irParaNotas(idx) {
    document.getElementById("sel-turma-notas").value = String(idx);
    mostrarSeccao("notas");
    carregarNotas();
}

function irParaFaltas(idx) {
    document.getElementById("sel-turma-faltas").value = String(idx);
    mostrarSeccao("faltas");
    carregarFaltas();
}

// ============================================================
// LANÇAR NOTAS
// ============================================================
async function carregarNotas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-notas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    turmaActualNotas = dadosProf.turmas[idx];
    const infoEl = document.getElementById("notas-info");
    infoEl.style.display = "block";
    infoEl.textContent = "A carregar alunos...";

    const tabelaEl = document.getElementById("tabela-notas");
    tabelaEl.innerHTML = "";

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turmaActualNotas.ano_lectivo,
        p_classe: turmaActualNotas.classe,
        p_turma: turmaActualNotas.turma,
        p_disciplina: turmaActualNotas.disciplina
    });

    if (!dados.ok) {
        infoEl.textContent = dados.erro || "Erro ao carregar alunos.";
        return;
    }

    const alunos = dados.alunos || [];
    infoEl.textContent = alunos.length + " alunos em " + turmaActualNotas.classe + " · Turma " + turmaActualNotas.turma + " (" + turmaActualNotas.disciplina + ")";

    renderizarTabelaNotas(alunos);
}

function renderizarTabelaNotas(alunos) {
    const container = document.getElementById("tabela-notas");
    if (!container) return;

    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    // ===== TABELA (desktop) =====
    let html = '<table class="tabela-notas tabela-desktop">';
    html += '<thead><tr>';
    html += '  <th class="col-expandir"></th>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">MAC</th>';
    html += '  <th class="centro">NPT</th>';
    html += '  <th class="centro">MT</th>';
    html += '  <th class="centro">MFD</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const notas = (a.notas || []).find(function (n) { return n.trimestre === trimestreActual; }) || {};
        const mac = notas.mac;
        const npt = notas.npt;
        const mt = notas.mt;
        const mfd = notas.mfd;

        html += '<tr data-aluno-idx="' + idx + '">';
        html += '  <td class="col-expandir">';
        html += '    <button class="btn-expandir" data-expandir="' + idx + '"><i class="fas fa-chevron-right"></i></button>';
        html += '  </td>';
        html += '  <td class="aluno-nome-cell">';
        html += '    <strong>' + esc(a.nome_completo) + '</strong>';
        html += '    <span>BI: ' + esc(a.bi_numero) + ' · Nº ' + (a.numero_aluno || "—") + '</span>';
        html += '  </td>';
        html += '  <td class="celula-nota ' + (mac == null ? "vazia" : "") + '">' + (mac != null ? Number(mac).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (npt == null ? "vazia" : "") + '">' + (npt != null ? Number(npt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mt == null ? "vazia" : "") + '">' + (mt != null ? Number(mt).toFixed(1) : "—") + '</td>';
        html += '  <td class="celula-nota ' + (mfd == null ? "vazia" : "") + '">' + (mfd != null ? Number(mfd).toFixed(1) : "—") + '</td>';
        html += '</tr>';

        html += '<tr class="linha-expandida" data-expandida="' + idx + '" style="display:none;"><td colspan="6">';
        html += '  <div class="expandido-conteudo" data-conteudo="' + idx + '">A carregar...</div>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';

    // ===== CARTÕES (mobile) =====
    html += '<div class="cartoes-alunos">';

    alunos.forEach(function (a, idx) {
        const notas = (a.notas || []).find(function (n) { return n.trimestre === trimestreActual; }) || {};
        const mac = notas.mac;
        const npt = notas.npt;
        const mt = notas.mt;
        const mfd = notas.mfd;

        html += '<div class="cartao-aluno" data-cartao-idx="' + idx + '">';
        html += '  <div class="cartao-aluno-topo">';
        html += '    <div class="cartao-aluno-info">';
        html += '      <strong>' + esc(a.nome_completo) + '</strong>';
        html += '      <span>BI: ' + esc(a.bi_numero) + ' · Nº ' + (a.numero_aluno || "—") + '</span>';
        html += '    </div>';
        html += '  </div>';

        html += '  <div class="cartao-aluno-notas">';
        html += '    <div class="cartao-nota"><span class="rotulo">MAC</span><span class="valor ' + (mac == null ? "vazia" : "") + '">' + (mac != null ? Number(mac).toFixed(1) : "—") + '</span></div>';
        html += '    <div class="cartao-nota"><span class="rotulo">NPT</span><span class="valor ' + (npt == null ? "vazia" : "") + '">' + (npt != null ? Number(npt).toFixed(1) : "—") + '</span></div>';
        html += '    <div class="cartao-nota"><span class="rotulo">MT</span><span class="valor ' + (mt == null ? "vazia" : "") + '">' + (mt != null ? Number(mt).toFixed(1) : "—") + '</span></div>';
        html += '    <div class="cartao-nota"><span class="rotulo">MFD</span><span class="valor ' + (mfd == null ? "vazia" : "") + '">' + (mfd != null ? Number(mfd).toFixed(1) : "—") + '</span></div>';
        html += '  </div>';

        html += '  <button class="cartao-aluno-toggle" data-toggle-cartao="' + idx + '">';
        html += '    <i class="fas fa-chevron-down"></i> Ver avaliações';
        html += '  </button>';

        html += '  <div class="cartao-aluno-expandido" data-cartao-expandido="' + idx + '" style="display:none;">';
        html += '    <div class="expandido-conteudo" data-conteudo-mobile="' + idx + '">A carregar...</div>';
        html += '  </div>';

        html += '</div>';
    });

    html += '</div>';

    container.innerHTML = html;

    // Eventos: tabela (desktop)
    container.querySelectorAll("[data-expandir]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = this.getAttribute("data-expandir");
            const linha = container.querySelector('[data-expandida="' + idx + '"]');
            const estaAberta = linha.style.display !== "none";
            if (estaAberta) {
                linha.style.display = "none";
                btn.classList.remove("expandido");
            } else {
                linha.style.display = "table-row";
                btn.classList.add("expandido");
                carregarExpandido(alunos[parseInt(idx, 10)], parseInt(idx, 10), false);
            }
        });
    });

    // Eventos: cartões (mobile)
    container.querySelectorAll("[data-toggle-cartao]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = this.getAttribute("data-toggle-cartao");
            const painel = container.querySelector('[data-cartao-expandido="' + idx + '"]');
            const estaAberto = painel.style.display !== "none";
            if (estaAberto) {
                painel.style.display = "none";
                this.innerHTML = '<i class="fas fa-chevron-down"></i> Ver avaliações';
            } else {
                painel.style.display = "block";
                this.innerHTML = '<i class="fas fa-chevron-up"></i> Fechar';
                carregarExpandido(alunos[parseInt(idx, 10)], parseInt(idx, 10), true);
            }
        });
    });
}

async function carregarExpandido(aluno, idx, éMobile) {
    const token = obterToken();
    const seletor = éMobile
        ? '[data-conteudo-mobile="' + idx + '"]'
        : '[data-conteudo="' + idx + '"]';
    const container = document.querySelector(seletor);
    if (!container) return;

    const dados = await chamarRPC("cesc_professor_listar_avaliacoes", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual
    });

    if (!dados.ok) {
        container.innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>';
        return;
    }

    const avaliacoes = dados.avaliacoes || [];
    const fechado = dados.fechado;

    let soma = 0;
    avaliacoes.forEach(function (a) { soma += Number(a.nota); });
    const mac = avaliacoes.length > 0 ? (soma / avaliacoes.length).toFixed(2) : null;

    let html = '<div class="expandido-cabecalho">';
    html += '<div class="expandido-titulo"><i class="fas fa-list-check"></i> Avaliações contínuas';
    if (mac !== null) html += ' <span class="mac-valor">MAC: ' + mac + '</span>';
    html += '</div>';
    if (fechado) {
        html += '<span style="font-size:0.8rem; color:var(--cor-texto-leve); font-style:italic;">Trimestre fechado — não editável</span>';
    } else {
        html += '<button class="btn-adicionar-avaliacao" data-add="' + idx + '"><i class="fas fa-plus"></i> Adicionar avaliação</button>';
    }
    html += '</div>';

    if (avaliacoes.length === 0) {
        html += '<div class="avaliacoes-vazio">Ainda sem avaliações contínuas neste trimestre.</div>';
    } else {
        html += '<div class="lista-avaliacoes">';
        avaliacoes.forEach(function (av) {
            html += '<div class="avaliacao-item">';
            html += '  <span class="av-desc">' + esc(av.descricao || "Avaliação") + '</span>';
            html += '  <span class="av-nota">' + Number(av.nota).toFixed(1) + '</span>';
            if (!fechado) {
                html += '  <button class="av-remover" data-remover="' + av.id + '" data-aluno-idx="' + idx + '"><i class="fas fa-trash"></i></button>';
            }
            html += '</div>';
        });
        html += '</div>';
    }

    html += '<div class="form-nova-avaliacao" data-form="' + idx + '" style="display:none;">';
    html += '  <div class="campo-grupo">';
    html += '    <label>Nota (0-20)</label>';
    html += '    <input type="number" min="0" max="20" step="0.1" data-input-nota="' + idx + '">';
    html += '  </div>';
    html += '  <div class="campo-grupo">';
    html += '    <label>Descrição</label>';
    html += '    <input type="text" placeholder="Ex: Teste 1" data-input-desc="' + idx + '">';
    html += '  </div>';
    html += '  <button class="btn-confirmar" data-confirmar="' + idx + '">Adicionar</button>';
    html += '  <button class="btn-cancelar" data-cancelar="' + idx + '">Cancelar</button>';
    html += '</div>';

    if (!fechado) {
        const nptActual = (aluno.notas || []).find(function (n) { return n.trimestre === trimestreActual; });
        html += '<div style="border-top:1px solid var(--cor-borda); padding-top:16px; margin-top:8px;">';
        html += '<div class="expandido-titulo" style="margin-bottom:12px;"><i class="fas fa-clipboard-check"></i> Nota da Prova Trimestral (NPT)</div>';
        html += '<div class="npt-wrapper">';
        html += '<input type="number" min="0" max="20" step="0.1" data-input-npt="' + idx + '" placeholder="NPT" value="' + (nptActual && nptActual.npt != null ? nptActual.npt : "") + '">';
        html += '<button class="btn-lancar-npt" data-lancar-npt="' + idx + '">Lançar NPT e fechar trimestre</button>';
        html += '</div>';
        html += '</div>';
    }

    container.innerHTML = html;

    const addBtn = container.querySelector('[data-add="' + idx + '"]');
    const formEl = container.querySelector('[data-form="' + idx + '"]');
    if (addBtn && formEl) {
        addBtn.addEventListener("click", function () {
            formEl.style.display = formEl.style.display === "none" ? "flex" : "none";
        });
    }

    const confirmarBtn = container.querySelector('[data-confirmar="' + idx + '"]');
    if (confirmarBtn) {
        confirmarBtn.addEventListener("click", function () {
            adicionarAvaliacao(aluno, idx);
        });
    }

    const cancelarBtn = container.querySelector('[data-cancelar="' + idx + '"]');
    if (cancelarBtn && formEl) {
        cancelarBtn.addEventListener("click", function () {
            formEl.style.display = "none";
        });
    }

    container.querySelectorAll("[data-remover]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (confirm("Remover esta avaliação?")) {
                removerAvaliacao(this.getAttribute("data-remover"), aluno, idx);
            }
        });
    });

    const lancarNptBtn = container.querySelector('[data-lancar-npt="' + idx + '"]');
    if (lancarNptBtn) {
        lancarNptBtn.addEventListener("click", function () {
            lancarNPT(aluno, idx);
        });
    }
}

async function adicionarAvaliacao(aluno, idx) {
    const token = obterToken();
    const notaInput = document.querySelector('[data-input-nota="' + idx + '"]');
    const descInput = document.querySelector('[data-input-desc="' + idx + '"]');
    const nota = parseFloat(notaInput.value);
    const desc = descInput.value.trim() || "Avaliação";

    if (isNaN(nota) || nota < 0 || nota > 20) {
        alert("Nota inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_adicionar_avaliacao", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_nota: nota,
        p_descricao: desc
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao adicionar avaliação.");
        return;
    }

    carregarExpandido(aluno, idx, false);
    carregarNotas();
}

async function removerAvaliacao(avaliacaoId, aluno, idx) {
    const token = obterToken();
    const dados = await chamarRPC("cesc_professor_remover_avaliacao", {
        p_token: token,
        p_avaliacao_id: avaliacaoId
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao remover.");
        return;
    }

    carregarExpandido(aluno, idx, false);
    carregarNotas();
}

async function lancarNPT(aluno, idx) {
    const token = obterToken();
    const inputNpt = document.querySelector('[data-input-npt="' + idx + '"]');
    const npt = parseFloat(inputNpt.value);

    if (isNaN(npt) || npt < 0 || npt > 20) {
        alert("NPT inválida. Deve estar entre 0 e 20.");
        return;
    }

    const dados = await chamarRPC("cesc_professor_lancar_npt", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turmaActualNotas.disciplina,
        p_trimestre: trimestreActual,
        p_npt: npt
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao lançar NPT.");
        return;
    }

    alert("NPT lançada. MAC: " + dados.mac + ", MT: " + dados.mt + (dados.mfd != null ? ", MFD: " + dados.mfd : ""));
    carregarNotas();
}

// ============================================================
// MARCAR FALTAS
// ============================================================
async function carregarFaltas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-faltas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    const turma = dadosProf.turmas[idx];
    const container = document.getElementById("tabela-faltas");
    container.innerHTML = '<div class="loader-container"><div class="loader"></div><p>A carregar...</p></div>';

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turma.ano_lectivo,
        p_classe: turma.classe,
        p_turma: turma.turma,
        p_disciplina: turma.disciplina
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>';
        return;
    }

    const alunos = dados.alunos || [];
    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    // ===== TABELA (desktop) =====
    let html = '<table class="tabela-notas tabela-desktop">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">Acção</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, i) {
        html += '<tr>';
        html += '<td class="aluno-nome-cell"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></td>';
        html += '<td class="centro"><button class="falta-btn" data-falta-idx="' + i + '">+ Falta hoje</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table>';

    // ===== CARTÕES (mobile) =====
    html += '<div class="cartoes-alunos">';
    alunos.forEach(function (a, i) {
        html += '<div class="cartao-aluno">';
        html += '  <div class="cartao-aluno-topo">';
        html += '    <div class="cartao-aluno-info">';
        html += '      <strong>' + esc(a.nome_completo) + '</strong>';
        html += '      <span>BI: ' + esc(a.bi_numero) + '</span>';
        html += '    </div>';
        html += '  </div>';
        html += '  <button class="falta-btn falta-btn-grande" data-falta-idx-mobile="' + i + '">';
        html += '    <i class="fas fa-user-clock"></i> Marcar falta hoje';
        html += '  </button>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    // Eventos: tabela (desktop)
    container.querySelectorAll("[data-falta-idx]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = parseInt(this.getAttribute("data-falta-idx"), 10);
            marcarFalta(alunos[i], turma);
        });
    });

    // Eventos: cartões (mobile)
    container.querySelectorAll("[data-falta-idx-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = parseInt(this.getAttribute("data-falta-idx-mobile"), 10);
            marcarFalta(alunos[i], turma);
        });
    });
}

async function marcarFalta(aluno, turma) {
    const token = obterToken();
    const hoje = new Date();
    const data = hoje.toISOString().slice(0, 10);
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mes = meses[hoje.getMonth()];

    const justificada = confirm("Marcar como justificada?\n\nOK = Justificada\nCancelar = Não justificada");

    const dados = await chamarRPC("cesc_professor_marcar_falta", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turma.disciplina,
        p_mes: mes,
        p_data: data,
        p_justificada: justificada
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao marcar falta.");
        return;
    }

    alert("Falta registada para " + aluno.nome_completo + ".");
    carregarFaltas();
}
```

---

Resumo do que mudou nesta versão

Alteração Onde
mostrarSeccao chama carregarNotas() / carregarFaltas() ao entrar na secção mostrarSeccao
carregarFaltas gera tabela (desktop) e cartões (mobile) carregarFaltas
marcarFalta recarrega a lista após sucesso (carregarFaltas()) marcarFalta

---

Antes de testar

1. Aplica o SQL corrigido (o que te dei antes para cesc_professor_marcar_falta).
2. Substitui o admin/scripts/professor.js por este.
3. Confirma que o CSS responsivo está no admin/css/professor.css (o bloco com .tabela-desktop, .cartoes-alunos, .falta-btn-grande).
4. Recarrega o browser.

Testa:

· Menu → Lançar Notas → tabela (desktop) ou cartões (mobile).
· Menu → Marcar Faltas → tabela (desktop) ou cartões (mobile).
· Clicar em "+ Falta hoje" (desktop) ou "Marcar falta hoje" (mobile) → deve abrir o confirm e registar a falta.

Diz-me se está funcional. Se algo falhar, cola o erro da consola.
Tens razão em tudo. O confirm() é feio, primitivo e não mostra contexto. Vou reformular a marcação de faltas para seguir o padrão dos cartões de notas:

· Ao clicar no aluno, aparece um painel dentro do cartão (ou linha expandida em desktop) com:
  · Lista de faltas já registadas (data, mês, justificada/não justificada).
  · Formulário inline para adicionar nova falta (data, mês, justificada).
  · Total de faltas do aluno naquela disciplina.
· Sem confirm(). Tudo visual, como as notas.

Isto exige:

1. Nova RPC no Supabase para listar as faltas de um aluno numa disciplina: cesc_professor_listar_faltas.
2. Reescrever carregarFaltas e marcarFalta no professor.js.
3. Reescrever os cartões/linhas de faltas.

---

Bloco 1 — SQL: nova RPC cesc_professor_listar_faltas

Corre no SQL Editor:

```sql
-- ============================================================
-- RPC: listar faltas de um aluno numa disciplina
-- ============================================================
CREATE OR REPLACE FUNCTION public.cesc_professor_listar_faltas(
    p_token varchar,
    p_matricula_id uuid,
    p_disciplina varchar
) RETURNS json AS $$
DECLARE
    v_sessao record;
    v_user record;
    v_prof record;
    v_matricula record;
    v_autorizado boolean;
BEGIN
    -- 1. Sessão
    SELECT * INTO v_sessao FROM public.sessoes
    WHERE token = p_token AND app_name = 'CESC' AND expira_em > now();
    IF v_sessao IS NULL THEN
        RETURN json_build_object('ok', false, 'erro', 'Sessão inválida.');
    END IF;

    -- 2. Utilizador
    SELECT * INTO v_user FROM cesc.utilizadores WHERE email = v_sessao.user_email;
    IF v_user IS NULL OR v_user.role <> 'professor' THEN
        RETURN json_build_object('ok', false, 'erro', 'Não autorizado.');
    END IF;

    SELECT * INTO v_prof FROM cesc.professores WHERE utilizador_id = v_user.id;

    -- 3. Matrícula
    SELECT * INTO v_matricula FROM cesc.matriculas WHERE id = p_matricula_id;
    IF v_matricula IS NULL THEN
        RETURN json_build_object('ok', false, 'erro', 'Matrícula não encontrada.');
    END IF;

    -- 4. Autorização
    SELECT EXISTS(
        SELECT 1 FROM cesc.professores_disciplinas
        WHERE professor_id = v_prof.id
          AND ano_lectivo = v_matricula.ano_lectivo
          AND classe = v_matricula.classe
          AND turma = v_matricula.turma
          AND disciplina = p_disciplina
    ) INTO v_autorizado;

    IF NOT v_autorizado THEN
        RETURN json_build_object('ok', false, 'erro', 'Não lecionas esta disciplina nesta turma.');
    END IF;

    -- 5. Devolver faltas
    RETURN json_build_object(
        'ok', true,
        'faltas', COALESCE((
            SELECT json_agg(json_build_object(
                'id', f.id,
                'mes', f.mes,
                'data_falta', f.data_falta,
                'quantidade', f.quantidade,
                'justificada', f.justificada
            ) ORDER BY f.data_falta DESC)
            FROM cesc.faltas f
            WHERE f.matricula_id = p_matricula_id
              AND f.disciplina = p_disciplina
        ), '[]'::json),
        'total', COALESCE((
            SELECT SUM(f.quantidade) FROM cesc.faltas f
            WHERE f.matricula_id = p_matricula_id AND f.disciplina = p_disciplina
        ), 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'RPC criada: ' || count(*) FROM pg_proc WHERE proname = 'cesc_professor_listar_faltas';
```

O que faz: devolve a lista de faltas do aluno naquela disciplina, ordenada por data descendente, mais o total.

---

Bloco 2 — Reescrever carregarFaltas e marcarFalta no professor.js

Substitui as duas funções inteiras (a partir de async function carregarFaltas() até ao fim do ficheiro) por este bloco:

```javascript
// ============================================================
// MARCAR FALTAS
// ============================================================
async function carregarFaltas() {
    const token = obterToken();
    if (!token || !dadosProf) return;

    const sel = document.getElementById("sel-turma-faltas");
    const idx = parseInt(sel.value, 10);
    if (isNaN(idx) || !dadosProf.turmas[idx]) return;

    const turma = dadosProf.turmas[idx];
    const container = document.getElementById("tabela-faltas");
    container.innerHTML = '<div class="loader-container"><div class="loader"></div><p>A carregar...</p></div>';

    const dados = await chamarRPC("cesc_professor_alunos", {
        p_token: token,
        p_ano_lectivo: turma.ano_lectivo,
        p_classe: turma.classe,
        p_turma: turma.turma,
        p_disciplina: turma.disciplina
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>';
        return;
    }

    const alunos = dados.alunos || [];
    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem alunos nesta turma.</div>';
        return;
    }

    // ===== TABELA (desktop) =====
    let html = '<table class="tabela-notas tabela-desktop">';
    html += '<thead><tr>';
    html += '  <th class="col-expandir"></th>';
    html += '  <th>Aluno</th>';
    html += '  <th class="centro">Faltas (esta disciplina)</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, i) {
        html += '<tr data-aluno-falta-idx="' + i + '">';
        html += '  <td class="col-expandir">';
        html += '    <button class="btn-expandir" data-expandir-falta="' + i + '"><i class="fas fa-chevron-right"></i></button>';
        html += '  </td>';
        html += '  <td class="aluno-nome-cell"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></td>';
        html += '  <td class="centro"><span class="falta-total-badge" data-falta-total="' + i + '">—</span></td>';
        html += '</tr>';

        html += '<tr class="linha-expandida" data-expandida-falta="' + i + '" style="display:none;"><td colspan="3">';
        html += '  <div class="expandido-conteudo" data-conteudo-falta="' + i + '">A carregar...</div>';
        html += '</td></tr>';
    });

    html += '</tbody></table>';

    // ===== CARTÕES (mobile) =====
    html += '<div class="cartoes-alunos">';
    alunos.forEach(function (a, i) {
        html += '<div class="cartao-aluno">';
        html += '  <div class="cartao-aluno-topo">';
        html += '    <div class="cartao-aluno-info">';
        html += '      <strong>' + esc(a.nome_completo) + '</strong>';
        html += '      <span>BI: ' + esc(a.bi_numero) + '</span>';
        html += '    </div>';
        html += '    <span class="falta-total-badge" data-falta-total-mobile="' + i + '">—</span>';
        html += '  </div>';
        html += '  <button class="cartao-aluno-toggle" data-toggle-cartao-falta="' + i + '">';
        html += '    <i class="fas fa-chevron-down"></i> Ver faltas';
        html += '  </button>';
        html += '  <div class="cartao-aluno-expandido" data-cartao-expandido-falta="' + i + '" style="display:none;">';
        html += '    <div class="expandido-conteudo" data-conteudo-falta-mobile="' + i + '">A carregar...</div>';
        html += '  </div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    // Eventos: tabela (desktop)
    container.querySelectorAll("[data-expandir-falta]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = this.getAttribute("data-expandir-falta");
            const linha = container.querySelector('[data-expandida-falta="' + i + '"]');
            const estaAberta = linha.style.display !== "none";
            if (estaAberta) {
                linha.style.display = "none";
                btn.classList.remove("expandido");
            } else {
                linha.style.display = "table-row";
                btn.classList.add("expandido");
                carregarFaltasAluno(alunos[parseInt(i, 10)], turma, parseInt(i, 10), false);
            }
        });
    });

    // Eventos: cartões (mobile)
    container.querySelectorAll("[data-toggle-cartao-falta]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const i = this.getAttribute("data-toggle-cartao-falta");
            const painel = container.querySelector('[data-cartao-expandido-falta="' + i + '"]');
            const estaAberto = painel.style.display !== "none";
            if (estaAberto) {
                painel.style.display = "none";
                this.innerHTML = '<i class="fas fa-chevron-down"></i> Ver faltas';
            } else {
                painel.style.display = "block";
                this.innerHTML = '<i class="fas fa-chevron-up"></i> Fechar';
                carregarFaltasAluno(alunos[parseInt(i, 10)], turma, parseInt(i, 10), true);
            }
        });
    });

    // Carregar o total de faltas de cada aluno (chamada em paralelo)
    alunos.forEach(function (a, i) {
        chamarRPC("cesc_professor_listar_faltas", {
            p_token: token,
            p_matricula_id: a.matricula_id,
            p_disciplina: turma.disciplina
        }).then(function (r) {
            if (!r.ok) return;
            const total = r.total || 0;
            const badge = container.querySelector('[data-falta-total="' + i + '"]');
            const badgeMobile = container.querySelector('[data-falta-total-mobile="' + i + '"]');
            if (badge) badge.textContent = total;
            if (badgeMobile) badgeMobile.textContent = total;
        });
    });
}

async function carregarFaltasAluno(aluno, turma, idx, éMobile) {
    const token = obterToken();
    const seletor = éMobile
        ? '[data-conteudo-falta-mobile="' + idx + '"]'
        : '[data-conteudo-falta="' + idx + '"]';
    const container = document.querySelector(seletor);
    if (!container) return;

    const dados = await chamarRPC("cesc_professor_listar_faltas", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turma.disciplina
    });

    if (!dados.ok) {
        container.innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>';
        return;
    }

    const faltas = dados.faltas || [];
    const total = dados.total || 0;

    let html = '<div class="expandido-cabecalho">';
    html += '<div class="expandido-titulo"><i class="fas fa-user-clock"></i> Faltas em ' + esc(turma.disciplina) + ' <span class="mac-valor">Total: ' + total + '</span></div>';
    html += '<button class="btn-adicionar-avaliacao" data-add-falta="' + idx + '"><i class="fas fa-plus"></i> Adicionar falta</button>';
    html += '</div>';

    if (faltas.length === 0) {
        html += '<div class="avaliacoes-vazio">Ainda sem faltas registadas nesta disciplina.</div>';
    } else {
        html += '<div class="lista-avaliacoes">';
        faltas.forEach(function (f) {
            html += '<div class="avaliacao-item">';
            html += '  <span class="av-desc">' + (f.data_falta || "—") + ' · ' + esc(f.mes || "") + '</span>';
            html += '  <span class="falta-status ' + (f.justificada ? "justificada" : "nao-justificada") + '">' + (f.justificada ? "Justificada" : "Não justificada") + '</span>';
            html += '</div>';
        });
        html += '</div>';
    }

    // Formulário inline de nova falta
    html += '<div class="form-nova-falta" data-form-falta="' + idx + '" style="display:none;">';
    html += '  <div class="campo-grupo">';
    html += '    <label>Data</label>';
    html += '    <input type="date" data-input-data-falta="' + idx + '" value="' + new Date().toISOString().slice(0, 10) + '">';
    html += '  </div>';
    html += '  <div class="campo-grupo">';
    html += '    <label>Justificada?</label>';
    html += '    <select data-input-justificada="' + idx + '">';
    html += '      <option value="false">Não justificada</option>';
    html += '      <option value="true">Justificada</option>';
    html += '    </select>';
    html += '  </div>';
    html += '  <button class="btn-confirmar" data-confirmar-falta="' + idx + '">Registar</button>';
    html += '  <button class="btn-cancelar" data-cancelar-falta="' + idx + '">Cancelar</button>';
    html += '</div>';

    container.innerHTML = html;

    const addBtn = container.querySelector('[data-add-falta="' + idx + '"]');
    const formEl = container.querySelector('[data-form-falta="' + idx + '"]');
    if (addBtn && formEl) {
        addBtn.addEventListener("click", function () {
            formEl.style.display = formEl.style.display === "none" ? "flex" : "none";
        });
    }

    const confirmarBtn = container.querySelector('[data-confirmar-falta="' + idx + '"]');
    if (confirmarBtn) {
        confirmarBtn.addEventListener("click", function () {
            registarFalta(aluno, turma, idx, éMobile);
        });
    }

    const cancelarBtn = container.querySelector('[data-cancelar-falta="' + idx + '"]');
    if (cancelarBtn && formEl) {
        cancelarBtn.addEventListener("click", function () {
            formEl.style.display = "none";
        });
    }
}

async function registarFalta(aluno, turma, idx, éMobile) {
    const token = obterToken();
    const dataInput = document.querySelector('[data-input-data-falta="' + idx + '"]');
    const justInput = document.querySelector('[data-input-justificada="' + idx + '"]');

    const data = dataInput.value;
    const justificada = justInput.value === "true";

    if (!data) {
        alert("Escolhe uma data.");
        return;
    }

    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const dt = new Date(data + "T00:00:00");
    const mes = meses[dt.getMonth()];

    const confirmarBtn = document.querySelector('[data-confirmar-falta="' + idx + '"]');
    if (confirmarBtn) {
        confirmarBtn.disabled = true;
        confirmarBtn.textContent = "A registar...";
    }

    const dados = await chamarRPC("cesc_professor_marcar_falta", {
        p_token: token,
        p_matricula_id: aluno.matricula_id,
        p_disciplina: turma.disciplina,
        p_mes: mes,
        p_data: data,
        p_justificada: justificada
    });

    if (!dados.ok) {
        alert(dados.erro || "Erro ao registar falta.");
        if (confirmarBtn) {
            confirmarBtn.disabled = false;
            confirmarBtn.textContent = "Registar";
        }
        return;
    }

    // Recarregar a lista de faltas deste aluno
    carregarFaltasAluno(aluno, turma, idx, éMobile);

    // Recarregar os badges de total em todos os alunos
    carregarFaltas();
}
```

---

Bloco 3 — CSS adicional

Acrescenta ao fim do admin/css/professor.css:

```css
/* ===== Faltas ===== */
.falta-total-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    padding: 4px 10px;
    background-color: var(--cor-erro-fundo);
    color: var(--cor-erro);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 100px;
    font-size: 0.85rem;
    font-weight: 700;
}

.falta-status {
    font-size: 0.78rem;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 100px;
    white-space: nowrap;
}

.falta-status.justificada {
    background-color: var(--cor-sucesso-fundo);
    color: #065f46;
}

.falta-status.nao-justificada {
    background-color: var(--cor-erro-fundo);
    color: var(--cor-erro);
}

.form-nova-falta {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-wrap: wrap;
    padding: 12px;
    background-color: #fff;
    border: 1px solid var(--cor-borda);
    border-radius: 8px;
    margin-top: 12px;
}

.form-nova-falta .campo-grupo {
    margin-bottom: 0;
    flex: 1 1 140px;
}

.form-nova-falta label {
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--cor-texto-suave);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}

.form-nova-falta input,
.form-nova-falta select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--cor-borda);
    border-radius: 6px;
    font-size: 0.85rem;
    font-family: inherit;
    box-sizing: border-box;
    background-color: #fff;
}

.form-nova-falta input:focus,
.form-nova-falta select:focus {
    outline: none;
    border-color: var(--cor-azul);
}

@media (max-width: 768px) {
    .form-nova-falta {
        flex-direction: column;
        align-items: stretch;
    }
    .form-nova-falta .campo-grupo {
        flex: 1 1 100%;
    }
}
```

---

Como fica agora

Desktop (marcar faltas):

```
┌───┬──────────────────┬──────────────┐
│   │ Aluno            │ Faltas       │
├───┼──────────────────┼──────────────┤
│ ▶ │ Francisco Tchiama│ [ 3 ]        │
│   │ Aluno Teste      │ [ 0 ]        │
└───┴──────────────────┴──────────────┘
```

Clicar no ▶ abre:

```
┌─────────────────────────────────────────────────┐
│ Faltas em Matemática  Total: 3   [+ Adicionar]  │
│ ┌─────────────────────────────────────────────┐ │
│ │ 2026-10-15 · Outubro  · [Não justificada]  │ │
│ │ 2026-10-08 · Outubro  · [Justificada]      │ │
│ │ 2026-09-20 · Setembro · [Não justificada]  │ │
│ └─────────────────────────────────────────────┘ │
│ [Data: 2026-10-22] [Justificada? ▼] [Registar] │
└─────────────────────────────────────────────────┘
```

Mobile: cartões por aluno, com badge de total no topo. Botão "Ver faltas" abre o painel com a mesma estrutura.

Sem confirm(). Tudo visual, como as notas.

---

Como testar

1. Corre o SQL da nova RPC.
2. Substitui as funções carregarFaltas e marcarFalta pelas novas.
3. Acrescenta o CSS.
4. Recarrega o browser.
5. Vai a "Marcar Faltas":
   · Clica num aluno.
   · Vê o total de faltas (badge) e a lista das já registadas.
   · Adiciona uma falta com data e justificação.
   · A lista atualiza.

Diz-me o que acontece. Se quebrar, cola o erro da consola.

