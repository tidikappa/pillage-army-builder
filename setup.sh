#!/usr/bin/env bash
# Setup automatique pour macOS
# Usage : ./setup.sh
set -e

echo "==> Vérification de Node.js"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js absent. Installation via Homebrew."
  if ! command -v brew >/dev/null 2>&1; then
    echo "Homebrew absent. Installation de Homebrew d'abord :"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  brew install node
else
  echo "Node $(node --version) OK"
fi

echo "==> Installation des dépendances du projet"
npm install

echo "==> Installation de Claude Code (global)"
if ! command -v claude >/dev/null 2>&1; then
  npm install -g @anthropic-ai/claude-code
else
  echo "Claude Code déjà installé : $(claude --version 2>/dev/null || echo 'présent')"
fi

echo ""
echo "Tout est prêt."
echo ""
echo "Pour lancer le projet :   npm run dev"
echo "Pour Claude Code :        claude"
