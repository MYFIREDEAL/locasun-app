// Test de connexion Supabase
import { supabase } from './lib/supabase.js';

// Test 1: Récupérer les modèles de projets
async function testProjectTemplates() {
  const { data, error } = await supabase
    .from('project_templates')
    .select('*');
  
  if (error) {
    console.error('❌ Erreur:', error);
  }
}

// Test 2: Récupérer les étapes du pipeline
async function testPipelineSteps() {
  const { data, error } = await supabase
    .from('global_pipeline_steps')
    .select('*')
    .order('position');
  
  if (error) {
    console.error('❌ Erreur:', error);
  }
}

// Test 3: Récupérer les paramètres de l'entreprise
async function testCompanySettings() {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter tous les tests
async function runTests() {
  try {
    await testProjectTemplates();
    await testPipelineSteps();
    await testCompanySettings();
  } catch (err) {
    console.error('❌ Erreur globale:', err);
  }
}

runTests();
