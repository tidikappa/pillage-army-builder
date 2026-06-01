# Army Builder for Pillage

Builder d'armée pour le jeu Pillage, exporté depuis Figma Make puis adapté pour
un développement local.

## Démarrage rapide

Prérequis : Node.js 18+ (recommandé : LTS depuis nodejs.org).

```bash
npm install
npm run dev
```

Le serveur démarre sur http://localhost:5173.

## Scripts

| Commande | Action |
|---|---|
| `npm run dev` | Serveur de dev avec HMR |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Prévisualisation du build |
| `npm run typecheck` | Vérification TypeScript |

## Utilisation avec Claude Code

Un fichier `CLAUDE.md` est inclus à la racine. Il décrit la stack, la structure
et les conventions du projet. Lancer Claude Code depuis ce dossier :

```bash
claude
```

puis poser ses questions / demandes en langage naturel.
