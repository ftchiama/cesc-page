/*
 CESC — Secretaria · AURA
 Data: 05/11/2026
 */

let regrasCache = [];
let alocacoesCache = [];

async function carregarAura() {
    const token = obterToken();
    if (!token) return;

    const selAno = document.getElementById("filtro-aura-ano");
    if (selAno && !selAno.value) {
        const anoAtual = new Date().getFullYear();
        selAno.innerHTML = `<option value="${anoAtual}/${anoAtual+1}">${anoAtual}/${anoAtual+1}</option>`;
    }
    const ano = selAno ? selAno.value : "";

    // 1. Carregar Regras
    const resRegras = await chamarRPC("cesc_aura_listar_regras", { p_token: token });
    if (resRegras.ok) {
        regrasCache = resRegras.regras || [];
        renderizarRegras(regrasCache);
    }

    // 2. Carregar Alocações
    if (ano) {
        const resAloc = await chamarRPC("cesc_aura_listar_alocacoes", { p_token: token, p_ano_lectivo: ano });
        if (resAloc.ok) {
            alocacoesCache = resAloc.alocacoes || [];
            renderizarAlocacoes(alocacoesCache);
        }
    }

    // Eventos dos botões (só uma vez)
    if (!window.auraLigado) {
        window.auraLigado = true;
        
        if (selAno) selAno.addEventListener("change", carregarAura);

        document.getElementById("btn-aura-julgar").addEventListener("click", async function() {
            if (!confirm("Executar o JUIZ? Isto avalia todos os alunos com matrícula paga e marca-os como aprovados ou reprovados.")) return;
            const btn = this;
            const spanStatus = document.getElementById("aura-status");
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A executar...';
            spanStatus.textContent = "A avaliar alunos...";
            
            const res = await chamarRPC("cesc_aura_julgar", { p_token: token, p_ano_lectivo: ano });
            
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-gavel"></i> Executar JUIZ (Avaliar Alunos)';
            spanStatus.textContent = "";

            if (res.ok) {
                alert(`JUIZ concluído!\nTotal: ${res.total}\nAprovados: ${res.aprovados}\nReprovados: ${res.reprovados}`);
            } else {
                alert("Erro: " + res.erro);
            }
        });

        document.getElementById("btn-aura-distribuir").addEventListener("click", async function() {
            if (!confirm("Executar o DISTRIBUIDOR? Isto coloca os alunos aprovados nas salas alocadas.")) return;
            const btn = this;
            const spanStatus = document.getElementById("aura-status");
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A distribuir...';
            spanStatus.textContent = "A distribuir alunos...";
            
            const res = await chamarRPC("cesc_aura_distribuir", { p_token: token, p_ano_lectivo: ano });
            
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-users"></i> Executar DISTRIBUIDOR (Colocar nas Salas)';
            spanStatus.textContent = "";

            if (res.ok) {
                alert(`Distribuição concluída!\nAlunos distribuídos: ${res.distribuidos}`);
            } else {
                alert("Erro: " + res.erro);
            }
        });
    }
}

function renderizarRegras(regras) {
    const c = document.getElementById("lista-regras-aura");
    if (regras.length === 0) { c.innerHTML = '<div class="estado-vazio">Sem regras definidas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Classe</th><th>Curso</th><th>Máx. Críticas</th><th>Máx. Secundárias</th></tr></thead><tbody>';
    regras.forEach(r => {
        html += `<tr>
            <td>${esc(r.classe)}</td>
            <td>${esc(r.curso || '—')}</td>
            <td style="text-align:center;">${r.max_negativas_criticas}</td>
            <td style="text-align:center;">${r.max_negativas_secundarias}</td>
        </tr>`;
    });
    html += '</tbody></table></div>';

    // Versão mobile
    html += '<div class="cartoes-sec">';
    regras.forEach(r => {
        html += `<div class="cartao-sec">
            <div class="cartao-sec-topo">
                <div class="cartao-sec-info">
                    <strong>${esc(r.classe)} ${r.curso ? '· '+esc(r.curso) : ''}</strong>
                </div>
            </div>
            <div class="cartao-sec-meta">
                <div class="meta-item"><span class="meta-rotulo">Máx. Críticas</span><span class="meta-valor">${r.max_negativas_criticas}</span></div>
                <div class="meta-item"><span class="meta-rotulo">Máx. Secundárias</span><span class="meta-valor">${r.max_negativas_secundarias}</span></div>
            </div>
        </div>`;
    });
    html += '</div>';

    c.innerHTML = html;
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
                <div class="cartao-sec-info">
                    <strong>${esc(a.classe)} ${a.curso ? '· '+esc(a.curso) : ''}</strong>
                </div>
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

function abrirModalRegra() {
    const html = `
        <p>Define os limites de negativas para aprovação.</p>
        <div class="form-grelha">
            <div class="campo-grupo"><label>Classe *</label><input type="text" id="reg-classe" placeholder="Ex: 10ª Classe"></div>
            <div class="campo-grupo"><label>Curso</label><input type="text" id="reg-curso" placeholder="Ex: C.F.B"></div>
            <div class="campo-grupo"><label>Máx. Negativas Críticas</label><input type="number" id="reg-crit" value="0" min="0"></div>
            <div class="campo-grupo"><label>Máx. Negativas Secundárias</label><input type="number" id="reg-sec" value="2" min="0"></div>
        </div>
    `;
    abrirModal("Nova Regra de Aprovação", html, async function() {
        const res = await chamarRPC("cesc_aura_guardar_regra", {
            p_token: obterToken(),
            p_classe: document.getElementById("reg-classe").value.trim(),
            p_curso: document.getElementById("reg-curso").value.trim() || null,
            p_max_criticas: parseInt(document.getElementById("reg-crit").value, 10),
            p_max_secundarias: parseInt(document.getElementById("reg-sec").value, 10)
        });
        if (res.ok) { carregarAura(); return true; }
        alert(res.erro); return false;
    }, "Guardar Regra");
}

function abrirModalAlocacao() {
    const token = obterToken();
    const ano = document.getElementById("filtro-aura-ano").value;
    const html = `
        <p>Define quais salas pertencem a qual classe/curso.</p>
        <div class="form-grelha">
            <div class="campo-grupo"><label>Turno *</label><select id="alo-turno" class="campo-select"><option value="Matinal">Matinal</option><option value="Vespertino">Vespertino</option><option value="Noturno">Noturno</option></select></div>
            <div class="campo-grupo"><label>Pavilhão *</label><input type="text" id="alo-pav" placeholder="Ex: Pavilhão 1"></div>
            <div class="campo-grupo"><label>Sala Início *</label><input type="number" id="alo-sala-ini" value="1" min="1"></div>
            <div class="campo-grupo"><label>Sala Fim *</label><input type="number" id="alo-sala-fim" value="1" min="1"></div>
            <div class="campo-grupo"><label>Classe *</label><input type="text" id="alo-classe" placeholder="Ex: 10ª Classe"></div>
            <div class="campo-grupo"><label>Curso</label><input type="text" id="alo-curso" placeholder="Ex: C.F.B"></div>
        </div>
    `;
    abrirModal("Nova Alocação de Sala", html, async function() {
        const res = await chamarRPC("cesc_aura_guardar_alocacao", {
            p_token: token,
            p_ano_lectivo: ano,
            p_turno: document.getElementById("alo-turno").value,
            p_pavilhao: document.getElementById("alo-pav").value.trim(),
            p_sala_inicio: parseInt(document.getElementById("alo-sala-ini").value, 10),
            p_sala_fim: parseInt(document.getElementById("alo-sala-fim").value, 10),
            p_classe: document.getElementById("alo-classe").value.trim(),
            p_curso: document.getElementById("alo-curso").value.trim() || null
        });
        if (res.ok) { carregarAura(); return true; }
        alert(res.erro); return false;
    }, "Guardar Alocação");
}
