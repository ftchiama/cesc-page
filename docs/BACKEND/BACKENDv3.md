Aqui tens o terceiro ficheiro, docs/BACKENDv3.md, completo.

```markdown
# CESC — Backend e Segurança (v3)

**Autor:** Francisco Tchiama  
**Companhia:** TCLabs  
**Data:** 10/11/2026  
**Versão:** 3.0

Este documento descreve a arquitetura, o modelo de dados, as RPCs e as políticas de segurança do CESC. Substitui as versões anteriores (BACKEND v1 e v2).

---

## 1. Contexto

O CESC vive no **mesmo projeto Supabase** do Kandamy (`kmdixtzvnhvtwkpsicoq`), mas está isolado num **schema separado** (`cesc`). O Kandamy usa o schema `public` sem alterações.

**Serviços externos:**
- **Supabase:** base de dados, autenticação caseira (tokens em `public.sessoes`), Storage, Edge Functions.
- **Render (`tclabs-email-api`):** envia e-mails via Brevo.
- **Brevo:** entrega real dos e-mails.
- **AppyPay:** gateway de pagamento (mock funcional, real pendente).

**Princípios aplicados:**

1. **Isolamento por schema.** Tudo do CESC em `cesc`. O Kandamy em `public`.
2. **Nenhuma operação sensível usa `anon` diretamente.** Tudo passa por RPCs `security definer`.
3. **Chaves sensíveis nunca saem do servidor.**
4. **O código de verificação nunca chega ao browser.**
5. **Autenticação em dois fatores obrigatória.**
6. **O BI é a chave de registo.**
7. **Estados do ciclo de vida da inscrição são explícitos e auditáveis.**

---

## 2. Modelo de dados (schema `cesc`)

### 2.1. Tabelas principais

| Tabela | Descrição |
|---|---|
| `cesc.utilizadores` | Contas de acesso (aluno, professor, secretária, diretor, coordenador, encarregado) |
| `cesc.alunos` | Ficha do aluno (BI, dados pessoais, encarregado, turma, estado) |
| `cesc.matriculas` | Histórico académico por ano letivo (classe, turma, curso, nº aluno, sala_id) |
| `cesc.avaliacoes_continuas` | Notas individuais lançadas pelo professor |
| `cesc.notas_trimestrais` | MAC, NPT, MT, MFD por disciplina/trimestre |
| `cesc.faltas` | Faltas por disciplina/mês |
| `cesc.trabalhos` | Biblioteca digital |
| `cesc.passes` | Pedidos de documentos |
| `cesc.professores` / `cesc.professores_disciplinas` | Ficha do professor e disciplinas |
| `cesc.candidatos` | Ficha persistente do candidato (BI único) |
| `cesc.inscricoes` | Candidatura anual (estado, tipo, documentos, médias) |
| `cesc.configuracoes` | Configurações globais (`ano_lectivo_actual`, `inscricoes_abertas`) |
| `cesc.codigos_inscricao` / `cesc.codigos_candidato` | Códigos 2FA |
| `cesc.sessoes_candidatos` | Tokens de sessão do candidato (2 horas) |
| `cesc.historico_candidato` | Auditoria de alterações do candidato |
| `cesc.analises_em_curso` | Lock de análise |
| `cesc.inscricoes_codigo_rejeicao` | Código de rejeição 0 ou 1 |
| `cesc.pagamentos` | Transações AppyPay |
| `cesc.regras_aura` | Regras de aprovação (atemporal, sem ano_lectivo) |
| `cesc.grelha_curricular` | Disciplinas por classe/curso (crítica ou secundária) |
| `cesc.salas` | Salas físicas (pavilhão, turno, capacidade) |
| `cesc.alocacao_salas` | Planta da escola (atemporal, com `criado_em`) |
| `cesc.classes` | Classes (7ª a 12ª) |
| `cesc.cursos` | Cursos (C.F.B, C.E.J, C.H) |
| `cesc.disciplinas` | Disciplinas |

### 2.2. Tabela `public.sessoes` (ponte)

Guarda os tokens de sessão (login) com `app_name = 'CESC'`. O frontend envia o token em cada pedido, e as RPCs validam-no.

### 2.3. Estados da inscrição

```

a_pagar → pendente → aprovada → matricula_paga → matriculado
↘ rejeitada (código 0 ou 1)

```

### 2.4. Estados do aluno (tabela `cesc.alunos`)

```

activo → concluido / retido / transferido / desistente

```

---

## 3. Segurança (RLS)

### 3.1. Estado do RLS

| Schema | Tabela | RLS | Política |
|---|---|---|---|
| `cesc` | todas as tabelas | ✅ | `USING (false)` — bloqueio total |
| `public` | `sessoes` | ✅ | `USING (false)` — bloqueio total |

**O que isto significa:** O `anon` e o `authenticated` não conseguem fazer SELECT/INSERT/UPDATE/DELETE diretamente. Todo o acesso passa por RPCs `security definer`.

### 3.2. Helper `cesc.validar_sessao_role`

Usado em todas as RPCs protegidas. Valida o token na tabela `public.sessoes` e verifica se o role do utilizador está autorizado.

---

## 4. RPCs (por área)

### 4.1. Autenticação

| RPC | Descrição |
|---|---|
| `cesc_criar_conta` | Cria conta de aluno (BI tem de existir em `cesc.alunos`) |
| `verificar_password_cesc` | Valida password (Edge Function usa `cesc`) |
| `cesc_login` | Gera código 2FA |
| `cesc_validar_codigo` | Valida código 2FA e cria sessão |
| `cesc_perfil_role` | Devolve role do utilizador (para redirect pós-login) |

### 4.2. Aluno

| RPC | Descrição |
|---|---|
| `get_perfil_completo` | Perfil do aluno (dashboard.js) |
| `get_minhas_notas` | Notas do aluno |
| `cesc_pedir_documento` | Pedido de certificado/declaração |

### 4.3. Professor

| RPC | Descrição |
|---|---|
| `cesc_professor_dashboard` | Perfil + turmas do professor |
| `cesc_professor_alunos` | Alunos de uma turma/disciplina |
| `cesc_professor_adicionar_avaliacao` | Adiciona nota individual, recalcula MAC |
| `cesc_professor_remover_avaliacao` | Remove nota individual, recalcula MAC |
| `cesc_professor_listar_avaliacoes` | Lista notas individuais |
| `cesc_professor_lancar_npt` | Lança NPT, fecha trimestre, calcula MT e MFD |
| `cesc_professor_marcar_falta` | Regista falta |
| `cesc_professor_listar_faltas` | Lista faltas |

### 4.4. Secretaria

| RPC | Descrição |
|---|---|
| `cesc_secretaria_dashboard` | Stats + últimos alunos |
| `cesc_secretaria_listar_alunos` / `criar_aluno` / `editar_aluno` | Gestão de alunos |
| `cesc_secretaria_listar_matriculas` / `criar_matricula` | Gestão de matrículas |
| `cesc_secretaria_listar_documentos` / `marcar_documento` | Gestão de documentos |
| `cesc_secretaria_listar_inscricoes` / `aprovar_inscricao` / `rejeitar_inscricao` | Gestão de inscrições |
| `cesc_secretaria_contar_inscricoes_pendentes` | Total de pendentes |
| `cesc_secretaria_iniciar_analise` / `terminar_analise` | Bloqueio de análise |
| `cesc_secretaria_historico_candidato` | Histórico de alterações |
| `cesc_secretaria_atribuir_turma` | Atribui turma ao aluno |
| `cesc_secretaria_listar_salas` / `criar_sala` / `apagar_sala` | Gestão de salas |
| `cesc_secretaria_criar_convite` | Gera convite para candidato |
| `cesc_secretaria_criar_utilizador` | Cria conta de staff |

### 4.5. Candidato

| RPC | Descrição |
|---|---|
| `cesc_verificar_bi_inscricao` | Verifica se BI já está registado |
| `cesc_submeter_inscricao` | Submete inscrição (estado `a_pagar`) |
| `cesc_login_candidato` / `cesc_validar_codigo_candidato` | Login do candidato (2FA) |
| `cesc_encontrar_candidato` | Verifica par BI + e-mail |
| `cesc_candidato_painel` | Dados do painel |
| `cesc_candidato_atualizar_perfil` | Atualiza dados pessoais |
| `cesc_candidato_atualizar_documento` | Substitui documento |
| `cesc_candidato_recandidatar` | Recandidatura (se rejeitada + código 1) |
| `cesc_candidato_listar_historico` | Histórico de alterações |
| `cesc_candidato_iniciar_pagamento` / `confirmar_pagamento` | Pagamento |
| `cesc_consultar_inscricao` | Consulta por referência + BI |
| `cesc_validar_convite` | Valida convite (BI + nome) |

### 4.6. Diretor (Académico)

| RPC | Descrição |
|---|---|
| `cesc_diretor_listar_classes` / `guardar_classe` / `apagar_classe` | Gestão de classes (com proteções) |
| `cesc_diretor_listar_cursos` / `guardar_curso` / `apagar_curso` | Gestão de cursos (com proteções) |
| `cesc_diretor_listar_disciplinas` / `guardar_disciplina` / `apagar_disciplina` | Gestão de disciplinas (com proteções) |
| `cesc_diretor_listar_grelha` / `guardar_grelha` / `apagar_grelha` | Grelha Curricular (com proteções) |

### 4.7. Diretor (AURA)

| RPC | Descrição |
|---|---|
| `cesc_diretor_listar_regras_aura` / `atualizar_regra_aura` / `apagar_regra_aura` | Regras de aprovação (atemporal) |
| `cesc_diretor_listar_alocacoes` / `apagar_alocacao` | Alocação de salas (atemporal) |
| `cesc_aura_guardar_regra` / `cesc_aura_guardar_alocacao` | Criação de regras/alocações |
| `cesc_aura_julgar` | O JUIZ (com proteções) |
| `cesc_aura_transicao` | A TRANSIÇÃO (com proteções) |
| `cesc_aura_distribuir` | O DISTRIBUIDOR (com proteções) |

### 4.8. Consulta pública

| RPC | Descrição |
|---|---|
| `cesc_listar_classes_publico` | Lista classes para o formulário de inscrição |
| `cesc_listar_cursos_publico` | Lista cursos para o formulário de inscrição |
| `cesc_consultar_inscricao` | Consulta por referência + BI |

---

## 5. Edge Functions

| Função | Descrição | Estado |
|---|---|---|
| `enviar-codigo` | Único ponto de envio de códigos 2FA | ✅ Funcional |
| `gerar-url-assinada` | Gera URL assinado para o Storage | ✅ Funcional |
| `criar-pagamento` | Cria pagamento no AppyPay (ou mock) | 🔄 Mock funcional |
| `webhook-pagamento` | Recebe webhook do AppyPay e atualiza o estado | 🔄 Mock funcional |
| `verificar-pagamento` | Consulta o estado do pagamento | 🔄 Mock funcional |

---

## 6. Proteções Implementadas (v3)

### 6.1. Funções de Apagar

| Função | Proteção |
|---|---|
| `apagar_classe` | Bloqueia se houver matrículas ou grelha associada |
| `apagar_curso` | Bloqueia se houver matrículas ou grelha associada |
| `apagar_disciplina` | Bloqueia se houver notas ou grelha associada |
| `apagar_grelha` | Bloqueia se houver notas para essa disciplina naquela classe/curso |
| `apagar_sala` | Bloqueia se houver matrículas na sala ou alocação associada |
| `apagar_regra_aura` | (Sem proteção específica, mas o JUIZ bloqueia se faltar regra) |
| `apagar_alocacao` | (Sem proteção específica, mas o DISTRIBUIDOR bloqueia se faltar alocação) |

### 6.2. AURA

Todas as 3 funções (JUIZ, TRANSIÇÃO, DISTRIBUIDOR) têm:
- Verificação de `inscricoes_abertas`.
- Verificações de dados (grelha, regras, alocações, capacidade).
- `EXCEPTION` para rollback em caso de erro SQL.
- `LOCK TABLE` no Distribuidor para evitar concorrência.

---

## 7. Correções e notas

### 7.1. Tabela `regras_aura` (atemporal)
A coluna `ano_lectivo` foi removida. As regras são atemporais (valem para todos os anos). A constraint `UNIQUE(classe, curso)` garante que não há duplicados.

### 7.2. Tabela `alocacao_salas` (atemporal)
A coluna `ano_lectivo` existe apenas como registo histórico (data de criação). O DISTRIBUIDOR ignora-a (lê todas as alocações).

### 7.3. Grelha Curricular
A Grelha é a fonte de verdade das disciplinas por classe/curso. O JUIZ cruza as notas com a Grelha para decidir se é negativa crítica ou secundária.

### 7.4. Documentos do Candidato
A `cesc_obter_perfil_aluno_completo` devolve todos os documentos (`doc_bi_frente_url`, `doc_bi_verso_url`, `doc_certificado_url`, `doc_foto_url`), que são usados na página de perfil.

---

## 8. Riscos conhecidos e aceites

1. Sem rate limiting nas RPCs. Mitigação futura: Cloudflare ou Edge Function com limite por IP.
2. Código 2FA de 6 dígitos é curto. Em produção, considerar 8 dígitos ou bloqueio após 3 tentativas.
3. `cesc.historico_candidato` cresce indefinidamente. Considerar particionamento por ano.
4. O lock de análise não é distribuído. Para o CESC (1 secretária) não é problema.
5. A senha do Render está hardcoded na Edge Function. Baixa prioridade.

---

## 9. Verificações SQL úteis

### 9.1. Ver RLS e políticas
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname IN ('public', 'cesc')
ORDER BY schemaname, tablename;
```

9.2. Ver funções existentes

```sql
SELECT proname, pronamespace::regnamespace AS schema, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname LIKE 'cesc_%' OR proname LIKE 'get_%'
ORDER BY schema, proname;
```

9.3. Testar acesso direto (deve estar bloqueado)

```bash
curl -X GET 'https://kmdixtzvnhvtwkpsicoq.supabase.co/rest/v1/alunos?select=*' \
  -H 'apikey: sb_publishable_...' \
  -H 'Accept-Profile: cesc'
# Esperado: []
```

---

10. Migrações (histórico de SQL)

Todos os SQLs devem ser guardados em docs/migrations/ com data e descrição:

```
docs/migrations/
├── 2026-10-19_initial_schema.sql
├── 2026-10-20_rls_and_rpcs.sql
├── 2026-10-22_fix_marcar_falta.sql
├── 2026-10-23_inscricoes_v2.sql
├── 2026-10-24_codigos_candidato.sql
├── 2026-10-25_pagamentos_mock.sql
├── 2026-10-26_configuracoes_cron.sql
├── 2026-11-08_aura_v2.sql
├── 2026-11-09_grelha_curricular.sql
└── 2026-11-10_protecoes_aura.sql
```

---

11. Contacto

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com

---

Última atualização: 10/11/2026