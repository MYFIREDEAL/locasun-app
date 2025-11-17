/**
 * 🚀 Script de migration : localStorage prompts → Supabase
 * 
 * À EXÉCUTER DANS LA CONSOLE DU NAVIGATEUR (une seule fois)
 * 
 * Ce script :
 * 1. Lit tous les prompts depuis localStorage ('evatime_prompts')
 * 2. Les insère dans la table Supabase 'prompts'
 * 3. Vérifie que la migration a réussi
 * 4. (Optionnel) Supprime les données localStorage après confirmation
 */

(async function migratePromptsToSupabase() {
  console.log('🔄 Début de la migration des prompts...');

  // 1. Charger les prompts depuis localStorage
  const storedPrompts = localStorage.getItem('evatime_prompts');
  if (!storedPrompts) {
    console.log('✅ Aucun prompt à migrer (localStorage vide)');
    return;
  }

  const prompts = JSON.parse(storedPrompts);
  const promptIds = Object.keys(prompts);
  
  if (promptIds.length === 0) {
    console.log('✅ Aucun prompt à migrer');
    return;
  }

  console.log(`📦 ${promptIds.length} prompts trouvés dans localStorage`);

  // 2. Importer Supabase client (doit être disponible dans le contexte)
  if (typeof supabase === 'undefined') {
    console.error('❌ Erreur : supabase client non disponible. Assurez-vous d\'être sur la page de l\'application.');
    return;
  }

  // 3. Migrer chaque prompt
  let successCount = 0;
  let errorCount = 0;

  for (const promptId of promptIds) {
    const prompt = prompts[promptId];
    
    try {
      // Transformer au format Supabase
      const dbPayload = {
        prompt_id: prompt.id || promptId,
        name: prompt.name,
        tone: prompt.tone,
        project_id: prompt.projectId,
        steps_config: prompt.stepsConfig || {},
      };

      console.log(`📤 Migration du prompt "${prompt.name}"...`);

      const { data, error } = await supabase
        .from('prompts')
        .upsert(dbPayload, { onConflict: 'prompt_id' })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Prompt "${prompt.name}" migré avec succès`);
      successCount++;
    } catch (err) {
      console.error(`❌ Erreur lors de la migration du prompt "${prompt.name}":`, err);
      errorCount++;
    }
  }

  // 4. Résumé
  console.log('\n📊 Résumé de la migration :');
  console.log(`✅ Succès : ${successCount}`);
  console.log(`❌ Erreurs : ${errorCount}`);

  // 5. Vérifier dans Supabase
  const { data: verifyData, error: verifyError } = await supabase
    .from('prompts')
    .select('prompt_id, name, project_id');

  if (verifyError) {
    console.error('❌ Erreur lors de la vérification:', verifyError);
  } else {
    console.log(`\n✅ Vérification : ${verifyData.length} prompts dans Supabase`);
    console.table(verifyData);
  }

  // 6. Proposer de supprimer localStorage
  if (successCount > 0) {
    console.log('\n⚠️ Pour supprimer les données localStorage (IRRÉVERSIBLE), exécutez :');
    console.log('localStorage.removeItem("evatime_prompts")');
  }
})();
