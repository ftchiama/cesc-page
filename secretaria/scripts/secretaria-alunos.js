/*
 CESC — Secretaria · Alunos
 Data: 04/11/2026
 */

let alunosCacheLocal = [];
let anoAtualAlunos = "";

// Verifica se o utilizador é o Diretor (para esconder botões de ação)

async function carregarAlunos() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById("lista-alunos-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const selAno = document.getElementById("filtro-alunos-ano");
    
    // 1. Carregar os anos reais da base de dados (apenas na primeira vez)
    if (selAno && !selAno.dataset.ligado) {
        const resAnos = await chamarRPC("cesc_secretaria_listar_anos_alunos", { p_token: token });
        
        if (resAnos.ok && resAnos.anos && resAnos.anos.length > 0) {
            selAno.innerHTML = "";
            resAnos.anos.forEach(ano => {
                const opt = document.createElement("option");
                opt.value = ano;
                opt.textContent = ano;
                selAno.appendChild(opt);
            });
        } else {
            const anoAtual = new Date().getFullYear();
            selAno.innerHTML = `<option value="${anoAtual}/${anoAtual + 1}">${anoAtual}/${anoAtual + 1}</option>`;
        }

        selAno.dataset.ligado = "1";
        selAno.addEventListener("change", function() { carregarAlunos(); });
        
        document.getElementById("filtro-alunos").addEventListener("input", aplicarFiltrosAlunos);
        document.getElementById("filtro-alunos-estado").addEventListener("change", aplicarFiltrosAlunos);
    }
    
    const anoSelecionado = selAno ? selAno.value : null;

    // 2. Carregar Stats para o ano selecionado
    if (anoSelecionado) {
        const resStats = await chamarRPC("cesc_secretaria_stats_alunos", { p_token: token, p_ano_lectivo: anoSelecionado });
        if (resStats.ok) {
            document.getElementById("stat-alunos-total").textContent = resStats.total;
            document.getElementById("stat-alunos-com-conta").textContent = resStats.com_conta;
            document.getElementById("stat-alunos-sem-conta").textContent = resStats.sem_conta;
            document.getElementById("stat-alunos-cfb").textContent = resStats.cfb;
            document.getElementById("stat-alunos-cej").textContent = resStats.cej;
            document.getElementById("stat-alunos-ch").textContent = resStats.ch;
            
            renderizarCardsClasse(resStats.por_classe);
        }
    }

    // 3. Carregar Lista de Alunos
    const dados = await chamarRPC("cesc_secretaria_listar_alunos", { p_token: token });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar alunos.") + '</div>';
        return;
    }

    alunosCacheLocal = dados.alunos || [];
    aplicarFiltrosAlunos();
}

function renderizarCardsClasse(porClasse) {
    const container = document.getElementById("cards-por-classe");
    if (!porClasse || porClasse.length === 0) {
        container.innerHTML = '<div class="estado-vazio" style="padding: 20px; grid-column: 1/-1;">Sem dados de classes para este ano.</div>';
        return;
    }

    let html = "";
    porClasse.forEach(c => {
        html += `
            <div class="stat-card" style="padding: 16px; border-left: 3px solid var(--cor-azul);">
                <div class="stat-header" style="font-size: 0.7rem;">${esc(c.classe)}</div>
                <div class="stat-valor" style="font-size: 1.5rem;">${c.total}</div>
                <div class="stat-subtexto">${esc(c.curso)}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function aplicarFiltrosAlunos() {
    const termo = document.getElementById("filtro-alunos").value.trim().toLowerCase();
    const estado = document.getElementById("filtro-alunos-estado").value;

    const filtrados = alunosCacheLocal.filter(function (a) {
        const matchTexto = !termo || 
            (a.nome_completo || "").toLowerCase().indexOf(termo) !== -1
            || (a.bi_numero || "").toLowerCase().indexOf(termo) !== -1
            || (a.sala_actual || "").toLowerCase().indexOf(termo) !== -1;
            
        const matchEstado = !estado || a.estado_matricula === estado;
        
        return matchTexto && matchEstado;
    });

    renderizarListaAlunos(filtrados);
}

function renderizarListaAlunos(alunos) {
    const container = document.getElementById("lista-alunos-container");
    if (alunos.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhum aluno encontrado com estes filtros.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Aluno</th><th class="col-opcional">Sala</th><th class="col-opcional">Contacto</th><th>Conta</th><th>Estado</th><th>Acções</th></tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const conta = a.tem_conta ? '<span class="badge badge-activo">Criada</span>' : '<span class="badge badge-sem-conta">Sem conta</span>';
        const estado = a.estado_matricula || "—";
        const estadoLabel = estado === "activo" ? "Activo" : (estado === "concluido" ? "Concluído" : (estado === "retido" ? "Retido" : (estado === "transferido" ? "Transferido" : estado)));
        
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
        const estadoLabel = estado === "activo" ? "Activo" : (estado === "concluido" ? "Concluído" : (estado === "retido" ? "Retido" : (estado === "transferido" ? "Transferido" : estado)));
        
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

    if (painel.style.display === "block" || painel.style.display === "table-row") {
        painel.style.display = "none";
        return;
    }

    painel.style.display = éMobile ? "block" : "table-row";
    conteudo.innerHTML = '<div class="loader" style="width:24px; height:24px; margin:10px auto;"></div>';

    const dados = await chamarRPC("cesc_secretaria_perfil_aluno", { p_token: token, p_aluno_id: aluno.id });
    if (!dados.ok) { conteudo.innerHTML = '<p style="color:var(--cor-erro);">' + esc(dados.erro) + '</p>'; return; }

    const a = dados.aluno;
    const m = dados.matricula || {};
    const i = dados.inscricao || {};
    const hist = dados.historico || [];
    const histMat = dados.historico_matriculas || [];

    let html = '<div class="inscricao-detalhe-box" style="padding: 20px; background: #fff; border-radius: 8px;">';
    
    // HEADER
    html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom:2px solid var(--cor-borda); padding-bottom:12px;">';
    html += '<div><h3 style="margin:0; color:var(--cor-azul); font-size:1.3rem;">' + esc(a.nome_completo) + '</h3><div style="color:var(--cor-texto-suave); font-size:0.85rem;">BI: ' + esc(a.bi_numero) + ' | Nascimento: ' + fmtData(a.data_nascimento) + '</div></div>';
    html += '<div style="text-align:right;"><span class="badge badge-' + esc(m.estado || 'activo') + '">Aluno ' + esc(capitalizar(m.estado || 'activo')) + '</span><br><span style="font-size:0.8rem; color:var(--cor-texto-suave);">Conta: ' + (a.tem_conta ? 'Ativa' : 'Não criada') + '</span></div>';
    html += '</div>';

    // BLOCO 1: DADOS PESSOAIS E CONTACTO
    html += '<div class="card-info" style="margin-bottom:16px; background:var(--cor-fundo); border:none; padding:16px;">';
    html += '<h4 style="margin:0 0 12px 0; font-size:0.9rem; color:var(--cor-texto-suave); text-transform:uppercase;">Contactos & Encarregado</h4>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.85rem;">';
    html += '<div><strong>Telefone:</strong> ' + esc(a.telefone || "—") + '</div>';
    html += '<div><strong>Email:</strong> ' + esc(a.email_contacto || "—") + '</div>';
    html += '<div><strong>Encarregado:</strong> ' + esc(a.nome_encarregado || "—") + '</div>';
    html += '<div><strong>Tel. Encarregado:</strong> ' + esc(a.telefone_encarregado || "—") + '</div>';
    html += '</div></div>';

    // BLOCO 2: SITUAÇÃO ATUAL VS INSCRIÇÃO NOVA (Lado a Lado)
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">';
    
    // Lado Esquerdo: Matrícula Atual
    html += '<div class="card-info" style="margin:0; padding:16px;">';
    html += '<h4 style="margin:0 0 12px 0; font-size:0.9rem; color:var(--cor-azul);"><i class="fas fa-school"></i> Matrícula em Curso (' + esc(m.ano_lectivo || "—") + ')</h4>';
    if (m && m.id) {
        html += '<div style="font-size:0.85rem; line-height:1.6;">';
        html += '<div><strong>Classe:</strong> ' + esc(m.classe) + '</div>';
        html += '<div><strong>Curso:</strong> ' + esc(m.curso || "—") + '</div>';
        html += '<div><strong>Sala:</strong> ' + esc(m.sala || "—") + ' (' + esc(m.pavilhao || "—") + ')</div>';
        html += '<div><strong>Turno:</strong> ' + esc(m.turno || "—") + '</div>';
        html += '<div><strong>Nº Aluno:</strong> ' + (m.numero_aluno != null ? m.numero_aluno : "—") + '</div>';
        html += '</div>';
    } else { html += '<p style="font-size:0.85rem; color:var(--cor-texto-suave);">Sem matrícula ativa.</p>'; }
    html += '</div>';

    // Lado Direito: Última Inscrição
    html += '<div class="card-info" style="margin:0; padding:16px; border:1px solid var(--cor-azul-claro);">';
    html += '<h4 style="margin:0 0 12px 0; font-size:0.9rem; color:var(--cor-azul);"><i class="fas fa-file-signature"></i> Última Inscrição (' + esc(i.ano_lectivo || "—") + ')</h4>';
    if (i && i.id) {
        html += '<div style="font-size:0.85rem; line-height:1.6;">';
        html += '<div><strong>Classe pretendida:</strong> ' + esc(i.classe_pretendida) + '</div>';
        html += '<div><strong>Curso:</strong> ' + esc(i.curso_pretendido || "—") + '</div>';
        html += '<div><strong>Estado:</strong> <span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span></div>';
        html += '<div><strong>Data:</strong> ' + fmtData(i.data_submissao) + '</div>';
        html += '</div>';
    } else { html += '<p style="font-size:0.85rem; color:var(--cor-texto-suave);">Sem nova inscrição.</p>'; }
    html += '</div>';

    html += '</div>'; // Fim do grid lado a lado

    // BLOCO 3: HISTÓRICO DE MATRÍCULAS (se existir)
    if (histMat.length > 0) {
        html += '<div class="card-info" style="margin-bottom:16px; padding:16px;">';
        html += '<h4 style="margin:0 0 12px 0; font-size:0.9rem; color:var(--cor-azul);"><i class="fas fa-history"></i> Histórico Escolar</h4>';
        html += '<div style="font-size:0.82rem;">';
        histMat.forEach(hm => {
            html += '<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #e2e8f0;">';
            html += '<div><strong>' + esc(hm.ano_lectivo) + '</strong> — ' + esc(hm.classe) + (hm.curso ? ' ('+esc(hm.curso)+')' : '') + '</div>';
            html += '<div style="color:var(--cor-texto-suave);">' + esc(hm.sala || '—') + ' · Nº ' + (hm.numero_aluno || '—') + '</div>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    // BLOCO 4: DOCUMENTOS (Botões lado a lado)
    if (i && i.id) {
        html += '<div class="card-info" style="margin-bottom:16px; padding:16px;">';
        html += '<h4 style="margin:0 0 12px 0; font-size:0.9rem; color:var(--cor-azul);"><i class="fas fa-file-alt"></i> Documentos da Inscrição</h4>';
        html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">';
        const docs = [
            { label: "BI Frente", path: i.doc_bi_frente_url },
            { label: "BI Verso", path: i.doc_bi_verso_url },
            { label: "Certificado", path: i.doc_certificado_url },
            { label: "Foto", path: i.doc_foto_url }
        ];
        docs.forEach(d => {
            if (d.path) {
                html += '<button class="btn-acao btn-acao-secundario" style="justify-content:flex-start;" onclick="abrirDocumento(\'' + esc(d.path) + '\')"><i class="fas fa-file-image"></i> ' + d.label + '</button>';
            } else {
                html += '<button class="btn-acao btn-acao-secundario" style="justify-content:flex-start; opacity:0.5;" disabled><i class="fas fa-times"></i> ' + d.label + '</button>';
            }
        });
        html += '</div></div>';
    }

    // BLOCO 5: HISTÓRICO DE ALTERAÇÕES
    html += '<div class="card-info" style="padding:16px;">';
    html += '<h4 style="margin:0 0 12px 0; font-size:0.9rem; color:var(--cor-azul);"><i class="fas fa-edit"></i> Histórico de Alterações</h4>';
    if (hist.length === 0) {
        html += '<p style="color:var(--cor-texto-suave); font-size:0.85rem; margin:0;">Sem alterações registadas.</p>';
    } else {
        html += '<div style="max-height:150px; overflow-y:auto; font-size:0.82rem;">';
        hist.forEach(h => {
            html += '<div style="padding:4px 0; border-bottom:1px solid #f1f5f9;"><strong>' + esc(h.campo) + ':</strong> <span style="color:#dc2626; text-decoration:line-through;">' + esc(h.valor_anterior || "—") + '</span> → <span style="color:#065f46;">' + esc(h.valor_novo || "—") + '</span></div>';
        });
        html += '</div>';
    }
    html += '</div>';

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

// ============================================================
// CONVIDAR ALUNO (Só visível para a Secretária)
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    const btnConvidar = document.getElementById("btn-convidar-aluno");
    if (!btnConvidar) return;

    // Se for o Diretor, esconde o botão e não adiciona o evento
    if ((window.ROLE_UTILIZADOR === 'diretor' || window.ROLE_UTILIZADOR === 'sub_diretor')) {
        btnConvidar.style.display = "none";
        return;
    }

    btnConvidar.addEventListener("click", function () {
        const html = `
            <p>Gera um link único e envia-o para o e-mail do aluno.</p>
            <div class="campo-grupo">
                <label for="conv-bi">BI do Aluno *</label>
                <input type="text" id="conv-bi" placeholder="000123456LA041" maxlength="14" autocomplete="off">
            </div>
            <div class="campo-grupo">
                <label for="conv-nome">Nome Completo (Opcional)</label>
                <input type="text" id="conv-nome" placeholder="Ex: João Manuel" autocomplete="off">
            </div>
            <div class="campo-grupo">
                <label for="conv-email">E-mail do Aluno *</label>
                <input type="email" id="conv-email" placeholder="joao@email.com" autocomplete="off">
            </div>
        `;
        
        abrirModal("Convidar Aluno", html, async function () {
            const token = obterToken();
            const bi = document.getElementById("conv-bi").value.trim().toUpperCase();
            const nome = document.getElementById("conv-nome").value.trim() || null;
            const email = document.getElementById("conv-email").value.trim();
            
            if (!bi || !email) { alert("Preenche o BI e o E-mail."); return false; }

            const res = await chamarRPC("cesc_secretaria_criar_convite", { 
                p_token: token, p_bi_numero: bi, p_nome_completo: nome, p_email: email
            });

            if (!res.ok) {
                alert(res.erro);
                return false;
            }

            const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -2).join('/') + '/paginas/inscricao.html?convite=' + res.codigo;
            
            const confirmBtn = document.getElementById("modal-confirmar");
            confirmBtn.disabled = true;
            confirmBtn.textContent = "A enviar e-mail...";

            const envio = await chamarEdge("enviar-codigo", {
                is_convite: true,
                email: email, 
                nome_convidado: nome, 
                link_convite: baseUrl
            });

            if (envio.ok) {
                document.getElementById("modal-corpo").innerHTML = `
                    <div style="text-align:center; padding: 20px 0;">
                        <i class="fas fa-check-circle" style="font-size:3rem; color:#059669; margin-bottom:12px;"></i>
                        <h3>Convite Enviado!</h3>
                        <p>O link foi enviado para <strong>${email}</strong>.</p>
                        <p style="font-size:0.85rem; color:#64748b;">Válido por 72 horas.</p>
                    </div>
                `;
                confirmBtn.style.display = "none";
                document.getElementById("modal-cancelar").textContent = "Fechar";
                return false;
            } else {
                alert("Erro ao enviar o e-mail: " + envio.erro);
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Gerar Convite";
                return false;
            }
        }, "Gerar Convite");
    });
});
