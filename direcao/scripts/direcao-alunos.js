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
        html += '  <td><button class="btn-acao btn-acao-secundario" onclick="verPerfilAlunoDir(\'' + a.id + '\', \'' + esc(a.nome_completo) + '\')"><i class="fas fa-eye"></i> Ver Ficha</button></td>';
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
        html += '  <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-secundario" onclick="verPerfilAlunoDir(\'' + a.id + '\', \'' + esc(a.nome_completo) + '\')"><i class="fas fa-eye"></i> Ver Ficha</button></div>';
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
    
    // Trocar a lista pela ficha
    document.getElementById("lista-alunos-wrapper").style.display = "none";
    document.getElementById("ficha-aluno-wrapper").style.display = "block";
    document.getElementById("ficha-aluno-conteudo").innerHTML = '<div class="loader-container" style="min-height:200px;"><div class="loader"></div></div>';
    window.scrollTo({ top: 0, behavior: "smooth" });

    const dados = await chamarRPC("cesc_diretor_perfil_aluno", { p_token: token, p_aluno_id: alunoId });
    
    if (!dados.ok) { 
        document.getElementById("ficha-aluno-conteudo").innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>'; 
        return; 
    }

    const a = dados.aluno;
    let html = '<div class="card-info" style="margin-bottom:20px;">';
    html += '<h3><i class="fas fa-user"></i> ' + esc(a.nome_completo) + '</h3>';
    html += '<div class="info-linha"><span class="rotulo">BI</span><span class="valor">' + esc(a.bi_numero) + '</span></div>';
    html += '<div class="info-linha"><span class="rotulo">Data de Nascimento</span><span class="valor">' + fmtData(a.data_nascimento) + '</span></div>';
    html += '<div class="info-linha"><span class="rotulo">Género</span><span class="valor">' + (a.genero === 'M' ? 'Masculino' : 'Feminino') + '</span></div>';
    html += '<div class="info-linha"><span class="rotulo">Telefone</span><span class="valor">' + esc(a.telefone || "—") + '</span></div>';
    html += '<div class="info-linha"><span class="rotulo">Email</span><span class="valor">' + esc(a.email_contacto || "—") + '</span></div>';
    html += '<div class="info-linha"><span class="rotulo">Estado</span><span class="valor"><span class="badge badge-' + (a.estado === 'activo' ? 'activo' : 'desistente') + '">' + capitalizar(a.estado) + '</span></span></div>';
    html += '</div>';

    // Encarregado
    html += '<div class="card-info" style="margin-bottom:20px;">';
    html += '<h3><i class="fas fa-users"></i> Encarregado</h3>';
    html += '<div class="info-linha"><span class="rotulo">Nome</span><span class="valor">' + esc(a.nome_encarregado || "—") + '</span></div>';
    html += '<div class="info-linha"><span class="rotulo">Telefone</span><span class="valor">' + esc(a.telefone_encarregado || "—") + '</span></div>';
    html += '</div>';

    // Documentos
    html += '<div class="card-info" style="margin-bottom:20px;">';
    html += '<h3><i class="fas fa-file-alt"></i> Documentos</h3>';
    html += '<div class="docs-grelha" style="grid-template-columns:1fr 1fr;">';
    const docs = [
        { label: "BI Frente", url: dados.documentos.doc_bi_frente_url },
        { label: "BI Verso", url: dados.documentos.doc_bi_verso_url },
        { label: "Certificado", url: dados.documentos.doc_certificado_url },
        { label: "Foto", url: dados.documentos.doc_foto_url }
    ];
    for (const d of docs) {
        if (d.url) {
            const link = await obterUrlAssinada(d.url);
            if (link) { html += '<a href="' + link + '" target="_blank" class="doc-btn"><i class="fas fa-file-image"></i> ' + d.label + '</a>'; }
            else { html += '<span class="doc-btn" style="opacity:0.5;"><i class="fas fa-times"></i> ' + d.label + ' (Erro)</span>'; }
        } else { html += '<span class="doc-btn" style="opacity:0.5;"><i class="fas fa-times"></i> ' + d.label + ' (Sem doc)</span>'; }
    }
    html += '</div></div>';

    // Pagamentos
    html += '<div class="card-info" style="margin-bottom:20px;">';
    html += '<h3><i class="fas fa-money-bill-wave"></i> Pagamentos</h3>';
    if (dados.pagamentos.length === 0) { html += '<p style="font-size:0.85rem; color:var(--cor-texto-suave);">Sem pagamentos.</p>'; }
    else {
        html += '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
        html += '<thead><tr><th>Tipo</th><th>Valor</th><th>Data</th><th>Estado</th></tr></thead><tbody>';
        dados.pagamentos.forEach(p => {
            html += '<tr><td>' + capitalizar(p.tipo) + '</td><td>' + Number(p.valor).toLocaleString("pt-PT") + ' Kz</td><td>' + fmtData(p.pago_em) + '</td><td><span class="badge badge-' + (p.estado === 'pago' ? 'activo' : 'pendente') + '">' + capitalizar(p.estado) + '</span></td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';

    // Histórico de Matrículas
    html += '<div class="card-info" style="margin-bottom:20px;">';
    html += '<h3><i class="fas fa-history"></i> Histórico de Matrículas</h3>';
    if (dados.historico.length === 0) { html += '<p style="font-size:0.85rem; color:var(--cor-texto-suave);">Sem histórico.</p>'; }
    else {
        html += '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
        html += '<thead><tr><th>Ano Letivo</th><th>Classe</th><th>Sala</th><th>Curso</th><th>Estado</th></tr></thead><tbody>';
        dados.historico.forEach(h => {
            html += '<tr><td>' + esc(h.ano_lectivo) + '</td><td>' + esc(h.classe) + '</td><td>' + esc(h.turma) + '</td><td>' + esc(h.curso || '—') + '</td><td>' + capitalizar(h.estado) + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';

    // Notas
    html += '<div class="card-info" style="margin-bottom:20px;">';
    html += '<h3><i class="fas fa-chart-line"></i> Notas</h3>';
    if (dados.notas.length === 0) { html += '<p style="font-size:0.85rem; color:var(--cor-texto-suave);">Sem notas lançadas.</p>'; }
    else {
        html += '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
        html += '<thead><tr><th>Disciplina</th><th>Trimestre</th><th>MAC</th><th>NPT</th><th>MT</th><th>MFD</th></tr></thead><tbody>';
        dados.notas.forEach(n => {
            html += '<tr><td>' + esc(n.disciplina) + '</td><td>' + n.trimestre + 'º</td><td>' + (n.mac || '—') + '</td><td>' + (n.npt || '—') + '</td><td>' + (n.mt || '—') + '</td><td><strong>' + (n.mfd || '—') + '</strong></td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';

    // Faltas
    html += '<div class="card-info" style="margin-bottom:20px;">';
    html += '<h3><i class="fas fa-user-clock"></i> Faltas</h3>';
    if (dados.faltas.length === 0) { html += '<p style="font-size:0.85rem; color:var(--cor-texto-suave);">Sem faltas registadas.</p>'; }
    else {
        html += '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
        html += '<thead><tr><th>Disciplina</th><th>Mês</th><th>Qtd</th><th>Justificada</th></tr></thead><tbody>';
        dados.faltas.forEach(f => {
            html += '<tr><td>' + esc(f.disciplina) + '</td><td>' + esc(f.mes || '—') + '</td><td>' + f.quantidade + '</td><td>' + (f.justificada ? 'Sim' : 'Não') + '</td></tr>';
        });
        html += '</tbody></table></div>';
    }
    html += '</div>';

    document.getElementById("ficha-aluno-conteudo").innerHTML = html;
}

function fecharFichaAlunoDir() {
    document.getElementById("ficha-aluno-wrapper").style.display = "none";
    document.getElementById("lista-alunos-wrapper").style.display = "block";
}
