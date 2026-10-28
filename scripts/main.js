/*
 Autor: Francisco Tchiama
 Companhia: TCLabs
 Data: 18/10/2026
 Versão: 1.0
 Descrição:
 Script principal do portal CESC. Gere o menu mobile e actualiza o ano do rodapé.

 Como faz:
 - Seleciona os elementos do menu mobile (botão, painel, overlay).
 - Adiciona/remove a classe 'aberto' e 'ativo' ao clicar.
 - Bloqueia o scroll do body (overflow: hidden) quando o menu está aberto.
 - Actualiza o ano no elemento #currentYear.

 Porque faz:
 - Garante uma navegação suave em dispositivos móveis.
 - Evita que o utilizador perca o contexto da página ao abrir o menu.
 - Mantém o rodapé sempre actualizado sem intervenção manual.

 Alteração em 18/10/2026 (v1.0):
 - Criação do script para a Fase 1 do CESC.
 - Menu mobile funcional com overlay e bloqueio de scroll.
 - Actualização automática do ano no rodapé.
*/

document.addEventListener("DOMContentLoaded", function () {
    
    // 1. Configurar Menu Mobile
    var menuToggle = document.getElementById("menuToggle");
    var menuFechar = document.getElementById("menuFechar");
    var menuOverlay = document.getElementById("menuOverlay");
    var menuMobile = document.getElementById("menuMobile");

    function abrirMenu() {
        if (menuMobile) menuMobile.classList.add("aberto");
        if (menuOverlay) menuOverlay.classList.add("ativo");
        document.body.style.overflow = "hidden"; // Bloqueia scroll do fundo
    }

    function fecharMenu() {
        if (menuMobile) menuMobile.classList.remove("aberto");
        if (menuOverlay) menuOverlay.classList.remove("ativo");
        document.body.style.overflow = ""; // Devolve o scroll
    }

    if (menuToggle) menuToggle.addEventListener("click", abrirMenu);
    if (menuFechar) menuFechar.addEventListener("click", fecharMenu);
    if (menuOverlay) menuOverlay.addEventListener("click", fecharMenu);

    // Fechar menu ao clicar num link
    var linksMenu = document.querySelectorAll(".menu-mobile-links a");
    for (var i = 0; i < linksMenu.length; i++) {
        linksMenu[i].addEventListener("click", fecharMenu);
    }

    // 2. Actualizar o ano no rodapé
    var anoEl = document.getElementById("currentYear");
    if (anoEl) {
        anoEl.textContent = new Date().getFullYear();
    }
});
