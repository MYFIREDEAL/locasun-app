# BOOT EVATIME — PLAN D'ACTION OFFICIEL

## 0. RÈGLES NON NÉGOCIABLES

* Aucun hook Supabase sans `enabled`
* Aucun rendu métier sans `appReady`
* Tout est tracé dans BOOT_AUDIT.md

STATUT : ✅ VALIDÉ

## 1. CRÉER LA SOURCE DE VÉRITÉ

📄 Fichier : `BOOT_AUDIT.md`

Contient :

* ordre réel du boot
* hooks fautifs
* fixes appliqués
* état du chantier

STATUT : ⏳ À FAIRE (bloquant)

## 2. CARTOGRAPHIE DU BOOT RÉEL (FACTUEL)

Objectif : observer, pas corriger

À noter dans BOOT_AUDIT.md :

* main.jsx
* App.jsx
* Providers (Auth, Org, AppContext…)
* Layouts
* premier hook Supabase exécuté trop tôt

AUCUNE interprétation.

STATUT : ⏳ À FAIRE

## 3. DÉFINITION DES FLAGS GLOBAUX

États obligatoires :

* authReady
* organizationReady
* settingsReady
* appReady = authReady && organizationReady && settingsReady

STATUT : ✅ VALIDÉ (conceptuellement)

## 4. BOOTGATE UNIQUE (POINT DE CONTRÔLE)

Un seul composant décide :

* loader
* ou AppRouter

Aucun layout / page / hook avant ce feu vert.

STATUT : ⏳ À FAIRE

## 5. INVENTAIRE DES HOOKS À RISQUE

Pour chaque hook Supabase :

* fichier
* dépendances (orgId, userId, projectType…)
* appelé avant appReady ? OUI / NON
* action : guard / déplacer / bloquer

STATUT : ⏳ À FAIRE

## 6. FIXES MINIMAUX (PAS DE REFACTOR)

Actions autorisées :

* ajout `enabled`
* `if (!orgReady) return null`
* déplacement sous BootGate

Actions interdites :

* refactor
* nettoyage
* amélioration UX

STATUT : ⏳ À FAIRE

## 7. VALIDATION TECHNIQUE

Checklist obligatoire :

* refresh page OK
* changement d'org OK
* navigation OK
* console sans erreur rouge

STATUT : ⏳ À FAIRE

## 8. GEL DU BOOT

Une fois validé :

* plus aucune modif boot sans raison critique
* SMS / GPT seulement APRÈS

STATUT : 🔒 À VENIR
