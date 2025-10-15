import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Pipeline from '@/pages/admin/Pipeline';
import FinalPipeline from '@/pages/admin/FinalPipeline';
import FinalPipelineRestored from '@/pages/admin/FinalPipelineRestored';
import SafeOriginalPipeline from '@/pages/admin/SafeOriginalPipeline';

const PIPELINE_VARIANTS = {
  restored: {
    label: 'Pipeline Restauré',
    component: FinalPipelineRestored,
    description: 'Version restaurée avec fiche prospect Safe.',
  },
  original: {
    label: 'Pipeline Original',
    component: Pipeline,
    description: 'Pipeline historique basé sur les étapes projet.',
  },
  final: {
    label: 'Pipeline Final',
    component: FinalPipeline,
    description: 'Pipeline CRM avec étapes commerciales classiques.',
  },
  safe: {
    label: 'Pipeline Safe',
    component: SafeOriginalPipeline,
    description: 'Variante sécurisée du pipeline original.',
  },
};

const PipelineSwitcher = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeVariant = searchParams.get('variant') || 'restored';

  const SelectedPipeline = useMemo(() => {
    return PIPELINE_VARIANTS[activeVariant]?.component || PIPELINE_VARIANTS.restored.component;
  }, [activeVariant]);

  const handleVariantChange = (variantId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('variant', variantId);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comparateur de Pipeline</h1>
            <p className="text-sm text-gray-600">
              Sélectionne un variant pour tester l’affichage et le suivi prospect.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PIPELINE_VARIANTS).map(([variantId, meta]) => (
              <Button
                key={variantId}
                variant={activeVariant === variantId ? 'default' : 'outline'}
                onClick={() => handleVariantChange(variantId)}
                className="whitespace-nowrap"
              >
                {meta.label}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {PIPELINE_VARIANTS[activeVariant]?.description || PIPELINE_VARIANTS.restored.description}
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <SelectedPipeline key={activeVariant} />
      </div>
    </div>
  );
};

export default PipelineSwitcher;
