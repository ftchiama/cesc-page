/*
 CESC — Direcção · AURA
 */

let regrasAuraCache = [];
let alocacoesAuraCache = [];

async function carregarAuraDir() {
    const token = obterToken();
    if (!token) return;

    // 1. CARREGAR REGRAS
    const containerRegras = document.getElementById("lista-regras-aura");
    containerRegras.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const resRegras = await chamarRPC("cesc_diretor_listar_regras_aura", { p_token: token, p_ano_lectivo: "2026/2027" });
    if (resRegras.ok) {
        regrasAuraCache = resRegras.regras || [];
        renderizarRegrasAura(regrasAuraCache);
        document.getElementById("stat-total-regras").textContent = regrasAuraCache.length;
    } else {
        containerRegras.innerHTML = '<div class="estado-vazio">' + esc(resRegras.erro) + '</div>';
    }

    // 2. CARREGAR ALOCAÇÕES
    const selAno = document.getElementById("filtro-aura-ano-alocacao");
    if (selAno && !selAno.value) {
        selAno.innerHTML = '<option value="2026/2027">2026/2027</option>';
    }
    const anoAloc = selAno ? selAno.value : "2026/2027";
    
    const containerAloc = document.getElementById("lista-alocacoes-aura");
    containerAloc.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const resAloc = await chamarRPC("cesc_aura_listar_alocacoes", { p_token: token, p_ano_lectivo: anoAloc });
    if (resAloc.ok) {
        alocacoesAuraCache = resAloc.alocacoes || [];
        renderizarAlocacoesAura(alocacoesAuraCache);
        document.getElementById("stat-total-alocacoes").textContent = alocacoesAuraCache.length;
    } else {
        containerAloc.innerHTML = '<div class="estado-vazio">' + esc(resAloc.erro) + '</div>';
    }

    // 3. EVENTOS
    if (!window.auraLigado) {
        window.auraLigado = true;
        
        const selAnoAloc = document.getElementById("filtro-aura-ano-alocacao");
        if (selAnoAloc) selAnoAloc.addEventListener("change", carregarAuraDir);

        // Botão JUIZ (usando modal de confirmação)
        document.getElementById("btn-executar-juiz").addEventListener("click", function () {
            const html = `<p>Executar o <strong>JUIZ</strong>? Isto vai avaliar todos os alunos e marcá-los como aprovados ou reprovados.</p>`;
            abrirModal("Confirmar JUIZ", html, async function () {
                await executarAura("cesc_aura_julgar", "JUIZ");
                return true; // Fecha o modal após execução
            }, "Confirmar");
        });

        // Botão DISTRIBUIDOR (usando modal de confirmação)
        document.getElementById("btn-executar-distribuidor").addEventListener("click", function () {
            const html = `<p>Executar o <strong>DISTRIBUIDOR</strong>? Isto vai colocar os alunos aprovados nas salas alocadas.</p>`;
            abrirModal("Confirmar DISTRIBUIDOR", html, async function () {
                await executarAura("cesc_aura_distribuir", "DISTRIBUIDOR");
                return true; // Fecha o modal após execução
            }, "Confirmar");
        });
    }
}

async function executarAura(rpcName, titulo) {
    const btn = document.getElementById("btn-executar-" + (rpcName === "cesc_aura_julgar" ? "juiz" : "distribuidor"));
    const msg = document.getElementById("msg-executar-aura");
    const txtOriginal = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A processar...';
    msg.textContent = "";
    msg.className = "msg-form";

    const res = await chamarRPC(rpcName, { p_token: obterToken(), p_ano_lectivo: "2026/2027" });

    btn.disabled = false;
    btn.innerHTML = txtOriginal;

    if (res.ok) {
        msg.className = "msg-form sucesso";
        if (rpcName === "cesc_aura_julgar") {
            msg.textContent = `${titulo} concluído! Total: ${res.total}, Aprovados: ${res.aprovados}, Reprovados: ${res.reprovados}.`;
        } else {
            msg.textContent = `${titulo} concluído! Alunos distribuídos: ${res.distribuidos}.`;
        }
    } else {
        msg.className = "msg-form erro";
        msg.textContent = res.erro || "Erro ao executar " + titulo + ".";
    }
}

function mostrarMsgAura(msgEl, texto, tipo) {
    if (!msgEl) return;
    msgEl.textContent = texto;
    msgEl.className = "msg-form " + (tipo || "erro");
    if (tipo === "sucesso") {
        setTimeout(() => { msgEl.className = "msg-form"; msgEl.textContent = ""; }, 3000);
    }
}

function mudarAbaAura(aba) {
    const abaRegras = document.getElementById("aba-aura-regras");
    const abaAloc = document.getElementById("aba-aura-alocacao");
    const btnRegras = document.getElementById("btn-aba-regras");
    const btnAloc = document.getElementById("btn-aba-alocacao");

    if (aba === "regras") {
        abaRegras.style.display = "block";
        abaAloc.style.display = "none";
        btnRegras.style.color = "var(--cor-azul)";
        btnRegras.style.borderColor = "var(--cor-azul)";
        btnAloc.style.color = "var(--cor-texto-suave)";
        btnAloc.style.borderColor = "var(--cor-borda)";
    } else {
        abaRegras.style.display = "none";
        abaAloc.style.display = "block";
        btnRegras.style.color = "var(--cor-texto-suave)";
        btnRegras.style.borderColor = "var(--cor-borda)";
        btnAloc.style.color = "var(--cor-azul)";
        btnAloc.style.borderColor = "var(--cor-azul)";
    }
}

// ============================================================
// REGRAS
// ============================================================
function renderizarRegrasAura(regras) {
    const c = document.getElementById("lista-regras-aura");
    if (regras.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem regras definidas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Classe / Curso</th><th>Máx. Críticas</th><th>Máx. Secundárias</th><th>Acção</th></tr></thead><tbody>';
    regras.forEach((r, idx) => {
        let nome = r.classe + (r.curso ? ' (' + r.curso + ')' : '');
        html += `<tr>
            <td><strong>${esc(nome)}</strong></td>
            <td><input type="number" id="regra-crit-${idx}" class="campo-input" style="width:80px; padding:4px;" value="${r.max_criticas}"></td>
            <td><input type="number" id="regra-sec-${idx}" class="campo-input" style="width:80px; padding:4px;" value="${r.max_secundarias}"></td>
            <td><button class="btn-acao btn-acao-primario" onclick="guardarRegraAura(${idx})"><i class="fas fa-save"></i></button></td>
        </tr>`;
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    regras.forEach((r, idx) => {
        let nome = r.classe + (r.curso ? ' (' + r.curso + ')' : '');
        html += `<div class="cartao-sec">
            <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>${esc(nome)}</strong></div></div>
            <div class="cartao-sec-meta">
                <div class="meta-item"><span class="meta-rotulo">Máx. Críticas</span><input type="number" id="regra-crit-m-${idx}" class="campo-input" style="width:60px; padding:4px;" value="${r.max_criticas}"></div>
                <div class="meta-item"><span class="meta-rotulo">Máx. Secundárias</span><input type="number" id="regra-sec-m-${idx}" class="campo-input" style="width:60px; padding:4px;" value="${r.max_secundarias}"></div>
            </div>
            <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-primario" onclick="guardarRegraAuraMobile(${idx})"><i class="fas fa-save"></i> Guardar</button></div>
        </div>`;
    });
    html += '</div>';

    c.innerHTML = html;
}

async function guardarRegraAura(idx) {
    const token = obterToken();
    const regra = regrasAuraCache[idx];
    const crit = parseInt(document.getElementById("regra-crit-" + idx).value, 10);
    const sec = parseInt(document.getElementById("regra-sec-" + idx).value, 10);

    const res = await chamarRPC("cesc_diretor_atualizar_regra_aura", {
        p_token: token, p_regra_id: regra.id, p_max_crit: crit, p_max_sec: sec
    });
    
    const msg = document.getElementById("msg-executar-aura");
    if (res.ok) mostrarMsgAura(msg, "Regra guardada com sucesso.", "sucesso");
    else mostrarMsgAura(msg, res.erro || "Erro ao guardar regra.", "erro");
}

async function guardarRegraAuraMobile(idx) {
    const token = obterToken();
    const regra = regrasAuraCache[idx];
    const crit = parseInt(document.getElementById("regra-crit-m-" + idx).value, 10);
    const sec = parseInt(document.getElementById("regra-sec-m-" + idx).value, 10);

    const res = await chamarRPC("cesc_diretor_atualizar_regra_aura", {
        p_token: token, p_regra_id: regra.id, p_max_crit: crit, p_max_sec: sec
    });
    
    const msg = document.getElementById("msg-executar-aura");
    if (res.ok) mostrarMsgAura(msg, "Regra guardada com sucesso.", "sucesso");
    else mostrarMsgAura(msg, res.erro || "Erro ao guardar regra.", "erro");
}

// ============================================================
// ALOCAÇÃO
// ============================================================
function renderizarAlocacoesAura(alocacoes) {
    const c = document.getElementById("lista-alocacoes-aura");
    if (alocacoes.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem alocações definidas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Turno</th><th>Pavilhão</th><th>Salas</th><th>Classe / Curso</th></tr></thead><tbody>';
    alocacoes.forEach(a => {
        let salas = a.sala_inicio === a.sala_fim ? `Sala ${a.sala_inicio}` : `Salas ${a.sala_inicio} a ${a.sala_fim}`;
        let classe = a.classe + (a.curso ? ' (' + a.curso + ')' : '');
        html += `<tr>
            <td>${esc(a.turno)}</td>
            <td>${esc(a.pavilhao)}</td>
            <td>${esc(salas)}</td>
            <td>${esc(classe)}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    alocacoes.forEach(a => {
        let salas = a.sala_inicio === a.sala_fim ? `Sala ${a.sala_inicio}` : `Salas ${a.sala_inicio} a ${a.sala_fim}`;
        let classe = a.classe + (a.curso ? ' (' + a.curso + ')' : '');
        html += `<div class="cartao-sec">
            <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>${esc(classe)}</strong></div></div>
            <div class="cartao-sec-meta">
                <div class="meta-item"><span class="meta-rotulo">Turno</span><span class="meta-valor">${esc(a.turno)}</span></div>
                <div class="meta-item"><span class="meta-rotulo">Pavilhão</span><span class="meta-valor">${esc(a.pavilhao)}</span></div>
                <div class="meta-item"><span class="meta-rotulo">Salas</span><span class="meta-valor">${esc(salas)}</span></div>
            </div>
        </div>`;
    });
    html += '</div>';

    c.innerHTML = html;
}

function abrirModalNovaAlocacao() {
    const token = obterToken();
    const ano = document.getElementById("filtro-aura-ano-alocacao")?.value || "2026/2027";
    
    const html = `
        <p>Define quais salas pertencem a qual classe/curso.</p>
        <div class="form-grelha">
            <div class="campo-grupo">
                <label>Turno *</label>
                <select id="aloc-turno" class="campo-select">
                    <option value="Matinal">Matinal</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Noturno">Noturno</option>
                </select>
            </div>
            <div class="campo-grupo">
                <label>Pavilhão *</label>
                <input type="text" id="aloc-pavilhao" placeholder="Ex: Pavilhão 1">
            </div>
            <div class="campo-grupo">
                <label>Sala Início *</label>
                <input type="number" id="aloc-sala-inicio" value="1" min="1">
            </div>
            <div class="campo-grupo">
                <label>Sala Fim *</label>
                <input type="number" id="aloc-sala-fim" value="1" min="1">
            </div>
            <div class="campo-grupo">
                <label>Classe *</label>
                <input type="text" id="aloc-classe" placeholder="Ex: 10ª Classe">
            </div>
            <div class="campo-grupo">
                <label>Curso</label>
                <input type="text" id="aloc-curso" placeholder="Ex: C.F.B">
            </div>
        </div>
        <p id="msg-modal-alocacao" class="msg-form" style="margin-top:10px;"></p>
    `;

    abrirModal("Nova Alocação de Sala", html, async function () {
        const msgModal = document.getElementById("msg-modal-alocacao");
        const turno = document.getElementById("aloc-turno").value;
        const pavilhao = document.getElementById("aloc-pavilhao").value.trim();
        const sala_inicio = parseInt(document.getElementById("aloc-sala-inicio").value, 10);
        const sala_fim = parseInt(document.getElementById("aloc-sala-fim").value, 10);
        const classe = document.getElementById("aloc-classe").value.trim();
        const curso = document.getElementById("aloc-curso").value.trim() || null;

        if (!pavilhao || !classe || !sala_inicio || !sala_fim) {
            mostrarMsgAura(msgModal, "Preenche todos os campos obrigatórios.", "erro");
            return false;
        }

        const res = await chamarRPC("cesc_aura_guardar_alocacao", {
            p_token: token,
            p_ano_lectivo: ano,
            p_turno: turno,
            p_pavilhao: pavilhao,
            p_sala_inicio: sala_inicio,
            p_sala_fim: sala_fim,
            p_classe: classe,
            p_curso: curso
        });

        if (res.ok) {
            carregarAuraDir();
            // Fecha o modal após sucesso
            return true;
        } else {
            mostrarMsgAura(msgModal, res.erro || "Erro ao guardar alocação.", "erro");
            return false; // Mantém o modal aberto para o utilizador corrigir
        }
    }, "Guardar Alocação");
}

function abrirModalNovaRegra() {
    const html = `
        <p>Define os limites de negativas para aprovação.</p>
        <div class="form-grelha">
            <div class="campo-grupo"><label>Classe *</label><input type="text" id="reg-classe" placeholder="Ex: 10ª Classe"></div>
            <div class="campo-grupo"><label>Curso</label><input type="text" id="reg-curso" placeholder="Ex: C.F.B"></div>
            <div class="campo-grupo"><label>Máx. Negativas Críticas</label><input type="number" id="reg-crit" value="0" min="0"></div>
            <div class="campo-grupo"><label>Máx. Negativas Secundárias</label><input type="number" id="reg-sec" value="2" min="0"></div>
        </div>
        <p id="msg-modal-regra" class="msg-form" style="margin-top:10px;"></p>
    `;
    abrirModal("Nova Regra de Aprovação", html, async function() {
        const msgModal = document.getElementById("msg-modal-regra");
        const token = obterToken();
        const classe = document.getElementById("reg-classe").value.trim();
        const curso = document.getElementById("reg-curso").value.trim() || null;
        const crit = parseInt(document.getElementById("reg-crit").value, 10);
        const sec = parseInt(document.getElementById("reg-sec").value, 10);

        if (!classe) { 
            mostrarMsgAura(msgModal, "Indica a classe.", "erro");
            return false; 
        }

        const res = await chamarRPC("cesc_aura_guardar_regra", {
            p_token: token,
            p_classe: classe,
            p_curso: curso,
            p_max_criticas: crit,
            p_max_secundarias: sec
        });
        
        if (res.ok) { 
            carregarAuraDir(); 
            return true; 
        }
        mostrarMsgAura(msgModal, res.erro || "Erro ao guardar regra.", "erro"); 
        return false;
    }, "Guardar Regra");
}