/*
 CESC — Secretaria · Núcleo
 Data: 25/10/2026

 - Variáveis globais
 - Helpers (capitalizar, campoForm, mostrarMsg, atualizarBadges)
 - Arranque (DOMContentLoaded)
 - Navegação entre secções com terminação automática de análise
 - renderizarTudo (visão inicial)
 */

let dadosSec = null;
let alunosCache = [];
let alunoEditando = null;
let inscricaoEmAnalise = null;  // guarda o ID da inscrição que está a ser analisada

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

    // Terminar análise ao sair da página (best-effort com sendBeacon)
    window.addEventListener("beforeunload", function () {
        if (inscricaoEmAnalise) {
            const tokenSair = obterToken();
            if (tokenSair) {
                try {
                    const url = API.SUPABASE_URL + "/rest/v1/rpc/cesc_secretaria_terminar_analise";
                    const body = JSON.stringify({ p_token: tokenSair, p_inscricao_id: inscricaoEmAnalise });
                    const blob = new Blob([body], { type: "application/json" });
                    navigator.sendBeacon(url, blob);
                } catch (e) { /* silencioso */ }
            }
        }
    });

    const dados = await chamarRPC("cesc_secretaria_dashboard", { p_token: token });

    if (!dados.ok) {
        if (dados.erro && dados.erro.toLowerCase().indexOf("autorizado") !== -1) {
            window.location.href = "../paginas/dashboard.html";
            return;
        }
        document.getElementById("loader").innerHTML =
            '<p style="color:var(--cor-erro);">' + esc(dados.erro || "Erro ao carregar.") + '</p>';
        return;
    }

    dadosSec = dados;
    renderizarTudo(dados);

    const resInsc = await chamarRPC("cesc_secretaria_contar_inscricoes_pendentes", { p_token: token });
    if (resInsc.ok) atualizarBadges(resInsc.total || 0);

    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";

    configurarFiltrosInscricoes();
    configurarFormNovoAluno();
    configurarFormNovaMatricula();
});

// ============================================================
// NAVEGAÇÃO
// ============================================================
async function mostrarSeccao(id) {
    // Terminar qualquer análise aberta antes de mudar de secção
    if (inscricaoEmAnalise) {
        const token = obterToken();
        if (token) {
            await chamarRPC("cesc_secretaria_terminar_analise", {
                p_token: token,
                p_inscricao_id: inscricaoEmAnalise
            });
        }
        inscricaoEmAnalise = null;
    }

    document.querySelectorAll(".pagina-seccao").forEach(function (s) {
        s.classList.remove("ativa");
    });
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");

    document.querySelectorAll(".nav-item[data-seccao]").forEach(function (n) {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    if (id === "alunos") carregarAlunos();
    else if (id === "inscricoes") carregarInscricoes();
    else if (id === "matriculas") carregarMatriculas();
    else if (id === "documentos") carregarDocumentos();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// RENDERIZAR TUDO
// ============================================================
function renderizarTudo(dados) {
    const u = dados.utilizador;
    const s = dados.stats;

    const inicial = (u.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("sec-avatar").textContent = inicial;
    document.getElementById("sec-nome-sidebar").textContent = u.nome_completo;
    document.getElementById("sec-role-sidebar").textContent = capitalizar(u.role);

    const primeiroNome = u.nome_completo.split(" ")[0];
    document.getElementById("boas-vindas").textContent = "Bem-vindo de volta, " + primeiroNome + ".";

    document.getElementById("stat-total-alunos").textContent = s.total_alunos;
    document.getElementById("stat-alunos-activos").textContent = s.alunos_activos;
    document.getElementById("stat-total-matriculas").textContent = s.total_matriculas;
    document.getElementById("stat-docs-pendentes").textContent = s.documentos_pendentes;
    document.getElementById("stat-docs-pagos").textContent = s.documentos_pagos;

    const ultimos = dados.ultimos_alunos || [];
    const containerUltimos = document.getElementById("lista-ultimos-alunos");
    if (ultimos.length === 0) {
        containerUltimos.innerHTML = '<p style="color:var(--cor-texto-suave); font-size:0.9rem;">Sem alunos registados ainda.</p>';
    } else {
        let html = "";
        ultimos.forEach(function (a) {
            html += '<div class="info-linha">';
            html += '<span class="rotulo">' + esc(a.nome_completo) + ' <span style="font-size:0.75rem; color:var(--cor-texto-leve);">(' + esc(a.bi_numero) + ')</span></span>';
            html += '<span class="valor"><span class="badge badge-' + esc(a.estado) + '">' + esc(capitalizar(a.estado)) + '</span></span>';
            html += '</div>';
        });
        containerUltimos.innerHTML = html;
    }

    const perfil = document.getElementById("lista-perfil");
    let htmlPerfil = '<div class="card-info"><h3><i class="fas fa-user"></i> Dados da conta</h3>';
    htmlPerfil += linhaInfo("Nome completo", u.nome_completo);
    htmlPerfil += linhaInfo("E-mail", u.email);
    htmlPerfil += linhaInfo("Função", capitalizar(u.role));
    htmlPerfil += '</div>';
    perfil.innerHTML = htmlPerfil;
}

// ============================================================
// HELPERS
// ============================================================
function capitalizar(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function campoForm(id, label, valor, tipo) {
    return '<div class="campo-grupo">'
        + '<label for="' + id + '">' + label + '</label>'
        + '<input type="' + (tipo || "text") + '" id="' + id + '" value="' + esc(valor) + '">'
        + '</div>';
}

function mostrarMsg(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto;
    el.className = "msg-form " + (tipo || "erro");
    if (tipo === "sucesso") {
        setTimeout(function () {
            el.className = "msg-form";
            el.textContent = "";
        }, 2500);
    }
}

function atualizarBadges(total) {
    const statInsc = document.getElementById("stat-inscricoes-pendentes");
    if (statInsc) {
        statInsc.textContent = total;
        if (total > 0) {
            statInsc.style.color = "var(--cor-erro)";
            statInsc.parentElement.classList.add("stat-card-alerta");
        } else {
            statInsc.style.color = "var(--cor-azul)";
            statInsc.parentElement.classList.remove("stat-card-alerta");
        }
    }
    const badgeMenu = document.getElementById("badge-inscricoes");
    if (badgeMenu) {
        if (total > 0) {
            badgeMenu.textContent = total;
            badgeMenu.style.display = "inline-block";
        } else {
            badgeMenu.style.display = "none";
        }
    }
}