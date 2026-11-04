/*
 CESC — Página de simulação de pagamento (modo mock)
 Data: 26/10/2026

 Fluxo:
   1. Lê ?tx=<merchant_tx_id>&ref=<referencia>&valor=<valor> do URL
   2. Mostra o ecrã de simulação com o valor e a referência
   3. Botão "Simular pagamento confirmado":
      a. Chama webhook-pagamento com { merchant_transaction_id, simular: true }
      b. Passa para o ecrã "A processar"
      c. Faz polling a verificar-pagamento (sem token) a cada 3s
   4. Quando estado === 'pago': mostra ecrã de sucesso
   5. Quando estado === 'falhado': mostra ecrã de falha

 Segurança:
   - O merchant_transaction_id vem do URL (UUID aleatório).
   - Não há token (inscrição pública).
   - O verificar-pagamento sem token só devolve { estado, tipo }
     para pagamentos do tipo 'inscricao'.
 */

const POLLING_INTERVALO_MS = 3000;
const POLLING_MAX_TENTATIVAS = 40; // 40 * 3s = 2 minutos

let txId = null;
let referencia = null;
let valor = 1000;
let pollingTimer = null;
let tentativas = 0;

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    txId = params.get("tx");
    referencia = params.get("ref") || "—";
    const valorParam = params.get("valor");
    if (valorParam) valor = parseFloat(valorParam);

    if (!txId) {
        mostrarFalha("Não encontrámos a transacção. Volta a submeter a inscrição.");
        return;
    }

    document.getElementById("simulacao-valor").textContent = formatarKz(valor);
    document.getElementById("simulacao-referencia").textContent = referencia;
    document.getElementById("sucesso-referencia").textContent = referencia;

    document.getElementById("btn-simular-pagamento").addEventListener("click", simularPagamento);
    document.getElementById("btn-tentar-novamente").addEventListener("click", function () {
        window.location.href = "inscricao.html";
    });
});

// ============================================================
// SIMULAR PAGAMENTO
// ============================================================
async function simularPagamento() {
    const btn = document.getElementById("btn-simular-pagamento");
    btn.disabled = true;
    btn.innerHTML = '<span class="simulacao-spinner"></span> A processar...';

    const res = await chamarEdge("webhook-pagamento", {
        merchant_transaction_id: txId,
        simular: true
    });

    if (!res.ok) {
        mostrarFalha(res.erro || "Erro ao simular o pagamento.");
        return;
    }

    document.getElementById("simulacao-inicial").style.display = "none";
    document.getElementById("simulacao-processando").style.display = "block";
    iniciarPolling();
}

// ============================================================
// POLLING
// ============================================================
function iniciarPolling() {
    tentativas = 0;
    verificarEstado();
}

async function verificarEstado() {
    tentativas++;

    if (tentativas > POLLING_MAX_TENTATIVAS) {
        mostrarFalha("O pagamento não foi confirmado a tempo. Tenta novamente.");
        return;
    }

    // Vai buscar o token do candidato, se existir (para o caso da matrícula)
    const tokenCandidato = sessionStorage.getItem("cesc_candidato_token") || null;

    const res = await chamarEdge("verificar-pagamento", {
        merchant_transaction_id: txId,
        token: tokenCandidato
    });

    // Se a Edge Function disser que está pago, mostramos o sucesso!
    if (res.ok && res.estado === "pago") {
        mostrarSucesso();
        return;
    }

    if (res.ok && res.estado === "falhado") {
        mostrarFalha("O pagamento foi recusado. Tenta novamente.");
        return;
    }

    // Se estiver pendente ou der erro de rede, continuamos a tentar
    pollingTimer = setTimeout(verificarEstado, POLLING_INTERVALO_MS);
}

// ============================================================
// ECRÃS
// ============================================================
function mostrarSucesso() {
    if (pollingTimer) clearTimeout(pollingTimer);
    document.getElementById("simulacao-processando").style.display = "none";
    document.getElementById("simulacao-sucesso").style.display = "block";
    window.scrollTo(0, 0);
}

function mostrarFalha(mensagem) {
    if (pollingTimer) clearTimeout(pollingTimer);
    document.getElementById("simulacao-inicial").style.display = "none";
    document.getElementById("simulacao-processando").style.display = "none";
    document.getElementById("simulacao-sucesso").style.display = "none";
    const elFalha = document.getElementById("simulacao-falha");
    elFalha.style.display = "block";
    document.getElementById("falha-mensagem").textContent = mensagem;
    window.scrollTo(0, 0);
}

// ============================================================
// HELPERS
// ============================================================
function formatarKz(v) {
    const n = Number(v);
    if (isNaN(n)) return "—";
    return n.toLocaleString("pt-PT", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }) + " Kz";
}
