# 🎯 TEST RAPIDE - 2 MINUTES

## Lancer l'app
```bash
npm run dev
```

## Tester
1. Se connecter en admin
2. Ouvrir la fiche d'**Eva** (eva.ongoriaz@yopmail.com)
3. Aller dans le projet **ACC**
4. Compléter l'étape qui génère le contrat
5. **Ouvrir la console** (F12)

## Logs attendus
```
🎯 AUTO-MAPPING: Formulaire trouvé dans Supabase
✅ Mapping auto: "Prénom du client" → client_firstname
✅ Mapping auto: "Téléphone du client" → client_phone
📋 Données générales extraites { generalData: { client_firstname: "Eva", client_phone: "0757485748" }, usedAutoMapping: true }
```

## Vérifier le PDF
- Prénom : **Eva** ✅
- Téléphone : **0757485748** ✅

---

## ✅ Si ça marche
Le PDF contient les données → **SUCCÈS !**

## ❌ Si ça ne marche pas
1. Regarder les logs de console
2. Exécuter les queries dans `test_auto_mapping_eva.sql`
3. Lire `PLAN_TEST_AUTO_MAPPING.md` section "Debugging"

---

**C'est tout ! Lance `npm run dev` et teste maintenant. 🚀**
