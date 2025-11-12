import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TestSupabasePage() {
  const [results, setResults] = useState({
    projects: null,
    pipeline: null,
    company: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    async function runTests() {
      console.log('🔌 Test de connexion Supabase...');
      
      try {
        // Test 1: Projets
        const { data: projects, error: projectsError } = await supabase
          .from('project_templates')
          .select('*');
        
        if (projectsError) throw projectsError;
        console.log('✅ Projets récupérés:', projects?.length);

        // Test 2: Pipeline
        const { data: pipeline, error: pipelineError } = await supabase
          .from('global_pipeline_steps')
          .select('*')
          .order('position');
        
        if (pipelineError) throw pipelineError;
        console.log('✅ Étapes pipeline récupérées:', pipeline?.length);

        // Test 3: Paramètres entreprise
        const { data: company, error: companyError } = await supabase
          .from('company_settings')
          .select('*')
          .limit(1)
          .single();
        
        if (companyError) throw companyError;
        console.log('✅ Paramètres entreprise récupérés');

        setResults({
          projects,
          pipeline,
          company,
          loading: false,
          error: null
        });
        
        console.log('✅ Tous les tests sont passés!');
      } catch (error) {
        console.error('❌ Erreur:', error);
        setResults(prev => ({ ...prev, loading: false, error }));
      }
    }

    runTests();
  }, []);

  if (results.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Test de connexion Supabase en cours...</p>
        </div>
      </div>
    );
  }

  if (results.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-800 mb-4">❌ Erreur de connexion</h1>
          <pre className="bg-red-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(results.error, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">✅ Connexion Supabase réussie !</h1>

        {/* Projects */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📋 Modèles de projets ({results.projects?.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.projects?.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                <div className="text-2xl mb-2">{project.icon}</div>
                <h3 className="font-semibold text-gray-900">{project.title}</h3>
                <p className="text-sm text-gray-600">{project.type}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {project.is_public ? '🌐 Public' : '🔒 Privé'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📊 Étapes du pipeline ({results.pipeline?.length})
          </h2>
          <div className="flex gap-4 overflow-x-auto">
            {results.pipeline?.map((step) => (
              <div
                key={step.id}
                className={`${step.color} border border-gray-300 rounded-lg p-4 min-w-[150px]`}
              >
                <h3 className="font-semibold text-gray-900">{step.label}</h3>
                <p className="text-xs text-gray-600 mt-1">Position: {step.position}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Company Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            🏢 Paramètres de l'entreprise
          </h2>
          <div className="space-y-2">
            <p className="text-gray-700">
              <span className="font-semibold">Nom:</span> {results.company?.company_name}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Formulaire de contact:</span>{' '}
              {results.company?.settings?.contact_form_config?.length || 0} champs
            </p>
            {results.company?.logo_url && (
              <img
                src={results.company.logo_url}
                alt="Logo"
                className="h-16 mt-4"
              />
            )}
          </div>
        </div>

        {/* Console hint */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Astuce:</strong> Ouvre la console du navigateur (F12) pour voir les logs détaillés.
          </p>
        </div>
      </div>
    </div>
  );
}
