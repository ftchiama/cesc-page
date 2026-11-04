Excelente ideia. Antes de implementar o pagamento, vamos consolidar tudo o que foi feito. Se algo der errado, tens um ponto de partida claro. Vou criar 3 documentos:

1. README.md — visão geral do projeto, estado atual, como começar.
2. BACKEND.md (v2) — modelo de dados, RLS, todas as RPCs, Edge Functions, Render, segurança.
3. FRONTEND.md — páginas, scripts, CSS, fluxo de cada área.

Vou dividir em 3 mensagens para não colar tudo de uma vez (é muita informação). Começamos pelo README.md.

---

README.md

```markdown
# CESC — Complexo Escolar Santa Catarina

**Autor:** Francisco Tchiama  
**Companhia:** TCLabs  
**Localização:** Cabinda, Angola  
**Versão:** 2.0  
**Data:** 26/10/2026

---

## 1. O que é o CESC

Sistema de gestão escolar para o **Complexo Escolar Santa Catarina**, composto por:

- **Frontend Web** (HTML/CSS/JS) — site institucional, área do aluno, do professor, do candidato e da secretaria.
- **Supabase** — base de dados (schema `cesc`), autenticação, RPCs, Storage, Edge Functions.
- **Render** — serviço de envio de e-mails (`tclabs-email-api`), integrado com o Brevo.
- **Brevo** — entrega real dos e-mails.

O CESC **partilha o mesmo projeto Supabase** do **Kandamy** (`kmdixtzvnhvtwkpsicoq`), mas está isolado num **schema separado** (`cesc`). O Kandamy usa o schema `public` sem alterações.

---

## 2. Estado atual do projeto

| Módulo | Estado | Documentação |
|---|---|---|
| **Autenticação (2FA por e-mail)** | ✅ Funcional | `BACKEND.md` §5 |
| **Área do Aluno** (`paginas/dashboard.html`) | ✅ Funcional | `FRONTEND.md` §3 |
| **Área do Professor** (`admin/professor.html`) | ✅ Funcional | `FRONTEND.md` §4 |
| **Área da Secretaria** (`secretaria/secretaria.html`) | ✅ Funcional | `FRONTEND.md` §5 |
| **Inscrição pública** (`paginas/inscricao.html`) | ⚠️ Sem pagamento | `FRONTEND.md` §6 |
| **Painel do Candidato** (`paginas/candidato-painel.html`) | ✅ Funcional | `FRONTEND.md` §7 |
| **Pagamento (AppyPay)** | 🔄 Em desenvolvimento (mock) | `PAGAMENTOS.md` |
| **Área do Diretor** | ❌ Não existe | — |
| **Área do Encarregado** | ❌ Não existe | — |
| **Algoritmo de distribuição de turmas** | ❌ Não existe | — |

---

## 3. Estrutura de pastas

```

C_E_S_C/
├── index.html
├── sobre.html
├── contacto.html
├── avisos.html
├── css/
│   ├── base.css
│   ├── style.css
│   ├── layout.css
│   ├── home.css
│   ├── paginas.css
│   ├── auth.css
│   ├── dashboard.css
│   ├── inscricao.css
│   └── candidato-painel.css
├── scripts/
│   ├── api.js                ← módulo central (obrigatório em todas as páginas)
│   ├── main.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── inscricao.js
│   ├── candidato-login.js
│   ├── candidato-painel.js
│   └── consultar-inscricao.js
├── paginas/
│   ├── login.html
│   ├── criar-conta.html
│   ├── dashboard.html
│   ├── inscricao.html
│   ├── consultar-inscricao.html
│   ├── candidato-login.html
│   ├── candidato-painel.html
│   ├── biblioteca.html
│   ├── sobre.html
│   └── contacto.html
├── admin/
│   ├── professor.html
│   ├── css/
│   │   └── professor.css
│   └── scripts/
│       └── professor.js
├── secretaria/
│   ├── secretaria.html
│   ├── css/
│   │   └── secretaria.css
│   └── scripts/
│       ├── secretaria-core.js
│       ├── secretaria-modais.js
│       ├── secretaria-alunos.js
│       ├── secretaria-inscricoes.js
│       ├── secretaria-matriculas.js
│       └── secretaria-documentos.js
├── docs/
│   ├── README.md           ← este ficheiro
│   ├── BACKEND.md
│   ├── FRONTEND.md
│   ├── PAGAMENTOS.md
│   └── EDGE_FUNCTIONS.md

```

**Regras de ouro:**

- **Nunca** colar `api.js` em páginas. Carregar sempre via `<script src="../scripts/api.js"></script>` **antes** de qualquer outro script.
- **Nunca** usar a `service_role` no browser. Só no Render e nas Edge Functions.
- **Nunca** chamar tabelas diretamente. Sempre via RPCs `security definer`.
- **Nunca** guardar senhas ou chaves no código do frontend.

---

## 4. Como arrancar o projeto localmente

### 4.1. Requisitos

- Browser (Chrome, Chromium, Firefox) — **não usar WebViews de IDE** para testar uploads.
- Python 3 (para o servidor HTTP local) ou Node.js.

### 4.2. Servidor HTTP local

```bash
cd /storage/emulated/0/ProjectosCodestudio/C_E_S_C
python3 -m http.server 8080
```

Abrir no browser: http://localhost:8080/

4.3. Contas de teste

Role Email Password
Aluno aluno.teste@cesc.ao 123456
Aluno (dados fictícios) franciscotchiama9@gmail.com (login por código)
Professor tclabs.suporte@gmail.com prof123
Secretária tclabs.suporte+sec@gmail.com sec123
Candidato tclabs.suporte+fred@gmail.com (BI 123456789CA001) (login por código)

Nota: o login é sempre por e-mail + password → código de 6 dígitos por e-mail. As passwords acima são o 1º passo.

4.4. Recuperar código de verificação no sandbox

Se o e-mail não chegar (ex: e-mail fictício), o código fica gravado na tabela cesc.utilizadores:

```sql
SELECT email, verification_code, code_expires_at
FROM cesc.utilizadores
WHERE email = 'antonio.silva@cesc.ao';
```

Para o candidato:

```sql
SELECT email, codigo, expira_em FROM cesc.codigos_inscricao;
SELECT bi_numero, codigo, expira_em FROM cesc.codigos_candidato;
```

---

5. Fluxos principais

5.1. Login (aluno, professor, secretária)

```
login.html → auth.js → Edge Function "enviar-codigo" (password) 
          → utilizador recebe código por e-mail
          → auth.js → RPC cesc_validar_codigo → token
          → redireciona por role (cesc_perfil_role)
```

5.2. Inscrição (candidato novo)

```
inscricao.html → inscricao.js (5 passos)
    ├── Passo 1: BI + e-mail (verificação de BI + código por e-mail)
    ├── Passo 2: Encarregado
    ├── Passo 3: Documentos (4 uploads)
    ├── Passo 4: Classe, curso, média
    └── Passo 5: Revisão + submeter
        → RPC cesc_submeter_inscricao (estado: 'a_pagar')
        → [PAGAMENTO — a implementar]
        → RPC confirma pagamento (estado: 'pendente')
```

5.3. Análise (secretária)

```
secretaria-inscricoes.js → lista (só 'pendente' e seguintes)
    → abrirDetalheInscricao (inicia análise — bloqueia o candidato)
    → aprovar / rejeitar (com código 0 ou 1) / cancelar
    → histórico de alterações do candidato
```

5.4. Candidato (painel)

```
candidato-login.html → candidato-login.js (BI + e-mail → código)
    → candidato-painel.js
        ├── Visão geral (4 cards)
        ├── Histórico de candidaturas (recandidatar se código 1)
        ├── Perfil (dados editáveis exceto e-mail)
        ├── Documentos (ver / substituir)
        └── Histórico de alterações
```

---

6. O que falta (roadmap)

Curto prazo (agora)

· Pagamento (AppyPay / mock):
  · SQL: tabela pagamentos, RPCs de pagamento.
  · Edge Functions: criar-pagamento, webhook-pagamento, verificar-pagamento.
  · Frontend: inscricao.js com polling, inscricao-retomar.html, botão "Marcar Matrícula" no painel.
  · Secretária: botão "Atribuir turma".
  · Cron: limpar a_pagar com +30 min.
  · Ver PAGAMENTOS.md.

Médio prazo

· Área do Diretor:
  · Visão global (alunos, professores, turmas).
  · Aprovar/gerir documentos.
  · Configurar ano letivo (cesc.configuracoes).
· Área do Encarregado:
  · Acompanhar notas e faltas do educando.

Longo prazo

· Algoritmo de distribuição de turmas (após pagamento da matrícula).
· Gestão de horários e salas.
· Relatórios e estatísticas.

---

7. Documentação detalhada

· BACKEND.md — modelo de dados, RLS, todas as RPCs, Edge Functions, Render, segurança.
· FRONTEND.md — páginas, scripts, CSS, fluxo de cada área.
· PAGAMENTOS.md — integração AppyPay (mock e real), fluxo completo, cron, webhook.
· EDGE_FUNCTIONS.md — documentação interna de cada Edge Function.

---

8. Autor

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com

---

Última atualização: 26/10/2026

``'