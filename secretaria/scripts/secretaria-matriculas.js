/*
 CESC — Secretaria · Matrículas
 */

async function carregarMatriculas() {
    const token = obterToken();
    if (!token) return;
    const container = document.getElementById("lista-matriculas-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const filtroAno = document.getElementById("filtro-matriculas-ano");
    const ano = filtroAno ? filtroAno.value : "";

    const dados = await chamarRPC("cesc_secretaria_listar_matriculas", { p_token: token, p_ano_lectivo: ano || null });

    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar.") + '</div>'; return; }

    const matriculas = dados.matriculas || [];
    renderizarListaMatriculas(matriculas, filtroAno);

    if (filtroAno && !filtroAno.dataset.ligado) {
        filtroAno.dataset.ligado = "1";
        const anos = Array.from(new Set(matriculas.map(function (m) { return m.ano_lectivo; }))).sort().reverse();
        anos.forEach(function (a) { const opt = document.createElement("option"); opt.value = a; opt.textContent = a; filtroAno.appendChild(opt); });
        filtroAno.addEventListener("change", function () { carregarMatriculas(); });
    }
}

function renderizarListaMatriculas(matriculas, filtroAno) {
    const container = document.getElementById("lista-matriculas-container");
    if (matriculas.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem matrículas registadas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Aluno</th><th>Ano letivo</th><th>Classe / Turma</th><th class="col-opcional">Curso</th><th class="col-opcional">Nº</th><th>Estado</th></tr></thead><tbody>';
    matriculas.forEach(function (m) {
        html += '<tr><td><div class="celula-nome"><strong>' + esc(m.aluno_nome) + '</strong><span>BI: ' + esc(m.aluno_bi) + '</span></div></td><td>' + esc(m.ano_lectivo) + '</td><td>' + esc(m.classe) + ' · ' + esc(m.turma) + '</td><td class="col-opcional">' + esc(m.curso || "—") + '</td><td class="col-opcional">' + (m.numero_aluno != null ? m.numero_aluno : "—") + '</td><td><span class="badge badge-' + esc(m.estado || "activo") + '">' + esc(capitalizar(m.estado || "activo")) + '</span></td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    matriculas.forEach(function (m) {
        html += '<div class="cartao-sec"><div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(m.aluno_nome) + '</strong><span>BI: ' + esc(m.aluno_bi) + '</span></div><span class="badge badge-' + esc(m.estado || "activo") + '">' + esc(capitalizar(m.estado || "activo")) + '</span></div>';
        html += '<div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Ano</span><span class="meta-valor">' + esc(m.ano_lectivo) + '</span></div><div class="meta-item"><span class="meta-rotulo">Classe/Turma</span><span class="meta-valor">' + esc(m.classe) + ' · ' + esc(m.turma) + '</span></div>';
        if (m.curso) html += '<div class="meta-item"><span class="meta-rotulo">Curso</span><span class="meta-valor">' + esc(m.curso) + '</span></div>';
        if (m.numero_aluno != null) html += '<div class="meta-item"><span class="meta-rotulo">Nº</span><span class="meta-valor">' + m.numero_aluno + '</span></div>';
        html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function irParaNovaMatricula(aluno) {
    mostrarSeccao("matriculas");
    const form = document.getElementById("form-nova-matricula");
    if (form) form.style.display = "block";
    const selAluno = document.getElementById("mat-aluno");
    if (selAluno) {
        if (alunosCache.length > 0) { preencherSelectAlunos(selAluno); }
        else { carregarAlunosParaSelect(selAluno); }
        selAluno.value = aluno.id;
    }
}

async function carregarAlunosParaSelect(sel) {
    const token = obterToken();
    if (!token) return;
    const dados = await chamarRPC("cesc_secretaria_listar_alunos", { p_token: token });
    if (!dados.ok) return;
    alunosCache = dados.alunos || [];
    preencherSelectAlunos(sel);
}

function preencherSelectAlunos(sel) {
    sel.innerHTML = '<option value="">— Escolhe o aluno —</option>';
    alunosCache.forEach(function (a) { const opt = document.createElement("option"); opt.value = a.id; opt.textContent = a.nome_completo + " (" + a.bi_numero + ")"; sel.appendChild(opt); });
}

function configurarFormNovaMatricula() {
    const btnNova = document.getElementById("btn-nova-matricula");
    const form = document.getElementById("form-nova-matricula");
    const btnCancelar = document.getElementById("btn-cancelar-matricula");
    const btnGuardar = document.getElementById("btn-guardar-matricula");
    const msg = document.getElementById("msg-nova-matricula");
    if (!btnNova || !form) return;

    btnNova.addEventListener("click", function () {
        form.style.display = form.style.display === "none" ? "block" : "none";
        if (form.style.display === "block") {
            const selAluno = document.getElementById("mat-aluno");
            if (selAluno) { if (alunosCache.length > 0) preencherSelectAlunos(selAluno); else carregarAlunosParaSelect(selAluno); }
        }
        if (msg) { msg.className = "msg-form"; msg.textContent = ""; }
    });

    if (btnCancelar) btnCancelar.addEventListener("click", function () { form.style.display = "none"; });

    if (btnGuardar) {
        btnGuardar.addEventListener("click", async function () {
            const token = obterToken();
            const alunoId = document.getElementById("mat-aluno").value;
            const ano = document.getElementById("mat-ano").value.trim();
            const classe = document.getElementById("mat-classe").value.trim();
            const turma = document.getElementById("mat-turma").value.trim();
            const curso = document.getElementById("mat-curso").value.trim() || null;
            const numero = document.getElementById("mat-numero").value ? parseInt(document.getElementById("mat-numero").value, 10) : null;

            if (!alunoId) { mostrarMsg(msg, "Escolhe o aluno.", "erro"); return; }
            if (!ano || !classe || !turma) { mostrarMsg(msg, "Ano, classe e turma são obrigatórios.", "erro"); return; }

            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';

            const dados = await chamarRPC("cesc_secretaria_criar_matricula", {
                p_token: token, p_aluno_id: alunoId, p_ano_lectivo: ano, p_classe: classe, p_turma: turma, p_curso: curso, p_numero_aluno: numero
            });

            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Registar matrícula';

            if (!dados.ok) { mostrarMsg(msg, dados.erro || "Erro ao registar.", "erro"); return; }

            mostrarMsg(msg, "Matrícula registada com sucesso.", "sucesso");
            document.getElementById("mat-ano").value = "";
            document.getElementById("mat-classe").value = "";
            document.getElementById("mat-turma").value = "";
            document.getElementById("mat-curso").value = "";
            document.getElementById("mat-numero").value = "";
            setTimeout(function () { form.style.display = "none"; carregarMatriculas(); }, 900);
        });
    }
}
