import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Upload, FileText, Eye, Loader2 } from 'lucide-react';
import mammoth from 'mammoth';

const ContractTemplateEditorPage = () => {
  const navigate = useNavigate();
  
  const [docxFile, setDocxFile] = useState(null);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Upload et conversion .docx → HTML
  const handleDocxUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      toast({
        title: "❌ Format invalide",
        description: "Veuillez uploader un fichier .docx",
        variant: "destructive"
      });
      return;
    }

    setDocxFile(file);
    setIsConverting(true);

    try {
      // Lire le fichier comme ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Conversion .docx → HTML avec mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      const html = result.value; // HTML converti
      const messages = result.messages; // Warnings/erreurs
      
      setGeneratedHtml(html);
      
      // Logs pour debug
      console.log('=== CONVERSION .DOCX → HTML ===');
      console.log('Fichier:', file.name);
      console.log('Taille HTML:', (html.length / 1024).toFixed(2), 'KB');
      if (messages.length > 0) {
        console.log('Messages mammoth:', messages);
      }
      console.log('===============================');
      
      toast({
        title: "✅ Conversion réussie",
        description: `${file.name} converti en HTML (${(html.length / 1024).toFixed(2)} KB)`,
        duration: 3000
      });
      
      setShowPreview(true);
      
    } catch (error) {
      console.error('Erreur conversion .docx:', error);
      toast({
        title: "❌ Erreur de conversion",
        description: error.message || "Impossible de convertir le fichier .docx",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  // Sauvegarder et injecter dans le formulaire
  const handleSaveHtml = () => {
    if (!generatedHtml) {
      toast({
        title: "❌ Aucun HTML généré",
        description: "Veuillez d'abord uploader un fichier .docx",
        variant: "destructive"
      });
      return;
    }

    // Stocker dans localStorage pour injection
    localStorage.setItem('generatedContractHtml', generatedHtml);
    localStorage.setItem('shouldInjectHtml', 'true');
    
    // Copier dans clipboard
    navigator.clipboard.writeText(generatedHtml);
    
    toast({
      title: "✅ HTML sauvegardé",
      description: "Redirection vers le formulaire...",
      duration: 2000
    });
    
    // Rediriger après 1 seconde
    setTimeout(() => {
      navigate('/admin/contract-templates');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/contract-templates')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Créer un modèle de contrat depuis Word
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Uploadez un fichier .docx avec vos variables {'{'}{'{'} client_firstname {'}'}{'}'},  {'{'}{'{'} company_name {'}'}{'}'} ...
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveHtml}
            disabled={!generatedHtml}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <FileText className="h-4 w-4" />
            Sauvegarder et utiliser
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Zone upload */}
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Uploadez votre contrat Word
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Fichier .docx uniquement. Les variables au format {'{'}{'{'} variable {'}'}{'}'} seront préservées.
              </p>
              
              <div className="mt-6">
                <label htmlFor="docx-upload" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    <Upload className="h-4 w-4" />
                    Choisir un fichier .docx
                  </div>
                  <input
                    id="docx-upload"
                    type="file"
                    accept=".docx"
                    className="hidden"
                    onChange={handleDocxUpload}
                  />
                </label>
              </div>

              {isConverting && (
                <div className="mt-4 flex items-center justify-center gap-2 text-purple-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium">Conversion en cours...</span>
                </div>
              )}

              {docxFile && !isConverting && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ <strong>{docxFile.name}</strong> converti
                  </p>
                </div>
              )}
            </div>

            {/* Aide variables */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Variables disponibles</h4>
              <div className="text-xs text-blue-800 space-y-1">
                <p><code>{'{'}{'{'} client_firstname {'}'}{'}'} {'{'}{'{'} client_lastname {'}'}{'}'}  </code> - Nom du client</p>
                <p><code>{'{'}{'{'} client_address {'}'}{'}'} {'{'}{'{'} client_zip {'}'}{'}'} {'{'}{'{'} client_city {'}'}{'}'}  </code> - Adresse</p>
                <p><code>{'{'}{'{'} company_name {'}'}{'}'} {'{'}{'{'} company_rcs_number {'}'}{'}'}  </code> - Société</p>
                <p><code>{'{'}{'{'} cosigner_name_1 {'}'}{'}'} {'{'}{'{'} cosigner_name_2 {'}'}{'}'}  </code> - Co-signataires</p>
              </div>
            </div>
          </div>

          {/* Prévisualisation HTML */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Aperçu HTML généré</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                disabled={!generatedHtml}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                {showPreview ? 'Masquer' : 'Afficher'}
              </Button>
            </div>
            
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {!generatedHtml && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>Uploadez un fichier .docx pour voir l'aperçu</p>
                </div>
              )}
              
              {generatedHtml && showPreview && (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: generatedHtml }}
                />
              )}

              {generatedHtml && !showPreview && (
                <div className="text-center py-12 text-gray-500">
                  <p>Cliquez sur "Afficher" pour voir l'aperçu</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContractTemplateEditorPage;
