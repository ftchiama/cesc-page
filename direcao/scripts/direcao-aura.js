/*
 CESC — Direcção · AURA
 */

let regrasAuraCache = [];

async function carregarAuraDir() {
    const token = obterToken();
    const container = document.getElementById("lista-regras-aura");
    container.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_diretor_listar_regras_aura", { p_token: token, p_ano_lectivo: "2026/2027" });
    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro) + '</div>'; return; }

    regrasAuraCache = dados.regras || [];

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Classe / Curso</th><th>Máx. Negativas Críticas</th><th>Máx. Negativas Secundárias</th><th>Acção</th></tr></thead><tbody>';
    regrasAuraCache.forEach((r, idx) => {
        let nome = r.classe + (r.curso ? ' (' + r.curso + ')' : '');
        html += '<tr>';
        html += '<td><strong>' + esc(nome) + '</strong></td>';
        html += '<td><input type="number" id="regra-crit-' + idx + '" class="campo-input" style="width:80px; padding:4px;" value="' + r.max_criticas + '"></td>';
        html += '<td><input type="number" id="regra-sec-' + idx + '" class="campo-input" style="width:80px; padding:4px;" value="' + r.max_secundarias + '"></td>';
        html += '<td><button class="btn-acao btn-acao-primario" onclick="guardarRegraAura(' + idx + ')"><i class="fas fa-save"></i></button></td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    
    // Mobile
    html += '<div class="cartoes-sec">';
    regrasAuraCache.forEach((r, idx) => {
        let nome = r.classe + (r.curso ? ' (' + r.curso + ')' : '');
        html += '<div class="cartao-sec">';
        html += '  <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(nome) + '</strong></div></div>';
        html += '  <div class="cartao-sec-meta">';
        html += '    <div class="meta-item"><span class="meta-rotulo">Máx. Neg. Críticas</span><input type="number" id="regra-crit-m-' + idx + '" class="campo-input" style="width:60px; padding:4px;" value="' + r.max_criticas + '"></div>';
        html += '    <div class="meta-item"><span class="meta-rotulo">Máx. Neg. Secundárias</span><input type="number" id="regra-sec-m-' + idx + '" class="campo-input" style="width:60px; padding:4px;" value="' + r.max_secundarias + '"></div>';
        html += '  </div>';
        html += '  <div class="cartao-sec-acoes"><button class="btn-acao btn-acao-primario" onclick="guardarRegraAuraMobile(' + idx + ')"><i class="fas fa-save"></i> Guardar</button></div>';
        html += '</div>';
    });
    html += '</div>';

    container.innerHTML = html;
}

async function guardarRegraAura(idx) {
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

async function guardarRegraAuraMobile(idx) {
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

// Executar AURA
document.addEventListener("DOMContentLoaded", function () {
    const btnExecutar = document.getElementById("btn-executar-aura");
    if (!btnExecutar) return;

    btnExecutar.addEventListener("click", async function () {
        if (!confirm("Tens a certeza que queres executar a AURA? Isto vai distribuir os alunos e mudar os estados das inscrições.")) return;

        const btn = this;
        const msg = document.getElementById("msg-executar-aura");
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A processar...';
        msg.textContent = "";

        const res = await chamarRPC("cesc_executar_aura", { p_token: obterToken(), p_ano_lectivo: "2026/2027" });

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-magic"></i> Executar AURA';

        if (res.ok) {
            msg.className = "msg-form sucesso";
            msg.textContent = "AURA executada! Alunos processados: " + res.total_processados + ". Aprovados: " + res.aprovados + ". Reprovados: " + res.reprovados + ".";
        } else {
            msg.className = "msg-form erro";
            msg.textContent = res.erro || "Erro ao executar AURA.";
        }
    });
});
