# Spécifications fonctionnelles, Pillage Army Builder

Version cible, 1.12.0. Document de référence pour les usages, parcours et règles métier de l'application.

## Objectif

Permettre à un joueur de Pillage de composer une liste d'armée conforme aux règles du jeu, de la sauvegarder, de la partager publiquement, de consulter celles de la communauté, et d'exporter une fiche imprimable.

## Personas

Joueur invité, non connecté
- Compose une liste, exporte en PDF, consulte la galerie. Ne sauvegarde pas, ne publie pas, ne met pas en favori.

Joueur connecté
- Toutes les actions invité, plus sauvegarde, publication, mise en favori, fork d'une liste publique.

Administrateur
- Toutes les actions joueur connecté, plus suppression de listes, gestion des utilisateurs (rename auteur, suppression).

## Parcours principaux

Composer une armée
1. L'utilisateur choisit une faction dans le sélecteur, groupé par supplément (base, orient, finis imperii).
2. Il fixe un budget en points d'option.
3. Il recrute des unités via le dialog de recrutement, sélectionne l'équipement, peut renommer et changer l'icône d'une unité.
4. Il ajoute optionnellement des talents de faction.
5. Il consulte en continu le total de points, le seuil de moral, les erreurs de validation.
6. Il exporte la liste en PDF ou la sauvegarde s'il est connecté.

Sauvegarder et publier
- Une liste est privée par défaut.
- Le joueur peut la basculer en publique depuis Mes listes, elle apparaît alors dans la Galerie.
- Le bascule est réversible à tout moment.

Galerie
- Toutes les listes publiées sont visibles publiquement.
- Filtres, favoris, faction, palier de budget.
- Chaque carte affiche le nom, l'auteur, la faction, le budget, le total de points utilisé.
- Un bouton fork copie la liste dans le builder du joueur courant pour modification.

Mes listes
- Vue privée des listes de l'utilisateur connecté.
- Mêmes filtres que la galerie sauf le filtre favoris.
- Actions, charger dans le builder, publier ou repasser en privé, supprimer.

Favoris
- Un joueur connecté peut mettre en favori n'importe quelle liste publique.
- Les favoris sont mis en évidence visuellement, bordure ambre, halo lumineux, badge FAVORI, étoile pleine.
- Le filtre Favoris dans la galerie isole rapidement les listes mises de côté.

Administration
- Accès à `/admin/users` réservé aux comptes admin.
- Liste de tous les utilisateurs, possibilité de renommer l'auteur affiché, de supprimer un compte (cascade sur ses listes).
- Suppression d'une liste possible depuis la galerie pour les admins.

PWA
- Installation directe depuis Safari iOS ou Chrome Android via le menu de partage ou le menu navigateur.
- Une fois installée, l'app s'ouvre en mode standalone avec icône dédiée.

## Règles métier, factions et compositions

Factions disponibles
- Base, Francs, Vikings, Saxons (alternatif), Gallois, Anglo-Saxons, Magyars, Rus.
- Orient, Byzantins.
- Finis Imperii, Mérovingiens, Romains (Orient et Occident), Saxons, Wisigoths, Britto-Romains, Pictes, Huns.

Mercenaires byzantins
- Une unité peut être recrutée avec une faction source différente (`sourceFactionId`).
- Quota total des mercenaires limité à 50% du budget de l'armée.

Règles génériques
- Total des points de l'armée ne doit pas dépasser le budget fixé.
- Au moins un Chef requis pour la plupart des factions (exception, Saxons).
- Cavalerie plafonnée par défaut, exemption Huns et Magyars.
- Tireurs plafonnés à 50% pour les Gallois.

Équipements et exclusions
- Pas de cumul sans-protection plus armure.
- Le Berserker n'a accès à aucune arme de tir.
- Les options de coût sont normalisées via le helper `c`, support `'Gratuit'`, `'25 po'`, `'-'` indisponible.

Kataphraktoi
- Toute unité kataphraktoi (byzantine, romaine, hunnique) doit obligatoirement être équipée de, armure, kontos, arme de base, cheval. Le dialog de recrutement applique automatiquement cette dotation.

Pictes, armure progressive
- Les guerriers pictes n'ont pas accès à l'armure par défaut.
- Chaque Chef présent dans l'armée débloque 2 emplacements d'armure pour les guerriers.
- Les emplacements se reverrouillent dès qu'ils sont consommés, jusqu'à l'ajout d'un nouveau Chef.

Talents
- 14 talents spécifiques aux factions Finis Imperii, accessibles via le bloc Talents.
- Chaque talent peut imposer ou interdire certaines combinaisons, indiqué côté validation.

Seuil de moral
- Calculé comme `ceil(totalArmyModels / 2)`, affiché dans le récapitulatif. Indique le nombre de figurines au-delà duquel l'armée doit faire un test de moral.

## Validation, retours utilisateur

- Les erreurs bloquent la sauvegarde et la publication mais pas le recrutement, le joueur peut explorer librement.
- Les avertissements sont affichés mais n'empêchent aucune action.
- Les libellés d'erreur sont localisés FR et EN, avec valeurs dynamiques (par exemple le pourcentage de tireurs autorisé).

## Export PDF

- Bouton Exporter PDF dans le builder.
- Document A4 portrait, en-tête, faction, budget, total, seuil de moral.
- Tableau des unités, colonnes effectif, nom, icône, équipement, coût.
- Icônes Lucide et icônes custom rendues en image dans les cellules.
- Bloc talents et notes en bas de document.
- Nom de fichier, `{slug-de-la-liste}_{slug-de-faction}_{points-utilisés}po.pdf`.

## Interface, repères clés

Header
- Logo à gauche, navigation principale centrée (Builder, Galerie, Mes listes), navigation secondaire à droite (Admin si admin, Connexion ou Compte, langue).
- Sur mobile, navigation regroupée dans un burger menu.

Bloc bonus de faction
- Visuel parchemin déchiré (PNG haut, PNG bas) sur fond teal `#0F5F5E`, largeur calée sur la zone visible des images (1312 px sur 1336 px de canvas).
- Texte en blanc sur fond teal, contraste accessible.

Filtres Galerie et Mes listes
- Chip Favoris (Galerie uniquement) à gauche.
- Select Faction avec entrée Toutes les factions par défaut.
- Select Budget avec 5 paliers, jusqu'à 250, jusqu'à 500, jusqu'à 600, jusqu'à 800, plus de 800.
- Forte opacité et bordure orange pour la lisibilité.

Cartes de liste favorite
- Bordure gauche ambrée, halo lumineux ambre, badge FAVORI, étoile pleine sur le bouton de favori.

Footer
- Version affichée `v1.12.0`, mention « Créé par @tidikappa ».

## Authentification

- Inscription par email et mot de passe, validation par email Supabase.
- Connexion email et mot de passe.
- Mot de passe oublié, lien de réinitialisation envoyé par Supabase, page dédiée pour saisir le nouveau mot de passe.
- Déconnexion via le menu compte.

## i18n

- Bascule FR ou EN via le sélecteur de langue.
- Tous les libellés UI, validations, libellés PDF, libellés équipement et talents sont traduits.
- Faction et noms propres conservés tels quels.

## Points hors périmètre actuels

- Pas de matchmaking ni de système de tournoi.
- Pas de chat ni de commentaires sur les listes.
- Pas de visualisation 3D ni d'images de figurines.
- Pas d'application native iOS ou Android, uniquement web et PWA installable.

## Roadmap fonctionnelle, candidats

- Commentaires courts sur les listes publiques.
- Statistiques d'utilisation des factions et équipements.
- Génération d'un lien d'invitation pour partager une liste privée à un destinataire précis.
- Mode duel, comparaison côte à côte de deux listes.
- Historique des versions d'une liste sauvegardée.
