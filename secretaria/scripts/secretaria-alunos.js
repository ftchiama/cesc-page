/*
 CESC — Secretaria · Alunos
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
                    || (a.turma_actual || "").toLowerCase().indexOf(termo) !== -1;
            });
            renderizarListaAlunos(filtrados);
        });
    }
}

function renderizarListaAlunos(alunos) {
    const container = document.getElementById("lista-alunos-container");
    if (alunos.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhum aluno encontrado.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Aluno</th><th class="col-opcional">Turma</th><th class="col-opcional">Contacto</th><th>Conta</th><th>Estado</th><th>Acções</th></tr></thead><tbody>';

    alunos.forEach(function (a, idx) {
        const conta = a.tem_conta ? '<span class="badge badge-activo">Criada</span>' : '<span class="badge badge-sem-conta">Sem conta</span>';
        html += '<tr data-aluno-idx="' + idx + '">';
        html += '  <td><div class="celula-nome"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></div></td>';
        html += '  <td class="col-opcional">' + esc(a.turma_actual || "—") + '</td>';
        html += '  <td class="col-opcional">' + esc(a.telefone || a.email_contacto || "—") + '</td>';
        html += '  <td>' + conta + '</td>';
        html += '  <td><span class="badge badge-' + esc(a.estado || "activo") + '">' + esc(capitalizar(a.estado || "activo")) + '</span></td>';
        html += '  <td><div class="acoes-linha">';
        html += '    <button class="btn-acao btn-acao-secundario" data-editar-aluno="' + idx + '"><i class="fas fa-edit"></i> Editar</button>';
        if (a.matricula_activa) { html += '    <button class="btn-acao btn-acao-secundario" data-ver-matricula="' + idx + '" disabled>Matriculado</button>'; }
        else { html += '    <button class="btn-acao btn-acao-primario" data-nova-matricula="' + idx + '"><i class="fas fa-plus"></i> Matricular</button>'; }
        html += '  </div></td></tr>';
        html += '<tr class="linha-editar" data-editar-linha="' + idx + '" style="display:none;"><td colspan="6"><div data-editar-conteudo="' + idx + '"></div></td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    alunos.forEach(function (a, idx) {
        const conta = a.tem_conta ? '<span class="badge badge-activo">Criada</span>' : '<span class="badge badge-sem-conta">Sem conta</span>';
        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(a.nome_completo) + '</strong><span>BI: ' + esc(a.bi_numero) + '</span></div><span class="badge badge-' + esc(a.estado || "activo") + '">' + esc(capitalizar(a.estado || "activo")) + '</span></div>';
        html += '  <div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Turma</span><span class="meta-valor">' + esc(a.turma_actual || "—") + '</span></div><div class="meta-item"><span class="meta-rotulo">Contacto</span><span class="meta-valor">' + esc(a.telefone || a.email_contacto || "—") + '</span></div><div class="meta-item"><span class="meta-rotulo">Conta</span><span class="meta-valor">' + conta + '</span></div></div>';
        html += '  <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-secundario" data-editar-aluno-mobile="' + idx + '"><i class="fas fa-edit"></i> Editar</button>';
        if (a.matricula_activa) { html += '<button class="btn-acao btn-acao-secundario" disabled>Matriculado</button>'; }
        else { html += '<button class="btn-acao btn-acao-primario" data-nova-matricula-mobile="' + idx + '"><i class="fas fa-plus"></i> Matricular</button>'; }
        html += '  </div><div class="cartao-sec-editar" data-editar-mobile="' + idx + '" style="display:none;"></div></div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll("[data-editar-aluno]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-editar-aluno"), 10); abrirEditorAluno(alunos[idx], idx, false); });
    });
    container.querySelectorAll("[data-nova-matricula]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-nova-matricula"), 10); irParaNovaMatricula(alunos[idx]); });
    });
    container.querySelectorAll("[data-editar-aluno-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-editar-aluno-mobile"), 10); abrirEditorAluno(alunos[idx], idx, true); });
    });
    container.querySelectorAll("[data-nova-matricula-mobile]").forEach(function (btn) {
        btn.addEventListener("click", function () { const idx = parseInt(this.getAttribute("data-nova-matricula-mobile"), 10); irParaNovaMatricula(alunos[idx]); });
    });
}

function abrirEditorAluno(aluno, idx, éMobile) {
    const seletorLinha = éMobile ? '[data-editar-mobile="' + idx + '"]' : '[data-editar-linha="' + idx + '"]';
    const seletorConteudo = éMobile ? '[data-editar-mobile="' + idx + '"]' : '[data-editar-conteudo="' + idx + '"]';
    const painel = document.querySelector(seletorLinha);
    const conteudo = document.querySelector(seletorConteudo);
    if (!painel || !conteudo) return;

    if (painel.style.display !== "none" && painel.style.display !== "") {
        painel.style.display = "none"; conteudo.innerHTML = "";
        if (!éMobile) { const linha = document.querySelector('[data-editar-linha="' + idx + '"]'); if (linha) linha.style.display = "none"; }
        return;
    }

    if (éMobile) { painel.style.display = "block"; }
    else { const linha = document.querySelector('[data-editar-linha="' + idx + '"]'); if (linha) linha.style.display = "table-row"; }

    let html = '<div class="form-painel" style="margin:0;">';
    html += '<h3><i class="fas fa-edit"></i> Editar: ' + esc(aluno.nome_completo) + '</h3>';
    html += '<div class="form-grelha">';
    html += campoForm("edit-nome-" + idx, "Nome completo", aluno.nome_completo || "", "text");
    html += campoForm("edit-data-nasc-" + idx, "Data de nascimento", aluno.data_nascimento ? aluno.data_nascimento.slice(0, 10) : "", "date");
    html += campoForm("edit-telefone-" + idx, "Telefone", aluno.telefone || "", "text");
    html += campoForm("edit-email-" + idx, "Email de contacto", aluno.email_contacto || "", "email");
    html += campoForm("edit-encarregado-" + idx, "Encarregado", aluno.nome_encarregado || "", "text");
    html += campoForm("edit-tel-encarregado-" + idx, "Telefone do encarregado", aluno.telefone_encarregado || "", "text");
    html += campoForm("edit-turma-" + idx, "Turma actual", aluno.turma_actual || "", "text");
    html += '<div class="campo-grupo"><label for="edit-estado-' + idx + '">Estado</label><select id="edit-estado-' + idx + '">';
    ["activo", "formado", "desistente", "transferido"].forEach(function (e) { html += '<option value="' + e + '"' + (aluno.estado === e ? " selected" : "") + '>' + capitalizar(e) + '</option>'; });
    html += '</select></div></div>';
    html += '<div class="form-acoes"><button class="botao-primario" data-guardar-edicao="' + idx + '"><i class="fas fa-save"></i> Guardar alterações</button><button class="botao-secundario" data-fechar-edicao="' + idx + '">Cancelar</button></div>';
    html += '<p class="msg-form" id="msg-edit-' + idx + '"></p></div>';
    conteudo.innerHTML = html;

    conteudo.querySelector('[data-guardar-edicao="' + idx + '"]').addEventListener("click", function () { guardarEdicaoAluno(aluno, idx); });
    conteudo.querySelector('[data-fechar-edicao="' + idx + '"]').addEventListener("click", function () {
        conteudo.innerHTML = "";
        if (éMobile) { painel.style.display = "none"; }
        else { const linha = document.querySelector('[data-editar-linha="' + idx + '"]'); if (linha) linha.style.display = "none"; }
    });
}

async function guardarEdicaoAluno(aluno, idx) {
    const token = obterToken();
    const msg = document.getElementById("msg-edit-" + idx);
    const nome = document.getElementById("edit-nome-" + idx).value.trim();
    const dataNasc = document.getElementById("edit-data-nasc-" + idx).value || null;
    const telefone = document.getElementById("edit-telefone-" + idx).value.trim() || null;
    const email = document.getElementById("edit-email-" + idx).value.trim() || null;
    const encarregado = document.getElementById("edit-encarregado-" + idx).value.trim() || null;
    const telEncarregado = document.getElementById("edit-tel-encarregado-" + idx).value.trim() || null;
    const turma = document.getElementById("edit-turma-" + idx).value.trim() || null;
    const estado = document.getElementById("edit-estado-" + idx).value;

    if (!nome || nome.length < 3) { mostrarMsg(msg, "Nome completo inválido.", "erro"); return; }

    const dados = await chamarRPC("cesc_secretaria_editar_aluno", {
        p_token: token, p_aluno_id: aluno.id, p_nome_completo: nome, p_data_nascimento: dataNasc, p_telefone: telefone, p_email_contacto: email, p_nome_encarregado: encarregado, p_telefone_encarregado: telEncarregado, p_turma_actual: turma, p_estado: estado
    });

    if (!dados.ok) { mostrarMsg(msg, dados.erro || "Erro ao guardar.", "erro"); return; }
    mostrarMsg(msg, "Alterações guardadas.", "sucesso");
    setTimeout(function () { carregarAlunos(); }, 900);
}

function configurarFormNovoAluno() {
    const btnNovo = document.getElementById("btn-novo-aluno");
    const form = document.getElementById("form-novo-aluno");
    const btnCancelar = document.getElementById("btn-cancelar-aluno");
    const btnGuardar = document.getElementById("btn-guardar-aluno");
    const msg = document.getElementById("msg-novo-aluno");
    if (!btnNovo || !form) return;
    btnNovo.addEventListener("click", function () { form.style.display = form.style.display === "none" ? "block" : "none"; if (msg) { msg.className = "msg-form"; msg.textContent = ""; } });
    if (btnCancelar) btnCancelar.addEventListener("click", function () { form.style.display = "none"; });
    if (btnGuardar) {
        btnGuardar.addEventListener("click", async function () {
            const token = obterToken();
            const bi = document.getElementById("novo-bi").value.trim();
            const nome = document.getElementById("novo-nome").value.trim();
            const dataNasc = document.getElementById("novo-data-nasc").value || null;
            const genero = document.getElementById("novo-genero").value || null;
            const telefone = document.getElementById("novo-telefone").value.trim() || null;
            const email = document.getElementById("novo-email").value.trim() || null;
            const encarregado = document.getElementById("novo-encarregado").value.trim() || null;
            const telEncarregado = document.getElementById("novo-tel-encarregado").value.trim() || null;
            const anoEntrada = document.getElementById("novo-ano-entrada").value ? parseInt(document.getElementById("novo-ano-entrada").value, 10) : null;
            const turma = document.getElementById("novo-turma").value.trim() || null;
            if (!bi || bi.length < 6) { mostrarMsg(msg, "BI inválido.", "erro"); return; }
            if (!nome || nome.length < 3) { mostrarMsg(msg, "Nome completo inválido.", "erro"); return; }
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';
            const dados = await chamarRPC("cesc_secretaria_criar_aluno", {
                p_token: token, p_bi_numero: bi, p_nome_completo: nome, p_data_nascimento: dataNasc, p_genero: genero, p_telefone: telefone, p_email_contacto: email, p_nome_encarregado: encarregado, p_telefone_encarregado: telEncarregado, p_ano_entrada: anoEntrada, p_turma_actual: turma, p_estado: "activo"
            });
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar aluno';
            if (!dados.ok) { mostrarMsg(msg, dados.erro || "Erro ao criar aluno.", "erro"); return; }
            mostrarMsg(msg, "Aluno criado com sucesso.", "sucesso");
            limparFormNovoAluno();
            setTimeout(function () { form.style.display = "none"; carregarAlunos(); }, 900);
        });
    }
}

function limparFormNovoAluno() {
    ["novo-bi", "novo-nome", "novo-data-nasc", "novo-genero", "novo-telefone", "novo-email", "novo-encarregado", "novo-tel-encarregado", "novo-ano-entrada", "novo-turma"].forEach(function (id) {
        const el = document.getElementById(id); if (el) el.value = "";
    });
}
