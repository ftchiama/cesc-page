let listaProfDir = [];

async function carregarProfDir() {
    const token = obterToken();
    const container = document.getElementById("lista-dir-professores");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    if (listaProfDir.length > 0) {
        renderizarProfDir(listaProfDir);
        return;
    }

    const res = await chamarRPC("cesc_diretor_listar_professores", { p_token: token });
    if (!res.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(res.erro) + '</div>'; return; }

    listaProfDir = res.professores || [];
    renderizarProfDir(listaProfDir);
}

function renderizarProfDir(professores) {
    const container = document.getElementById("lista-dir-professores");
    if (!container) return;
    if (professores.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhum professor registado.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Professor</th><th>Email</th><th>Salas</th></tr></thead><tbody>';
    professores.forEach(p => {
        html += '<tr><td><strong>' + esc(p.nome_completo) + '</strong></td><td>' + esc(p.email) + '</td><td>' + (p.turmas || 0) + '</td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    professores.forEach(p => {
        html += '<div class="cartao-sec"><div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(p.nome_completo) + '</strong><span>' + esc(p.email) + '</span></div></div>';
        html += '<div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Salas</span><span class="meta-valor">' + (p.turmas || 0) + '</span></div></div></div>';
    });
    html += '</div>';

    container.innerHTML = html;
}