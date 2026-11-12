let disponibilidadeCache = [];

async function carregarDisponibilidade() {
    const container = document.getElementById("lista-disponibilidade-container");
    if (!container) return;
    container.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const res = await chamarRPC("cesc_coordenacao_listar_disponibilidade", { 
        p_token: obterToken(), p_ano_lectivo: "2026/2027" 
    });
    if (!res.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(res.erro) + '</div>'; return; }

    disponibilidadeCache = res.disponibilidade || [];
    if (disponibilidadeCache.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhuma disponibilidade registada.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec"><thead><tr><th>Professor</th><th>Disciplina</th><th>Período</th><th>Carga Máx.</th><th>Acções</th></tr></thead><tbody>';
    disponibilidadeCache.forEach(d => {
        html += `<tr>
            <td><strong>${esc(d.professor_nome)}</strong></td>
            <td>${esc(d.disciplina)}</td>
            <td>${esc(d.periodo)}</td>
            <td>${d.carga_maxima} tempos</td>
            <td><button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarDisponibilidade('${d.id}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function abrirModalDisponibilidade() {
    const html = `
        <div class="campo-grupo"><label>E-mail do Professor *</label><input type="email" id="disp-email" placeholder="professor@cesc.ao"></div>
        <div class="campo-grupo"><label>Disciplina *</label><input type="text" id="disp-disciplina" placeholder="Ex: Matemática"></div>
        <div class="form-grelha">
            <div class="campo-grupo"><label>Período *</label>
                <select id="disp-periodo" class="campo-select">
                    <option value="Matinal">Matinal</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Noturno">Noturno</option>
                </select>
            </div>
            <div class="campo-grupo"><label>Carga Máxima</label><input type="number" id="disp-carga" value="30" min="1"></div>
        </div>
        <p id="msg-modal-disp" class="msg-form" style="display:none;"></p>
    `;
    abrirModal("Adicionar Disponibilidade", html, async function () {
        const msg = document.getElementById("msg-modal-disp");
        msg.style.display = "none";
        const email = document.getElementById("disp-email").value.trim();
        if (!email) { mostrarMsg(msg, "Insere o e-mail.", "erro"); msg.style.display = "block"; return false; }

        // Procurar utilizador pelo e-mail
        const u = await chamarRPC("cesc_encontrar_utilizador", { p_email: email });
        if (!u.ok || !u.id) { mostrarMsg(msg, "Utilizador não encontrado.", "erro"); msg.style.display = "block"; return false; }

        const res = await chamarRPC("cesc_coordenacao_guardar_disponibilidade", {
            p_token: obterToken(), p_professor_id: u.id,
            p_disciplina: document.getElementById("disp-disciplina").value.trim(),
            p_periodo: document.getElementById("disp-periodo").value,
            p_ano_lectivo: "2026/2027",
            p_carga_maxima: parseInt(document.getElementById("disp-carga").value, 10)
        });
        if (res.ok) { carregarDisponibilidade(); return true; }
        mostrarMsg(msg, res.erro || "Erro.", "erro"); msg.style.display = "block"; return false;
    }, "Guardar");
}

async function apagarDisponibilidade(id) {
    const res = await chamarRPC("cesc_coordenacao_apagar_disponibilidade", { p_token: obterToken(), p_id: id });
    if (res.ok) carregarDisponibilidade();
}