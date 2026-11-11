#!/bin/bash

# ============================================================
# Verificador de Favicon (PNG) — CESC
# Autor: Francisco Tchiama / TCLabs
# Data: 11/11/2026
# Descrição:
#   Verifica se a tag <link rel="icon" ...> está presente em todas
#   as páginas HTML do projeto. Mostra:
#     - Total de páginas encontradas
#     - Quantas têm o favicon
#     - Quantas NÃO têm (com o caminho completo)
#     - Sugestão do caminho correto para cada uma
# ============================================================

VERDE='\033[0;32m'
VERMELHO='\033[0;31m'
AMARELO='\033[1;33m'
AZUL='\033[0;34m'
NEGRITO='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${AZUL}${NEGRITO}========================================${RESET}"
echo -e "${AZUL}${NEGRITO}  Verificador de Favicon (PNG) — CESC${RESET}"
echo -e "${AZUL}${NEGRITO}========================================${RESET}"
echo ""

# Encontrar todas as páginas HTML (excluindo .git)
PAGINAS=$(find . -type f -name "*.html" -not -path "./.git/*" | sort)

if [ -z "$PAGINAS" ]; then
    echo -e "${VERMELHO}Nenhuma página HTML encontrada.${RESET}"
    exit 1
fi

TOTAL=0
COM_FAVICON=0
SEM_FAVICON=0

LISTA_COM=""
LISTA_SEM=""

for PAGINA in $PAGINAS; do
    TOTAL=$((TOTAL + 1))

    # Procura por rel="icon" ou rel='icon'
    if grep -qE 'rel=["'"'"']icon["'"'"']' "$PAGINA" 2>/dev/null; then
        COM_FAVICON=$((COM_FAVICON + 1))
        LISTA_COM="$LISTA_COM$PAGINA\n"
    else
        SEM_FAVICON=$((SEM_FAVICON + 1))
        LISTA_SEM="$LISTA_SEM$PAGINA\n"
    fi
done

echo -e "${NEGRITO}Resultado:${RESET}"
echo -e "  Total de páginas HTML:  ${NEGRITO}$TOTAL${RESET}"
echo -e "  ${VERDE}Com favicon:${RESET}          ${VERDE}${NEGRITO}$COM_FAVICON${RESET}"
echo -e "  ${VERMELHO}Sem favicon:${RESET}          ${VERMELHO}${NEGRITO}$SEM_FAVICON${RESET}"
echo ""

if [ "$COM_FAVICON" -gt 0 ]; then
    echo -e "${VERDE}${NEGRITO}✓ Páginas COM favicon:${RESET}"
    echo -e "$LISTA_COM" | while IFS= read -r linha; do
        [ -n "$linha" ] && echo -e "   ${VERDE}✓${RESET} $linha"
    done
    echo ""
fi

if [ "$SEM_FAVICON" -gt 0 ]; then
    echo -e "${VERMELHO}${NEGRITO}✗ Páginas SEM favicon:${RESET}"
    echo -e "$LISTA_SEM" | while IFS= read -r linha; do
        if [ -n "$linha" ]; then
            NIVEL=$(echo "$linha" | tr -cd '/' | wc -c)
            if [ "$NIVEL" -le 1 ]; then
                SUGESTAO="favicon.png"
            else
                SUGESTAO="../favicon.png"
            fi
            echo -e "   ${VERMELHO}✗${RESET} $linha"
            echo -e "       ${AMARELO}→ Sugestão: href=\"$SUGESTAO\"${RESET}"
        fi
    done
    echo ""
    echo -e "${AMARELO}${NEGRITO}Para adicionar automaticamente, corre:${RESET}"
    echo -e "   ${NEGRITO}find paginas admin secretaria direcao -name \"*.html\" -exec sed -i 's#</head>#<link rel=\"icon\" type=\"image/png\" href=\"../favicon.png\"></head>#' {} \\;${RESET}"
    echo ""
fi

if [ "$SEM_FAVICON" -eq 0 ]; then
    echo -e "${VERDE}${NEGRITO}✓ Todas as páginas têm favicon!${RESET}"
else
    echo -e "${VERMELHO}${NEGRITO}✗ Faltam $SEM_FAVICON página(s) com o favicon.${RESET}"
fi
echo ""
