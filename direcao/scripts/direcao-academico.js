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
// GRELHA CURRICULAR (Responsiva)
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
        html += `<div class="card-info" style="margin-bottom: 20px; padding: 16px;">`;
        html += `<h3 style="border-bottom: 2px solid var(--cor-azul); padding-bottom: 8px; margin-bottom: 16px; font-size: 1.1rem;"><i class="fas fa-layer-group"></i> ${esc(classe)}</h3>`;
        
        for (const curso in agrupado[classe]) {
            html += `<div style="margin-bottom: 16px;">`;
            html += `<h4 style="color: var(--cor-texto-suave); font-size: 0.85rem; margin-bottom: 8px; background: #f8fafc; padding: 6px 10px; border-radius: 6px;"><i class="fas fa-bookmark"></i> ${curso === 'Geral' ? 'Tronco Comum' : esc(curso)}</h4>`;
            
            html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;
            
            agrupado[classe][curso].forEach(disc => {
                const badgeClass = disc.critica ? 'badge-desistente' : 'badge-activo';
                const badgeText = disc.critica ? 'Crítica' : 'Secundária';
                
                // Em vez de tabela, usamos linhas flexíveis (funciona bem em mobile e desktop)
                html += `<div style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid var(--cor-borda); border-left: 4px solid ${disc.critica ? '#dc2626' : '#059669'}; border-radius: 6px; padding: 10px 12px; flex-wrap: wrap; gap: 8px;">`;
                html += `  <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 150px;">`;
                html += `    <strong style="font-size: 0.9rem;">${esc(disc.disciplina_nome)}</strong>`;
                html += `    <span class="badge ${badgeClass}" style="font-size: 0.65rem;">${badgeText}</span>`;
                html += `  </div>`;
                html += `  <div style="display: flex; gap: 6px;">`;
                html += `    <button class="btn-acao btn-acao-secundario" style="font-size: 0.75rem; padding: 4px 8px;" onclick="toggleCriticaGrelha('${disc.id}', ${disc.critica})"><i class="fas fa-pen"></i> Alternar</button>`;
                html += `    <button class="btn-acao btn-acao-secundario" style="font-size: 0.75rem; padding: 4px 8px; color: var(--cor-erro); border-color: var(--cor-erro);" onclick="apagarGrelha('${disc.id}')"><i class="fas fa-trash"></i></button>`;
                html += `  </div>`;
                html += `</div>`;
            });
            
            html += `</div>`; // fim do flex column
            html += `</div>`; // fim do bloco do curso
        }
        html += `</div>`; // fim do card-info da classe
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
    else alert(res.erro);
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
    let opcoesClasses = '<option value="">Escolhe a Classe</option>';
    classesCache.forEach(c => { opcoesClasses += `<option value="${c.id}">${esc(c.nome)}</option>`; });

    let opcoesCursos = '<option value="">Sem Curso (Geral)</option>';
    cursosCache.forEach(c => { opcoesCursos += `<option value="${c.id}">${esc(c.nome)} (${esc(c.sigla)})</option>`; });

    let opcoesDisciplinas = '<option value="">Escolhe a Disciplina</option>';
    disciplinasCache.forEach(d => { opcoesDisciplinas += `<option value="${d.id}">${esc(d.nome)}</option>`; });

    const htmlCorpo = `
        <div class="form-grelha">
            <div class="campo-grupo">
                <label>Classe *</label>
                <select id="gr-classe" class="campo-select">${opcoesClasses}</select>
            </div>
            <div class="campo-grupo">
                <label>Curso</label>
                <select id="gr-curso" class="campo-select">${opcoesCursos}</select>
            </div>
            <div class="campo-grupo">
                <label>Disciplina *</label>
                <select id="gr-disciplina" class="campo-select">${opcoesDisciplinas}</select>
            </div>
            <div class="campo-grupo">
                <label>Tipo *</label>
                <select id="gr-critica" class="campo-select">
                    <option value="false">Secundária</option>
                    <option value="true">Crítica</option>
                </select>
            </div>
        </div>
        <p id="msg-modal-grelha" class="msg-form" style="margin-top:10px; display:none;"></p>
    `;

    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;

    document.getElementById("modal-titulo").textContent = "Adicionar à Grelha Curricular";
    document.getElementById("modal-corpo").innerHTML = htmlCorpo;
    
    const btnConfirmar = document.getElementById("modal-confirmar");
    const btnCancelar = document.getElementById("modal-cancelar");
    
    btnConfirmar.style.display = "block";
    btnConfirmar.textContent = "Adicionar";
    
    const novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);
    
    novoBtn.addEventListener("click", async function () {
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
            return;
        }

        novoBtn.disabled = true;
        novoBtn.textContent = "A guardar...";

        const res = await chamarRPC("cesc_diretor_guardar_grelha", {
            p_token: token, p_classe_id: classeId, p_curso_id: cursoId, p_disciplina_id: discId, p_critica: critica
        });

        novoBtn.disabled = false;
        novoBtn.textContent = "Adicionar";

        if (res.ok) {
            overlay.style.display = "none";
            carregarAcademico();
        } else {
            mostrarMsg(msgModal, res.erro || "Erro ao guardar.", "erro");
            msgModal.style.display = "block";
        }
    });

    btnCancelar.onclick = function() { overlay.style.display = "none"; };
    document.getElementById("modal-fechar").onclick = function() { overlay.style.display = "none"; };

    overlay.style.display = "flex";
}

// ============================================================
// CLASSES (Responsivo)
// ============================================================
function renderizarClasses() {
    const c = document.getElementById("lista-classes-container");
    if (!c) return;
    if (classesCache.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem classes.</div>'; return; }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    classesCache.forEach(cls => {
        html += `<div style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid var(--cor-borda); border-radius: 6px; padding: 12px; flex-wrap: wrap; gap: 8px;">`;
        html += `  <div style="display: flex; align-items: center; gap: 12px;">`;
        html += `    <span style="background: var(--cor-azul-muito-claro); color: var(--cor-azul); font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem;">Ordem: ${cls.ordem}</span>`;
        html += `    <strong style="font-size: 0.95rem;">${esc(cls.nome)}</strong>`;
        html += `  </div>`;
        html += `  <div style="display: flex; gap: 6px;">`;
        html += `    <button class="btn-acao btn-acao-secundario" style="font-size:0.8rem; padding: 4px 10px;" onclick="abrirModalClasse('${cls.id}')">Editar</button>`;
        html += `    <button class="btn-acao btn-acao-secundario" style="font-size:0.8rem; padding: 4px 10px; color:var(--cor-erro); border-color:var(--cor-erro);" onclick="apagarClasse('${cls.id}')">Apagar</button>`;
        html += `  </div>`;
        html += `</div>`;
    });
    html += '</div>';
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
// CURSOS (Responsivo)
// ============================================================
function renderizarCursos() {
    const c = document.getElementById("lista-cursos-container");
    if (!c) return;
    if (cursosCache.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem cursos.</div>'; return; }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    cursosCache.forEach(cur => {
        html += `<div style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid var(--cor-borda); border-radius: 6px; padding: 12px; flex-wrap: wrap; gap: 8px;">`;
        html += `  <div style="display: flex; align-items: center; gap: 12px;">`;
        html += `    <span style="background: #fef3c7; color: #92400e; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem;">${esc(cur.sigla)}</span>`;
        html += `    <strong style="font-size: 0.95rem;">${esc(cur.nome)}</strong>`;
        html += `  </div>`;
        html += `  <div style="display: flex; gap: 6px;">`;
        html += `    <button class="btn-acao btn-acao-secundario" style="font-size:0.8rem; padding: 4px 10px;" onclick="abrirModalCurso('${cur.id}')">Editar</button>`;
        html += `    <button class="btn-acao btn-acao-secundario" style="font-size:0.8rem; padding: 4px 10px; color:var(--cor-erro); border-color:var(--cor-erro);" onclick="apagarCurso('${cur.id}')">Apagar</button>`;
        html += `  </div>`;
        html += `</div>`;
    });
    html += '</div>';
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
// DISCIPLINAS (Responsivo)
// ============================================================
function renderizarDisciplinas() {
    const c = document.getElementById("lista-disciplinas-container");
    if (!c) return;
    if (disciplinasCache.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem disciplinas.</div>'; return; }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    disciplinasCache.forEach(d => {
        html += `<div style="display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid var(--cor-borda); border-radius: 6px; padding: 12px; flex-wrap: wrap; gap: 8px;">`;
        html += `  <strong style="font-size: 0.95rem;">${esc(d.nome)}</strong>`;
        html += `  <div style="display: flex; gap: 6px;">`;
        html += `    <button class="btn-acao btn-acao-secundario" style="font-size:0.8rem; padding: 4px 10px;" onclick="abrirModalDisciplina('${d.id}')">Editar</button>`;
        html += `    <button class="btn-acao btn-acao-secundario" style="font-size:0.8rem; padding: 4px 10px; color:var(--cor-erro); border-color:var(--cor-erro);" onclick="apagarDisciplina('${d.id}')">Apagar</button>`;
        html += `  </div>`;
        html += `</div>`;
    });
    html += '</div>';
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
