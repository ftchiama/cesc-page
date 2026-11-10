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

    const res = await chamarRPC("cesc_obter_perfil_aluno_completo", { p_token: token, p_aluno_id: alunoId });
    if (!res.ok) {
        document.getElementById("loader").innerHTML = "<p style='color:red;'>" + esc(res.erro) + "</p>";
        return;
    }

    dadosGlobais = res;
    configurarFiltroAno(res);
    renderizarPerfil(null); // Null significa "Todos os anos"

    document.getElementById("loader").style.display = "none";
    document.getElementById("perfil-conteudo").style.display = "block";
});

function configurarFiltroAno(dados) {
    const anos = new Set();
    dados.historico_matriculas.forEach(m => anos.add(m.ano_lectivo));
    dados.historico_inscricoes.forEach(i => anos.add(i.ano_lectivo));
    
    const anosOrdenados = Array.from(anos).sort().reverse();
    const sel = document.getElementById("filtro-ano-global");
    
    anosOrdenados.forEach(ano => {
        const opt = document.createElement("option");
        opt.value = ano;
        opt.textContent = ano;
        sel.appendChild(opt);
    });

    // Se houver um ano atual, seleciona-o por defeito
    if (anosOrdenados.length > 0) {
        sel.value = anosOrdenados[0];
        renderizarPerfil(anosOrdenados[0]);
    }

    sel.addEventListener("change", function () {
        renderizarPerfil(this.value || null);
    });
}

async function renderizarPerfil(anoFiltro) {
    const dados = dadosGlobais;
    const a = dados.aluno;
    
    // Header e Sobre (sempre visíveis)
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

    // Linha do Tempo (Histórico de Matrículas + Vereditos do AURA)
    const histMat = dados.historico_matriculas.filter(m => !anoFiltro || m.ano_lectivo === anoFiltro);
    const histIns = dados.historico_inscricoes.filter(i => !anoFiltro || i.ano_lectivo === anoFiltro);
    
    let htmlHist = '<div style="display:flex; flex-direction:column; gap:16px; position:relative; padding-left: 20px; border-left: 2px solid var(--cor-borda);">';
    
    if (histMat.length === 0 && histIns.length === 0) {
        htmlHist = "<p style='font-size:0.9rem; color:#64748b;'>Sem histórico para este ano.</p>";
    } else {
        // Juntar anos
        const todosAnos = [...new Set([...histMat.map(m => m.ano_lectivo), ...histIns.map(i => i.ano_lectivo)])].sort().reverse();
        
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

    // Situação no Ano (Matrícula e Inscrição do Ano Filtrado)
    const matAno = histMat.length > 0 ? histMat[0] : null; // A mais recente (se filtro ou não)
    const insAno = histIns.length > 0 ? histIns[0] : null;
    
    let htmlTurma = "";
    if (matAno) {
        htmlTurma += linha("Ano Letivo", matAno.ano_lectivo);
        htmlTurma += linha("Classe", matAno.classe);
        htmlTurma += linha("Curso", matAno.curso || "—");
        htmlTurma += linha("Sala", matAno.sala || "—");
        htmlTurma += linha("Pavilhão", matAno.pavilhao || "—");
        htmlTurma += linha("Turno", matAno.turno || "—");
        htmlTurma += linha("Nº Aluno", matAno.numero_aluno || "—");
    } else {
        htmlTurma = "<p style='font-size:0.9rem; color:#64748b;'>Sem matrícula ativa.</p>";
    }
    
    if (insAno && insAno.estado !== 'matriculado') {
        htmlTurma += `<h4 style="margin-top:16px; font-size:0.85rem; color:var(--cor-dourado);">Próxima Inscrição</h4>`;
        htmlTurma += linha("Classe", insAno.classe_pretendida);
        htmlTurma += linha("Estado", capitalizar(insAno.estado));
    }
    document.getElementById("perf-turma").innerHTML = htmlTurma;

    // Documentos (usa a inscrição do ano filtrado)
    const containerDocs = document.getElementById("perf-documentos");
    if (insAno && insAno.id) {
        const docs = [
            { label: "BI Frente", path: insAno.doc_bi_frente_url },
            { label: "BI Verso", path: insAno.doc_bi_verso_url },
            { label: "Certificado", path: insAno.doc_certificado_url },
            { label: "Foto", path: insAno.doc_foto_url }
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

    // Notas
    const notasAno = dados.notas.filter(n => !anoFiltro || n.ano_lectivo === anoFiltro);
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
        document.getElementById("perf-notas").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem notas lançadas.</p>";
    }

    // Faltas
    const faltasAno = dados.faltas.filter(f => !anoFiltro || f.ano_lectivo === anoFiltro);
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

    // Pagamentos
    const pagAno = dados.pagamentos.filter(p => !anoFiltro || p.ano_lectivo === anoFiltro);
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