Aqui está o README do CESC, seguindo a estrutura do Kandamy mas adaptado para a escola.

```markdown
# Complexo Escolar Santa Catarina (CESC) — Backend e Segurança

**Autor:** Francisco Tchiama
**Companhia:** TCLabs
**Data:** 19/10/2026
**Versão:** 1.0

Este documento descreve a arquitetura, o modelo de dados, as funções RPC e as políticas de segurança do sistema de gestão escolar do Complexo Escolar Santa Catarina (CESC).

O CESC vive no **mesmo projeto Supabase** do Kandamy (`kmdixtzvnhvtwkpsicoq`), mas está isolado num **schema separado** (`cesc`). O Kandamy continua a usar o schema `public` sem qualquer alteração.

---

## 1. Contexto

O sistema é composto por:

- **Frontend Web** (futuro) — HTML/CSS/JS, usa a chave `anon`
- **Supabase** — base de dados, autenticação e funções RPC
- **Edge Function `enviar-codigo`** — faz a ponte entre o frontend e o Render
- **Render (`tclabs-email-api`)** — envia os e-mails via Brevo (chave do Brevo fica no Render)
- **Brevo** — serviço de envio de e-mails

O Kandamy usa o mesmo Supabase e o mesmo Render, mas em tabelas e fluxos diferentes. A separação é feita pelo schema (`public` vs `cesc`) e pelo `app_name`.

### Princípios aplicados

1. **Isolamento por schema.** O CESC vive em `cesc`. O Kandamy vive em `public`. Não se misturam.
2. **Nenhuma operação sensível usa a chave `anon` diretamente.** Tudo passa por RPCs `security definer`.
3. **Chaves sensíveis nunca saem do servidor.** A chave do Brevo está no Render. A `service_role` do Supabase só é usada no Render e na Edge Function.
4. **O código de verificação nunca chega ao browser.** A Edge Function gera-o, guarda-o e envia-o por e-mail. O frontend recebe apenas `{"ok": true}`.
5. **Autenticação em dois fatores obrigatória.** Login = password + código de 6 dígitos enviado por e-mail.
6. **O BI é a chave de registo.** Só alunos matriculados (com BI registado pela secretaria) podem criar conta.

---

## 2. Modelo de dados

### 2.1. Schema `cesc`

#### `cesc.utilizadores` — Contas de acesso
Guarda as contas de login (alunos, professores, coordenação, direção, secretaria, encarregados).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `email` | varchar | Único. Usado no login |
| `nome_completo` | varchar | Nome do utilizador |
| `role` | varchar | `diretor`, `sub_diretor`, `secretaria`, `coordenador`, `professor`, `encarregado`, `aluno` |
| `password_hash` | varchar | Hash bcrypt (`crypt` com `gen_salt('bf')`) |
| `verification_code` | varchar | Código de 6 dígitos para 2FA |
| `code_expires_at` | timestamp | Expiração do código (10 min) |
| `ativo` | boolean | Estado da conta |
| `criado_em` | timestamp | Data de criação |

#### `cesc.alunos` — Dados pessoais e académicos
Guarda a informação do aluno (BI, data de nascimento, turma, encarregado, etc.).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `bi_numero` | varchar | Único. Chave de registo |
| `numero_matricula` | varchar | Campo interno da escola |
| `nome_completo` | varchar | Nome do aluno |
| `data_nascimento` | date | Data de nascimento |
| `genero` | varchar | M/F |
| `telefone` | varchar | Contacto |
| `email_contacto` | varchar | Ponte com `cesc.utilizadores` |
| `nome_encarregado` | varchar | Nome do encarregado |
| `telefone_encarregado` | varchar | Contacto do encarregado |
| `ano_entrada` | integer | Ano de entrada |
| `ano_conclusao` | integer | Ano de conclusão (nulo se ainda estuda) |
| `turma_actual` | varchar | Turma atual |
| `estado` | varchar | `activo`, `formado`, `desistente`, `transferido` |
| `criado_em` | timestamp | Data de criação |

#### `cesc.matriculas` — Histórico académico por ano
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `aluno_id` | uuid | FK → `cesc.alunos` |
| `ano_lectivo` | varchar | Ex: `2025/2026` |
| `classe` | varchar | Ex: `10ª Classe` |
| `turma` | varchar | Ex: `A` |
| `estado` | varchar | `activo`, `concluido` |
| `criado_em` | timestamp | |

#### `cesc.avaliacoes_continuas` — Notas individuais lançadas pelo professor
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `matricula_id` | uuid | FK → `cesc.matriculas` |
| `disciplina` | varchar | Ex: `Matemática` |
| `trimestre` | integer | 1, 2 ou 3 |
| `nota` | numeric(4,2) | Nota individual (0–20) |
| `descricao` | varchar | Ex: `Teste 1` |
| `criado_em` | timestamp | |

#### `cesc.notas_trimestrais` — Médias calculadas (MAC, NPT, MT, MFD)
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `matricula_id` | uuid | FK → `cesc.matriculas` |
| `disciplina` | varchar | |
| `trimestre` | integer | 1, 2 ou 3 |
| `npt` | numeric(4,2) | Nota da Prova Trimestral |
| `mac` | numeric(4,2) | Média das Avaliações Contínuas (calculada) |
| `mt` | numeric(4,2) | Média do Trimestre (calculada) |
| `mfd` | numeric(4,2) | Média Final da Disciplina (calculada) |
| `criado_em` | timestamp | |

**Fórmulas (sistema angolano):**
- `MAC = AVG(avaliacoes_continuas.nota)` para o trimestre
- `MT = (MAC + NPT) / 2`
- `MFD = (MT1 + MT2 + MT3) / 3`

#### `cesc.faltas` — Faltas por disciplina
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `matricula_id` | uuid | FK → `cesc.matriculas` |
| `disciplina` | varchar | |
| `mes` | varchar | Mês da falta |
| `quantidade` | integer | Número de faltas |
| `justificada` | boolean | |
| `criado_em` | timestamp | |

#### `cesc.trabalhos` — Biblioteca digital
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `aluno_id` | uuid | FK → `cesc.alunos` |
| `titulo` | varchar | Título do trabalho |
| `disciplina` | varchar | |
| `ano_lectivo` | varchar | |
| `ficheiro_url` | varchar | URL do PDF no Storage |
| `destaque` | boolean | Se é um dos melhores trabalhos |
| `criado_em` | timestamp | |

#### `cesc.passes` — Pedidos de documentos (certificados, declarações)
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `aluno_id` | uuid | FK → `cesc.alunos` |
| `tipo_documento` | varchar | Ex: `Certificado`, `Declaração de Notas` |
| `estado` | varchar | `pendente`, `pago`, `emitido` |
| `pago` | boolean | |
| `data_pedido` | timestamp | |
| `data_emissao` | timestamp | |

### 2.2. Schema `public`

#### `public.sessoes` — Tokens de sessão ativos
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `user_email` | varchar | E-mail do utilizador |
| `app_name` | varchar | `CESC` ou `Kandamy` |
| `token` | varchar | Token único (UUID) |
| `expira_em` | timestamp | Expiração (7 dias) |
| `criado_em` | timestamp | |

**Esta tabela é a ponte entre o login e as RPCs.** O frontend recebe um token após o login, e envia-o em cada pedido.

---

## 3. Segurança (RLS + Políticas)

### 3.1. Estado do RLS

| Schema | Tabela | RLS |
|---|---|---|
| `cesc` | todas as tabelas | ✅ Ativado + política `false` (bloqueio total) |
| `public` | `sessoes` | ✅ Ativado + política `false` (bloqueio total) |

**O que isto significa:** o `anon` e o `authenticated` **não conseguem** fazer `SELECT`, `INSERT`, `UPDATE` ou `DELETE` diretamente em nenhuma tabela do CESC. Todo o acesso passa pelas RPCs `security definer`.

**O Kandamy não é afetado** porque as suas tabelas (`public.users`, `public.musicas`, etc.) continuam com as suas próprias políticas.

### 3.2. Políticas aplicadas

```sql
-- Exemplo para uma tabela do CESC
ALTER TABLE cesc.alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bloquear acesso directo" ON cesc.alunos
    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
```

A política USING (false) garante que nenhuma linha é visível ao anon/authenticated. A política WITH CHECK (false) garante que nenhuma linha pode ser inserida ou atualizada por eles.

3.3. Como o acesso é feito

O acesso legítimo é feito exclusivamente através de RPCs security definer. Estas funções correm com privilégios elevados e ignoram o RLS, mas validam a identidade do utilizador através do token de sessão (public.sessoes).

---

4. RPCs (Funções do Supabase)

Todas as funções abaixo são security definer (correm com privilégios do dono, não do chamador). Vivem no schema public para que o anon as possa chamar.

4.1. cesc_criar_conta(p_bi_numero, p_email, p_password)

· O que faz: Cria uma conta para um aluno, mas só se o BI existir em cesc.alunos.
· Parâmetros:
  · p_bi_numero — BI do aluno
  · p_email — E-mail da conta
  · p_password — Password em texto (é encriptada com crypt)
· Devolve: {"ok": true, "nome": "..."} ou {"ok": false, "erro": "..."}
· Regras:
  · BI tem de existir em cesc.alunos
  · E-mail não pode estar registado em cesc.utilizadores
  · O aluno não pode já ter conta

4.2. verificar_password_cesc(p_email, p_password)

· O que faz: Valida a password de um utilizador.
· Devolve: {"ok": true} ou {"ok": false}
· Nota: Existe em public e em cesc (a Edge Function usa a do cesc).

4.3. cesc_login(p_email, p_password)

· O que faz: Valida a password e gera um código de 6 dígitos, guardando-o em cesc.utilizadores.verification_code.
· Devolve: {"ok": true, "codigo": "..."} ou {"ok": false, "erro": "..."}
· Nota: O código é devolvido na resposta apenas para testes manuais. Em produção, a Edge Function é usada em vez desta RPC.

4.4. cesc_validar_codigo(p_email, p_codigo)

· O que faz: Valida o código de 6 dígitos e cria uma sessão em public.sessoes.
· Devolve: {"ok": true, "token": "..."} ou {"ok": false, "erro": "..."}
· O token tem validade de 7 dias.

4.5. get_perfil_aluno(p_token)

· O que faz: Valida o token e devolve os dados do aluno.
· Devolve: {"ok": true, "aluno": {...}} ou {"ok": false, "erro": "..."}

4.6. get_minhas_notas(p_token)

· O que faz: Valida o token e devolve as notas do aluno.
· Devolve: {"ok": true, "notas": [...]} ou {"ok": false, "erro": "..."}

---

5. Edge Function enviar-codigo

Endpoint: POST https://[PROJETO].supabase.co/functions/v1/enviar-codigo

O que faz:

1. Recebe {email, password}
2. Valida as credenciais via RPC cesc.verificar_password_cesc
3. Gera um código de 6 dígitos e guarda-o em cesc.utilizadores.verification_code
4. Chama o Render (tclabs-email-api) com o e-mail e o código
5. Devolve {"ok": true} ao frontend (sem o código)

O código nunca chega ao browser. Só é enviado por e-mail.

Configuração:

· Variável de ambiente SUPABASE_SERVICE_ROLE_KEY (injetada automaticamente pelo Supabase)
· O segredo do Render (X-Auth) está hardcoded no código da Edge Function

---

6. Serviços externos

6.1. Render (tclabs-email-api)

· Endpoint: POST /send-email
· Segredo: header X-Auth
· O que faz: Verifica se o destinatário existe em public.users (Kandamy) ou em cesc.utilizadores (CESC). Se sim, chama o Brevo.
· Chave do Brevo: variável de ambiente BREVO_API_KEY
· Nota: o Render foi adaptado para o CESC em 19/10/2026 (versão 1.3). O Kandamy não é afetado.

6.2. Brevo

· Serviço de envio de e-mails
· A chave só existe no Render (nunca chega ao browser nem à Edge Function)

---

7. Isolamento do Kandamy

O Kandamy continua a funcionar exatamente como antes. As alterações no sistema não o afetam porque:

1. O Kandamy usa o schema public. O CESC usa o schema cesc. São mundos separados.
2. As tabelas do Kandamy (users, musicas, etc.) mantêm as suas próprias políticas RLS.
3. As RPCs do Kandamy (get_user_by_email, upsert_user, etc.) não foram alteradas.
4. O Render foi adaptado para verificar em ambos os schemas, mas a lógica do Kandamy continua a funcionar primeiro.

---

8. Riscos conhecidos e aceites

1. A Edge Function tem o segredo do Render hardcoded. Idealmente seria uma variável de ambiente. Baixa prioridade.
2. A tabela cesc.utilizadores tem password_hash em bcrypt, mas o role não é validado em todas as operações. Para o protótipo, é aceitável.
3. Sem rate limiting nas RPCs. Um atacante pode fazer brute force ao código de 6 dígitos. Mitigação futura: Cloudflare ou Edge Function com limite por IP.

---

9. Como verificar o estado atual

9.1. Ver o RLS das tabelas

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname IN ('public', 'cesc')
ORDER BY schemaname, tablename;
```

9.2. Ver as políticas RLS

```sql
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname IN ('public', 'cesc')
ORDER BY schemaname, tablename, policyname;
```

9.3. Testar o acesso directo (deve estar bloqueado)

```bash
curl -L -X GET 'https://kmdixtzvnhvtwkpsicoq.supabase.co/rest/v1/alunos?select=*' \
  -H 'apikey: sb_publishable_...' \
  -H 'Accept-Profile: cesc'
# Esperado: []
```

9.4. Testar as RPCs (devem funcionar)

```bash
# Verificar password
curl -L -X POST 'https://kmdixtzvnhvtwkpsicoq.supabase.co/rest/v1/rpc/verificar_password_cesc' \
  -H 'apikey: sb_publishable_...' \
  -H 'Authorization: Bearer sb_publishable_...' \
  -H 'Content-Type: application/json' \
  --data '{"p_email":"franciscotchiama9@gmail.com","p_password":"minha_password_123"}'
# Esperado: {"ok": true}
```

---

10. Próximos passos (frontend)

O backend está completo e seguro. Falta construir o frontend:

1. login.html — e-mail + password → código de 6 dígitos → dashboard
2. criar-conta.html — BI + e-mail + password → cesc_criar_conta
3. dashboard.html — perfil, notas, biblioteca (aluno)
4. admin.html — lançar notas, gerir alunos (professor/secretaria)

---

11. Contacto

Autor: Francisco Tchiama
Companhia: TCLabs
Email: franciscotchiama9@gmail.com
Localização: Cabinda, Angola

```
