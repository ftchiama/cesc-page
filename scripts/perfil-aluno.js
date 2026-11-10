let dadosGlobais = null;

document.addEventListener("DOMContentLoaded", async function () {
    const token = obterToken();
    if (!token) { window.location.href = "login.html"; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const alunoId = urlParams.get("id");
    const roleOrigem = urlParams.get("role");

    const btnVoltar = document.getElementById("btn-voltar");
    if (roleOrigem === "diretor") btnVoltar.href = "../direcao/direcao.html";
    else if (roleOrigem === "secretaria") btnVoltar.href = "../secretaria/secretaria.html";
    else btnVoltar.href = "javascript:history.back()";

    if (!alunoId) {
        document.getElementById("loader").innerHTML = "<p>ID do aluno não fornecido.</p>";
        return;
    }

    // Configurar Toggles dos Cartões
    document.querySelectorAll(".btn-toggle-card").forEach(btn => {
        btn.addEventListener("click", function() {
            const container = this.closest(".perfil-card").querySelector(".toggle-conteudo");
            if (container.style.display === "none") {
                container.style.display = "block";
                this.textContent = "Ocultar";
            } else {
                container.style.display = "none";
                this.textContent = "Ver";
            }
        });
    });

    const res = await chamarRPC("cesc_obter_perfil_aluno_completo", { p_token: token, p_aluno_id: alunoId });
    if (!res.ok) {
        document.getElementById("loader").innerHTML = "<p style='color:red;'>" + esc(res.erro) + "</p>";
        return;
    }

    dadosGlobais = res;
    renderizarPerfil();

    // Filtro de Trimestre
    document.getElementById("filtro-trimestre").addEventListener("change", renderizarNotas);

    document.getElementById("loader").style.display = "none";
    document.getElementById("perfil-conteudo").style.display = "block";
});

async function renderizarPerfil() {
    const dados = dadosGlobais;
    const a = dados.aluno;
    
    // Header e Sobre
    document.getElementById("perf-avatar").textContent = (a.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("perf-nome").textContent = a.nome_completo;
    document.getElementById("perf-bi").textContent = "BI: " + a.bi_numero;
    document.getElementById("perf-estado").textContent = capitalizar(a.estado);

    let htmlSobre = "";
    htmlSobre += linha("Data de Nascimento", fmtData(a.data_nascimento));
    htmlSobre += linha("Género", a.genero === 'M' ? 'Masculino' : 'Feminino');
    htmlSobre += linha("Telefone", a.telefone || "—");
    htmlSobre += linha("Email", a.email_contacto || "—");
    htmlSobre += linha("Encarregado", a.nome_encarregado || "—");
    htmlSobre += linha("Tel. Encarregado", a.telefone_encarregado || "—");
    htmlSobre += linha("Conta de Aluno", a.tem_conta ? "Criada" : "Não criada");
    document.getElementById("perf-sobre").innerHTML = htmlSobre;

    // Situação Atual (Sempre o ano mais recente)
    const m = dados.historico_matriculas && dados.historico_matriculas.length > 0 ? dados.historico_matriculas[0] : null;
    const iAtual = dados.historico_inscricoes && dados.historico_inscricoes.length > 0 ? dados.historico_inscricoes[0] : null;
    
    let htmlTurma = "";
    if (m) {
        htmlTurma += linha("Ano Letivo", m.ano_lectivo);
        htmlTurma += linha("Classe", m.classe);
        htmlTurma += linha("Curso", m.curso || "—");
        htmlTurma += linha("Sala", m.sala || "—");
        htmlTurma += linha("Pavilhão", m.pavilhao || "—");
        htmlTurma += linha("Turno", m.turno || "—");
        htmlTurma += linha("Nº Aluno", m.numero_aluno || "—");
    } else {
        htmlTurma = "<p style='font-size:0.9rem; color:#64748b;'>Sem matrícula ativa.</p>";
    }
    
    if (iAtual && iAtual.estado !== 'matriculado') {
        htmlTurma += `<h4 style="margin-top:16px; font-size:0.85rem; color:var(--cor-dourado);">Próxima Inscrição</h4>`;
        htmlTurma += linha("Classe", iAtual.classe_pretendida);
        htmlTurma += linha("Estado", capitalizar(iAtual.estado));
    }
    document.getElementById("perf-turma").innerHTML = htmlTurma;

    // Linha do Tempo (Atemporal)
    const histMat = dados.historico_matriculas || [];
    const histIns = dados.historico_inscricoes || [];
    const todosAnos = [...new Set([...histMat.map(m => m.ano_lectivo), ...histIns.map(i => i.ano_lectivo)])].sort().reverse();
    
    let htmlHist = '<div style="display:flex; flex-direction:column; gap:16px; position:relative; padding-left: 20px; border-left: 2px solid var(--cor-borda);">';
    
    if (todosAnos.length === 0) {
        htmlHist = "<p style='font-size:0.9rem; color:#64748b;'>Sem histórico.</p>";
    } else {
        todosAnos.forEach(ano => {
            const mat = histMat.find(m => m.ano_lectivo === ano);
            const ins = histIns.find(i => i.ano_lectivo === ano);
            
            htmlHist += `<div style="position:relative; margin-bottom: 12px;">`;
            htmlHist += `<div style="position:absolute; left:-26px; top:4px; width:10px; height:10px; background:var(--cor-azul); border-radius:50%;"></div>`;
            htmlHist += `<strong style="color:var(--cor-azul); font-size:1rem;">${esc(ano)}</strong>`;
            
            if (mat) {
                htmlHist += `<div style="font-size:0.85rem; margin-top:4px; line-height:1.5;">
                    <div><strong>${esc(mat.classe)}</strong> ${mat.curso ? '('+esc(mat.curso)+')' : ''}</div>
                    <div style="color:#64748b;">${esc(mat.sala || '—')} · Nº ${mat.numero_aluno || '—'} · ${esc(mat.turno || '—')}</div>`;
                
                if (ins) {
                    const veredito = ins.tipo === 'aprovado' ? '<span style="color:#059669; font-weight:bold;">Aprovado</span>' : 
                                     ins.tipo === 'reprovado' ? '<span style="color:#dc2626; font-weight:bold;">Reprovado</span>' : 
                                     '<span style="color:#64748b;">Em avaliação</span>';
                    htmlHist += `<div style="font-size:0.8rem; margin-top:4px; background:var(--cor-fundo); padding:4px 8px; border-radius:4px;">Veredito AURA: ${veredito}</div>`;
                }
                htmlHist += `</div>`;
            }
            htmlHist += `</div>`;
        });
    }
    htmlHist += `</div>`;
    document.getElementById("perf-historico").innerHTML = htmlHist;

    // Documentos (Usa a inscrição mais recente)
    const containerDocs = document.getElementById("perf-documentos");
    if (iAtual && iAtual.id) {
        const docs = [
            { label: "BI Frente", path: iAtual.doc_bi_frente_url },
            { label: "BI Verso", path: iAtual.doc_bi_verso_url },
            { label: "Certificado", path: iAtual.doc_certificado_url },
            { label: "Foto", path: iAtual.doc_foto_url }
        ];
        let htmlDocs = "";
        for (const d of docs) {
            if (d.path) {
                const link = await obterUrlAssinada(d.path);
                if (link) htmlDocs += `<a href="${link}" target="_blank" class="btn-acao btn-acao-secundario" style="justify-content:center;"><i class="fas fa-file-image"></i> ${d.label}</a>`;
                else htmlDocs += `<span class="btn-acao btn-acao-secundario" style="justify-content:center; opacity:0.5;"><i class="fas fa-times"></i> ${d.label}</span>`;
            } else {
                htmlDocs += `<span class="btn-acao btn-acao-secundario" style="justify-content:center; opacity:0.5;"><i class="fas fa-times"></i> ${d.label}</span>`;
            }
        }
        containerDocs.innerHTML = htmlDocs;
    } else {
        containerDocs.innerHTML = "<p style='font-size:0.9rem; color:#64748b; grid-column: 1/-1;'>Sem documentos.</p>";
    }

    // Faltas (Filtrado pelo ano mais recente para não misturar)
    const faltasAno = (dados.faltas || []).filter(f => f.ano_lectivo === (m ? m.ano_lectivo : null));
    if (faltasAno.length > 0) {
        let htmlFaltas = '<table class="tabela-perfil"><thead><tr><th>Disciplina</th><th>Mês</th><th>Qtd</th><th>Justificada</th></tr></thead><tbody>';
        faltasAno.forEach(f => {
            htmlFaltas += `<tr><td>${esc(f.disciplina)}</td><td>${esc(f.mes || '—')}</td><td>${f.quantidade}</td><td>${f.justificada ? 'Sim' : 'Não'}</td></tr>`;
        });
        htmlFaltas += '</tbody></table>';
        document.getElementById("perf-faltas").innerHTML = htmlFaltas;
    } else {
        document.getElementById("perf-faltas").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem faltas registadas.</p>";
    }

    // Pagamentos (Filtrado pelo ano mais recente)
    const pagAno = (dados.pagamentos || []).filter(p => p.ano_lectivo === (m ? m.ano_lectivo : null));
    if (pagAno.length > 0) {
        let htmlPag = '<table class="tabela-perfil"><thead><tr><th>Tipo</th><th>Valor</th><th>Data</th><th>Estado</th></tr></thead><tbody>';
        pagAno.forEach(p => {
            htmlPag += `<tr><td>${capitalizar(p.tipo)}</td><td>${Number(p.valor).toLocaleString("pt-PT")} Kz</td><td>${fmtData(p.data)}</td><td>${capitalizar(p.estado)}</td></tr>`;
        });
        htmlPag += '</tbody></table>';
        document.getElementById("perf-pagamentos").innerHTML = htmlPag;
    } else {
        document.getElementById("perf-pagamentos").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem pagamentos.</p>";
    }

    // Histórico de Alterações
    const histAlt = dados.historico_alteracoes || [];
    if (histAlt.length > 0) {
        let htmlAlt = '<div style="max-height:200px; overflow-y:auto; font-size:0.82rem;">';
        histAlt.forEach(h => {
            htmlAlt += `<div style="padding:6px 0; border-bottom:1px dashed #f1f5f9;"><strong>${esc(h.campo)}:</strong> <span style="color:#dc2626; text-decoration:line-through;">${esc(h.valor_anterior || "—")}</span> → <span style="color:#065f46;">${esc(h.valor_novo || "—")}</span> <span style="color:#94a3b8;">(${new Date(h.alterado_em).toLocaleString("pt-PT")})</span></div>`;
        });
        htmlAlt += '</div>';
        document.getElementById("perf-historico-alt").innerHTML = htmlAlt;
    } else {
        document.getElementById("perf-historico-alt").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem alterações.</p>";
    }

    // Renderizar Notas pela primeira vez
    renderizarNotas();
}

function renderizarNotas() {
    const dados = dadosGlobais;
    const filtro = document.getElementById("filtro-trimestre").value;
    
    // Buscar a matrícula mais recente para filtrar as notas
    const m = dados.historico_matriculas && dados.historico_matriculas.length > 0 ? dados.historico_matriculas[0] : null;
    const anoAtual = m ? m.ano_lectivo : null;

    let notasAno = (dados.notas || []).filter(n => n.ano_lectivo === anoAtual);
    
    if (filtro) {
        notasAno = notasAno.filter(n => n.trimestre === parseInt(filtro, 10));
    }

    if (notasAno.length > 0) {
        const agrupado = {};
        notasAno.forEach(n => {
            const key = n.disciplina;
            if (!agrupado[key]) agrupado[key] = [];
            agrupado[key].push(n);
        });

        let htmlNotas = '<table class="tabela-perfil"><thead><tr><th>Disciplina</th><th>Trim.</th><th>MAC</th><th>NPT</th><th>MT</th><th>MFD</th></tr></thead><tbody>';
        for (const disc in agrupado) {
            agrupado[disc].forEach((n, idx) => {
                htmlNotas += `<tr>`;
                if (idx === 0) htmlNotas += `<td rowspan="${agrupado[disc].length}"><strong>${esc(disc)}</strong></td>`;
                htmlNotas += `<td>${n.trimestre}º</td><td>${n.mac || '—'}</td><td>${n.npt || '—'}</td><td>${n.mt || '—'}</td><td><strong>${n.mfd || '—'}</strong></td></tr>`;
            });
        }
        htmlNotas += '</tbody></table>';
        document.getElementById("perf-notas").innerHTML = htmlNotas;
    } else {
        document.getElementById("perf-notas").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem notas para este período.</p>";
    }
}

function linha(rotulo, valor) {
    return `<div class="info-linha"><span class="rotulo">${rotulo}</span><span class="valor">${esc(valor || "—")}</span></div>`;
}

function capitalizar(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

async function obterUrlAssinada(caminho) {
    try {
        const res = await fetch(API.SUPABASE_URL + "/functions/v1/gerar-url-assinada", {
            method: "POST",
            headers: { "apikey": API.SUPABASE_ANON_KEY, "Authorization": "Bearer " + API.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ caminho: caminho })
        });
        if (res.ok) { const data = await res.json(); if (data.ok && data.url) return data.url; }
    } catch (e) { console.error(e); }
    return null;
}