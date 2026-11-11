#!/bin/bash

# ============================================================
# Aplicar Favicon (PNG) — CESC
# Adiciona a tag <link rel="icon" type="image/png" ...> em todas
# as páginas que ainda não a têm.
# ============================================================

echo "A aplicar favicon PNG em todas as páginas..."

# 1. Páginas na raiz (index.html)
for f in *.html; do
    [ -f "$f" ] || continue
    if ! grep -qE 'rel=["'"'"']icon["'"'"']' "$f"; then
        sed -i 's#</head>#<link rel="icon" type="image/png" href="favicon.png"></head>#' "$f"
        echo "   ✓ $f"
    else
        echo "   - $f (já tem)"
    fi
done

# 2. Páginas em subpastas
for d in paginas admin secretaria direcao; do
    [ -d "$d" ] || continue
    find "$d" -name "*.html" -exec bash -c '
        f="$1"
        if grep -qE "rel=[\"'"'"'\"]icon[\"'"'"'\"]" "$f"; then
            echo "   - $f (já tem)"
        else
            sed -i "s#</head>#<link rel=\"icon\" type=\"image/png\" href=\"../favicon.png\"></head>#" "$f"
            echo "   ✓ $f"
        fi
    ' _ {} \;
done

echo ""
echo "Concluído. Corre ./verificar-favicon.sh para confirmar."
