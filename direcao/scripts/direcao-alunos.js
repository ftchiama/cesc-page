let listaAlunosDir = [];

async function carregarAlunosDir() {
    const token = obterToken();
    const container = document.getElementById("lista-dir-alunos");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    if (listaAlunosDir.length > 0) {
        renderizarAlunosDir(listaAlunosDir);
        return;
    }

    const res = await chamarRPC("cesc_diretor_listar_alunos", { p_token: token });
    if (!res.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(res.erro) + '</div>'; return; }

    listaAlunosDir = res.alunos || [];
    renderizarAlunosDir(listaAlunosDir);

    const filtro = document.getElementById("filtro-dir-alunos");
    if (filtro && !filtro.dataset.ligado) {
        filtro.dataset.ligado = "1";
        filtro.addEventListener("input", function () {
            const termo = this.value.trim().toLowerCase();
            const filtrados = listaAlunosDir.filter(a => 
                (a.nome_completo || "").toLowerCase().includes(termo) ||
                (a.bi_numero || "").toLowerCase().includes(termo) ||
                (a.turma_actual || "").toLowerCase().includes(termo)
            );
            renderizarAlunosDir(filtrados);
        });
    }
}

function renderizarAlunosDir(alunos) {
    const container = document.getElementById("lista-dir-alunos");
    if (!container) return;
    if (alunos.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhum aluno encontrado.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Aluno</th><th>BI</th><th>Sala (Turno)</th><th>Estado</th><th>Acções</th></tr></thead><tbody>';
    alunos.forEach(a => {
        let salaVisual = "—";
        if (a.pavilhao && a.sala) salaVisual = a.pavilhao + ' · ' + a.sala + ' (' + a.turno + ')';

        html += '<tr>';
        html += '  <td><strong>' + esc(a.nome_completo) + '</strong></td>';
        html += '  <td>' + esc(a.bi_numero) + '</td>';
        html += '  <td>' + esc(salaVisual) + '</td>';
        html += '  <td><span class="badge badge-' + (a.estado === 'activo' ? 'activo' : 'desistente') + '">' + capitalizar(a.estado) + '</span></td>';
        html += '  <td><button class="btn-acao btn-acao-secundario" onclick="window.open(\'../paginas/perfil-aluno.html?id=' + a.id + '\', \'_blank\')"><i class="fas fa-eye"></i> Ver Ficha</button></td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    
    // Mobile
    html += '<div class="cartoes-sec">';
    alunos.forEach(a => {
        let salaVisual = "—";
        if (a.pavilhao && a.sala) salaVisual = a.pavilhao + ' · ' + a.sala + ' (' + a.turno + ')';

        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></div><span class="badge badge-' + (a.estado === 'activo' ? 'activo' : 'desistente') + '">' + capitalizar(a.estado) + '</span></div>';
        html += '  <div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Sala</span><span class="meta-valor">' + esc(salaVisual) + '</span></div></div>';
        html += '  <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-secundario" onclick="window.open(\'../paginas/perfil-aluno.html?id=' + a.id + '\', \'_blank\')"><i class="fas fa-eye"></i> Ver Ficha</button></div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
}

// ============================================================
// FICHA DO ALUNO (In-Page)
// ============================================================
async function verPerfilAlunoDir(alunoId, nome) {
    const token = obterToken();
    document.getElementById("lista-alunos-wrapper").style.display = "none";
    document.getElementById("ficha-aluno-wrapper").style.display = "block";
    document.getElementById("ficha-aluno-conteudo").innerHTML = '<div class="loader-container" style="min-height:200px;"><div class="loader"></div></div>';
    window.scrollTo({ top: 0, behavior: "smooth" });

    const dados = await chamarRPC("cesc_diretor_perfil_aluno", { p_token: token, p_aluno_id: alunoId });
    if (!dados.ok) { document.getElementById("ficha-aluno-conteudo").innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>'; return; }

    const a = dados.aluno;
    const m = dados.matricula || {}; // Se a RPC do diretor não devolver isso, adaptamos
    const i = dados.inscricao || {};
    const histMat = dados.historico || [];

    let html = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<button class="btn-acao btn-acao-secundario" onclick="fecharFichaAlunoDir()"><i class="fas fa-arrow-left"></i> Voltar à lista</button>';
    html += '<span class="badge badge-activo">Ficha do Aluno</span>';
    html += '</div>';

    html += '<div class="card-info" style="padding:20px;">';
    html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--cor-borda); padding-bottom:12px; margin-bottom:16px;">';
    html += '<div><h2 style="margin:0; color:var(--cor-azul); font-size:1.4rem;">' + esc(a.nome_completo) + '</h2><span style="color:var(--cor-texto-suave); font-size:0.9rem;">BI: ' + esc(a.bi_numero) + '</span></div>';
    html += '<div><span class="badge badge-' + (a.estado === 'activo' ? 'activo' : 'desistente') + '">' + capitalizar(a.estado) + '</span></div>';
    html += '</div>';

    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">';
    html += '<div><strong>Data Nasc:</strong> ' + fmtData(a.data_nascimento) + '</div>';
    html += '<div><strong>Género:</strong> ' + (a.genero === 'M' ? 'Masculino' : 'Feminino') + '</div>';
    html += '<div><strong>Telefone:</strong> ' + esc(a.telefone || "—") + '</div>';
    html += '<div><strong>Email:</strong> ' + esc(a.email_contacto || "—") + '</div>';
    html += '<div><strong>Encarregado:</strong> ' + esc(a.nome_encarregado || "—") + '</div>';
    html += '<div><strong>Tel. Encarregado:</strong> ' + esc(a.telefone_encarregado || "—") + '</div>';
    html += '</div>';

    // Histórico
    html += '<h4 style="color:var(--cor-azul); margin-bottom:8px; font-size:1rem;"><i class="fas fa-history"></i> Histórico Escolar</h4>';
    if (histMat.length > 0) {
        html += '<div style="font-size:0.85rem; border:1px solid var(--cor-borda); border-radius:8px; padding:12px; background:var(--cor-fundo);">';
        histMat.forEach(hm => {
            html += '<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #cbd5e1;">';
            html += '<div><strong>' + esc(hm.ano_lectivo) + '</strong> — ' + esc(hm.classe) + (hm.curso ? ' ('+esc(hm.curso)+')' : '') + '</div>';
            html += '<div>' + esc(hm.sala || '—') + ' · Nº ' + (hm.numero_aluno || '—') + ' <span class="badge badge-' + esc(hm.estado || 'activo') + '" style="margin-left:8px;">' + capitalizar(hm.estado || 'activo') + '</span></div>';
            html += '</div>';
        });
        html += '</div>';
    } else {
        html += '<p style="color:var(--cor-texto-suave); font-size:0.85rem;">Sem histórico.</p>';
    }

    html += '</div>'; // Fim do card-info
    document.getElementById("ficha-aluno-conteudo").innerHTML = html;
}
function fecharFichaAlunoDir() {
    document.getElementById("ficha-aluno-wrapper").style.display = "none";
    document.getElementById("lista-alunos-wrapper").style.display = "block";
}
