/*
 Autor: Francisco Tchiama
 Companhia: TCLabs
 Data: 19/10/2026
 Versão: 4.0
 Descrição:
 Dashboard do aluno, usando o módulo api.js.
 - Navegação por secções.
 - Filtros por ano (notas, faltas, histórico, biblioteca).
 - 5 cards clicáveis com painéis expandidos.
 - Desempenho calculado (média MFD / 20 * 100).
 - Faltas por período (ano/trimestre/mês).
 - Desempenho por trimestre.
 - Professores por disciplina.
 */

let dadosGlobais = null;
let anoAtual = null;

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

    // Carregar dados
    const dados = await chamarRPC("get_perfil_completo", { p_token: token });

    if (!dados.ok) {
        sessionStorage.removeItem("cesc_token");
        window.location.href = "login.html?erro=1";
        return;
    }

    dadosGlobais = dados;
    anoAtual = calcularAnoAtual(dados.historico);

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
// RENDERIZAR TUDO
// ============================================================
function renderizarTudo(dados) {
    const u = dados.utilizador;
    const a = dados.aluno;
    const notas = dados.notas || [];
    const biblioteca = dados.biblioteca || [];
    const faltas = dados.faltas || [];
    const historico = dados.historico || [];
    const documentos = dados.documentos || [];
    const professores = dados.professores || [];

    const inicial = (u.nome_completo || "?").charAt(0).toUpperCase();

    // Sidebar
    document.getElementById("aluno-avatar").textContent = inicial;
    document.getElementById("aluno-nome-sidebar").textContent = u.nome_completo;
    document.getElementById("aluno-turma-sidebar").textContent =
        (a && a.turma_actual) ? a.turma_actual : "Aluno";

    const matriculaAtual = historico.find(function (h) { return h.ano_lectivo === anoAtual; });
    document.getElementById("aluno-curso-sidebar").textContent =
        (matriculaAtual && matriculaAtual.curso) ? "Curso: " + matriculaAtual.curso : "—";

    // Boas-vindas
    const primeiroNome = u.nome_completo.split(" ")[0];
    document.getElementById("boas-vindas").textContent = "Bem-vindo de volta, " + primeiroNome + ".";

    // Cabeçalho info
    const cabInfo = document.getElementById("cabecalho-info");
    if (cabInfo && matriculaAtual) {
        let html = "";
        html += '<span><i class="fas fa-graduation-cap"></i> ' + esc(matriculaAtual.classe) + ' · Turma ' + esc(matriculaAtual.turma) + '</span>';
        if (matriculaAtual.curso) html += '<span><i class="fas fa-bookmark"></i> ' + esc(matriculaAtual.curso) + '</span>';
        if (matriculaAtual.numero_aluno) html += '<span><i class="fas fa-hashtag"></i> Nº ' + matriculaAtual.numero_aluno + '</span>';
        cabInfo.innerHTML = html;
    }

    renderizarStats(notas, faltas, biblioteca);
    renderizarInfoEscolar(a, matriculaAtual);
    configurarFiltros(notas, faltas, historico, biblioteca);

    renderizarNotas(notas, anoAtual);
    renderizarFaltas(faltas, anoAtual, "ano", null);
    renderizarDesempenho(notas);
    renderizarHistorico(historico, "");
    renderizarBiblioteca(biblioteca, "");
    renderizarDocumentos(documentos);
    renderizarPerfil(u, a);

    document.getElementById("btn-pedir-certificado").addEventListener("click", function () { pedirDocumento("Certificado"); });
    document.getElementById("btn-pedir-declaracao").addEventListener("click", function () { pedirDocumento("Declaração de Notas"); });

    configurarCardsClicaveis(notas, faltas, biblioteca, professores);
}

// ============================================================
// CÁLCULOS
// ============================================================
function calcularAnoAtual(historico) {
    if (!historico || historico.length === 0) return null;
    const ativo = historico.find(function (h) { return h.estado === "activo"; });
    return ativo ? ativo.ano_lectivo : historico[0].ano_lectivo;
}

function calcularDesempenho(notas, ano) {
    const filtradas = notas.filter(function (n) {
        return n.ano_lectivo === ano && n.mfd != null;
    });
    if (filtradas.length === 0) return null;
    const soma = filtradas.reduce(function (acc, n) { return acc + Number(n.mfd); }, 0);
    const media = soma / filtradas.length;
    return { media: media, percent: (media / 20) * 100 };
}

function calcularMediaCumulativa(notas) {
    const mfds = notas.filter(function (n) { return n.mfd != null; });
    if (mfds.length === 0) return null;
    return mfds.reduce(function (acc, n) { return acc + Number(n.mfd); }, 0) / mfds.length;
}

// ============================================================
// STATS
// ============================================================
function renderizarStats(notas, faltas, biblioteca) {
    const notasAno = notas.filter(function (n) { return n.ano_lectivo === anoAtual; });
    const disciplinasAno = new Set(notasAno.map(function (n) { return n.disciplina; }));
    document.getElementById("stat-disciplinas").textContent = disciplinasAno.size;

    const media = calcularMediaCumulativa(notas);
    document.getElementById("stat-media").textContent = media !== null ? media.toFixed(1) : "—";

    const faltasAno = faltas.filter(function (f) { return f.ano_lectivo === anoAtual; });
    const total = faltasAno.reduce(function (p, f) { return p + (f.quantidade || 0); }, 0);
    document.getElementById("stat-faltas").textContent = total;

    document.getElementById("stat-trabalhos").textContent = biblioteca.length;

    const desemp = calcularDesempenho(notas, anoAtual);
    const elDesemp = document.getElementById("stat-desempenho");
    const elBarra = document.getElementById("stat-desempenho-barra");
    if (desemp) {
        elDesemp.textContent = desemp.percent.toFixed(0) + "%";
        if (elBarra) elBarra.style.width = desemp.percent + "%";
    } else {
        elDesemp.textContent = "—";
        if (elBarra) elBarra.style.width = "0%";
    }
}

// ============================================================
// INFO ESCOLAR
// ============================================================
function renderizarInfoEscolar(a, matricula) {
    let html = "";
    if (a) {
        html += linhaInfo("Turma", a.turma_actual);
        html += linhaInfo("Ano de entrada", a.ano_entrada);
        html += linhaInfo("Ano de conclusão", a.ano_conclusao);
        html += linhaInfo("Estado", a.estado);
    }
    if (matricula) {
        html += linhaInfo("Curso", matricula.curso);
        html += linhaInfo("Nº de aluno", matricula.numero_aluno);
    }
    document.getElementById("info-escolar").innerHTML = html;
}

// ============================================================
// CARDS CLICÁVEIS
// ============================================================
function configurarCardsClicaveis(notas, faltas, biblioteca, professores) {
    document.querySelectorAll(".stat-card-clicavel").forEach(function (card) {
        card.addEventListener("click", function (e) {
            if (e.target.closest("a")) return;

            const nome = card.getAttribute("data-card");
            const painel = document.getElementById("expand-" + nome);
            const conteudo = document.getElementById("conteudo-" + nome);
            if (!painel || !conteudo) return;

            const aberto = painel.style.display !== "none";
            document.querySelectorAll(".card-expandido").forEach(function (p) { p.style.display = "none"; });
            document.querySelectorAll(".stat-card").forEach(function (c) { c.classList.remove("stat-card-aberto"); });

            if (aberto) return;

            painel.style.display = "block";
            card.classList.add("stat-card-aberto");

            if (nome === "disciplinas") mostrarDisciplinas(conteudo, notas, professores);
            else if (nome === "media") mostrarMedia(conteudo, notas);
            else if (nome === "faltas") mostrarFaltasResumo(conteudo, faltas);
            else if (nome === "trabalhos") mostrarTrabalhosResumo(conteudo, biblioteca);
            else if (nome === "desempenho") mostrarDesempenhoResumo(conteudo, notas);
        });
    });
}

function mostrarDisciplinas(conteudo, notas, professores) {
    const notasAno = notas.filter(function (n) { return n.ano_lectivo === anoAtual; });
    const disciplinas = new Set(notasAno.map(function (n) { return n.disciplina; }));

    if (disciplinas.size === 0) {
        conteudo.innerHTML = '<p style="color:#94a3b8;">Sem disciplinas no ano atual.</p>';
        return;
    }

    let html = '<h4>Disciplinas e Professores</h4><ul>';
    Array.from(disciplinas).sort().forEach(function (disc) {
        const prof = professores.find(function (p) { return p.disciplina === disc; });
        html += '<li>' + esc(disc);
        if (prof) {
            html += ' — <a href="javascript:void(0)" class="professor-link" onclick="avisoProfessor(\'' + esc(prof.professor_nome) + '\')">' + esc(prof.professor_nome) + '</a>';
        } else {
            html += ' — <span style="color:#94a3b8;">Sem professor atribuído</span>';
        }
        html += '</li>';
    });
    html += '</ul>';
    conteudo.innerHTML = html;
}

function mostrarMedia(conteudo, notas) {
    const porAno = {};
    notas.forEach(function (n) {
        if (n.mfd == null) return;
        if (!porAno[n.ano_lectivo]) porAno[n.ano_lectivo] = [];
        porAno[n.ano_lectivo].push(Number(n.mfd));
    });

    if (Object.keys(porAno).length === 0) {
        conteudo.innerHTML = '<p style="color:#94a3b8;">Sem notas finais registadas.</p>';
        return;
    }

    let html = '<h4>Média por ano letivo</h4><ul>';
    Object.keys(porAno).sort().reverse().forEach(function (ano) {
        const arr = porAno[ano];
        const media = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
        html += '<li>' + esc(ano) + ' — <strong>' + media.toFixed(2) + '</strong></li>';
    });
    html += '</ul>';
    conteudo.innerHTML = html;
}

function mostrarFaltasResumo(conteudo, faltas) {
    const filtradas = faltas.filter(function (f) { return f.ano_lectivo === anoAtual; });
    if (filtradas.length === 0) {
        conteudo.innerHTML = '<p style="color:#94a3b8;">Nenhuma falta no ano atual.</p>';
        return;
    }
    const porDisc = {};
    filtradas.forEach(function (f) {
        if (!porDisc[f.disciplina]) porDisc[f.disciplina] = 0;
        porDisc[f.disciplina] += (f.quantidade || 0);
    });
    let html = '<h4>Faltas por disciplina (ano atual)</h4><ul>';
    Object.keys(porDisc).sort().forEach(function (d) {
        html += '<li>' + esc(d) + ' — <strong>' + porDisc[d] + '</strong> falta(s)</li>';
    });
    html += '</ul>';
    conteudo.innerHTML = html;
}

function mostrarTrabalhosResumo(conteudo, biblioteca) {
    if (biblioteca.length === 0) {
        conteudo.innerHTML = '<p style="color:#94a3b8;">Sem trabalhos.</p>';
        return;
    }
    let html = '<h4>Últimos trabalhos</h4><ul>';
    biblioteca.slice(0, 5).forEach(function (t) {
        html += '<li>';
        if (t.destaque) html += '<i class="fas fa-star" style="color:#d97706;"></i> ';
        html += esc(t.titulo) + ' <span style="color:#94a3b8;">(' + esc(t.ano_lectivo) + ')</span>';
        html += '</li>';
    });
    if (biblioteca.length > 5) html += '<li style="color:#94a3b8;">e mais ' + (biblioteca.length - 5) + '...</li>';
    html += '</ul>';
    conteudo.innerHTML = html;
}

function mostrarDesempenhoResumo(conteudo, notas) {
    const desemp = calcularDesempenho(notas, anoAtual);
    if (!desemp) {
        conteudo.innerHTML = '<p style="color:#94a3b8;">Sem dados suficientes.</p>';
        return;
    }
    conteudo.innerHTML = '<h4>Desempenho do ano atual</h4>' +
        '<p style="font-size:0.9rem; margin:0 0 8px;">Média: <strong>' + desemp.media.toFixed(2) + '</strong> / 20</p>' +
        '<p style="font-size:0.9rem; margin:0;">Percentagem: <strong style="color:#d97706;">' + desemp.percent.toFixed(1) + '%</strong></p>';
}

function avisoProfessor(nome) {
    alert("Perfil do professor " + nome + " estará disponível em breve.");
}

// ============================================================
// FILTROS
// ============================================================
function configurarFiltros(notas, faltas, historico, biblioteca) {
    const anos = Array.from(new Set(notas.map(function (n) { return n.ano_lectivo; }))).sort().reverse();

    ["filtro-notas-ano", "filtro-faltas-ano", "filtro-historico-ano", "filtro-biblioteca-ano"].forEach(function (id) {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = "";
        if (id === "filtro-historico-ano" || id === "filtro-biblioteca-ano") {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Todos os anos";
            sel.appendChild(opt);
        }
        anos.forEach(function (ano) {
            const opt = document.createElement("option");
            opt.value = ano;
            opt.textContent = ano;
            if (ano === anoAtual && id !== "filtro-historico-ano" && id !== "filtro-biblioteca-ano") {
                opt.selected = true;
            }
            sel.appendChild(opt);
        });
    });

    document.getElementById("filtro-notas-ano").addEventListener("change", function () {
        renderizarNotas(notas, this.value);
    });

    const selAno = document.getElementById("filtro-faltas-ano");
    const selPer = document.getElementById("filtro-faltas-periodo");
    const selVal = document.getElementById("filtro-faltas-periodo-valor");

    function atualizar() {
        renderizarFaltas(faltas, selAno.value, selPer.value, selVal.value);
    }

    selAno.addEventListener("change", atualizar);
    selPer.addEventListener("change", function () {
        atualizarSelectPeriodo(this.value, selVal, faltas, selAno.value);
        atualizar();
    });
    selVal.addEventListener("change", atualizar);

    document.getElementById("filtro-historico-ano").addEventListener("change", function () {
        renderizarHistorico(historico, this.value);
    });

    document.getElementById("filtro-biblioteca-ano").addEventListener("change", function () {
        renderizarBiblioteca(biblioteca, this.value);
    });
}

function atualizarSelectPeriodo(periodo, selVal, faltas, ano) {
    selVal.innerHTML = "";
    if (periodo === "ano") {
        selVal.style.display = "none";
        return;
    }
    selVal.style.display = "block";
    if (periodo === "trimestre") {
        ["1º Trimestre", "2º Trimestre", "3º Trimestre"].forEach(function (t, i) {
            const opt = document.createElement("option");
            opt.value = i + 1;
            opt.textContent = t;
            selVal.appendChild(opt);
        });
    } else if (periodo === "mes") {
        const meses = faltas
            .filter(function (f) { return f.ano_lectivo === ano; })
            .map(function (f) { return f.mes; })
            .filter(function (m, i, arr) { return m && arr.indexOf(m) === i; })
            .sort();
        meses.forEach(function (m) {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = m;
            selVal.appendChild(opt);
        });
    }
}

// ============================================================
// SECÇÕES
// ============================================================
function renderizarNotas(notas, ano) {
    const container = document.getElementById("lista-notas");
    const filtradas = notas.filter(function (n) { return n.ano_lectivo === ano; });

    if (filtradas.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem notas registadas neste ano.</div>';
        return;
    }

    const porDisc = {};
    filtradas.forEach(function (n) {
        if (!porDisc[n.disciplina]) porDisc[n.disciplina] = [];
        porDisc[n.disciplina].push(n);
    });

    let html = "";
    Object.keys(porDisc).sort().forEach(function (disc) {
        html += '<div class="disciplina-card"><h3 class="disciplina-titulo"><span>' + esc(disc) + '</span></h3>';
        html += '<div class="tabela-scroll"><table class="notas-tabela"><thead><tr>';
        html += '<th>Trimestre</th><th>MAC</th><th>NPT</th><th>MT</th><th>MFD</th></tr></thead><tbody>';
        porDisc[disc].sort(function (a, b) { return a.trimestre - b.trimestre; }).forEach(function (n) {
            html += '<tr>';
            html += '<td>' + n.trimestre + 'º</td>';
            html += '<td>' + fmtNota(n.mac) + '</td>';
            html += '<td>' + fmtNota(n.npt) + '</td>';
            html += '<td><strong>' + fmtNota(n.mt) + '</strong></td>';
            html += '<td>' + (n.mfd != null ? '<strong>' + fmtNota(n.mfd) + '</strong>' : '—') + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table></div></div>';
    });
    container.innerHTML = html;
}

function renderizarFaltas(faltas, ano, periodo, valorPeriodo) {
    const container = document.getElementById("lista-faltas");
    let filtradas = faltas.filter(function (f) { return f.ano_lectivo === ano; });

    if (periodo === "trimestre" && valorPeriodo) {
        const tri = parseInt(valorPeriodo, 10);
        filtradas = filtradas.filter(function (f) {
            if (!f.data_falta) return false;
            const mes = new Date(f.data_falta).getMonth() + 1;
            if (tri === 1) return mes >= 9 && mes <= 12;
            if (tri === 2) return mes >= 1 && mes <= 4;
            return mes >= 5 && mes <= 8;
        });
    } else if (periodo === "mes" && valorPeriodo) {
        filtradas = filtradas.filter(function (f) { return f.mes === valorPeriodo; });
    }

    if (filtradas.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem faltas para este período.</div>';
        return;
    }

    let total = 0;
    let html = '<div class="disciplina-card"><h3 class="disciplina-titulo"><span>Resumo de Faltas</span><span style="font-size:0.85rem; color:#475569;">Total: <span id="total-faltas">0</span></span></h3>';
    html += '<div class="tabela-scroll"><table class="faltas-tabela"><thead><tr>';
    html += '<th>Disciplina</th><th>Mês</th><th>Data</th><th>Quantidade</th><th>Justificada</th></tr></thead><tbody>';

    filtradas.sort(function (a, b) { return (a.data_falta || "").localeCompare(b.data_falta || ""); }).forEach(function (f) {
        total += (f.quantidade || 0);
        html += '<tr>';
        html += '<td>' + esc(f.disciplina) + '</td>';
        html += '<td>' + esc(f.mes || "—") + '</td>';
        html += '<td>' + fmtData(f.data_falta) + '</td>';
        html += '<td>' + f.quantidade + '</td>';
        html += '<td>' + (f.justificada ? "Sim" : "Não") + '</td>';
        html += '</tr>';
    });

    html += '</tbody></table></div></div>';
    container.innerHTML = html;
    const totalEl = document.getElementById("total-faltas");
    if (totalEl) totalEl.textContent = total;
}

function renderizarDesempenho(notas) {
    const container = document.getElementById("lista-desempenho");
    const anos = Array.from(new Set(notas.map(function (n) { return n.ano_lectivo; }))).sort().reverse();

    if (anos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem dados.</div>';
        return;
    }

    let html = "";
    anos.forEach(function (ano) {
        const notasAno = notas.filter(function (n) { return n.ano_lectivo === ano; });
        html += '<div class="desempenho-seccao"><h3>' + esc(ano) + (ano === anoAtual ? ' <span style="font-size:0.75rem; color:#d97706;">(atual)</span>' : '') + '</h3>';
        html += '<div class="desempenho-trimestre">';
        [1, 2, 3].forEach(function (t) {
            const notasT = notasAno.filter(function (n) { return n.trimestre === t && n.mt != null; });
            let valor = "—", percent = "—";
            if (notasT.length > 0) {
                const media = notasT.reduce(function (a, n) { return a + Number(n.mt); }, 0) / notasT.length;
                valor = media.toFixed(1);
                percent = ((media / 20) * 100).toFixed(0) + "%";
            }
            html += '<div class="trimestre-card"><div class="trimestre-nome">' + t + 'º Trim.</div>';
            html += '<div class="trimestre-valor">' + valor + '</div>';
            html += '<div class="trimestre-percent">' + percent + '</div></div>';
        });
        html += '</div>';
        const desemp = calcularDesempenho(notasAno, ano);
        if (desemp) {
            html += '<p style="font-size:0.88rem; color:#475569; margin:0;">Média: <strong style="color:#1e3a8a;">' + desemp.media.toFixed(2) + '</strong> · Desempenho: <strong style="color:#d97706;">' + desemp.percent.toFixed(1) + '%</strong></p>';
        }
        html += '</div>';
    });
    container.innerHTML = html;
}

function renderizarHistorico(historico, filtro) {
    const container = document.getElementById("lista-historico");
    let filtrado = historico;
    if (filtro) filtrado = historico.filter(function (h) { return h.ano_lectivo === filtro; });

    if (filtrado.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem histórico.</div>';
        return;
    }

    let html = '<div class="disciplina-card"><div class="tabela-scroll"><table class="historico-tabela"><thead><tr>';
    html += '<th>Ano Letivo</th><th>Classe</th><th>Turma</th><th>Curso</th><th>Nº</th><th>Estado</th></tr></thead><tbody>';
    filtrado.forEach(function (h) {
        html += '<tr>';
        html += '<td>' + esc(h.ano_lectivo) + '</td>';
        html += '<td>' + esc(h.classe) + '</td>';
        html += '<td>' + esc(h.turma) + '</td>';
        html += '<td>' + esc(h.curso || "—") + '</td>';
        html += '<td>' + (h.numero_aluno != null ? h.numero_aluno : "—") + '</td>';
        html += '<td>' + esc(h.estado || "—") + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
}

function renderizarBiblioteca(biblioteca, filtro) {
    const container = document.getElementById("lista-biblioteca");
    let filtrado = biblioteca;
    if (filtro) filtrado = biblioteca.filter(function (t) { return t.ano_lectivo === filtro; });

    if (filtrado.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem trabalhos.</div>';
        return;
    }

    let html = '<div class="biblioteca-grelha">';
    filtrado.forEach(function (t) {
        html += '<div class="trabalho-card">';
        if (t.destaque) html += '<span class="trabalho-destaque"><i class="fas fa-star"></i> Destaque</span>';
        html += '<h3 class="trabalho-titulo">' + esc(t.titulo) + '</h3>';
        html += '<p class="trabalho-meta">' + esc(t.disciplina || "—") + ' · ' + esc(t.ano_lectivo || "—") + '</p>';
        if (t.ficheiro_url) html += '<a href="' + esc(t.ficheiro_url) + '" target="_blank" rel="noopener" class="trabalho-link">Ver trabalho</a>';
        html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderizarDocumentos(documentos) {
    const container = document.getElementById("lista-documentos");
    if (documentos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem pedidos.</div>';
        return;
    }
    let html = '<div class="disciplina-card"><div class="tabela-scroll"><table class="documentos-tabela"><thead><tr>';
    html += '<th>Tipo</th><th>Estado</th><th>Pago</th><th>Data do Pedido</th><th>Data de Emissão</th></tr></thead><tbody>';
    documentos.forEach(function (d) {
        html += '<tr>';
        html += '<td>' + esc(d.tipo_documento) + '</td>';
        html += '<td>' + esc(d.estado) + '</td>';
        html += '<td>' + (d.pago ? "Sim" : "Não") + '</td>';
        html += '<td>' + fmtData(d.data_pedido) + '</td>';
        html += '<td>' + fmtData(d.data_emissao) + '</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div></div>';
    container.innerHTML = html;
}

function renderizarPerfil(u, a) {
    const container = document.getElementById("lista-perfil");
    let html = '<div class="card-info" style="margin-bottom:20px;"><h3><i class="fas fa-user"></i> Dados Pessoais</h3>';
    html += linhaInfo("Nome completo", u.nome_completo);
    html += linhaInfo("E-mail", u.email);
    if (a) {
        html += linhaInfo("BI", a.bi_numero);
        html += linhaInfo("Data de nascimento", a.data_nascimento);
        html += linhaInfo("Género", a.genero);
        html += linhaInfo("Telefone", a.telefone);
    }
    html += '</div>';
    if (a) {
        html += '<div class="card-info"><h3><i class="fas fa-users"></i> Encarregados</h3>';
        html += linhaInfo("Pai", a.nome_pai);
        html += linhaInfo("Telefone do pai", a.telefone_pai);
        html += linhaInfo("Mãe", a.nome_mae);
        html += linhaInfo("Telefone da mãe", a.telefone_mae);
        html += '</div>';
    }
    container.innerHTML = html;
}

async function pedirDocumento(tipo) {
    const token = obterToken();
    if (!token) return terminarSessao();

    const dados = await chamarRPC("cesc_pedir_documento", { p_token: token, p_tipo: tipo });
    if (dados.ok) {
        alert("Pedido de " + tipo + " registado!");
        window.location.reload();
    } else {
        alert("Não foi possível pedir o documento: " + (dados.erro || "erro"));
    }
}