/*
 Autor: Francisco Tchiama
 Companhia: TCLabs
 Data: 23/10/2026
 Versão: 3.0
 Descrição:
 Autenticação do CESC.
 - Passo 1: chama a Edge Function enviar-codigo (email + password)
 - Passo 2: chama a RPC cesc_validar_codigo (email + código → token)
 - Guarda o token em sessionStorage
 - Redireciona para a página certa do role:
     aluno       → dashboard.html
     professor   → ../admin/professor.html
     secretaria  → ../secretaria/secretaria.html
     diretor     → ../direcao/direcao.html      (a criar)
     sub_diretor → ../direcao/direcao.html      (a criar)
     coordenador → ../direcao/direcao.html      (a criar)
     encarregado → ../encarregado/encarregado.html (a criar)

 Usa o módulo api.js (configuração, chamadas, sessão, utilitários).
 */

let emailAtual = "";

// ============================================================
// HELPER: redireccionar por role
// ============================================================
async function redirecionarPorRole(token) {
    const perfil = await chamarRPC("cesc_perfil_role", { p_token: token });

    if (!perfil.ok) {
        // Não conseguiu obter o role — manda para o login com erro
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
    // Página do coordenador ainda não existe. Por agora vai para o dashboard.
    window.location.href = "dashboard.html";
} else if (role === "encarregado") {
        // Página do encarregado ainda não existe.
        // Quando existir, trocar para: "../encarregado/encarregado.html"
        window.location.href = "dashboard.html";
    } else {
        // aluno (ou role desconhecido — trata como aluno)
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

    const dados = await chamarEdge("enviar-codigo", {
        email: email,
        password: password
    });

    btn.disabled = false;
    btn.textContent = "Receber código de acesso";

    if (dados.ok) {
        emailAtual = email;
        document.getElementById("email-mostrado").textContent = email;
        document.getElementById("passo-1").style.display = "none";
        document.getElementById("passo-2").style.display = "block";
        document.getElementById("login-codigo").focus();
    } else {
        mostrarErroAuth("msg-erro-1", dados.erro || "Não foi possível enviar o código.");
    }
}

// ============================================================
// PASSO 2: validar código (RPC → token → redireccionar)
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

    const dados = await chamarRPC("cesc_validar_codigo", {
        p_email: emailAtual,
        p_codigo: codigo
    });

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
// VOLTAR AO PASSO 1
// ============================================================
function voltarPasso1() {
    limparErrosAuth();
    document.getElementById("login-codigo").value = "";
    document.getElementById("passo-2").style.display = "none";
    document.getElementById("passo-1").style.display = "block";
}

// ============================================================
// CRIAR CONTA (BI + e-mail + password)
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

    // Se já tem token e não veio de erro, redirecciona por role
    if (obterToken() && !temErro) {
        await redirecionarPorRole(obterToken());
        return;
    }
    if (temErro) {
        try { sessionStorage.removeItem("cesc_token"); } catch (e) {}
    }

    // Login
    const btnEnviar = document.getElementById("btn-enviar-codigo");
    if (btnEnviar) btnEnviar.addEventListener("click", pedirCodigo);

    const btnValidar = document.getElementById("btn-validar-codigo");
    if (btnValidar) btnValidar.addEventListener("click", validarCodigo);

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

    // Criar conta
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
