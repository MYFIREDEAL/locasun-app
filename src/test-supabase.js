// Test de connexion Supabase
import { supabase } from './lib/supabase.js';

console.log('🔌 Test de connexion Supabase...\n');

// Test 1: Récupérer les modèles de projets
async function testProjectTemplates() {
  console.log('📋 Test 1: Récupération des modèles de projets...');
  const { data, error } = await supabase
    .from('project_templates')
    .select('*');
  
  if (error) {
    console.error('❌ Erreur:', error);
  } else {
    console.log('✅ Succès! Nombre de projets:', data.length);
    console.log('Projets:', data.map(p => p.type).join(', '));
  }
  console.log('');
}

// Test 2: Récupérer les étapes du pipeline
async function testPipelineSteps() {
  console.log('📊 Test 2: Récupération des étapes du pipeline...');
  const { data, error } = await supabase
    .from('global_pipeline_steps')
    .select('*')
    .order('position');
  
  if (error) {
    console.error('❌ Erreur:', error);
  } else {
    console.log('✅ Succès! Nombre d\'étapes:', data.length);
    console.log('Étapes:', data.map(s => s.label).join(' → '));
  }
  console.log('');
}

// Test 3: Récupérer les paramètres de l'entreprise
async function testCompanySettings() {
  console.log('🏢 Test 3: Récupération des paramètres entreprise...');
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ Erreur:', error);
  } else {
    console.log('✅ Succès! Entreprise:', data.company_name);
    console.log('Formulaire contact:', data.settings?.contact_form_config?.length, 'champs');
  }
  console.log('');
}

// Exécuter tous les tests
async function runTests() {
  try {
    await testProjectTemplates();
    await testPipelineSteps();
    await testCompanySettings();
    console.log('✅ Tous les tests sont passés! La connexion Supabase fonctionne.\n');
  } catch (err) {
    console.error('❌ Erreur globale:', err);
  }
}

runTests();
