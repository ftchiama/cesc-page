/*
 CESC — Login do Candidato
 Data: 24/10/2026

 - Passo 1: BI + Email → Edge Function enviar-codigo (is_candidato: true)
 - Passo 2: Código → RPC cesc_validar_codigo_candidato → token (2 horas)
 - Guarda o token em sessionStorage com a chave "cesc_candidato_token"
 - Redireciona para paginas/candidato-painel.html
 */

let biAtual = "";

// ============================================================
// HELPERS
// ============================================================
function mostrarErro(idElemento, mensagem) {
    const el = document.getElementById(idElemento);
    if (!el) return;
    el.textContent = mensagem;
    el.style.display = "block";
}

function limparErros() {
    ["msg-erro-1", "msg-erro-2"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ""; el.style.display = "none"; }
    });
}

// ============================================================
// PASSO 1: Pedir código
// ============================================================
async function pedirCodigo() {
    limparErros();
    const bi = document.getElementById("cand-bi").value.trim().toUpperCase();
    const email = document.getElementById("cand-email").value.trim();
    const btn = document.getElementById("btn-pedir-codigo");

    if (!bi || !email) {
        mostrarErro("msg-erro-1", "Preenche o BI e o email.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "A verificar...";

    let res;
    try {
        const response = await fetch(API.SUPABASE_URL + "/functions/v1/enviar-codigo", {
            method: "POST",
            headers: {
                "apikey": API.SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ bi_numero: bi, email: email, is_candidato: true })
        });
        res = await response.json();
    } catch (e) {
        res = { ok: false, erro: "Erro de ligação ao servidor." };
    }

    btn.disabled = false;
    btn.textContent = "Receber código de acesso";

    if (res.ok) {
        biAtual = bi;
        document.getElementById("email-mostrado").textContent = email;
        document.getElementById("passo-1").style.display = "none";
        document.getElementById("passo-2").style.display = "block";
        document.getElementById("cand-codigo").focus();
    } else {
        mostrarErro("msg-erro-1", res.erro || "Erro ao enviar o código.");
    }
}

// ============================================================
// PASSO 2: Validar código
// ============================================================
async function validarCodigo() {
    limparErros();
    const codigo = document.getElementById("cand-codigo").value.trim();
    const btn = document.getElementById("btn-validar-codigo");

    if (codigo.length !== 6) {
        mostrarErro("msg-erro-2", "O código tem 6 dígitos.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "A validar...";

    let res;
    try {
        const response = await fetch(API.SUPABASE_URL + "/rest/v1/rpc/cesc_validar_codigo_candidato", {
            method: "POST",
            headers: {
                "apikey": API.SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ p_bi_numero: biAtual, p_codigo: codigo })
        });
        res = await response.json();
    } catch (e) {
        res = { ok: false, erro: "Erro de ligação ao servidor." };
    }

    btn.disabled = false;
    btn.textContent = "Entrar";

    if (res.ok && res.token) {
        sessionStorage.setItem("cesc_candidato_token", res.token);
        window.location.href = "candidato-painel.html";
    } else {
        mostrarErro("msg-erro-2", res.erro || "Código inválido ou expirado.");
    }
}

// ============================================================
// VOLTAR
// ============================================================
function voltarPasso1() {
    limparErros();
    document.getElementById("cand-codigo").value = "";
    document.getElementById("passo-2").style.display = "none";
    document.getElementById("passo-1").style.display = "block";
}

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", async function () {
    // Se já tem sessão ativa, vai direto ao painel
    const tokenExistente = sessionStorage.getItem("cesc_candidato_token");
    if (tokenExistente) {
        try {
            const r = await fetch(API.SUPABASE_URL + "/rest/v1/rpc/cesc_candidato_painel", {
                method: "POST",
                headers: {
                    "apikey": API.SUPABASE_ANON_KEY,
                    "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ p_token: tokenExistente })
            });
            const d = await r.json();
            if (d.ok) {
                window.location.href = "candidato-painel.html";
                return;
            }
            sessionStorage.removeItem("cesc_candidato_token");
        } catch (e) {
            sessionStorage.removeItem("cesc_candidato_token");
        }
    }

    // Formatar BI (maiúsculas, sem espaços)
    const biInput = document.getElementById("cand-bi");
    biInput.addEventListener("input", function () {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 14);
    });

    // Botões
    document.getElementById("btn-pedir-codigo").addEventListener("click", pedirCodigo);
    document.getElementById("btn-validar-codigo").addEventListener("click", validarCodigo);
    document.getElementById("btn-voltar").addEventListener("click", voltarPasso1);

    // Enter
    document.getElementById("cand-email").addEventListener("keydown", e => {
        if (e.key === "Enter") pedirCodigo();
    });
    document.getElementById("cand-codigo").addEventListener("keydown", e => {
        if (e.key === "Enter") validarCodigo();
    });
});