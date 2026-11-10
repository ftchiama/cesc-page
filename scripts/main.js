/*
 Autor: Francisco Tchiama
 Companhia: TCLabs
 Data: 11/11/2026
 Versão: 2.0
 Descrição:
 Script principal do portal CESC. Gere o menu mobile, atualiza o ano do rodapé
 e carrega os dados dinâmicos da Home (notícias, eventos e estado das inscrições).

 Como faz:
 - Configura o drawer mobile (abrir/fechar + overlay).
 - Atualiza o ano no rodapé (#currentYear).
 - Chama a RPC cesc_home_dados e preenche:
   - Hero (botões de inscrição ou aviso de fechado).
   - Destaques (carrossel de notícias).
   - Calendário (próximos eventos).

 Porque faz:
 - Garante que o site público reflete o estado real da base de dados.
 - Se o Diretor fechar as inscrições, os botões desaparecem automaticamente.
 - Se não houver notícias/eventos, as secções ficam escondidas.
*/

document.addEventListener("DOMContentLoaded", async function () {
    // 1. Menu Mobile (drawer)
    const menuBtn = document.getElementById("menuToggle");
    const sidebar = document.getElementById("menuMobile");
    const overlay = document.getElementById("menuOverlay");
    const fechar = document.getElementById("menuFechar");

    function abrirMenu() {
        if (sidebar) sidebar.classList.add("aberta");
        if (overlay) overlay.classList.add("ativo");
        document.body.style.overflow = "hidden";
    }
    function fecharMenu() {
        if (sidebar) sidebar.classList.remove("aberta");
        if (overlay) overlay.classList.remove("ativo");
        document.body.style.overflow = "";
    }

    if (menuBtn) menuBtn.addEventListener("click", abrirMenu);
    if (fechar) fechar.addEventListener("click", fecharMenu);
    if (overlay) overlay.addEventListener("click", fecharMenu);

    document.querySelectorAll(".sidebar-nav a").forEach(link => {
        link.addEventListener("click", fecharMenu);
    });

    // 2. Atualizar o ano no rodapé
    const anoEl = document.getElementById("currentYear");
    if (anoEl) anoEl.textContent = new Date().getFullYear();

    // 3. Carregar os dados da Home
    if (typeof chamarRPC !== "function") return;

    const homeDados = await chamarRPC("cesc_home_dados", {});
    if (!homeDados.ok) return;

    // 3.1. Estado das Inscrições
    const heroAcoes = document.getElementById("hero-acoes");
    const heroBadge = document.getElementById("hero-badge-inscricoes");
    const heroAno = document.getElementById("hero-ano-lectivo");

    if (homeDados.inscricoes_abertas) {
        if (heroBadge) heroBadge.style.display = "block";
        if (heroAno) heroAno.textContent = homeDados.ano_lectivo || "";
        if (heroAcoes) heroAcoes.innerHTML = `
            <a href="paginas/inscricao.html" class="botao-primario">
                <i class="fas fa-user-plus"></i> Inscrever novo aluno
            </a>
            <a href="paginas/consultar-inscricao.html" class="botao-secundario">
                <i class="fas fa-search"></i> Consultar inscrição
            </a>
        `;
    } else {
        if (heroBadge) heroBadge.style.display = "none";
        if (heroAcoes) heroAcoes.innerHTML = `
            <div style="background:#fef3c7; border:1px solid #fcd34d; color:#92400e; padding:12px 20px; border-radius:8px; font-size:0.9rem;">
                <i class="fas fa-clock"></i> As inscrições estão fechadas no momento.
            </div>
        `;
    }

    // 3.2. Destaques (Notícias)
    if (homeDados.noticias && homeDados.noticias.length > 0) {
        const lista = document.getElementById("lista-destaques");
        const seccao = document.getElementById("seccao-destaques");
        lista.innerHTML = homeDados.noticias.map(n => {
            const data = new Date(n.data);
            const dia = data.getDate().toString().padStart(2, '0');
            const mes = data.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');
            return `
                <a href="paginas/noticias.html?id=${n.id}" class="cartao-aviso cartao-aviso-link">
                    <div class="aviso-data"><span>${dia}</span> ${mes}</div>
                    <div class="aviso-info">
                        <h3>${esc(n.titulo)}</h3>
                        <p>${esc(n.resumo)}</p>
                        <span class="aviso-tag">${esc(n.categoria)}</span>
                    </div>
                </a>
            `;
        }).join("");
        if (seccao) seccao.style.display = "block";
    }

    // 3.3. Eventos
    if (homeDados.eventos && homeDados.eventos.length > 0) {
        const lista = document.getElementById("lista-eventos");
        const seccao = document.getElementById("seccao-calendario");
        lista.innerHTML = homeDados.eventos.map(e => {
            const data = new Date(e.data);
            const dia = data.getDate().toString().padStart(2, '0');
            const mes = data.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');
            return `
                <div class="evento">
                    <div class="evento-data"><span>${dia}</span> ${mes}</div>
                    <div class="evento-info">
                        <h4>${esc(e.titulo)}</h4>
                        <p>${esc(e.descricao || '')}</p>
                    </div>
                </div>
            `;
        }).join("");
        if (seccao) seccao.style.display = "block";
    }
});