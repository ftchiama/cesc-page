let dadosGlobais = null;

document.addEventListener("DOMContentLoaded", async function () {
    const token = obterToken();
    if (!token) { window.location.href = "login.html"; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const alunoId = urlParams.get("id");

    if (!alunoId) {
        document.getElementById("loader").innerHTML = "<p>ID do aluno não fornecido.</p>";
        return;
    }

    // Botão Voltar Inteligente
    const btnVoltar = document.getElementById("btn-voltar");
    btnVoltar.addEventListener("click", function(e) {
        e.preventDefault();
        if (document.referrer && document.referrer !== "") {
            window.location.href = document.referrer;
        } else {
            window.location.href = "../index.html";
        }
    });

    // Configurar Toggles dos Cartões (Documentos, Faltas, etc.)
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
    configurarFiltros(res);
    await renderizarPerfil();

    document.getElementById("loader").style.display = "none";
    document.getElementById("perfil-conteudo").style.display = "block";
});

function configurarFiltros(dados) {
    const selAno = document.getElementById("filtro-ano");
    const anos = new Set();
    dados.historico_matriculas.forEach(m => anos.add(m.ano_lectivo));
    dados.historico_inscricoes.forEach(i => anos.add(i.ano_lectivo));
    
    const anosOrdenados = Array.from(anos).sort().reverse();
    
    // Limpar opções antigas antes de preencher
    selAno.innerHTML = "";
    anosOrdenados.forEach(ano => {
        const opt = document.createElement("option");
        opt.value = ano;
        opt.textContent = ano;
        selAno.appendChild(opt);
    });

    if (anosOrdenados.length > 0) {
        selAno.value = anosOrdenados[0];
    }

    selAno.addEventListener("change", renderizarPerfil);
    document.getElementById("filtro-trimestre").addEventListener("change", renderizarPerfil);
}

async function renderizarPerfil() {
    const dados = dadosGlobais;
    const a = dados.aluno;
    const anoFiltro = document.getElementById("filtro-ano").value;
    const trimestreFiltro = parseInt(document.getElementById("filtro-trimestre").value, 10);

    // --- 1. AVATAR (Usa a Foto Tipo-Passe) ---
    const avatarEl = document.getElementById("perf-avatar");
    const ultimaInscricao = dados.historico_inscricoes && dados.historico_inscricoes.length > 0 ? dados.historico_inscricoes[0] : null;
    
    if (ultimaInscricao && ultimaInscricao.doc_foto_url) {
        const linkFoto = await obterUrlAssinada(ultimaInscricao.doc_foto_url);
        if (linkFoto) {
            avatarEl.innerHTML = `<img src="${linkFoto}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            avatarEl.style.backgroundColor = "transparent";
        } else {
            avatarEl.textContent = (a.nome_completo || "?").charAt(0).toUpperCase();
        }
    } else {
        avatarEl.textContent = (a.nome_completo || "?").charAt(0).toUpperCase();
    }

    document.getElementById("perf-nome").textContent = a.nome_completo;
    document.getElementById("perf-bi").textContent = "BI: " + a.bi_numero;
    document.getElementById("perf-estado").textContent = capitalizar(a.estado);

    // --- 2. SOBRE O ALUNO ---
    let htmlSobre = "";
    htmlSobre += linha("Data de Nascimento", fmtData(a.data_nascimento));
    htmlSobre += linha("Género", a.genero === 'M' ? 'Masculino' : 'Feminino');
    htmlSobre += linha("Telefone", a.telefone || "—");
    htmlSobre += linha("Email", a.email_contacto || "—");
    htmlSobre += linha("Encarregado", a.nome_encarregado || "—");
    htmlSobre += linha("Tel. Encarregado", a.telefone_encarregado || "—");
    htmlSobre += linha("Conta de Aluno", a.tem_conta ? "Criada" : "Não criada");
    document.getElementById("perf-sobre").innerHTML = htmlSobre;

    // --- 3. SITUAÇÃO NO ANO (Filtrada) ---
    const mat = dados.historico_matriculas.find(m => m.ano_lectivo === anoFiltro);
    let htmlTurma = "";
    
    if (mat) {
        htmlTurma += linha("Ano Letivo", mat.ano_lectivo);
        htmlTurma += linha("Classe", mat.classe);
        htmlTurma += linha("Curso", mat.curso || "—");
        htmlTurma += linha("Sala", mat.sala || "—");
        htmlTurma += linha("Pavilhão", mat.pavilhao || "—");
        htmlTurma += linha("Turno", mat.turno || "—");
        htmlTurma += linha("Nº Aluno", mat.numero_aluno || "—");
    } else {
        const ins = dados.historico_inscricoes.find(i => i.ano_lectivo === anoFiltro);
        if (ins) {
            htmlTurma += `<h4 style="margin:0 0 8px 0; font-size:0.85rem; color:var(--cor-dourado);">Inscrição Futura</h4>`;
            htmlTurma += linha("Ano Letivo", ins.ano_lectivo);
            htmlTurma += linha("Classe", ins.classe_pretendida);
            htmlTurma += linha("Curso", ins.curso_pretendido || "—");
            htmlTurma += linha("Estado", capitalizar(ins.estado));
        } else {
            htmlTurma = "<p style='font-size:0.9rem; color:#64748b;'>Sem dados para este ano.</p>";
        }
    }
    document.getElementById("perf-turma").innerHTML = htmlTurma;

    // --- 4. LINHA DO TEMPO (Sempre Completa) ---
    const histMat = dados.historico_matriculas || [];
    const histIns = dados.historico_inscricoes || [];
    const todosAnos = [...new Set([...histMat.map(m => m.ano_lectivo), ...histIns.map(i => i.ano_lectivo)])].sort().reverse();
    
    let htmlHist = '<div style="display:flex; flex-direction:column; gap:16px; position:relative; padding-left: 20px; border-left: 2px solid var(--cor-borda);">';
    
    if (todosAnos.length === 0) {
        htmlHist = "<p style='font-size:0.9rem; color:#64748b;'>Sem histórico.</p>";
    } else {
        todosAnos.forEach(ano => {
            const m = histMat.find(x => x.ano_lectivo === ano);
            const i = histIns.find(x => x.ano_lectivo === ano);
            
            htmlHist += `<div style="position:relative; margin-bottom: 12px;">`;
            htmlHist += `<div style="position:absolute; left:-26px; top:4px; width:10px; height:10px; background:var(--cor-azul); border-radius:50%;"></div>`;
            htmlHist += `<strong style="color:var(--cor-azul); font-size:1rem;">${esc(ano)}</strong>`;
            
            if (m) {
                htmlHist += `<div style="font-size:0.85rem; margin-top:4px; line-height:1.5;">
                    <div><strong>${esc(m.classe)}</strong> ${m.curso ? '('+esc(m.curso)+')' : ''}</div>
                    <div style="color:#64748b;">${esc(m.sala || '—')} · Nº ${m.numero_aluno || '—'} · ${esc(m.turno || '—')}</div>`;
                
                if (i) {
                    const veredito = i.tipo === 'aprovado' ? '<span style="color:#059669; font-weight:bold;">Aprovado</span>' : 
                                     i.tipo === 'reprovado' ? '<span style="color:#dc2626; font-weight:bold;">Reprovado</span>' : 
                                     '<span style="color:#64748b;">Em avaliação</span>';
                    htmlHist += `<div style="font-size:0.8rem; margin-top:4px; background:var(--cor-fundo); padding:4px 8px; border-radius:4px;">Veredito AURA: ${veredito}</div>`;
                }
                htmlHist += `</div>`;
            } else if (i) {
                htmlHist += `<div style="font-size:0.85rem; margin-top:4px; line-height:1.5;">
                    <div><strong>Inscrição:</strong> ${esc(i.classe_pretendida)} ${i.curso_pretendido ? '('+esc(i.curso_pretendido)+')' : ''}</div>
                    <div style="color:#64748b;">Estado: ${esc(capitalizar(i.estado))}</div>
                </div>`;
            }
            htmlHist += `</div>`;
        });
    }
    htmlHist += `</div>`;
    document.getElementById("perf-historico").innerHTML = htmlHist;

    // --- 5. NOTAS (Filtradas por Ano e Trimestre) ---
    const notasAno = dados.notas.filter(n => n.ano_lectivo === anoFiltro && n.trimestre === trimestreFiltro);
    
    if (notasAno.length > 0) {
        const agrupado = {};
        notasAno.forEach(n => {
            if (!agrupado[n.disciplina]) agrupado[n.disciplina] = [];
            agrupado[n.disciplina].push(n);
        });

        // Função para colorir as notas
        const fmtNotaColor = (v, isFinal) => {
            if (v == null || v === '') return '—';
            const n = Number(v);
            if (n < 10) return `<span style="color:#dc2626; font-weight:bold;">${n.toFixed(1)}</span>`; // Vermelho (Negativa)
            if (isFinal) return `<span style="color:#059669; font-weight:bold;">${n.toFixed(1)}</span>`; // Verde (MFD)
            return n.toFixed(1);
        };

        let htmlNotas = '<table class="tabela-perfil"><thead><tr><th>Disciplina</th><th>MAC</th><th>NPT</th><th>MT</th><th>MFD</th></tr></thead><tbody>';
        for (const disc in agrupado) {
            const n = agrupado[disc][0];
            htmlNotas += `<tr>
                <td><strong>${esc(disc)}</strong></td>
                <td>${fmtNotaColor(n.mac, false)}</td>
                <td>${fmtNotaColor(n.npt, false)}</td>
                <td>${fmtNotaColor(n.mt, false)}</td>
                <td>${fmtNotaColor(n.mfd, true)}</td>
            </tr>`;
        }
        htmlNotas += '</tbody></table>';
        document.getElementById("perf-notas").innerHTML = htmlNotas;
    } else {
        document.getElementById("perf-notas").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem notas lançadas para este período.</p>";
    }

    // --- 6. DOCUMENTOS (Usa a inscrição do ano filtrado) ---
    const insDoAno = dados.historico_inscricoes.find(i => i.ano_lectivo === anoFiltro) || (dados.historico_inscricoes.length > 0 ? dados.historico_inscricoes[0] : null);
    const containerDocs = document.getElementById("perf-documentos");
    if (insDoAno && insDoAno.id) {
        const docs = [
            { label: "BI Frente", path: insDoAno.doc_bi_frente_url },
            { label: "BI Verso", path: insDoAno.doc_bi_verso_url },
            { label: "Certificado", path: insDoAno.doc_certificado_url },
            { label: "Foto", path: insDoAno.doc_foto_url }
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

    // --- 7. FALTAS (Filtrado pelo ano) ---
    const faltasAno = dados.faltas.filter(f => f.ano_lectivo === anoFiltro);
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

    // --- 8. PAGAMENTOS (Filtrado pelo ano) ---
    const pagAno = dados.pagamentos.filter(p => p.ano_lectivo === anoFiltro);
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

    // --- 9. HISTÓRICO DE ALTERAÇÕES ---
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