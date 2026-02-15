import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, RotateCcw, ExternalLink, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { InlineEditable, InlineEditableIcon } from '@/components/ui/inline-editable';
import { useLandingPageConfig } from '@/hooks/useLandingPageConfig';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from '@/components/ui/use-toast';

/**
 * Page de configuration de la Landing Page
 * Permet à l'admin d'éditer en inline tous les textes de la landing page publique
 * 
 * Design inspiré de locasun.io :
 * - Hero section avec titre, sous-titre et CTA
 * - Section "Comment ça marche" avec 3 blocs
 */
const LandingPageConfigPage = () => {
  const { organizationId, logoUrl, brandName } = useOrganization();
  const { 
    loading, 
    getLandingConfig, 
    updateLandingField, 
    updateLandingBlock,
    resetToDefaults 
  } = useLandingPageConfig(organizationId);
  
  const [showPreview, setShowPreview] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const config = getLandingConfig();

  // Valeurs avec fallback pour l'affichage (comme sur la landing publique)
  const displayHeroTitle = config.hero_title || `Bienvenue chez ${brandName || 'votre entreprise'}`;
  const displayHeroSubtitle = config.hero_subtitle || "Suivez l'avancement de votre projet en temps réel";

  const handleFieldSave = async (field, value) => {
    const success = await updateLandingField(field, value);
    if (success) {
      toast({
        title: "✅ Sauvegardé",
        description: "Modification enregistrée.",
        className: "bg-green-500 text-white",
        duration: 2000,
      });
    }
  };

  const handleBlockSave = async (blockId, field, value) => {
    const block = config.blocks.find(b => b.id === blockId);
    const success = await updateLandingBlock(blockId, { ...block, [field]: value });
    if (success) {
      toast({
        title: "✅ Sauvegardé",
        description: "Bloc mis à jour.",
        className: "bg-green-500 text-white",
        duration: 2000,
      });
    }
  };

  const handleReset = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser la landing page aux valeurs par défaut ?')) {
      return;
    }
    setIsResetting(true);
    await resetToDefaults();
    setIsResetting(false);
    toast({
      title: "🔄 Réinitialisé",
      description: "La landing page a été réinitialisée.",
      className: "bg-blue-500 text-white",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎨 Landing Page</h1>
          <p className="text-gray-600 mt-1">
            Personnalisez la page d'accueil publique de votre entreprise. Cliquez sur n'importe quel texte pour le modifier.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Masquer preview' : 'Afficher preview'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isResetting}
            className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          >
            {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-blue-800 text-sm">
          💡 <strong>Astuce :</strong> Cliquez directement sur les textes pour les modifier. 
          Les modifications sont sauvegardées automatiquement.
          Le logo utilisé est celui configuré dans les paramètres de votre organisation.
        </p>
      </div>

      {/* Preview de la Landing Page */}
      {showPreview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
        >
          {/* Header Preview */}
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={brandName || 'Logo'} className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">{brandName?.charAt(0) || 'E'}</span>
                </div>
              )}
              <span className="font-semibold text-gray-700">{brandName || 'Votre entreprise'}</span>
            </div>
            <div className="flex gap-2">
              <span className="px-4 py-2 rounded-full bg-[#22c55e] text-white text-sm font-medium">Espace Pro</span>
              <span className="px-4 py-2 rounded-full bg-[#0ea5e9] text-white text-sm font-medium">Espace Client</span>
            </div>
          </div>

          {/* Hero Section */}
          <div className="relative px-8 py-16 bg-gradient-to-b from-white to-green-50/30">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-100/50 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
              {/* Hero Title - EDITABLE */}
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                <InlineEditable
                  value={displayHeroTitle}
                  onSave={(value) => handleFieldSave('hero_title', value)}
                  placeholder={`Bienvenue chez ${brandName || 'votre entreprise'}`}
                  className="text-4xl md:text-5xl font-bold"
                  inputClassName="text-3xl font-bold text-center"
                />
              </h1>

              {/* Hero Subtitle - EDITABLE */}
              <p className="text-xl md:text-2xl text-gray-600 italic">
                <InlineEditable
                  value={displayHeroSubtitle}
                  onSave={(value) => handleFieldSave('hero_subtitle', value)}
                  placeholder="Suivez l'avancement de votre projet en temps réel"
                  className="text-xl md:text-2xl text-gray-600 italic"
                  inputClassName="text-xl italic text-center"
                />
              </p>

              {/* CTA Buttons */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <button className="px-8 py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-full font-semibold text-lg transition-colors">
                  <InlineEditable
                    value={config.hero_cta_text}
                    onSave={(value) => handleFieldSave('hero_cta_text', value)}
                    placeholder="Texte du bouton..."
                    className="text-white font-semibold"
                    inputClassName="text-center"
                  />
                </button>
                {config.show_how_it_works !== false && (
                  <span className="text-[#22c55e] font-medium cursor-pointer hover:text-[#16a34a]">
                    <InlineEditable
                      value={config.how_it_works_title}
                      onSave={(value) => handleFieldSave('how_it_works_title', value)}
                      placeholder="Comment ça marche ?"
                      className="text-[#22c55e] font-medium"
                      inputClassName="text-center"
                    />
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">
                Le bouton redirige toujours vers la création de compte
              </p>
            </div>
          </div>

          {/* Toggle "Comment ça marche" */}
          <div className="px-8 py-4 bg-gray-50 border-t border-b border-gray-200">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div>
                <h3 className="font-semibold text-gray-900">Section "Comment ça marche"</h3>
                <p className="text-sm text-gray-500">Afficher les 3 blocs explicatifs sur la landing page</p>
              </div>
              <Switch
                checked={config.show_how_it_works !== false}
                onCheckedChange={(checked) => handleFieldSave('show_how_it_works', checked)}
              />
            </div>
          </div>

          {/* How it Works Section - Conditionnel */}
          {config.show_how_it_works !== false && (
          <div className="px-8 py-16 bg-white">
            <div className="max-w-4xl mx-auto text-center space-y-12">
              {/* Section Title - EDITABLE */}
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-gray-900">
                  <InlineEditable
                    value={config.how_it_works_title}
                    onSave={(value) => handleFieldSave('how_it_works_title', value)}
                    placeholder="Titre de la section..."
                    className="text-3xl font-bold"
                    inputClassName="text-2xl font-bold text-center"
                  />
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  <InlineEditable
                    value={config.how_it_works_subtitle}
                    onSave={(value) => handleFieldSave('how_it_works_subtitle', value)}
                    placeholder="Description de la section..."
                    className="text-gray-600"
                    inputClassName="text-center"
                    multiline
                  />
                </p>
              </div>

              {/* 3 Blocks - EDITABLE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {config.blocks.map((block) => (
                  <Card key={block.id} className="text-center hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      {/* Icon - EDITABLE */}
                      <div className="flex justify-center mb-2">
                        <InlineEditableIcon
                          value={block.icon}
                          onSave={(value) => handleBlockSave(block.id, 'icon', value)}
                        />
                      </div>
                      {/* Title - EDITABLE */}
                      <CardTitle className="text-lg">
                        <InlineEditable
                          value={block.title}
                          onSave={(value) => handleBlockSave(block.id, 'title', value)}
                          placeholder="Titre du bloc..."
                          className="text-lg font-semibold"
                          inputClassName="text-center font-semibold"
                        />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Description - EDITABLE */}
                      <CardDescription>
                        <InlineEditable
                          value={block.description}
                          onSave={(value) => handleBlockSave(block.id, 'description', value)}
                          placeholder="Description du bloc..."
                          className="text-gray-600 text-sm"
                          inputClassName="text-center text-sm"
                          multiline
                        />
                      </CardDescription>
                      {/* Tag - EDITABLE */}
                      <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        <InlineEditable
                          value={block.tag}
                          onSave={(value) => handleBlockSave(block.id, 'tag', value)}
                          placeholder="Tag du bloc..."
                          className="text-xs"
                          inputClassName="text-xs text-center"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Footer Preview */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 text-center text-sm text-gray-500">
            Prévisualisation de votre landing page • Les modifications sont sauvegardées en temps réel
          </div>
        </motion.div>
      )}

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Hero Section</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">2 textes</p>
            <p className="text-xs text-gray-500">Titre + sous-titre + 2 CTAs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Comment ça marche</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">3 blocs</p>
            <p className="text-xs text-gray-500">Icône + titre + description + tag</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{brandName || 'Non défini'}</p>
            <p className="text-xs text-gray-500">Logo depuis les paramètres org</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LandingPageConfigPage;
