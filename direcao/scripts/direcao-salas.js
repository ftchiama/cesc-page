let salasDirCache = [];

async function carregarSalasDir() {
    const token = obterToken();
    const container = document.getElementById("lista-dir-salas");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_secretaria_listar_salas", { p_token: token });
    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>'; return; }

    salasDirCache = dados.salas || [];
    
    const selPavilhao = document.getElementById("dir-filtro-sala-pavilhao");
    if (selPavilhao && selPavilhao.options.length <= 1) {
        const pavilhoes = [...new Set(salasDirCache.map(s => s.pavilhao))].sort();
        pavilhoes.forEach(p => { const opt = document.createElement("option"); opt.value = p; opt.textContent = p; selPavilhao.appendChild(opt); });
        document.getElementById("dir-filtro-sala-turno").addEventListener("change", renderizarSalasComFiltrosDir);
        selPavilhao.addEventListener("change", renderizarSalasComFiltrosDir);
    }

    renderizarSalasComFiltrosDir();
}

function renderizarSalasComFiltrosDir() {
    const turno = document.getElementById("dir-filtro-sala-turno").value;
    const pavilhao = document.getElementById("dir-filtro-sala-pavilhao").value;

    let filtradas = salasDirCache;
    if (turno) filtradas = filtradas.filter(s => s.turno === turno);
    if (pavilhao) filtradas = filtradas.filter(s => s.pavilhao === pavilhao);

    renderizarListaSalasDir(filtradas, turno);
}

function renderizarListaSalasDir(salas, turnoFiltro) {
    const container = document.getElementById("lista-dir-salas");
    if (salas.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhuma sala encontrada com estes filtros.</div>'; return; }

    const porTurno = {};
    salas.forEach(s => {
        if (!porTurno[s.turno]) porTurno[s.turno] = [];
        porTurno[s.turno].push(s);
    });

    let html = "";
    for (const turno in porTurno) {
        if (!turnoFiltro) {
            html += '<h3 style="margin-top:20px; margin-bottom:10px; color:var(--cor-azul); border-bottom:2px solid var(--cor-borda); padding-bottom:5px;">Turno ' + turno + '</h3>';
        }
        
        html += '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
        html += '<thead><tr><th>Pavilhão</th><th>Sala</th><th>Capacidade</th></tr></thead><tbody>';
        porTurno[turno].forEach(s => {
            html += '<tr><td>' + esc(s.pavilhao) + '</td><td>' + esc(s.nome_sala) + '</td><td>' + s.capacidade + ' alunos</td></tr>';
        });
        html += '</tbody></table></div>';
        
        html += '<div class="cartoes-sec">';
        porTurno[turno].forEach(s => {
            html += '<div class="cartao-sec"><div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(s.pavilhao) + ' - ' + esc(s.nome_sala) + '</strong><span>Capacidade: ' + s.capacidade + ' alunos</span></div></div></div>';
        });
        html += '</div>';
    }

    container.innerHTML = html;
}
