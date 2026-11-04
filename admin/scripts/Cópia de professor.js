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