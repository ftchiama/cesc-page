/*
 CESC — Secretaria · Infraestrutura
 Data: 27/10/2026
 */

let salasCache = [];

async function carregarInfraestrutura() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById("lista-salas-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_secretaria_listar_salas", { p_token: token });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar salas.") + '</div>';
        return;
    }

    salasCache = dados.salas || [];
    
    // 1. Renderizar os Cards de Estatísticas
    renderizarEstatisticas(salasCache);

    // 2. Preencher o dropdown de pavilhões (apenas se ainda não estiver preenchido)
    const selPavilhao = document.getElementById("filtro-sala-pavilhao");
    if (selPavilhao && selPavilhao.options.length <= 1) {
        const pavilhoes = [...new Set(salasCache.map(s => s.pavilhao))].sort();
        pavilhoes.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            selPavilhao.appendChild(opt);
        });
        
        // Ligar os filtros
        document.getElementById("filtro-sala-turno").addEventListener("change", renderizarComFiltros);
        selPavilhao.addEventListener("change", renderizarComFiltros);
    }

    renderizarComFiltros();
}

function renderizarEstatisticas(salas) {
    // 1. Estatísticas Globais
    const totalSalas = salas.length;
    const pavilhoesUnicos = new Set(salas.map(s => s.pavilhao));
    const turnosUnicos = new Set(salas.map(s => s.turno));

    document.getElementById("stat-total-salas").textContent = totalSalas;
    document.getElementById("stat-total-pavilhoes").textContent = pavilhoesUnicos.size;
    document.getElementById("stat-total-turnos").textContent = turnosUnicos.size;

    // 2. Distribuição por Turno
    const resumoContainer = document.getElementById("lista-resumo-turnos");
    const cardResumo = document.getElementById("card-resumo-turnos");

    if (totalSalas === 0) {
        cardResumo.style.display = "none";
        return;
    }

    cardResumo.style.display = "block";

    // Agrupar
    const porTurno = {};
    salas.forEach(s => {
        if (!porTurno[s.turno]) {
            porTurno[s.turno] = { salas: 0, pavilhoes: new Set() };
        }
        porTurno[s.turno].salas++;
        porTurno[s.turno].pavilhoes.add(s.pavilhao);
    });

    let html = "";
    // Ordem lógica dos turnos (se existirem)
    const ordemTurnos = ["Matinal", "Vespertino", "Noturno"];
    
    ordemTurnos.forEach(turno => {
        if (!porTurno[turno]) return;
        
        const info = porTurno[turno];
        const numPavilhoes = info.pavilhoes.size;
        
        // Cores diferentes para cada turno (usando a paleta da escola)
        let corFundo = "var(--cor-azul-muito-claro)";
        let corTexto = "var(--cor-azul)";
        let icone = "fa-sun";
        
        if (turno === "Vespertino") { corFundo = "#fef3c7"; corTexto = "#92400e"; icone = "fa-cloud-sun"; }
        if (turno === "Noturno") { corFundo = "#e2e8f0"; corTexto = "#0f172a"; icone = "fa-moon"; }

        html += `
            <div style="background: ${corFundo}; border: 1px solid ${corTexto}22; padding: 16px 20px; border-radius: 12px; min-width: 200px; flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; color: ${corTexto}; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; margin-bottom: 8px;">
                    <i class="fas ${icone}"></i> Turno ${turno}
                </div>
                <div style="display: flex; gap: 20px;">
                    <div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${corTexto};">${info.salas}</div>
                        <div style="font-size: 0.75rem; color: ${corTexto}; opacity: 0.8;">Salas</div>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${corTexto};">${numPavilhoes}</div>
                        <div style="font-size: 0.75rem; color: ${corTexto}; opacity: 0.8;">Pavilhões</div>
                    </div>
                </div>
            </div>
        `;
    });

    resumoContainer.innerHTML = html;
}
function renderizarComFiltros() {
    const turno = document.getElementById("filtro-sala-turno").value;
    const pavilhao = document.getElementById("filtro-sala-pavilhao").value;

    let filtradas = salasCache;
    if (turno) filtradas = filtradas.filter(s => s.turno === turno);
    if (pavilhao) filtradas = filtradas.filter(s => s.pavilhao === pavilhao);

    renderizarListaSalas(filtradas, turno);
}

function renderizarListaSalas(salas, turnoFiltro) {
    const container = document.getElementById("lista-salas-container");
    if (salas.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhuma sala encontrada com estes filtros.</div>'; return; }

    // Agrupar por Turno (para manter a organização)
    const porTurno = {};
    salas.forEach(s => {
        if (!porTurno[s.turno]) porTurno[s.turno] = [];
        porTurno[s.turno].push(s);
    });

    let html = "";
    for (const turno in porTurno) {
        // Se o utilizador filtrou por um turno, não precisamos do título repetido (opcional)
        if (!turnoFiltro) {
            html += '<h3 style="margin-top:20px; margin-bottom:10px; color:var(--cor-azul); border-bottom:2px solid var(--cor-borda); padding-bottom:5px;">Turno ' + turno + '</h3>';
        }
        
        html += '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
        html += '<thead><tr><th>Pavilhão</th><th>Sala</th><th>Capacidade</th><th>Acções</th></tr></thead><tbody>';
        
        porTurno[turno].forEach(s => {
            html += '<tr>';
            html += '  <td>' + esc(s.pavilhao) + '</td>';
            html += '  <td>' + esc(s.nome_sala) + '</td>';
            html += '  <td>' + s.capacidade + ' alunos</td>';
            html += '  <td><button class="btn-acao btn-acao-secundario" onclick="apagarSala(\'' + s.id + '\', \'' + esc(s.pavilhao) + ' - ' + esc(s.nome_sala) + '\')"><i class="fas fa-trash"></i> Apagar</button></td>';
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        
        // Versão mobile
        html += '<div class="cartoes-sec">';
        porTurno[turno].forEach(s => {
            html += '<div class="cartao-sec">';
            html += '  <div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(s.pavilhao) + ' - ' + esc(s.nome_sala) + '</strong><span>Capacidade: ' + s.capacidade + ' alunos</span></div></div>';
            html += '  <div class="cartao-sec-acoes">';
            html += '    <button class="btn-acao btn-acao-secundario" onclick="apagarSala(\'' + s.id + '\', \'' + esc(s.pavilhao) + ' - ' + esc(s.nome_sala) + '\')"><i class="fas fa-trash"></i> Apagar Sala</button>';
            html += '  </div>';
            html += '</div>';
        });
        html += '</div>';
    }

    container.innerHTML = html;
}
// ============================================================
// APAGAR SALA (Usando o Modal Genérico)
// ============================================================
function apagarSala(id, nome) {
    const html = `
        <p>Tens a certeza que queres apagar a sala <strong>${esc(nome)}</strong>?</p>
        <p style="font-size:0.85rem; color:var(--cor-erro); background:var(--cor-erro-fundo); padding:10px; border-radius:8px; border:1px solid #fecaca;">
            <i class="fas fa-exclamation-triangle"></i> Esta ação não pode ser desfeita.
        </p>
    `;

    // Chama a função abrirModal(titulo, html, acaoConfirmar, textoBotao)
    abrirModal("Apagar Sala", html, async function () {
        const token = obterToken();
        const res = await chamarRPC("cesc_secretaria_apagar_sala", {
            p_token: token,
            p_sala_id: id
        });

        if (res.ok) {
            carregarInfraestrutura(); // Recarrega a lista
            return true; // Fecha o modal
        } else {
            // Em vez de alert, podes colocar o erro no próprio modal se quiseres,
            // mas por agora mantemos o alerta simples para erros graves de BD.
            alert(res.erro || "Erro ao apagar a sala.");
            return false; // Mantém o modal aberto
        }
    }, "Sim, Apagar");
}

// ============================================================
// CRIAR SALA
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    const btnNova = document.getElementById("btn-nova-sala");
    const form = document.getElementById("form-nova-sala");
    const btnCancelar = document.getElementById("btn-cancelar-sala");
    const btnGuardar = document.getElementById("btn-guardar-sala");
    const msg = document.getElementById("msg-nova-sala");

    if (!btnNova || !form) return;

    btnNova.addEventListener("click", function () {
        form.style.display = form.style.display === "none" ? "block" : "none";
        if (msg) { msg.className = "msg-form"; msg.textContent = ""; }
    });

    if (btnCancelar) {
        btnCancelar.addEventListener("click", function () {
            form.style.display = "none";
        });
    }

    if (btnGuardar) {
        btnGuardar.addEventListener("click", async function () {
            const token = obterToken();
            const pavilhao = document.getElementById("sala-pavilhao").value.trim();
            const nome_sala = document.getElementById("sala-nome").value.trim();
            const turno = document.getElementById("sala-turno").value;
            const capacidade = parseInt(document.getElementById("sala-capacidade").value, 10) || 35;

            if (!pavilhao || !nome_sala) {
                mostrarMsg(msg, "Preenche o pavilhão e o nome da sala.", "erro");
                return;
            }

            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';

            const res = await chamarRPC("cesc_secretaria_criar_sala", {
                p_token: token,
                p_pavilhao: pavilhao,
                p_nome_sala: nome_sala,
                p_turno: turno,
                p_capacidade: capacidade
            });

            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Sala';

            if (!res.ok) {
                mostrarMsg(msg, res.erro || "Erro ao criar sala.", "erro");
                return;
            }

            mostrarMsg(msg, "Sala criada com sucesso.", "sucesso");
            
            document.getElementById("sala-pavilhao").value = "";
            document.getElementById("sala-nome").value = "";
            document.getElementById("sala-capacidade").value = "35";
            
            setTimeout(function () {
                form.style.display = "none";
                // Forçar o recarregamento total para atualizar os dropdowns de pavilhões
                const selPavilhao = document.getElementById("filtro-sala-pavilhao");
                if (selPavilhao) selPavilhao.innerHTML = '<option value="">Todos os Pavilhões</option>';
                carregarInfraestrutura(); 
            }, 800);
        });
    }
});

// Ligar a navegação
const originalMostrarSeccaoInfra = window.mostrarSeccao;
window.mostrarSeccao = function(id) {
    originalMostrarSeccaoInfra(id);
    if (id === "infraestrutura") carregarInfraestrutura();
};
