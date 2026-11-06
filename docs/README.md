```markdown
# CESC — Complexo Escolar Santa Catarina

**Autor:** Francisco Tchiama  
**Companhia:** TCLabs  
**Localização:** Cabinda, Angola  
**Versão:** 2.1 (Commit: `1a5661b`)  
**Data:** 06/11/2026

---

## 1. O que é o CESC

Sistema de gestão escolar para o **Complexo Escolar Santa Catarina**, composto por:

- **Frontend Web** (HTML/CSS/JS) — site institucional, área do aluno, do professor, do candidato, da secretaria e da direção.
- **Supabase** — base de dados (schema `cesc`), autenticação, RPCs, Storage, Edge Functions.
- **Render** — serviço de envio de e-mails (`tclabs-email-api`), integrado com o Brevo.
- **Brevo** — entrega real dos e-mails.

O CESC **partilha o mesmo projeto Supabase** do **Kandamy** (`kmdixtzvnhvtwkpsicoq`), mas está isolado num **schema separado** (`cesc`). O Kandamy usa o schema `public` sem alterações.

---

## 2. Estado atual do projeto (Commit `1a5661b`)

| Módulo | Estado | Documentação |
|---|---|---|
| **Autenticação (2FA por e-mail)** | ✅ Funcional | `BACKEND.md` §5 |
| **Área do Aluno** (`paginas/dashboard.html`) | ✅ Funcional | `FRONTEND.md` §3 |
| **Área do Professor** (`admin/professor.html`) | ✅ Funcional | `FRONTEND.md` §4 |
| **Área da Secretaria** (`secretaria/secretaria.html`) | ✅ Funcional | `FRONTEND.md` §5 |
| **Inscrição pública** (`paginas/inscricao.html`) | ✅ Funcional (com convite) | `FRONTEND.md` §6 |
| **Painel do Candidato** (`paginas/candidato-painel.html`) | ✅ Funcional | `FRONTEND.md` §7 |
| **Pagamento (AppyPay)** | 🔄 Mock funcional | `PAGAMENTOS.md` |
| **Área do Diretor** (`direcao/direcao.html`) | ✅ Funcional | `FRONTEND.md` §8 |
| **Área do Encarregado** | ❌ Não existe | — |
| **Algoritmo AURA** | ✅ Backend + Interface (Diretor) | `AURAv1.md` |

---

## 3. A Arquitetura do Painel do Diretor (Novo nesta versão)

O Painel do Diretor foi construído reutilizando a lógica da Secretária para as secções que partilham (Alunos, Inscrições, Matrículas, Documentos), mas **bloqueando as ações de escrita** (o Diretor só lê).

### 3.1. Herança de Código
- O `direcao.html` carrega os ficheiros da Secretária: `secretaria-core.js`, `secretaria-alunos.js`, `secretaria-inscricoes.js`, `secretaria-matriculas.js`, `secretaria-documentos.js`.
- As funções de interface desenham as tabelas e listas, mas os botões de ação (Convidar, Aprovar, Matricular) são escondidos via `window.ROLE_UTILIZADOR` se o utilizador for `diretor` ou `sub_diretor`.
- Para evitar conflitos de navegação, o `direcao-core.js` usa a função `mostrarSeccaoDir()`, enquanto o `secretaria-core.js` só liga a sua navegação se detetar que está na página da Secretária (verifica o `#sec-avatar`).

### 3.2. Secções Exclusivas do Diretor
- **Visão Geral:** Cards de resumo da escola (Receita, Alunos, Professores, Salas).
- **Salas:** Os mesmos cards de resumo da Secretária (Total de Salas, Pavilhões, Turnos), mas sem os botões de criar/apagar.
- **Financeiro:** Resumo de receita por tipo de serviço.
- **Equipa:** Criação de contas para professores e secretárias.
- **Configurações:** Alteração do Ano Letivo e abertura/fecho das inscrições.
- **AURA:** Configuração das regras de aprovação e execução do algoritmo de distribuição.

### 3.3. Variável `inscricaoEmAnalise`
A variável `inscricaoEmAnalise` está declarada no `secretaria-core.js`, que é carregado no Diretor. O arranque do dashboard da Secretária é ignorado no Diretor (via verificação `#sec-avatar`), resolvendo o erro `ReferenceError` no painel do Diretor.

---

## 4. Estrutura de pastas (atualizada)

```

C_E_S_C/
├── index.html
├── sobre.html
├── contacto.html
├── avisos.html
├── css/
├── scripts/
│   ├── api.js                ← módulo central (obrigatório em todas as páginas)
│   ├── auth.js
│   ├── inscricao.js          ← deteta convites e submete
│   └── ...
├── paginas/
├── admin/                    ← Área do Professor
├── secretaria/
│   ├── secretaria.html
│   ├── css/
│   └── scripts/
│       ├── secretaria-core.js
│       ├── secretaria-modais.js
│       ├── secretaria-alunos.js
│       ├── secretaria-inscricoes.js
│       ├── secretaria-matriculas.js
│       ├── secretaria-documentos.js
│       ├── secretaria-infraestrutura.js
│       └── ...
├── direcao/                  ← Área do Diretor (NOVO)
│   ├── direcao.html
│   ├── css/
│   │   └── direcao.css
│   └── scripts/
│       ├── direcao-core.js
│       ├── direcao-salas.js
│       ├── direcao-financeiro.js
│       ├── direcao-equipa.js
│       ├── direcao-configuracoes.js
│       └── direcao-aura.js
├── docs/
│   ├── README.md             ← este ficheiro
│   ├── BACKEND.md
│   ├── FRONTEND.md
│   ├── PAGAMENTOS.md
│   └── AURAv1.md

```

**Regras de ouro:**

- **Nunca** colar `api.js` em páginas. Carregar sempre via `<script src="../scripts/api.js"></script>` **antes** de qualquer outro script.
- **Nunca** usar a `service_role` no browser. Só no Render e nas Edge Functions.
- **Nunca** chamar tabelas diretamente. Sempre via RPCs `security definer`.
- **A Direção não substitui a Secretária.** Ela herda o código para leitura, mas as funções de escrita (`convidar`, `aprovar`, `matricular`) continuam exclusivas da Secretária.

---

## 5. Como arrancar o projeto localmente

### 5.1. Servidor HTTP local

```bash
cd /storage/emulated/0/ProjectosCodestudio/CESC
python3 -m http.server 8080
```

Abrir no browser: http://localhost:8080/

5.2. Contas de teste

Role Email Password
Aluno aluno.teste@cesc.ao 123456
Professor tclabs.suporte@gmail.com prof123
Secretária tclabs.suporte+sec@gmail.com sec123
Candidato tclabs.suporte+fred@gmail.com (BI 123456789CA001) (login por código)
Diretor (obter com o SQL abaixo) (definir)

Para criar/atualizar a conta de Diretor:

```sql
UPDATE cesc.utilizadores
SET password_hash = crypt('nova_password_123', gen_salt('bf'))
WHERE role = 'diretor';
```

---

6. Fluxos principais

6.1. Login (aluno, professor, secretária, diretor)

```
login.html → auth.js → Edge Function "enviar-codigo" (password) 
          → utilizador recebe código por e-mail
          → auth.js → RPC cesc_validar_codigo → token
          → redireciona por role (cesc_perfil_role)
```

6.2. Inscrição com Convite (Candidato)

```
Secretaria gera convite → E-mail enviado com link único
        → Candidato abre o link → preenche BI + Nome (validação exata)
        → Submete inscrição → Estado 'a_pagar'
        → Pagamento mock → Estado 'pendente'
```

6.3. Matrícula Manual (Secretária)

```
Secretária vai a Matrículas → Pesquisa o aluno (já 'matricula_paga')
        → Escolhe a Sala → Sistema atribui Nº de aluno automático
        → Aluno fica 'matriculado'
```

6.4. AURA (Diretor)

```
Diretor configura Regras de Aprovação e Alocação de Salas
        → Clica em "Executar AURA"
        → Sistema corre o JUIZ (lê notas, aprova/reprova)
        → Sistema corre o DISTRIBUIDOR (coloca alunos em salas)
```

---

7. O que falta (roadmap)

Curto prazo

· Área do Encarregado: Acompanhar notas e faltas do educando.
· Ajustes no AURA: Interface visual mais rica para alocação de salas (atualmente é feita por modal).

Médio prazo

· Renovação de Matrícula: Automatizar a transição de ano letivo.
· Exame Nacional: Cálculo do MFD com peso do exame (50/50) para a 12ª classe.

Longo prazo

· Algoritmo de distribuição equilibrada: Evitar polos e equilibrar género/desempenho.
· Gestão de horários e salas: Evitar conflitos de horário.
· Relatórios e estatísticas avançadas: Dashboards para o Diretor.

---

8. Documentação detalhada

· BACKEND.md — modelo de dados, RLS, todas as RPCs, Edge Functions, Render, segurança.
· FRONTEND.md — páginas, scripts, CSS, fluxo de cada área.
· PAGAMENTOS.md — integração AppyPay (mock e real), fluxo completo, cron, webhook.
· AURAv1.md — arquitetura do algoritmo de distribuição.

---

9. Autor

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com

---