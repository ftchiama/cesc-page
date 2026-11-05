/*
 CESC — Secretaria · Documentos
 */

async function carregarDocumentos() {
    const token = obterToken();
    if (!token) return;
    const container = document.getElementById("lista-documentos-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const filtroEstado = document.getElementById("filtro-docs-estado");
    const estado = filtroEstado ? filtroEstado.value : "";

    const dados = await chamarRPC("cesc_secretaria_listar_documentos", { p_token: token, p_estado: estado || null });
    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar.") + '</div>'; return; }

    renderizarListaDocumentos(dados.documentos || []);

    if (filtroEstado && !filtroEstado.dataset.ligado) {
        filtroEstado.dataset.ligado = "1";
        filtroEstado.addEventListener("change", function () { carregarDocumentos(); });
    }
}

function renderizarListaDocumentos(docs) {
    const container = document.getElementById("lista-documentos-container");
    if (docs.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem documentos.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Aluno</th><th>Tipo</th><th class="col-opcional">Data do pedido</th><th>Estado</th><th>Acções</th></tr></thead><tbody>';

    docs.forEach(function (d, idx) {
        const estadoBadge = '<span class="badge badge-' + esc(d.estado) + '">' + esc(capitalizar(d.estado)) + '</span>';
        let acoes = "";
        if (d.estado === "pendente") acoes = '<button class="btn-acao btn-acao-primario" data-marcar-doc="' + idx + '" data-novo-estado="pago"><i class="fas fa-check"></i> Marcar pago</button>';
        else if (d.estado === "pago") acoes = '<button class="btn-acao btn-acao-sucesso" data-marcar-doc="' + idx + '" data-novo-estado="emitido"><i class="fas fa-file-export"></i> Emitir</button>';
        else acoes = '<span style="color:var(--cor-texto-leve); font-size:0.8rem;">Concluído</span>';

        html += '<tr><td><div class="celula-nome"><strong>' + esc(d.aluno_nome) + '</strong><span>BI: ' + esc(d.aluno_bi) + '</span></div></td><td>' + esc(d.tipo_documento) + '</td><td class="col-opcional">' + fmtData(d.data_pedido) + '</td><td>' + estadoBadge + '</td><td><div class="acoes-linha">' + acoes + '</div></td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    docs.forEach(function (d, idx) {
        let acoes = "";
        if (d.estado === "pendente") acoes = '<button class="btn-acao btn-acao-primario" data-marcar-doc-mobile="' + idx + '" data-novo-estado="pago"><i class="fas fa-check"></i> Marcar pago</button>';
        else if (d.estado === "pago") acoes = '<button class="btn-acao btn-acao-sucesso" data-marcar-doc-mobile="' + idx + '" data-novo-estado="emitido"><i class="fas fa-file-export"></i> Emitir</button>';
        else acoes = '<span style="color:var(--cor-texto-leve); font-size:0.8rem;">Concluído</span>';

        html += '<div class="cartao-sec"><div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(d.aluno_nome) + '</strong><span>BI: ' + esc(d.aluno_bi) + '</span></div><span class="badge badge-' + esc(d.estado) + '">' + esc(capitalizar(d.estado)) + '</span></div>';
        html += '<div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Tipo</span><span class="meta-valor">' + esc(d.tipo_documento) + '</span></div><div class="meta-item"><span class="meta-rotulo">Pedido</span><span class="meta-valor">' + fmtData(d.data_pedido) + '</span></div></div>';
        html += '<div class="cartao-sec-acoes">' + acoes + '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll("[data-marcar-doc]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-marcar-doc"), 10); const novoEstado = this.getAttribute("data-novo-estado"); marcarDocumento(docs[idx], novoEstado, this); });
    });
    container.querySelectorAll("[data-marcar-doc-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-marcar-doc-mobile"), 10); const novoEstado = this.getAttribute("data-novo-estado"); marcarDocumento(docs[idx], novoEstado, this); });
    });
}

async function marcarDocumento(doc, novoEstado, btn) {
    const token = obterToken();
    if (!token) return;
    btn.disabled = true;
    const htmlOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const dados = await chamarRPC("cesc_secretaria_marcar_documento", { p_token: token, p_doc_id: doc.id, p_novo_estado: novoEstado });

    if (!dados.ok) { btn.disabled = false; btn.innerHTML = htmlOriginal; alert(dados.erro || "Erro ao marcar documento."); return; }
    carregarDocumentos();
}
