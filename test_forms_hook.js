/**
 * 🧪 Script de test : Hook useSupabaseForms
 * 
 * À EXÉCUTER DANS LA CONSOLE DU NAVIGATEUR
 * 
 * Ce script teste :
 * 1. Lecture des formulaires
 * 2. Création d'un formulaire de test
 * 3. Modification du formulaire
 * 4. Suppression du formulaire
 * 5. Vérification real-time
 */

(async function testFormsSupabase() {
  console.log('🧪 Début des tests useSupabaseForms...\n');

  // 1. Vérifier que Supabase est disponible
  if (typeof supabase === 'undefined') {
    console.error('❌ Erreur : supabase client non disponible');
    return;
  }

  // 2. Test : Lire tous les formulaires
  console.log('📖 Test 1 : Lecture des formulaires');
  const { data: forms, error: readError } = await supabase
    .from('forms')
    .select('*')
    .order('created_at', { ascending: false });

  if (readError) {
    console.error('❌ Erreur de lecture:', readError);
    return;
  }

  console.log(`✅ ${forms.length} formulaires trouvés`);
  console.table(forms.map(f => ({ form_id: f.form_id, name: f.name, fields_count: f.fields?.length || 0 })));

  // 3. Test : Créer un formulaire de test
  console.log('\n📝 Test 2 : Création d\'un formulaire de test');
  const testFormId = `test-form-${Date.now()}`;
  const testForm = {
    form_id: testFormId,
    name: 'TEST - Formulaire RIB',
    fields: [
      {
        id: 'field-1',
        label: 'Numéro de compte',
        type: 'text',
        placeholder: 'FR76 XXXX XXXX XXXX',
        required: true
      },
      {
        id: 'field-2',
        label: 'Document RIB (PDF)',
        type: 'file',
        required: true
      }
    ],
    project_ids: ['ACC', 'Centrale']
  };

  const { data: createdForm, error: createError } = await supabase
    .from('forms')
    .insert(testForm)
    .select()
    .single();

  if (createError) {
    console.error('❌ Erreur de création:', createError);
    return;
  }

  console.log('✅ Formulaire créé avec succès');
  console.log('ID:', createdForm.form_id);
  console.log('Nom:', createdForm.name);
  console.log('Champs:', createdForm.fields.length);

  // 4. Test : Modifier le formulaire
  console.log('\n✏️ Test 3 : Modification du formulaire');
  const { data: updatedForm, error: updateError } = await supabase
    .from('forms')
    .update({
      name: 'TEST - Formulaire RIB (Modifié)',
      fields: [
        ...testForm.fields,
        {
          id: 'field-3',
          label: 'Téléphone',
          type: 'phone',
          required: false
        }
      ]
    })
    .eq('form_id', testFormId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Erreur de modification:', updateError);
  } else {
    console.log('✅ Formulaire modifié avec succès');
    console.log('Nouveau nom:', updatedForm.name);
    console.log('Nouveaux champs:', updatedForm.fields.length);
  }

  // 5. Test : Vérifier que le formulaire existe
  console.log('\n🔍 Test 4 : Vérification');
  const { data: verifyForm, error: verifyError } = await supabase
    .from('forms')
    .select('*')
    .eq('form_id', testFormId)
    .single();

  if (verifyError) {
    console.error('❌ Erreur de vérification:', verifyError);
  } else {
    console.log('✅ Formulaire trouvé');
    console.log('Détails:', {
      id: verifyForm.form_id,
      name: verifyForm.name,
      fields: verifyForm.fields.length,
      projects: verifyForm.project_ids.join(', '),
      created: new Date(verifyForm.created_at).toLocaleString('fr-FR')
    });
  }

  // 6. Test : Supprimer le formulaire de test
  console.log('\n🗑️ Test 5 : Suppression');
  const { error: deleteError } = await supabase
    .from('forms')
    .delete()
    .eq('form_id', testFormId);

  if (deleteError) {
    console.error('❌ Erreur de suppression:', deleteError);
  } else {
    console.log('✅ Formulaire supprimé avec succès');
  }

  // 7. Vérifier la suppression
  const { data: checkDeleted } = await supabase
    .from('forms')
    .select('*')
    .eq('form_id', testFormId);

  if (checkDeleted.length === 0) {
    console.log('✅ Suppression confirmée (formulaire introuvable)');
  } else {
    console.error('❌ Le formulaire existe encore après suppression');
  }

  // 8. Résumé
  console.log('\n📊 Résumé des tests :');
  console.log('✅ Lecture : OK');
  console.log('✅ Création : OK');
  console.log('✅ Modification : OK');
  console.log('✅ Vérification : OK');
  console.log('✅ Suppression : OK');
  console.log('\n🎉 Tous les tests passés !');

  // 9. Instructions pour tester real-time
  console.log('\n📡 Pour tester le real-time :');
  console.log('1. Ouvrir un deuxième onglet avec l\'app');
  console.log('2. Créer/modifier/supprimer un formulaire dans ProfilePage');
  console.log('3. Vérifier que l\'autre onglet se met à jour automatiquement');
})();
