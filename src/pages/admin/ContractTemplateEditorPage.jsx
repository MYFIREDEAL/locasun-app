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
    { value: '{{company_siret}}', label: 'SIRET' },
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
    { value: '{{contract_date}}', label: 'Date du contrat' },
    { value: '{{contract_start_date}}', label: 'Date début contrat' },
    { value: '{{contract_end_date}}', label: 'Date fin contrat' },
    { value: '{{signature_date}}', label: 'Date de signature' },
    { value: '{{contract_place}}', label: 'Lieu du contrat' }
  ],
  'CONTRAT': [
    { value: '{{contract_reference}}', label: 'Référence contrat' },
    { value: '{{contract_amount}}', label: 'Montant contrat' }
  ]
};

// 📦 BLOCS PRÉ-RÉDIGÉS (texte complet avec variables intégrées)
const PREDEFINED_BLOCKS = {
  'PERSONNE PHYSIQUE': [
    {
      label: '👤 Bloc Client Complet',
      content: `<p><strong>Monsieur/Madame {{client_firstname}} {{client_lastname}}</strong></p>
<p>Né(e) le {{client_birthdate}} à {{client_birthplace}}</p>
<p>De nationalité {{client_nationality}}</p>
<p>Demeurant {{client_address}}, {{client_zip}} {{client_city}}</p>
<p>Email: {{client_email}} - Téléphone: {{client_phone}}</p>
<p><br></p>
<p>Lu et approuvé,</p>
<p>Signature: {{client_signature}}</p>`
    },
    {
      label: '👤 Identité Simple Client',
      content: `<p>Monsieur/Madame <strong>{{client_firstname}} {{client_lastname}}</strong>, demeurant {{client_address}}, {{client_zip}} {{client_city}}</p>`
    }
  ],
  'SOCIÉTÉ': [
    {
      label: '🏢 Bloc Société Complet',
      content: `<p><strong>SOCIÉTÉ {{company_name}} ({{company_legal_form}})</strong></p>
<p>Au capital de {{company_capital}} euros</p>
<p>Société dont le siège social est situé {{company_address}}, {{client_zip}} {{company_city}}</p>
<p>Immatriculée sous le numéro {{company_rcs_number}} au Registre du Commerce et des Sociétés de {{company_rcs_city}}</p>
<p>SIRET: {{company_siret}}</p>
<p>Représentée par {{company_representative_name}}, en qualité de {{company_representative_role}}, spécialement habilité aux fins des présentes</p>
<p><br></p>
<p>Lu et approuvé,</p>
<p>Signature: {{company_signature}}</p>`
    },
    {
      label: '🏢 En-tête Société Simple',
      content: `<p><strong>{{company_name}}</strong> ({{company_legal_form}}), au capital de {{company_capital}} euros, SIRET: {{company_siret}}</p>`
    }
  ],
  'CO-SIGNATAIRES': [
    {
      label: '✍️ Co-signataire 1 Complet',
      content: `<p><strong>ET</strong></p>
<p>Monsieur/Madame <strong>{{cosigner_name_1}}</strong></p>
<p>Né(e) le {{cosigner_birthdate_1}}</p>
<p>De nationalité {{cosigner_nationality_1}}</p>
<p>Demeurant {{cosigner_address_1}}, {{cosigner_zip_1}} {{cosigner_city_1}}</p>
<p>Email: {{cosigner_email_1}} - Téléphone: {{cosigner_phone_1}}</p>
<p><br></p>
<p>Lu et approuvé,</p>
<p>{{cosigner_signature_line_1}}</p>`
    },
    {
      label: '✍️ Co-signataire 2 Complet',
      content: `<p><strong>ET</strong></p>
<p>Monsieur/Madame <strong>{{cosigner_name_2}}</strong></p>
<p>Né(e) le {{cosigner_birthdate_2}}</p>
<p>De nationalité {{cosigner_nationality_2}}</p>
<p>Demeurant {{cosigner_address_2}}, {{cosigner_zip_2}} {{cosigner_city_2}}</p>
<p>Email: {{cosigner_email_2}} - Téléphone: {{cosigner_phone_2}}</p>
<p><br></p>
<p>Lu et approuvé,</p>
<p>{{cosigner_signature_line_2}}</p>`
    },
    {
      label: '✍️ Co-signataire 3 Complet',
      content: `<p><strong>ET</strong></p>
<p>Monsieur/Madame <strong>{{cosigner_name_3}}</strong></p>
<p>Né(e) le {{cosigner_birthdate_3}}</p>
<p>De nationalité {{cosigner_nationality_3}}</p>
<p>Demeurant {{cosigner_address_3}}, {{cosigner_zip_3}} {{cosigner_city_3}}</p>
<p>Email: {{cosigner_email_3}} - Téléphone: {{cosigner_phone_3}}</p>
<p><br></p>
<p>Lu et approuvé,</p>
<p>{{cosigner_signature_line_3}}</p>`
    }
  ],
  'PROJET': [
    {
      label: '🔆 Bloc Projet Solaire',
      content: `<p><strong>OBJET DU CONTRAT</strong></p>
<p>Installation de type: {{project_type}}</p>
<p>Puissance: {{project_power}} kWc</p>
<p>Adresse d'installation: {{project_address}}, {{project_zip}} {{project_city}}</p>
<p>Montant total du projet: {{project_amount}} €</p>`
    }
  ],
  'CLAUSES LÉGALES': [
    {
      label: '📄 En-tête Contrat',
      content: `<p style="text-align: center;"><strong>CONTRAT N° {{contract_reference}}</strong></p>
<p style="text-align: center;">Fait à {{contract_place}}, le {{contract_date}}</p>
<p><br></p>
<p><strong>ENTRE LES SOUSSIGNÉS :</strong></p>`
    },
    {
      label: '📄 Signatures Finales',
      content: `<p><br></p>
<p><strong>SIGNATURES</strong></p>
<p>Fait en 2 exemplaires originaux, à {{contract_place}}, le {{signature_date}}</p>
<p><br></p>
<table style="width: 100%;">
  <tr>
    <td style="width: 50%; vertical-align: top;">
      <p><strong>Le Client</strong></p>
      <p>{{client_firstname}} {{client_lastname}}</p>
      <p>Lu et approuvé</p>
      <p><br></p>
      <p>{{client_signature}}</p>
    </td>
    <td style="width: 50%; vertical-align: top;">
      <p><strong>La Société</strong></p>
      <p>{{company_name}}</p>
      <p>{{company_representative_name}}</p>
      <p><br></p>
      <p>{{company_signature}}</p>
    </td>
  </tr>
</table>`
    },
    {
      label: '⚖️ Clause Confidentialité',
      content: `<p><strong>ARTICLE X - CONFIDENTIALITÉ</strong></p>
<p>Les parties s'engagent à conserver confidentielles toutes les informations échangées dans le cadre du présent contrat. Cette obligation de confidentialité perdurera pendant toute la durée du contrat et pendant une période de 5 ans suivant sa résiliation.</p>`
    },
    {
      label: '💰 Modalités de Paiement',
      content: `<p><strong>ARTICLE X - MODALITÉS DE PAIEMENT</strong></p>
<p>Le montant total du présent contrat s'élève à {{contract_amount}} € TTC.</p>
<p>Ce montant sera réglé selon les modalités suivantes :</p>
<ul>
  <li>Acompte de 30% à la signature</li>
  <li>40% au démarrage des travaux</li>
  <li>Solde de 30% à la réception des travaux</li>
</ul>`
    },
    {
      label: '🚫 Clause de Résiliation',
      content: `<p><strong>ARTICLE X - RÉSILIATION</strong></p>
<p>En cas de manquement grave de l'une des parties à ses obligations contractuelles, l'autre partie pourra, après mise en demeure restée infructueuse pendant 30 jours, résilier le présent contrat de plein droit.</p>
<p>La résiliation prendra effet à la date de réception de la lettre recommandée avec accusé de réception notifiant la résiliation.</p>`
    }
  ]
};

const ContractTemplateEditorPage = () => {
  const navigate = useNavigate();
  const quillRef = useRef(null);
  
  const [editorContent, setEditorContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isVariablePopoverOpen, setIsVariablePopoverOpen] = useState(false);
  const [isBlockPopoverOpen, setIsBlockPopoverOpen] = useState(false);

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

  // Insérer un bloc pré-rédigé à la position du curseur
  const insertBlock = (blockContent) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      const selection = editor.getSelection();
      const position = selection ? selection.index : editor.getLength();
      
      // Insérer le bloc HTML
      editor.clipboard.dangerouslyPasteHTML(position, blockContent);
      
      // Positionner le curseur après le bloc
      editor.setSelection(position + blockContent.length);
      
      toast({
        title: "✅ Bloc inséré",
        description: "Le bloc de texte pré-rédigé a été ajouté",
        duration: 2000
      });
    }
    
    setIsBlockPopoverOpen(false);
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
              
              <div className="flex items-center gap-2">
                {/* Bouton insérer un bloc */}
                <Popover open={isBlockPopoverOpen} onOpenChange={setIsBlockPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="border-blue-300 hover:bg-blue-50 gap-2">
                      <FileText className="h-4 w-4" />
                      Insérer un bloc
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="end">
                    <div className="max-h-[500px] overflow-y-auto">
                      {Object.entries(PREDEFINED_BLOCKS).map(([category, blocks]) => (
                        <div key={category} className="border-b border-gray-100 last:border-0">
                          <div className="px-4 py-2 bg-blue-50 font-semibold text-sm text-blue-900 sticky top-0">
                            {category}
                          </div>
                          <div className="py-1">
                            {blocks.map((block, idx) => (
                              <button
                                key={idx}
                                onClick={() => insertBlock(block.content)}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm transition-colors"
                              >
                                <span className="text-gray-700">{block.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

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
                <li><strong>Méthode 1 - Blocs complets :</strong> Cliquez "Insérer un bloc" (bleu) pour ajouter des sections entières pré-rédigées</li>
                <li><strong>Méthode 2 - Variables :</strong> Cliquez "Insérer une variable" (violet) pour ajouter des champs individuels</li>
                <li>Les variables s'insèrent automatiquement en violet</li>
                <li>Continuez à écrire normalement entre les blocs</li>
                <li>Cliquez "Sauvegarder le contrat" quand c'est terminé</li>
              </ol>
            </div>

            {/* Exemple */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ Exemple de blocs</h4>
              <div className="text-xs text-green-800 space-y-2">
                <p className="font-semibold">🏢 Bloc Société :</p>
                <p className="text-[10px] leading-tight">SOCIÉTÉ <span className="font-bold text-purple-700">{'{{company_name}}'}</span> (<span className="font-bold text-purple-700">{'{{company_legal_form}}'}</span>), au capital de <span className="font-bold text-purple-700">{'{{company_capital}}'}</span> euros, SIRET: <span className="font-bold text-purple-700">{'{{company_siret}}'}</span></p>
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
