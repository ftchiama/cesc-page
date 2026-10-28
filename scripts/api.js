/*
 Autor: Francisco Tchiama
 Companhia: TCLabs
 Data: 19/10/2026
 Versão: 1.0
 Descrição:
 Módulo central de configuração, chamadas à API, sessão e utilitários.
 Todas as páginas do CESC devem carregar este ficheiro antes de qualquer outro script.
 */

// ============================================================
// CONFIGURAÇÃO
// ============================================================
const API = {
    SUPABASE_URL: "https://kmdixtzvnhvtwkpsicoq.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_NtqePgTlOPZsx3DuC40bfg_lu6CKrs9",
    APP_NAME: "CESC",
    TIMEOUT_MS: 15000
};

// ============================================================
// CHAMADAS À API
// ============================================================
async function chamarRPC(nomeFuncao, params) {
    const url = API.SUPABASE_URL + "/rest/v1/rpc/" + nomeFuncao;
    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, API.TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "apikey": API.SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(params || {}),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const texto = await res.text();
            console.error("RPC " + nomeFuncao + " HTTP " + res.status + ": " + texto);
            return { ok: false, erro: "HTTP " + res.status };
        }

        return await res.json();

    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === "AbortError") {
            console.error("RPC " + nomeFuncao + " timeout");
            return { ok: false, erro: "Tempo esgotado. Tenta novamente." };
        }
        console.error("RPC " + nomeFuncao + " erro:", e);
        return { ok: false, erro: "Erro de ligação." };
    }
}

async function chamarEdge(nomeFuncao, body) {
    const url = API.SUPABASE_URL + "/functions/v1/" + nomeFuncao;
    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, API.TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "apikey": API.SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body || {}),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        return await res.json();

    } catch (e) {
        clearTimeout(timeoutId);
        if (e.name === "AbortError") {
            return { ok: false, erro: "Tempo esgotado. Tenta novamente." };
        }
        return { ok: false, erro: "Erro de ligação." };
    }
}

// ============================================================
// SESSÃO
// ============================================================
function obterToken() {
    try {
        return sessionStorage.getItem("cesc_token");
    } catch (e) {
        return null;
    }
}

function guardarToken(token) {
    try {
        sessionStorage.setItem("cesc_token", token);
    } catch (e) {
        console.error("Não foi possível guardar o token:", e);
    }
}

function terminarSessao() {
    try {
        sessionStorage.removeItem("cesc_token");
    } catch (e) {}
    window.location.href = "login.html";
}

function exigirLogin() {
    const token = obterToken();
    if (!token) {
        window.location.href = "login.html";
        return null;
    }
    return token;
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function esc(s) {
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function fmtNota(n) {
    return (n == null) ? "—" : Number(n).toFixed(1);
}

function fmtPercent(n) {
    return (n == null) ? "—" : Number(n).toFixed(1) + "%";
}

function fmtData(dataStr) {
    if (!dataStr) return "—";
    return String(dataStr).slice(0, 10);
}

function linhaInfo(rotulo, valor) {
    return '<div class="info-linha"><span class="rotulo">' + rotulo +
        '</span><span class="valor">' + (valor || "—") + '</span></div>';
}

// Logout (para usar em qualquer página)
function fazerLogout() {
    terminarSessao();
}
