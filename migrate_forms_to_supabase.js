/**
 * 🚀 Script de migration : localStorage forms → Supabase
 * 
 * À EXÉCUTER DANS LA CONSOLE DU NAVIGATEUR (une seule fois)
 * 
 * Ce script :
 * 1. Lit tous les formulaires depuis localStorage ('evatime_forms')
 * 2. Les insère dans la table Supabase 'forms'
 * 3. Vérifie que la migration a réussi
 * 4. (Optionnel) Supprime les données localStorage après confirmation
 */

(async function migrateFormsToSupabase() {
  console.log('🔄 Début de la migration des formulaires...');

  // 1. Charger les formulaires depuis localStorage
  const storedForms = localStorage.getItem('evatime_forms');
  if (!storedForms) {
    console.log('✅ Aucun formulaire à migrer (localStorage vide)');
    return;
  }

  const forms = JSON.parse(storedForms);
  const formIds = Object.keys(forms);
  
  if (formIds.length === 0) {
    console.log('✅ Aucun formulaire à migrer');
    return;
  }

  console.log(`📦 ${formIds.length} formulaires trouvés dans localStorage`);

  // 2. Importer Supabase client (doit être disponible dans le contexte)
  if (typeof supabase === 'undefined') {
    console.error('❌ Erreur : supabase client non disponible. Assurez-vous d\'être sur la page de l\'application.');
    return;
  }

  // 3. Migrer chaque formulaire
  let successCount = 0;
  let errorCount = 0;

  for (const formId of formIds) {
    const form = forms[formId];
    
    try {
      // Transformer au format Supabase
      const dbPayload = {
        form_id: form.id || formId,
        name: form.name,
        fields: form.fields || [],
        project_ids: form.projectIds || [],
      };

      console.log(`📤 Migration du formulaire "${form.name}"...`);

      const { data, error } = await supabase
        .from('forms')
        .upsert(dbPayload, { onConflict: 'form_id' })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Formulaire "${form.name}" migré avec succès`);
      successCount++;
    } catch (err) {
      console.error(`❌ Erreur lors de la migration du formulaire "${form.name}":`, err);
      errorCount++;
    }
  }

  // 4. Résumé
  console.log('\n📊 Résumé de la migration :');
  console.log(`✅ Succès : ${successCount}`);
  console.log(`❌ Erreurs : ${errorCount}`);

  // 5. Vérifier dans Supabase
  const { data: verifyData, error: verifyError } = await supabase
    .from('forms')
    .select('form_id, name');

  if (verifyError) {
    console.error('❌ Erreur lors de la vérification:', verifyError);
  } else {
    console.log(`\n✅ Vérification : ${verifyData.length} formulaires dans Supabase`);
    console.table(verifyData);
  }

  // 6. Proposer de supprimer localStorage
  if (successCount > 0) {
    console.log('\n⚠️ Pour supprimer les données localStorage (IRRÉVERSIBLE), exécutez :');
    console.log('localStorage.removeItem("evatime_forms")');
  }
})();
