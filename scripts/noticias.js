/*
 Autor: Francisco Tchiama
 Companhia: TCLabs
 Data: 11/11/2026
 Versão: 1.0
 Descrição:
 Carrega a lista de notícias publicadas na página noticias.html.
 Usa a RPC cesc_noticias_publicas.
*/

document.addEventListener("DOMContentLoaded", async function () {
    const container = document.getElementById("lista-noticias-publicas");
    if (!container) return;

    container.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const res = await chamarRPC("cesc_noticias_publicas", {});
    if (!res.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(res.erro) + '</div>';
        return;
    }

    const lista = res.noticias || [];
    if (lista.length === 0) {
        container.innerHTML = '<div class="estado-vazio">Ainda não há notícias publicadas.</div>';
        return;
    }

    let html = '<div class="grelha-noticias">';
    lista.forEach(n => {
        const data = new Date(n.data_publicacao);
        const dia = data.getDate().toString().padStart(2, '0');
        const mes = data.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');
        html += `
            <a href="noticia-detalhe.html?id=${n.id}" class="cartao-noticia">
                <div class="cartao-noticia-data"><span>${dia}</span> ${mes}</div>
                <h3>${esc(n.titulo)}</h3>
                <p>${esc(n.resumo)}</p>
                <span class="cartao-noticia-tag">${esc(n.categoria || 'Notícia')}</span>
            </a>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
});