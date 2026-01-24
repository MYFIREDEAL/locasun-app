# 🔥 Smoke Tests – EVATIME

> Tests manuels rapides à exécuter après chaque PR pour valider que l'app fonctionne.  
> ⏱️ Durée estimée : 3-5 minutes

---

## 🎯 Objectif

Détecter les **régressions critiques** avant merge. Ces tests couvrent les parcours utilisateurs vitaux.

---

## ✅ Checklist Smoke Test

### 1. Build & Start (Obligatoire)

```bash
# 1. Build production (doit passer sans erreur)
npm run build

# 2. Preview locale (vérifier que l'app démarre)
npm run preview
# → Ouvrir http://localhost:4173 et vérifier que la page charge
```

**Critères de succès :**
- [ ] `npm run build` termine sans erreur
- [ ] `npm run preview` démarre le serveur
- [ ] La page d'accueil s'affiche (pas de page blanche)

---

### 2. Authentification Admin

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Aller sur `/auth/login` | Formulaire de connexion affiché |
| 2 | Se connecter avec un compte admin | Redirection vers `/admin/pipeline` |
| 3 | Vérifier le header | Nom de l'utilisateur affiché |
| 4 | Cliquer sur "Déconnexion" | Retour à la page de login |

---

### 3. Authentification Client

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Se connecter avec un compte client | Redirection vers `/dashboard` |
| 2 | Vérifier le dashboard | Informations du projet affichées |
| 3 | Cliquer sur menu latéral | Navigation fonctionne |

---

### 4. Pipeline Admin (Core Feature)

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Aller sur `/admin/pipeline` | Colonnes du pipeline visibles |
| 2 | Cliquer sur une carte prospect | Modal/panneau de détails s'ouvre |
| 3 | Fermer le panneau | Retour à la vue pipeline |
| 4 | Changer de filtre projet | Le pipeline se met à jour |

---

### 5. Agenda Admin

| Étape | Action | Résultat attendu |
|-------|--------|------------------|
| 1 | Aller sur `/admin/agenda` | Calendrier affiché |
| 2 | Cliquer sur un jour | Vue détaillée ou modal de création |
| 3 | Naviguer au mois suivant | Le calendrier se met à jour |

---

### 6. Console Navigateur (Obligatoire)

```
Ouvrir DevTools (F12) → Console
```

**Critères de succès :**
- [ ] Aucune erreur JavaScript rouge (warnings acceptables)
- [ ] Aucun `Uncaught Error` ou `Unhandled Rejection`
- [ ] Pas de boucle infinie de requêtes dans l'onglet Network

---

## 🚨 Signaux d'Alerte

Si l'un de ces symptômes apparaît, **NE PAS MERGER** :

| Symptôme | Cause probable |
|----------|----------------|
| Page blanche | Erreur React non capturée, import manquant |
| Boucle de refresh | Race condition auth, dépendance useEffect |
| Spinner infini | Requête Supabase bloquée, RLS policy |
| Console spam | Hook sans cleanup, subscription leak |
| 401/403 répétés | RLS misconfiguration, token expiré |

---

## 📋 Template de Rapport

```markdown
## Smoke Test Report – PR-XXX

**Date :** YYYY-MM-DD
**Testeur :** @username
**Environnement :** Local / Preview / Staging

### Build
- [ ] `npm run build` ✅
- [ ] `npm run preview` ✅

### Parcours testés
- [ ] Auth Admin ✅/❌
- [ ] Auth Client ✅/❌
- [ ] Pipeline ✅/❌
- [ ] Agenda ✅/❌
- [ ] Console clean ✅/❌

### Issues détectées
- Aucune / [Description du problème]

### Verdict
🟢 GO / 🔴 NO-GO
```

---

## 🔧 Commandes de Vérification

```bash
# Build complet (détecte les erreurs de compilation)
npm run build

# Check custom EVATIME (si configuré)
npm run evatime:check

# Lancer en local avec hot reload
npm run dev
```

---

## 📌 Notes

1. **Pas de tests automatisés** : Ce projet n'a pas encore de framework de test (Jest/Vitest). Ces smoke tests manuels sont le filet de sécurité actuel.

2. **Sentry non installé** : Les erreurs en production ne sont pas trackées. Priorité PR-05.

3. **ErrorBoundary actif** : `src/components/ErrorBoundary.jsx` capture les erreurs React. Si vous voyez l'écran "Oups ! Une erreur est survenue", c'est qu'une erreur a été capturée.

---

*Dernière mise à jour : PR-0 Baseline & Guardrails*
