document.addEventListener("DOMContentLoaded", async function () {
    const token = exigirLogin();
    if (!token) return;

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

    document.getElementById("link-sair").addEventListener("click", e => { e.preventDefault(); fazerLogout(); });

    await carregarEstatisticas(token);
    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";

    configurarFormUtilizador();
});

function mostrarSeccao(id) {
    document.querySelectorAll(".pagina-seccao").forEach(s => s.classList.remove("ativa"));
    document.getElementById("seccao-" + id).classList.add("ativa");
    
    document.querySelectorAll(".nav-item[data-seccao]").forEach(n => {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    if (id === "equipa") carregarEquipa();
    else if (id === "configuracoes") carregarConfiguracoes();
    else if (id === "salas") carregarSalasDir();
    else if (id === "inscricoes") carregarInscricoesDir();
    else if (id === "financeiro") carregarFinanceiroDir();
    else if (id === "alunos") carregarAlunosDir();
    else if (id === "professores") carregarProfDir();
    else if (id === "aura") carregarAuraDir(); // <-- NOVO
    
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function carregarEstatisticas(token) {
    const stats = await chamarRPC("cesc_diretor_estatisticas_globais", { p_token: token });
    if (stats.ok) {
        let html = '';
        html += '<div class="stat-card"><div class="stat-header"><i class="fas fa-money-bill-wave"></i> Receita Total</div><div class="stat-valor" style="color:#059669;">' + Number(stats.receita).toLocaleString("pt-PT") + ' Kz</div></div>';
        html += '<div class="stat-card"><div class="stat-header"><i class="fas fa-user-graduate"></i> Alunos</div><div class="stat-valor">' + stats.alunos + '</div></div>';
        html += '<div class="stat-card"><div class="stat-header"><i class="fas fa-chalkboard-teacher"></i> Professores</div><div class="stat-valor">' + stats.professores + '</div></div>';
        html += '<div class="stat-card"><div class="stat-header"><i class="fas fa-school"></i> Salas</div><div class="stat-valor">' + (stats.salas || 0) + '</div></div>';
        document.getElementById("stats-visao-geral").innerHTML = html;
    }
    document.getElementById("dir-nome-sidebar").textContent = "Diretor";
}

// Helpers comuns
function abrirModal(titulo, htmlCorpo, acaoConfirmar, textoBotaoConfirmar) {
    const overlay = document.getElementById("modal-overlay");
    document.getElementById("modal-titulo").textContent = titulo;
    document.getElementById("modal-corpo").innerHTML = htmlCorpo;
    const btnConfirmar = document.getElementById("modal-confirmar");
    btnConfirmar.textContent = textoBotaoConfirmar || "Confirmar";
    
    if (textoBotaoConfirmar === "Fechar") {
        btnConfirmar.style.display = "none";
        document.getElementById("modal-cancelar").style.display = "block";
        document.getElementById("modal-cancelar").onclick = () => { overlay.style.display = "none"; };
    } else {
        btnConfirmar.style.display = "block";
        document.getElementById("modal-cancelar").style.display = "block";
        const novoBtn = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);
        novoBtn.addEventListener("click", async function () {
            novoBtn.disabled = true;
            const deveFechar = await acaoConfirmar();
            novoBtn.disabled = false;
            if (deveFechar) overlay.style.display = "none";
        });
        document.getElementById("modal-cancelar").onclick = () => { overlay.style.display = "none"; };
    }
    document.getElementById("modal-fechar").onclick = () => { overlay.style.display = "none"; };
    overlay.style.display = "flex";
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

function capitalizar(s) { if (!s) return ""; return s.charAt(0).toUpperCase() + s.slice(1); }
function mostrarMsg(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto;
    el.className = "msg-form " + (tipo || "erro");
    if (tipo === "sucesso") setTimeout(() => { el.className = "msg-form"; el.textContent = ""; }, 2500);
}
