/*
 CESC — Direcção · Publicações (Notícias e Eventos)
 */

let noticiasCache = [];
let eventosCache = [];

async function carregarPublicacoes() {
    await Promise.all([carregarNoticias(), carregarEventos()]);
}

function mudarAbaPublicacoes(aba) {
    const abaN = document.getElementById("aba-noticias");
    const abaE = document.getElementById("aba-eventos");
    const btnN = document.getElementById("btn-aba-noticias");
    const btnE = document.getElementById("btn-aba-eventos");

    if (aba === "noticias") {
        abaN.style.display = "block";
        abaE.style.display = "none";
        btnN.style.cssText = "background: var(--cor-azul); color: #fff; border: 1px solid var(--cor-azul); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
        btnE.style.cssText = "background: transparent; color: var(--cor-texto-suave); border: 1px solid var(--cor-borda); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
    } else {
        abaN.style.display = "none";
        abaE.style.display = "block";
        btnN.style.cssText = "background: transparent; color: var(--cor-texto-suave); border: 1px solid var(--cor-borda); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
        btnE.style.cssText = "background: var(--cor-azul); color: #fff; border: 1px solid var(--cor-azul); padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;";
    }
}

// ============================================================
// NOTÍCIAS
// ============================================================
async function carregarNoticias() {
    const token = obterToken();
    const container = document.getElementById("lista-noticias-container");
    if (!container) return;
    container.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const res = await chamarRPC("cesc_diretor_listar_noticias", { p_token: token });
    if (!res.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(res.erro) + '</div>'; return; }

    noticiasCache = res.noticias || [];
    if (noticiasCache.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem notícias publicadas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Título</th><th>Categoria</th><th>Data</th><th>Destaque</th><th>Publicado</th><th>Acções</th></tr></thead><tbody>';
    noticiasCache.forEach(n => {
        html += `<tr>
            <td><strong>${esc(n.titulo)}</strong><br><span style="font-size:0.8rem; color:var(--cor-texto-suave);">${esc((n.resumo || '').substring(0, 80))}...</span></td>
            <td>${esc(n.categoria || '—')}</td>
            <td>${fmtData(n.data_publicacao)}</td>
            <td>${n.destaque ? '⭐ Sim' : 'Não'}</td>
            <td>${n.publicado ? '✅ Sim' : '❌ Não'}</td>
            <td>
                <button class="btn-acao btn-acao-secundario" onclick="abrirModalNoticia('${n.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro); border-color:var(--cor-erro);" onclick="apagarNoticia('${n.id}')">Apagar</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';

    // Mobile
    html += '<div class="cartoes-sec">';
    noticiasCache.forEach(n => {
        html += `<div class="cartao-sec">
            <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>${esc(n.titulo)}</strong><span>${fmtData(n.data_publicacao)} · ${esc(n.categoria || '—')}</span></div></div>
            <div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Destaque</span><span class="meta-valor">${n.destaque ? 'Sim' : 'Não'}</span></div><div class="meta-item"><span class="meta-rotulo">Publicado</span><span class="meta-valor">${n.publicado ? 'Sim' : 'Não'}</span></div></div>
            <div class="cartao-sec-acoes">
                <button class="btn-acao btn-acao-secundario" onclick="abrirModalNoticia('${n.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarNoticia('${n.id}')">Apagar</button>
            </div>
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

function abrirModalNoticia(id = null) {
    const noticia = id ? noticiasCache.find(n => n.id === id) : null;
    const dataPadrao = new Date().toISOString().slice(0,10);
    const html = `
        <div class="campo-grupo"><label>Título *</label><input type="text" id="not-titulo" value="${noticia ? esc(noticia.titulo) : ''}"></div>
        <div class="campo-grupo"><label>Resumo *</label><textarea id="not-resumo" rows="2">${noticia ? esc(noticia.resumo) : ''}</textarea></div>
        <div class="campo-grupo"><label>Conteúdo</label><textarea id="not-conteudo" rows="4">${noticia ? esc(noticia.conteudo) : ''}</textarea></div>
        <div class="form-grelha">
            <div class="campo-grupo"><label>Categoria</label><input type="text" id="not-categoria" value="${noticia ? esc(noticia.categoria || '') : 'Notícia'}" placeholder="Ex: Aviso, Evento, Feito Notável"></div>
            <div class="campo-grupo"><label>Data de Publicação</label><input type="date" id="not-data" value="${noticia ? noticia.data_publicacao : dataPadrao}"></div>
            <div class="campo-grupo"><label>Destaque</label><select id="not-destaque" class="campo-select"><option value="false">Não</option><option value="true" ${noticia && noticia.destaque ? 'selected' : ''}>Sim</option></select></div>
            <div class="campo-grupo"><label>Publicado</label><select id="not-publicado" class="campo-select"><option value="true" ${!noticia || noticia.publicado ? 'selected' : ''}>Sim</option><option value="false" ${noticia && !noticia.publicado ? 'selected' : ''}>Não</option></select></div>
        </div>
        <p id="msg-modal-noticia" class="msg-form" style="display:none;"></p>
    `;

    abrirModal(id ? "Editar Notícia" : "Nova Notícia", html, async function () {
        const msg = document.getElementById("msg-modal-noticia");
        msg.style.display = "none";
        const titulo = document.getElementById("not-titulo").value.trim();
        const resumo = document.getElementById("not-resumo").value.trim();
        if (!titulo || !resumo) { mostrarMsg(msg, "Preenche o título e o resumo.", "erro"); msg.style.display = "block"; return false; }

        const res = await chamarRPC("cesc_diretor_guardar_noticia", {
            p_token: obterToken(), p_id: id,
            p_titulo: titulo, p_resumo: resumo,
            p_conteudo: document.getElementById("not-conteudo").value.trim() || null,
            p_categoria: document.getElementById("not-categoria").value.trim() || 'Notícia',
            p_destaque: document.getElementById("not-destaque").value === "true",
            p_publicado: document.getElementById("not-publicado").value === "true",
            p_data_publicacao: document.getElementById("not-data").value || null
        });

        if (res.ok) { carregarNoticias(); return true; }
        mostrarMsg(msg, res.erro || "Erro ao guardar.", "erro"); msg.style.display = "block"; return false;
    }, "Guardar");
}

function apagarNoticia(id) {
    const html = `<p>Tens a certeza que queres apagar esta notícia?</p>`;
    abrirModal("Apagar Notícia", html, async function () {
        const res = await chamarRPC("cesc_diretor_apagar_noticia", { p_token: obterToken(), p_id: id });
        if (res.ok) { carregarNoticias(); return true; }
        return false;
    }, "Apagar");
}

// ============================================================
// EVENTOS
// ============================================================
async function carregarEventos() {
    const token = obterToken();
    const container = document.getElementById("lista-eventos-container");
    if (!container) return;
    container.innerHTML = '<div class="loader-container" style="min-height:100px;"><div class="loader"></div></div>';

    const res = await chamarRPC("cesc_diretor_listar_eventos", { p_token: token });
    if (!res.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(res.erro) + '</div>'; return; }

    eventosCache = res.eventos || [];
    if (eventosCache.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem eventos registados.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Título</th><th>Data</th><th>Publicado</th><th>Acções</th></tr></thead><tbody>';
    eventosCache.forEach(e => {
        html += `<tr>
            <td><strong>${esc(e.titulo)}</strong><br><span style="font-size:0.8rem; color:var(--cor-texto-suave);">${esc((e.descricao || '').substring(0, 60))}</span></td>
            <td>${fmtData(e.data_evento)}</td>
            <td>${e.publicado ? '✅ Sim' : '❌ Não'}</td>
            <td>
                <button class="btn-acao btn-acao-secundario" onclick="abrirModalEvento('${e.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro); border-color:var(--cor-erro);" onclick="apagarEvento('${e.id}')">Apagar</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    eventosCache.forEach(e => {
        html += `<div class="cartao-sec">
            <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>${esc(e.titulo)}</strong><span>${fmtData(e.data_evento)}</span></div></div>
            <div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Publicado</span><span class="meta-valor">${e.publicado ? 'Sim' : 'Não'}</span></div></div>
            <div class="cartao-sec-acoes">
                <button class="btn-acao btn-acao-secundario" onclick="abrirModalEvento('${e.id}')">Editar</button>
                <button class="btn-acao btn-acao-secundario" style="color:var(--cor-erro);" onclick="apagarEvento('${e.id}')">Apagar</button>
            </div>
        </div>`;
    });
    html += '</div>';

    container.innerHTML = html;
}

function abrirModalEvento(id = null) {
    const evento = id ? eventosCache.find(e => e.id === id) : null;
    const dataPadrao = new Date().toISOString().slice(0,10);
    const html = `
        <div class="campo-grupo"><label>Título *</label><input type="text" id="ev-titulo" value="${evento ? esc(evento.titulo) : ''}"></div>
        <div class="campo-grupo"><label>Descrição</label><textarea id="ev-descricao" rows="3">${evento ? esc(evento.descricao || '') : ''}</textarea></div>
        <div class="form-grelha">
            <div class="campo-grupo"><label>Data do Evento *</label><input type="date" id="ev-data" value="${evento ? evento.data_evento : dataPadrao}"></div>
            <div class="campo-grupo"><label>Publicado</label><select id="ev-publicado" class="campo-select"><option value="true" ${!evento || evento.publicado ? 'selected' : ''}>Sim</option><option value="false" ${evento && !evento.publicado ? 'selected' : ''}>Não</option></select></div>
        </div>
        <p id="msg-modal-evento" class="msg-form" style="display:none;"></p>
    `;

    abrirModal(id ? "Editar Evento" : "Novo Evento", html, async function () {
        const msg = document.getElementById("msg-modal-evento");
        msg.style.display = "none";
        const titulo = document.getElementById("ev-titulo").value.trim();
        if (!titulo) { mostrarMsg(msg, "Preenche o título.", "erro"); msg.style.display = "block"; return false; }

        const res = await chamarRPC("cesc_diretor_guardar_evento", {
            p_token: obterToken(), p_id: id,
            p_titulo: titulo,
            p_descricao: document.getElementById("ev-descricao").value.trim() || null,
            p_data_evento: document.getElementById("ev-data").value,
            p_publicado: document.getElementById("ev-publicado").value === "true"
        });

        if (res.ok) { carregarEventos(); return true; }
        mostrarMsg(msg, res.erro || "Erro ao guardar.", "erro"); msg.style.display = "block"; return false;
    }, "Guardar");
}

function apagarEvento(id) {
    const html = `<p>Tens a certeza que queres apagar este evento?</p>`;
    abrirModal("Apagar Evento", html, async function () {
        const res = await chamarRPC("cesc_diretor_apagar_evento", { p_token: obterToken(), p_id: id });
        if (res.ok) { carregarEventos(); return true; }
        return false;
    }, "Apagar");
}
