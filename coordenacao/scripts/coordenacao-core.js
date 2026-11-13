document.addEventListener("DOMContentLoaded", async function () {
    const token = exigirLogin();
    if (!token) return;

    // Menu mobile
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
            mostrarSeccaoCoord(item.getAttribute("data-seccao"));
            fecharSidebar();
        });
    });

    const linkSair = document.getElementById("link-sair");
    if (linkSair) linkSair.addEventListener("click", e => { e.preventDefault(); fazerLogout(); });

    document.getElementById("loader").style.display = "none";
    document.getElementById("dashboard-conteudo").style.display = "block";

    await carregarTempos();
    await carregarDisponibilidade();
    await carregarHorarios();
});

function mostrarSeccaoCoord(id) {
    document.querySelectorAll(".pagina-seccao").forEach(s => s.classList.remove("ativa"));
    const alvo = document.getElementById("seccao-" + id);
    if (alvo) alvo.classList.add("ativa");
    document.querySelectorAll(".nav-item[data-seccao]").forEach(n => {
        n.classList.toggle("ativo", n.getAttribute("data-seccao") === id);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirModal(titulo, htmlCorpo, acaoConfirmar, textoBotaoConfirmar) {
    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;
    document.getElementById("modal-titulo").textContent = titulo;
    document.getElementById("modal-corpo").innerHTML = htmlCorpo;
    const btnConfirmar = document.getElementById("modal-confirmar");
    if (!btnConfirmar) return;
    btnConfirmar.textContent = textoBotaoConfirmar || "Confirmar";
    const btnCancelar = document.getElementById("modal-cancelar");
    if (btnCancelar) btnCancelar.onclick = () => { overlay.style.display = "none"; };
    const novoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtn, btnConfirmar);
    novoBtn.addEventListener("click", async function () {
        novoBtn.disabled = true;
        const deveFechar = await acaoConfirmar();
        novoBtn.disabled = false;
        if (deveFechar) overlay.style.display = "none";
    });
    const btnFechar = document.getElementById("modal-fechar");
    if (btnFechar) btnFechar.onclick = () => { overlay.style.display = "none"; };
    overlay.style.display = "flex";
}

function mostrarMsg(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto;
    el.className = "msg-form " + (tipo || "erro");
    if (tipo === "sucesso") setTimeout(() => { el.className = "msg-form"; el.textContent = ""; }, 3000);
}

function capitalizar(s) { if (!s) return ""; return s.charAt(0).toUpperCase() + s.slice(1); }