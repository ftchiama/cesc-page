---

CESC — Transição de Pagamentos (Mock → AppyPay Real)

Autor: Francisco Tchiama
Companhia: TCLabs
Data: 26/10/2026
Versão: 1.0

Este documento descreve o processo exato para desligar o modo de simulação (Mock) e ligar o gateway real do AppyPay (Multicaixa Express), sem quebrar o fluxo atual do candidato ou da secretária.

---

1. O que já está pronto (Mock)

Atualmente, o sistema está 100% funcional em modo de simulação:

· O candidato preenche a inscrição.
· A Edge Function criar-pagamento cria a transação na base de dados e devolve os dados para a página de simulação.
· A página inscricao-simular-pagamento.html simula o pagamento com um clique.
· O webhook-pagamento confirma a transação.
· O verificar-pagamento atualiza o ecrã para "Pagamento Confirmado".

2. O que muda no dia da transição

Nada no Frontend (HTML/CSS/JS).
Nada na Base de Dados (Tabelas e RPCs).
Nada no Painel do Candidato ou da Secretária.

A única coisa que muda são as variáveis de ambiente no Supabase e o corpo de duas Edge Functions (criar-pagamento e webhook-pagamento).

3. Checklist de Pré-Requisitos

Antes de alterar qualquer código, garante que tens:

1. Conta AppyPay Sandbox funcional (login OK, onboarding completo).
2. Credenciais obtidas:
   · APPYPAY_CLIENT_ID
   · APPYPAY_CLIENT_SECRET
   · APPYPAY_RESOURCE
   · APPYPAY_PAYMENT_METHOD_GPO (ID do método Multicaixa Express)
3. Webhook configurado no portal AppyPay:
   · URL: https://[PROJETO].supabase.co/functions/v1/webhook-pagamento
4. Números de teste (Sandbox):
   · 900000000 → Sucesso
   · 900000001 → Saldo insuficiente
   · 900000002 → Timeout
   · 900000003 → Rejeitado pelo cliente

4. Passo 1 — Atualizar as Variáveis de Ambiente (Supabase)

No painel do Supabase → Edge Functions → Secrets, altera:

```env
PAGAMENTO_MODE = sandbox   # (muda de 'mock' para 'sandbox')
APPYPAY_CLIENT_ID = "..."
APPYPAY_CLIENT_SECRET = "..."
APPYPAY_RESOURCE = "..."
APPYPAY_PAYMENT_METHOD_GPO = "GPO_xxx"
```

(Nota: em produção, mudarás depois PAGAMENTO_MODE para production e usarás as chaves reais).

5. Passo 2 — Atualizar a Edge Function criar-pagamento

O código atual termina com o bloco mock. Vamos substituir o final do ficheiro para chamar a API do AppyPay em modo real.

No ficheiro criar-pagamento/index.ts, substitui o bloco final:

```typescript
    // ------------------------------------------------------------
    // MODO MOCK (Atual)
    // ------------------------------------------------------------
    if (PAGAMENTO_MODE === 'mock') {
      return respostaOk({ ... });
    }

    // MODO REAL (Novo)
    return respostaErro('Modo real ainda não implementado.', 501);
```

Pelo seguinte código (Modo Real):

```typescript
    // ------------------------------------------------------------
    // MODO REAL (Sandbox / Produção)
    // ------------------------------------------------------------
    if (PAGAMENTO_MODE === 'sandbox' || PAGAMENTO_MODE === 'production') {
      // 1. Obter Token OAuth2 da Microsoft/AppyPay
      const tokenUrl = PAGAMENTO_MODE === 'sandbox'
        ? 'https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token'
        : 'https://login.microsoftonline.com/appypay.onmicrosoft.com/oauth2/token';

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: Deno.env.get('APPYPAY_CLIENT_ID')!,
          client_secret: Deno.env.get('APPYPAY_CLIENT_SECRET')!,
          resource: Deno.env.get('APPYPAY_RESOURCE')!
        })
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) return respostaErro('Falha na autenticação com AppyPay.', 500);

      // 2. Criar a cobrança (Charge)
      const chargesUrl = PAGAMENTO_MODE === 'sandbox'
        ? 'https://gwy-api-tst.appypay.co.ao/v2.0/charges'
        : 'https://gwy-api.appypay.co.ao/v2.0/charges';

      const chargeRes = await fetch(chargesUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantTransactionId: merchant_tx_id,
          paymentMethod: Deno.env.get('APPYPAY_PAYMENT_METHOD_GPO'),
          amount: valor,
          currency: 'AOA',
          paymentInfo: {
            phoneNumber: telefone // O candidato tem de enviar o telemóvel no body do criar-pagamento
          }
        })
      });

      const chargeData = await chargeRes.json();

      if (!chargeRes.ok) {
        console.error('[criar-pagamento] Erro AppyPay:', chargeData);
        return respostaErro(chargeData.message || 'Erro ao criar cobrança no AppyPay.', 500);
      }

      // 3. Atualizar a base de dados com a referência externa
      await supabase.from('pagamentos')
        .update({ referencia_externa: chargeData.id })
        .eq('merchant_transaction_id', merchant_tx_id);

      // 4. Devolver ao frontend (sem url_pagamento, o candidato recebe notificação no MCX)
      return respostaOk({
        merchant_transaction_id: merchant_tx_id,
        inscricao_id: inscricaoIdFinal,
        referencia,
        valor,
        modo: PAGAMENTO_MODE,
        url_pagamento: null
      });
    }
```

6. Passo 3 — Atualizar a Edge Function webhook-pagamento

Atualmente, o webhook no modo mock confia no clique do botão. No modo real, ele tem de verificar ativamente se o AppyPay confirma o pagamento.

No ficheiro webhook-pagamento/index.ts, substitui o bloco else do modo real:

```typescript
    // ------------------------------------------------------------
    // MODO REAL — verificação activa
    // ------------------------------------------------------------
    else {
      // O AppyPay não assina os webhooks (sem HMAC).
      // Portanto, não confiamos no body. Vamos verificar diretamente.
      
      const tokenUrl = PAGAMENTO_MODE === 'sandbox'
        ? 'https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token'
        : 'https://login.microsoftonline.com/appypay.onmicrosoft.com/oauth2/token';

      const tokenRes = await fetch(tokenUrl, { /* ... pedir token ... */ });
      const tokenData = await tokenRes.json();

      const chargesUrl = PAGAMENTO_MODE === 'sandbox'
        ? `https://gwy-api-tst.appypay.co.ao/v2.0/charges/${body.id}`
        : `https://gwy-api.appypay.co.ao/v2.0/charges/${body.id}`;

      const verifyRes = await fetch(chargesUrl, {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      const verifyData = await verifyRes.json();

      sucesso = verifyData.responseStatus?.successful === true;
      respostaGateway = verifyData;
      txId = verifyData.merchantTransactionId; // Garantir que usamos o nosso ID
    }
```

7. Passo 4 — Ajustar o Frontend (Página de Simulação)

A página inscricao-simular-pagamento.html foi desenhada para o modo mock. No modo real, ela deve mostrar uma mensagem diferente (a dizer para verificar o telemóvel) e esconder o botão "Simular Pagamento Confirmado".

No ficheiro scripts/inscricao-simular-pagamento.js, no arranque (DOMContentLoaded):

```javascript
    if (modo === 'mock') {
        // Mostra o botão de simular
        document.getElementById('btn-simular-pagamento').style.display = 'block';
    } else {
        // Modo real: esconde o botão e mostra a mensagem do MCX
        document.getElementById('btn-simular-pagamento').style.display = 'none';
        document.getElementById('simulacao-inicial').innerHTML = `
            <h1 style="text-align:center;">Pagamento Pendente</h1>
            <p style="text-align:center;">Vai ao teu <strong>Multicaixa Express</strong> e confirma o pagamento com o teu PIN.</p>
            <div class="simulacao-polling"><span class="simulacao-spinner"></span> A aguardar confirmação...</div>
        `;
        iniciarPolling(); // Começa logo a verificar o estado
    }
```

(Nota: o modo vem do URL ou de uma chamada à Edge Function verificar-pagamento).

8. Testes de Aceitação (Sandbox)

Antes de ir para produção, faz o seguinte:

1. Abre a inscrição no site e submete com o telefone 900000000 (sucesso).
2. Confirma que o ecrã fica em "A aguardar..." e, em segundos, muda para "Pagamento Confirmado".
3. Repete com 900000003 (rejeitado). O ecrã deve mostrar a falha.
4. Verifica a base de dados (tabela cesc.pagamentos) e confirma que o referencia_externa (ID do AppyPay) foi preenchido.

9. Passo 5 — Migrar para Produção

Quando o Sandbox estiver 100% validado:

1. No portal AppyPay (produção), configura o Webhook URL.
2. No Supabase Secrets, altera as chaves para as de produção.
3. Muda PAGAMENTO_MODE = production.
4. Faz um teste real com um valor pequeno (ex: 100 Kz) para garantir que o dinheiro entra.

10. Conclusão

O CESC foi desenhado de forma a que o mock não seja "lixo" descartável, mas sim um simulador de testes que partilha 95% do código com o modo real. A transição não implica reescrever o frontend ou a base de dados; é apenas uma questão de "ligar os cabos" certos nas Edge Functions e configurar as credenciais.
