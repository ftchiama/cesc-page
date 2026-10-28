/*
 CESC — Secretaria · Modais
 */

function abrirModal(titulo, htmlCorpo, acaoConfirmar, textoBotaoConfirmar) {
    const overlay = document.getElementById("modal-overlay");
    document.getElementById("modal-titulo").textContent = titulo;
    document.getElementById("modal-corpo").innerHTML = htmlCorpo;
    const btnConfirmar = document.getElementById("modal-confirmar");
    btnConfirmar.textContent = textoBotaoConfirmar || "Confirmar";
    const novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);
    novoBtn.addEventListener("click", async function () {
        novoBtn.disabled = true;
        const deveFechar = await acaoConfirmar();
        novoBtn.disabled = false;
        if (deveFechar) fecharModal();
    });
    document.getElementById("modal-cancelar").onclick = fecharModal;
    document.getElementById("modal-fechar").onclick = fecharModal;
    overlay.style.display = "flex";
}

function fecharModal() {
    document.getElementById("modal-overlay").style.display = "none";
    document.getElementById("modal-corpo").innerHTML = "";
}

async function aprovarInscricao(id) {
    const token = obterToken();
    const html = `<p>Tens a certeza que queres aprovar este candidato?</p>`;
    abrirModal("Aprovar Inscrição", html, async function () {
        await chamarRPC("cesc_secretaria_terminar_analise", { p_token: token, p_inscricao_id: id });
        const res = await chamarRPC("cesc_secretaria_aprovar_inscricao", { p_token: token, p_inscricao_id: id });
        if (res.ok) {
            inscricaoEmAnalise = null;
            carregarInscricoes();
            const dados = await chamarRPC("cesc_secretaria_dashboard", { p_token: token });
            if (dados.ok) {
                renderizarTudo(dados);
                const resInsc = await chamarRPC("cesc_secretaria_contar_inscricoes_pendentes", { p_token: token });
                if (resInsc.ok) atualizarBadges(resInsc.total || 0);
            }
            return true;
        } else {
            alert("Erro: " + res.erro);
            return false;
        }
    }, "Confirmar Aprovação");
}

async function rejeitarInscricao(id) {
    const token = obterToken();
    const html = `
        <p>Tens a certeza que queres rejeitar esta inscrição?</p>
        <div class="campo-grupo">
            <label for="modal-motivo">Motivo da Rejeição</label>
            <textarea id="modal-motivo" placeholder="Ex: Documentos incompletos ou inválidos."></textarea>
        </div>
        <div class="campo-grupo">
            <label for="modal-codigo">Código de Rejeição</label>
            <select id="modal-codigo">
                <option value="0">0 — Rejeitado sem possibilidade de recandidatura neste ano</option>
                <option value="1">1 — Rejeitado com possibilidade de recandidatura</option>
            </select>
        </div>
    `;
    abrirModal("Rejeitar Inscrição", html, async function () {
        const motivo = document.getElementById("modal-motivo").value;
        const codigo = parseInt(document.getElementById("modal-codigo").value, 10);
        if (!motivo || motivo.length < 5) {
            alert("Indica o motivo da rejeição (mínimo 5 caracteres).");
            return false;
        }
        await chamarRPC("cesc_secretaria_terminar_analise", { p_token: token, p_inscricao_id: id });
        const res = await chamarRPC("cesc_secretaria_rejeitar_inscricao", {
            p_token: token, p_inscricao_id: id, p_motivo: motivo, p_codigo: codigo
        });
        if (res.ok) {
            inscricaoEmAnalise = null;
            carregarInscricoes();
            const dados = await chamarRPC("cesc_secretaria_dashboard", { p_token: token });
            if (dados.ok) {
                renderizarTudo(dados);
                const resInsc = await chamarRPC("cesc_secretaria_contar_inscricoes_pendentes", { p_token: token });
                if (resInsc.ok) atualizarBadges(resInsc.total || 0);
            }
            return true;
        } else {
            alert("Erro: " + res.erro);
            return false;
        }
    }, "Confirmar Rejeição");
}