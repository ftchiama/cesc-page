document.addEventListener("DOMContentLoaded", function () {
    
    // Formatar BI em maiúsculas
    document.getElementById("consulta-bi").addEventListener("input", function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    });
    
    // Formatar Ref em maiúsculas
    document.getElementById("consulta-ref").addEventListener("input", function() {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    });

    document.getElementById("btn-consultar").addEventListener("click", async function () {
        const btn = this;
        const ref = document.getElementById("consulta-ref").value.trim();
        const bi = document.getElementById("consulta-bi").value.trim();
        
        const erroRef = document.getElementById("erro-consulta-ref");
        const erroBi = document.getElementById("erro-consulta-bi");
        erroRef.textContent = "";
        erroBi.textContent = "";

        if (!ref) { erroRef.textContent = "Insere a referência."; return; }
        if (!bi) { erroBi.textContent = "Insere o BI."; return; }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A consultar...';

        const res = await chamarRPC("cesc_consultar_inscricao", {
            p_referencia: ref,
            p_bi_numero: bi
        });

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> Consultar';

        if (res.ok) {
            mostrarResultado(res.inscricao);
        } else {
            alert(res.erro || "Inscrição não encontrada.");
        }
    });

    document.getElementById("btn-nova-consulta").addEventListener("click", function() {
        document.getElementById("consulta-form").style.display = "block";
        document.getElementById("consulta-resultado").style.display = "none";
        window.scrollTo(0, 0);
    });
});

function mostrarResultado(insc) {
    document.getElementById("consulta-form").style.display = "none";
    document.getElementById("consulta-resultado").style.display = "block";
    window.scrollTo(0, 0);

    document.getElementById("resultado-ref").textContent = insc.referencia;

    // Preencher dados do aluno
    const divAluno = document.getElementById("resultado-aluno");
    divAluno.innerHTML = `
        <div class="revisao-linha"><span class="rotulo">Nome</span><span class="valor">${insc.nome_completo}</span></div>
        <div class="revisao-linha"><span class="rotulo">BI</span><span class="valor">${insc.bi_numero}</span></div>
        <div class="revisao-linha"><span class="rotulo">Classe pretendida</span><span class="valor">${insc.classe_pretendida}</span></div>
        <div class="revisao-linha"><span class="rotulo">Curso</span><span class="valor">${insc.curso_pretendido || "—"}</span></div>
        <div class="revisao-linha"><span class="rotulo">Ano Letivo</span><span class="valor">${insc.ano_lectivo}</span></div>
    `;

    // Preencher estado
    const divEstado = document.getElementById("resultado-estado");
    let htmlEstado = "";
    let corBadge = "";

    if (insc.estado === "pendente") {
        corBadge = "badge-pendente";
        htmlEstado = `<p style="font-size:0.9rem; color:var(--cor-texto-suave);">A tua inscrição está a ser analisada pela secretaria. Aguarda o contacto.</p>`;
    } else if (insc.estado === "aprovada") {
        corBadge = "badge-activo";
        htmlEstado = `<p style="font-size:0.9rem; color:#065f46; background:#d1fae5; padding:12px; border-radius:8px;">
            Parabéns! A tua inscrição foi aprovada. Já podes criar a conta de aluno no site com o teu BI.
        </p>`;
    } else if (insc.estado === "rejeitada") {
        corBadge = "badge-desistente";
        htmlEstado = `<p style="font-size:0.9rem; color:var(--cor-erro); background:#fef2f2; padding:12px; border-radius:8px;">
            A tua inscrição foi rejeitada. <br><strong>Motivo:</strong> ${insc.motivo_rejeicao || "Não especificado"}.
        </p>`;
    }

    divEstado.innerHTML = `
        <div style="margin-bottom: 12px;">
            <span class="badge ${corBadge}" style="font-size:0.9rem; padding:6px 14px;">${insc.estado.toUpperCase()}</span>
        </div>
        ${htmlEstado}
    `;
}