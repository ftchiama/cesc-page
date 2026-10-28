/*
 CESC — Formulário de Inscrição (Lógica)
 Data: 24/10/2026
 */

const formState = {
    passoAtual: 1,
    totalPassos: 5,
    ficheiros: { bi_frente: null, bi_verso: null, certificado: null, foto: null },
    urls: { bi_frente: null, bi_verso: null, certificado: null, foto: null }
};

const MIME_EXT = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

let emailVerificado = null;
let biValidadoNoServidor = false;

// ============================================================
// ARRANQUE
// ============================================================
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("btn-comecar").addEventListener("click", function () {
        document.getElementById("inscricao-intro").style.display = "none";
        document.getElementById("inscricao-form").style.display = "block";
        window.scrollTo(0, 0);
    });

    document.getElementById("btn-proximo-passo").addEventListener("click", avancarPasso);
    document.getElementById("btn-voltar-passo").addEventListener("click", voltarPasso);
    document.getElementById("btn-submeter").addEventListener("click", submeterInscricao);

    document.querySelectorAll(".upload-input").forEach(function (input) {
        input.addEventListener("change", function () {
            const tipo = this.getAttribute("data-tipo");
            processarUpload(this, tipo);
        });
    });

    // Formatar BI
    const biInput = document.getElementById("al-bi");
    biInput.addEventListener("input", function () {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 14);
    });
    
// Validar BI único (aluno ou inscrição no ano atual)
biInput.addEventListener("blur", async function () {
    const bi = this.value.trim();
    const erroEl = document.getElementById("erro-al-bi");

    if (!validarBI(bi)) {
        biValidadoNoServidor = false;
        return;
    }

    erroEl.style.color = "var(--cor-texto-suave)";
    erroEl.textContent = "A verificar BI...";

    const res = await chamarRPC("cesc_verificar_bi_inscricao", { p_bi_numero: bi });

    if (res.ok) {
        if (res.existe) {
            erroEl.style.color = "var(--cor-erro)";
            erroEl.textContent = res.mensagem || "Este BI já está registado.";
            biValidadoNoServidor = false;
        } else {
            erroEl.style.color = "var(--cor-sucesso)";
            erroEl.textContent = "BI disponível.";
            biValidadoNoServidor = true;
        }
    } else {
        erroEl.style.color = "var(--cor-erro)";
        erroEl.textContent = "Erro ao verificar BI.";
        biValidadoNoServidor = false;
    }
});

    // Enviar código de email
    document.getElementById("btn-enviar-codigo-email").addEventListener("click", async function() {
        const email = document.getElementById("al-email").value.trim();
        const erroEmail = document.getElementById("erro-al-email");
        
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            erroEmail.textContent = "Insere um email válido primeiro.";
            return;
        }
        
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A enviar...';
        erroEmail.textContent = "";
        
        const res = await chamarEdge("enviar-codigo", { email: email, is_inscricao: true });
        
        this.disabled = false;
        this.textContent = "Verificar";
        
        if (res.ok) {
            document.getElementById("area-codigo-email").style.display = "block";
            this.style.display = "none";
            document.getElementById("al-email").readOnly = true;
        } else {
            erroEmail.textContent = res.erro || "Erro ao enviar o código.";
        }
    });

    // Validar código de email (chamada directa ao schema cesc, sem wrapper)
    document.getElementById("btn-validar-codigo-email").addEventListener("click", async function() {
        const email = document.getElementById("al-email").value.trim();
        const codigo = document.getElementById("al-codigo-email").value.trim();
        const erroCod = document.getElementById("erro-al-codigo-email");
        
        if (codigo.length !== 6) {
            erroCod.textContent = "O código tem 6 dígitos.";
            return;
        }
        
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A validar...';
        erroCod.textContent = "";
        
        try {
            const res = await fetch(API.SUPABASE_URL + "/rest/v1/rpc/cesc_validar_codigo_inscricao", {
                method: "POST",
                headers: {
                    "apikey": API.SUPABASE_ANON_KEY,
                    "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                    "Content-Profile": "cesc",
                    "Accept-Profile": "cesc"
                },
                body: JSON.stringify({ p_email: email, p_codigo: codigo })
            });
            
            const data = await res.json();
            
            this.disabled = false;
            this.textContent = "Confirmar";

            if (res.ok && data.ok) {
                emailVerificado = email;
                document.getElementById("area-codigo-email").innerHTML = '<p style="color: var(--cor-sucesso); font-weight: 600; font-size: 0.9rem;"><i class="fas fa-check-circle"></i> Email verificado com sucesso!</p>';
            } else {
                erroCod.textContent = data.erro || "Código inválido ou expirado.";
            }
        } catch (err) {
            this.disabled = false;
            this.textContent = "Confirmar";
            erroCod.textContent = "Erro de ligação ao servidor.";
        }
    });
});

// ============================================================
// NAVEGAÇÃO DE PASSOS
// ============================================================
function avancarPasso() {
    if (!validarPasso(formState.passoAtual)) return;
    if (formState.passoAtual === 4) preencherRevisao();
    if (formState.passoAtual < formState.totalPassos) mudarPasso(formState.passoAtual + 1);
}

function voltarPasso() {
    if (formState.passoAtual > 1) mudarPasso(formState.passoAtual - 1);
}

function mudarPasso(novoPasso) {
    document.querySelectorAll(".passo-conteudo").forEach(el => el.classList.remove("ativo"));
    document.getElementById("passo-" + novoPasso).classList.add("ativo");

    document.querySelectorAll(".passo").forEach(el => {
        const n = parseInt(el.getAttribute("data-passo"), 10);
        el.classList.remove("ativo", "completo");
        if (n === novoPasso) el.classList.add("ativo");
        if (n < novoPasso) el.classList.add("completo");
    });

    document.getElementById("btn-voltar-passo").style.display = novoPasso > 1 ? "inline-flex" : "none";
    document.getElementById("btn-proximo-passo").style.display = novoPasso === formState.totalPassos ? "none" : "inline-flex";
    document.getElementById("btn-submeter").style.display = novoPasso === formState.totalPassos ? "inline-flex" : "none";

    formState.passoAtual = novoPasso;
    window.scrollTo(0, 0);
}

// ============================================================
// VALIDAÇÕES
// ============================================================
function limparErro(id) {
    const el = document.getElementById("erro-" + id);
    if (el) el.textContent = "";
    const input = document.getElementById(id);
    if (input) input.classList.remove("invalido");
}

function mostrarErro(id, msg) {
    const el = document.getElementById("erro-" + id);
    if (el) el.textContent = msg;
    const input = document.getElementById(id);
    if (input) input.classList.add("invalido");
}

function validarBI(bi) {
    return /^[0-9]{9}[A-Z]{2}[0-9]{3}$/.test(bi);
}

function validarPasso(passo) {
    let valido = true;

    if (passo === 1) {
        ["al-bi", "al-nome", "al-data-nasc", "al-genero", "al-telefone", "al-email"].forEach(limparErro);

        const bi = document.getElementById("al-bi").value.trim();
        const nome = document.getElementById("al-nome").value.trim();
        const dataNasc = document.getElementById("al-data-nasc").value;
        const genero = document.getElementById("al-genero").value;
        const telefone = document.getElementById("al-telefone").value.trim();
        const email = document.getElementById("al-email").value.trim();

        if (!validarBI(bi)) {
            mostrarErro("al-bi", "Formato inválido. Ex: 000123456LA041");
            valido = false;
        } else if (!biValidadoNoServidor) {
            mostrarErro("al-bi", "Aguarda a verificação do BI ou corrige o número duplicado.");
            valido = false;
        } else {
            const anoNascBI = parseInt(bi.substring(9, 11), 10);
            const dataAno = new Date(dataNasc).getFullYear();
            if (dataNasc && Math.abs(anoNascBI - (dataAno % 100)) > 1) {
                mostrarErro("al-bi", "O ano de nascimento não corresponde ao BI.");
                valido = false;
            }
        }

        if (nome.length < 3) { mostrarErro("al-nome", "Nome muito curto."); valido = false; }
        if (!dataNasc) { mostrarErro("al-data-nasc", "Data obrigatória."); valido = false; }
        if (!genero) { mostrarErro("al-genero", "Seleciona o género."); valido = false; }
        if (telefone.length < 9) { mostrarErro("al-telefone", "Telefone inválido."); valido = false; }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            mostrarErro("al-email", "Email é obrigatório e deve ser válido.");
            valido = false;
        } else if (emailVerificado !== email) {
            mostrarErro("al-email", "Tens de verificar o teu email antes de avançar.");
            valido = false;
        }
    }

    if (passo === 2) {
        ["enc-nome", "enc-parentesco", "enc-telefone"].forEach(limparErro);
        if (document.getElementById("enc-nome").value.trim().length < 3) { mostrarErro("enc-nome", "Nome muito curto."); valido = false; }
        if (!document.getElementById("enc-parentesco").value) { mostrarErro("enc-parentesco", "Seleciona o parentesco."); valido = false; }
        if (document.getElementById("enc-telefone").value.trim().length < 9) { mostrarErro("enc-telefone", "Telefone inválido."); valido = false; }
    }

    if (passo === 3) {
        ["bi_frente", "bi_verso", "certificado", "foto"].forEach(tipo => {
            if (!formState.urls[tipo]) {
                alert("Falta carregar o documento: " + tipo.replace("_", " "));
                valido = false;
            }
        });
    }

    if (passo === 4) {
        ["ins-classe"].forEach(limparErro);
        if (!document.getElementById("ins-classe").value) {
            mostrarErro("ins-classe", "Seleciona a classe.");
            valido = false;
        }
    }

    return valido;
}

// ============================================================
// UPLOAD DE FICHEIROS
// ============================================================
function processarUpload(inputElement, tipo) {
    const file = inputElement.files[0];
    if (!file) return;

    const statusEl = document.getElementById("status-" + tipo);
    const itemEl = document.querySelector('[data-upload="' + tipo + '"]');
    const maxSize = tipo === "foto" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;

    if (file.size > maxSize) {
        statusEl.textContent = "Demasiado grande";
        statusEl.className = "upload-status erro";
        itemEl.classList.add("erro");
        inputElement.value = "";
        return;
    }

    statusEl.textContent = "A processar...";
    statusEl.className = "upload-status a-carregar";
    itemEl.classList.remove("erro", "ok");

    const ext = MIME_EXT[file.type] || "file";

    if (file.type.startsWith("image/")) {
        comprimirImagem(file, 1024, 0.7).then(comprimido => {
            enviarParaStorage(comprimido, ext, tipo, statusEl, itemEl);
        });
    } else {
        enviarParaStorage(file, ext, tipo, statusEl, itemEl);
    }
}

function comprimirImagem(file, maxWidth, quality) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = e => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width, height = img.height;
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
                canvas.width = width; canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => resolve(blob), "image/jpeg", quality);
            };
        };
    });
}

async function enviarParaStorage(blob, ext, tipo, statusEl, itemEl) {
    if (!blob || blob.size === 0) {
        statusEl.textContent = "Ficheiro vazio";
        statusEl.className = "upload-status erro";
        itemEl.classList.add("erro");
        return;
    }

    const uuid = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).substring(2);
    const caminho = "inscricoes/" + uuid + "." + ext;
    const url = API.SUPABASE_URL + "/storage/v1/object/cesc-inscricoes/" + caminho;

    let contentType = "application/octet-stream";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    if (ext === "png") contentType = "image/png";
    if (ext === "pdf") contentType = "application/pdf";

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "apikey": API.SUPABASE_ANON_KEY,
                "Authorization": "Bearer " + API.SUPABASE_ANON_KEY,
                "Content-Type": contentType
            },
            body: blob
        });

        if (!res.ok) {
            statusEl.textContent = "Erro " + res.status;
            statusEl.className = "upload-status erro";
            itemEl.classList.add("erro");
            return;
        }

        formState.urls[tipo] = caminho;
        statusEl.textContent = "Pronto";
        statusEl.className = "upload-status ok";
        itemEl.classList.add("ok");
        itemEl.classList.remove("erro");

    } catch (err) {
        statusEl.textContent = "Erro no envio";
        statusEl.className = "upload-status erro";
        itemEl.classList.add("erro");
    }
}

// ============================================================
// REVISÃO
// ============================================================
function preencherRevisao() {
    const addLinha = (containerId, rotulo, valor) => {
        const div = document.createElement("div");
        div.className = "revisao-linha";
        div.innerHTML = `<span class="rotulo">${rotulo}</span><span class="valor">${valor || "—"}</span>`;
        document.getElementById(containerId).appendChild(div);
    };

    document.getElementById("revisao-aluno").innerHTML = "";
    document.getElementById("revisao-encarregado").innerHTML = "";
    document.getElementById("revisao-documentos").innerHTML = "";
    document.getElementById("revisao-inscricao").innerHTML = "";

    addLinha("revisao-aluno", "BI", document.getElementById("al-bi").value);
    addLinha("revisao-aluno", "Nome", document.getElementById("al-nome").value);
    addLinha("revisao-aluno", "Nascimento", document.getElementById("al-data-nasc").value);
    addLinha("revisao-aluno", "Género", document.getElementById("al-genero").value === "M" ? "Masculino" : "Feminino");
    addLinha("revisao-aluno", "Telefone", document.getElementById("al-telefone").value);
    addLinha("revisao-aluno", "Email", document.getElementById("al-email").value);

    addLinha("revisao-encarregado", "Nome", document.getElementById("enc-nome").value);
    addLinha("revisao-encarregado", "Parentesco", document.getElementById("enc-parentesco").value);
    addLinha("revisao-encarregado", "Telefone", document.getElementById("enc-telefone").value);
    addLinha("revisao-encarregado", "Endereço", document.getElementById("enc-endereco").value);

    addLinha("revisao-documentos", "BI Frente", formState.urls.bi_frente ? "Carregado" : "Falta");
    addLinha("revisao-documentos", "BI Verso", formState.urls.bi_verso ? "Carregado" : "Falta");
    addLinha("revisao-documentos", "Certificado", formState.urls.certificado ? "Carregado" : "Falta");
    addLinha("revisao-documentos", "Foto", formState.urls.foto ? "Carregado" : "Falta");

    addLinha("revisao-inscricao", "Classe", document.getElementById("ins-classe").value);
    addLinha("revisao-inscricao", "Curso", document.getElementById("ins-curso").value);
    addLinha("revisao-inscricao", "Média", document.getElementById("ins-media").value);
}

// ============================================================
// SUBMISSÃO
// ============================================================
async function submeterInscricao() {
    const aceito = document.getElementById("aceito-termos").checked;
    const erroTermos = document.getElementById("erro-termos");
    
    if (!aceito) {
        erroTermos.textContent = "Tens de aceitar os termos.";
        return;
    }
    erroTermos.textContent = "";

    const btn = document.getElementById("btn-submeter");
    const status = document.getElementById("submissao-status");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A submeter...';
    status.style.display = "block";
    status.className = "submissao-status a-carregar";
    status.textContent = "A enviar os dados para o servidor...";

    const payload = {
        p_bi_numero: document.getElementById("al-bi").value,
        p_nome_completo: document.getElementById("al-nome").value,
        p_data_nascimento: document.getElementById("al-data-nasc").value,
        p_genero: document.getElementById("al-genero").value,
        p_telefone: document.getElementById("al-telefone").value,
        p_email: document.getElementById("al-email").value,
        p_nome_encarregado: document.getElementById("enc-nome").value,
        p_parentesco: document.getElementById("enc-parentesco").value,
        p_telefone_encarregado: document.getElementById("enc-telefone").value,
        p_bi_encarregado: document.getElementById("enc-bi").value || null,
        p_endereco: document.getElementById("enc-endereco").value || null,
        p_classe_pretendida: document.getElementById("ins-classe").value,
        p_curso_pretendido: document.getElementById("ins-curso").value || null,
        p_ano_lectivo: null, // O servidor vai calcular o ano actual
        p_como_soube: document.getElementById("ins-como-soube").value || null,
        p_doc_bi_frente_url: formState.urls.bi_frente,
        p_doc_bi_verso_url: formState.urls.bi_verso,
        p_doc_certificado_url: formState.urls.certificado,
        p_doc_foto_url: formState.urls.foto,
        p_media_certificado: parseFloat(document.getElementById("ins-media").value) || null,
        p_ip_hash: null
    };

    // Assumindo que a submissão continua no schema public
    const res = await chamarRPC("cesc_submeter_inscricao", payload);

    if (res.ok) {
        document.getElementById("inscricao-form").style.display = "none";
        document.getElementById("inscricao-sucesso").style.display = "block";
        document.getElementById("referencia-final").textContent = res.referencia;
        window.scrollTo(0, 0);
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submeter inscrição';
        status.className = "submissao-status erro";
        status.textContent = res.erro || "Ocorreu um erro. Tenta novamente.";
    }
}
