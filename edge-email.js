/*
 ============================================================
 CESC — Edge Function: enviar-codigo
 ============================================================
 Autor: TCLabs
 Data: 24/10/2026
 Versão: 2.1

 Descrição:
   Ponto único de envio de códigos de verificação por email.
   Suporta 3 fluxos distintos, identificados pelas flags do body.

 Fluxos suportados:
   1) Inscrição pública (is_inscricao === true)
      - Usado na página paginas/inscricao.html (Passo 1)
      - Valida se o email já tem conta (se sim, bloqueia)
      - Gera código na tabela cesc.codigos_inscricao
      - O código é usado para validar o email antes de submeter a inscrição

   2) Login do candidato (is_candidato === true)
      - Usado na página paginas/candidato-login.html
      - Requer BI + Email (do candidato existente em cesc.candidatos)
      - Gera código na tabela cesc.codigos_candidato
      - O código é usado para autenticar e abrir o painel do candidato

   3) Login normal (sem flags)
      - Usado na página paginas/login.html (alunos, professores, secretaria)
      - Requer Email + Password
      - Valida a password via RPC verificar_password_cesc
      - Guarda código em cesc.utilizadores.verification_code

 Segurança:
   - Só chama o Render se a validação interna passar.
   - Envia `is_inscricao: true` para o Render em todos os fluxos,
     para que o Render não bloqueie (a verificação já foi feita aqui).

 Dependências:
   - Supabase (client com service_role)
   - Render (tclabs-email-api) — envia emails via Brevo
   - Tabelas: cesc.utilizadores, cesc.candidatos,
              cesc.codigos_inscricao, cesc.codigos_candidato
   - RPCs: cesc_gerar_codigo_inscricao, cesc_login_candidato,
           verificar_password_cesc

 Configuração:
   - Variáveis de ambiente no Supabase (injetadas automaticamente):
       SUPABASE_URL
       SUPABASE_SERVICE_ROLE_KEY
   - ENDPOINT_SECRET: hardcoded (idealmente mover para env no futuro)
   - RENDER_API_URL: hardcoded

 Alterações:
   v1.0 — Versão inicial: apenas login normal (CESC e Kandamy)
   v1.1 — Verificação do destinatário em cesc.utilizadores
   v1.2 — Envio de código para login de professor
   v1.3 — Adicionado suporte para is_inscricao (candidatos novos)
   v2.0 — Unificação dos 3 fluxos numa única Edge Function
          com documentação interna
   v2.1 - Verificar par BI + Email via RPC (evita o problema do + na URL do PostgREST)
 ============================================================
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// CONFIGURAÇÃO
// ============================================================
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RENDER_API_URL = "https://tclabs-email-api.onrender.com/send-email"
const ENDPOINT_SECRET = "JM/27YyRGLd3Hs9+4tSCbIKWp2Dlt28E10yyavuCvqM="

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ============================================================
// HELPERS
// ============================================================
function respostaErro(mensagem: string, status: number = 400) {
  return new Response(
    JSON.stringify({ ok: false, erro: mensagem }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function respostaOk(extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ ok: true, ...extra }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Método não permitido', { status: 405, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { email, password, bi_numero, is_inscricao, is_candidato } = body

    // Cliente Supabase (schema cesc)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: 'cesc' }
    })

    // Variáveis a preencher por cada fluxo
    let codigo = ""
    let nomeDestinatario = "Candidato"
    let emailDestino = email
    let tituloEmail = ""
    let mensagemEmail = ""

    // ------------------------------------------------------------
    // FLUXO 1: INSCRIÇÃO PÚBLICA
    // ------------------------------------------------------------
    if (is_inscricao === true) {
      if (!email) return respostaErro('Email é obrigatório.')

      // Bloquear se o email já tem conta (é preciso outro email)
      const { data: userExistente } = await supabase
        .from('utilizadores')
        .select('id')
        .eq('email', email)
        .single()

      if (userExistente) {
        return respostaErro('Este email já tem uma conta. Faz login ou usa outro email.')
      }

      // Gerar código de inscrição
      const { data: rpcData, error: rpcError } = await supabase.rpc('cesc_gerar_codigo_inscricao', {
        p_email: email
      })

      if (rpcError || !rpcData?.ok) {
        console.error("[fluxo 1] Erro ao gerar código:", rpcError)
        return respostaErro('Erro ao gerar código.', 500)
      }

      codigo = rpcData.codigo
      tituloEmail = 'Verificação de Email — Inscrição CESC'
      mensagemEmail = `
        <h2>Bem-vindo ao CESC!</h2>
        <p>Para continuares com a tua inscrição, usa o código abaixo:</p>
        <h1 style="font-size:2rem; letter-spacing:4px;">${codigo}</h1>
        <p>Este código expira em 10 minutos. Não o partilhes com ninguém.</p>
      `
    }
    
// FLUXO 2: LOGIN DO CANDIDATO
// ------------------------------------------------------------
else if (is_candidato === true) {
  if (!bi_numero || !email) return respostaErro('BI e email são obrigatórios.')

  // Verificar par BI + Email via RPC (evita o problema do + na URL do PostgREST)
  const { data: candidatoData, error: candError } = await supabase.rpc('cesc_encontrar_candidato', {
    p_bi_numero: bi_numero.trim(),
    p_email: email.trim()
  })

  if (candError || !candidatoData?.ok) {
    console.error("[fluxo 2] Erro no SELECT:", candError)
    return respostaErro('Não encontrámos nenhuma candidatura com este BI e email.', 404)
  }

  // Gerar código de candidato
  const { data: rpcData, error: rpcError } = await supabase.rpc('cesc_login_candidato', {
    p_bi_numero: bi_numero.trim(),
    p_email: email.trim()
  })

  if (rpcError || !rpcData?.ok) {
    console.error("[fluxo 2] Erro ao gerar código:", rpcError)
    return respostaErro('Erro ao gerar código de acesso.', 500)
  }

  codigo = rpcData.codigo
  nomeDestinatario = candidatoData.nome_completo
  emailDestino = candidatoData.email
  tituloEmail = 'Código de Acesso — Painel do Candidato (CESC)'
  mensagemEmail = `
    <h2>Olá, ${candidatoData.nome_completo}!</h2>
    <p>Recebemos um pedido de acesso ao teu painel de candidato no CESC.</p>
    <p>O teu código de acesso é:</p>
    <h1 style="font-size:2rem; letter-spacing:4px; text-align:center;">${codigo}</h1>
    <p>Este código expira em 10 minutos.</p>
    <p>Se não foste tu a pedir, ignora este email.</p>
  `
}
    // ------------------------------------------------------------
    // FLUXO 3: LOGIN NORMAL (aluno/professor/secretaria)
    // ------------------------------------------------------------
    else {
      if (!email || !password) return respostaErro('Email e password são obrigatórios.')

      const { data: user, error } = await supabase
        .from('utilizadores')
        .select('id, nome_completo, password_hash')
        .eq('email', email)
        .single()

      if (error || !user) {
        return respostaErro('Utilizador não encontrado.', 401)
      }

      const { data: auth, error: authError } = await supabase.rpc('verificar_password_cesc', {
        p_email: email, p_password: password
      })

      if (authError || !auth?.ok) {
        return respostaErro('Palavra-passe incorreta.', 401)
      }

      // Código de 6 dígitos
      codigo = Math.floor(100000 + Math.random() * 900000).toString()
      const expiracao = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      await supabase
        .from('utilizadores')
        .update({ verification_code: codigo, code_expires_at: expiracao })
        .eq('email', email)

      nomeDestinatario = user.nome_completo
      tituloEmail = 'Código de Acesso — CESC'
      mensagemEmail = `
        <h1>O teu código é: <b>${codigo}</b></h1>
        <p>Não partilhes este código com ninguém.</p>
      `
    }

    // ------------------------------------------------------------
    // ENVIO DO EMAIL (comum a todos os fluxos)
    // ------------------------------------------------------------
    const payloadRender = {
      to: emailDestino,
      toName: nomeDestinatario,
      subject: tituloEmail,
      html: mensagemEmail,
      // Todos os fluxos já validaram internamente, por isso o Render
      // pode saltar a verificação de "destinatário registado".
      is_inscricao: true
    }

    const renderRes = await fetch(RENDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth': ENDPOINT_SECRET
      },
      body: JSON.stringify(payloadRender)
    })

    if (!renderRes.ok) {
      const erroRender = await renderRes.text()
      console.error('Render respondeu', renderRes.status, erroRender)
      return respostaErro('Erro ao enviar email.', 500)
    }

    return respostaOk()

  } catch (err) {
    console.error("Erro geral:", err)
    return respostaErro('Erro interno.', 500)
  }
})
