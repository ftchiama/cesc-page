/*
 Autor: Francisco Tchiama
 Companhia: TCLabs
 Data: 11/11/2026
 Versão: 1.0
 Descrição:
 Carrega uma notícia específica na página noticia-detalhe.html.
 Usa a RPC cesc_noticias_publicas e filtra pelo ID do URL.
*/

document.addEventListener("DOMContentLoaded", async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const container = document.getElementById("noticia-conteudo");
    if (!container) return;

    if (!id) {
        container.innerHTML = '<div class="estado-vazio">Notícia não encontrada.</div>';
        return;
    }

    container.innerHTML = '<div class="loader-container" style="min-height:200px;"><div class="loader"></div></div>';

    const res = await chamarRPC("cesc_noticias_publicas", {});
    if (!res.ok) {
        container.innerHTML = '<div class="estado-vazio">Erro ao carregar.</div>';
        return;
    }

    const noticia = (res.noticias || []).find(n => n.id === id);
    if (!noticia) {
        container.innerHTML = '<div class="estado-vazio">Notícia não encontrada.</div>';
        return;
    }

    const data = new Date(noticia.data_publicacao);
    const dataFormatada = data.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

    container.innerHTML = `
        <span class="seccao-etiqueta">${esc(noticia.categoria || 'Notícia')}</span>
        <h1 class="seccao-titulo" style="text-align:left;">${esc(noticia.titulo)}</h1>
        <p style="color:var(--cor-texto-suave); font-size:0.9rem; margin-bottom:24px;">
            <i class="fas fa-calendar"></i> ${dataFormatada}
        </p>
        <div style="font-size:1.05rem; line-height:1.8; color:var(--cor-texto);">
            ${noticia.conteudo ? noticia.conteudo.replace(/\n/g, '<br>') : '<p>' + esc(noticia.resumo) + '</p>'}
        </div>
    `;
});