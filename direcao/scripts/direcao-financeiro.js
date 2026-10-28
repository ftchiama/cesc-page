async function carregarFinanceiroDir() {
    const token = obterToken();
    const container = document.getElementById("resumo-financeiro");
    container.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const selAno = document.getElementById("filtro-dir-financeiro-ano");
    const ano = selAno ? selAno.value : "";
    if (selAno && selAno.options.length <= 1) {
        ["2025/2026", "2026/2027"].forEach(a => { const opt = document.createElement("option"); opt.value = a; opt.textContent = a; selAno.appendChild(opt); });
        selAno.addEventListener("change", carregarFinanceiroDir);
    }

    const dados = await chamarRPC("cesc_diretor_receita", { p_token: token, p_ano_lectivo: ano || null });
    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>'; return; }

    // 1. Cartão Principal (Receita Total)
    let html = '<div class="stat-card" style="margin-bottom:20px; text-align:center;">';
    html += '<div class="stat-header" style="justify-content:center;"><i class="fas fa-money-bill-wave"></i> Receita Total (' + (ano || 'Geral') + ')</div>';
    html += '<div class="stat-valor" style="color:#059669; font-size:2.5rem;">' + Number(dados.total).toLocaleString("pt-PT") + ' Kz</div>';
    html += '</div>';

    // 2. Tabela (Desktop)
    html += '<div class="tabela-wrapper tabela-sec-wrapper">';
    html += '<table class="tabela-sec">';
    html += '<thead><tr><th>Tipo de Serviço</th><th>Total Recebido</th></tr></thead><tbody>';
    dados.por_tipo.forEach(t => {
        html += '<tr>';
        html += '  <td><strong>' + capitalizar(t.tipo) + '</strong></td>';
        html += '  <td>' + Number(t.total).toLocaleString("pt-PT") + ' Kz</td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';

    // 3. Cartões (Mobile) - O que faltava
    html += '<div class="cartoes-sec">';
    dados.por_tipo.forEach(t => {
        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo">';
        html += '    <div class="cartao-sec-info"><strong>' + capitalizar(t.tipo) + '</strong></div>';
        html += '  </div>';
        html += '  <div class="cartao-sec-meta">';
        html += '    <div class="meta-item"><span class="meta-rotulo">Total Recebido</span><span class="meta-valor" style="color:#059669; font-size:1.1rem;">' + Number(t.total).toLocaleString("pt-PT") + ' Kz</span></div>';
        html += '  </div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
}
