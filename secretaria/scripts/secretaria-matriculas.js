/*
 CESC — Secretaria · Matrículas
 Data: 05/11/2026
 */

let matriculasCache = [];
let alunosParaMatricular = [];
let salasDisponiveis = [];

async function carregarMatriculas() {
    const token = obterToken();
    if (!token) return;
    
    const container = document.getElementById("lista-matriculas-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const filtroAno = document.getElementById("filtro-matriculas-ano");
    
    // 1. Carregar os anos reais da base de dados (apenas na primeira vez)
    if (filtroAno && !filtroAno.dataset.ligado) {
        const resAnos = await chamarRPC("cesc_secretaria_listar_anos_matriculas", { p_token: token });
        
        if (resAnos.ok && resAnos.anos && resAnos.anos.length > 0) {
            filtroAno.innerHTML = "";
            resAnos.anos.forEach(ano => {
                const opt = document.createElement("option");
                opt.value = ano;
                opt.textContent = ano;
                filtroAno.appendChild(opt);
            });
        } else {
            const anoAtual = new Date().getFullYear();
            filtroAno.innerHTML = `<option value="${anoAtual}/${anoAtual + 1}">${anoAtual}/${anoAtual + 1}</option>`;
        }

        filtroAno.dataset.ligado = "1";
        filtroAno.addEventListener("change", function () { carregarMatriculas(); });

        const filtroNome = document.getElementById("filtro-matriculas-nome");
        if (filtroNome) {
            filtroNome.addEventListener("input", function() {
                const termo = this.value.toLowerCase();
                const filtrados = matriculasCache.filter(m => 
                    (m.aluno_nome || "").toLowerCase().includes(termo) || 
                    (m.aluno_bi || "").toLowerCase().includes(termo)
                );
                renderizarListaMatriculas(filtrados);
            });
        }
    }

    const ano = filtroAno ? filtroAno.value : "";

    // 2. Carregar Stats
    if (ano) {
        const stats = await chamarRPC("cesc_secretaria_stats_matriculas", { p_token: token, p_ano_lectivo: ano });
        if (stats.ok) {
            document.getElementById("stat-matriculas-total").textContent = stats.total;
            document.getElementById("stat-matriculas-activos").textContent = stats.activos;
            document.getElementById("stat-matriculas-pendentes").textContent = stats.pendentes;
        }
    }

    // 3. Carregar Lista
    const dados = await chamarRPC("cesc_secretaria_listar_matriculas", { p_token: token, p_ano_lectivo: ano || null });

    if (!dados.ok) { container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar.") + '</div>'; return; }

    matriculasCache = dados.matriculas || [];
    renderizarListaMatriculas(matriculasCache);
}

function renderizarListaMatriculas(matriculas) {
    const container = document.getElementById("lista-matriculas-container");
    if (matriculas.length === 0) { container.innerHTML = '<div class="estado-vazio">Sem matrículas registadas.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Aluno</th><th>Ano letivo</th><th>Classe / Turma</th><th class="col-opcional">Curso</th><th class="col-opcional">Nº</th><th>Estado</th></tr></thead><tbody>';
    matriculas.forEach(function (m) {
        html += '<tr><td><div class="celula-nome"><strong>' + esc(m.aluno_nome) + '</strong><span>BI: ' + esc(m.aluno_bi) + '</span></div></td><td>' + esc(m.ano_lectivo) + '</td><td>' + esc(m.classe) + ' · ' + esc(m.turma) + '</td><td class="col-opcional">' + esc(m.curso || "—") + '</td><td class="col-opcional">' + (m.numero_aluno != null ? m.numero_aluno : "—") + '</td><td><span class="badge badge-' + esc(m.estado || "activo") + '">' + esc(capitalizar(m.estado || "activo")) + '</span></td></tr>';
    });
    html += '</tbody></table></div>';

    html += '<div class="cartoes-sec">';
    matriculas.forEach(function (m) {
        html += '<div class="cartao-sec"><div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(m.aluno_nome) + '</strong><span>BI: ' + esc(m.aluno_bi) + '</span></div><span class="badge badge-' + esc(m.estado || "activo") + '">' + esc(capitalizar(m.estado || "activo")) + '</span></div>';
        html += '<div class="cartao-sec-meta"><div class="meta-item"><span class="meta-rotulo">Ano</span><span class="meta-valor">' + esc(m.ano_lectivo) + '</span></div><div class="meta-item"><span class="meta-rotulo">Classe/Turma</span><span class="meta-valor">' + esc(m.classe) + ' · ' + esc(m.turma) + '</span></div>';
        if (m.curso) html += '<div class="meta-item"><span class="meta-rotulo">Curso</span><span class="meta-valor">' + esc(m.curso) + '</span></div>';
        if (m.numero_aluno != null) html += '<div class="meta-item"><span class="meta-rotulo">Nº</span><span class="meta-valor">' + m.numero_aluno + '</span></div>';
        html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function configurarFormNovaMatricula() {
    const btnNova = document.getElementById("btn-nova-matricula");
    const form = document.getElementById("form-nova-matricula");
    
    // Se for diretor, esconde o botão e o formulário
    if (window.ROLE_UTILIZADOR === 'diretor' || window.ROLE_UTILIZADOR === 'sub_diretor') {
        if (btnNova) btnNova.style.display = "none";
        if (form) form.style.display = "none";
        return;
    }

    const btnCancelar = document.getElementById("btn-cancelar-matricula");
    const btnGuardar = document.getElementById("btn-guardar-matricula");
    const msg = document.getElementById("msg-nova-matricula");
    if (!btnNova || !form) return;

    btnNova.addEventListener("click", async function () {
        form.style.display = form.style.display === "none" ? "block" : "none";
        if (form.style.display === "block") {
            document.getElementById("mat-pesquisa-aluno").value = "";
            document.getElementById("mat-pesquisa-sala").value = "";
            document.getElementById("mat-classe").value = "";
            document.getElementById("mat-curso").value = "";
            document.getElementById("mat-aluno-id").value = "";
            document.getElementById("mat-sala-id").value = "";
            document.getElementById("resultado-pesquisa-aluno").style.display = "none";
            document.getElementById("resultado-pesquisa-sala").style.display = "none";

            const token = obterToken();
            const ano = document.getElementById("filtro-matriculas-ano").value;
            
            if (!ano) { alert("Selecione um ano letivo."); return; }

            const [resAlunos, resSalas] = await Promise.all([
                chamarRPC("cesc_secretaria_listar_alunos_para_matricular", { p_token: token, p_ano_lectivo: ano }),
                chamarRPC("cesc_secretaria_listar_salas", { p_token: token })
            ]);

            alunosParaMatricular = resAlunos.ok ? resAlunos.alunos : [];
            salasDisponiveis = resSalas.ok ? resSalas.salas : [];
        }
    });

    // Pesquisa de Aluno
    document.getElementById("mat-pesquisa-aluno").addEventListener("input", function() {
        const termo = this.value.toLowerCase();
        const divRes = document.getElementById("resultado-pesquisa-aluno");
        
        if (termo.length < 2) { divRes.style.display = "none"; return; }

        const filtrados = alunosParaMatricular.filter(a => 
            (a.nome_completo || "").toLowerCase().includes(termo) || 
            (a.bi_numero || "").toLowerCase().includes(termo)
        );

        if (filtrados.length === 0) {
            divRes.innerHTML = '<div style="padding:10px; font-size:0.85rem; color:#94a3b8;">Nenhum aluno encontrado.</div>';
        } else {
            let html = "";
            filtrados.forEach(a => {
                html += `<div style="padding:10px; border-bottom:1px solid #e2e8f0; cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'" 
                    onclick="selecionarAluno('${a.id}', '${esc(a.nome_completo)}', '${esc(a.classe_pretendida)}', '${esc(a.curso_pretendido || '')}')">
                    <strong>${esc(a.nome_completo)}</strong> <br><span style="font-size:0.8rem; color:#64748b;">BI: ${esc(a.bi_numero)}</span>
                </div>`;
            });
            divRes.innerHTML = html;
        }
        divRes.style.display = "block";
    });

    // Pesquisa de Sala
    document.getElementById("mat-pesquisa-sala").addEventListener("input", function() {
        const termo = this.value.toLowerCase();
        const divRes = document.getElementById("resultado-pesquisa-sala");
        
        if (termo.length < 1) { divRes.style.display = "none"; return; }

        const filtrados = salasDisponiveis.filter(s => 
            (s.pavilhao || "").toLowerCase().includes(termo) || 
            (s.nome_sala || "").toLowerCase().includes(termo)
        );

        if (filtrados.length === 0) {
            divRes.innerHTML = '<div style="padding:10px; font-size:0.85rem; color:#94a3b8;">Nenhuma sala encontrada.</div>';
        } else {
            let html = "";
            filtrados.forEach(s => {
                html += `<div style="padding:10px; border-bottom:1px solid #e2e8f0; cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'" 
                    onclick="selecionarSala('${s.id}', '${esc(s.pavilhao)} - ${esc(s.nome_sala)}')">
                    <strong>${esc(s.pavilhao)} - ${esc(s.nome_sala)}</strong> <br><span style="font-size:0.8rem; color:#64748b;">Capacidade: ${s.capacidade}</span>
                </div>`;
            });
            divRes.innerHTML = html;
        }
        divRes.style.display = "block";
    });

    if (btnCancelar) btnCancelar.addEventListener("click", function () { form.style.display = "none"; });

    if (btnGuardar) {
        btnGuardar.addEventListener("click", async function () {
            const token = obterToken();
            const alunoId = document.getElementById("mat-aluno-id").value;
            const salaId = document.getElementById("mat-sala-id").value;

            if (!alunoId || !salaId) { 
                mostrarMsg(msg, "Seleciona o Aluno e a Sala.", "erro"); 
                return; 
            }

            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A guardar...';

            const dados = await chamarRPC("cesc_secretaria_criar_matricula", {
                p_token: token, p_aluno_id: alunoId, p_sala_id: salaId
            });

            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<i class="fas fa-save"></i> Confirmar Matrícula';

            if (!dados.ok) { mostrarMsg(msg, dados.erro || "Erro ao registar.", "erro"); return; }

            mostrarMsg(msg, `Aluno matriculado! Nº de aluno: ${dados.numero_atribuido}`, "sucesso");
            setTimeout(function () { form.style.display = "none"; carregarMatriculas(); }, 1500);
        });
    }
}

// Funções Globais chamadas pelos eventos onclick do HTML injetado
function selecionarAluno(id, nome, classe, curso) {
    document.getElementById("mat-aluno-id").value = id;
    document.getElementById("mat-pesquisa-aluno").value = nome;
    document.getElementById("mat-classe").value = classe;
    document.getElementById("mat-curso").value = curso;
    document.getElementById("resultado-pesquisa-aluno").style.display = "none";
}

function selecionarSala(id, nome) {
    document.getElementById("mat-sala-id").value = id;
    document.getElementById("mat-pesquisa-sala").value = nome;
    document.getElementById("resultado-pesquisa-sala").style.display = "none";
}
