document.addEventListener("DOMContentLoaded", async function () {
    const token = obterToken();
    if (!token) { window.location.href = "login.html"; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const alunoId = urlParams.get("id");

    if (!alunoId) {
        document.getElementById("loader").innerHTML = "<p>ID do aluno não fornecido.</p>";
        return;
    }

    const res = await chamarRPC("cesc_obter_perfil_aluno_completo", { p_token: token, p_aluno_id: alunoId });

    if (!res.ok) {
        document.getElementById("loader").innerHTML = "<p style='color:red;'>" + esc(res.erro) + "</p>";
        return;
    }

    await renderizarPerfil(res);
    document.getElementById("loader").style.display = "none";
    document.getElementById("perfil-conteudo").style.display = "block";
});

async function renderizarPerfil(dados) {
    const a = dados.aluno;
    const m = dados.matricula || {};
    const i = dados.inscricao || {};
    const notas = dados.notas || [];
    const faltas = dados.faltas || [];
    const pagamentos = dados.pagamentos || [];
    const histMat = dados.historico_matriculas || [];
    const histAlt = dados.historico_alteracoes || [];

    // Header
    document.getElementById("perf-avatar").textContent = (a.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("perf-nome").textContent = a.nome_completo;
    document.getElementById("perf-bi").textContent = "BI: " + a.bi_numero;
    document.getElementById("perf-estado").textContent = capitalizar(a.estado);

    // Sobre
    let htmlSobre = "";
    htmlSobre += linha("Data de Nascimento", fmtData(a.data_nascimento));
    htmlSobre += linha("Género", a.genero === 'M' ? 'Masculino' : 'Feminino');
    htmlSobre += linha("Telefone", a.telefone || "—");
    htmlSobre += linha("Email", a.email_contacto || "—");
    htmlSobre += linha("Encarregado", a.nome_encarregado || "—");
    htmlSobre += linha("Tel. Encarregado", a.telefone_encarregado || "—");
    htmlSobre += linha("Conta de Aluno", a.tem_conta ? "Criada" : "Não criada");
    document.getElementById("perf-sobre").innerHTML = htmlSobre;

    // Turma Atual
    let htmlTurma = "";
    if (m && m.id) {
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
    document.getElementById("perf-turma").innerHTML = htmlTurma;

    // Histórico Escolar
    if (histMat.length > 0) {
        let htmlHist = '<div style="display:flex; flex-direction:column; gap:8px;">';
        histMat.forEach(h => {
            htmlHist += `<div style="background:var(--cor-fundo); padding:10px; border-radius:6px; font-size:0.85rem;">
                <strong>${esc(h.ano_lectivo)}</strong> — ${esc(h.classe)} ${h.curso ? '('+esc(h.curso)+')' : ''}
                <br><span style="color:#64748b;">${esc(h.sala || '—')} · Nº ${h.numero_aluno || '—'}</span>
            </div>`;
        });
        htmlHist += '</div>';
        document.getElementById("perf-historico").innerHTML = htmlHist;
    } else {
        document.getElementById("perf-historico").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem histórico.</p>";
    }

    // Notas
    if (notas.length > 0) {
        const agrupado = {};
        notas.forEach(n => {
            if (!agrupado[n.disciplina]) agrupado[n.disciplina] = [];
            agrupado[n.disciplina].push(n);
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

    // Documentos
    const containerDocs = document.getElementById("perf-documentos");
    if (i && i.id) {
        const docs = [
            { label: "BI Frente", path: i.doc_bi_frente_url },
            { label: "BI Verso", path: i.doc_bi_verso_url },
            { label: "Certificado", path: i.doc_certificado_url },
            { label: "Foto", path: i.doc_foto_url }
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

    // Faltas
    if (faltas.length > 0) {
        let htmlFaltas = '<table class="tabela-perfil"><thead><tr><th>Disciplina</th><th>Mês</th><th>Qtd</th><th>Justificada</th></tr></thead><tbody>';
        faltas.forEach(f => {
            htmlFaltas += `<tr><td>${esc(f.disciplina)}</td><td>${esc(f.mes || '—')}</td><td>${f.quantidade}</td><td>${f.justificada ? 'Sim' : 'Não'}</td></tr>`;
        });
        htmlFaltas += '</tbody></table>';
        document.getElementById("perf-faltas").innerHTML = htmlFaltas;
    } else {
        document.getElementById("perf-faltas").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem faltas registadas.</p>";
    }

    // Pagamentos
    if (pagamentos.length > 0) {
        let htmlPag = '<table class="tabela-perfil"><thead><tr><th>Tipo</th><th>Valor</th><th>Data</th><th>Estado</th></tr></thead><tbody>';
        pagamentos.forEach(p => {
            htmlPag += `<tr><td>${capitalizar(p.tipo)}</td><td>${Number(p.valor).toLocaleString("pt-PT")} Kz</td><td>${fmtData(p.data)}</td><td>${capitalizar(p.estado)}</td></tr>`;
        });
        htmlPag += '</tbody></table>';
        document.getElementById("perf-pagamentos").innerHTML = htmlPag;
    } else {
        document.getElementById("perf-pagamentos").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem pagamentos.</p>";
    }

    // Histórico de Alterações
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