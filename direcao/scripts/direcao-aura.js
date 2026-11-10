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
    if (containerRegras) {
        containerRegras.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';
        const resRegras = await chamarRPC("cesc_diretor_listar_regras_aura", { p_token: token, p_ano_lectivo: "2026/2027" });
        if (resRegras.ok) {
            regrasAuraCache = resRegras.regras || [];
            renderizarRegrasAura(regrasAuraCache);
            const statRegras = document.getElementById("stat-total-regras");
            if (statRegras) statRegras.textContent = regrasAuraCache.length;
        } else {
            containerRegras.innerHTML = '<div class="estado-vazio">' + esc(resRegras.erro) + '</div>';
        }
    }

    // 2. CARREGAR ALOCAÇÕES
    const selAno = document.getElementById("filtro-aura-ano-alocacao");
    if (selAno && !selAno.value) {
        selAno.innerHTML = '<option value="2026/2027">2026/2027</option>';
    }
    const anoAloc = selAno ? selAno.value : "2026/2027";
    
    const containerAloc = document.getElementById("lista-alocacoes-aura");
    if (containerAloc) {
        containerAloc.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';
        const resAloc = await chamarRPC("cesc_diretor_listar_alocacoes", { p_token: token, p_ano_lectivo: anoAloc });
        if (resAloc.ok) {
            alocacoesAuraCache = resAloc.alocacoes || [];
            renderizarAlocacoesAura(alocacoesAuraCache);
            const statAloc = document.getElementById("stat-total-alocacoes");
            if (statAloc) statAloc.textContent = alocacoesAuraCache.length;
        } else {
            containerAloc.innerHTML = '<div class="estado-vazio">' + esc(resAloc.erro) + '</div>';
        }
    }

    // 3. EVENTOS
    if (!window.auraLigado) {
        window.auraLigado = true;
        
        const selAnoAloc = document.getElementById("filtro-aura-ano-alocacao");
        if (selAnoAloc) selAnoAloc.addEventListener("change", carregarAuraDir);

        // Botão JUIZ
        const btnJuiz = document.getElementById("btn-executar-juiz");
        if (btnJuiz) {
            btnJuiz.addEventListener("click", function () {
                abrirModal("Confirmar JUIZ", "<p>Executar o JUIZ? Isto vai avaliar as notas.</p>", async function() {
                    await executarAura("cesc_aura_julgar", "JUIZ");
                    return true;
                }, "Confirmar");
            });
        }

        // Botão DISTRIBUIDOR
        const btnDist = document.getElementById("btn-executar-distribuidor");
        if (btnDist) {
            btnDist.addEventListener("click", function () {
                abrirModal("Confirmar DISTRIBUIDOR", "<p>Executar o DISTRIBUIDOR? Isto vai colocar os alunos nas salas.</p>", async function() {
                    await executarAura("cesc_aura_distribuir", "DISTRIBUIDOR");
                    return true;
                }, "Confirmar");
            });
        }

        // Botão TRANSIÇÃO
        const btnTransicao = document.getElementById("btn-executar-transicao");
        if (btnTransicao) {
            btnTransicao.addEventListener("click", function () {
                const htmlModal = `
                    <p>Vais preparar os alunos para o próximo ano letivo.</p>
                    <div class="campo-grupo">
                        <label>Ano Letivo Atual</label>
                        <input type="text" id="trans-ano-atual" value="2026/2027" placeholder="Ex: 2026/2027">
                    </div>
                    <div class="campo-grupo">
                        <label>Novo Ano Letivo</label>
                        <input type="text" id="trans-ano-novo" value="2027/2028" placeholder="Ex: 2027/2028">
                    </div>
                    <p style="font-size:0.8rem; color:#64748b; margin-top:8px;">Os alunos da 9ª e 12ª não transitam automaticamente (concluem o ciclo).</p>
                    <p id="msg-transicao-modal" class="msg-form" style="margin-top:10px; display:none;"></p>
                `;

                abrirModal("Executar Transição de Ano", htmlModal, async function () {
                    const msg = document.getElementById("msg-transicao-modal");
                    const anoAtual = document.getElementById("trans-ano-atual").value.trim();
                    const anoNovo = document.getElementById("trans-ano-novo").value.trim();

                    if (!anoAtual || !anoNovo) {
                        msg.textContent = "Preenche os dois anos.";
                        msg.className = "msg-form erro";
                        msg.style.display = "block";
                        return false;
                    }

                    const res = await chamarRPC("cesc_aura_transicao", {
                        p_token: obterToken(),
                        p_ano_lectivo_actual: anoAtual,
                        p_novo_ano_lectivo: anoNovo
                    });

                    if (res.ok) {
                        const msgFinal = document.getElementById("msg-executar-aura");
                        msgFinal.className = "msg-form sucesso";
                        msgFinal.textContent = `Transição concluída! Analisados: ${res.total_analisados}. Novas inscrições: ${res.novas_inscricoes_criadas}.`;
                        return true;
                    } else {
                        msg.textContent = res.erro || "Erro na transição.";
                        msg.className = "msg-form erro";
                        msg.style.display = "block";
                        return false;
                    }
                }, "Confirmar Transição");
            });
        }
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

function mudarAbaAura(aba) {
    const abaRegras = document.getElementById("aba-aura-regras");
    const abaAloc = document.getElementById("aba-aura-alocacao");
    const btnRegras = document.getElementById("btn-aba-regras");
    const btnAloc = document.getElementById("btn-aba-alocacao");

    if (aba === "regras") {
        abaRegras.style.display = "block";
        abaAloc.style.display = "none";
        btnRegras.style.cssText = "background: var(--cor-azul); color: #fff; border: 1px solid var(--cor-azul); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
        btnAloc.style.cssText = "background: transparent; color: var(--cor-texto-suave); border: 1px solid var(--cor-borda); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
    } else {
        abaRegras.style.display = "none";
        abaAloc.style.display = "block";
        btnRegras.style.cssText = "background: transparent; color: var(--cor-texto-suave); border: 1px solid var(--cor-borda); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
        btnAloc.style.cssText = "background: var(--cor-azul); color: #fff; border: 1px solid var(--cor-azul); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
    }
}

function renderizarRegrasAura(regras) {
    const c = document.getElementById("lista-regras-aura");
    if (!c) return;
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
    if (res.ok) mostrarMsg(msg, "Regra guardada com sucesso.", "sucesso");
    else mostrarMsg(msg, res.erro || "Erro ao guardar regra.", "erro");
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
    if (res.ok) mostrarMsg(msg, "Regra guardada com sucesso.", "sucesso");
    else mostrarMsg(msg, res.erro || "Erro ao guardar regra.", "erro");
}

function renderizarAlocacoesAura(alocacoes) {
    const c = document.getElementById("lista-alocacoes-aura");
    if (!c) return;
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
        <p id="msg-modal-alocacao" class="msg-form" style="margin-top:10px; display:none;"></p>
    `;

    abrirModal("Nova Alocação de Sala", html, async function () {
        const msgModal = document.getElementById("msg-modal-alocacao");
        msgModal.style.display = "none";
        
        const turno = document.getElementById("aloc-turno").value;
        const pavilhao = document.getElementById("aloc-pavilhao").value.trim();
        const sala_inicio = parseInt(document.getElementById("aloc-sala-inicio").value, 10);
        const sala_fim = parseInt(document.getElementById("aloc-sala-fim").value, 10);
        const classe = document.getElementById("aloc-classe").value.trim();
        const curso = document.getElementById("aloc-curso").value.trim() || null;

        if (!pavilhao || !classe || !sala_inicio || !sala_fim) {
            mostrarMsg(msgModal, "Preenche todos os campos obrigatórios.", "erro");
            msgModal.style.display = "block";
            return false;
        }

        const res = await chamarRPC("cesc_aura_guardar_alocacao", {
            p_token: token, p_ano_lectivo: ano, p_turno: turno, p_pavilhao: pavilhao,
            p_sala_inicio: sala_inicio, p_sala_fim: sala_fim, p_classe: classe, p_curso: curso
        });

        if (res.ok) {
            carregarAuraDir();
            return true;
        } else {
            mostrarMsg(msgModal, res.erro || "Erro ao guardar alocação.", "erro");
            msgModal.style.display = "block";
            return false;
        }
    }, "Guardar Alocação");
}

function abrirModalNovaRegra() {
    const html = `
        <div class="form-grelha">
            <div class="campo-grupo"><label>Classe *</label><input type="text" id="reg-classe" placeholder="Ex: 10ª Classe"></div>
            <div class="campo-grupo"><label>Curso</label><input type="text" id="reg-curso" placeholder="Ex: C.F.B"></div>
            <div class="campo-grupo"><label>Máx. Negativas Críticas</label><input type="number" id="reg-crit" value="0" min="0"></div>
            <div class="campo-grupo"><label>Máx. Negativas Secundárias</label><input type="number" id="reg-sec" value="2" min="0"></div>
        </div>
        <p id="msg-modal-regra" class="msg-form" style="margin-top:10px; display:none;"></p>
    `;
    abrirModal("Nova Regra de Aprovação", html, async function() {
        const msgModal = document.getElementById("msg-modal-regra");
        msgModal.style.display = "none";

        const token = obterToken();
        const classe = document.getElementById("reg-classe").value.trim();
        const curso = document.getElementById("reg-curso").value.trim() || null;
        const crit = parseInt(document.getElementById("reg-crit").value, 10);
        const sec = parseInt(document.getElementById("reg-sec").value, 10);

        if (!classe) { 
            mostrarMsg(msgModal, "Indica a classe.", "erro");
            msgModal.style.display = "block";
            return false; 
        }

        const res = await chamarRPC("cesc_aura_guardar_regra", {
            p_token: token, p_classe: classe, p_curso: curso, p_max_criticas: crit, p_max_secundarias: sec
        });
        
        if (res.ok) { 
            carregarAuraDir(); 
            return true; 
        }
        mostrarMsg(msgModal, res.erro || "Erro ao guardar regra.", "erro"); 
        msgModal.style.display = "block";
        return false;
    }, "Guardar Regra");
}