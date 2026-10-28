/*
 CESC — Secretaria
 Data: 24/10/2026
 Versão: 1.8 (Bloqueio de candidato durante análise)

 - Valida token e role (secretaria, diretor, sub_diretor).
 - Visão Geral: stats agregadas + últimos alunos registados + card de inscrições.
 - Alunos: lista (pesquisa), criar novo aluno, editar ficha.
 - Inscrições: lista com filtros, ordenação, e bloqueio de edição durante análise.
 - Matrículas: lista (filtro por ano), criar matrícula.
 - Documentos: lista (filtro por estado), marcar pago / emitido.
 - Perfil: dados da conta.
 */

let dadosSec = null;
let alunosCache = [];
let alunoEditando = null;

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

    // Badge + Card de inscrições
    const resInsc = await chamarRPC("cesc_secretaria_contar_inscricoes_pendentes", { p_token: token });
    if (resInsc.ok) {
        const totalPendentes = resInsc.total || 0;
        
        const statInsc = document.getElementById("stat-inscricoes-pendentes");
        if (statInsc) {
            statInsc.textContent = totalPendentes;
            if (totalPendentes > 0) {
                statInsc.style.color = "var(--cor-erro)";
                statInsc.parentElement.classList.add("stat-card-alerta");
            } else {
                statInsc.style.color = "var(--cor-azul)";
                statInsc.parentElement.classList.remove("stat-card-alerta");
            }
        }

        const badgeMenu = document.getElementById("badge-inscricoes");
        if (badgeMenu) {
            if (totalPendentes > 0) {
                badgeMenu.textContent = totalPendentes;
                badgeMenu.style.display = "inline-block";
            } else {
                badgeMenu.style.display = "none";
            }
        }
    }

    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";

    // Configurar filtros de inscrições (uma única vez)
    configurarFiltrosInscricoes();
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

    if (id === "alunos") carregarAlunos();
    else if (id === "inscricoes") carregarInscricoes();
    else if (id === "matriculas") carregarMatriculas();
    else if (id === "documentos") carregarDocumentos();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// RENDERIZAR TUDO (visão inicial)
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
// SECÇÃO: ALUNOS
// ============================================================
async function carregarAlunos() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById("lista-alunos-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_secretaria_listar_alunos", { p_token: token });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar alunos.") + '</div>';
        return;
    }

    alunosCache = dados.alunos || [];
    renderizarListaAlunos(alunosCache);

    const filtro = document.getElementById("filtro-alunos");
    if (filtro && !filtro.dataset.ligado) {
        filtro.dataset.ligado = "1";
        filtro.addEventListener("input", function () {
            const termo = this.value.trim().toLowerCase();
            if (!termo) {
                renderizarListaAlunos(alunosCache);
                return;
            }
            const filtrados = alunosCache.filter(function (a) {
                return (a.nome_completo || "").toLowerCase().indexOf(termo) !== -1
                    || (a.bi_numero || "").toLowerCase().indexOf(termo) !== -1
                    || (a.turma_actual || "").toLowerCase().indexOf(termo) !== -1;
            });
            renderizarListaAlunos(filtrados);
        });
    }
}

function renderizarListaAlunos(alunos) {
    const container = document.getElementById("lista-alunos-container");

    if (alunos.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Nenhum aluno encontrado.</div>';
        return;
    }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th class="col-opcional">Turma</th>';
    html += '  <th class="col-opcional">Contacto</th>';
    html += '  <th>Conta</th>';
    html += '  <th>Estado</th>';
    html += '  <th>Acções</th>';
    html += '</tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const conta = a.tem_conta
            ? '<span class="badge badge-activo">Criada</span>'
            : '<span class="badge badge-sem-conta">Sem conta</span>';

        html += '<tr data-aluno-idx="' + idx + '">';
        html += '  <td><div class="celula-nome"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></div></td>';
        html += '  <td class="col-opcional">' + esc(a.turma_actual || "—") + '</td>';
        html += '  <td class="col-opcional">' + esc(a.telefone || a.email_contacto || "—") + '</td>';
        html += '  <td>' + conta + '</td>';
        html += '  <td><span class="badge badge-' + esc(a.estado || "activo") + '">' + esc(capitalizar(a.estado || "activo")) + '</span></td>';
        html += '  <td><div class="acoes-linha">';
        html += '    <button class="btn-acao btn-acao-secundario" data-editar-aluno="' + idx + '"><i class="fas fa-edit"></i> Editar</button>';
        if (a.matricula_activa) {
            html += '    <button class="btn-acao btn-acao-secundario" data-ver-matricula="' + idx + '" disabled>Matriculado</button>';
        } else {
            html += '    <button class="btn-acao btn-acao-primario" data-nova-matricula="' + idx + '"><i class="fas fa-plus"></i> Matricular</button>';
        }
        html += '  </div></td>';
        html += '</tr>';

        html += '<tr class="linha-editar" data-editar-linha="' + idx + '" style="display:none;">';
        html += '<td colspan="6"><div data-editar-conteudo="' + idx + '"></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    alunos.forEach(function (a, idx) {
        const conta = a.tem_conta
            ? '<span class="badge badge-activo">Criada</span>'
            : '<span class="badge badge-sem-conta">Sem conta</span>';

        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo">';
        html += '    <div class="cartao-sec-info">';
        html += '      <strong>' + esc(a.nome_completo) + '</strong>';
        html += '      <span>BI: ' + esc(a.bi_numero) + '</span>';
        html += '    </div>';
        html += '    <span class="badge badge-' + esc(a.estado || "activo") + '">' + esc(capitalizar(a.estado || "activo")) + '</span>';
        html += '  </div>';
        html += '  <div class="cartao-sec-meta">';
        html += '    <div class="meta-item"><span class="meta-rotulo">Turma</span><span class="meta-valor">' + esc(a.turma_actual || "—") + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Contacto</span><span class="meta-valor">' + esc(a.telefone || a.email_contacto || "—") + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Conta</span><span class="meta-valor">' + conta + '</span></div>';
        html += '  </div>';
        html += '  <div class="cartao-sec-acoes">';
        html += '    <button class="btn-acao btn-acao-secundario" data-editar-aluno-mobile="' + idx + '"><i class="fas fa-edit"></i> Editar</button>';
        if (a.matricula_activa) {
            html += '    <button class="btn-acao btn-acao-secundario" disabled>Matriculado</button>';
        } else {
            html += '    <button class="btn-acao btn-acao-primario" data-nova-matricula-mobile="' + idx + '"><i class="fas fa-plus"></i> Matricular</button>';
        }
        html += '  </div>';
        html += '  <div class="cartao-sec-editar" data-editar-mobile="' + idx + '" style="display:none;"></div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll("[data-editar-aluno]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.getAttribute("data-editar-aluno"), 10);
            abrirEditorAluno(alunos[idx], idx, false);
        });
    });

    container.querySelectorAll("[data-nova-matricula]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.getAttribute("data-nova-matricula"), 10);
            irParaNovaMatricula(alunos[idx]);
        });
    });

    container.querySelectorAll("[data-editar-aluno-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.getAttribute("data-editar-aluno-mobile"), 10);
            abrirEditorAluno(alunos[idx], idx, true);
        });
    });

    container.querySelectorAll("[data-nova-matricula-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.getAttribute("data-nova-matricula-mobile"), 10);
            irParaNovaMatricula(alunos[idx]);
        });
    });
}

function abrirEditorAluno(aluno, idx, éMobile) {
    const seletorLinha = éMobile ? '[data-editar-mobile="' + idx + '"]' : '[data-editar-linha="' + idx + '"]';
    const seletorConteudo = éMobile ? '[data-editar-mobile="' + idx + '"]' : '[data-editar-conteudo="' + idx + '"]';

    const painel = document.querySelector(seletorLinha);
    const conteudo = document.querySelector(seletorConteudo);
    if (!painel || !conteudo) return;

    if (painel.style.display !== "none" && painel.style.display !== "") {
        painel.style.display = "none";
        conteudo.innerHTML = "";
        if (!éMobile) {
            const linha = document.querySelector('[data-editar-linha="' + idx + '"]');
            if (linha) linha.style.display = "none";
        }
        return;
    }

    if (éMobile) {
        painel.style.display = "block";
    } else {
        const linha = document.querySelector('[data-editar-linha="' + idx + '"]');
        if (linha) linha.style.display = "table-row";
    }

    let html = '<div class="form-painel" style="margin:0;">';
    html += '<h3><i class="fas fa-edit"></i> Editar: ' + esc(aluno.nome_completo) + '</h3>';
    html += '<div class="form-grelha">';

    html += campoForm("edit-nome-" + idx, "Nome completo", aluno.nome_completo || "", "text");
    html += campoForm("edit-data-nasc-" + idx, "Data de nascimento", aluno.data_nascimento ? aluno.data_nascimento.slice(0, 10) : "", "date");
    html += campoForm("edit-telefone-" + idx, "Telefone", aluno.telefone || "", "text");
    html += campoForm("edit-email-" + idx, "Email de contacto", aluno.email_contacto || "", "email");
    html += campoForm("edit-encarregado-" + idx, "Encarregado", aluno.nome_encarregado || "", "text");
    html += campoForm("edit-tel-encarregado-" + idx, "Telefone do encarregado", aluno.telefone_encarregado || "", "text");
    html += campoForm("edit-turma-" + idx, "Turma actual", aluno.turma_actual || "", "text");

    html += '<div class="campo-grupo">';
    html += '  <label for="edit-estado-' + idx + '">Estado</label>';
    html += '  <select id="edit-estado-' + idx + '">';
    ["activo", "formado", "desistente", "transferido"].forEach(function (e) {
        html += '    <option value="' + e + '"' + (aluno.estado === e ? " selected" : "") + '>' + capitalizar(e) + '</option>';
    });
    html += '  </select>';
    html += '</div>';

    html += '</div>';
    html += '<div class="form-acoes">';
    html += '  <button class="botao-primario" data-guardar-edicao="' + idx + '"><i class="fas fa-save"></i> Guardar alterações</button>';
    html += '  <button class="botao-secundario" data-fechar-edicao="' + idx + '">Cancelar</button>';
    html += '</div>';
    html += '<p class="msg-form" id="msg-edit-' + idx + '"></p>';
    html += '</div>';

    conteudo.innerHTML = html;

    conteudo.querySelector('[data-guardar-edicao="' + idx + '"]').addEventListener("click", function () {
        guardarEdicaoAluno(aluno, idx);
    });

    conteudo.querySelector('[data-fechar-edicao="' + idx + '"]').addEventListener("click", function () {
        conteudo.innerHTML = "";
        if (éMobile) {
            painel.style.display = "none";
        } else {
            const linha = document.querySelector('[data-editar-linha="' + idx + '"]');
            if (linha) linha.style.display = "none";
        }
    });
}

async function guardarEdicaoAluno(aluno, idx) {
    const token = obterToken();
    const msg = document.getElementById("msg-edit-" + idx);

    const nome = document.getElementById("edit-nome-" + idx).value.trim();
    const dataNasc = document.getElementById("edit-data-nasc-" + idx).value || null;
    const telefone = document.getElementById("edit-telefone-" + idx).value.trim() || null;
    const email = document.getElementById("edit-email-" + idx).value.trim() || null;
    const encarregado = document.getElementById("edit-encarregado-" + idx).value.trim() || null;
    const telEncarregado = document.getElementById("edit-tel-encarregado-" + idx).value.trim() || null;
    const turma = document.getElementById("edit-turma-" + idx).value.trim() || null;
    const estado = document.getElementById("edit-estado-" + idx).value;

    if (!nome || nome.length < 3) {
        mostrarMsg(msg, "Nome completo inválido.", "erro");
        return;
    }

    const dados = await chamarRPC("cesc_secretaria_editar_aluno", {
        p_token: token,
        p_aluno_id: aluno.id,
        p_nome_completo: nome,
        p_data_nascimento: dataNasc,
        p_telefone: telefone,
        p_email_contacto: email,
        p_nome_encarregado: encarregado,
        p_telefone_encarregado: telEncarregado,
        p_turma_actual: turma,
        p_estado: estado
    });

    if (!dados.ok) {
        mostrarMsg(msg, dados.erro || "Erro ao guardar.", "erro");
        return;
    }

    mostrarMsg(msg, "Alterações guardadas.", "sucesso");
    setTimeout(function () { carregarAlunos(); }, 900);
}

// ============================================================
// SECÇÃO: INSCRIÇÕES
// ============================================================
function configurarFiltrosInscricoes() {
    const selEstado = document.getElementById("filtro-inscricoes-estado");
    const selClasse = document.getElementById("filtro-inscricoes-classe");
    const selOrdem = document.getElementById("filtro-inscricoes-ordem");

    if (selEstado) selEstado.addEventListener("change", carregarInscricoes);
    if (selClasse) selClasse.addEventListener("change", carregarInscricoes);
    if (selOrdem) selOrdem.addEventListener("change", carregarInscricoes);
}

async function carregarInscricoes() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById("lista-inscricoes-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const estado = document.getElementById("filtro-inscricoes-estado").value;
    const classe = document.getElementById("filtro-inscricoes-classe").value;
    const ordemParam = document.getElementById("filtro-inscricoes-ordem").value;

    let ordenar_por = "data", ordem = "desc";
    if (ordemParam.indexOf("media") === 0) { ordenar_por = "media"; ordem = ordemParam.split("_")[1]; }
    else if (ordemParam.indexOf("idade") === 0) { ordenar_por = "idade"; ordem = ordemParam.split("_")[1]; }
    else if (ordemParam.indexOf("nome") === 0) { ordenar_por = "nome"; ordem = ordemParam.split("_")[1]; }

    const dados = await chamarRPC("cesc_secretaria_listar_inscricoes", {
        p_token: token,
        p_estado: estado || null,
        p_classe: classe || null,
        p_ordenar_por: ordenar_por,
        p_ordem: ordem
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar inscrições.") + '</div>';
        return;
    }

    renderizarListaInscricoes(dados.inscricoes || []);
}

function renderizarListaInscricoes(lista) {
    const container = document.getElementById("lista-inscricoes-container");
    if (lista.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem inscrições registadas.</div>';
        return;
    }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr>';
    html += '  <th>Referência</th>';
    html += '  <th>Candidato</th>';
    html += '  <th>Classe</th>';
    html += '  <th>Média</th>';
    html += '  <th>Data</th>';
    html += '  <th>Estado</th>';
    html += '  <th>Acções</th>';
    html += '</tr></thead><tbody>';

    lista.forEach(function (i, idx) {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";

        html += '<tr>';
        html += '  <td><strong>' + esc(i.referencia) + '</strong></td>';
        html += '  <td><div class="celula-nome"><strong>' + esc(i.nome_completo) + '</strong><span>BI: ' + esc(i.bi_numero) + '</span></div></td>';
        html += '  <td>' + esc(i.classe_pretendida) + '</td>';
        html += '  <td class="' + mediaClasse + '" style="font-weight:700; text-align:center;">' + media + '</td>';
        html += '  <td>' + fmtData(i.data_submissao) + '</td>';
        html += '  <td><span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span></td>';
        html += '  <td><div class="acoes-linha">';
        html += '    <button class="btn-acao btn-acao-secundario" data-ver-inscricao="' + idx + '"><i class="fas fa-eye"></i> Ver</button>';
        html += '  </div></td>';
        html += '</tr>';
        
        html += '<tr class="linha-editar" data-inscricao-linha="' + idx + '" style="display:none;"><td colspan="7"><div data-inscricao-conteudo="' + idx + '"></div></td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    lista.forEach(function (i, idx) {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";

        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo">';
        html += '    <div class="cartao-sec-info"><strong>' + esc(i.nome_completo) + '</strong><span>Ref: ' + esc(i.referencia) + '</span></div>';
        html += '    <span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span>';
        html += '  </div>';
        html += '  <div class="cartao-sec-meta">';
        html += '    <div class="meta-item"><span class="meta-rotulo">Classe</span><span class="meta-valor">' + esc(i.classe_pretendida) + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Média</span><span class="meta-valor ' + mediaClasse + '">' + media + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Data</span><span class="meta-valor">' + fmtData(i.data_submissao) + '</span></div>';
        html += '  </div>';
        html += '  <div class="cartao-sec-acoes">';
        html += '    <button class="btn-acao btn-acao-primario" data-ver-inscricao-mobile="' + idx + '"><i class="fas fa-eye"></i> Ver detalhes</button>';
        html += '  </div>';
        html += '  <div data-inscricao-mobile="' + idx + '" style="display:none; margin-top:12px;"></div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll("[data-ver-inscricao]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.getAttribute("data-ver-inscricao"), 10);
            abrirDetalheInscricao(lista[idx], idx, false);
        });
    });
    
    container.querySelectorAll("[data-ver-inscricao-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.getAttribute("data-ver-inscricao-mobile"), 10);
            abrirDetalheInscricao(lista[idx], idx, true);
        });
    });
}

async function abrirDetalheInscricao(insc, idx, éMobile) {
    const token = obterToken();
    const selLinha = éMobile ? '[data-inscricao-mobile="'+idx+'"]' : '[data-inscricao-linha="'+idx+'"]';
    const selConteudo = éMobile ? '[data-inscricao-mobile="'+idx+'"]' : '[data-inscricao-conteudo="'+idx+'"]';
    
    const painel = document.querySelector(selLinha);
    const conteudo = document.querySelector(selConteudo);

    // Se já estiver aberto, fechar E terminar análise
    if (painel.style.display === "block" || painel.style.display === "table-row") {
        painel.style.display = "none";
        await chamarRPC("cesc_secretaria_terminar_analise", {
            p_token: token,
            p_inscricao_id: insc.id
        });
        return;
    }
    
    // Abrir e iniciar análise
    painel.style.display = éMobile ? "block" : "table-row";
    conteudo.innerHTML = '<div class="loader" style="width:24px; height:24px; margin:10px auto;"></div>';

    // Bloquear a candidatura durante a análise
    await chamarRPC("cesc_secretaria_iniciar_analise", {
        p_token: token,
        p_inscricao_id: insc.id
    });

    const urls = await obterUrlsDocumentos(insc);

    const media = insc.media_certificado != null ? Number(insc.media_certificado).toFixed(2) : "—";

    let html = '<div class="inscricao-detalhe-box">';
    html += '<h3 style="margin-bottom:12px; color:var(--cor-azul);">Detalhes da Inscrição</h3>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem; margin-bottom:16px;">';
    html += '<div><strong>BI:</strong> ' + esc(insc.bi_numero) + '</div>';
    html += '<div><strong>Data Nasc:</strong> ' + fmtData(insc.data_nascimento) + '</div>';
    html += '<div><strong>Género:</strong> ' + (insc.genero === "M" ? "Masculino" : "Feminino") + '</div>';
    html += '<div><strong>Telefone:</strong> ' + esc(insc.telefone) + '</div>';
    html += '<div><strong>Email:</strong> ' + esc(insc.email || "—") + '</div>';
    html += '<div><strong>Encarregado:</strong> ' + esc(insc.nome_encarregado) + ' (' + esc(insc.telefone_encarregado) + ')</div>';
    html += '<div style="grid-column: 1 / -1; background:var(--cor-fundo); padding:8px 12px; border-radius:6px; margin-top:8px;">';
    html += '<strong>Média do Certificado:</strong> <span style="font-size:1.1rem; color:var(--cor-azul);">' + media + ' / 20</span>';
    html += '</div>';
    html += '</div>';

    html += '<h4 style="margin-bottom:8px; color:var(--cor-azul);">Documentos</h4>';
    html += '<div class="docs-grelha">';
    
    const docs = [
        { label: "BI Frente", url: urls.bi_frente },
        { label: "BI Verso", url: urls.bi_verso },
        { label: "Certificado", url: urls.certificado },
        { label: "Foto", url: urls.foto }
    ];

    docs.forEach(function (d) {
        if (d.url) {
            html += '<a href="' + d.url + '" target="_blank" class="doc-btn"><i class="fas fa-file-image"></i> ' + d.label + '</a>';
        } else {
            html += '<span class="doc-btn" style="opacity:0.5; cursor:not-allowed;"><i class="fas fa-times"></i> ' + d.label + ' (Erro)</span>';
        }
    });
    html += '</div>';

    if (insc.estado === "pendente") {
        html += '<div class="form-acoes" style="margin-top:20px;">';
        html += '  <button class="botao-primario" onclick="aprovarInscricao(\'' + insc.id + '\')"><i class="fas fa-check"></i> Aprovar</button>';
        html += '  <button class="botao-secundario" style="color:var(--cor-erro); border-color:var(--cor-erro);" onclick="rejeitarInscricao(\'' + insc.id + '\')"><i class="fas fa-times"></i> Rejeitar</button>';
        html += '  <button class="botao-secundario" onclick="cancelarAnalise(\'' + insc.id + '\', ' + idx + ', ' + éMobile + ')">Cancelar</button>';
        html += '</div>';
    }
    html += '</div>';

    conteudo.innerHTML = html;
}

async function cancelarAnalise(id, idx, éMobile) {
    const token = obterToken();
    // Terminar a análise
    await chamarRPC("cesc_secretaria_terminar_analise", {
        p_token: token,
        p_inscricao_id: id
    });
    // Fechar o painel
    const selLinha = éMobile ? '[data-inscricao-mobile="'+idx+'"]' : '[data-inscricao-linha="'+idx+'"]';
    const painel = document.querySelector(selLinha);
    if (painel) painel.style.display = "none";
}

async function obterUrlsDocumentos(insc) {
    const urls = { bi_frente: null, bi_verso: null, certificado: null, foto: null };
    
    const map = {
        bi_frente: insc.doc_bi_frente_url,
        bi_verso: insc.doc_bi_verso_url,
        certificado: insc.doc_certificado_url,
        foto: insc.doc_foto_url
    };

    for (const chave in map) {
        const path = map[chave];
        if (!path) continue;

        try {
            const res = await fetch(API.SUPABASE_URL + "/functions/v1/gerar-url-assinada", {
                method: "POST",
                headers: {
                    "apikey": API.SUPABASE_ANON_KEY,
                    "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ caminho: path })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.ok && data.url) {
                    urls[chave] = data.url;
                }
            }
        } catch (e) {
            console.error("Erro de rede:", chave, e);
        }
    }
    return urls;
}

// ============================================================
// MODAL GENÉRICO
// ============================================================
function abrirModal(titulo, htmlCorpo, acaoConfirmar, textoBotaoConfirmar) {
    const overlay = document.getElementById("modal-overlay");
    
    document.getElementById("modal-titulo").textContent = titulo;
    document.getElementById("modal-corpo").innerHTML = htmlCorpo;
    
    const btnConfirmar = document.getElementById("modal-confirmar");
    btnConfirmar.textContent = textoBotaoConfirmar || "Confirmar";
    
    const novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);
    
    novoBtn.addEventListener("click", async function () {
        novoBtn.disabled = true;
        const deveFechar = await acaoConfirmar();
        novoBtn.disabled = false;
        if (deveFechar) {
            fecharModal();
        }
    });

    document.getElementById("modal-cancelar").onclick = fecharModal;
    document.getElementById("modal-fechar").onclick = fecharModal;
    overlay.style.display = "flex";
}

function fecharModal() {
    document.getElementById("modal-overlay").style.display = "none";
    document.getElementById("modal-corpo").innerHTML = "";
}

// ============================================================
// APROVAR INSCRIÇÃO
// ============================================================
async function aprovarInscricao(id) {
    const token = obterToken();
    
    const html = `
        <p>Tens a certeza que queres aprovar este candidato?</p>
    `;
    
    abrirModal("Aprovar Inscrição", html, async function () {
        // Terminar a análise primeiro (liberta o candidato)
        await chamarRPC("cesc_secretaria_terminar_analise", {
            p_token: token,
            p_inscricao_id: id
        });

        const res = await chamarRPC("cesc_secretaria_aprovar_inscricao", {
            p_token: token,
            p_inscricao_id: id
        });

        if (res.ok) {
            carregarInscricoes();
            const dados = await chamarRPC("cesc_secretaria_dashboard", { p_token: token });
            if (dados.ok) {
                renderizarTudo(dados);
                const resInsc = await chamarRPC("cesc_secretaria_contar_inscricoes_pendentes", { p_token: token });
                if (resInsc.ok) atualizarBadges(resInsc.total || 0);
            }
            return true;
        } else {
            alert("Erro: " + res.erro);
            return false;
        }
    }, "Confirmar Aprovação");
}

// ============================================================
// REJEITAR INSCRIÇÃO
// ============================================================
async function rejeitarInscricao(id) {
    const token = obterToken();
    
    const html = `
        <p>Tens a certeza que queres rejeitar esta inscrição?</p>
        
        <div class="campo-grupo">
            <label for="modal-motivo">Motivo da Rejeição</label>
            <textarea id="modal-motivo" placeholder="Ex: Documentos incompletos ou inválidos."></textarea>
        </div>
    `;
    
    abrirModal("Rejeitar Inscrição", html, async function () {
        const motivo = document.getElementById("modal-motivo").value;
        
        if (!motivo || motivo.length < 5) {
            alert("Indica o motivo da rejeição (mínimo 5 caracteres).");
            return false;
        }

        // Terminar a análise primeiro (liberta o candidato)
        await chamarRPC("cesc_secretaria_terminar_analise", {
            p_token: token,
            p_inscricao_id: id
        });

        const res = await chamarRPC("cesc_secretaria_rejeitar_inscricao", {
            p_token: token,
            p_inscricao_id: id,
            p_motivo: motivo
        });

        if (res.ok) {
            carregarInscricoes();
            const dados = await chamarRPC("cesc_secretaria_dashboard", { p_token: token });
            if (dados.ok) {
                renderizarTudo(dados);
                const resInsc = await chamarRPC("cesc_secretaria_contar_inscricoes_pendentes", { p_token: token });
                if (resInsc.ok) atualizarBadges(resInsc.total || 0);
            }
            return true;
        } else {
            alert("Erro: " + res.erro);
            return false;
        }
    }, "Confirmar Rejeição");
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

// ============================================================
// FORM NOVO ALUNO
// ============================================================
function configurarFormNovoAluno() {
    const btnNovo = document.getElementById("btn-novo-aluno");
    const form = document.getElementById("form-novo-aluno");
    const btnCancelar = document.getElementById("btn-cancelar-aluno");
    const btnGuardar = document.getElementById("btn-guardar-aluno");
    const msg = document.getElementById("msg-novo-aluno");

    if (!btnNovo || !form) return;

    btnNovo.addEventListener("click", function () {
        form.style.display = form.style.display === "none" ? "block" : "none";
        if (msg) { msg.className = "msg-form"; msg.textContent = ""; }
    });

    if (btnCancelar) {
        btnCancelar.addEventListener("click", function () {
            form.style.display = "none";
        });
    }

    if (btnGuardar) {
        btnGuardar.addEventListener("click", async function () {
            const token = obterToken();
            const bi = document.getElementById("novo-bi").value.trim();
            const nome = document.getElementById("novo-nome").value.trim();
            const dataNasc = document.getElementById("novo-data-nasc").value || null;
            const genero = document.getElementById("novo-genero").value || null;
            const telefone = document.getElementById("novo-telefone").value.trim() || null;
            const email = document.getElementById("novo-email").value.trim() || null;
            const encarregado = document.getElementById("novo-encarregado").value.trim() || null;
            const telEncarregado = document.getElementById("novo-tel-encarregado").value.trim() || null;
            const anoEntrada = document.getElementById("novo-ano-entrada").value ? parseInt(document.getElementById("novo-ano-entrada").value, 10) : null;
            const turma = document.getElementById("novo-turma").value.trim() || null;

            if (!bi || bi.length < 6) {
                mostrarMsg(msg, "BI inválido.", "erro");
                return;
            }
            if (!nome || nome.length < 3) {
                mostrarMsg(msg, "Nome completo inválido.", "erro");
                return;
            }

            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';

            const dados = await chamarRPC("cesc_secretaria_criar_aluno", {
                p_token: token,
                p_bi_numero: bi,
                p_nome_completo: nome,
                p_data_nascimento: dataNasc,
                p_genero: genero,
                p_telefone: telefone,
                p_email_contacto: email,
                p_nome_encarregado: encarregado,
                p_telefone_encarregado: telEncarregado,
                p_ano_entrada: anoEntrada,
                p_turma_actual: turma,
                p_estado: "activo"
            });

            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar aluno';

            if (!dados.ok) {
                mostrarMsg(msg, dados.erro || "Erro ao criar aluno.", "erro");
                return;
            }

            mostrarMsg(msg, "Aluno criado com sucesso.", "sucesso");
            limparFormNovoAluno();
            setTimeout(function () {
                form.style.display = "none";
                carregarAlunos();
            }, 900);
        });
    }
}

function limparFormNovoAluno() {
    ["novo-bi", "novo-nome", "novo-data-nasc", "novo-genero", "novo-telefone",
     "novo-email", "novo-encarregado", "novo-tel-encarregado",
     "novo-ano-entrada", "novo-turma"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}

// ============================================================
// SECÇÃO: MATRÍCULAS
// ============================================================
async function carregarMatriculas() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById("lista-matriculas-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const filtroAno = document.getElementById("filtro-matriculas-ano");
    const ano = filtroAno ? filtroAno.value : "";

    const dados = await chamarRPC("cesc_secretaria_listar_matriculas", {
        p_token: token,
        p_ano_lectivo: ano || null
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar.") + '</div>';
        return;
    }

    const matriculas = dados.matriculas || [];
    renderizarListaMatriculas(matriculas, filtroAno);

    if (filtroAno && !filtroAno.dataset.ligado) {
        filtroAno.dataset.ligado = "1";
        const anos = Array.from(new Set(matriculas.map(function (m) { return m.ano_lectivo; }))).sort().reverse();
        anos.forEach(function (a) {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            filtroAno.appendChild(opt);
        });
        filtroAno.addEventListener("change", function () { carregarMatriculas(); });
    }
}

function renderizarListaMatriculas(matriculas, filtroAno) {
    const container = document.getElementById("lista-matriculas-container");

    if (matriculas.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem matrículas registadas.</div>';
        return;
    }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th>Ano letivo</th>';
    html += '  <th>Classe / Turma</th>';
    html += '  <th class="col-opcional">Curso</th>';
    html += '  <th class="col-opcional">Nº</th>';
    html += '  <th>Estado</th>';
    html += '</tr></thead><tbody>';

    matriculas.forEach(function (m) {
        html += '<tr>';
        html += '  <td><div class="celula-nome"><strong>' + esc(m.aluno_nome) + '</strong><span>BI: ' + esc(m.aluno_bi) + '</span></div></td>';
        html += '  <td>' + esc(m.ano_lectivo) + '</td>';
        html += '  <td>' + esc(m.classe) + ' · ' + esc(m.turma) + '</td>';
        html += '  <td class="col-opcional">' + esc(m.curso || "—") + '</td>';
        html += '  <td class="col-opcional">' + (m.numero_aluno != null ? m.numero_aluno : "—") + '</td>';
        html += '  <td><span class="badge badge-' + esc(m.estado || "activo") + '">' + esc(capitalizar(m.estado || "activo")) + '</span></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    matriculas.forEach(function (m) {
        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo">';
        html += '    <div class="cartao-sec-info">';
        html += '      <strong>' + esc(m.aluno_nome) + '</strong>';
        html += '      <span>BI: ' + esc(m.aluno_bi) + '</span>';
        html += '    </div>';
        html += '    <span class="badge badge-' + esc(m.estado || "activo") + '">' + esc(capitalizar(m.estado || "activo")) + '</span>';
        html += '  </div>';
        html += '  <div class="cartao-sec-meta">';
        html += '    <div class="meta-item"><span class="meta-rotulo">Ano</span><span class="meta-valor">' + esc(m.ano_lectivo) + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Classe/Turma</span><span class="meta-valor">' + esc(m.classe) + ' · ' + esc(m.turma) + '</span></div>';
        if (m.curso) {
            html += '    <div class="meta-item"><span class="meta-rotulo">Curso</span><span class="meta-valor">' + esc(m.curso) + '</span></div>';
        }
        if (m.numero_aluno != null) {
            html += '    <div class="meta-item"><span class="meta-rotulo">Nº</span><span class="meta-valor">' + m.numero_aluno + '</span></div>';
        }
        html += '  </div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
}

function irParaNovaMatricula(aluno) {
    mostrarSeccao("matriculas");
    const form = document.getElementById("form-nova-matricula");
    if (form) form.style.display = "block";

    const selAluno = document.getElementById("mat-aluno");
    if (selAluno) {
        if (alunosCache.length > 0) {
            preencherSelectAlunos(selAluno);
        } else {
            carregarAlunosParaSelect(selAluno);
        }
        selAluno.value = aluno.id;
    }
}

async function carregarAlunosParaSelect(sel) {
    const token = obterToken();
    if (!token) return;
    const dados = await chamarRPC("cesc_secretaria_listar_alunos", { p_token: token });
    if (!dados.ok) return;
    alunosCache = dados.alunos || [];
    preencherSelectAlunos(sel);
}

function preencherSelectAlunos(sel) {
    sel.innerHTML = '<option value="">— Escolhe o aluno —</option>';
    alunosCache.forEach(function (a) {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.textContent = a.nome_completo + " (" + a.bi_numero + ")";
        sel.appendChild(opt);
    });
}

function configurarFormNovaMatricula() {
    const btnNova = document.getElementById("btn-nova-matricula");
    const form = document.getElementById("form-nova-matricula");
    const btnCancelar = document.getElementById("btn-cancelar-matricula");
    const btnGuardar = document.getElementById("btn-guardar-matricula");
    const msg = document.getElementById("msg-nova-matricula");

    if (!btnNova || !form) return;

    btnNova.addEventListener("click", function () {
        form.style.display = form.style.display === "none" ? "block" : "none";
        if (form.style.display === "block") {
            const selAluno = document.getElementById("mat-aluno");
            if (selAluno) {
                if (alunosCache.length > 0) preencherSelectAlunos(selAluno);
                else carregarAlunosParaSelect(selAluno);
            }
        }
        if (msg) { msg.className = "msg-form"; msg.textContent = ""; }
    });

    if (btnCancelar) {
        btnCancelar.addEventListener("click", function () { form.style.display = "none"; });
    }

    if (btnGuardar) {
        btnGuardar.addEventListener("click", async function () {
            const token = obterToken();
            const alunoId = document.getElementById("mat-aluno").value;
            const ano = document.getElementById("mat-ano").value.trim();
            const classe = document.getElementById("mat-classe").value.trim();
            const turma = document.getElementById("mat-turma").value.trim();
            const curso = document.getElementById("mat-curso").value.trim() || null;
            const numero = document.getElementById("mat-numero").value ? parseInt(document.getElementById("mat-numero").value, 10) : null;

            if (!alunoId) { mostrarMsg(msg, "Escolhe o aluno.", "erro"); return; }
            if (!ano || !classe || !turma) { mostrarMsg(msg, "Ano, classe e turma são obrigatórios.", "erro"); return; }

            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';

            const dados = await chamarRPC("cesc_secretaria_criar_matricula", {
                p_token: token,
                p_aluno_id: alunoId,
                p_ano_lectivo: ano,
                p_classe: classe,
                p_turma: turma,
                p_curso: curso,
                p_numero_aluno: numero
            });

            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Registar matrícula';

            if (!dados.ok) {
                mostrarMsg(msg, dados.erro || "Erro ao registar.", "erro");
                return;
            }

            mostrarMsg(msg, "Matrícula registada com sucesso.", "sucesso");
            document.getElementById("mat-ano").value = "";
            document.getElementById("mat-classe").value = "";
            document.getElementById("mat-turma").value = "";
            document.getElementById("mat-curso").value = "";
            document.getElementById("mat-numero").value = "";
            setTimeout(function () {
                form.style.display = "none";
                carregarMatriculas();
            }, 900);
        });
    }
}

// ============================================================
// SECÇÃO: DOCUMENTOS
// ============================================================
async function carregarDocumentos() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById("lista-documentos-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const filtroEstado = document.getElementById("filtro-docs-estado");
    const estado = filtroEstado ? filtroEstado.value : "";

    const dados = await chamarRPC("cesc_secretaria_listar_documentos", {
        p_token: token,
        p_estado: estado || null
    });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar.") + '</div>';
        return;
    }

    renderizarListaDocumentos(dados.documentos || []);

    if (filtroEstado && !filtroEstado.dataset.ligado) {
        filtroEstado.dataset.ligado = "1";
        filtroEstado.addEventListener("change", function () { carregarDocumentos(); });
    }
}

function renderizarListaDocumentos(docs) {
    const container = document.getElementById("lista-documentos-container");

    if (docs.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Sem documentos.</div>';
        return;
    }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr>';
    html += '  <th>Aluno</th>';
    html += '  <th>Tipo</th>';
    html += '  <th class="col-opcional">Data do pedido</th>';
    html += '  <th>Estado</th>';
    html += '  <th>Acções</th>';
    html += '</tr></thead><tbody>';

    docs.forEach(function (d, idx) {
        const estadoBadge = '<span class="badge badge-' + esc(d.estado) + '">' + esc(capitalizar(d.estado)) + '</span>';
        let acoes = "";
        if (d.estado === "pendente") {
            acoes = '<button class="btn-acao btn-acao-primario" data-marcar-doc="' + idx + '" data-novo-estado="pago"><i class="fas fa-check"></i> Marcar pago</button>';
        } else if (d.estado === "pago") {
            acoes = '<button class="btn-acao btn-acao-sucesso" data-marcar-doc="' + idx + '" data-novo-estado="emitido"><i class="fas fa-file-export"></i> Emitir</button>';
        } else {
            acoes = '<span style="color:var(--cor-texto-leve); font-size:0.8rem;">Concluído</span>';
        }

        html += '<tr>';
        html += '  <td><div class="celula-nome"><strong>' + esc(d.aluno_nome) + '</strong><span>BI: ' + esc(d.aluno_bi) + '</span></div></td>';
        html += '  <td>' + esc(d.tipo_documento) + '</td>';
        html += '  <td class="col-opcional">' + fmtData(d.data_pedido) + '</td>';
        html += '  <td>' + estadoBadge + '</td>';
        html += '  <td><div class="acoes-linha">' + acoes + '</div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    docs.forEach(function (d, idx) {
        let acoes = "";
        if (d.estado === "pendente") {
            acoes = '<button class="btn-acao btn-acao-primario" data-marcar-doc-mobile="' + idx + '" data-novo-estado="pago"><i class="fas fa-check"></i> Marcar pago</button>';
        } else if (d.estado === "pago") {
            acoes = '<button class="btn-acao btn-acao-sucesso" data-marcar-doc-mobile="' + idx + '" data-novo-estado="emitido"><i class="fas fa-file-export"></i> Emitir</button>';
        } else {
            acoes = '<span style="color:var(--cor-texto-leve); font-size:0.8rem;">Concluído</span>';
        }

        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo">';
        html += '    <div class="cartao-sec-info">';
        html += '      <strong>' + esc(d.aluno_nome) + '</strong>';
        html += '      <span>BI: ' + esc(d.aluno_bi) + '</span>';
        html += '    </div>';
        html += '    <span class="badge badge-' + esc(d.estado) + '">' + esc(capitalizar(d.estado)) + '</span>';
        html += '  </div>';
        html += '  <div class="cartao-sec-meta">';
        html += '    <div class="meta-item"><span class="meta-rotulo">Tipo</span><span class="meta-valor">' + esc(d.tipo_documento) + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Pedido</span><span class="meta-valor">' + fmtData(d.data_pedido) + '</span></div>';
        html += '  </div>';
        html += '  <div class="cartao-sec-acoes">' + acoes + '</div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll("[data-marcar-doc]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.getAttribute("data-marcar-doc"), 10);
            const novoEstado = this.getAttribute("data-novo-estado");
            marcarDocumento(docs[idx], novoEstado, this);
        });
    });

    container.querySelectorAll("[data-marcar-doc-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const idx = parseInt(this.getAttribute("data-marcar-doc-mobile"), 10);
            const novoEstado = this.getAttribute("data-novo-estado");
            marcarDocumento(docs[idx], novoEstado, this);
        });
    });
}

async function marcarDocumento(doc, novoEstado, btn) {
    const token = obterToken();
    if (!token) return;

    btn.disabled = true;
    const htmlOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const dados = await chamarRPC("cesc_secretaria_marcar_documento", {
        p_token: token,
        p_doc_id: doc.id,
        p_novo_estado: novoEstado
    });

    if (!dados.ok) {
        btn.disabled = false;
        btn.innerHTML = htmlOriginal;
        alert(dados.erro || "Erro ao marcar documento.");
        return;
    }

    carregarDocumentos();
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

// ============================================================
// LIGAR FORMULÁRIOS UMA VEZ
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(function () {
        configurarFormNovoAluno();
        configurarFormNovaMatricula();
    }, 200);
});