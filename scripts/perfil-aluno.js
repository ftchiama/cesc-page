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

    renderizarPerfil(res);
    document.getElementById("loader").style.display = "none";
    document.getElementById("perfil-conteudo").style.display = "block";
});

function renderizarPerfil(dados) {
    const a = dados.aluno;
    const m = dados.matricula || {};
    const notas = dados.notas || [];
    const faltas = dados.faltas || [];
    const pagamentos = dados.pagamentos || [];
    const historico = dados.historico || [];

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

    // Histórico
    if (historico.length > 0) {
        let htmlHist = '<div style="display:flex; flex-direction:column; gap:8px;">';
        historico.forEach(h => {
            htmlHist += `<div style="background:var(--cor-fundo); padding:8px; border-radius:6px; font-size:0.85rem;">
                <strong>${esc(h.ano_lectivo)}</strong> — ${esc(h.classe)} ${h.curso ? '('+esc(h.curso)+')' : ''}
                <br><span style="color:#64748b;">${esc(h.sala || '—')} · Nº ${h.numero_aluno || '—'}</span>
            </div>`;
        });
        htmlHist += '</div>';
        document.getElementById("perf-historico").innerHTML = htmlHist;
    } else {
        document.getElementById("perf-historico").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem histórico.</p>";
    }

    // Notas (agrupadas por disciplina)
    if (notas.length > 0) {
        const agrupado = {};
        notas.forEach(n => {
            if (!agrupado[n.disciplina]) agrupado[n.disciplina] = [];
            agrupado[n.disciplina].push(n);
        });

        let htmlNotas = '<table class="tabela-perfil"><thead><tr><th>Disciplina</th><th>Trim.</th><th>MAC</th><th>NPT</th><th>MT</th><th>MFD</th></tr></thead><tbody>';
        for (const disc in agrupado) {
            agrupado[disc].forEach((n, i) => {
                htmlNotas += `<tr>`;
                if (i === 0) htmlNotas += `<td rowspan="${agrupado[disc].length}"><strong>${esc(disc)}</strong></td>`;
                htmlNotas += `<td>${n.trimestre}º</td><td>${n.mac || '—'}</td><td>${n.npt || '—'}</td><td>${n.mt || '—'}</td><td><strong>${n.mfd || '—'}</strong></td></tr>`;
            });
        }
        htmlNotas += '</tbody></table>';
        document.getElementById("perf-notas").innerHTML = htmlNotas;
    } else {
        document.getElementById("perf-notas").innerHTML = "<p style='font-size:0.9rem; color:#64748b;'>Sem notas lançadas.</p>";
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
}

function linha(rotulo, valor) {
    return `<div class="info-linha"><span class="rotulo">${rotulo}</span><span class="valor">${esc(valor || "—")}</span></div>`;
}

function capitalizar(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}