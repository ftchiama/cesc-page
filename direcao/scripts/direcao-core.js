document.addEventListener("DOMContentLoaded", async function () {
    const token = exigirLogin();
    if (!token) return;

    const menuBtn = document.getElementById("menuMobileBtn");
    const sidebar = document.getElementById("sidebar");
    const sidebarFechar = document.getElementById("sidebarFechar");
    const overlay = document.getElementById("sidebarOverlay");
    
    function fecharSidebar() { 
        if (sidebar) sidebar.classList.remove("aberta"); 
        if (overlay) overlay.classList.remove("ativo"); 
    }
    
    if (menuBtn && sidebar && overlay) {
        menuBtn.addEventListener("click", () => { sidebar.classList.add("aberta"); overlay.classList.add("ativo"); });
    }
    if (sidebarFechar) sidebarFechar.addEventListener("click", fecharSidebar);
    if (overlay) overlay.addEventListener("click", fecharSidebar);

    document.querySelectorAll(".nav-item[data-seccao]").forEach(item => {
        item.addEventListener("click", e => {
            e.preventDefault();
            // Usa a função do DIRETOR, não a da secretária
            mostrarSeccaoDir(item.getAttribute("data-seccao"));
            fecharSidebar();
        });
    });

    const linkSair = document.getElementById("link-sair"); 
    if (linkSair) {
        linkSair.addEventListener("click", e => { e.preventDefault(); fazerLogout(); });
    }

    await carregarEstatisticas(token);
    
    const loaderEl = document.getElementById("loader"); 
    if (loaderEl) loaderEl.style.display = "none";
    
    const dashEl = document.getElementById("dashboard-conteudo"); 
    if (dashEl) dashEl.style.display = "block";

    if (typeof configurarFormUtilizador === "function") configurarFormUtilizador();
});

function mostrarSeccaoDir(id) {
    document.querySelectorAll(".pagina-seccao").forEach(s => s.classList.remove("ativa"));
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");
    
    document.querySelectorAll(".nav-item[data-seccao]").forEach(n => {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });

    // Carrega as secções usando as funções da secretária ou do diretor
    if (id === "alunos" && typeof carregarAlunos === "function") carregarAlunos();
    else if (id === "inscricoes" && typeof inicializarInscricoes === "function") inicializarInscricoes();
    else if (id === "matriculas" && typeof carregarMatriculas === "function") carregarMatriculas();
    else if (id === "documentos" && typeof carregarDocumentos === "function") carregarDocumentos();
    else if (id === "salas" && typeof carregarSalasDir === "function") carregarSalasDir();
    else if (id === "financeiro" && typeof carregarFinanceiroDir === "function") carregarFinanceiroDir();
    else if (id === "equipa" && typeof carregarEquipa === "function") { configurarFormUtilizador(); carregarEquipa(); }
    else if (id === "configuracoes" && typeof carregarConfiguracoes === "function") carregarConfiguracoes();
    else if (id === "aura" && typeof carregarAuraDir === "function") carregarAuraDir();
    
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function carregarEstatisticas(token) {
    const stats = await chamarRPC("cesc_diretor_estatisticas_globais", { p_token: token });
    if (stats.ok) {
        let html = '';
        html += '<div class="stat-card"><div class="stat-header"><i class="fas fa-money-bill-wave"></i> Receita Total</div><div class="stat-valor" style="color:#059669;">' + Number(stats.receita || 0).toLocaleString("pt-PT") + ' Kz</div></div>';
        html += '<div class="stat-card"><div class="stat-header"><i class="fas fa-user-graduate"></i> Alunos</div><div class="stat-valor">' + (stats.alunos || 0) + '</div></div>';
        html += '<div class="stat-card"><div class="stat-header"><i class="fas fa-chalkboard-teacher"></i> Professores</div><div class="stat-valor">' + (stats.professores || 0) + '</div></div>';
        html += '<div class="stat-card"><div class="stat-header"><i class="fas fa-school"></i> Salas</div><div class="stat-valor">' + (stats.salas || 0) + '</div></div>';
        
        const elStats = document.getElementById("stats-visao-geral");
        if (elStats) elStats.innerHTML = html;
    }
    const nomeSidebar = document.getElementById("dir-nome-sidebar"); 
    if (nomeSidebar) nomeSidebar.textContent = "Diretor";
}

// Helpers comuns (se não existirem no core da secretária)
if (typeof abrirModal !== 'function') {
    function abrirModal(titulo, htmlCorpo, acaoConfirmar, textoBotaoConfirmar) {
        const overlay = document.getElementById("modal-overlay");
        if (!overlay) return;
        
        const elTitulo = document.getElementById("modal-titulo");
        if (elTitulo) elTitulo.textContent = titulo;
        
        const elCorpo = document.getElementById("modal-corpo");
        if (elCorpo) elCorpo.innerHTML = htmlCorpo;
        
        const btnConfirmar = document.getElementById("modal-confirmar");
        if (!btnConfirmar) return;
        
        btnConfirmar.textContent = textoBotaoConfirmar || "Confirmar";
        
        const btnCancelar = document.getElementById("modal-cancelar");
        
        if (textoBotaoConfirmar === "Fechar") {
            btnConfirmar.style.display = "none";
            if (btnCancelar) {
                btnCancelar.style.display = "block";
                btnCancelar.onclick = () => { overlay.style.display = "none"; };
            }
        } else {
            btnConfirmar.style.display = "block";
            if (btnCancelar) {
                btnCancelar.style.display = "block";
                btnCancelar.onclick = () => { overlay.style.display = "none"; };
            }
            
            const novoBtn = btnConfirmar.cloneNode(true);
            btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);
            novoBtn.addEventListener("click", async function () {
                novoBtn.disabled = true;
                const deveFechar = await acaoConfirmar();
                novoBtn.disabled = false;
                if (deveFechar) overlay.style.display = "none";
            });
        }
        
        const btnFechar = document.getElementById("modal-fechar");
        if (btnFechar) btnFechar.onclick = () => { overlay.style.display = "none"; };
        
        overlay.style.display = "flex";
    }
}