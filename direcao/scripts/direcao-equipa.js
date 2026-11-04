async function carregarEquipa() {
    const token = obterToken();
    if (!token) return;

    const container = document.getElementById("lista-utilizadores-container");
    container.innerHTML = '<div class="loader-container" style="min-height:180px;"><div class="loader"></div></div>';

    const dados = await chamarRPC("cesc_diretor_listar_equipa", { p_token: token });

    if (!dados.ok) {
        container.innerHTML = '<div class="estado-vazio">' + esc(dados.erro || "Erro ao carregar equipa.") + '</div>';
        return;
    }

    renderizarListaEquipa(dados.utilizadores || []);
}

function renderizarListaEquipa(lista) {
    const container = document.getElementById("lista-utilizadores-container");
    if (lista.length === 0) { container.innerHTML = '<div class="estado-vazio">Nenhum utilizador registado.</div>'; return; }

    let html = '<div class="tabela-wrapper tabela-sec-wrapper"><table class="tabela-sec">';
    html += '<thead><tr><th>Nome</th><th>Email</th><th>Função</th><th>Estado</th><th>Acções</th></tr></thead><tbody>';
    lista.forEach(u => {
        html += '<tr>';
        html += '  <td><strong>' + esc(u.nome_completo) + '</strong></td>';
        html += '  <td>' + esc(u.email) + '</td>';
        html += '  <td><span class="badge badge-activo">' + capitalizar(u.role) + '</span></td>';
        html += '  <td><span class="badge badge-' + (u.ativo ? "activo" : "desistente") + '">' + (u.ativo ? "Ativo" : "Inativo") + '</span></td>';
        html += '  <td><button class="btn-acao btn-acao-secundario" onclick="apagarUtilizador(\'' + u.id + '\', \'' + esc(u.nome_completo) + '\')"><i class="fas fa-trash"></i> Apagar</button></td>';
        html += '</tr>';
    });
    html += '</tbody></table></div>';
    
    // Mobile
    html += '<div class="cartoes-sec">';
    lista.forEach(u => {
        html += '<div class="cartao-sec"><div class="cartao-sec-topo"><div class="cartao-sec-info"><strong>' + esc(u.nome_completo) + '</strong><span>' + esc(u.email) + '</span></div><span class="badge badge-activo">' + capitalizar(u.role) + '</span></div>';
        html += '<div class="cartao-sec-acoes"><button class="btn-acao btn-acao-secundario" onclick="apagarUtilizador(\'' + u.id + '\', \'' + esc(u.nome_completo) + '\')"><i class="fas fa-trash"></i> Apagar Utilizador</button></div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
}

function configurarFormUtilizador() {
    const btnNovo = document.getElementById("btn-novo-utilizador");
    const form = document.getElementById("form-novo-utilizador");
    const btnCancelar = document.getElementById("btn-cancelar-utilizador");
    const btnGuardar = document.getElementById("btn-guardar-utilizador");
    const msg = document.getElementById("msg-novo-utilizador");

    if (!btnNovo || !form) return;

    btnNovo.addEventListener("click", () => {
        form.style.display = form.style.display === "none" ? "block" : "none";
        msg.textContent = "";
    });

    if (btnCancelar) btnCancelar.addEventListener("click", () => { form.style.display = "none"; });

    btnGuardar.addEventListener("click", async () => {
        const token = obterToken();
        const nome = document.getElementById("user-nome").value.trim();
        const email = document.getElementById("user-email").value.trim();
        const pass = document.getElementById("user-pass").value;
        const role = document.getElementById("user-role").value;

        if (!nome || !email || !pass) { mostrarMsg(msg, "Preenche todos os campos.", "erro"); return; }
        if (pass.length < 6) { mostrarMsg(msg, "A palavra-passe deve ter 6 caracteres.", "erro"); return; }

        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A criar...';

        const res = await chamarRPC("cesc_diretor_criar_utilizador", {
            p_token: token, p_nome: nome, p_email: email, p_password: pass, p_role: role
        });

        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<i class="fas fa-save"></i> Criar Conta';

        if (!res.ok) { mostrarMsg(msg, res.erro || "Erro ao criar.", "erro"); return; }

        mostrarMsg(msg, "Conta criada com sucesso.", "sucesso");
        document.getElementById("user-nome").value = "";
        document.getElementById("user-email").value = "";
        document.getElementById("user-pass").value = "";
        setTimeout(() => { form.style.display = "none"; carregarEquipa(); }, 900);
    });
}

async function apagarUtilizador(id, nome) {
    if (!confirm("Tens a certeza que queres apagar o utilizador " + nome + "?")) return;
    const token = obterToken();
    const res = await chamarRPC("cesc_diretor_apagar_utilizador", { p_token: token, p_user_id: id });
    if (res.ok) {
        carregarEquipa();
    } else {
        alert(res.erro || "Erro ao apagar utilizador.");
    }
}
