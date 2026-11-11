#!/bin/bash

# ============================================================
# Limpar Cópias ("cópia de") — CESC
# Autor: Francisco Tchiama / TCLabs
# Descrição:
#   Encontra e remove ficheiros com o padrão "cópia de" no nome
#   (ex: "cópia de index.html", "cópia de login.js").
#   Pede confirmação antes de apagar.
# ============================================================

VERDE='\033[0;32m'
VERMELHO='\033[0;31m'
AMARELO='\033[1;33m'
AZUL='\033[0;34m'
NEGRITO='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${AZUL}${NEGRITO}========================================${RESET}"
echo -e "${AZUL}${NEGRITO}  Limpar Cópias (\"cópia de\") — CESC${RESET}"
echo -e "${AZUL}${NEGRITO}========================================${RESET}"
echo ""

# Encontrar ficheiros com "cópia de" no nome (case-insensitive para "Cópia de")
# Exclui .git e node_modules
RESULTADO=$(find . -type f -iname "*cópia de*" -not -path './.git/*' -not -path './node_modules/*' 2>/dev/null | sort)

if [ -z "$RESULTADO" ]; then
    echo -e "${VERDE}${NEGRITO}✓ Nenhum ficheiro de cópia encontrado.${RESET}"
    echo ""
    exit 0
fi

TOTAL=$(echo "$RESULTADO" | wc -l)

echo -e "${AMARELO}${NEGRITO}Encontrados $TOTAL ficheiro(s) de cópia:${RESET}"
echo ""
echo "$RESULTADO" | while IFS= read -r f; do
    echo -e "   ${VERMELHO}✗${RESET} $f"
done
echo ""

echo -e "${NEGRITO}Queres apagar estes $TOTAL ficheiro(s)?${RESET}"
read -p "Escreve 'sim' para confirmar: " CONFIRMA

if [ "$CONFIRMA" != "sim" ]; then
    echo -e "${AMARELO}Operação cancelada. Nada foi apagado.${RESET}"
    echo ""
    exit 0
fi

echo ""
echo "A apagar..."
echo "$RESULTADO" | while IFS= read -r f; do
    if rm -f "$f" 2>/dev/null; then
        echo -e "   ${VERDE}✓${RESET} Apagado: $f"
    else
        echo -e "   ${VERMELHO}✗${RESET} Falhou: $f"
    fi
done

echo ""
echo -e "${VERDE}${NEGRITO}✓ Limpeza concluída.${RESET}"
echo ""

# Verificar se ficou algo
DEPOIS=$(find . -type f -iname "*cópia de*" -not -path './.git/*' -not -path './node_modules/*' 2>/dev/null | wc -l)
if [ "$DEPOIS" -eq 0 ]; then
    echo -e "${VERDE}Nenhum ficheiro de cópia restante.${RESET}"
else
    echo -e "${VERMELHO}Ainda restam $DEPOIS ficheiro(s) de cópia.${RESET}"
fi
echo ""
