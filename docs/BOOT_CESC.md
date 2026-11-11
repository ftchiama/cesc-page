Aqui está o ficheiro de boot para o novo chat. Cola o conteúdo no início da nova conversa para o novo modelo saber exatamente onde estamos.

---

docs/BOOT.md

```markdown
# CESC — Boot do Novo Chat

**Data:** 11/11/2026  
**Versão do projeto:** 2.1 (commit `1a5661b`)  
**Autor:** Francisco Tchiama / TCLabs

---

## 1. O que é o CESC

Sistema de gestão escolar para o **Complexo Escolar Santa Catarina** (Cabinda, Angola). Compartilha o mesmo projeto Supabase do Kandamy (`kmdixtzvnhvtwkpsicoq`), mas isolado no schema `cesc`. O Kandamy usa o schema `public` sem alterações.

**Stack:** HTML/CSS/JS puro (frontend) + Supabase (PostgreSQL, RPCs, Storage, Edge Functions) + Render/Brevo (e-mail) + AppyPay (pagamento, mock).

---

## 2. Estado Atual (11/11/2026)

### 2.1. Módulos Funcionais

| Módulo | Estado |
|---|---|
| Autenticação (2FA por e-mail) | ✅ Funcional |
| Área do Aluno | ✅ Funcional |
| Área do Professor | ✅ Funcional |
| Área da Secretária | ✅ Funcional |
| Inscrição pública (com convite + classes/cursos dinâmicos) | ✅ Funcional |
| Painel do Candidato | ✅ Funcional |
| Pagamento (AppyPay) | 🔄 Mock funcional |
| Área do Diretor | ✅ Funcional |
| AURA (JUIZ, DISTRIBUIDOR, TRANSIÇÃO) | ✅ Backend + UI validados |
| Perfil do Aluno (página dedicada) | ✅ Funcional |
| Home pública dinâmica (notícias/eventos/inscrições) | ✅ Funcional |
| Área do Encarregado | ❌ Não existe |

### 2.2. O que foi feito nesta sessão (últimas alterações)

- **AURA completo:** JUIZ (lê grelha + regras), TRANSIÇÃO (muda ano letivo + cria inscrições), DISTRIBUIDOR (coloca nas salas + cria matrícula se não existir). Todos com proteções (bloqueiam se inscrições abertas, sem grelha, sem regras, sem alocação, capacidade insuficiente, etc.).
- **Alocações e Regras atemporais:** Tabela `cesc.regras_aura` sem `ano_lectivo`. Alocação de salas lida sem filtro de ano (planta fixa). Coluna `criado_em` em ambas.
- **Interface do Diretor:** Botões de JUIZ, TRANSIÇÃO e DISTRIBUIDOR separados por fases (Fecho do Ano vs Abertura do Novo Ano). Dropdowns dinâmicos (classes, cursos, salas, pavilhões) em vez de digitação. Data de criação e botões de apagar.
- **Home pública:** Hero limpo, drawer mobile igual ao dashboard, botões de inscrição dinâmicos (aparecem/somem conforme `inscricoes_abertas`), secções Destaques e Calendário carregadas da base de dados (`cesc.noticias` e `cesc.eventos`).
- **Autenticação:** Novo visual (fundo azul, cartão com sombra), botão de reenvio de código com cooldown de 60s.
- **Perfil do Aluno:** Página dedicada com filtro de ano/trimestre, linha do tempo atemporal, notas a vermelho/verde, cartões colapsáveis, documentos.
- **Login/Registo:** Visual atualizado (nova `auth.css`).
- **Favicon PNG:** Aplicado em todas as páginas.
- **Proteções de apagar:** Classes, cursos, disciplinas, salas, regras e alocações bloqueiam se houver dependências.

---

## 3. O que falta (roadmap)

### 3.1. Curto prazo
- **Área do Encarregado:** Acompanhar notas, faltas e pagamentos do educando.
- **Fechar o ciclo de Notícias/Eventos:** Criar a página `paginas/noticias.html` (lista completa) e a interface do Diretor para publicar notícias/eventos (`cesc.noticias` e `cesc.eventos` já existem na BD).
- **Reenvio de código na Edge Function:** A Edge Function `enviar-codigo` precisa de aceitar reenvio sem password (o `auth.js` já envia `password: null`).

### 3.2. Médio prazo
- **Ciclo de vida do aluno:** Documentar e implementar `concluido`, `transferido`, `desistente`, `retido`.
- **Exame Nacional:** MFD 50/50 para a 12ª classe.
- **Renovação de matrícula automatizada:** A Transição já cria as inscrições, mas falta a interface de confirmação.

### 3.3. Longo prazo
- **Pagamento real (AppyPay):** Sair do mock.
- **Gestão de horários e salas:** Evitar conflitos.
- **Relatórios e estatísticas avançadas:** Dashboards no Diretor.

---

## 4. Estrutura de Ficheiros (resumo)

```

C_E_S_C/
├── index.html, sobre.html, contacto.html, biblioteca.html, avisos.html
├── favicon.png
├── manifest.json (não criado ainda)
├── limpar-copias.sh (script de limpeza)
├── verificar-favicon.sh (script de verificação)
├── css/ (base, layout, home, paginas, auth, dashboard, inscricao, candidato-painel, perfil-aluno)
├── scripts/ (api.js, auth.js, main.js, dashboard.js, inscricao.js, candidato-*.js, perfil-aluno.js)
├── paginas/ (login, criar-conta, dashboard, inscricao, consultar-inscricao, candidato-login, candidato-painel, perfil-aluno, biblioteca, sobre, contacto, noticias [a criar])
├── admin/ (professor.html + css + scripts)
├── secretaria/ (secretaria.html + css + scripts)
├── direcao/ (direcao.html + css + scripts: core, salas, financeiro, equipa, configuracoes, academico, aura, inscricoes)
└── docs/ (README.md, BACKEND.md, FRONTEND.md, PAGAMENTOS.md, AURAv1.md, AURAv2.md, BACKENDv3.md, CICLO_VIDA_ALUNO.md [a criar])

```

**Regras de ouro:**
- `api.js` carregado sempre antes de qualquer outro script.
- Nunca usar `service_role` no browser.
- Nunca chamar tabelas diretamente. Sempre via RPCs `security definer`.

---

## 5. Base de Dados (schema `cesc`)

### 5.1. Tabelas Principais
- `utilizadores` (roles: aluno, professor, secretaria, diretor, sub_diretor, coordenador, encarregado)
- `alunos` (estado: activo, concluido, retido, transferido, desistente)
- `matriculas` (ano_lectivo, classe, curso, sala_id, numero_aluno)
- `inscricoes` (estado: a_pagar, pendente, aprovada, rejeitada, matricula_paga, matriculado; tipo: novo, aprovado, reprovado)
- `notas_trimestrais` (MAC, NPT, MT, MFD)
- `faltas`
- `pagamentos`
- `regras_aura` (atemporal, sem ano_lectivo)
- `grelha_curricular` (classe_id, curso_id, disciplina_id, critica)
- `alocacao_salas` (atemporal, com criado_em)
- `salas`
- `classes`
- `cursos`
- `disciplinas`
- `noticias` (NOVO — titulo, resumo, conteudo, categoria, imagem_url, destaque, publicado, data_publicacao)
- `eventos` (NOVO — titulo, descricao, data_evento, publicado)
- `configuracoes` (ano_lectivo_actual, inscricoes_abertas)

### 5.2. Ponte com Kandamy
- `public.sessoes` (tokens de sessão com `app_name = 'CESC'`)

---

## 6. RPCs Importantes

### 6.1. AURA
- `cesc_aura_julgar` (JUIZ)
- `cesc_aura_transicao` (TRANSIÇÃO — agora atualiza o ano letivo atual)
- `cesc_aura_distribuir` (DISTRIBUIDOR)
- `cesc_aura_guardar_regra`, `cesc_diretor_listar_regras_aura`, `cesc_diretor_atualizar_regra_aura`, `cesc_diretor_apagar_regra_aura`
- `cesc_aura_guardar_alocacao`, `cesc_diretor_listar_alocacoes`, `cesc_diretor_apagar_alocacao`

### 6.2. Académico
- `cesc_diretor_listar_classes/cursos/disciplinas/grelha`
- `cesc_diretor_guardar_classe/curso/disciplina/grelha`
- `cesc_diretor_apagar_classe/curso/disciplina/grelha` (com proteções)

### 6.3. Home Pública
- `cesc_home_dados` (notícias, eventos, estado das inscrições, ano letivo)
- `cesc_listar_classes_publico`, `cesc_listar_cursos_publico`

### 6.4. Auth
- `cesc_perfil_role`, `cesc_validar_codigo`, `cesc_criar_conta`
- Edge Function `enviar-codigo`

---

## 7. Problemas Conhecidos / Dívidas Técnicas

1. **Edge Function `enviar-codigo`:** não aceita reenvio sem password. Precisa de ajuste.
2. **Página `noticias.html`:** ainda não existe. O link no menu dá 404.
3. **Interface do Diretor para Notícias/Eventos:** não existe. As tabelas `noticias` e `eventos` já estão na BD, mas o Diretor não consegue publicar.
4. **PWA:** não implementado (opcional, mas o `manifest.json` não existe).
5. **`secretaria-inscricoes.js`:** pode ainda tentar correr no Diretor (tem guarda `if (!document.getElementById("sec-avatar")) return;`, mas precisa de confirmação).
6. **`limpar-copias.sh` e `verificar-favicon.sh`:** criados, mas o commit do favicon é o que foi feito (o commit do script de limpeza ficou pendente).

---

## 8. Contexto de Desenvolvimento

- **Ambiente:** CodeStudio/Termux no telemóvel.
- **Repositório:** `https://github.com/ftchiama/cesc-page.git` (branch `main`).
- **Deploy:** Render (automático a cada push).
- **Commit atual:** `1a5661b` (v2.1).
- **Último commit feito:** favicon PNG.
- **Próximo passo:** o novo chat deve decidir (recomendação: criar a página `noticias.html` e a interface do Diretor para publicar notícias/eventos, OU avançar para a Área do Encarregado).

---

## 9. Documentação Existente

- `docs/README.md` — visão geral do projeto.
- `docs/BACKEND.md` (v2) — modelo de dados, RPCs, segurança.
- `docs/BACKENDv3.md` (v3) — versão atualizada com as novas tabelas e RPCs.
- `docs/FRONTEND.md` — páginas, scripts, CSS.
- `docs/PAGAMENTOS.md` — integração AppyPay (mock e real).
- `docs/PAYMENT_TRANSITION.md` — transição mock → real.
- `docs/AURAv1.md` — arquitetura original do AURA.
- `docs/AURAv2.md` — versão atualizada do AURA.
- `docs/BOOT.md` — este ficheiro.

---

## 10. Contacto

**Francisco Tchiama**  
TCLabs — Cabinda, Angola  
franciscotchiama9@gmail.com
```

---

Como usar no novo chat

No primeiro pedido do novo chat, cola isto:

```
Lê o ficheiro BOOT.md abaixo e continua o projeto CESC a partir do estado atual. 
O objetivo é terminar o que falta (notícias/eventos, área do encarregado, etc.). 
Não assumas nada que não esteja no BOOT.md — pergunta antes de alterar.