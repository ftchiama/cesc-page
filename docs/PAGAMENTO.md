PAGAMENTOS.md

```markdown
# CESC — Pagamentos (AppyPay)

**Autor:** Francisco Tchiama  
**Companhia:** TCLabs  
**Data:** 26/10/2026  
**Versão:** 1.0

Este documento descreve a integração de pagamentos do CESC com o **AppyPay** (Gateway de Pagamentos Online), incluindo o **modo mock** (para testes sem credenciais) e o **modo real** (para produção).

---

## 1. Visão geral

O CESC tem **dois pagamentos** obrigatórios no ciclo de vida do candidato:

| Pagamento | Valor | Quando | Método |
|---|---|---|---|
| **Taxa de inscrição** | 1.000 Kz | Ao submeter a inscrição (passo 5 do formulário) | MCX Express (GPO) |
| **Taxa de matrícula** | 3.000 Kz | Após aprovação, no painel do candidato | MCX Express (GPO) |

**Sem reembolso.** Se o candidato for rejeitado, não há devolução da taxa de inscrição.

**Gateway:** AppyPay (agrega Multicaixa Express, Unitel Money, referências). Neste momento, só o **GPO (Multicaixa Express)** está ativo.

---

## 2. Estados da inscrição (ciclo de vida)

```

a_pagar          → inscrição criada, aguardando pagamento de 1.000 Kz
(não aparece na secretária)

pendente         → pagamento confirmado, aguardando análise
(aparece na secretária)

aprovada         → aprovada pela secretária
(candidato tem de pagar a matrícula de 3.000 Kz)

matricula_paga   → pagamento da matrícula confirmado
(aluno criado em cesc.alunos com turma_actual = NULL;
secretária tem de atribuir turma)

matriculado      → turma atribuída, aluno oficial
(candidato pode criar conta de aluno)

rejeitada        → rejeitada pela secretária
(código 0 ou 1: 0 = sem recandidatura; 1 = pode recandidatar)

```

---

## 3. Fluxo completo (do candidato à conta de aluno)

```

1. Candidato preenche os 5 passos do formulário
   ↓
2. Clica "Submeter e Pagar 1.000 Kz"
   ↓
3. Edge Function "criar-pagamento" (mock ou real):
   a) RPC cesc_submeter_inscricao → cria inscrição em 'a_pagar'
   b) Cria registo em cesc.pagamentos (pendente)
   c) [mock] devolve URL de simulação
   d) [real] chama AppyPay POST /v2.0/charges
   ↓
4. Candidato paga:
   a) [mock] clica "Simular pagamento confirmado"
   b) [real] recebe notificação no MCX App, confirma com PIN
   ↓
5. AppyPay envia webhook → Edge Function "webhook-pagamento":
   a) [mock] recebe clique do botão "Simular"
   b) [real] recebe POST do AppyPay
   c) Verifica o pagamento (GET /v2.0/charges/{id})
   d) Marca pagamento como 'pago'
   e) Muda inscrição de 'a_pagar' para 'pendente'
   ↓
6. Frontend (polling) detecta 'pago' → ecrã de sucesso com referência
   ↓
7. Secretária analisa documentos:
   a) Aprova → estado 'aprovada' (aluno NÃO é criado ainda)
   b) Rejeita → estado 'rejeitada' (com código 0 ou 1)
   ↓
8. Candidato aprovado vai ao painel:
   a) Clica "Marcar Matrícula — Pagar 3.000 Kz"
   b) Edge Function "criar-pagamento" (tipo 'matricula')
   c) Candidato paga (mesmo fluxo)
   d) Webhook confirma → estado 'matricula_paga'
   e) Aluno criado em cesc.alunos (turma_actual = NULL)
   ↓
9. Secretária atribui turma (manual, por agora):
   a) RPC cesc_secretaria_atribuir_turma
   b) Estado passa a 'matriculado'
   c) Aluno com turma_actual preenchida
   ↓
10. Candidato cria conta em criar-conta.html
    (BI já está em cesc.alunos → permitido)

```

---

## 4. Modelo de dados (tabelas)

### 4.1. `cesc.pagamentos`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `inscricao_id` | uuid | FK → `cesc.inscricoes.id` |
| `tipo` | varchar | `'inscricao'` ou `'matricula'` |
| `valor` | numeric(10,2) | 1000.00 ou 3000.00 |
| `metodo` | varchar | `'GPO'` (Multicaixa Express) |
| `merchant_transaction_id` | varchar | Único. Nosso ID (ex: `TR1698...`) |
| `referencia_externa` | varchar | ID devolvido pelo AppyPay |
| `estado` | varchar | `pendente`, `pago`, `falhado` |
| `resposta_gateway` | jsonb | Resposta crua do AppyPay (auditoria) |
| `criado_em` | timestamp | |
| `pago_em` | timestamp | |

### 4.2. Colunas novas em `cesc.inscricoes`

| Coluna | Tipo | Descrição |
|---|---|---|
| `inscricao_paga` | boolean | `true` quando a taxa de inscrição foi paga |
| `data_pagamento_inscricao` | timestamp | |
| `matriculado` | boolean | `true` quando a turma foi atribuída |
| `data_matricula` | timestamp | |

### 4.3. `cesc.configuracoes` (chaves existentes)

| Chave | Valor atual | Descrição |
|---|---|---|
| `inscricoes_abertas` | `'true'` | Inscrições abertas ou fechadas |
| `ano_lectivo_actual` | `'2026/2027'` | Ano letivo em curso |

### 4.4. Valores fixos (no código)

- **Taxa de inscrição:** 1.000 Kz
- **Taxa de matrícula:** 3.000 Kz
- **Sem reembolso**

Estes valores podem, no futuro, ser movidos para `cesc.configuracoes` (ex: `valor_taxa_inscricao`, `valor_taxa_matricula`).

---

## 5. Edge Functions

### 5.1. `criar-pagamento`

**Endpoint:** `POST /functions/v1/criar-pagamento`

**Corpo:**
```json
{
  "tipo": "inscricao" | "matricula",
  "inscricao_id": "uuid (opcional, para retoma)",
  "inscricao_data": { ... },   // só se tipo='inscricao' e inscricao_id ausente
  "valor": 1000 | 3000,
  "telefone": "9xxxxxxxx"
}
```

Resposta:

```json
{
  "ok": true,
  "merchant_transaction_id": "TR...",
  "inscricao_id": "uuid",
  "referencia": "CESC-2026-00001",
  "url_pagamento": "..." | null   // null em modo real (AppyPay envia notificação)
}
```

Modo mock: devolve url_pagamento para uma página de simulação.
Modo real: chama AppyPay POST /v2.0/charges com paymentInfo.phoneNumber.

5.2. webhook-pagamento

Endpoint: POST /functions/v1/webhook-pagamento

Modo mock: recebe do botão "Simular pagamento".
Modo real: recebe do AppyPay (POST automático).

Fluxo (real):

1. Recebe { id, merchantTransactionId, amount, responseStatus }.
2. Não confia no body. Chama GET /v2.0/charges/{id} no AppyPay.
3. Se responseStatus.successful === true:
   · Marca pagamento.estado = 'pago'.
   · Muda inscricao.estado de a_pagar → pendente (se tipo inscricao).
   · Muda inscricao.estado de aprovada → matricula_paga (se tipo matricula).
   · Cria aluno em cesc.alunos se tipo matricula (turma_actual = NULL).
   · Regista data_pagamento_inscricao ou data_matricula.

5.3. verificar-pagamento

Endpoint: POST /functions/v1/verificar-pagamento

Corpo: { merchant_transaction_id }

Resposta: { ok: true, estado: 'pago'|'pendente'|'falhado', inscricao_id }

Usado pelo frontend para polling a cada 3 segundos (até 2 minutos).

---

6. Variáveis de ambiente

6.1. Supabase Edge Functions Secrets

Variável Modo mock Modo real (sandbox) Modo real (produção)
PAGAMENTO_MODE 'mock' 'sandbox' 'production'
APPYPAY_CLIENT_ID — (fornecido pelo AppyPay) (fornecido pelo AppyPay)
APPYPAY_CLIENT_SECRET — (fornecido pelo AppyPay) (fornecido pelo AppyPay)
APPYPAY_RESOURCE — (UUID do merchant) (UUID do merchant)
APPYPAY_PAYMENT_METHOD_GPO — GPO_xxx GPO_xxx
VALOR_INSCRICAO 1000 1000 1000
VALOR_MATRICULA 3000 3000 3000

6.2. URLs (automáticas por PAGAMENTO_MODE)

Modo Token URL Charges URL
mock (não usado) (não usado)
sandbox https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token https://gwy-api-tst.appypay.co.ao/v2.0/charges
production https://login.microsoftonline.com/appypay.onmicrosoft.com/oauth2/token https://gwy-api.appypay.co.ao/v2.0/charges

6.3. Painel AppyPay

Configurar o webhook URL no portal (sandbox ou produção):

```
https://kmdixtzvnhvtwkpsicoq.supabase.co/functions/v1/webhook-pagamento
```

---

7. Modo mock (implementação atual)

7.1. Como funciona

1. O frontend chama criar-pagamento (modo mock).
2. A Edge Function cria a inscrição a_pagar e o pagamento pendente.
3. Devolve url_pagamento para uma página de simulação (inscricao-simular-pagamento.html).
4. O frontend redireciona para essa página.
5. O candidato vê "Simulação de pagamento" com um botão "Simular pagamento confirmado".
6. Clica → chama webhook-pagamento (modo mock) → marca pago → muda estado para pendente.
7. O frontend volta ao formulário e mostra o ecrã de sucesso.

7.2. Porque mock e não AppyPay sandbox

O portal sandbox do AppyPay tem tido problemas de acesso (login falha após registo, onboarding não completa). Ficámos bloqueados à espera de resolução.

Decisão: implementar tudo em mock e ligar o AppyPay quando a conta estiver funcional. O código não muda — só as env vars.

7.3. Números de teste (quando o AppyPay estiver funcional)

Quando migrarmos para sandbox real, usar os números mágicos do AppyPay:

Telefone Cenário
900000000 Sucesso
900000001 Saldo insuficiente
900000002 Timeout
900000003 Rejeitado pelo cliente

---

8. Modo real (sandbox e produção)

8.1. Sandbox AppyPay

· Portal: https://app-tst.appypay.co.ao
· Token URL: https://login.microsoftonline.com/appypaydev.onmicrosoft.com/oauth2/token
· Charges URL: https://gwy-api-tst.appypay.co.ao/v2.0/charges
· Números mágicos: ver §7.3
· Webhook URL configurado no portal: https://kmdixtzvnhvtwkpsicoq.supabase.co/functions/v1/webhook-pagamento

8.2. Produção AppyPay

· Portal: https://app.appypay.co.ao
· Token URL: https://login.microsoftonline.com/appypay.onmicrosoft.com/oauth2/token
· Charges URL: https://gwy-api.appypay.co.ao/v2.0/charges
· Números reais
· Webhook URL: idem

8.3. Como migrar de mock para real

Passo 1: No painel Supabase → Edge Functions → Secrets, alterar:

```
PAGAMENTO_MODE = sandbox
APPYPAY_CLIENT_ID = ...
APPYPAY_CLIENT_SECRET = ...
APPYPAY_RESOURCE = ...
APPYPAY_PAYMENT_METHOD_GPO = ...
```

Passo 2: No portal AppyPay, configurar o webhook URL.

Passo 3: Testar com 900000000 (sucesso) e 900000003 (rejeitado).

Passo 4: Quando tudo funcionar em sandbox, mudar PAGAMENTO_MODE = production e as chaves de produção.

Nada no código do frontend muda. Só as env vars do Supabase.

---

9. Fluxo do polling (frontend)

O frontend, após criar o pagamento, faz polling à Edge Function verificar-pagamento a cada 3 segundos, até 2 minutos.

Quando detecta estado = 'pago':

· Mostra ecrã de sucesso com referência.
· Mostra botão "Consultar estado" (link para consultar-inscricao.html).
· Limpa sessionStorage.cesc_pagamento_pendente (se houver).

Quando detecta estado = 'falhado':

· Mostra erro "Pagamento falhou. Tenta novamente."
· Mostra botão "Tentar novamente" (volta ao passo 5).
· A inscrição a_pagar fica pendurada (o cron apaga em 30 min).

Quando passa 2 minutos sem resposta:

· Mostra "Pagamento não confirmado. Contacta a secretaria."
· Botão "Verificar novamente" (repete o polling).

---

10. Retoma de pagamento abandonado

Se o candidato fechar o browser antes de pagar, a inscrição fica a_pagar.

Como retomar:

1. Candidato faz login em candidato-login.html.
2. Painel detecta inscricao_a_pagar (RPC cesc_candidato_painel).
3. Mostra aviso: "Tens um pagamento pendente de 1.000 Kz. [Retomar pagamento]".
4. Botão chama criar-pagamento com inscricao_id (mesma inscrição).
5. Gera novo merchant_transaction_id, novo pedido ao AppyPay.
6. Candidato paga, webhook confirma.

Alternativa: cron apaga a_pagar com mais de 30 minutos. O candidato tem de preencher tudo de novo. Por isso a retoma é importante.

---

11. Cron job de limpeza

Nome: limpar_a_pagar_expiradas
Frequência: a cada 5 minutos
Comando:

```sql
SELECT cesc.limpar_a_pagar_expiradas();
```

Função:

```sql
CREATE OR REPLACE FUNCTION cesc.limpar_a_pagar_expiradas()
RETURNS void AS $$
BEGIN
    DELETE FROM cesc.inscricoes
    WHERE estado = 'a_pagar'
      AND data_submissao < now() - interval '30 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Configurar no Supabase: Database → Cron Jobs → Create.

---

12. Segurança

12.1. Chaves

· APPYPAY_CLIENT_ID, APPYPAY_CLIENT_SECRET, APPYPAY_RESOURCE: só nas Edge Functions Secrets (nunca no browser, nunca no Render).
· APPYPAY_PAYMENT_METHOD_GPO: idem.
· SUPABASE_SERVICE_ROLE_KEY: só nas Edge Functions (já é padrão).

12.2. Verificação do webhook

· Mock: o body do webhook é gerado pelo próprio frontend (só em testes). Não há verificação.
· Real: o webhook não confia no body. Chama GET /v2.0/charges/{id} no AppyPay e verifica responseStatus.successful === true. Um atacante pode enviar um merchantTransactionId válido, mas o AppyPay responde com o estado real. Se não estiver pago, recusa.

Nota: o AppyPay não assina os webhooks com HMAC (confirmado na documentação). A verificação ativa (chamar o AppyPay) é a única forma de garantir autenticidade.

12.3. Valores

· O valor (1.000 ou 3.000 Kz) vem das variáveis de ambiente (Edge Function), não do browser. Um atacante não pode pagar 1 Kz em vez de 1.000 Kz.

12.4. Rate limits

· Por BI: 3 tentativas em 2 horas (na RPC cesc_submeter_inscricao).
· Por IP: 5 tentativas em 24 horas.
· Sem rate limit no webhook (o AppyPay só envia webhooks legítimos se o GET /charges confirmar).

---

13. Riscos conhecidos

1. Sem reembolso. Se o candidato for rejeitado, perde a taxa de inscrição. A escola deve informar isto claramente no formulário (termos).
2. Sem confirmação por e-mail. Por agora, o candidato só vê o ecrã de sucesso. Uma melhoria futura é enviar e-mail com a referência após pagamento confirmado.
3. Sem suporte a Unitel Money. Só MCX Express (GPO). Se a escola quiser aceitar Unitel Money, o AppyPay tem UMM_xxx (configurar e adaptar o código).
4. Pagamentos em sandbox podem falhar por motivos alheios. O AppyPay sandbox tem instabilidade. Em produção, monitorizar.
5. Webhook duplicado. Se o AppyPay reenviar o webhook, a Edge Function verifica o estado (já pago) e não duplica. Idempotente.

---

14. Checklist de migração mock → real

Antes de ligar o AppyPay real:

☐ Conta sandbox funcional (login OK, onboarding completo).
☐ Credenciais obtidas: CLIENT_ID, CLIENT_SECRET, RESOURCE, PAYMENT_METHOD_GPO.
☐ Webhook URL configurado no portal AppyPay: https://kmdixtzvnhvtwkpsicoq.supabase.co/functions/v1/webhook-pagamento.
☐ Secrets do Supabase atualizados (PAGAMENTO_MODE = sandbox + chaves).
☐ Teste com 900000000 → sucesso (inscrição passa a pendente).
☐ Teste com 900000001 → saldo insuficiente (inscrição fica a_pagar).
☐ Teste com 900000002 → timeout.
☐ Teste com 900000003 → rejeitado.
☐ Teste do fluxo completo (inscrição + matrícula + turma + criar conta).
☐ Cron job de limpeza a_pagar ativo.
☐ PAGAMENTO_MODE = production + chaves de produção (último passo).

---

15. Próximos passos

1. Implementar o mock agora (SQL + Edge Functions + frontend).
2. Testar o fluxo completo com mock (inscrição, matrícula, atribuição de turma).
3. Quando o AppyPay estiver funcional, migrar via checklist do §14.

---

16. Contacto

Francisco Tchiama
TCLabs — Cabinda, Angola
franciscotchiama9@gmail.com

Suporte AppyPay:
https://suporte-appypay.freshdesk.com/support/home
Gerente comercial: (obter contacto)

---

Última actualização: 26/10/2026

```