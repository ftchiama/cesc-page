async function carregarInscricoesDir() {
    const token = obterToken();
    const container = document.getElementById("lista-dir-inscricoes");
    if (!container) return;

    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const selAno = document.getElementById("filtro-dir-inscricoes-ano");
    const selClasse = document.getElementById("filtro-dir-inscricoes-classe");
    const selEstado = document.getElementById("filtro-inscricoes-estado");
    const selOrdem = document.getElementById("filtro-inscricoes-ordem");
    const inputPesquisa = document.getElementById("filtro-dir-inscricoes-pesquisa");

    // 1. Carregar anos e selecionar o ano atual
    if (selAno && !selAno.dataset.ligado) {
        const rAnos = await chamarRPC("cesc_secretaria_listar_anos_inscricoes", { p_token: token });
        if (rAnos.ok && rAnos.anos && rAnos.anos.length > 0) {
            selAno.innerHTML = "";
            rAnos.anos.forEach(a => { selAno.innerHTML += `<option value="${a}">${a}</option>`; });
            
            const cfg = await chamarRPC("cesc_diretor_listar_configuracoes", { p_token: token });
            if (cfg.ok) {
                const anoAtual = (cfg.configuracoes || []).find(c => c.chave === "ano_lectivo_actual");
                if (anoAtual && rAnos.anos.includes(anoAtual.valor)) selAno.value = anoAtual.valor;
                else selAno.value = rAnos.anos[0];
            }
        }
        selAno.dataset.ligado = "1";
        selAno.addEventListener("change", carregarInscricoesDir);
    }

    // 2. Carregar classes
    if (selClasse && !selClasse.dataset.ligado) {
        const rClasses = await chamarRPC("cesc_diretor_listar_classes", { p_token: token });
        if (rClasses.ok) {
            rClasses.classes.forEach(c => { selClasse.innerHTML += `<option value="${c.nome}">${c.nome}</option>`; });
        }
        selClasse.dataset.ligado = "1";
        selClasse.addEventListener("change", carregarInscricoesDir);
    }

    if (selEstado && !selEstado.dataset.ligado) { selEstado.dataset.ligado = "1"; selEstado.addEventListener("change", carregarInscricoesDir); }
    if (selOrdem && !selOrdem.dataset.ligado) { selOrdem.dataset.ligado = "1"; selOrdem.addEventListener("change", carregarInscricoesDir); }
    if (inputPesquisa && !inputPesquisa.dataset.ligado) { inputPesquisa.dataset.ligado = "1"; inputPesquisa.addEventListener("input", carregarInscricoesDir); }

    const ano = selAno ? selAno.value : "";
    const classeFiltro = selClasse ? selClasse.value : "";
    const estadoFiltro = selEstado ? selEstado.value : "";
    const ordemFiltro = selOrdem ? selOrdem.value : "data_desc";
    const termo = inputPesquisa ? inputPesquisa.value.trim().toLowerCase() : "";

    // 3. Cards
    if (ano) {
        const stats = await chamarRPC("cesc_secretaria_stats_inscricoes", { p_token: token, p_ano_lectivo: ano });
        if (stats.ok) {
            document.getElementById("stat-total-inscricoes").textContent = stats.total || 0;
            document.getElementById("stat-inscricoes-aprovadas").textContent = stats.aprovadas || 0;
            document.getElementById("stat-inscricoes-por-aprovar").textContent = stats.por_aprovar || 0;
            document.getElementById("stat-inscricoes-matricula-paga").textContent = stats.matricula_paga || 0;
            document.getElementById("stat-inscricoes-rejeitadas").textContent = (stats.rejeitadas_c0 || 0) + (stats.rejeitadas_c1 || 0);
            document.getElementById("stat-rejeitadas-detalhe").textContent = "Cód. 0: " + (stats.rejeitadas_c0 || 0) + " · Cód. 1: " + (stats.rejeitadas_c1 || 0);
        }
    }

    // 4. Lista
    const dados = await chamarRPC("cesc_diretor_listar_inscricoes", { p_token: token, p_ano_lectivo: ano || null });
    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>'; return; }

    let lista = dados.inscricoes || [];
    if (classeFiltro) lista = lista.filter(i => i.classe_pretendida === classeFiltro);
    if (estadoFiltro) lista = lista.filter(i => i.estado === estadoFiltro);
    if (termo) lista = lista.filter(i => 
        (i.nome_completo || "").toLowerCase().includes(termo) || 
        (i.bi_numero || "").toLowerCase().includes(termo) || 
        (i.referencia || "").toLowerCase().includes(termo)
    );

    if (ordemFiltro === "nome_asc") lista.sort((a, b) => (a.nome_completo || "").localeCompare(b.nome_completo || ""));
    else lista.sort((a, b) => (b.data_submissao || "").localeCompare(a.data_submissao || ""));

    if (lista.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem inscrições registadas com estes filtros.</div>'; return; }

    // Tabela
    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Referência</th><th>Candidato</th><th>Classe</th><th>Média</th><th>Data</th><th>Estado</th><th>Acções</th></tr></thead><tbody>';

    lista.forEach((i, idx) => {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";
        
        let estadoHtml = '<span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span>';
        if (i.estado === "rejeitada" && i.codigo_rejeicao != null) {
            estadoHtml += ' <span class="badge badge-' + (i.codigo_rejeicao === 1 ? "activo" : "desistente") + '" style="margin-left:4px;">Cód. ' + i.codigo_rejeicao + '</span>';
        }

        html += '<tr>';
        html += '  <td><strong>' + esc(i.referencia) + '</strong></td>';
        html += '  <td><div class="celula-nome"><strong>' + esc(i.nome_completo) + '</strong><span>BI: ' + esc(i.bi_numero) + '</span></div></td>';
        html += '  <td>' + esc(i.classe_pretendida) + '</td>';
        html += '  <td class="' + mediaClasse + '" style="font-weight:700; text-align:center;">' + media + '</td>';
        html += '  <td>' + fmtData(i.data_submissao) + '</td>';
        html += '  <td>' + estadoHtml + '</td>';
        html += '  <td><button class="btn-acao btn-acao-secundario" data-ver-inscricao-dir="' + idx + '"><i class="fas fa-eye"></i> Ver</button></td>';
        html += '</tr>';
        html += '<tr class="linha-editar" data-inscricao-dir-linha="' + idx + '" style="display:none;"><td colspan="7"><div data-inscricao-dir-conteudo="' + idx + '"></div></td></tr>';
    });
    html += '</tbody></table></div>';

    // Mobile
    html += '<div class="cartoes-sec">';
    lista.forEach((i, idx) => {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";
        
        let estadoHtml = '<span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span>';
        if (i.estado === "rejeitada" && i.codigo_rejeicao != null) {
            estadoHtml += ' <span class="badge badge-' + (i.codigo_rejeicao === 1 ? "activo" : "desistente") + '" style="margin-left:4px;">Cód. ' + i.codigo_rejeicao + '</span>';
        }

        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(i.nome_completo) + '</strong><span>Ref: ' + esc(i.referencia) + '</span></div><div>' + estadoHtml + '</div></div>';
        html += '  <div class="cartao-sec-meta">';
        html += '    <div class="meta-item"><span class="meta-rotulo">Classe</span><span class="meta-valor">' + esc(i.classe_pretendida) + '</span></div>';
        if (i.curso_pretendido) html += '<div class="meta-item"><span class="meta-rotulo">Curso</span><span class="meta-valor">' + esc(i.curso_pretendido) + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Média</span><span class="meta-valor ' + mediaClasse + '">' + media + '</span></div>';
        html += '  </div>';
        html += '  <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-primario" data-ver-inscricao-dir-mobile="' + idx + '"><i class="fas fa-eye"></i> Ver detalhes</button></div>';
        html += '  <div data-inscricao-dir-mobile="' + idx + '" style="display:none; margin-top:12px;"></div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll("[data-ver-inscricao-dir]").forEach(btn => {
        btn.addEventListener("click", function() { 
            const idx = parseInt(this.getAttribute("data-ver-inscricao-dir"), 10); 
            abrirDetalheInscricaoDir(lista[idx], idx, false); 
        });
    });
    container.querySelectorAll("[data-ver-inscricao-dir-mobile]").forEach(btn => {
        btn.addEventListener("click", function() { 
            const idx = parseInt(this.getAttribute("data-ver-inscricao-dir-mobile"), 10); 
            abrirDetalheInscricaoDir(lista[idx], idx, true); 
        });
    });
}

async function abrirDetalheInscricaoDir(insc, idx, éMobile) {
    const token = obterToken();
    const selLinha = éMobile ? '[data-inscricao-dir-mobile="' + idx + '"]' : '[data-inscricao-dir-linha="' + idx + '"]';
    const selConteudo = éMobile ? '[data-inscricao-dir-mobile="' + idx + '"]' : '[data-inscricao-dir-conteudo="' + idx + '"]';
    const painel = document.querySelector(selLinha);
    const conteudo = document.querySelector(selConteudo);

    if (painel.style.display === "block" || painel.style.display === "table-row") {
        painel.style.display = "none";
        return;
    }

    painel.style.display = éMobile ? "block" : "table-row";
    conteudo.innerHTML = '<div class="loader" style="width:24px; height:24px; margin:10px auto;"></div>';

    const media = insc.media_certificado != null ? Number(insc.media_certificado).toFixed(2) : "—";
    const urls = await obterUrlsDocumentosDir(insc);

    let html = '<div class="inscricao-detalhe-box">';
    html += '<h3 style="margin-bottom:12px; color:var(--cor-azul);">Detalhes da Inscrição</h3>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem; margin-bottom:16px;">';
    html += '<div><strong>BI:</strong> ' + esc(insc.bi_numero) + '</div>';
    html += '<div><strong>Data Nasc:</strong> ' + fmtData(insc.data_nascimento) + '</div>';
    html += '<div><strong>Género:</strong> ' + (insc.genero === "M" ? "Masculino" : "Feminino") + '</div>';
    html += '<div><strong>Telefone:</strong> ' + esc(insc.telefone) + '</div>';
    html += '<div><strong>Email:</strong> ' + esc(insc.email || "—") + '</div>';
    html += '<div><strong>Encarregado:</strong> ' + esc(insc.nome_encarregado) + ' (' + esc(insc.telefone_encarregado) + ')</div>';
    html += '<div><strong>Classe pretendida:</strong> ' + esc(insc.classe_pretendida) + '</div>';
    if (insc.curso_pretendido) html += '<div><strong>Curso pretendido:</strong> ' + esc(insc.curso_pretendido) + '</div>';
    html += '<div style="grid-column: 1 / -1; background:var(--cor-fundo); padding:8px 12px; border-radius:6px; margin-top:8px;"><strong>Média do Certificado:</strong> <span style="font-size:1.1rem; color:var(--cor-azul);">' + media + ' / 20</span></div></div>';

    if (insc.estado === "rejeitada" && insc.codigo_rejeicao != null) {
        html += '<div style="background:#fef3c7; border:1px solid #fcd34d; color:#92400e; padding:10px 12px; border-radius:6px; margin-bottom:12px; font-size:0.85rem;"><strong>Rejeitada</strong> (código ' + insc.codigo_rejeicao + '): ' + esc(insc.motivo_rejeicao || "—") + '</div>';
    }

    html += '<h4 style="margin-bottom:8px; color:var(--cor-azul);">Documentos</h4><div class="docs-grelha">';
    const docs = [
        { label: "BI Frente", url: urls.bi_frente }, 
        { label: "BI Verso", url: urls.bi_verso },
        { label: "Certificado", url: urls.certificado }, 
        { label: "Foto", url: urls.foto }
    ];
    docs.forEach(function (d) {
        if (d.url) { html += '<a href="' + d.url + '" target="_blank" class="doc-btn"><i class="fas fa-file-image"></i> ' + d.label + '</a>'; }
        else { html += '<span class="doc-btn" style="opacity:0.5; cursor:not-allowed;"><i class="fas fa-times"></i> ' + d.label + ' (Erro)</span>'; }
    });
    html += '</div>';
    html += '</div>';
    conteudo.innerHTML = html;
}

async function obterUrlsDocumentosDir(insc) {
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
                headers: { "apikey": API.SUPABASE_ANON_KEY, "Authorization": "Bearer " + API.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ caminho: path })
            });
            if (res.ok) { const data = await res.json(); if (data.ok && data.url) urls[chave] = data.url; }
        } catch (e) { console.error("Erro de rede:", chave, e); }
    }
    return urls;
}