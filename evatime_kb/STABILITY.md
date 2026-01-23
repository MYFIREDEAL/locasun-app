# 🧊 STABILITY — EVATIME

Ce document liste les règles **non négociables** pour éviter :
- pages blanches
- crash au refresh
- crash à la navigation rapide
- race conditions React
- initialisations async cassées

---

## 1️⃣ RÈGLE ABSOLUE — INIT ASYNC

❌ Interdit :
```js
useState(createSomethingAsync())
```

✅ Obligatoire :
```js
useState(null)

useEffect(() => {
  if (!dataReady) return
  setState(createSomething())
}, [dataReady])
```

---

## 2️⃣ RÈGLE ABSOLUE — PIPELINE

* Le pipeline est une **vue calculée**
* ❌ Jamais modifié directement
* Toute modification passe par :

  * étape projet
  * workflow

---

## 3️⃣ RÈGLE ABSOLUE — GUARDS

Tout accès à une donnée potentiellement async doit être protégé :

```js
if (!data) return null
```

Aucune exception.

---

## 4️⃣ RÈGLE ABSOLUE — useEffect

* Les dépendances doivent être complètes
* Les effets concurrents doivent être évités
* Toujours prévoir le cas :

  * mount
  * refresh
  * navigation rapide

---

## 5️⃣ RÈGLE ABSOLUE — IA

* L'IA n'est jamais une autorité
* Elle ne modifie jamais directement :

  * pipeline
  * état critique
* Elle propose, elle n'impose pas

---

## 🚨 EN CAS DE BUG CHELOU

1. Lire ce fichier
2. Identifier si une règle est violée
3. Corriger AVANT d'ajouter quoi que ce soit

Si tu n'as pas lu ce fichier, **tu ne touches pas au code**.
