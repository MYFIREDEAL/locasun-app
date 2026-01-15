import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, FileText, Eye, Plus, ChevronDown } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// 📋 VARIABLES GROUPÉES PAR CATÉGORIE
const TEXT_VARIABLES = {
  CLIENT: [
    { value: '{{client_firstname}}', label: 'Prénom client' },
    { value: '{{client_lastname}}', label: 'Nom client' },
    { value: '{{client_email}}', label: 'Email client' },
    { value: '{{client_phone}}', label: 'Téléphone client' },
    { value: '{{client_address}}', label: 'Adresse client' },
    { value: '{{client_zip}}', label: 'Code postal client' },
    { value: '{{client_city}}', label: 'Ville client' },
    { value: '{{client_birthdate}}', label: 'Date de naissance' },
    { value: '{{client_birthplace}}', label: 'Lieu de naissance' },
    { value: '{{client_nationality}}', label: 'Nationalité' },
    { value: '{{client_signature}}', label: 'Signature client' }
  ],
  SOCIÉTÉ: [
    { value: '{{company_name}}', label: 'Nom société' },
    { value: '{{company_legal_form}}', label: 'Forme juridique' },
    { value: '{{company_capital}}', label: 'Capital social' },
    { value: '{{company_address}}', label: 'Adresse siège social' },
    { value: '{{company_zip}}', label: 'Code postal société' },
    { value: '{{company_city}}', label: 'Ville société' },
    { value: '{{company_rcs_number}}', label: 'Numéro RCS' },
    { value: '{{company_rcs_city}}', label: 'Ville RCS' },
    { value: '{{company_representative_name}}', label: 'Nom représentant' },
    { value: '{{company_representative_role}}', label: 'Fonction représentant' },
    { value: '{{company_signature}}', label: 'Signature société' }
  ],
  'CO-SIGNATAIRE 1': [
    { value: '{{cosigner_name_1}}', label: 'Nom co-signataire 1' },
    { value: '{{cosigner_email_1}}', label: 'Email co-signataire 1' },
    { value: '{{cosigner_phone_1}}', label: 'Téléphone co-signataire 1' },
    { value: '{{cosigner_address_1}}', label: 'Adresse co-signataire 1' },
    { value: '{{cosigner_zip_1}}', label: 'Code postal co-signataire 1' },
    { value: '{{cosigner_city_1}}', label: 'Ville co-signataire 1' },
    { value: '{{cosigner_birthdate_1}}', label: 'Date naissance co-signataire 1' },
    { value: '{{cosigner_nationality_1}}', label: 'Nationalité co-signataire 1' },
    { value: '{{cosigner_signature_line_1}}', label: 'Signature co-signataire 1' }
  ],
  'CO-SIGNATAIRE 2': [
    { value: '{{cosigner_name_2}}', label: 'Nom co-signataire 2' },
    { value: '{{cosigner_email_2}}', label: 'Email co-signataire 2' },
    { value: '{{cosigner_phone_2}}', label: 'Téléphone co-signataire 2' },
    { value: '{{cosigner_address_2}}', label: 'Adresse co-signataire 2' },
    { value: '{{cosigner_zip_2}}', label: 'Code postal co-signataire 2' },
    { value: '{{cosigner_city_2}}', label: 'Ville co-signataire 2' },
    { value: '{{cosigner_birthdate_2}}', label: 'Date naissance co-signataire 2' },
    { value: '{{cosigner_nationality_2}}', label: 'Nationalité co-signataire 2' },
    { value: '{{cosigner_signature_line_2}}', label: 'Signature co-signataire 2' }
  ],
  'CO-SIGNATAIRE 3': [
    { value: '{{cosigner_name_3}}', label: 'Nom co-signataire 3' },
    { value: '{{cosigner_email_3}}', label: 'Email co-signataire 3' },
    { value: '{{cosigner_phone_3}}', label: 'Téléphone co-signataire 3' },
    { value: '{{cosigner_address_3}}', label: 'Adresse co-signataire 3' },
    { value: '{{cosigner_zip_3}}', label: 'Code postal co-signataire 3' },
    { value: '{{cosigner_city_3}}', label: 'Ville co-signataire 3' },
    { value: '{{cosigner_birthdate_3}}', label: 'Date naissance co-signataire 3' },
    { value: '{{cosigner_nationality_3}}', label: 'Nationalité co-signataire 3' },
    { value: '{{cosigner_signature_line_3}}', label: 'Signature co-signataire 3' }
  ],
  PROJET: [
    { value: '{{project_address}}', label: 'Adresse projet' },
    { value: '{{project_zip}}', label: 'Code postal projet' },
    { value: '{{project_city}}', label: 'Ville projet' },
    { value: '{{project_type}}', label: 'Type projet' },
    { value: '{{project_power}}', label: 'Puissance (kWc)' },
    { value: '{{project_amount}}', label: 'Montant projet' }
  ],
  DATES: [
    { value: '{{current_date}}', label: 'Date du jour' },
    { value: '{{contract_start_date}}', label: 'Date début contrat' },
    { value: '{{contract_end_date}}', label: 'Date fin contrat' },
    { value: '{{signature_date}}', label: 'Date de signature' }
  ]
};

const ContractTemplateEditorPage = () => {
  const navigate = useNavigate();
  const quillRef = useRef(null);
  
  const [editorContent, setEditorContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isVariablePopoverOpen, setIsVariablePopoverOpen] = useState(false);

  // Insérer une variable à la position du curseur
  const insertVariable = (variable) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const selection = editor.getSelection();
      const position = selection ? selection.index : editor.getLength();
      
      // Insérer la variable avec style violet
      editor.insertText(position, ` ${variable} `, 'user');
      editor.formatText(position, variable.length + 2, {
        'color': '#7c3aed',
        'bold': true,
        'background': '#f3e8ff'
      });
      
      // Positionner le curseur après la variable
      editor.setSelection(position + variable.length + 2);
      
      toast({
        title: "✅ Variable insérée",
        description: variable,
        duration: 1500
      });
    }
    
    setIsVariablePopoverOpen(false);
  };

  // Sauvegarder et injecter dans le formulaire
  const handleSave = () => {
    if (!editorContent || editorContent.trim() === '<p><br></p>') {
      toast({
        title: "❌ Contrat vide",
        description: "Veuillez écrire du contenu avant de sauvegarder",
        variant: "destructive"
      });
      return;
    }

    // Stocker dans localStorage pour injection
    localStorage.setItem('generatedContractHtml', editorContent);
    localStorage.setItem('shouldInjectHtml', 'true');
    
    // Copier dans clipboard
    navigator.clipboard.writeText(editorContent);
    
    toast({
      title: "✅ Contrat sauvegardé",
      description: "Redirection vers le formulaire...",
      duration: 2000
    });
    
    // Rediriger après 1 seconde
    setTimeout(() => {
      navigate('/admin/contract-templates');
    }, 1000);
  };

  // Configuration Quill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ]
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align',
    'color', 'background'
  ];

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
                Créer un modèle de contrat
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Écrivez votre contrat et insérez des variables avec le bouton violet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Masquer aperçu' : 'Voir aperçu'}
            </Button>
            <Button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <FileText className="h-4 w-4" />
              Sauvegarder le contrat
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Éditeur principal */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-900">✏️ Éditeur de contrat</h3>
              
              {/* Bouton insérer variable */}
              <Popover open={isVariablePopoverOpen} onOpenChange={setIsVariablePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                    <Plus className="h-4 w-4" />
                    Insérer une variable
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="max-h-[500px] overflow-y-auto">
                    {Object.entries(TEXT_VARIABLES).map(([category, variables]) => (
                      <div key={category} className="border-b border-gray-100 last:border-0">
                        <div className="px-4 py-2 bg-gray-50 font-semibold text-sm text-gray-700 sticky top-0">
                          {category}
                        </div>
                        <div className="py-1">
                          {variables.map((variable) => (
                            <button
                              key={variable.value}
                              onClick={() => insertVariable(variable.value)}
                              className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm transition-colors flex items-center justify-between group"
                            >
                              <span className="text-gray-700">{variable.label}</span>
                              <code className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {variable.value}
                              </code>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Éditeur Quill */}
            <div className="p-4">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={editorContent}
                onChange={setEditorContent}
                modules={modules}
                formats={formats}
                placeholder="Commencez à écrire votre contrat ici... Utilisez le bouton violet pour insérer des variables."
                className="h-[600px]"
              />
            </div>
          </div>

          {/* Panneau latéral - Aide & Preview */}
          <div className="space-y-6">
            
            {/* Aide rapide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                💡 Comment ça marche ?
              </h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Écrivez votre contrat dans l'éditeur</li>
                <li>Cliquez sur "Insérer une variable" (bouton violet)</li>
                <li>Choisissez la catégorie puis la variable</li>
                <li>La variable s'insère automatiquement en violet</li>
                <li>Continuez votre texte normalement</li>
                <li>Cliquez "Sauvegarder le contrat" quand c'est fini</li>
              </ol>
            </div>

            {/* Exemple */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ Exemple</h4>
              <div className="text-xs text-green-800 space-y-1">
                <p>Monsieur <span className="font-bold text-purple-700">{'{{client_firstname}}'}</span> <span className="font-bold text-purple-700">{'{{client_lastname}}'}</span>,</p>
                <p>demeurant <span className="font-bold text-purple-700">{'{{client_address}}'}</span></p>
                <p>né(e) à <span className="font-bold text-purple-700">{'{{client_birthplace}}'}</span></p>
              </div>
            </div>

            {/* Preview si activé */}
            {showPreview && editorContent && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
                  <h4 className="font-semibold text-gray-900 text-sm">👁️ Aperçu</h4>
                </div>
                <div 
                  className="p-4 prose prose-sm max-w-none max-h-[300px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: editorContent }}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ContractTemplateEditorPage;
