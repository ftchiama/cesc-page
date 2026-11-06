/*
 CESC — Secretaria · Inscrições
 Data: 05/11/2026

 - Filtro por ano letivo.
 - Cards de resumo (total, aprovadas, por aprovar, rejeitadas por código).
 - Lista com filtros (estado, classe) e ordenação.
 - Detalhe com bloqueio de análise, documentos, histórico de alterações.
 - Auditoria (quem decidiu e quando).
 */

// Verifica se o utilizador é o Diretor

// ============================================================
// ARRANQUE
// ============================================================
async function inicializarInscricoes() {
    const token = obterToken();
    if (!token) return;

    const resAnos = await chamarRPC("cesc_secretaria_listar_anos_inscricoes", { p_token: token });
    if (!resAnos.ok) return;

    const selAno = document.getElementById("filtro-inscricoes-ano");
    if (selAno) {
        selAno.innerHTML = "";
        const anos = resAnos.anos || [];
        anos.forEach(function (a) {
            const opt = document.createElement("option");
            opt.value = a;
            opt.textContent = a;
            selAno.appendChild(opt);
        });

        const dadosSec = await chamarRPC("cesc_secretaria_dashboard", { p_token: token });
        let anoAtual = null;
        if (dadosSec.ok) {
            const cfg = await chamarRPC("cesc_diretor_listar_configuracoes", { p_token: token });
            if (cfg.ok) {
                const item = (cfg.configuracoes || []).find(c => c.chave === "ano_lectivo_actual");
                if (item) anoAtual = item.valor;
            }
        }
        if (anoAtual && anos.includes(anoAtual)) {
            selAno.value = anoAtual;
        } else if (anos.length > 0) {
            selAno.value = anos[0];
        }

        selAno.addEventListener("change", function () {
            carregarStatsInscricoes();
            carregarInscricoes();
        });
    }

    configurarFiltrosInscricoes();
    await carregarStatsInscricoes();
    await carregarInscricoes();
}

// ============================================================
// CARDS DE RESUMO
// ============================================================
async function carregarStatsInscricoes() {
    const token = obterToken();
    const ano = document.getElementById("filtro-inscricoes-ano").value;
    if (!token || !ano) return;

    const res = await chamarRPC("cesc_secretaria_stats_inscricoes", { p_token: token, p_ano_lectivo: ano });
    if (!res.ok) return;

    document.getElementById("stat-total-inscricoes").textContent = res.total;
    document.getElementById("stat-inscricoes-aprovadas").textContent = res.aprovadas;
    document.getElementById("stat-inscricoes-por-aprovar").textContent = res.por_aprovar;
    document.getElementById("stat-inscricoes-matricula-paga").textContent = res.matricula_paga;
    document.getElementById("stat-inscricoes-rejeitadas").textContent = (res.rejeitadas_c0 + res.rejeitadas_c1);
    document.getElementById("stat-rejeitadas-detalhe").textContent = "Cód. 0: " + res.rejeitadas_c0 + " · Cód. 1: " + res.rejeitadas_c1;
}

// ============================================================
// FILTROS
// ============================================================
function configurarFiltrosInscricoes() {
    const selEstado = document.getElementById("filtro-inscricoes-estado");
    const selClasse = document.getElementById("filtro-inscricoes-classe");
    const selOrdem = document.getElementById("filtro-inscricoes-ordem");
    if (selEstado) selEstado.addEventListener("change", carregarInscricoes);
    if (selClasse) selClasse.addEventListener("change", carregarInscricoes);
    if (selOrdem) selOrdem.addEventListener("change", carregarInscricoes);
}

// ============================================================
// LISTA
// ============================================================
async function carregarInscricoes() {
    const token = obterToken();
    if (!token) return;
    const container = document.getElementById("lista-inscricoes-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const ano = document.getElementById("filtro-inscricoes-ano").value;
    const estado = document.getElementById("filtro-inscricoes-estado").value;
    const classe = document.getElementById("filtro-inscricoes-classe").value;
    const ordemParam = document.getElementById("filtro-inscricoes-ordem").value;

    let ordenar_por = "data", ordem = "desc";
    if (ordemParam.indexOf("media") === 0) { ordenar_por = "media"; ordem = ordemParam.split("_")[1]; }
    else if (ordemParam.indexOf("idade") === 0) { ordenar_por = "idade"; ordem = ordemParam.split("_")[1]; }
    else if (ordemParam.indexOf("nome") === 0) { ordenar_por = "nome"; ordem = ordemParam.split("_")[1]; }

    const dados = await chamarRPC("cesc_secretaria_listar_inscricoes", {
        p_token: token, p_ano_lectivo: ano, p_estado: estado || null, p_classe: classe || null,
        p_ordenar_por: ordenar_por, p_ordem: ordem
    });

    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar inscrições.") + '</div>'; return; }
    renderizarListaInscricoes(dados.inscricoes || []);
}

function renderizarListaInscricoes(lista) {
    const container = document.getElementById("lista-inscricoes-container");
    if (lista.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem inscrições registadas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Referência</th><th>Candidato</th><th>Classe</th><th>Curso</th><th>Média</th><th>Data</th><th>Estado</th><th>Acções</th></tr></thead><tbody>';

    lista.forEach(function (i, idx) {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";
        let estadoHtml = '<span class="badge badge-' + esc(i.estado) + '">' + esc(formatarEstado(i.estado)) + '</span>';
        if (i.estado === "rejeitada" && i.codigo_rejeicao != null) {
            estadoHtml += ' <span class="badge badge-' + (i.codigo_rejeicao === 1 ? "activo" : "desistente") + '" style="margin-left:4px;">Cód. ' + i.codigo_rejeicao + '</span>';
        }
        if (inscricaoEmAnalise === i.id) {
            estadoHtml += ' <span class="badge badge-pendente" style="margin-left:4px;">Em análise</span>';
        }

        html += '<tr>';
        html += '  <td><strong>' + esc(i.referencia) + '</strong></td>';
        html += '  <td><div class="celula-nome"><strong>' + esc(i.nome_completo) + '</strong><span>BI: ' + esc(i.bi_numero) + '</span></div></td>';
        html += '  <td>' + esc(i.classe_pretendida) + '</td>';
        html += '  <td>' + esc(i.curso_pretendido || "—") + '</td>';
        html += '  <td class="' + mediaClasse + '" style="font-weight:700; text-align:center;">' + media + '</td>';
        html += '  <td>' + fmtData(i.data_submissao) + '</td>';
        html += '  <td>' + estadoHtml + '</td>';
        html += '  <td><div class="acoes-linha"><button class="btn-acao btn-acao-secundario" data-ver-inscricao="' + idx + '"><i class="fas fa-eye"></i> Ver</button></div></td></tr>';
        html += '<tr class="linha-editar" data-inscricao-linha="' + idx + '" style="display:none;"><td colspan="8"><div data-inscricao-conteudo="' + idx + '"></div></td></tr>';
    });
    html += '</tbody></table></div>';

    // Cartões mobile
    html += '<div class="cartoes-sec">';
    lista.forEach(function (i, idx) {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";
        let estadoHtml = '<span class="badge badge-' + esc(i.estado) + '">' + esc(formatarEstado(i.estado)) + '</span>';
        if (i.estado === "rejeitada" && i.codigo_rejeicao != null) {
            estadoHtml += ' <span class="badge badge-' + (i.codigo_rejeicao === 1 ? "activo" : "desistente") + '" style="margin-left:4px;">Cód. ' + i.codigo_rejeicao + '</span>';
        }
        if (inscricaoEmAnalise === i.id) {
            estadoHtml += ' <span class="badge badge-pendente" style="margin-left:4px;">Em análise</span>';
        }

        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(i.nome_completo) + '</strong><span>Ref: ' + esc(i.referencia) + '</span></div><div>' + estadoHtml + '</div></div>';
        html += '  <div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Classe</span><span class="meta-valor">' + esc(i.classe_pretendida) + '</span></div>' + (i.curso_pretendido ? '<div class="meta-item"><span class="meta-rotulo">Curso</span><span class="meta-valor">' + esc(i.curso_pretendido) + '</span></div>' : '') + '<div class="meta-item"><span class="meta-rotulo">Média</span><span class="meta-valor ' + mediaClasse + '">' + media + '</span></div><div class="meta-item"><span class="meta-rotulo">Data</span><span class="meta-valor">' + fmtData(i.data_submissao) + '</span></div></div>';
        html += '  <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-primario" data-ver-inscricao-mobile="' + idx + '"><i class="fas fa-eye"></i> Ver detalhes</button></div>';
        html += '  <div data-inscricao-mobile="' + idx + '" style="display:none; margin-top:12px;"></div></div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll("[data-ver-inscricao]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-ver-inscricao"), 10); abrirDetalheInscricao(lista[idx], idx, false); });
    });
    container.querySelectorAll("[data-ver-inscricao-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-ver-inscricao-mobile"), 10); abrirDetalheInscricao(lista[idx], idx, true); });
    });
}

function formatarEstado(estado) {
    if (!estado) return "";
    if (estado === "matricula_paga") return "Matrícula Paga";
    if (estado === "matriculado") return "Matriculado";
    if (estado === "a_pagar") return "A pagar";
    return capitalizar(estado);
}

// ============================================================
// DETALHE
// ============================================================
async function abrirDetalheInscricao(insc, idx, éMobile) {
    const token = obterToken();
    const selLinha = éMobile ? '[data-inscricao-mobile="' + idx + '"]' : '[data-inscricao-linha="' + idx + '"]';
    const selConteudo = éMobile ? '[data-inscricao-mobile="' + idx + '"]' : '[data-inscricao-conteudo="' + idx + '"]';
    const painel = document.querySelector(selLinha);
    const conteudo = document.querySelector(selConteudo);

    // Se já estiver aberto, fechar
    if (painel.style.display === "block" || painel.style.display === "table-row") {
        painel.style.display = "none";
        // Se não for diretor, termina a análise
        if (!(window.ROLE_UTILIZADOR === 'diretor' || window.ROLE_UTILIZADOR === 'sub_diretor')) {
            await chamarRPC("cesc_secretaria_terminar_analise", { p_token: token, p_inscricao_id: insc.id });
            if (inscricaoEmAnalise === insc.id) inscricaoEmAnalise = null;
        }
        return;
    }

    // Se outra inscrição estiver em análise
    if (inscricaoEmAnalise && inscricaoEmAnalise !== insc.id) {
        await chamarRPC("cesc_secretaria_terminar_analise", { p_token: token, p_inscricao_id: inscricaoEmAnalise });
    }

    painel.style.display = éMobile ? "block" : "table-row";
    conteudo.innerHTML = '<div class="loader" style="width:24px; height:24px; margin:10px auto;"></div>';

    // Só a secretária inicia o bloqueio de análise
    if (!(window.ROLE_UTILIZADOR === 'diretor' || window.ROLE_UTILIZADOR === 'sub_diretor')) {
        await chamarRPC("cesc_secretaria_iniciar_analise", { p_token: token, p_inscricao_id: insc.id });
        inscricaoEmAnalise = insc.id;
    }

    const urls = await obterUrlsDocumentos(insc);
    const media = insc.media_certificado != null ? Number(insc.media_certificado).toFixed(2) : "—";

    // Histórico
    let historicoHtml = '<p style="color:var(--cor-texto-suave); font-size:0.85rem;">Sem alterações registadas.</p>';
    if (insc.candidato_id) {
        const resHist = await chamarRPC("cesc_secretaria_historico_candidato", { p_token: token, p_candidato_id: insc.candidato_id });
        if (resHist.ok && resHist.historico && resHist.historico.length > 0) {
            const mapa = { "nome_completo": "Nome", "data_nascimento": "Data Nasc.", "genero": "Género", "telefone": "Telefone", "nome_encarregado": "Encarregado", "telefone_encarregado": "Tel. Encarregado", "doc_bi_frente": "BI Frente", "doc_bi_verso": "BI Verso", "doc_certificado": "Certificado", "doc_foto": "Foto", "bi_numero": "BI", "media_certificado": "Média" };
            historicoHtml = '<div style="max-height:200px; overflow-y:auto; font-size:0.82rem; border:1px solid var(--cor-borda); border-radius:6px; padding:8px; background:#fff;">';
            resHist.historico.forEach(function (h) {
                historicoHtml += '<div style="padding:6px 0; border-bottom:1px dashed #f1f5f9;"><strong>' + esc(mapa[h.campo] || h.campo) + ':</strong> <span style="color:#dc2626; text-decoration:line-through;">' + esc(h.valor_anterior || "—") + '</span> → <span style="color:#065f46;">' + esc(h.valor_novo || "—") + '</span> <span style="color:#94a3b8;">(' + new Date(h.alterado_em).toLocaleString("pt-PT") + ')</span></div>';
            });
            historicoHtml += '</div>';
        }
    }

    // Auditoria
    let auditoriaHtml = "";
    if (insc.data_decisao || insc.decidido_por) {
        auditoriaHtml = '<div style="background:var(--cor-fundo); border:1px solid var(--cor-borda); border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:0.85rem;">';
        if (insc.data_decisao) auditoriaHtml += '<div><strong>Data da decisão:</strong> ' + new Date(insc.data_decisao).toLocaleString("pt-PT") + '</div>';
        if (insc.decidido_por) auditoriaHtml += '<div><strong>Decidido por:</strong> ' + esc(insc.decidido_por) + '</div>';
        auditoriaHtml += '</div>';
    }

    let html = '<div class="inscricao-detalhe-box">';
    html += '<h3 style="margin-bottom:12px; color:var(--cor-azul);">Detalhes da Inscrição</h3>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem; margin-bottom:16px;">';
    html += '<div><strong>BI:</strong> ' + esc(insc.bi_numero) + '</div><div><strong>Data Nasc:</strong> ' + fmtData(insc.data_nascimento) + '</div>';
    html += '<div><strong>Género:</strong> ' + (insc.genero === "M" ? "Masculino" : "Feminino") + '</div><div><strong>Telefone:</strong> ' + esc(insc.telefone) + '</div>';
    html += '<div><strong>Email:</strong> ' + esc(insc.email || "—") + '</div><div><strong>Encarregado:</strong> ' + esc(insc.nome_encarregado) + ' (' + esc(insc.telefone_encarregado) + ')</div>';
    html += '<div><strong>Classe pretendida:</strong> ' + esc(insc.classe_pretendida) + '</div>';
    if (insc.curso_pretendido) {
        html += '<div><strong>Curso pretendido:</strong> ' + esc(insc.curso_pretendido) + '</div>';
    }
    html += '<div style="grid-column: 1 / -1; background:var(--cor-fundo); padding:8px 12px; border-radius:6px; margin-top:8px;"><strong>Média do Certificado:</strong> <span style="font-size:1.1rem; color:var(--cor-azul);">' + media + ' / 20</span></div></div>';

    html += auditoriaHtml;

    if (insc.estado === "rejeitada" && insc.codigo_rejeicao != null) {
        html += '<div style="background:#fef3c7; border:1px solid #fcd34d; color:#92400e; padding:10px 12px; border-radius:6px; margin-bottom:12px; font-size:0.85rem;"><strong>Rejeitada</strong> (código ' + insc.codigo_rejeicao + '): ' + esc(insc.motivo_rejeicao || "—") + '</div>';
    }

    html += '<h4 style="margin-bottom:8px; color:var(--cor-azul);">Documentos</h4><div class="docs-grelha">';
    const docs = [
        { label: "BI Frente", url: urls.bi_frente }, { label: "BI Verso", url: urls.bi_verso },
        { label: "Certificado", url: urls.certificado }, { label: "Foto", url: urls.foto }
    ];
    docs.forEach(function (d) {
        if (d.url) { html += '<a href="' + d.url + '" target="_blank" class="doc-btn"><i class="fas fa-file-image"></i> ' + d.label + '</a>'; }
        else { html += '<span class="doc-btn" style="opacity:0.5; cursor:not-allowed;"><i class="fas fa-times"></i> ' + d.label + ' (Erro)</span>'; }
    });
    html += '</div>';

    html += '<h4 style="margin-top:20px; margin-bottom:8px; color:var(--cor-azul);">Histórico de Alterações do Candidato</h4>';
    html += historicoHtml;

    // ============================================================
    // SÓ MOSTRA OS BOTÕES DE AÇÃO SE NÃO FOR DIRETOR
    // ============================================================
    if (insc.estado === "pendente" && !(window.ROLE_UTILIZADOR === 'diretor' || window.ROLE_UTILIZADOR === 'sub_diretor')) {
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
    await chamarRPC("cesc_secretaria_terminar_analise", { p_token: token, p_inscricao_id: id });
    if (inscricaoEmAnalise === id) inscricaoEmAnalise = null;
    const selLinha = éMobile ? '[data-inscricao-mobile="' + idx + '"]' : '[data-inscricao-linha="' + idx + '"]';
    const painel = document.querySelector(selLinha);
    if (painel) painel.style.display = "none";
}

async function obterUrlsDocumentos(insc) {
    const urls = { bi_frente: null, bi_verso: null, certificado: null, foto: null };
    const map = { bi_frente: insc.doc_bi_frente_url, bi_verso: insc.doc_bi_verso_url, certificado: insc.doc_certificado_url, foto: insc.doc_foto_url };
    for (const chave in map) {
        const path = map[chave];
        if (!path) continue;
        try {
            const res = await fetch(API.SUPABASE_URL + "/functions/v1/gerar-url-assinada", {
                method: "POST",
                headers: { "apikey": API.SUPABASE_ANON_KEY, "Authorization": "Bearer " + API.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ caminho: path })
            });
            if (res.ok) { const data = await res.json(); if (data.ok && data.url) urls[chave] = data.url; }
        } catch (e) { console.error("Erro de rede:", chave, e); }
    }
    return urls;
}