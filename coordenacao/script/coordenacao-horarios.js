async function carregarHorarios() {
    const container = document.getElementById("lista-horarios-container");
    if (!container) return;
    const selTurma = document.getElementById("filtro-horario-turma");
    const turma = selTurma ? selTurma.value : "";

    const res = await chamarRPC("cesc_coordenacao_listar_horarios", { 
        p_token: obterToken(), p_ano_lectivo: "2026/2027", p_turma: turma || null 
    });
    if (!res.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(res.erro) + '</div>'; return; }

    const lista = res.horarios || [];
    if (lista.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhum horário gerado.</div>'; return; }

    // Preencher o filtro de turmas
    if (selTurma && selTurma.options.length <= 1) {
        const turmas = [...new Set(lista.map(h => h.turma))].sort();
        turmas.forEach(t => { selTurma.innerHTML += `<option value="${t}">${t}</option>`; });
        selTurma.addEventListener("change", carregarHorarios);
    }

    // Grelha por turma
    let html = '';
    const porTurma = {};
    lista.forEach(h => {
        if (!porTurma[h.turma]) porTurma[h.turma] = {};
        if (!porTurma[h.turma][h.dia_semana]) porTurma[h.turma][h.dia_semana] = {};
        porTurma[h.turma][h.dia_semana][h.tempo_ordem] = h;
    });

    for (const t in porTurma) {
        html += `<h3 style="margin:16px 0;">${esc(t)}</h3>`;
        html += '<div class="tabela-wrapper"><table class="tabela-sec"><thead><tr><th>Dia</th><th>Tempo</th><th>Disciplina</th><th>Professor</th></tr></thead><tbody>';
        for (let dia = 1; dia <= 5; dia++) {
            const dias = ["2ª", "3ª", "4ª", "5ª", "6ª"];
            for (let ord = 1; ord <= 8; ord++) {
                const h = porTurma[t][dia] && porTurma[t][dia][ord];
                if (!h) continue;
                html += `<tr><td>${dias[dia-1]}</td><td>${ord}º</td><td>${esc(h.disciplina)}</td><td>${esc(h.professor_nome || '—')}</td></tr>`;
            }
        }
        html += '</tbody></table></div>';
    }
    container.innerHTML = html;

    // Botão gerar
    const btnGerar = document.getElementById("btn-gerar-horarios");
    if (btnGerar && !btnGerar.dataset.ligado) {
        btnGerar.dataset.ligado = "1";
        btnGerar.addEventListener("click", async function () {
            const msg = document.getElementById("msg-gerar-horarios");
            btnGerar.disabled = true;
            btnGerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A gerar...';
            const res = await chamarRPC("cesc_coordenacao_gerar_horarios", { p_token: obterToken(), p_ano_lectivo: "2026/2027" });
            btnGerar.disabled = false;
            btnGerar.innerHTML = '<i class="fas fa-play"></i> Gerar Horários';
            if (res.ok) {
                mostrarMsg(msg, `Horários gerados! Atribuídos: ${res.total_atribuidos}. Sem professor: ${res.total_sem_professor}. ${res.mensagem || ''}`, "sucesso");
                carregarHorarios();
            } else {
                mostrarMsg(msg, res.erro || "Erro.", "erro");
            }
        });
    }
}