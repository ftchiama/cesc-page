let temposCache = [];

async function carregarTempos() {
    const container = document.getElementById("lista-tempos-container");
    if (!container) return;
    container.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const res = await chamarRPC("cesc_coordenacao_listar_tempos", { p_token: obterToken() });
    if (!res.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(res.erro) + '</div>'; return; }

    temposCache = res.tempos || [];
    if (temposCache.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhum tempo configurado.</div>'; return; }

    const porTurno = {};
    temposCache.forEach(t => {
        if (!porTurno[t.turno]) porTurno[t.turno] = [];
        porTurno[t.turno].push(t);
    });

    let html = '';
    for (const turno in porTurno) {
        html += `<h3 style="margin:16px 0 8px; color:var(--cor-azul);">${esc(turno)}</h3>`;
        html += '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Ordem</th><th>Início</th><th>Fim</th></tr></thead><tbody>';
        porTurno[turno].forEach(t => {
            html += `<tr><td>${t.ordem}º</td><td>${t.hora_inicio}</td><td>${t.hora_fim}</td></tr>`;
        });
        html += '</tbody></table></div>';
    }
    container.innerHTML = html;
}

function abrirModalTempo() {
    const html = `
        <div class="form-grelha">
            <div class="campo-grupo"><label>Turno *</label>
                <select id="tempo-turno" class="campo-select">
                    <option value="Matinal">Matinal</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Noturno">Noturno</option>
                </select>
            </div>
            <div class="campo-grupo"><label>Ordem *</label><input type="number" id="tempo-ordem" min="1" value="1"></div>
            <div class="campo-grupo"><label>Início *</label><input type="time" id="tempo-inicio" value="08:00"></div>
            <div class="campo-grupo"><label>Fim *</label><input type="time" id="tempo-fim" value="08:45"></div>
        </div>
        <p id="msg-modal-tempo" class="msg-form" style="display:none;"></p>
    `;
    abrirModal("Novo Tempo de Aula", html, async function () {
        const msg = document.getElementById("msg-modal-tempo");
        msg.style.display = "none";
        const novos = temposCache.slice();
        novos.push({
            turno: document.getElementById("tempo-turno").value,
            ordem: parseInt(document.getElementById("tempo-ordem").value, 10),
            hora_inicio: document.getElementById("tempo-inicio").value,
            hora_fim: document.getElementById("tempo-fim").value
        });
        const res = await chamarRPC("cesc_coordenacao_guardar_tempos", {
            p_token: obterToken(),
            p_tempos: JSON.stringify(novos)
        });
        if (res.ok) { carregarTempos(); return true; }
        mostrarMsg(msg, res.erro || "Erro.", "erro"); msg.style.display = "block"; return false;
    }, "Guardar");
}