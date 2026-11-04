/*
 CESC — Painel do Candidato
 Data: 26/10/2026
 */

let dadosPainel = null;
let tokenAtual = null;

const MIME_EXT = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

// ============================================================
// HELPERS
// ============================================================
function obterTokenCandidato() {
    try { return sessionStorage.getItem("cesc_candidato_token"); } catch (e) { return null; }
}
function sair() { sessionStorage.removeItem("cesc_candidato_token"); window.location.href = "candidato-login.html"; }
function mostrarMsg(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto;
    el.className = "msg-form " + (tipo || "erro");
    if (tipo === "sucesso") setTimeout(() => { el.className = "msg-form"; el.textContent = ""; }, 3000);
}
function capitalizar(s) { if (!s) return ""; return s.charAt(0).toUpperCase() + s.slice(1); }

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
    tokenAtual = obterTokenCandidato();
    if (!tokenAtual) { window.location.href = "candidato-login.html"; return; }

    const menuBtn = document.getElementById("menuMobileBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarFechar = document.getElementById("sidebarFechar");
    const overlay = document.getElementById("sidebarOverlay");
    function fecharSidebar() { sidebar.classList.remove("aberta"); overlay.classList.remove("ativo"); }
    if (menuBtn) menuBtn.addEventListener("click", () => { sidebar.classList.add("aberta"); overlay.classList.add("ativo"); });
    if (sidebarFechar) sidebarFechar.addEventListener("click", fecharSidebar);
    if (overlay) overlay.addEventListener("click", fecharSidebar);

    document.querySelectorAll(".nav-item[data-seccao]").forEach(item => {
        item.addEventListener("click", e => {
            e.preventDefault();
            mostrarSeccao(item.getAttribute("data-seccao"));
            fecharSidebar();
        });
    });

    document.getElementById("link-sair").addEventListener("click", e => { e.preventDefault(); sair(); });
    document.getElementById("btn-guardar-perfil").addEventListener("click", guardarPerfil);

    await carregarPainel();
});

function mostrarSeccao(id) {
    document.querySelectorAll(".pagina-seccao").forEach(s => s.classList.remove("ativa"));
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");
    document.querySelectorAll(".nav-item[data-seccao]").forEach(n => {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });
    if (id === "historico-alteracoes") carregarHistoricoAlteracoes();
    if (id === "documentos") renderizarDocumentos(dadosPainel ? dadosPainel.inscricao_actual : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
// CARREGAR PAINEL
// ============================================================
async function carregarPainel() {
    const res = await chamarRPC("cesc_candidato_painel", { p_token: tokenAtual });
    if (!res.ok) { sessionStorage.removeItem("cesc_candidato_token"); window.location.href = "candidato-login.html"; return; }
    dadosPainel = res;
    renderizarTudo(res);
    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";
}

// ============================================================
// RENDERIZAR
// ============================================================
function renderizarTudo(dados) {
    const c = dados.candidato;
    const cfg = dados.config || {};
    const historico = dados.historico || [];
    const inscAtual = dados.inscricao_actual;
    const emAnalise = dados.em_analise === true;

    document.getElementById("cand-avatar").textContent = (c.nome_completo || "?").charAt(0).toUpperCase();
    document.getElementById("cand-nome-sidebar").textContent = c.nome_completo;
    document.getElementById("cand-bi-sidebar").textContent = "BI: " + c.bi_numero;
    document.getElementById("boas-vindas").textContent = "Bem-vindo de volta, " + c.nome_completo.split(" ")[0] + ".";

    document.getElementById("card-perfil-nome").textContent = c.nome_completo;
    document.getElementById("card-perfil-bi").textContent = "BI: " + c.bi_numero;

    if (inscAtual) {
        let estadoHtml = '<span class="badge badge-' + esc(inscAtual.estado) + '">' + esc(capitalizar(inscAtual.estado)) + '</span>';
        if (emAnalise) estadoHtml += ' <span class="badge badge-pendente" style="margin-left:6px;">Em análise</span>';
        document.getElementById("card-cand-estado").innerHTML = estadoHtml;
        document.getElementById("card-cand-ref").textContent = "Ref: " + inscAtual.referencia;
    } else {
        document.getElementById("card-cand-estado").textContent = "Sem candidatura";
        document.getElementById("card-cand-ref").textContent = "Ano " + cfg.ano_lectivo_actual;
    }

    document.getElementById("card-total-historico").textContent = historico.length;

    let numDocs = 0;
    if (inscAtual) {
        if (inscAtual.doc_bi_frente_url) numDocs++;
        if (inscAtual.doc_bi_verso_url) numDocs++;
        if (inscAtual.doc_certificado_url) numDocs++;
        if (inscAtual.doc_foto_url) numDocs++;
    }
    document.getElementById("card-total-docs").textContent = numDocs;

    // ============================================================
    // AVISOS E BOTÕES DE PAGAMENTO (NOVO)
    // ============================================================
    const aviso = document.getElementById("aviso-config");
    
    if (emAnalise) {
        aviso.className = "aviso-config fechado";
        aviso.innerHTML = '<i class="fas fa-lock"></i> A tua candidatura está a ser analisada pela secretaria. Não podes fazer alterações até a análise terminar.';
    } else if (inscAtual && inscAtual.estado === "aprovada") {
        // Alerta para pagar a matrícula
        aviso.className = "aviso-config aberto";
        aviso.style.backgroundColor = "#dbeafe"; // Azul claro
        aviso.style.borderColor = "#bfdbfe";
        aviso.style.color = "#1e3a8a";
        aviso.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; width:100%;">
                <div><i class="fas fa-check-circle" style="color:#059669;"></i> <strong>Parabéns! A tua candidatura foi aprovada.</strong> Efetua o pagamento da matrícula para garantires a tua vaga.</div>
                <button class="botao-primario" onclick="iniciarPagamentoMatricula('${inscAtual.id}')" style="white-space:nowrap;">
                    <i class="fas fa-credit-card"></i> Pagar Matrícula (3.000 Kz)
                </button>
            </div>
        `;
    } else if (inscAtual && inscAtual.estado === "matricula_paga") {
        aviso.className = "aviso-config aberto";
        aviso.innerHTML = '<i class="fas fa-clock"></i> Matrícula paga com sucesso! A aguardar atribuição de turma por parte da secretaria.';
    } else if (inscAtual && inscAtual.estado === "matriculado") {
        aviso.className = "aviso-config aberto";
        aviso.innerHTML = '<i class="fas fa-graduation-cap"></i> <strong>Estás oficialmente matriculado!</strong> Já podes criar a tua conta de aluno. <a href="criar-conta.html" style="font-weight:bold; text-decoration:underline; color:#065f46;">Criar Conta</a>';
    } else if (cfg.inscricoes_abertas) {
        aviso.className = "aviso-config aberto";
        aviso.innerHTML = '<i class="fas fa-check-circle"></i> As inscrições estão abertas para o ano letivo ' + esc(cfg.ano_lectivo_actual) + '.';
    } else {
        aviso.className = "aviso-config fechado";
        aviso.innerHTML = '<i class="fas fa-clock"></i> As inscrições estão fechadas. O ano letivo atual é ' + esc(cfg.ano_lectivo_actual) + '.';
    }

    const areaNova = document.getElementById("area-nova-candidatura");
    if (cfg.inscricoes_abertas && !inscAtual) areaNova.style.display = "block";
    else areaNova.style.display = "none";

    renderizarHistorico(historico);
    renderizarPerfil(c, inscAtual, emAnalise);
    renderizarDocumentos(inscAtual, emAnalise);
}

// ============================================================
// PAGAMENTO DA MATRÍCULA (NOVO)
// ============================================================
window.iniciarPagamentoMatricula = async function(inscricaoId) {
    const btn = event.currentTarget;
    const txtOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A processar...';

    const pag = await chamarEdge("criar-pagamento", {
        tipo: "matricula",
        inscricao_id: inscricaoId,
        token: tokenAtual
    });

    if (pag.ok) {
        window.location.href = `inscricao-simular-pagamento.html?tx=${pag.merchant_transaction_id}&ref=${pag.referencia}&valor=3000`;
    } else {
        alert(pag.erro || "Erro ao iniciar pagamento da matrícula.");
        btn.disabled = false;
        btn.innerHTML = txtOriginal;
    }
};

function renderizarHistorico(historico) {
    const container = document.getElementById("lista-historico");
    if (historico.length === 0) { container.innerHTML = '<div class="estado-vazio">Ainda não tens inscrições registadas.</div>'; return; }

    let html = '<div class="historico-grelha">';
    historico.forEach(i => {
        const isRejeitada = i.estado === "rejeitada";
        const podeRecandidatar = isRejeitada && i.codigo_rejeicao === 1;
        const aguardaMatricula = i.estado === "aprovada";

        html += '<div class="historico-card">';
        html += '  <div class="historico-card-topo"><div><h3 class="historico-card-titulo">' + esc(i.ano_lectivo) + '</h3><div class="historico-card-referencia">' + esc(i.referencia) + '</div></div><span class="badge badge-' + esc(i.estado) + '">' + esc(capitalizar(i.estado)) + '</span></div>';
        html += '  <div class="historico-card-meta"><span><strong>Classe:</strong> ' + esc(i.classe_pretendida) + '</span>';
        if (i.curso_pretendido) html += '<span><strong>Curso:</strong> ' + esc(i.curso_pretendido) + '</span>';
        html += '</div>';

        if (isRejeitada) {
            let codigoTxt = i.codigo_rejeicao === 1 ? "1 — Pode recandidatar" : "0 — Sem recandidatura neste ano";
            html += '<div class="historico-motivo">';
            html += '<div><strong>Motivo:</strong> ' + esc(i.motivo_rejeicao || "—") + '</div>';
            html += '<div style="margin-top:6px;"><strong>Código:</strong> ' + esc(codigoTxt) + '</div>';
            html += '</div>';
            if (podeRecandidatar) {
                html += '<div class="historico-acoes">';
                html += '  <button class="btn-acao btn-acao-primario" onclick="recandidatar(\'' + i.id + '\')"><i class="fas fa-redo"></i> Recandidatar</button>';
                html += '</div>';
            }
        } else if (aguardaMatricula) {
            // Botão de pagamento também no histórico
            html += '<div class="historico-acoes">';
            html += '  <button class="btn-acao btn-acao-primario" onclick="iniciarPagamentoMatricula(\'' + i.id + '\')"><i class="fas fa-credit-card"></i> Pagar Matrícula (3.000 Kz)</button>';
            html += '</div>';
        }
        html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderizarPerfil(c, inscAtual, emAnalise) {
    document.getElementById("edit-nome").value = c.nome_completo || "";
    document.getElementById("edit-bi").value = c.bi_numero || "";
    document.getElementById("edit-data-nasc").value = c.data_nascimento ? c.data_nascimento.slice(0,10) : "";
    document.getElementById("edit-genero").value = c.genero || "M";
    document.getElementById("edit-email").value = c.email || "";
    document.getElementById("edit-telefone").value = c.telefone || "";
    document.getElementById("edit-nome-encarregado").value = c.nome_encarregado || "";
    document.getElementById("edit-telefone-encarregado").value = c.telefone_encarregado || "";
    document.getElementById("edit-media").value = (inscAtual && inscAtual.media_certificado != null) ? inscAtual.media_certificado : "";

    const campos = ["edit-nome","edit-bi","edit-data-nasc","edit-genero","edit-telefone","edit-nome-encarregado","edit-telefone-encarregado","edit-media"];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = emAnalise;
    });
    const btnGuardar = document.getElementById("btn-guardar-perfil");
    if (btnGuardar) btnGuardar.disabled = emAnalise;
}

// ============================================================
// DOCUMENTOS
// ============================================================
async function renderizarDocumentos(insc, emAnalise) {
    const container = document.getElementById("lista-documentos");
    if (!container) return;
    if (!insc) { container.innerHTML = '<p style="color:var(--cor-texto-suave); font-size:0.9rem; grid-column:1/-1;">Nenhuma candidatura ativa para mostrar documentos.</p>'; return; }

    const docs = [
        { chave: "bi_frente", nome: "BI — Frente", icon: "fa-id-card", url: insc.doc_bi_frente_url },
        { chave: "bi_verso", nome: "BI — Verso", icon: "fa-id-card", url: insc.doc_bi_verso_url },
        { chave: "certificado", nome: "Certificado", icon: "fa-scroll", url: insc.doc_certificado_url },
        { chave: "foto", nome: "Foto tipo-passe", icon: "fa-camera", url: insc.doc_foto_url }
    ];

    const promises = docs.map(d => d.url ? obterUrlAssinada(d.url) : Promise.resolve(null));
    const urlsAssinadas = await Promise.all(promises);

    let html = "";
    docs.forEach((d, idx) => {
        const urlAssinada = urlsAssinadas[idx];
        html += '<div class="doc-card">';
        html += '  <i class="fas ' + d.icon + ' doc-icon"></i>';
        html += '  <div class="doc-nome">' + d.nome + '</div>';
        if (d.url) {
            html += '  <div class="doc-status ok">Enviado</div>';
            html += '  <div class="doc-acoes">';
            if (urlAssinada) html += '    <a href="' + urlAssinada + '" target="_blank" class="btn-ver">Ver</a>';
            else html += '    <span class="btn-ver" style="opacity:0.5;">Sem link</span>';
            if (!emAnalise) {
                html += '    <label class="btn-atualizar">Substituir<input type="file" accept="image/jpeg,image/png,application/pdf" data-tipo="' + d.chave + '"></label>';
            } else {
                html += '    <span class="btn-atualizar" style="opacity:0.5; cursor:not-allowed;">Bloqueado</span>';
            }
            html += '  </div>';
        } else {
            html += '  <div class="doc-status falta">Em falta</div>';
            if (!emAnalise) {
                html += '  <div class="doc-acoes"><label class="btn-atualizar">Enviar<input type="file" accept="image/jpeg,image/png,application/pdf" data-tipo="' + d.chave + '"></label></div>';
            }
        }
        html += '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('input[type="file"]').forEach(input => {
        input.addEventListener("change", async function () {
            const tipo = this.getAttribute("data-tipo");
            const file = this.files[0];
            if (!file) return;
            await atualizarDocumento(tipo, file, this);
        });
    });
}

async function obterUrlAssinada(caminho) {
    try {
        const res = await fetch(API.SUPABASE_URL + "/functions/v1/gerar-url-assinada", {
            method: "POST",
            headers: { "apikey": API.SUPABASE_ANON_KEY, "Authorization": "Bearer " + API.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ caminho: caminho })
        });
        if (res.ok) { const data = await res.json(); if (data.ok && data.url) return data.url; }
    } catch (e) { console.error(e); }
    return null;
}

// ============================================================
// ATUALIZAR DOCUMENTO
// ============================================================
async function atualizarDocumento(tipo, file, inputElement) {
    if (!dadosPainel || !dadosPainel.inscricao_actual) return;

    const cardEl = inputElement.closest(".doc-card");
    const statusEl = cardEl ? cardEl.querySelector(".doc-status") : null;

    const maxSize = tipo === "foto" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
        if (statusEl) { statusEl.textContent = "Ficheiro demasiado grande"; statusEl.className = "doc-status falta"; }
        inputElement.value = "";
        return;
    }

    if (statusEl) { statusEl.textContent = "A enviar..."; statusEl.className = "doc-status a-carregar"; }

    let blob = file;
    let ext = MIME_EXT[file.type] || "bin";
    if (file.type.startsWith("image/")) { blob = await comprimirImagem(file, 1024, 0.7); ext = "jpg"; }

    const uuid = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).substring(2);
    const caminho = "inscricoes/" + uuid + "." + ext;
    const urlUpload = API.SUPABASE_URL + "/storage/v1/object/cesc-inscricoes/" + caminho;

    let contentType = "application/octet-stream";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    if (ext === "png") contentType = "image/png";
    if (ext === "pdf") contentType = "application/pdf";

    try {
        const resUpload = await fetch(urlUpload, {
            method: "POST",
            headers: { "apikey": API.SUPABASE_ANON_KEY, "Authorization": "Bearer " + API.SUPABASE_ANON_KEY, "Content-Type": contentType },
            body: blob
        });

        if (!resUpload.ok) {
            if (statusEl) { statusEl.textContent = "Erro no envio (" + resUpload.status + ")"; statusEl.className = "doc-status falta"; }
            inputElement.value = "";
            return;
        }

        const res = await chamarRPC("cesc_candidato_atualizar_documento", {
            p_token: tokenAtual,
            p_inscricao_id: dadosPainel.inscricao_actual.id,
            p_tipo: tipo,
            p_url: caminho
        });

        if (res.ok) {
            if (statusEl) { statusEl.textContent = "Enviado"; statusEl.className = "doc-status ok"; }
            await carregarPainel();
        } else {
            if (statusEl) { statusEl.textContent = "Erro"; statusEl.className = "doc-status falta"; }
            console.error(res.erro);
        }
    } catch (e) {
        console.error(e);
        if (statusEl) { statusEl.textContent = "Erro de ligação"; statusEl.className = "doc-status falta"; }
    }
    inputElement.value = "";
}

// ============================================================
// RECANDIDATAR
// ============================================================
async function recandidatar(inscricaoId) {
    if (!confirm("Tens a certeza que queres recandidatar-te? A tua candidatura voltará a estar pendente para análise.")) return;
    const res = await chamarRPC("cesc_candidato_recandidatar", {
        p_token: tokenAtual,
        p_inscricao_id: inscricaoId
    });
    if (res.ok) {
        alert("Candidatura reenviada com sucesso.");
        await carregarPainel();
    } else {
        alert(res.erro || "Erro ao recandidatar.");
    }
}

function comprimirImagem(file, maxWidth, quality) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = e => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width, height = img.height;
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                canvas.width = width; canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => resolve(blob), "image/jpeg", quality);
            };
        };
    });
}

// ============================================================
// GUARDAR PERFIL
// ============================================================
async function guardarPerfil() {
    const msg = document.getElementById("msg-perfil");
    const btn = document.getElementById("btn-guardar-perfil");

    const nome = document.getElementById("edit-nome").value.trim();
    const bi = document.getElementById("edit-bi").value.trim().toUpperCase();
    const dataNasc = document.getElementById("edit-data-nasc").value || null;
    const genero = document.getElementById("edit-genero").value;
    const telefone = document.getElementById("edit-telefone").value.trim();
    const nomeEnc = document.getElementById("edit-nome-encarregado").value.trim();
    const telEnc = document.getElementById("edit-telefone-encarregado").value.trim();
    const mediaVal = document.getElementById("edit-media").value;
    const media = mediaVal !== "" ? parseFloat(mediaVal) : null;

    if (!nome || nome.length < 3) { mostrarMsg(msg, "Nome completo inválido.", "erro"); return; }
    if (!bi || bi.length < 6) { mostrarMsg(msg, "BI inválido.", "erro"); return; }
    if (media !== null && (isNaN(media) || media < 0 || media > 20)) { mostrarMsg(msg, "Média inválida (0-20).", "erro"); return; }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';

    const res = await chamarRPC("cesc_candidato_atualizar_perfil", {
        p_token: tokenAtual,
        p_nome_completo: nome,
        p_bi_numero: bi,
        p_data_nascimento: dataNasc,
        p_genero: genero,
        p_telefone: telefone,
        p_nome_encarregado: nomeEnc,
        p_telefone_encarregado: telEnc,
        p_media_certificado: media
    });

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Guardar alterações';

    if (res.ok) {
        mostrarMsg(msg, "Perfil atualizado com sucesso.", "sucesso");
        await carregarPainel();
    } else {
        mostrarMsg(msg, res.erro || "Erro ao guardar.", "erro");
    }
}

// ============================================================
// HISTÓRICO DE ALTERAÇÕES
// ============================================================
async function carregarHistoricoAlteracoes() {
    const container = document.getElementById("lista-historico-alteracoes");
    container.innerHTML = '<div class="loader-container" style="min-height:120px;"><div class="loader"></div></div>';

    const res = await chamarRPC("cesc_candidato_listar_historico", { p_token: tokenAtual });
    if (!res.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(res.erro || "Erro ao carregar.") + '</div>'; return; }

    const lista = res.historico || [];
    if (lista.length === 0) { container.innerHTML = '<div class="estado-vazio">Ainda não fizeste alterações.</div>'; return; }

    const mapa = { "nome_completo": "Nome", "data_nascimento": "Data de Nascimento", "genero": "Género", "telefone": "Telefone", "nome_encarregado": "Nome do Encarregado", "telefone_encarregado": "Telefone do Encarregado", "doc_bi_frente": "BI (Frente)", "doc_bi_verso": "BI (Verso)", "doc_certificado": "Certificado", "doc_foto": "Foto", "bi_numero": "BI", "media_certificado": "Média do Certificado" };

    let html = '<div class="historico-grelha">';
    lista.forEach(h => {
        html += '<div class="historico-card"><div class="historico-card-topo"><strong>' + esc(mapa[h.campo] || h.campo) + '</strong><span style="font-size:0.75rem; color:#94a3b8;">' + new Date(h.alterado_em).toLocaleString("pt-PT") + '</span></div>';
        html += '<div style="font-size:0.85rem; color:#475569;"><span style="text-decoration:line-through; color:#dc2626;">' + esc(h.valor_anterior || "—") + '</span> → <strong style="color:#065f46;">' + esc(h.valor_novo || "—") + '</strong></div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}
