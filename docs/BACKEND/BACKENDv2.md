BACKEND.md v2

```markdown
# CESC — Backend e Segurança (v2)

**Autor:** Francisco Tchiama  
**Companhia:** TCLabs  
**Data:** 26/10/2026  
**Versão:** 2.0

Este documento descreve a arquitetura, o modelo de dados, as RPCs e as políticas de segurança do CESC. Substitui a v1.0 (que fica arquivada em `docs/archive/BACKEND-v1.md`).

---

## 1. Contexto

O CESC vive no **mesmo projeto Supabase** do Kandamy (`kmdixtzvnhvtwkpsicoq`), mas está isolado num **schema separado** (`cesc`). O Kandamy usa o schema `public` sem alterações.

**Serviços externos:**
- **Supabase:** base de dados, autenticação caseira (tokens em `public.sessoes`), Storage, Edge Functions.
- **Render (`tclabs-email-api`):** envia e-mails via Brevo. Adaptado para verificar `cesc.utilizadores` além de `public.users`.
- **Brevo:** entrega real dos e-mails.

**Princípios aplicados:**

1. **Isolamento por schema.** Tudo do CESC em `cesc`. O Kandamy em `public`.
2. **Nenhuma operação sensível usa `anon` diretamente.** Tudo passa por RPCs `security definer`.
3. **Chaves sensíveis nunca saem do servidor.** A `service_role` só é usada no Render e nas Edge Functions.
4. **O código de verificação nunca chega ao browser.** Edge Function gera e envia.
5. **Autenticação em dois fatores obrigatória.** Login = password + código de 6 dígitos por e-mail.
6. **O BI é a chave de registo.** Só alunos com BI em `cesc.alunos` podem criar conta.
7. **Estados do ciclo de vida da inscrição** são explícitos e auditáveis (ver §4).

---

## 2. Modelo de dados (schema `cesc`)

### 2.1. Tabelas principais

| Tabela | Descrição |
|---|---|
| `cesc.utilizadores` | Contas de acesso (aluno, professor, secretária, diretor, coordenador, encarregado) |
| `cesc.alunos` | Ficha do aluno (BI, dados pessoais, encarregado, turma, estado) |
| `cesc.matriculas` | Histórico académico por ano letivo (classe, turma, curso, nº aluno) |
| `cesc.avaliacoes_continuas` | Notas individuais lançadas pelo professor |
| `cesc.notas_trimestrais` | MAC, NPT, MT, MFD por disciplina/trimestre |
| `cesc.faltas` | Faltas por disciplina/mês |
| `cesc.trabalhos` | Biblioteca digital (trabalhos dos alunos) |
| `cesc.passes` | Pedidos de documentos (certificado, declaração) |
| `cesc.professores` | Ficha do professor (ligada a `utilizadores`) |
| `cesc.professores_disciplinas` | Que disciplinas cada professor lecciona, em que turma |
| `cesc.candidatos` | Ficha persistente do candidato (BI único, dados mais recentes) |
| `cesc.inscricoes` | Candidatura anual (histórico, estado, documentos, médias) |
| `cesc.configuracoes` | Configurações globais (chave/valor) — `ano_lectivo_actual`, `inscricoes_abertas` |
| `cesc.codigos_inscricao` | Códigos 2FA para verificação de e-mail na inscrição |
| `cesc.codigos_candidato` | Códigos 2FA para o painel do candidato |
| `cesc.sessoes_candidatos` | Tokens de sessão do candidato (2 horas) |
| `cesc.historico_candidato` | Auditoria de alterações do candidato |
| `cesc.analises_em_curso` | Lock de análise (bloqueia o candidato enquanto a secretária lê) |
| `cesc.inscricoes_codigo_rejeicao` | **NOVO** — Código de rejeição 0 ou 1 |

### 2.2. Tabela `public.sessoes` (ponte)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `user_email` | varchar | E-mail do utilizador |
| `app_name` | varchar | `CESC` ou `Kandamy` |
| `token` | varchar | Token único (UUID) |
| `expira_em` | timestamp | Expiração (7 dias) |
| `criado_em` | timestamp | |

**Esta tabela é a ponte entre o login e as RPCs.** O frontend recebe um token no login, envia-o em cada pedido.

### 2.3. Estados da inscrição

```

a_pagar        → aguardando pagamento da inscrição (não aparece na secretária)
pendente       → pagamento confirmado, aguardando análise
aprovada       → aprovada, aguardando pagamento da matrícula
rejeitada      → rejeitada (código 0 ou 1)
matricula_paga → pagamento da matrícula confirmado, aguardando atribuição de turma
matriculado    → turma atribuída, aluno oficial

```

### 2.4. Estados da conta de utilizador

```

activo       → conta ativa
formado      → aluno já concluiu
desistente   → abandonou a escola
transferido  → mudou para outra escola

```

### 2.5. Roles

| Role | Acesso |
|---|---|
| `aluno` | Dashboard do aluno |
| `professor` | Lançar notas, faltas |
| `secretaria` | Gerir alunos, matrículas, documentos, inscrições |
| `diretor`, `sub_diretor` | Visão global, aprovar documentos (a criar) |
| `coordenador` | Ver notas dos seus professores (a criar) |
| `encarregado` | Acompanhar notas/faltas do educando (a criar) |

---

## 3. Segurança (RLS)

### 3.1. Estado do RLS

| Schema | Tabela | RLS | Política |
|---|---|---|---|
| `cesc` | todas as tabelas | ✅ | `USING (false)` — bloqueio total |
| `public` | `sessoes` | ✅ | `USING (false)` — bloqueio total |

**O que isto significa:** o `anon` e o `authenticated` não conseguem fazer SELECT/INSERT/UPDATE/DELETE directamente em nenhuma tabela do CESC. Todo o acesso passa pelas RPCs `security definer`.

**O Kandamy não é afectado** porque as suas tabelas (`public.users`, `public.musicas`, etc.) mantêm as próprias políticas.

### 3.2. Política exemplo

```sql
ALTER TABLE cesc.alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bloquear acesso directo" ON cesc.alunos
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
```

3.3. Como o acesso é feito

O acesso legítimo é feito exclusivamente através de RPCs security definer. Estas funções correm com privilégios elevados e ignoram o RLS, mas validam a identidade do utilizador através do token em public.sessoes.

3.4. Storage (bucket cesc-inscricoes)

· Privado. Só a Edge Function gerar-url-assinada (com service_role) gera URLs temporários.
· Política: upload permitido a anon/authenticated (candidatos e secretária), leitura só a authenticated.
· Estrutura: inscricoes/<uuid>.<ext>.

---

4. Helper cesc.validar_sessao_role

Usado em todas as RPCs protegidas.

```sql
CREATE OR REPLACE FUNCTION cesc.validar_sessao_role(
    p_token varchar,
    p_roles text[]
) RETURNS cesc.utilizadores AS $$
DECLARE
    v_sessao record;
    v_user cesc.utilizadores;
BEGIN
    SELECT * INTO v_sessao FROM public.sessoes
    WHERE token = p_token AND app_name = 'CESC' AND expira_em > now();

    IF v_sessao IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_user FROM cesc.utilizadores WHERE email = v_sessao.user_email;

    IF v_user IS NULL OR NOT (v_user.role = ANY(p_roles)) OR v_user.ativo = false THEN
        RETURN NULL;
    END IF;

    RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

5. RPCs (por área)

Todas as RPCs abaixo são security definer. Vivem no schema indicado.

5.1. Autenticação

RPC Schema Descrição
cesc_criar_conta public Cria conta de aluno (BI tem de existir em cesc.alunos)
verificar_password_cesc public e cesc Valida password (Edge Function usa cesc)
cesc_login public Gera código 2FA para utilizador
cesc_validar_codigo public Valida código 2FA e cria sessão
cesc_perfil_role public Devolve role do utilizador (para redirect pós-login)

5.2. Aluno

RPC Descrição
get_perfil_completo Perfil do aluno (usado no dashboard.js)
get_perfil_aluno Variante simplificada
get_minhas_notas Notas do aluno
cesc_pedir_documento Pedido de certificado/declaração

5.3. Professor

RPC Descrição
cesc_professor_dashboard Perfil + turmas do professor
cesc_professor_alunos Alunos de uma turma/disciplina
cesc_professor_adicionar_avaliacao Adiciona nota individual, recalcula MAC
cesc_professor_remover_avaliacao Remove nota individual, recalcula MAC
cesc_professor_listar_avaliacoes Lista notas individuais de um aluno/trimestre
cesc_professor_lancar_npt Lança NPT, fecha trimestre, calcula MT e MFD
cesc_professor_marcar_falta Regista falta (corrigida em §7)
cesc_professor_listar_faltas Lista faltas de um aluno

5.4. Secretaria

RPC Descrição
cesc_secretaria_dashboard Stats + últimos alunos
cesc_secretaria_listar_alunos Lista de alunos
cesc_secretaria_criar_aluno Cria ficha (BI obrigatório)
cesc_secretaria_editar_aluno Edita ficha
cesc_secretaria_listar_matriculas Lista matrículas
cesc_secretaria_criar_matricula Cria matrícula
cesc_secretaria_listar_documentos Lista pedidos de documentos
cesc_secretaria_marcar_documento Marca pago/emitido
cesc_secretaria_listar_inscricoes Lista inscrições (exclui a_pagar)
cesc_secretaria_aprovar_inscricao Aprova (cria aluno, estado aprovada)
cesc_secretaria_rejeitar_inscricao Rejeita (com código 0/1)
cesc_secretaria_contar_inscricoes_pendentes Total de pendentes
cesc_secretaria_iniciar_analise Bloqueia inscrição durante análise
cesc_secretaria_terminar_analise Liberta inscrição
cesc_secretaria_historico_candidato Histórico de alterações do candidato
cesc_secretaria_atribuir_turma NOVO — atribui turma ao aluno (matrícula)
cesc_secretaria_confirmar_pagamento_inscricao NOVO — usado só se necessário manualmente

5.5. Candidato

RPC Descrição
cesc_verificar_bi_inscricao Verifica se BI já está registado/em uso (com mensagens por estado)
cesc_submeter_inscricao Submete inscrição (estado a_pagar)
cesc_login_candidato Gera código 2FA para o painel
cesc_validar_codigo_candidato Valida código, cria sessão de 2h
cesc_encontrar_candidato Verifica par BI + e-mail
cesc_candidato_painel Devolve dados do painel (perfil + histórico + a_pagar)
cesc_candidato_atualizar_perfil Atualiza dados pessoais (excepto e-mail)
cesc_candidato_atualizar_documento NOVO — substitui um documento sem mudar estado
cesc_candidato_recandidatar NOVO — só se rejeitada + código 1
cesc_candidato_listar_historico Histórico de alterações
cesc_candidato_iniciar_pagamento NOVO — inicia pagamento (inscrição ou matrícula)
cesc_candidato_confirmar_pagamento NOVO — confirma pagamento (chamado pelo webhook)

5.6. Consulta pública

RPC Descrição
cesc_consultar_inscricao Consulta estado por referência + BI
cesc_submeter_inscricao (já coberta em §5.5)

---

6. Edge Functions

Função Descrição Modo
enviar-codigo Único ponto de envio de códigos 2FA (login, inscrição, candidato). Detecta o fluxo pelas flags is_inscricao, is_candidato. Funcional
gerar-url-assinada Gera URL assinado para um ficheiro do Storage (bucket cesc-inscricoes). Funcional
criar-pagamento NOVO — cria pagamento no AppyPay (ou mock). Em desenvolvimento
webhook-pagamento NOVO — recebe o webhook do AppyPay e actualiza o estado. Em desenvolvimento
verificar-pagamento NOVO — consulta o estado do pagamento para o frontend. Em desenvolvimento

Ver docs/EDGE_FUNCTIONS.md para detalhes de payload, resposta e configuração.

---

7. Correções e notas

7.1. cesc_professor_marcar_falta (bug corrigido)

A RPC v1.0 tinha um bug: usava o alias a que não existia no SELECT. A v1.1 (actual) valida a matrícula directamente em cesc.matriculas. Ver docs/CORRECOES.md para o diff.

7.2. cesc_submeter_inscricao (v2)

· Cria a inscrição com estado a_pagar.
· Bloqueia nova submissão se já houver pendente, aprovada, matriculado ou rejeitada no mesmo ano.
· Se já houver a_pagar, devolve erro claro a indicar para retomar no painel.
· Rate limits mantidos: 3 por BI/2h, 5 por IP/24h.
· Atualiza a ficha do candidato em cesc.candidatos.

7.3. cesc_secretaria_listar_inscricoes (v2)

· Exclui estado = 'a_pagar' (a secretária só vê o que já foi pago).
· Inclui campos novos: inscricao_paga, matriculado, data_matricula.

7.4. cesc_verificar_bi_inscricao (v2)

· Devolve mensagens específicas por estado:
  · aluno → "Este BI já está registado como aluno."
  · pendente → "A inscrição está a ser analisada."
  · rejeitada + código 1 → "Pode recandidatar-se."
  · rejeitada + código 0 → "Não pode recandidatar-se neste ano."
  · aprovada → "Aprovado, falta pagar a matrícula."
  · a_pagar → "Aguarda pagamento. Retoma no painel."

7.5. Auditoria (tabela cesc.historico_candidato)

Todas as alterações de perfil e documentos do candidato são registadas com:

· candidato_id
· inscricao_id (opcional)
· campo
· valor_anterior
· valor_novo
· alterado_em

O painel da secretária mostra este histórico no detalhe da inscrição.

7.6. Bloqueio durante análise (cesc.analises_em_curso)

· A secretária, ao abrir uma inscrição, chama cesc_secretaria_iniciar_analise.
· O candidato fica bloqueado (não pode editar perfil nem substituir documentos).
· Quando a secretária aprova/rejeita/cancela (ou muda de secção), chama cesc_secretaria_terminar_analise.
· Um cron job em cesc.limpar_analises_expiradas() apaga análises com mais de 30 minutos (para não ficar preso se a secretária fechar o browser).

7.7. Isolamento do Kandamy

O Kandamy continua a funcionar exactamente como antes porque:

1. Usa o schema public (o CESC usa cesc).
2. As tabelas do Kandamy mantêm as próprias políticas RLS.
3. As RPCs do Kandamy (get_user_by_email, upsert_user, etc.) não foram alteradas.
4. O Render verifica cesc.utilizadores além de public.users.

---

8. Riscos conhecidos e aceites

1. Sem rate limiting nas RPCs. Um atacante pode fazer brute force ao código 2FA (6 dígitos). Mitigação futura: Cloudflare ou Edge Function com limite por IP.
2. Código 2FA de 6 dígitos é curto. Em produção, considerar 8 dígitos ou bloqueio após 3 tentativas.
3. cesc.historico_candidato cresce indefinidamente. Considerar particionamento por ano ou limpeza periódica.
4. O lock de análise não é distribuído. Se duas secretárias abrirem a mesma inscrição, ambas iniciam análise. O último DELETE liberta. Para o CESC (1 secretária) não é problema.

---

9. Verificações SQL úteis

9.1. Ver RLS e políticas

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname IN ('public', 'cesc')
ORDER BY schemaname, tablename;

SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname IN ('public', 'cesc')
ORDER BY schemaname, tablename, policyname;
```

9.2. Ver funções existentes

```sql
SELECT proname, pronamespace::regnamespace AS schema, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname LIKE 'cesc_%' OR proname LIKE 'get_%'
ORDER BY schema, proname;
```

9.3. Testar acesso directo (deve estar bloqueado)

```bash
curl -X GET 'https://kmdixtzvnhvtwkpsicoq.supabase.co/rest/v1/alunos?select=*' \
  -H 'apikey: sb_publishable_NtqePgTlOPZsx3DuC40bfg_lu6CKrs9' \
  -H 'Accept-Profile: cesc'
# Esperado: []
```

9.4. Testar RPC (deve funcionar)

```bash
curl -X POST 'https://kmdixtzvnhvtwkpsicoq.supabase.co/rest/v1/rpc/verificar_password_cesc' \
  -H 'apikey: sb_publishable_NtqePgTlOPZsx3DuC40bfg_lu6CKrs9' \
  -H 'Authorization: Bearer sb_publishable_NtqePgTlOPZsx3DuC40bfg_lu6CKrs9' \
  -H 'Content-Type: application/json' \
  --data '{"p_email":"franciscotchiama9@gmail.com","p_password":"minha_password_123"}'
# Esperado: {"ok": true}
```

9.5. Ver últimos códigos 2FA

```sql
SELECT email, verification_code, code_expires_at
FROM cesc.utilizadores
ORDER BY code_expires_at DESC NULLS LAST
LIMIT 10;
```

9.6. Ver sessões activas

```sql
SELECT user_email, token, expira_em
FROM public.sessoes
WHERE app_name = 'CESC' AND expira_em > now()
ORDER BY criado_em DESC;
```

---

10. Migrações (histórico de SQL)

Todos os SQLs devem ser guardados em docs/migrations/ com data e descrição. Exemplo:

```
docs/migrations/
├── 2026-10-19_initial_schema.sql
├── 2026-10-20_rls_and_rpcs.sql
├── 2026-10-22_fix_marcar_falta.sql
├── 2026-10-23_inscricoes_v2.sql
├── 2026-10-24_codigos_candidato.sql
├── 2026-10-25_pagamentos_mock.sql
└── 2026-10-26_configuracoes_cron.sql
```

Nunca correr SQL directamente sem guardar o ficheiro. O próximo chat deve conseguir reconstruir o backend a partir das migrações.

---

11. Contacto

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com

---

Última actualização: 26/10/2026

```

---