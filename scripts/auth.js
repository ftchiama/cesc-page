/*
 Autor: Francisco Tchiama
 Companhia: TCLabs
 Data: 11/11/2026
 Versão: 4.0
 Descrição:
 Autenticação do CESC com reenvio de código (cooldown 60s).

 - Passo 1: chama a Edge Function enviar-codigo (email + password)
 - Passo 2: chama a RPC cesc_validar_codigo (email + código → token)
 - Guarda o token em sessionStorage
 - Redireciona para a página certa do role
 - Reenvio de código com cooldown de 60 segundos
 */

let emailAtual = "";
let cooldownTimer = null;

// ============================================================
// HELPER: redireccionar por role
// ============================================================
async function redirecionarPorRole(token) {
    const perfil = await chamarRPC("cesc_perfil_role", { p_token: token });

    if (!perfil.ok) {
        try { sessionStorage.removeItem("cesc_token"); } catch (e) {}
        window.location.href = "login.html?erro=1";
        return;
    }

    const role = perfil.role;

    if (role === "professor") {
        window.location.href = "../admin/professor.html";
    } else if (role === "secretaria") {
        window.location.href = "../secretaria/secretaria.html";
    } else if (role === "diretor" || role === "sub_diretor") {
        window.location.href = "../direcao/direcao.html";
    } else if (role === "coordenador") {
        window.location.href = ".html";
    } else if (role === "encarregado") {
        window.location.href = "dashboard.html";
    } else {
        window.location.href = "dashboard.html";
    }
}

// ============================================================
// HELPERS
// ============================================================
function mostrarErroAuth(idElemento, mensagem) {
    const el = document.getElementById(idElemento);
    if (!el) return;
    el.textContent = mensagem;
    el.style.display = "block";
}

function limparErrosAuth() {
    ["msg-erro-1", "msg-erro-2"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = "";
            el.style.display = "none";
        }
    });
}

// ============================================================
// PASSO 1: enviar código (Edge Function)
// ============================================================
async function pedirCodigo() {
    limparErrosAuth();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = document.getElementById("btn-enviar-codigo");

    if (!email || !password) {
        mostrarErroAuth("msg-erro-1", "Preenche o e-mail e a palavra-passe.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "A verificar...";

    let dados = await chamarEdge("enviar-codigo", { email: email, password: password });

    if (!dados.ok && dados.erro && dados.erro.includes("Tempo esgotado")) {
        btn.textContent = "O servidor está a acordar. Aguarda...";
        await new Promise(r => setTimeout(r, 5000));
        btn.textContent = "A tentar novamente...";
        dados = await chamarEdge("enviar-codigo", { email: email, password: password });
    }

    btn.disabled = false;
    btn.textContent = "Receber código de acesso";

    if (dados.ok) {
        emailAtual = email;
        document.getElementById("email-mostrado").textContent = email;
        document.getElementById("passo-1").style.display = "none";
        document.getElementById("passo-2").style.display = "block";
        document.getElementById("login-codigo").focus();
        iniciarCooldownReenvio();
    } else {
        if (dados.erro && dados.erro.includes("incorreta")) {
            mostrarErroAuth("msg-erro-1", "Palavra-passe incorreta.");
        } else {
            mostrarErroAuth("msg-erro-1", dados.erro || "Não foi possível enviar o código. Tenta novamente.");
        }
    }
}

// ============================================================
// PASSO 2: validar código
// ============================================================
async function validarCodigo() {
    limparErrosAuth();

    const codigo = document.getElementById("login-codigo").value.trim();
    const btn = document.getElementById("btn-validar-codigo");

    if (codigo.length !== 6) {
        mostrarErroAuth("msg-erro-2", "O código tem 6 dígitos.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "A validar...";

    const dados = await chamarRPC("cesc_validar_codigo", { p_email: emailAtual, p_codigo: codigo });

    btn.disabled = false;
    btn.textContent = "Entrar";

    if (dados.ok && dados.token) {
        guardarToken(dados.token);
        await redirecionarPorRole(dados.token);
    } else {
        mostrarErroAuth("msg-erro-2", dados.erro || "Código inválido ou expirado.");
    }
}

// ============================================================
// REENVIAR CÓDIGO (com cooldown de 60s)
// ============================================================
async function reenviarCodigo() {
    if (!emailAtual) return;
    const btn = document.getElementById("btn-reenviar-codigo");
    if (btn.disabled) return;

    btn.disabled = true;
    btn.textContent = "A reenviar...";

    const dados = await chamarEdge("enviar-codigo", { email: emailAtual, password: null });

    if (dados.ok) {
        const msgErro = document.getElementById("msg-erro-2");
        msgErro.textContent = "Novo código enviado! Verifica o teu e-mail.";
        msgErro.style.color = "#065f46";
        msgErro.style.background = "#d1fae5";
        msgErro.style.border = "1px solid #10b981";
        msgErro.style.display = "block";
        setTimeout(() => {
            msgErro.style.display = "none";
            msgErro.style.color = "";
            msgErro.style.background = "";
            msgErro.style.border = "";
        }, 4000);
        iniciarCooldownReenvio();
    } else {
        btn.disabled = false;
        btn.textContent = "Não recebeste o código? Reenviar";
        mostrarErroAuth("msg-erro-2", dados.erro || "Erro ao reenviar. Tenta novamente.");
    }
}

function iniciarCooldownReenvio() {
    const btn = document.getElementById("btn-reenviar-codigo");
    if (!btn) return;
    let segundos = 60;
    btn.disabled = true;
    btn.textContent = `Reenviar em ${segundos}s`;

    if (cooldownTimer) clearInterval(cooldownTimer);

    cooldownTimer = setInterval(() => {
        segundos--;
        if (segundos <= 0) {
            clearInterval(cooldownTimer);
            btn.disabled = false;
            btn.textContent = "Não recebeste o código? Reenviar";
        } else {
            btn.textContent = `Reenviar em ${segundos}s`;
        }
    }, 1000);
}

// ============================================================
// VOLTAR AO PASSO 1
// ============================================================
function voltarPasso1() {
    limparErrosAuth();
    document.getElementById("login-codigo").value = "";
    document.getElementById("passo-2").style.display = "none";
    document.getElementById("passo-1").style.display = "block";
    if (cooldownTimer) clearInterval(cooldownTimer);
}

// ============================================================
// CRIAR CONTA
// ============================================================
async function criarConta() {
    limparErrosAuth();

    const bi = document.getElementById("reg-bi").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const password2 = document.getElementById("reg-password-2").value;
    const btn = document.getElementById("btn-criar-conta");
    const msgSucesso = document.getElementById("msg-sucesso-reg");

    if (msgSucesso) msgSucesso.style.display = "none";

    if (!bi || !email || !password) {
        mostrarErroAuth("msg-erro-reg", "Preenche todos os campos.");
        return;
    }
    if (password.length < 6) {
        mostrarErroAuth("msg-erro-reg", "A palavra-passe deve ter pelo menos 6 caracteres.");
        return;
    }
    if (password !== password2) {
        mostrarErroAuth("msg-erro-reg", "As palavras-passe não coincidem.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "A criar conta...";

    const dados = await chamarRPC("cesc_criar_conta", {
        p_bi_numero: bi,
        p_email: email,
        p_password: password
    });

    btn.disabled = false;
    btn.textContent = "Criar conta";

    if (dados.ok) {
        if (msgSucesso) {
            msgSucesso.textContent = "Conta criada com sucesso, " + dados.nome + "! A redirecionar para o login...";
            msgSucesso.style.display = "block";
        }
        setTimeout(function () {
            window.location.href = "login.html";
        }, 2000);
    } else {
        mostrarErroAuth("msg-erro-reg", dados.erro || "Não foi possível criar a conta.");
    }
}

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
    const temErro = window.location.search.indexOf("erro=1") !== -1;

    if (obterToken() && !temErro) {
        await redirecionarPorRole(obterToken());
        return;
    }
    if (temErro) {
        try { sessionStorage.removeItem("cesc_token"); } catch (e) {}
    }

    const btnEnviar = document.getElementById("btn-enviar-codigo");
    if (btnEnviar) btnEnviar.addEventListener("click", pedirCodigo);

    const btnValidar = document.getElementById("btn-validar-codigo");
    if (btnValidar) btnValidar.addEventListener("click", validarCodigo);

    const btnReenviar = document.getElementById("btn-reenviar-codigo");
    if (btnReenviar) btnReenviar.addEventListener("click", reenviarCodigo);

    const btnVoltar = document.getElementById("btn-voltar");
    if (btnVoltar) btnVoltar.addEventListener("click", voltarPasso1);

    const inputPass = document.getElementById("login-password");
    if (inputPass) {
        inputPass.addEventListener("keydown", function (e) {
            if (e.key === "Enter") pedirCodigo();
        });
    }

    const inputCodigo = document.getElementById("login-codigo");
    if (inputCodigo) {
        inputCodigo.addEventListener("keydown", function (e) {
            if (e.key === "Enter") validarCodigo();
        });
    }

    const btnCriar = document.getElementById("btn-criar-conta");
    if (btnCriar) {
        btnCriar.addEventListener("click", criarConta);
        const inputPass2 = document.getElementById("reg-password-2");
        if (inputPass2) {
            inputPass2.addEventListener("keydown", function (e) {
                if (e.key === "Enter") criarConta();
            });
        }
    }
});
