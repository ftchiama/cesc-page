/*
 CESC — Secretaria · AURA
 (Reutiliza as RPCs do Diretor, que já estão a funcionar)
 */

let regrasAuraCache = [];
let alocacoesAuraCache = [];

async function carregarAura() {
    const token = obterToken();
    if (!token) return;

    const selAno = document.getElementById("filtro-aura-ano");
    if (selAno && !selAno.value) {
        const anoAtual = new Date().getFullYear();
        selAno.innerHTML = `<option value="${anoAtual}/${anoAtual+1}">${anoAtual}/${anoAtual+1}</option>`;
    }
    const ano = selAno ? selAno.value : "";

    // 1. Carregar Regras (usando a RPC do Diretor)
    const containerRegras = document.getElementById("lista-regras-aura");
    containerRegras.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';
    
    const resRegras = await chamarRPC("cesc_diretor_listar_regras_aura", { p_token: token, p_ano_lectivo: ano });
    if (resRegras.ok) {
        regrasAuraCache = resRegras.regras || [];
        renderizarRegras(regrasAuraCache);
    } else {
        containerRegras.innerHTML = '<div class="estado-vazio">' + esc(resRegras.erro) + '</div>';
    }

    // 2. Carregar Alocações (se tiveres uma RPC do diretor para isto, senão usa a da secretaria que já funciona)
    // (Nota: Se o diretor não tiver RPC de alocação, mantemos a que criaste para a secretária)
    if (ano) {
        const resAloc = await chamarRPC("cesc_aura_listar_alocacoes", { p_token: token, p_ano_lectivo: ano });
        if (resAloc.ok) {
            alocacoesAuraCache = resAloc.alocacoes || [];
            renderizarAlocacoes(alocacoesAuraCache);
        }
    }

    // Eventos dos botões (só uma vez)
    if (!window.auraLigado) {
        window.auraLigado = true;
        
        if (selAno) selAno.addEventListener("change", carregarAura);

        // Botão Executar TUDO (AURA)
        document.getElementById("btn-aura-julgar").addEventListener("click", async function() {
            if (!confirm("Executar a AURA completa (JUIZ + DISTRIBUIDOR)? Isto avalia e distribui todos os alunos.")) return;
            const btn = this;
            const spanStatus = document.getElementById("aura-status");
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A executar...';
            spanStatus.textContent = "A processar a AURA...";
            
            // Usa a RPC do Diretor que já está funcional
            const res = await chamarRPC("cesc_executar_aura", { p_token: token, p_ano_lectivo: ano });
            
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-gavel"></i> Executar JUIZ';
            spanStatus.textContent = "";

            if (res.ok) {
                alert(`AURA concluída!\nTotal processados: ${res.total_processados}\nAprovados: ${res.aprovados}\nReprovados: ${res.reprovados}`);
            } else {
                alert("Erro: " + res.erro);
            }
        });

        // Botão Distribuir (se precisares de chamar só o distribuidor)
        document.getElementById("btn-aura-distribuir").addEventListener("click", async function() {
             // Se o diretor não tiver RPC para só distribuir, podes esconder o botão ou fazer a chamada
             alert("A funcionalidade de distribuição isolada será implementada em breve. Use 'Executar AURA' para fazer tudo.");
        });
    }
}

function renderizarRegras(regras) {
    const c = document.getElementById("lista-regras-aura");
    if (regras.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem regras definidas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Classe / Curso</th><th>Máx. Críticas</th><th>Máx. Secundárias</th><th>Acção</th></tr></thead><tbody>';
    regras.forEach((r, idx) => {
        let nome = r.classe + (r.curso ? ' (' + r.curso + ')' : '');
        html += `<tr>
            <td><strong>${esc(nome)}</strong></td>
            <td><input type="number" id="regra-crit-${idx}" class="campo-input" style="width:80px; padding:4px;" value="${r.max_criticas}"></td>
            <td><input type="number" id="regra-sec-${idx}" class="campo-input" style="width:80px; padding:4px;" value="${r.max_secundarias}"></td>
            <td><button class="btn-acao btn-acao-primario" onclick="guardarRegra(${idx})"><i class="fas fa-save"></i></button></td>
        </tr>`;
    });
    html += '</tbody></table></div>';

    // Versão mobile
    html += '<div class="cartoes-sec">';
    regras.forEach((r, idx) => {
        let nome = r.classe + (r.curso ? ' (' + r.curso + ')' : '');
        html += `<div class="cartao-sec">
            <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>${esc(nome)}</strong></div></div>
            <div class="cartao-sec-meta">
                <div class="meta-item"><span class="meta-rotulo">Máx. Críticas</span><input type="number" id="regra-crit-m-${idx}" class="campo-input" style="width:60px; padding:4px;" value="${r.max_criticas}"></div>
                <div class="meta-item"><span class="meta-rotulo">Máx. Secundárias</span><input type="number" id="regra-sec-m-${idx}" class="campo-input" style="width:60px; padding:4px;" value="${r.max_secundarias}"></div>
            </div>
            <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-primario" onclick="guardarRegraMobile(${idx})"><i class="fas fa-save"></i> Guardar</button></div>
        </div>`;
    });
    html += '</div>';

    c.innerHTML = html;
}

async function guardarRegra(idx) {
    const token = obterToken();
    const regra = regrasAuraCache[idx];
    const crit = parseInt(document.getElementById("regra-crit-" + idx).value, 10);
    const sec = parseInt(document.getElementById("regra-sec-" + idx).value, 10);

    const res = await chamarRPC("cesc_diretor_atualizar_regra_aura", {
        p_token: token, p_regra_id: regra.id, p_max_crit: crit, p_max_sec: sec
    });
    if (res.ok) alert("Regra guardada com sucesso.");
    else alert(res.erro);
}

async function guardarRegraMobile(idx) {
    const token = obterToken();
    const regra = regrasAuraCache[idx];
    const crit = parseInt(document.getElementById("regra-crit-m-" + idx).value, 10);
    const sec = parseInt(document.getElementById("regra-sec-m-" + idx).value, 10);

    const res = await chamarRPC("cesc_diretor_atualizar_regra_aura", {
        p_token: token, p_regra_id: regra.id, p_max_crit: crit, p_max_sec: sec
    });
    if (res.ok) alert("Regra guardada com sucesso.");
    else alert(res.erro);
}

function renderizarAlocacoes(alocacoes) {
    const c = document.getElementById("lista-alocacoes-aura");
    if (alocacoes.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem alocações para este ano.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Turno / Pavilhão</th><th>Salas</th><th>Classe / Curso</th></tr></thead><tbody>';
    alocacoes.forEach(a => {
        html += `<tr>
            <td>${esc(a.turno)} · ${esc(a.pavilhao)}</td>
            <td>Sala ${a.sala_inicio} a ${a.sala_fim}</td>
            <td>${esc(a.classe)} ${a.curso ? '· '+esc(a.curso) : ''}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';

    // Versão mobile
    html += '<div class="cartoes-sec">';
    alocacoes.forEach(a => {
        html += `<div class="cartao-sec">
            <div class="cartao-sec-topo">
                <div class="cartao-sec-info"><strong>${esc(a.classe)} ${a.curso ? '· '+esc(a.curso) : ''}</strong></div>
            </div>
            <div class="cartao-sec-meta">
                <div class="meta-item"><span class="meta-rotulo">Turno</span><span class="meta-valor">${esc(a.turno)}</span></div>
                <div class="meta-item"><span class="meta-rotulo">Pavilhão</span><span class="meta-valor">${esc(a.pavilhao)}</span></div>
                <div class="meta-item"><span class="meta-rotulo">Salas</span><span class="meta-valor">${a.sala_inicio} a ${a.sala_fim}</span></div>
            </div>
        </div>`;
    });
    html += '</div>';

    c.innerHTML = html;
}
