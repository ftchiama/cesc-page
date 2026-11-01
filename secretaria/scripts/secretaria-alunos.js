/*
 CESC — Secretaria · Alunos
 Data: 30/10/2026

 - Lista de alunos com pesquisa.
 - Botão "Nova Inscrição" redireciona para a página de inscrição pública.
 - "Ver Detalhes" abre a ficha completa do aluno (dados pessoais, matrícula atual, histórico de matrículas, inscrição, documentos, histórico de alterações).
 */

async function carregarAlunos() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById("lista-alunos-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_secretaria_listar_alunos", { p_token: token });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar alunos.") + '</div>';
        return;
    }

    alunosCache = dados.alunos || [];
    renderizarListaAlunos(alunosCache);

    const filtro = document.getElementById("filtro-alunos");
    if (filtro && !filtro.dataset.ligado) {
        filtro.dataset.ligado = "1";
        filtro.addEventListener("input", function () {
            const termo = this.value.trim().toLowerCase();
            if (!termo) { renderizarListaAlunos(alunosCache); return; }
            const filtrados = alunosCache.filter(function (a) {
                return (a.nome_completo || "").toLowerCase().indexOf(termo) !== -1
                    || (a.bi_numero || "").toLowerCase().indexOf(termo) !== -1
                    || (a.sala_actual || "").toLowerCase().indexOf(termo) !== -1;
            });
            renderizarListaAlunos(filtrados);
        });
    }

    // Botão "Nova Inscrição"
    const btnNovo = document.getElementById("btn-novo-aluno");
    if (btnNovo && !btnNovo.dataset.ligado) {
        btnNovo.dataset.ligado = "1";
        btnNovo.addEventListener("click", function () {
            window.location.href = "../paginas/inscricao.html";
        });
    }
}

function renderizarListaAlunos(alunos) {
    const container = document.getElementById("lista-alunos-container");
    if (alunos.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhum aluno encontrado.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Aluno</th><th class="col-opcional">Sala</th><th class="col-opcional">Contacto</th><th>Conta</th><th>Estado</th><th>Acções</th></tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const conta = a.tem_conta ? '<span class="badge badge-activo">Criada</span>' : '<span class="badge badge-sem-conta">Sem conta</span>';
        const estado = a.estado_matricula || "—";
        const estadoLabel = estado === "activo" ? "Activo" : (estado === "concluido" ? "Concluído" : (estado === "retido" ? "Retido" : estado));
        html += '<tr>';
        html += '  <td><div class="celula-nome"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></div></td>';
        html += '  <td class="col-opcional">' + esc(a.sala_actual || "—") + '</td>';
        html += '  <td class="col-opcional">' + esc(a.telefone || a.email_contacto || "—") + '</td>';
        html += '  <td>' + conta + '</td>';
        html += '  <td><span class="badge badge-' + esc(estado) + '">' + esc(estadoLabel) + '</span></td>';
        html += '  <td><div class="acoes-linha">';
        html += '    <button class="btn-acao btn-acao-secundario" data-ver-aluno="' + idx + '"><i class="fas fa-eye"></i> Ver Detalhes</button>';
        html += '  </div></td></tr>';
        html += '<tr class="linha-editar" data-aluno-linha="' + idx + '" style="display:none;"><td colspan="6"><div data-aluno-conteudo="' + idx + '"></div></td></tr>';
    });
    html += '</tbody></table></div>';

    // Cartões mobile
    html += '<div class="cartoes-sec">';
    alunos.forEach(function (a, idx) {
        const conta = a.tem_conta ? '<span class="badge badge-activo">Criada</span>' : '<span class="badge badge-sem-conta">Sem conta</span>';
        const estado = a.estado_matricula || "—";
        const estadoLabel = estado === "activo" ? "Activo" : (estado === "concluido" ? "Concluído" : (estado === "retido" ? "Retido" : estado));
        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></div><span class="badge badge-' + esc(estado) + '">' + esc(estadoLabel) + '</span></div>';
        html += '  <div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Sala</span><span class="meta-valor">' + esc(a.sala_actual || "—") + '</span></div><div class="meta-item"><span class="meta-rotulo">Contacto</span><span class="meta-valor">' + esc(a.telefone || a.email_contacto || "—") + '</span></div><div class="meta-item"><span class="meta-rotulo">Conta</span><span class="meta-valor">' + conta + '</span></div></div>';
        html += '  <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-secundario" data-ver-aluno-mobile="' + idx + '"><i class="fas fa-eye"></i> Ver Detalhes</button></div>';
        html += '  <div data-aluno-mobile="' + idx + '" style="display:none; margin-top:12px;"></div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll("[data-ver-aluno]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-ver-aluno"), 10); abrirPerfilAluno(alunos[idx], idx, false); });
    });
    container.querySelectorAll("[data-ver-aluno-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-ver-aluno-mobile"), 10); abrirPerfilAluno(alunos[idx], idx, true); });
    });
}

async function abrirPerfilAluno(aluno, idx, éMobile) {
    const token = obterToken();
    const selLinha = éMobile ? '[data-aluno-mobile="' + idx + '"]' : '[data-aluno-linha="' + idx + '"]';
    const selConteudo = éMobile ? '[data-aluno-mobile="' + idx + '"]' : '[data-aluno-conteudo="' + idx + '"]';
    const painel = document.querySelector(selLinha);
    const conteudo = document.querySelector(selConteudo);

    // Se já estiver aberto, fechar
    if (painel.style.display === "block" || painel.style.display === "table-row") {
        painel.style.display = "none";
        return;
    }

    painel.style.display = éMobile ? "block" : "table-row";
    conteudo.innerHTML = '<div class="loader" style="width:24px; height:24px; margin:10px auto;"></div>';

    const dados = await chamarRPC("cesc_secretaria_perfil_aluno", {
        p_token: token,
        p_aluno_id: aluno.id
    });

    if (!dados.ok) {
        conteudo.innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>';
        return;
    }

    const a = dados.aluno;
    const m = dados.matricula || {};
    const i = dados.inscricao || {};
    const hist = dados.historico || [];
    const histMat = dados.historico_matriculas || [];

    let html = '<div class="inscricao-detalhe-box">';
    html += '<h3 style="margin-bottom:12px; color:var(--cor-azul);">' + esc(a.nome_completo) + '</h3>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem; margin-bottom:16px;">';
    html += '<div><strong>BI:</strong> ' + esc(a.bi_numero) + '</div>';
    html += '<div><strong>Data Nasc:</strong> ' + fmtData(a.data_nascimento) + '</div>';
    html += '<div><strong>Género:</strong> ' + (a.genero === "M" ? "Masculino" : "Feminino") + '</div>';
    html += '<div><strong>Telefone:</strong> ' + esc(a.telefone || "—") + '</div>';
    html += '<div><strong>Email:</strong> ' + esc(a.email_contacto || "—") + '</div>';
    html += '<div><strong>Encarregado:</strong> ' + esc(a.nome_encarregado || "—") + ' (' + esc(a.telefone_encarregado || "—") + ')</div>';
    const estadoMatricula = m.estado || "—";
    html += '<div><strong>Estado:</strong> <span class="badge badge-' + esc(estadoMatricula) + '">' + esc(capitalizar(estadoMatricula)) + '</span></div>';
    html += '<div><strong>Conta:</strong> ' + (a.tem_conta ? 'Criada' : 'Sem conta') + '</div>';
    html += '</div>';

    // Situação Escolar (matrícula mais recente)
    if (m && m.id) {
        html += '<h4 style="margin-top:16px; margin-bottom:8px; color:var(--cor-azul);">Situação Escolar (Atual)</h4>';
        html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem; margin-bottom:16px; background:var(--cor-fundo); padding:12px; border-radius:8px;">';
        html += '<div><strong>Ano letivo:</strong> ' + esc(m.ano_lectivo || "—") + '</div>';
        html += '<div><strong>Classe:</strong> ' + esc(m.classe || "—") + '</div>';
        html += '<div><strong>Curso:</strong> ' + esc(m.curso || "—") + '</div>';
        html += '<div><strong>Nº Aluno:</strong> ' + (m.numero_aluno != null ? m.numero_aluno : "—") + '</div>';
        html += '<div><strong>Sala:</strong> ' + esc(m.sala || "—") + '</div>';
        html += '<div><strong>Pavilhão:</strong> ' + esc(m.pavilhao || "—") + '</div>';
        html += '<div><strong>Turno:</strong> ' + esc(m.turno || "—") + '</div>';
        html += '<div><strong>Capacidade da sala:</strong> ' + (m.capacidade_sala != null ? m.capacidade_sala + ' alunos' : "—") + '</div>';
        html += '</div>';
    }

    // Histórico de Matrículas
    if (histMat.length > 0) {
        html += '<h4 style="margin-top:16px; margin-bottom:8px; color:var(--cor-azul);">Histórico de Matrículas</h4>';
        html += '<div style="font-size:0.85rem; border:1px solid var(--cor-borda); border-radius:6px; padding:8px; background:#fff;">';
        histMat.forEach(function (hm) {
            html += '<div style="padding:8px 0; border-bottom:1px dashed #f1f5f9;">';
            html += '<strong>' + esc(hm.ano_lectivo) + '</strong> — ' + esc(hm.classe);
            if (hm.curso) html += ' (' + esc(hm.curso) + ')';
            if (hm.numero_aluno != null) html += ' · Nº ' + hm.numero_aluno;
            html += '<br>';
            html += '<span style="color:var(--cor-texto-suave);">' + esc(hm.sala || "—") + ' · ' + esc(hm.pavilhao || "—") + ' · ' + esc(hm.turno || "—") + '</span>';
            html += ' <span class="badge badge-' + esc(hm.estado) + '">' + esc(capitalizar(hm.estado)) + '</span>';
            html += '</div>';
        });
        html += '</div>';
    }

    // Última Inscrição
    if (i && i.id) {
        html += '<h4 style="margin-top:16px; margin-bottom:8px; color:var(--cor-azul);">Última Inscrição</h4>';
        html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem; margin-bottom:16px;">';
        html += '<div><strong>Referência:</strong> ' + esc(i.referencia || "—") + '</div>';
        html += '<div><strong>Ano letivo:</strong> ' + esc(i.ano_lectivo || "—") + '</div>';
        html += '<div><strong>Classe:</strong> ' + esc(i.classe_pretendida || "—") + '</div>';
        html += '<div><strong>Curso:</strong> ' + esc(i.curso_pretendido || "—") + '</div>';
        html += '<div><strong>Média do Certificado:</strong> ' + (i.media_certificado != null ? Number(i.media_certificado).toFixed(1) + ' / 20' : '— / 20') + '</div>';
        html += '<div><strong>Estado:</strong> ' + esc(capitalizar(i.estado || "—")) + '</div>';
        html += '<div><strong>Data de Submissão:</strong> ' + fmtData(i.data_submissao) + '</div>';
        html += '</div>';

        html += '<h4 style="margin-top:16px; margin-bottom:8px; color:var(--cor-azul);">Documentos</h4>';
        html += '<div class="docs-grelha" style="grid-template-columns:1fr 1fr;">';
        const docs = [
            { label: "BI Frente", path: i.doc_bi_frente_url },
            { label: "BI Verso", path: i.doc_bi_verso_url },
            { label: "Certificado", path: i.doc_certificado_url },
            { label: "Foto", path: i.doc_foto_url }
        ];
        for (const d of docs) {
            if (d.path) {
                html += '<button class="doc-btn" onclick="abrirDocumento(\'' + esc(d.path) + '\')"><i class="fas fa-file-image"></i> ' + d.label + '</button>';
            } else {
                html += '<span class="doc-btn" style="opacity:0.5;"><i class="fas fa-times"></i> ' + d.label + ' (Sem doc)</span>';
            }
        }
        html += '</div>';
    }

    // Histórico de Alterações
    html += '<h4 style="margin-top:16px; margin-bottom:8px; color:var(--cor-azul);">Histórico de Alterações</h4>';
    if (hist.length === 0) {
        html += '<p style="color:var(--cor-texto-suave); font-size:0.85rem;">Sem alterações registadas.</p>';
    } else {
        const mapa = { "nome_completo": "Nome", "data_nascimento": "Data Nasc.", "genero": "Género", "telefone": "Telefone", "nome_encarregado": "Encarregado", "telefone_encarregado": "Tel. Encarregado", "doc_bi_frente": "BI Frente", "doc_bi_verso": "BI Verso", "doc_certificado": "Certificado", "doc_foto": "Foto", "bi_numero": "BI", "media_certificado": "Média" };
        html += '<div style="max-height:200px; overflow-y:auto; font-size:0.82rem; border:1px solid var(--cor-borda); border-radius:6px; padding:8px; background:#fff;">';
        hist.forEach(function (h) {
            html += '<div style="padding:6px 0; border-bottom:1px dashed #f1f5f9;"><strong>' + esc(mapa[h.campo] || h.campo) + ':</strong> <span style="color:#dc2626; text-decoration:line-through;">' + esc(h.valor_anterior || "—") + '</span> → <span style="color:#065f46;">' + esc(h.valor_novo || "—") + '</span> <span style="color:#94a3b8;">(' + new Date(h.alterado_em).toLocaleString("pt-PT") + ')</span></div>';
        });
        html += '</div>';
    }

    html += '</div>';
    conteudo.innerHTML = html;
}

async function abrirDocumento(caminho) {
    try {
        const res = await fetch(API.SUPABASE_URL + "/functions/v1/gerar-url-assinada", {
            method: "POST",
            headers: {
                "apikey": API.SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ caminho: caminho })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.ok && data.url) {
                window.open(data.url, "_blank");
                return;
            }
        }
        alert("Não foi possível abrir o documento.");
    } catch (e) {
        console.error(e);
        alert("Erro ao abrir o documento.");
    }
}
