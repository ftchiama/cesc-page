#!/data/data/com.termux/files/usr/bin/bash
#
# TCLabs - Publicar no GitHub (versao corrigida)
#

set -u

pedir() {
    local pergunta="$1"
    local defeito="${2:-}"
    local resposta

    if [ -n "$defeito" ]; then
        printf "%s [%s]: " "$pergunta" "$defeito" >&2
    else
        printf "%s: " "$pergunta" >&2
    fi

    read -r resposta

    if [ -z "$resposta" ] && [ -n "$defeito" ]; then
        echo "$defeito"
    else
        echo "$resposta"
    fi
}

pedir_sem_eco() {
    local pergunta="$1"
    local resposta

    printf "%s: " "$pergunta" >&2
    stty -echo 2>/dev/null
    read -r resposta
    stty echo 2>/dev/null
    echo "" >&2
    echo "$resposta"
}

confirmar() {
    local pergunta="$1"
    local resposta

    printf "%s (s/n): " "$pergunta" >&2
    read -r resposta

    case "$resposta" in
        s|S|sim|SIM|Sim) return 0 ;;
        *) return 1 ;;
    esac
}

cabecalho() {
    echo "" >&2
    echo "==================================================" >&2
    echo "  $1" >&2
    echo "==================================================" >&2
    echo "" >&2
}

clear 2>/dev/null || true
cabecalho "Publicar no GitHub"

echo "Vais precisar de:" >&2
echo "  - Caminho completo da pasta do projecto" >&2
echo "  - Utilizador do GitHub" >&2
echo "  - Nome do repositorio" >&2
echo "  - Token (se o repo for privado)" >&2

cabecalho "1. Pasta do projecto"

PASTA_ACTUAL=$(pwd)
PASTA=$(pedir "Caminho da pasta do projecto" "$PASTA_ACTUAL")

if [ ! -d "$PASTA" ]; then
    echo "ERRO: a pasta '$PASTA' nao existe." >&2
    exit 1
fi

cd "$PASTA" || {
    echo "ERRO: nao consegui entrar na pasta '$PASTA'." >&2
    exit 1
}

echo "OK - pasta: $(pwd)" >&2

cabecalho "2. Repositorio GitHub"

GH_USER=$(pedir "Utilizador do GitHub")
[ -z "$GH_USER" ] && { echo "ERRO: utilizador vazio." >&2; exit 1; }

GH_REPO=$(pedir "Nome do repositorio")
[ -z "$GH_REPO" ] && { echo "ERRO: repositorio vazio." >&2; exit 1; }

GH_BRANCH=$(pedir "Ramo principal" "main")
GH_URL="https://github.com/$GH_USER/$GH_REPO.git"

echo "" >&2
echo "URL: $GH_URL" >&2

cabecalho "3. Autenticacao"

if confirmar "O repositorio e privado?"; then
    GH_TOKEN=$(pedir_sem_eco "Cola o token")
    [ -z "$GH_TOKEN" ] && { echo "ERRO: token vazio." >&2; exit 1; }
    GH_URL_AUTH="https://$GH_USER:$GH_TOKEN@github.com/$GH_USER/$GH_REPO.git"
    echo "OK - token recebido." >&2
else
    GH_TOKEN=""
    GH_URL_AUTH="$GH_URL"
    echo "OK - repositorio publico." >&2
fi

cabecalho "4. Mensagem do commit"

MENSAGEM=$(pedir "Mensagem do commit" "Actualizacao do site")

cabecalho "5. A preparar"

if [ ! -d ".git" ]; then
    echo "- A inicializar git..." >&2
    git init -q
else
    echo "- git ja existe." >&2
fi

git config --global --add safe.directory "$PASTA" 2>/dev/null

if ! git config user.name >/dev/null 2>&1; then
    NOME=$(pedir "O teu nome")
    [ -n "$NOME" ] && git config --global user.name "$NOME"
fi

if ! git config user.email >/dev/null 2>&1; then
    EMAIL=$(pedir "O teu email")
    [ -n "$EMAIL" ] && git config --global user.email "$EMAIL"
fi

git branch -M "$GH_BRANCH" 2>/dev/null

REMOTE_ACTUAL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REMOTE_ACTUAL" ]; then
    echo "- A ligar ao remoto..." >&2
    git remote add origin "$GH_URL"
elif [ "$REMOTE_ACTUAL" != "$GH_URL" ]; then
    echo "- A actualizar URL do remoto..." >&2
    git remote set-url origin "$GH_URL"
else
    echo "- Remoto ja configurado." >&2
fi

cabecalho "6. .gitignore"

if [ ! -f ".gitignore" ]; then
    echo "- A criar .gitignore..." >&2
    cat > .gitignore <<'EOF'
backup-*/
backup-links-*/
.DS_Store
Thumbs.db
.vscode/
.idea/
*.log
node_modules/
EOF
    echo "  OK" >&2
else
    echo "- .gitignore ja existe." >&2
fi

cabecalho "7. Commit"

git add -A
echo "- Estado:" >&2
git status --short >&2

if git diff --cached --quiet; then
    echo "Nada para commit." >&2
else
    echo "- A criar commit..." >&2
    git commit -q -m "$MENSAGEM"
    echo "  OK" >&2
fi

cabecalho "8. Push"

PUSH_OK=0

if [ -n "$GH_TOKEN" ]; then
    if git push "$GH_URL_AUTH" "HEAD:$GH_BRANCH" --force-with-lease 2>&1; then
        PUSH_OK=1
    fi
else
    if git push -u origin "$GH_BRANCH" 2>&1; then
        PUSH_OK=1
    fi
fi

if [ "$PUSH_OK" -eq 1 ]; then
    cabecalho "CONCLUIDO"
    echo "  https://github.com/$GH_USER/$GH_REPO" >&2
    echo "  Ramo: $GH_BRANCH" >&2
else
    cabecalho "FALHOU"
    echo "  O push nao passou. Verifica o output acima." >&2
    exit 1
fi
