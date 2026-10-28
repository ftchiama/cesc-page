async function carregarConfiguracoes() {
    const token = obterToken();
    if (!token) return;

    const dados = await chamarRPC("cesc_diretor_listar_configuracoes", { p_token: token });
    
    if (!dados.ok) {
        document.getElementById("config-ano-lectivo").innerHTML = '<p style="color:var(--cor-erro);">Erro ao carregar.</p>';
        return;
    }

    const config = {};
    (dados.configuracoes || []).forEach(c => { config[c.chave] = c.valor; });

    document.getElementById("config-ano-lectivo").innerHTML = 
        '<div class="info-linha"><span class="rotulo">Ano em vigor</span><span class="valor" style="font-size:1.2rem; font-weight:700; color:var(--cor-azul);">' + esc(config.ano_lectivo_actual || "—") + '</span></div>';

    const abertas = config.inscricoes_abertas === "true";
    const badge = document.getElementById("badge-inscricoes-estado");
    
    if (abertas) { badge.className = "badge badge-activo"; badge.textContent = "ABERTAS"; }
    else { badge.className = "badge badge-desistente"; badge.textContent = "FECHADAS"; }

    const btnAlternar = document.getElementById("btn-alternar-inscricoes");
    const novoBtn = btnAlternar.cloneNode(true);
    btnAlternar.parentNode.replaceChild(novoBtn, btnAlternar);

    novoBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Alternar Estado';
    novoBtn.disabled = false;

    novoBtn.addEventListener("click", async function () {
        const novoEstado = abertas ? "false" : "true";
        novoBtn.disabled = true;
        novoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A alterar...';

        const res = await chamarRPC("cesc_diretor_atualizar_configuracao", {
            p_token: token, p_chave: "inscricoes_abertas", p_valor: novoEstado
        });

        if (res.ok) {
            carregarConfiguracoes(); 
        } else {
            alert(res.erro || "Erro ao alterar.");
            novoBtn.disabled = false;
            novoBtn.innerHTML = '<i class="fas fa-toggle-on"></i> Alternar Estado';
        }
    });
}