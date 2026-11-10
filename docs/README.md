Aqui tens o primeiro ficheiro, docs/README.md, completo.

```markdown
# CESC — Complexo Escolar Santa Catarina

**Autor:** Francisco Tchiama  
**Companhia:** TCLabs  
**Localização:** Cabinda, Angola  
**Versão:** 3.0  
**Data:** 10/11/2026

---

## 1. O que é o CESC

Sistema de gestão escolar para o **Complexo Escolar Santa Catarina**, composto por:

- **Frontend Web** (HTML/CSS/JS puro) — site institucional, área do aluno, do professor, do candidato, da secretaria, da direção e (futuramente) do encarregado.
- **Supabase** — base de dados (schema `cesc`), autenticação caseira (tokens), RPCs, Storage e Edge Functions.
- **Render (`tclabs-email-api`)** — envio de e-mails via Brevo.
- **Brevo** — entrega real dos e-mails.

O CESC **partilha o mesmo projeto Supabase** do **Kandamy** (`kmdixtzvnhvtwkpsicoq`), mas está isolado num **schema separado** (`cesc`). O Kandamy usa o schema `public` sem alterações.

---

## 2. Estado atual do projeto (Versão 3.0)

| Módulo | Estado |
|---|---|
| Autenticação (2FA por e-mail) | ✅ Funcional |
| Área do Aluno | ✅ Funcional |
| Área do Professor | ✅ Funcional |
| Área da Secretária | ✅ Funcional |
| Inscrição pública (com convite) | ✅ Funcional (com classes/cursos dinâmicos) |
| Painel do Candidato | ✅ Funcional |
| Pagamento (AppyPay) | 🔄 Mock funcional |
| Área do Diretor | ✅ Funcional |
| **AURA (JUIZ, DISTRIBUIDOR, TRANSIÇÃO)** | ✅ **Backend + Interface validados** |
| **Perfil do Aluno (página dedicada)** | ✅ **Funcional** |
| Área do Encarregado | ❌ Não existe |

---

## 3. O que mudou nesta versão (3.0)

### 3.1. AURA v2 (Validação Completa)
- O **JUIZ** passou a ler a Grelha Curricular (as disciplinas críticas/secundárias já não estão no código).
- O **DISTRIBUIDOR** passou a ser atemporal (lê a planta da escola, não a alocação de um ano específico) e cria a matrícula se ela não existir.
- A **TRANSIÇÃO** foi criada do zero: lê os alunos `matriculado` e cria as inscrições `matricula_paga` para o novo ano, ignorando a 9ª e a 12ª.
- **Proteções aplicadas (Tratamento de Exceções):** O AURA agora bloqueia se as inscrições estiverem abertas, se faltar grelha, se faltar regra, se faltar alocação ou se a capacidade das salas for insuficiente.

### 3.2. Interface do Diretor (AURA)
- Botões separados por fase: **Fecho do Ano** (JUIZ + TRANSIÇÃO) e **Abertura do Novo Ano** (DISTRIBUIDOR).
- Criação de regras e alocações com **dropdowns dinâmicos** (sem digitação manual).
- **Data de criação** em cada regra e alocação.
- Botões para **apagar** regras e alocações (com confirmação).

### 3.3. Perfil do Aluno (Página Dedicada)
- Nova página `paginas/perfil-aluno.html` com layout de perfil.
- Filtro por ano letivo e por trimestre.
- Linha do tempo atemporal (mostra todos os anos, com veredito do AURA).
- Cartões colapsáveis para documentos, faltas, pagamentos e histórico de alterações.
- Notas negativas a vermelho e MFD a verde.
- Avatar com a foto tipo-passe (se existir).

### 3.4. Gestão Académica (Grelha Curricular)
- Aba dedicada para gerir Classes, Cursos, Disciplinas e Grelha Curricular.
- Layout responsivo (desktop e mobile).
- Proteções ao apagar (bloqueia se houver alunos ou notas).

---

## 4. Estrutura de pastas

```

C_E_S_C/
├── index.html, sobre.html, contacto.html, avisos.html
├── css/ (base, layout, home, paginas, auth, dashboard, inscricao, candidato-painel, perfil-aluno)
├── scripts/ (api.js, auth, dashboard, inscricao, candidato-*, consultar-inscricao, perfil-aluno)
├── paginas/ (login, criar-conta, dashboard, inscricao, consultar-inscricao, candidato-login, candidato-painel, perfil-aluno, biblioteca, sobre, contacto)
├── admin/ (professor.html + css + scripts)
├── secretaria/ (secretaria.html + css + scripts)
├── direcao/ (direcao.html + css + scripts)
└── docs/ (README.md, BACKEND.md, FRONTEND.md, PAGAMENTOS.md, AURAv2.md, CICLO_VIDA_ALUNO.md)

```

**Regras de ouro:**
- **Nunca** colar `api.js` em páginas. Carregar sempre via `<script src=".../api.js"></script>` antes de qualquer outro script.
- **Nunca** usar a `service_role` no browser.
- **Nunca** chamar tabelas diretamente. Sempre via RPCs `security definer`.

---

## 5. Como arrancar o projeto localmente

```bash
cd /storage/emulated/0/ProjectosCodestudio/CESC
python3 -m http.server 8080
```

Abrir no browser: http://localhost:8080/

---

6. Fluxos principais

6.1. Login (2FA)

login.html → auth.js → Edge Function enviar-codigo → e-mail com código → cesc_validar_codigo → token → redirect por role.

6.2. Ciclo Anual do AURA

1. Fecho do Ano: Diretor clica em JUIZ (avalia notas) e depois em TRANSIÇÃO (cria inscrições do novo ano).
2. Época de Inscrições: Novos alunos fazem a inscrição pública e ficam matricula_paga.
3. Abertura do Novo Ano: Diretor clica em DISTRIBUIDOR (coloca todos os matricula_paga nas salas e muda para matriculado).

6.3. Perfil do Aluno

Alunos → clicar em Ver Ficha → abre paginas/perfil-aluno.html?id=...&role=... → layout de perfil com filtros, linha do tempo, notas, faltas, documentos e pagamentos.

---

7. Roadmap

Curto prazo:

· Área do Encarregado (acompanhar notas e faltas).

Médio prazo:

· Ciclo de vida do aluno (concluido, transferido, desistente).
· Exame Nacional (MFD 50/50 para a 12ª classe).

Longo prazo:

· Pagamento real (AppyPay).
· Gestão de horários.
· Relatórios avançados no Diretor.

---

8. Contas de teste

Role Email Password
Aluno aluno.teste@cesc.ao 123456
Professor tclabs.suporte@gmail.com prof123
Secretária tclabs.suporte+sec@gmail.com sec123
Candidato tclabs.suporte+fred@gmail.com (BI 123456789CA001) login por código
Diretor (obter via SQL) (definir via SQL)

---

9. Autor

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com