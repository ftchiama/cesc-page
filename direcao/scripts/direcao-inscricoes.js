async function carregarInscricoesDir() {
    const token = obterToken();
    const container = document.getElementById("lista-dir-inscricoes");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const selAno = document.getElementById("filtro-dir-inscricoes-ano");
    const ano = selAno ? selAno.value : "";

    if (selAno && selAno.options.length <= 1) {
        ["2025/2026", "2026/2027"].forEach(a => { const opt = document.createElement("option"); opt.value = a; opt.textContent = a; selAno.appendChild(opt); });
        selAno.addEventListener("change", carregarInscricoesDir);
    }

    const dados = await chamarRPC("cesc_diretor_listar_inscricoes", { p_token: token, p_ano_lectivo: ano || null });
    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>'; return; }

    const lista = dados.inscricoes || [];
    if (lista.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem inscrições registadas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Referência</th><th>Candidato</th><th>Classe</th><th>Média</th><th>Data</th><th>Estado</th><th>AURA</th><th>Acções</th></tr></thead><tbody>';

    lista.forEach((i, idx) => {
        const media = i.media_certificado != null ? Number(i.media_certificado).toFixed(1) : "—";
        const mediaClasse = i.media_certificado != null ? (i.media_certificado >= 14 ? "cor-media-alta" : (i.media_certificado >= 10 ? "cor-media-media" : "cor-media-baixa")) : "";
        
        // Badge do estado real
        let estadoHtml = '<span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span>';
        if (i.estado === "rejeitada" && i.codigo_rejeicao != null) {
            estadoHtml += ' <span class="badge badge-' + (i.codigo_rejeicao === 1 ? "activo" : "desistente") + '" style="margin-left:4px;">Cód. ' + i.codigo_rejeicao + '</span>';
        }

        // Badge do veredito do AURA
        let auraHtml = "—";
        if (i.tipo === "aprovado") {
            auraHtml = '<span class="badge badge-activo" style="background:#d1fae5; color:#065f46;">Aprovado</span>';
        } else if (i.tipo === "reprovado") {
            auraHtml = '<span class="badge badge-desistente" style="background:#fee2e2; color:#991b1b;">Reprovado</span>';
        } else if (i.tipo === "novo") {
            auraHtml = '<span class="badge" style="background:#f1f5f9; color:#475569;">Novo</span>';
        }

        html += '<tr>';
        html += '  <td><strong>' + esc(i.referencia) + '</strong></td>';
        html += '  <td><div class="celula-nome"><strong>' + esc(i.nome_completo) + '</strong><span>BI: ' + esc(i.bi_numero) + '</span></div></td>';
        html += '  <td>' + esc(i.classe_pretendida) + '</td>';
        html += '  <td class="' + mediaClasse + '" style="font-weight:700; text-align:center;">' + media + '</td>';
        html += '  <td>' + fmtData(i.data_submissao) + '</td>';
        html += '  <td>' + estadoHtml + '</td>';
        html += '  <td>' + auraHtml + '</td>';
        html += '  <td><div class="acoes-linha"><button class="btn-acao btn-acao-secundario" onclick="verDetalheInscricaoDir(\'' + i.id + '\')"><i class="fas fa-eye"></i> Ver</button></div></td></tr>';
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