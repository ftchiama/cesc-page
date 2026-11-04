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
// ============================================================
// CONVIDAR ALUNO
// ============================================================
function configurarBotaoConvidar() {
    const btn = document.getElementById("btn-convidar-aluno");
    if (!btn) return;

    btn.addEventListener("click", function () {
        const html = `
            <p>Gera um link único para o aluno se inscrever no sistema.</p>
            <div class="campo-grupo">
                <label for="conv-bi">BI do Aluno *</label>
                <input type="text" id="conv-bi" placeholder="000123456LA041" maxlength="14" autocomplete="off">
            </div>
            <div class="campo-grupo">
                <label for="conv-nome">Nome Completo (Opcional)</label>
                <input type="text" id="conv-nome" placeholder="Ex: João Manuel" autocomplete="off">
            </div>
        `;
        
        abrirModal("Convidar Aluno", html, async function () {
            const token = obterToken();
            const bi = document.getElementById("conv-bi").value.trim().toUpperCase();
            const nome = document.getElementById("conv-nome").value.trim() || null;
            
            if (!bi) { alert("Insere o BI."); return false; }

            const res = await chamarRPC("cesc_secretaria_criar_convite", { 
                p_token: token, p_bi_numero: bi, p_nome_completo: nome 
            });

            if (res.ok) {
                // Constrói a URL completa (muda para o teu domínio em produção)
                const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -2).join('/') + '/paginas/inscricao.html?convite=' + res.codigo;
                
                // Substitui o conteúdo do modal para mostrar o link gerado
                document.getElementById("modal-corpo").innerHTML = `
                    <p style="color:#065f46; font-weight:600; margin-bottom:12px;">
                        <i class="fas fa-check-circle"></i> Convite gerado com sucesso!
                    </p>
                    <div class="campo-grupo">
                        <label>Link (válido por 72h)</label>
                        <input type="text" id="conv-link-gerado" value="${baseUrl}" readonly style="background:#f1f5f9; color:#94a3b8;">
                    </div>
                    <button class="botao-primario" onclick="navigator.clipboard.writeText(document.getElementById('conv-link-gerado').value); alert('Link copiado!');" style="width:100%; margin-top:8px;">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                `;
                
                // Esconde o botão de confirmar (já foi feito)
                document.getElementById("modal-confirmar").style.display = "none";
                document.getElementById("modal-cancelar").textContent = "Fechar";
                
                return false; // Não fecha o modal, deixa ver o link
            } else {
                alert(res.erro);
                return false;
            }
        }, "Gerar Convite");
    });
}

// Chama no arranque
document.addEventListener("DOMContentLoaded", configurarBotaoConvidar);