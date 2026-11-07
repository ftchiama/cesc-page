let classesCache = [];
let cursosCache = [];
let disciplinasCache = [];

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
}

function mudarAbaAcademico(aba) {
    document.querySelectorAll("#seccao-academico .pagina-seccao").forEach(s => s.style.display = "none");
    // Usar os IDs certos
    const ids = { classes: "aba-acad-classes", cursos: "aba-acad-cursos", disciplinas: "aba-acad-disciplinas" };
    const btnIds = { classes: "btn-aba-classes", cursos: "btn-aba-cursos", disciplinas: "btn-aba-disciplinas" };

    Object.keys(ids).forEach(k => {
        document.getElementById(ids[k]).style.display = (k === aba) ? "block" : "none";
        const btn = document.getElementById(btnIds[k]);
        if (btn) {
            if (k === aba) btn.style.cssText = "background: var(--cor-azul); color: #fff; border: 1px solid var(--cor-azul); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
            else btn.style.cssText = "background: transparent; color: var(--cor-texto-suave); border: 1px solid var(--cor-borda); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
        }
    });
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
        html += `<tr>
            <td>${cls.ordem}</td>
            <td><strong>${esc(cls.nome)}</strong></td>
            <td>
                <button class="btn-acao btn-acao-secundario" onclick="editarClasse('${cls.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarClasse('${cls.id}')">Apagar</button>
            </td>
        </tr>`;
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
        const token = obterToken();
        const nome = document.getElementById("class-nome").value.trim();
        const ordem = parseInt(document.getElementById("class-ordem").value, 10);
        if (!nome || isNaN(ordem)) { mostrarMsg(msgModal, "Preenche todos os campos.", "erro"); msgModal.style.display = "block"; return false; }
        
        const res = await chamarRPC("cesc_diretor_guardar_classe", { p_token: token, p_id: id, p_nome: nome, p_ordem: ordem });
        if (res.ok) { carregarAcademico(); return true; }
        mostrarMsg(msgModal, res.erro, "erro"); msgModal.style.display = "block"; return false;
    }, "Guardar");
}

function editarClasse(id) { abrirModalClasse(id); }

async function apagarClasse(id) {
    const token = obterToken();
    const res = await chamarRPC("cesc_diretor_apagar_classe", { p_token: token, p_id: id });
    if (res.ok) carregarAcademico();
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
        html += `<tr>
            <td><strong>${esc(cur.sigla)}</strong></td>
            <td>${esc(cur.nome)}</td>
            <td>
                <button class="btn-acao btn-acao-secundario" onclick="editarCurso('${cur.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarCurso('${cur.id}')">Apagar</button>
            </td>
        </tr>`;
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
        const token = obterToken();
        const nome = document.getElementById("cur-nome").value.trim();
        const sigla = document.getElementById("cur-sigla").value.trim();
        if (!nome || !sigla) { mostrarMsg(msgModal, "Preenche todos os campos.", "erro"); msgModal.style.display = "block"; return false; }
        
        const res = await chamarRPC("cesc_diretor_guardar_curso", { p_token: token, p_id: id, p_nome: nome, p_sigla: sigla });
        if (res.ok) { carregarAcademico(); return true; }
        mostrarMsg(msgModal, res.erro, "erro"); msgModal.style.display = "block"; return false;
    }, "Guardar");
}

function editarCurso(id) { abrirModalCurso(id); }

async function apagarCurso(id) {
    const token = obterToken();
    const res = await chamarRPC("cesc_diretor_apagar_curso", { p_token: token, p_id: id });
    if (res.ok) carregarAcademico();
}

// ============================================================
// DISCIPLINAS
// ============================================================
function renderizarDisciplinas() {
    const c = document.getElementById("lista-disciplinas-container");
    if (!c) return;
    if (disciplinasCache.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem disciplinas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Nome</th><th>Tipo</th><th>Acções</th></tr></thead><tbody>';
    disciplinasCache.forEach(d => {
        html += `<tr>
            <td><strong>${esc(d.nome)}</strong></td>
            <td><span class="badge badge-${d.critica ? 'desistente' : 'activo'}">${d.critica ? 'Crítica' : 'Secundária'}</span></td>
            <td>
                <button class="btn-acao btn-acao-secundario" onclick="editarDisciplina('${d.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarDisciplina('${d.id}')">Apagar</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    c.innerHTML = html;
}

function abrirModalDisciplina(id = null) {
    const disc = id ? disciplinasCache.find(x => x.id === id) : null;
    const html = `
        <div class="form-grelha">
            <div class="campo-grupo"><label>Nome *</label><input type="text" id="disc-nome" value="${disc ? disc.nome : ''}" placeholder="Ex: Matemática"></div>
            <div class="campo-grupo"><label>Tipo *</label>
                <select id="disc-critica" class="campo-select">
                    <option value="true" ${disc && disc.critica ? 'selected' : ''}>Crítica</option>
                    <option value="false" ${disc && !disc.critica ? 'selected' : ''}>Secundária</option>
                </select>
            </div>
        </div>
        <p id="msg-modal-disc" class="msg-form" style="display:none;"></p>
    `;
    abrirModal(id ? "Editar Disciplina" : "Nova Disciplina", html, async function() {
        const msgModal = document.getElementById("msg-modal-disc");
        const token = obterToken();
        const nome = document.getElementById("disc-nome").value.trim();
        const critica = document.getElementById("disc-critica").value === "true";
        if (!nome) { mostrarMsg(msgModal, "Preenche o nome.", "erro"); msgModal.style.display = "block"; return false; }
        
        const res = await chamarRPC("cesc_diretor_guardar_disciplina", { p_token: token, p_id: id, p_nome: nome, p_critica: critica });
        if (res.ok) { carregarAcademico(); return true; }
        mostrarMsg(msgModal, res.erro, "erro"); msgModal.style.display = "block"; return false;
    }, "Guardar");
}

function editarDisciplina(id) { abrirModalDisciplina(id); }

async function apagarDisciplina(id) {
    const token = obterToken();
    const res = await chamarRPC("cesc_diretor_apagar_disciplina", { p_token: token, p_id: id });
    if (res.ok) carregarAcademico();
}