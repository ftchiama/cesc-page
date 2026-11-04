FRONTEND.md

```markdown
# CESC — Frontend (v1.0)

**Autor:** Francisco Tchiama  
**Companhia:** TCLabs  
**Data:** 26/10/2026  
**Versão:** 1.0

Este documento descreve a estrutura, os fluxos e os padrões do frontend do CESC.

---

## 1. Contexto

O frontend é **HTML + CSS + JavaScript puro**, sem frameworks (sem React, Vue, etc.). Carrega-se directamente do servidor HTTP local ou de qualquer hosting estático (Cloudflare Pages, Netlify, etc.).

**Regra de ouro:** todas as páginas carregam `scripts/api.js` **antes** de qualquer outro script. Sem isso, nada funciona.

---

## 2. Estrutura de pastas

```

C_E_S_C/
├── index.html                    ← Página pública inicial
├── sobre.html                    ← Sobre a escola
├── contacto.html                 ← Contactos
├── avisos.html                   ← Lista de avisos
│
├── css/                          ← Estilos globais
│   ├── base.css                  ← Variáveis + reset + componentes base
│   ├── style.css                 ← (legado, não usado)
│   ├── layout.css                ← Header fixo + menu mobile + rodapé
│   ├── home.css                  ← Hero, carrossel, calendário
│   ├── paginas.css               ← Sobre, Contacto, Biblioteca
│   ├── auth.css                  ← Login e Criar Conta
│   ├── dashboard.css             ← Área do aluno + sidebar + cards
│   ├── inscricao.css             ← Formulário de inscrição (5 passos)
│   └── candidato-painel.css      ← Painel do candidato
│
├── scripts/                      ← JavaScript global
│   ├── api.js                    ← Módulo central (obrigatório)
│   ├── main.js                   ← Menu mobile do site público
│   ├── auth.js                   ← Login + criar conta
│   ├── dashboard.js              ← Área do aluno
│   ├── inscricao.js              ← Formulário de inscrição
│   ├── candidato-login.js        ← Login do candidato
│   ├── candidato-painel.js       ← Painel do candidato
│   └── consultar-inscricao.js    ← Consulta pública de estado
│
├── paginas/                      ← Páginas internas do site
│   ├── login.html
│   ├── criar-conta.html
│   ├── dashboard.html            ← Área do aluno
│   ├── inscricao.html            ← Inscrição pública
│   ├── consultar-inscricao.html
│   ├── candidato-login.html
│   ├── candidato-painel.html
│   ├── biblioteca.html
│   ├── sobre.html
│   └── contacto.html
│
├── admin/                        ← Área do professor
│   ├── professor.html
│   ├── css/
│   │   └── professor.css
│   └── scripts/
│       └── professor.js
│
└── secretaria/                   ← Área da secretaria
├── secretaria.html
├── css/
│   └── secretaria.css
└── scripts/
├── secretaria-core.js        ← Arranque + navegação + helpers
├── secretaria-modais.js      ← Modal genérico + aprovar/rejeitar
├── secretaria-alunos.js      ← Lista + criar + editar alunos
├── secretaria-inscricoes.js  ← Lista + detalhes + análise
├── secretaria-matriculas.js  ← Lista + criar matrículas
└── secretaria-documentos.js  ← Lista + marcar pago/emitido

```

---

## 3. Área do Aluno

### 3.1. Ficheiros
- `paginas/dashboard.html`
- `css/dashboard.css`
- `scripts/dashboard.js`

### 3.2. Estrutura
- Sidebar com 8 secções: Visão Geral, Notas, Faltas, Desempenho, Histórico, Biblioteca, Documentos, Perfil.
- 5 cards clicáveis na Visão Geral (Disciplinas, Média, Faltas, Trabalhos, Desempenho).
- Filtros por ano letivo e por período (trimestre/mês).
- Tabelas com scroll horizontal em mobile.

### 3.3. Fluxo
1. Login → `cesc_perfil_role` → role `aluno` → `dashboard.html`.
2. `dashboard.js` chama `get_perfil_completo` (token).
3. Recebe perfil, notas, faltas, histórico, biblioteca, documentos, professores.
4. Renderiza tudo.

### 3.4. RPC usada
- `get_perfil_completo`
- `cesc_pedir_documento`

---

## 4. Área do Professor

### 4.1. Ficheiros
- `admin/professor.html`
- `admin/css/professor.css`
- `admin/scripts/professor.js`

### 4.2. Estrutura
- Sidebar com 5 secções: Visão Geral, Minhas Turmas, Lançar Notas, Marcar Faltas, Perfil.
- Lançar notas: tabela expansível (desktop) ou cartões (mobile).
- Cada aluno expande para avaliações contínuas + NPT.
- Bloqueio após NPT lançada (trimestre fechado).

### 4.3. Fluxo
1. Login → `cesc_perfil_role` → role `professor` → `admin/professor.html`.
2. `professor.js` chama `cesc_professor_dashboard`.
3. Renderiza turmas e permite lançar notas/faltas.

### 4.4. RPCs usadas
- `cesc_professor_dashboard`
- `cesc_professor_alunos`
- `cesc_professor_adicionar_avaliacao`
- `cesc_professor_remover_avaliacao`
- `cesc_professor_listar_avaliacoes`
- `cesc_professor_lancar_npt`
- `cesc_professor_marcar_falta`
- `cesc_professor_listar_faltas`

---

## 5. Área da Secretaria

### 5.1. Ficheiros
- `secretaria/secretaria.html`
- `secretaria/css/secretaria.css`
- `secretaria/scripts/secretaria-*.js` (6 ficheiros)

### 5.2. Estrutura (6 módulos)
| Módulo | Responsabilidade |
|---|---|
| `secretaria-core.js` | Arranque, navegação, helpers, `renderizarTudo` |
| `secretaria-modais.js` | Modal genérico, aprovar/rejeitar, confirmar matrícula |
| `secretaria-alunos.js` | Lista, pesquisa, criar, editar alunos |
| `secretaria-inscricoes.js` | Lista, filtros, detalhes, análise, histórico do candidato |
| `secretaria-matriculas.js` | Lista, criar matrícula |
| `secretaria-documentos.js` | Lista, marcar pago/emitido |

### 5.3. Ordem de carregamento (obrigatória)

```html
<script src="../scripts/api.js"></script>
<script src="scripts/secretaria-core.js"></script>
<script src="scripts/secretaria-modais.js"></script>
<script src="scripts/secretaria-alunos.js"></script>
<script src="scripts/secretaria-inscricoes.js"></script>
<script src="scripts/secretaria-matriculas.js"></script>
<script src="scripts/secretaria-documentos.js"></script>
```

Porquê esta ordem: core define variáveis globais e helpers (capitalizar, campoForm, mostrarMsg, atualizarBadges, inscricaoEmAnalise); modais define abrirModal; os outros usam-nos.

5.4. Fluxo

1. Login → cesc_perfil_role → role secretaria → secretaria.html.
2. secretaria-core.js chama cesc_secretaria_dashboard.
3. Renderiza tudo.

5.5. Comportamentos especiais

· Bloqueio de análise: ao abrir uma inscrição, chama cesc_secretaria_iniciar_analise; ao fechar (aprovar/rejeitar/cancelar/mudar de secção), chama cesc_secretaria_terminar_analise.
· beforeunload: se a secretária fechar o browser, o sendBeacon tenta terminar a análise.
· Badges: "Em análise" (amarelo), "Cód. 0" / "Cód. 1" (rejeição), "Aguarda matrícula" (azul), "Matriculado" (verde).
· Histórico do candidato: no detalhe da inscrição, mostra as últimas alterações do candidato.

5.6. RPCs usadas

· cesc_secretaria_dashboard
· cesc_secretaria_listar_alunos
· cesc_secretaria_criar_aluno
· cesc_secretaria_editar_aluno
· cesc_secretaria_listar_matriculas
· cesc_secretaria_criar_matricula
· cesc_secretaria_listar_documentos
· cesc_secretaria_marcar_documento
· cesc_secretaria_listar_inscricoes
· cesc_secretaria_aprovar_inscricao
· cesc_secretaria_rejeitar_inscricao
· cesc_secretaria_contar_inscricoes_pendentes
· cesc_secretaria_iniciar_analise
· cesc_secretaria_terminar_analise
· cesc_secretaria_historico_candidato

---

6. Inscrição Pública

6.1. Ficheiros

· paginas/inscricao.html
· css/inscricao.css
· scripts/inscricao.js

6.2. Estrutura

5 passos:

1. Dados do aluno — BI (validação offline + duplicado), nome, data nasc, género, telefone, e-mail (verificado por código).
2. Encarregado — nome, parentesco, telefone, BI (opcional), endereço (opcional).
3. Documentos — 4 uploads (BI frente/verso, certificado, foto). Comprimidos no browser.
4. Inscrição — classe, curso, média (opcional), como soube.
5. Revisão — todos os dados + aceitar termos + submeter.

6.3. Fluxo

1. Candidato abre inscricao.html.
2. Passo 1: BI (blur → cesc_verificar_bi_inscricao), e-mail (botão verificar → Edge enviar-codigo → RPC cesc_validar_codigo_inscricao).
3. Passo 3: upload → Storage bucket cesc-inscricoes.
4. Passo 5: cesc_submeter_inscricao → estado a_pagar → [PAGAMENTO] → estado pendente.
5. Ecrã de sucesso com referência.

6.4. RPCs e Edge Functions

· cesc_verificar_bi_inscricao
· cesc_validar_codigo_inscricao
· cesc_submeter_inscricao
· Edge Function enviar-codigo (modo is_inscricao: true)

6.5. Pendente (a implementar)

· Pagamento via AppyPay (criar-pagamento, webhook-pagamento, verificar-pagamento).
· Retoma de pagamento abandonado (inscricao-retomar.html).

---

7. Painel do Candidato

7.1. Ficheiros

· paginas/candidato-login.html
· paginas/candidato-painel.html
· css/candidato-painel.css
· scripts/candidato-login.js
· scripts/candidato-painel.js

7.2. Estrutura

· Login: BI + e-mail → código 2FA → token em sessionStorage (cesc_candidato_token, 2h).
· Painel: sidebar com 5 secções: Visão Geral, Minhas Inscrições, Meu Perfil, Meus Documentos, Histórico de Alterações.
· 4 cards na Visão Geral (Perfil, Candidatura Atual, Histórico, Documentos).
· Perfil editável excepto e-mail; BI editável (com validação de duplicados).
· Botão "Recandidatar" no histórico (só se rejeitada + código 1).
· Botão "Substituir" em cada documento (chama cesc_candidato_atualizar_documento — não muda estado).

7.3. Fluxo

1. candidato-login.html: BI + e-mail → Edge enviar-codigo (is_candidato: true) → código → RPC cesc_validar_codigo_candidato → token.
2. candidato-painel.html: cesc_candidato_painel → renderiza.

7.4. RPCs usadas

· cesc_login_candidato
· cesc_validar_codigo_candidato
· cesc_candidato_painel
· cesc_candidato_atualizar_perfil
· cesc_candidato_atualizar_documento
· cesc_candidato_recandidatar
· cesc_candidato_listar_historico
· Edge Function enviar-codigo
· Edge Function gerar-url-assinada

7.5. Pendente (a implementar)

· Botão "Marcar Matrícula" (quando estado aprovada) — pagar 3000 Kz.
· Aviso "Pagamento pendente" (quando inscricao_a_pagar) — botão "Retomar pagamento".

---

8. Consulta de Inscrição

8.1. Ficheiros

· paginas/consultar-inscricao.html
· scripts/consultar-inscricao.js

8.2. Fluxo

1. Candidato insere referência + BI.
2. Chama cesc_consultar_inscricao.
3. Devolve estado, motivo, datas.

---

9. Site Público

9.1. Ficheiros

· index.html, sobre.html, contacto.html, avisos.html
· css/base.css, style.css, layout.css, home.css, paginas.css
· scripts/main.js

9.2. Estrutura

· Header fixo com menu desktop + menu mobile (drawer).
· Carrossel de Destaques (index.html).
· Calendário escolar.
· Botão "Inscrever-se" → paginas/inscricao.html.

---

10. Módulo api.js

Obrigatório em todas as páginas. Define:

· API.SUPABASE_URL, API.SUPABASE_ANON_KEY, API.APP_NAME, API.TIMEOUT_MS.
· chamarRPC(nomeFuncao, params) — POST para /rest/v1/rpc/<nome>.
· chamarEdge(nomeFuncao, body) — POST para /functions/v1/<nome>.
· obterToken(), guardarToken(token), terminarSessao(), exigirLogin(), fazerLogout().
· esc(s) — escapa HTML.
· fmtNota(n), fmtPercent(n), fmtData(dataStr), linhaInfo(rotulo, valor).

Nunca duplicar estas funções em ficheiros de página.

---

11. Padrões de UI

11.1. Sidebar (dashboard, professor, secretaria, candidato)

· Fixa à esquerda em desktop, drawer em mobile.
· .sidebar, .sidebar-topo, .sidebar-perfil, .sidebar-nav, .sidebar-rodape.
· Botão de fechar (#sidebarFechar) e overlay (#sidebarOverlay) só em mobile.

11.2. Cards

· .stat-card (cinza claro, bordas, sombra leve).
· .stat-header, .stat-valor, .stat-subtexto.
· Variantes: .stat-card-clicavel, .stat-card-destaque, .stat-card-alerta.

11.3. Tabelas

· .tabela-wrapper (overflow-x auto em mobile).
· .tabela-sec (secretaria) ou .notas-tabela / .faltas-tabela (aluno).
· Cabeçalhos com fundo #f8fafc, texto #475569, uppercase.

11.4. Formulários

· .campo-grupo (label + input + erro).
· .campo-erro (vermelho, escondido até haver erro).
· .msg-form (feedback: .erro ou .sucesso).

11.5. Botões

· .botao-primario (azul cheio).
· .botao-secundario (branco com borda).
· .btn-acao (acções em linha de tabela: .btn-acao-primario, .btn-acao-secundario, .btn-acao-sucesso).

11.6. Modais

· .modal-overlay (fundo escuro).
· .modal-card (branco centrado).
· .modal-header, .modal-body, .modal-footer.

11.7. Loader

· .loader-container (centrado).
· .loader (spinner azul).

11.8. Badges de estado

· .badge-activo, .badge-pendente, .badge-rejeitada, .badge-aprovada, .badge-matriculado, .badge-sem-conta, .badge-desistente, .badge-formado, .badge-transferido, .badge-inscricao_paga, .badge-matricula_paga.

---

12. Responsividade

· Breakpoint principal: 768px (mobile) e 900px (sidebar desaparece).
· Tabelas: scroll horizontal ou cartões alternativos (professor, secretaria).
· Sidebar: drawer com overlay em mobile.
· Stats: colapsam naturalmente (auto-fit, minmax(150px, 1fr)).

---

13. Sessão e tokens

· Token do utilizador (aluno, professor, secretaria): sessionStorage.cesc_token. Expira em 7 dias.
· Token do candidato: sessionStorage.cesc_candidato_token. Expira em 2 horas.
· Nunca guardar tokens em localStorage (mais exposto a XSS).
· Nunca colocar tokens no URL.

---

14. Utilitários de desenvolvimento

14.1. Recuperar token via consola do browser

```javascript
sessionStorage.getItem("cesc_token")
sessionStorage.getItem("cesc_candidato_token")
```

14.2. Limpar sessão

```javascript
sessionStorage.clear()
```

14.3. Ver erros de RPC

O api.js imprime no console (console.error) o nome da RPC e o erro HTTP. F12 → Console.

---

15. Pendente / próximos passos

Curto prazo

· Pagamento (AppyPay / mock):
  · inscricao.js com polling.
  · inscricao-retomar.html.
  · candidato-painel.js com botão "Marcar Matrícula" e aviso "Pagamento pendente".
  · Secretária: botão "Atribuir turma".
  · Ver PAGAMENTOS.md.

Médio prazo

· Área do Diretor (direcao/direcao.html):
  · Visão global.
  · Aprovar documentos.
  · Configurar cesc.configuracoes.
· Área do Encarregado (encarregado/encarregado.html):
  · Notas e faltas do educando.

Longo prazo

· Algoritmo de distribuição de turmas.
· Gestão de horários e salas.

---

16. Contacto

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com

---

Última actualização: 26/10/2026

```