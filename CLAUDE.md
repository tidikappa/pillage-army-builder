# Army Builder for Pillage – guide pour Claude Code

Ce projet a été exporté depuis Figma Make puis nettoyé pour fonctionner en local
(Vite + React 18 + TypeScript + Tailwind v4 + Radix/shadcn). Ce fichier sert de
mémoire à Claude Code : lis-le avant toute intervention.

## Stack
- Bundler : Vite 6
- Framework : React 18.3 (JSX automatique)
- Styles : Tailwind CSS 4 via `@tailwindcss/vite` (pas de `tailwind.config.js` —
  config inline dans les fichiers CSS).
- Composants UI : shadcn/ui (inline, dans `src/app/components/ui/`) au-dessus de
  Radix Primitives.
- Animations : `motion` (anciennement framer-motion v12).
- PDF : `jspdf` + `jspdf-autotable` (export des listes d'armée).
- i18n maison via `TranslationContext` (FR / EN).

## Structure
```
src/
  main.tsx                       # point d'entrée
  app/
    App.tsx                      # shell + sélecteur de langue + Toaster
    components/
      ui/                        # composants shadcn (n'éditer qu'avec prudence)
      figma/ImageWithFallback.tsx
      pillages/                  # logique métier du builder d'armée
        ArmyBuilder.tsx
        UnitCard.tsx
        UnitForm.tsx
        TranslationContext.tsx
        translations.ts
    data/
      gameData.ts                # données du jeu (unités, factions…)
      translations.ts
  styles/
    index.css                    # entrée Tailwind (importe les autres)
    globals.css, default_theme.css, theme.css, fonts.css, tailwind.css
  assets/                        # PNG référencés via `figma:asset/...`
  figma-asset.d.ts               # déclarations TS pour le scheme figma:asset
```

## Alias et imports particuliers
- `@/...` → `src/app/...` (configuré dans `vite.config.ts` et `tsconfig.json`).
- `figma:asset/<hash>.png` → résolu vers `src/assets/<hash>.png` par un plugin
  Vite custom dans `vite.config.ts`. Conserver ce plugin tant qu'on n'a pas
  renommé les imports.

## Commandes
```bash
npm install        # installation
npm run dev        # serveur de dev sur http://localhost:5173
npm run build      # build de production dans dist/
npm run preview    # prévisualisation du build
npm run typecheck  # vérification TypeScript (sans émission)
```

## Notes pour Claude Code
- Le code est volontiers verbeux (génération IA). Lors de modifications, ne
  pas hésiter à factoriser les répétitions, mais ne pas casser la structure
  visible du builder (utilisateur peu technique).
- Tailwind v4 ne lit pas `tailwind.config.js` : pour ajouter une couleur ou un
  token, utiliser les directives `@theme` / `@layer` dans `src/styles/`.
- L'image de fond `f0b78e52...png` pèse 3,5 Mo : si la performance devient un
  enjeu, la convertir en WebP/AVIF ou la réduire.
- Le `package.json` listait initialement des imports avec versions embarquées
  (`from "react-dom@18.3.1"`) — particularité Figma Make. Tous ces imports ont
  été nettoyés. Si tu réimportes du code depuis Figma Make, refais une passe.
- Ne pas réintroduire `pnpm-workspace.yaml` : ce repo est un projet npm simple.

## Tâches probables à venir
- Persister la composition d'armée (localStorage / URL).
- Améliorer l'export PDF (mise en page, logos).
- Ajouter des factions / unités dans `src/app/data/gameData.ts`.
- Découper le bundle (un seul chunk JS de 830 KB minifié actuellement).
