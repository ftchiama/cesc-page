async function carregarInscricoesDir() {
    const token = obterToken();
    const container = document.getElementById("lista-dir-inscricoes");
    if (!container) return; // Segurança extra

    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const selAno = document.getElementById("filtro-dir-inscricoes-ano");
    const selClasse = document.getElementById("filtro-dir-inscricoes-classe");
    const selEstado = document.getElementById("filtro-inscricoes-estado");
    const selOrdem = document.getElementById("filtro-inscricoes-ordem");

    // 1. Carregar anos e classes (só uma vez)
    if (selAno && !selAno.dataset.ligado) {
        const rAnos = await chamarRPC("cesc_secretaria_listar_anos_inscricoes", { p_token: token });
        if (rAnos.ok && rAnos.anos && rAnos.anos.length > 0) {
            selAno.innerHTML = "";
            rAnos.anos.forEach(a => { selAno.innerHTML += `<option value="${a}">${a}</option>`; });
            
            const cfg = await chamarRPC("cesc_diretor_listar_configuracoes", { p_token: token });
            if (cfg.ok) {
                const anoAtual = (cfg.configuracoes || []).find(c => c.chave === "ano_lectivo_actual");
                if (anoAtual && rAnos.anos.includes(anoAtual.valor)) selAno.value = anoAtual.valor;
            }
        }
        selAno.dataset.ligado = "1";
        selAno.addEventListener("change", carregarInscricoesDir);
    }

    if (selClasse && !selClasse.dataset.ligado) {
        const rClasses = await chamarRPC("cesc_diretor_listar_classes", { p_token: token });
        if (rClasses.ok) {
            rClasses.classes.forEach(c => { selClasse.innerHTML += `<option value="${c.nome}">${c.nome}</option>`; });
        }
        selClasse.dataset.ligado = "1";
        selClasse.addEventListener("change", carregarInscricoesDir);
    }

    if (selEstado && !selEstado.dataset.ligado) {
        selEstado.dataset.ligado = "1";
        selEstado.addEventListener("change", carregarInscricoesDir);
    }

    if (selOrdem && !selOrdem.dataset.ligado) {
        selOrdem.dataset.ligado = "1";
        selOrdem.addEventListener("change", carregarInscricoesDir);
    }

    const ano = selAno ? selAno.value : "";
    const classeFiltro = selClasse ? selClasse.value : "";
    const estadoFiltro = selEstado ? selEstado.value : "";
    const ordemFiltro = selOrdem ? selOrdem.value : "data_desc";

    // 2. Carregar os cards de resumo (stats)
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

    // 3. Carregar a lista
    const dados = await chamarRPC("cesc_diretor_listar_inscricoes", { p_token: token, p_ano_lectivo: ano || null });
    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>'; return; }

    let lista = dados.inscricoes || [];

    // Filtros
    if (classeFiltro) lista = lista.filter(i => i.classe_pretendida === classeFiltro);
    if (estadoFiltro) lista = lista.filter(i => i.estado === estadoFiltro);

    // Ordenação
    if (ordemFiltro === "nome_asc") lista.sort((a, b) => (a.nome_completo || "").localeCompare(b.nome_completo || ""));
    else lista.sort((a, b) => (b.data_submissao || "").localeCompare(a.data_submissao || ""));

    if (lista.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem inscrições registadas com estes filtros.</div>'; return; }

    // Tabela
    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Referência</th><th>Candidato</th><th>Classe</th><th>Média</th><th>Data</th><th>Estado</th><th>AURA</th><th>Acções</th></tr></thead><tbody>';

    lista.forEach((i) => {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";
        
        let estadoHtml = '<span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span>';
        if (i.estado === "rejeitada" && i.codigo_rejeicao != null) {
            estadoHtml += ' <span class="badge badge-' + (i.codigo_rejeicao === 1 ? "activo" : "desistente") + '" style="margin-left:4px;">Cód. ' + i.codigo_rejeicao + '</span>';
        }

        let auraHtml = "—";
        if (i.tipo === "aprovado") auraHtml = '<span class="badge" style="background:#d1fae5; color:#065f46;">Aprovado</span>';
        else if (i.tipo === "reprovado") auraHtml = '<span class="badge" style="background:#fee2e2; color:#991b1b;">Reprovado</span>';
        else if (i.tipo === "novo") auraHtml = '<span class="badge" style="background:#f1f5f9; color:#475569;">Novo</span>';

        html += '<tr>';
        html += '  <td><strong>' + esc(i.referencia) + '</strong></td>';
        html += '  <td><div class="celula-nome"><strong>' + esc(i.nome_completo) + '</strong><span>BI: ' + esc(i.bi_numero) + '</span></div></td>';
        html += '  <td>' + esc(i.classe_pretendida) + '</td>';
        html += '  <td class="' + mediaClasse + '" style="font-weight:700; text-align:center;">' + media + '</td>';
        html += '  <td>' + fmtData(i.data_submissao) + '</td>';
        html += '  <td>' + estadoHtml + '</td>';
        html += '  <td>' + auraHtml + '</td>';
        html += '  <td><button class="btn-acao btn-acao-secundario" onclick="verDetalheInscricaoDir(\'' + i.id + '\')"><i class="fas fa-eye"></i> Ver</button></td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    // Mobile
    html += '<div class="cartoes-sec">';
    lista.forEach((i) => {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";
        
        let estadoHtml = '<span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span>';
        if (i.estado === "rejeitada" && i.codigo_rejeicao != null) {
            estadoHtml += ' <span class="badge badge-' + (i.codigo_rejeicao === 1 ? "activo" : "desistente") + '" style="margin-left:4px;">Cód. ' + i.codigo_rejeicao + '</span>';
        }

        let auraHtml = "—";
        if (i.tipo === "aprovado") auraHtml = '<span class="badge" style="background:#d1fae5; color:#065f46;">Aprovado</span>';
        else if (i.tipo === "reprovado") auraHtml = '<span class="badge" style="background:#fee2e2; color:#991b1b;">Reprovado</span>';
        else if (i.tipo === "novo") auraHtml = '<span class="badge" style="background:#f1f5f9; color:#475569;">Novo</span>';

        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(i.nome_completo) + '</strong><span>Ref: ' + esc(i.referencia) + '</span></div><div>' + estadoHtml + '</div></div>';
        html += '  <div class="cartao-sec-meta">';
        html += '    <div class="meta-item"><span class="meta-rotulo">Classe</span><span class="meta-valor">' + esc(i.classe_pretendida) + '</span></div>';
        if (i.curso_pretendido) html += '<div class="meta-item"><span class="meta-rotulo">Curso</span><span class="meta-valor">' + esc(i.curso_pretendido) + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Média</span><span class="meta-valor ' + mediaClasse + '">' + media + '</span></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">AURA</span><span class="meta-valor">' + auraHtml + '</span></div>';
        html += '  </div>';
        html += '  <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-primario" onclick="verDetalheInscricaoDir(\'' + i.id + '\')"><i class="fas fa-eye"></i> Ver detalhes</button></div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
}

function verDetalheInscricaoDir(inscricaoId) {
    abrirModal("Detalhes da Inscrição", '<p>A ficha detalhada com documentos e histórico está disponível na secção "Alunos".</p>', async () => true, "Fechar");
}
