/*
 CESC — Direcção · Académico
 */

let classesCache = [];
let cursosCache = [];
let disciplinasCache = [];
let grelhaCache = [];

async function carregarAcademico() {
    const token = obterToken();
    if (!token) return;

    // 1. Classes
    const resClasses = await chamarRPC("cesc_diretor_listar_classes", { p_token: token });
    if (resClasses.ok) { classesCache = resClasses.classes || []; renderizarClasses(); }

    // 2. Cursos
    const resCursos = await chamarRPC("cesc_diretor_listar_cursos", { p_token: token });
    if (resCursos.ok) { cursosCache = resCursos.cursos || []; renderizarCursos(); }

    // 3. Disciplinas
    const resDisc = await chamarRPC("cesc_diretor_listar_disciplinas", { p_token: token });
    if (resDisc.ok) { disciplinasCache = resDisc.disciplinas || []; renderizarDisciplinas(); }

    // 4. Grelha Curricular
    const resGrelha = await chamarRPC("cesc_diretor_listar_grelha", { p_token: token });
    if (resGrelha.ok) { grelhaCache = resGrelha.grelha || []; renderizarGrelha(); }
    
    preencherSelects();
}

function mudarAbaAcademico(aba) {
    const ids = { classes: "aba-acad-classes", cursos: "aba-acad-cursos", disciplinas: "aba-acad-disciplinas", grelha: "aba-acad-grelha" };
    const btnIds = { classes: "btn-aba-classes", cursos: "btn-aba-cursos", disciplinas: "btn-aba-disciplinas", grelha: "btn-aba-grelha" };

    Object.keys(ids).forEach(k => {
        const el = document.getElementById(ids[k]);
        if (el) el.style.display = (k === aba) ? "block" : "none";
        
        const btn = document.getElementById(btnIds[k]);
        if (btn) {
            if (k === aba) btn.style.cssText = "background: var(--cor-azul); color: #fff; border: 1px solid var(--cor-azul); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
            else btn.style.cssText = "background: transparent; color: var(--cor-texto-suave); border: 1px solid var(--cor-borda); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
        }
    });
}

function preencherSelects() {
    const selClasse = document.getElementById("gr-classe");
    if (selClasse) {
        selClasse.innerHTML = '<option value="">Escolhe a Classe</option>';
        classesCache.forEach(c => { selClasse.innerHTML += `<option value="${c.id}">${esc(c.nome)}</option>`; });
    }

    const selCurso = document.getElementById("gr-curso");
    if (selCurso) {
        selCurso.innerHTML = '<option value="">Sem Curso (Geral)</option>';
        cursosCache.forEach(c => { selCurso.innerHTML += `<option value="${c.id}">${esc(c.nome)} (${esc(c.sigla)})</option>`; });
    }

    const selDisc = document.getElementById("gr-disciplina");
    if (selDisc) {
        selDisc.innerHTML = '<option value="">Escolhe a Disciplina</option>';
        disciplinasCache.forEach(d => { selDisc.innerHTML += `<option value="${d.id}">${esc(d.nome)}</option>`; });
    }
}

// ============================================================
// GRELHA CURRICULAR
// ============================================================
function renderizarGrelha() {
    const c = document.getElementById("lista-grelha-container");
    if (!c) return;
    if (grelhaCache.length === 0) { c.innerHTML = '<div class="estado-vazio">A grelha está vazia. Adiciona disciplinas às classes/cursos.</div>'; return; }

    const agrupado = {};
    grelhaCache.forEach(item => {
        const classeNome = item.classe_nome;
        const cursoNome = item.curso_nome || "Geral";
        if (!agrupado[classeNome]) agrupado[classeNome] = {};
        if (!agrupado[classeNome][cursoNome]) agrupado[classeNome][cursoNome] = [];
        agrupado[classeNome][cursoNome].push(item);
    });

    let html = "";
    for (const classe in agrupado) {
        html += `<div class="card-info" style="margin-bottom: 20px;">`;
        html += `<h3 style="border-bottom: 2px solid var(--cor-azul); padding-bottom: 8px;"><i class="fas fa-layer-group"></i> ${esc(classe)}</h3>`;
        for (const curso in agrupado[classe]) {
            html += `<div style="margin-top: 12px;">`;
            html += `<h4 style="color: var(--cor-texto-suave); font-size: 0.95rem; margin-bottom: 8px;"><i class="fas fa-bookmark"></i> ${curso === 'Geral' ? 'Tronco Comum' : esc(curso)}</h4>`;
            html += `<div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
            agrupado[classe][curso].forEach(disc => {
                const corCritica = disc.critica ? "border-left: 4px solid #dc2626;" : "border-left: 4px solid #059669;";
                html += `
                <div style="background: #fff; border: 1px solid var(--cor-borda); ${corCritica} border-radius: 6px; padding: 8px 12px; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 0.85rem; font-weight: 600;">${esc(disc.disciplina_nome)}</span>
                    <span class="badge badge-${disc.critica ? 'desistente' : 'activo'}" style="font-size: 0.6rem;">${disc.critica ? 'Crítica' : 'Secund.'}</span>
                    <button onclick="toggleCriticaGrelha('${disc.id}', ${disc.critica})" style="background:none; border:none; cursor:pointer; color: var(--cor-azul);" title="Alternar Crítica"><i class="fas fa-sync"></i></button>
                    <button onclick="apagarGrelha('${disc.id}')" style="background:none; border:none; cursor:pointer; color: var(--cor-erro);" title="Remover"><i class="fas fa-trash"></i></button>
                </div>`;
            });
            html += `</div></div>`;
        }
        html += `</div>`;
    }
    c.innerHTML = html;
}

async function toggleCriticaGrelha(id, atualCritica) {
    const token = obterToken();
    const item = grelhaCache.find(x => x.id === id);
    if (!item) return;
    const res = await chamarRPC("cesc_diretor_guardar_grelha", {
        p_token: token, p_classe_id: item.classe_id, p_curso_id: item.curso_id, p_disciplina_id: item.disciplina_id, p_critica: !atualCritica
    });
    if (res.ok) carregarAcademico();
    else alert(res.erro); // Este é o único alert que deixei por segurança, mas podes remover
}

function apagarGrelha(id) {
    const token = obterToken();
    const html = `<p>Tens a certeza que queres remover esta disciplina da grelha?</p>`;
    abrirModal("Remover Disciplina", html, async function () {
        const res = await chamarRPC("cesc_diretor_apagar_grelha", { p_token: token, p_id: id });
        if (res.ok) { carregarAcademico(); return true; }
        return false;
    }, "Remover");
}

function abrirModalAdicionarGrelha() {
    preencherSelects(); // Garante que os selects estão preenchidos
    const html = `
        <div class="form-grelha">
            <div class="campo-grupo"><label>Classe *</label><select id="gr-classe" class="campo-select"></select></div>
            <div class="campo-grupo"><label>Curso</label><select id="gr-curso" class="campo-select"></select></div>
            <div class="campo-grupo"><label>Disciplina *</label><select id="gr-disciplina" class="campo-select"></select></div>
            <div class="campo-grupo"><label>Tipo *</label>
                <select id="gr-critica" class="campo-select">
                    <option value="false">Secundária</option>
                    <option value="true">Crítica</option>
                </select>
            </div>
        </div>
        <p id="msg-modal-grelha" class="msg-form" style="margin-top:10px; display:none;"></p>
    `;
    abrirModal("Adicionar à Grelha Curricular", html, async function () {
        const msgModal = document.getElementById("msg-modal-grelha");
        msgModal.style.display = "none";
        const token = obterToken();
        const classeId = document.getElementById("gr-classe").value;
        const cursoId = document.getElementById("gr-curso").value || null;
        const discId = document.getElementById("gr-disciplina").value;
        const critica = document.getElementById("gr-critica").value === "true";

        if (!classeId || !discId) {
            mostrarMsg(msgModal, "Escolhe a classe e a disciplina.", "erro");
            msgModal.style.display = "block";
            return false;
        }

        const res = await chamarRPC("cesc_diretor_guardar_grelha", {
            p_token: token, p_classe_id: classeId, p_curso_id: cursoId, p_disciplina_id: discId, p_critica: critica
        });

        if (res.ok) { carregarAcademico(); return true; }
        mostrarMsg(msgModal, res.erro || "Erro ao guardar.", "erro");
        msgModal.style.display = "block";
        return false;
    }, "Adicionar");
}

// ============================================================
// CLASSES
// ============================================================
function renderizarClasses() {
    const c = document.getElementById("lista-classes-container");
    if (!c) return;
    if (classesCache.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem classes.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Ordem</th><th>Nome</th><th>Acções</th></tr></thead><tbody>';
    classesCache.forEach(cls => {
        html += `<tr><td>${cls.ordem}</td><td><strong>${esc(cls.nome)}</strong></td>
            <td>
                <button class="btn-acao btn-acao-secundario" onclick="abrirModalClasse('${cls.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarClasse('${cls.id}')">Apagar</button>
            </td></tr>`;
    });
    html += '</tbody></table></div>';
    c.innerHTML = html;
}

function abrirModalClasse(id = null) {
    const cls = id ? classesCache.find(x => x.id === id) : null;
    const html = `
        <div class="form-grelha">
            <div class="campo-grupo"><label>Nome *</label><input type="text" id="class-nome" value="${cls ? cls.nome : ''}" placeholder="Ex: 10ª Classe"></div>
            <div class="campo-grupo"><label>Ordem *</label><input type="number" id="class-ordem" value="${cls ? cls.ordem : ''}" placeholder="Ex: 10"></div>
        </div>
        <p id="msg-modal-class" class="msg-form" style="display:none;"></p>
    `;
    abrirModal(id ? "Editar Classe" : "Nova Classe", html, async function() {
        const msgModal = document.getElementById("msg-modal-class");
        msgModal.style.display = "none";
        const token = obterToken();
        const nome = document.getElementById("class-nome").value.trim();
        const ordem = parseInt(document.getElementById("class-ordem").value, 10);
        if (!nome || isNaN(ordem)) { mostrarMsg(msgModal, "Preenche todos os campos.", "erro"); msgModal.style.display = "block"; return false; }
        const res = await chamarRPC("cesc_diretor_guardar_classe", { p_token: token, p_id: id, p_nome: nome, p_ordem: ordem });
        if (res.ok) { carregarAcademico(); return true; }
        mostrarMsg(msgModal, res.erro, "erro"); msgModal.style.display = "block"; return false;
    }, "Guardar");
}

function apagarClasse(id) {
    const token = obterToken();
    const html = `<p>Tens a certeza que queres apagar esta classe?</p>`;
    abrirModal("Apagar Classe", html, async function () {
        const res = await chamarRPC("cesc_diretor_apagar_classe", { p_token: token, p_id: id });
        if (res.ok) { carregarAcademico(); return true; }
        return false;
    }, "Apagar");
}

// ============================================================
// CURSOS
// ============================================================
function renderizarCursos() {
    const c = document.getElementById("lista-cursos-container");
    if (!c) return;
    if (cursosCache.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem cursos.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Sigla</th><th>Nome</th><th>Acções</th></tr></thead><tbody>';
    cursosCache.forEach(cur => {
        html += `<tr><td><strong>${esc(cur.sigla)}</strong></td><td>${esc(cur.nome)}</td>
            <td>
                <button class="btn-acao btn-acao-secundario" onclick="abrirModalCurso('${cur.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarCurso('${cur.id}')">Apagar</button>
            </td></tr>`;
    });
    html += '</tbody></table></div>';
    c.innerHTML = html;
}

function abrirModalCurso(id = null) {
    const cur = id ? cursosCache.find(x => x.id === id) : null;
    const html = `
        <div class="form-grelha">
            <div class="campo-grupo"><label>Nome *</label><input type="text" id="cur-nome" value="${cur ? cur.nome : ''}" placeholder="Ex: Ciências Físicas e Biológicas"></div>
            <div class="campo-grupo"><label>Sigla *</label><input type="text" id="cur-sigla" value="${cur ? cur.sigla : ''}" placeholder="Ex: C.F.B"></div>
        </div>
        <p id="msg-modal-cur" class="msg-form" style="display:none;"></p>
    `;
    abrirModal(id ? "Editar Curso" : "Novo Curso", html, async function() {
        const msgModal = document.getElementById("msg-modal-cur");
        msgModal.style.display = "none";
        const token = obterToken();
        const nome = document.getElementById("cur-nome").value.trim();
        const sigla = document.getElementById("cur-sigla").value.trim();
        if (!nome || !sigla) { mostrarMsg(msgModal, "Preenche todos os campos.", "erro"); msgModal.style.display = "block"; return false; }
        const res = await chamarRPC("cesc_diretor_guardar_curso", { p_token: token, p_id: id, p_nome: nome, p_sigla: sigla });
        if (res.ok) { carregarAcademico(); return true; }
        mostrarMsg(msgModal, res.erro, "erro"); msgModal.style.display = "block"; return false;
    }, "Guardar");
}

function apagarCurso(id) {
    const token = obterToken();
    const html = `<p>Tens a certeza que queres apagar este curso?</p>`;
    abrirModal("Apagar Curso", html, async function () {
        const res = await chamarRPC("cesc_diretor_apagar_curso", { p_token: token, p_id: id });
        if (res.ok) { carregarAcademico(); return true; }
        return false;
    }, "Apagar");
}

// ============================================================
// DISCIPLINAS
// ============================================================
function renderizarDisciplinas() {
    const c = document.getElementById("lista-disciplinas-container");
    if (!c) return;
    if (disciplinasCache.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem disciplinas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Nome</th><th>Acções</th></tr></thead><tbody>';
    disciplinasCache.forEach(d => {
        html += `<tr><td><strong>${esc(d.nome)}</strong></td>
            <td>
                <button class="btn-acao btn-acao-secundario" onclick="abrirModalDisciplina('${d.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarDisciplina('${d.id}')">Apagar</button>
            </td></tr>`;
    });
    html += '</tbody></table></div>';
    c.innerHTML = html;
}

function abrirModalDisciplina(id = null) {
    const disc = id ? disciplinasCache.find(x => x.id === id) : null;
    const html = `
        <div class="form-grelha">
            <div class="campo-grupo"><label>Nome *</label><input type="text" id="disc-nome" value="${disc ? disc.nome : ''}" placeholder="Ex: Matemática"></div>
        </div>
        <p id="msg-modal-disc" class="msg-form" style="display:none;"></p>
    `;
    abrirModal(id ? "Editar Disciplina" : "Nova Disciplina", html, async function() {
        const msgModal = document.getElementById("msg-modal-disc");
        msgModal.style.display = "none";
        const token = obterToken();
        const nome = document.getElementById("disc-nome").value.trim();
        if (!nome) { mostrarMsg(msgModal, "Preenche o nome.", "erro"); msgModal.style.display = "block"; return false; }
        const res = await chamarRPC("cesc_diretor_guardar_disciplina", { p_token: token, p_id: id, p_nome: nome, p_critica: false });
        if (res.ok) { carregarAcademico(); return true; }
        mostrarMsg(msgModal, res.erro, "erro"); msgModal.style.display = "block"; return false;
    }, "Guardar");
}

function apagarDisciplina(id) {
    const token = obterToken();
    const html = `<p>Tens a certeza que queres apagar esta disciplina?</p>`;
    abrirModal("Apagar Disciplina", html, async function () {
        const res = await chamarRPC("cesc_diretor_apagar_disciplina", { p_token: token, p_id: id });
        if (res.ok) { carregarAcademico(); return true; }
        return false;
    }, "Apagar");
}