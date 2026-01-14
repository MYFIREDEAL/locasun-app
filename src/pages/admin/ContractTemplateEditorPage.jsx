import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ZoomIn, ZoomOut, Square, Trash2, Move, ChevronDown, Download, ArrowLeft, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configuration du worker PDF.js depuis le dossier public
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// 🆕 NOUVEAU SYSTÈME : Types de blocs signataires
const SIGNATORY_BLOCK_TYPES = [
  { 
    value: 'individual', 
    label: '👤 Personne physique (signataire principal)',
    defaultFields: ['firstname', 'lastname', 'address', 'birthplace', 'nationality', 'signature']
  },
  { 
    value: 'company', 
    label: '🏢 Société (personne morale)',
    defaultFields: ['name', 'legal_form', 'capital', 'address', 'zip', 'city', 'rcs_number', 'rcs_city', 'representative_name', 'representative_role']
  },
  { 
    value: 'cosigner', 
    label: '👥 Co-signataire (répétable)',
    defaultFields: ['name', 'address', 'nationality', 'signature']
  }
];

// Champs disponibles par type
const SIGNATORY_FIELDS = {
  individual: [
    { value: 'firstname', label: 'Prénom' },
    { value: 'lastname', label: 'Nom' },
    { value: 'address', label: 'Adresse' },
    { value: 'birthplace', label: 'Lieu de naissance' },
    { value: 'nationality', label: 'Nationalité' },
    { value: 'signature', label: 'Signature' }
  ],
  company: [
    { value: 'name', label: 'Nom de la société' },
    { value: 'legal_form', label: 'Forme juridique' },
    { value: 'capital', label: 'Capital social' },
    { value: 'address', label: 'Adresse du siège' },
    { value: 'zip', label: 'Code postal' },
    { value: 'city', label: 'Ville' },
    { value: 'rcs_number', label: 'Numéro RCS' },
    { value: 'rcs_city', label: 'Ville RCS' },
    { value: 'representative_name', label: 'Nom du représentant' },
    { value: 'representative_role', label: 'Qualité du représentant' }
  ],
  cosigner: [
    { value: 'name', label: 'Nom / Prénom' },
    { value: 'address', label: 'Adresse' },
    { value: 'nationality', label: 'Nationalité' },
    { value: 'signature', label: 'Signature' }
  ]
};

// 🆕 Step 3 : Types de blocs (liste FERMÉE)
const BLOCK_TYPES = [
  { value: 'signatory_block', label: '📋 Bloc signataire complet' },
  { value: 'text_variable', label: '📝 Variable texte' },
  { value: 'signature', label: '✍️ Signature' },
  { value: 'paraphe', label: '🔖 Paraphe' },
  { value: 'reserve_block', label: '📦 Bloc réservé' }
];

// 🆕 Step 3 : Variables disponibles (liste FERMÉE)
const TEXT_VARIABLES = {
  'CLIENT': [
    { value: '{{client_firstname}}', label: 'Prénom client' },
    { value: '{{client_lastname}}', label: 'Nom client' },
    { value: '{{client_email}}', label: 'Email client' },
    { value: '{{client_phone}}', label: 'Téléphone client' },
    { value: '{{client_address}}', label: 'Adresse client' },
    { value: '{{client_zip}}', label: 'Code postal client' },
    { value: '{{client_city}}', label: 'Ville client' },
    { value: '{{client_birthdate}}', label: 'Né(e) le' },
    { value: '{{client_nationality}}', label: 'Nationalité' }
  ],
  'SOCIÉTÉ': [
    { value: '{{company_name}}', label: 'Nom société' },
    { value: '{{company_siret}}', label: 'SIRET' },
    { value: '{{company_address}}', label: 'Adresse société' },
    { value: '{{company_zip}}', label: 'Code postal société' },
    { value: '{{company_city}}', label: 'Ville société' },
    { value: '{{company_representative_name}}', label: 'Nom représentant' },
    { value: '{{company_representative_role}}', label: 'Rôle représentant' }
  ],
  'DATES / LIEU': [
    { value: '{{contract_date}}', label: 'Date du contrat' },
    { value: '{{signature_date}}', label: 'Date de signature' },
    { value: '{{contract_place}}', label: 'Lieu du contrat' }
  ],
  'RÉFÉRENCE / MONTANT': [
    { value: '{{contract_reference}}', label: 'Référence contrat' },
    { value: '{{contract_amount}}', label: 'Montant contrat' }
  ],
  'CO-SIGNATAIRES': [
    { value: '{{cosigner_label_X}}', label: 'Label co-signataire X (générique)' },
    { value: '{{cosigner_name_X}}', label: 'Nom co-signataire X (générique)' },
    { value: '{{cosigner_email_X}}', label: 'Email co-signataire X (générique)' },
    { value: '{{cosigner_phone_X}}', label: 'Téléphone co-signataire X (générique)' },
    { value: '{{cosigner_section_X}}', label: 'Section co-signataire X (générique)' },
    { value: '{{cosigner_signature_line_X}}', label: 'Ligne signature co-signataire X (générique)' },
    // Co-signataire 1
    { value: '{{cosigner_name_1}}', label: 'Nom co-signataire 1' },
    { value: '{{cosigner_email_1}}', label: 'Email co-signataire 1' },
    { value: '{{cosigner_phone_1}}', label: 'Téléphone co-signataire 1' },
    { value: '{{cosigner_address_1}}', label: 'Adresse co-signataire 1' },
    { value: '{{cosigner_zip_1}}', label: 'Code postal co-signataire 1' },
    { value: '{{cosigner_city_1}}', label: 'Ville co-signataire 1' },
    { value: '{{cosigner_birthdate_1}}', label: 'Né(e) le co-signataire 1' },
    { value: '{{cosigner_signature_line_1}}', label: 'Ligne signature co-signataire 1' },
    // Co-signataire 2
    { value: '{{cosigner_name_2}}', label: 'Nom co-signataire 2' },
    { value: '{{cosigner_email_2}}', label: 'Email co-signataire 2' },
    { value: '{{cosigner_phone_2}}', label: 'Téléphone co-signataire 2' },
    { value: '{{cosigner_address_2}}', label: 'Adresse co-signataire 2' },
    { value: '{{cosigner_zip_2}}', label: 'Code postal co-signataire 2' },
    { value: '{{cosigner_city_2}}', label: 'Ville co-signataire 2' },
    { value: '{{cosigner_birthdate_2}}', label: 'Né(e) le co-signataire 2' },
    { value: '{{cosigner_signature_line_2}}', label: 'Ligne signature co-signataire 2' },
    // Co-signataire 3
    { value: '{{cosigner_name_3}}', label: 'Nom co-signataire 3' },
    { value: '{{cosigner_email_3}}', label: 'Email co-signataire 3' },
    { value: '{{cosigner_phone_3}}', label: 'Téléphone co-signataire 3' },
    { value: '{{cosigner_address_3}}', label: 'Adresse co-signataire 3' },
    { value: '{{cosigner_zip_3}}', label: 'Code postal co-signataire 3' },
    { value: '{{cosigner_city_3}}', label: 'Ville co-signataire 3' },
    { value: '{{cosigner_birthdate_3}}', label: 'Né(e) le co-signataire 3' },
    { value: '{{cosigner_signature_line_3}}', label: 'Ligne signature co-signataire 3' }
  ],
  'CO-SIGNATAIRES SOCIÉTÉ': [
    { value: '{{company_cosigner_label_1}}', label: 'Label co-signataire société 1' },
    { value: '{{company_cosigner_name_1}}', label: 'Nom co-signataire société 1' },
    { value: '{{company_cosigner_email_1}}', label: 'Email co-signataire société 1' },
    { value: '{{company_cosigner_phone_1}}', label: 'Téléphone co-signataire société 1' },
    { value: '{{company_cosigner_signature_line_1}}', label: 'Ligne signature co-signataire société 1' },
    { value: '{{company_cosigner_label_2}}', label: 'Label co-signataire société 2' },
    { value: '{{company_cosigner_name_2}}', label: 'Nom co-signataire société 2' },
    { value: '{{company_cosigner_email_2}}', label: 'Email co-signataire société 2' },
    { value: '{{company_cosigner_phone_2}}', label: 'Téléphone co-signataire société 2' },
    { value: '{{company_cosigner_signature_line_2}}', label: 'Ligne signature co-signataire société 2' },
    { value: '{{company_cosigner_label_3}}', label: 'Label co-signataire société 3' },
    { value: '{{company_cosigner_name_3}}', label: 'Nom co-signataire société 3' },
    { value: '{{company_cosigner_email_3}}', label: 'Email co-signataire société 3' },
    { value: '{{company_cosigner_phone_3}}', label: 'Téléphone co-signataire société 3' },
    { value: '{{company_cosigner_signature_line_3}}', label: 'Ligne signature co-signataire société 3' }
  ]
};

// 🆕 Step 3 : Rôles pour signatures/paraphes (liste FERMÉE)
const SIGNATURE_ROLES = [
  { value: 'client', label: '👤 Client (signataire principal)' },
  { value: 'company', label: '🏢 Société (signataire principal)' },
  { value: 'cosigner_client_1', label: '✍️ Co-signataire client 1' },
  { value: 'cosigner_client_2', label: '✍️ Co-signataire client 2' },
  { value: 'cosigner_client_3', label: '✍️ Co-signataire client 3' },
  { value: 'cosigner_company_1', label: '🏢 Co-signataire société 1' },
  { value: 'cosigner_company_2', label: '🏢 Co-signataire société 2' },
  { value: 'cosigner_company_3', label: '🏢 Co-signataire société 3' }
];

// 🆕 Step 3 : Composant de configuration de bloc
const BlockConfigForm = ({ onSave, onCancel }) => {
  const [blockType, setBlockType] = useState('text_variable');
  const [selectedVariable, setSelectedVariable] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);
  const [isVariablePopoverOpen, setIsVariablePopoverOpen] = useState(false);
  const [isRolePopoverOpen, setIsRolePopoverOpen] = useState(false);
  
  // 🆕 États pour bloc signataire
  const [signatoryType, setSignatoryType] = useState('individual');
  const [signatoryFields, setSignatoryFields] = useState([]);
  const [cosignerNumber, setCosignerNumber] = useState(1);

  // Initialiser les champs par défaut quand le type de signataire change
  React.useEffect(() => {
    if (blockType === 'signatory_block') {
      const defaultFields = SIGNATORY_BLOCK_TYPES.find(t => t.value === signatoryType)?.defaultFields || [];
      setSignatoryFields(defaultFields);
    }
  }, [signatoryType, blockType]);

  const handleSubmit = () => {
    // Validation
    if (blockType === 'text_variable' && !selectedVariable) {
      toast({
        title: "❌ Erreur",
        description: "Veuillez sélectionner une variable",
        variant: "destructive"
      });
      return;
    }

    if ((blockType === 'signature' || blockType === 'paraphe') && !selectedRole) {
      toast({
        title: "❌ Erreur",
        description: "Veuillez sélectionner un rôle",
        variant: "destructive"
      });
      return;
    }
    
    if (blockType === 'signatory_block' && signatoryFields.length === 0) {
      toast({
        title: "❌ Erreur",
        description: "Veuillez sélectionner au moins un champ",
        variant: "destructive"
      });
      return;
    }

    onSave({
      type: blockType,
      variable: selectedVariable || null,
      role: selectedRole || null,
      // 🆕 Données pour bloc signataire
      signatoryType: signatoryType || null,
      signatoryFields: signatoryFields || null,
      cosignerNumber: cosignerNumber || null
    });
  };

  return (
    <div className="space-y-4 py-4">
      {/* Sélection du type */}
      <div>
        <Label htmlFor="block-type">Type de bloc</Label>
        <Popover open={isTypePopoverOpen} onOpenChange={setIsTypePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between mt-1">
              {BLOCK_TYPES.find(t => t.value === blockType)?.label || 'Sélectionner...'}
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <div className="max-h-[300px] overflow-y-auto">
              {BLOCK_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => {
                    setBlockType(type.value);
                    setIsTypePopoverOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  {type.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Si text_variable : sélection de variable */}
      {blockType === 'text_variable' && (
        <div>
          <Label htmlFor="variable">Variable (liste fermée)</Label>
          <Popover open={isVariablePopoverOpen} onOpenChange={setIsVariablePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between mt-1">
                {TEXT_VARIABLES && Object.values(TEXT_VARIABLES).flat().find(v => v.value === selectedVariable)?.label || 'Sélectionnez une variable...'}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto">
                {Object.entries(TEXT_VARIABLES).map(([category, variables]) => (
                  <React.Fragment key={category}>
                    <div className="px-3 py-2.5 text-xs font-bold text-white bg-purple-600 sticky top-0 border-b border-purple-700">
                      📁 {category}
                    </div>
                    {variables.map(variable => (
                      <button
                        key={variable.value}
                        onClick={() => {
                          setSelectedVariable(variable.value);
                          setIsVariablePopoverOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-purple-50 transition-colors text-sm border-b border-gray-100 last:border-0"
                      >
                        {variable.label}
                      </button>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Si signature ou paraphe : sélection de rôle */}
      {(blockType === 'signature' || blockType === 'paraphe') && (
        <div>
          <Label htmlFor="role">Rôle (liste fermée)</Label>
          <Popover open={isRolePopoverOpen} onOpenChange={setIsRolePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between mt-1">
                {SIGNATURE_ROLES.find(r => r.value === selectedRole)?.label || 'Sélectionnez un rôle...'}
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto">
                {SIGNATURE_ROLES.map(role => (
                  <button
                    key={role.value}
                    onClick={() => {
                      setSelectedRole(role.value);
                      setIsRolePopoverOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* 🆕 Si signatory_block : configuration complète */}
      {blockType === 'signatory_block' && (
        <div className="space-y-4">
          {/* Type de signataire */}
          <div>
            <Label>Type de signataire</Label>
            <div className="flex flex-col gap-2 mt-2">
              {SIGNATORY_BLOCK_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSignatoryType(type.value)}
                  className={`w-full px-4 py-3 text-left border-2 rounded-lg transition-all ${
                    signatoryType === type.value 
                      ? 'border-purple-600 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Numéro du co-signataire */}
          {signatoryType === 'cosigner' && (
            <div>
              <Label>Numéro du co-signataire</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => setCosignerNumber(num)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      cosignerNumber === num 
                        ? 'border-purple-600 bg-purple-600 text-white' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Champs inclus */}
          <div>
            <Label>Champs inclus (pré-cochés par défaut)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SIGNATORY_FIELDS[signatoryType]?.map(field => (
                <label
                  key={field.value}
                  className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-purple-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={signatoryFields.includes(field.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSignatoryFields([...signatoryFields, field.value]);
                      } else {
                        setSignatoryFields(signatoryFields.filter(f => f !== field.value));
                      }
                    }}
                    className="rounded text-purple-600"
                  />
                  <span className="text-sm">{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Aperçu du texte légal */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-900 mb-2">📄 Aperçu du texte légal</p>
            <p className="text-xs text-blue-800 leading-relaxed">
              {signatoryType === 'individual' && 
                "Monsieur {{client_firstname}} {{client_lastname}}, demeurant {{client_address}}, né(e) à {{client_birthplace}}, de nationalité {{client_nationality}}."
              }
              {signatoryType === 'company' && 
                "La société {{company_name}} ({{company_legal_form}}), au capital de {{company_capital}} euros, dont le siège social est situé {{company_address}} {{company_zip}} {{company_city}}, immatriculée sous le numéro {{company_rcs_number}} au Registre du Commerce et des Sociétés de {{company_rcs_city}}, représentée par {{company_representative_name}}, en qualité de {{company_representative_role}}, spécialement habilité(e) aux fins des présentes."
              }
              {signatoryType === 'cosigner' && 
                `Monsieur {{cosigner_name_${cosignerNumber}}}, demeurant {{cosigner_address_${cosignerNumber}}}, de nationalité {{cosigner_nationality_${cosignerNumber}}}.`
              }
            </p>
          </div>
        </div>
      )}

      {/* Si reserve_block : aucun champ supplémentaire */}
      {blockType === 'reserve_block' && (
        <div className="p-3 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            ℹ️ Un bloc réservé n'a pas de configuration supplémentaire
          </p>
        </div>
      )}

      {/* Boutons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
          Créer le bloc
        </Button>
      </div>
    </div>
  );
};

const ContractTemplateEditorPage = () => {
  const navigate = useNavigate();
  
  const [pdfUrl, setPdfUrl] = useState(null);
  const [overlayBlocks, setOverlayBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isBlockConfigOpen, setIsBlockConfigOpen] = useState(false);
  const [blockConfigData, setBlockConfigData] = useState(null);
  const [pdfNumPages, setPdfNumPages] = useState(1);
  const [pdfPages, setPdfPages] = useState([]); // Stocker les canvas de chaque page
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfTextPages, setPdfTextPages] = useState([]); // 🆕 Stocker le texte extrait de chaque page

  // Helper pour obtenir le label complet d'un bloc
  const getBlockLabel = (block) => {
    const typeLabel = BLOCK_TYPES.find(t => t.value === block.type)?.label || block.type;
    
    if (block.variable) {
      // Trouver le label de la variable
      const variableObj = Object.values(TEXT_VARIABLES)
        .flat()
        .find(v => v.value === block.variable);
      return variableObj ? variableObj.label : block.variable;
    }
    
    if (block.role) {
      // Trouver le label du rôle
      const roleObj = SIGNATURE_ROLES.find(r => r.value === block.role);
      return roleObj ? roleObj.label : block.role;
    }
    
    return typeLabel;
  };

  // Upload PDF
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setIsLoadingPdf(true);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);

      // Détecter le nombre de pages et rendre chaque page avec PDF.js
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfNumPages(pdf.numPages);
        
        // Rendre chaque page dans un canvas + extraire le texte
        const pages = [];
        const textPages = [];
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 }); // Scale pour bonne qualité
          
          // Rendu canvas (visuel)
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          pages.push({
            pageNum,
            canvas,
            width: viewport.width,
            height: viewport.height
          });
          
          // 🆕 Extraction du texte
          const textContent = await page.getTextContent();
          let pageText = '';
          
          // Reconstruire le texte avec espaces et retours ligne
          textContent.items.forEach((item, index) => {
            pageText += item.str;
            
            // Ajouter un espace si l'élément suivant n'est pas sur la même ligne
            if (index < textContent.items.length - 1) {
              const currentItem = item;
              const nextItem = textContent.items[index + 1];
              
              // Si changement de ligne (Y différent)
              if (currentItem.transform && nextItem.transform) {
                const currentY = currentItem.transform[5];
                const nextY = nextItem.transform[5];
                
                if (Math.abs(currentY - nextY) > 2) {
                  pageText += '\n';
                } else {
                  pageText += ' ';
                }
              } else {
                pageText += ' ';
              }
            }
          });
          
          textPages.push({
            pageNum,
            text: pageText.trim()
          });
        }
        
        setPdfPages(pages);
        setPdfTextPages(textPages);
        setIsLoadingPdf(false);
        
        console.log('=== TEXTE EXTRAIT DU PDF ===');
        textPages.forEach(tp => {
          console.log(`--- Page ${tp.pageNum} ---`);
          console.log(tp.text.substring(0, 500)); // Premier 500 caractères
        });
        console.log('============================');
        
        toast({
          title: "✅ PDF chargé",
          description: `${pdf.numPages} page(s) détectée(s), texte extrait`
        });
      } catch (error) {
        console.error('Erreur lors du chargement du PDF:', error);
        setIsLoadingPdf(false);
        setPdfNumPages(1);
        toast({
          title: "❌ Erreur",
          description: "Impossible de charger le PDF",
          variant: "destructive"
        });
      }
    }
  };

  // Ajouter un nouveau bloc
  const handleAddBlock = () => {
    setIsBlockConfigOpen(true);
    setBlockConfigData(null);
  };

  // Sauvegarder la config du bloc
  const handleSaveBlockConfig = (config) => {
    const newBlock = {
      id: Date.now().toString(),
      x: 100,
      y: 100,
      width: 200,
      height: 60,
      type: config.type,
      variable: config.variable,
      role: config.role,
      page: 1,
      // 🆕 Ajouter les propriétés signataires si c'est un signatory_block
      ...(config.type === 'signatory_block' && {
        signatoryType: config.signatoryType,
        signatoryFields: config.signatoryFields,
        cosignerNumber: config.cosignerNumber
      })
    };
    setOverlayBlocks([...overlayBlocks, newBlock]);
    setIsBlockConfigOpen(false);
    toast({
      title: "✅ Bloc créé",
      description: `Type: ${BLOCK_TYPES.find(t => t.value === config.type)?.label}`
    });
  };

  // Générer JSON
  const handleGenerateJson = () => {
    const json = overlayBlocks.map(block => ({
      type: block.type,
      ...(block.variable && { variable: block.variable }),
      ...(block.role && { role: block.role }),
      page: block.page,
      x: Math.round(block.x),
      y: Math.round(block.y),
      width: Math.round(block.width),
      height: Math.round(block.height)
    }));

    const jsonString = JSON.stringify(json, null, 2);
    
    // Copier dans le clipboard
    navigator.clipboard.writeText(jsonString);
    
    toast({
      title: "✅ JSON généré et copié",
      description: `${overlayBlocks.length} bloc(s) exporté(s)`,
      duration: 3000
    });

    console.log('JSON généré:', jsonString);
  };

  // 🆕 STEP 4 : Conversion JSON → HTML COMPLET (PDF en image de fond + overlays)
  // 🆕 GÉNÉRATION HTML FINALE : Texte PDF complet + blocs signataires
  const convertJsonToHtml = (blocks) => {
    let html = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<style>\n`;
    html += `body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #1f2937; }\n`;
    html += `.contract-root { max-width: 800px; margin: 0 auto; }\n`;
    html += `.pdf-page { margin-bottom: 40px; page-break-after: always; }\n`;
    html += `.pdf-text { white-space: pre-wrap; font-size: 14px; }\n`;
    html += `.signatory-section { margin: 30px 0; padding: 20px; background: #f9fafb; border-left: 4px solid #7c3aed; }\n`;
    html += `.signatory-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #7c3aed; }\n`;
    html += `.signatory-text { margin: 8px 0; }\n`;
    html += `.signature-line { border-bottom: 2px solid #000; margin-top: 30px; padding-bottom: 5px; min-height: 50px; }\n`;
    html += `.legal-text { text-align: justify; }\n`;
    html += `.variable-placeholder { color: #7c3aed; font-weight: bold; background: #f3e8ff; padding: 2px 6px; border-radius: 4px; }\n`;
    html += `@media print { .pdf-page { break-inside: avoid; } .signatory-section { break-inside: avoid; } }\n`;
    html += `</style>\n</head>\n<body>\n<div class="contract-root">\n`;

    // 📄 CONTENU DU PDF PAGE PAR PAGE
    if (pdfTextPages && pdfTextPages.length > 0) {
      pdfTextPages.forEach(page => {
        html += `\n<!-- Page ${page.pageNum} du PDF -->\n`;
        html += `<div class="pdf-page">\n`;
        html += `  <div class="pdf-text">${page.text}</div>\n`;
        html += `</div>\n`;
      });
    }

    // 📝 SECTION SIGNATAIRES (si des blocs signataires sont placés)
    const signatoryBlocks = blocks.filter(b => b.type === 'signatory_block');
    
    if (signatoryBlocks.length > 0) {
      html += `\n<!-- Section Signataires -->\n`;
      html += `<h2>ENTRE LES SOUSSIGNÉS :</h2>\n\n`;

      let hasIndividual = false;
      let hasCompany = false;
      let cosigners = [];

      signatoryBlocks.forEach(block => {
        if (block.signatoryType === 'individual') hasIndividual = true;
        if (block.signatoryType === 'company') hasCompany = true;
        if (block.signatoryType === 'cosigner') {
          cosigners.push(block.cosignerNumber);
        }
      });

      // 🔵 PERSONNE PHYSIQUE
      if (hasIndividual) {
        html += `<!-- Personne physique -->\n`;
        html += `<div class="signatory-section">\n`;
        html += `  <p class="signatory-text legal-text">\n`;
        html += `    Monsieur <span class="variable-placeholder">{{client_firstname}} {{client_lastname}}</span>, demeurant <span class="variable-placeholder">{{client_address}}</span>, né(e) à <span class="variable-placeholder">{{client_birthplace}}</span>, de nationalité <span class="variable-placeholder">{{client_nationality}}</span>.\n`;
        html += `  </p>\n`;
        html += `  <div class="signature-line">Signature : <span class="variable-placeholder">{{client_signature}}</span></div>\n`;
        html += `</div>\n\n`;
      }

      // 🟣 SOCIÉTÉ
      if (hasCompany) {
        html += `<!-- Société -->\n`;
        html += `<div class="signatory-section">\n`;
        html += `  <p class="signatory-text legal-text">\n`;
        html += `    La société <span class="variable-placeholder">{{company_name}}</span> (<span class="variable-placeholder">{{company_legal_form}}</span>),<br>\n`;
        html += `    au capital de <span class="variable-placeholder">{{company_capital}}</span> euros,<br>\n`;
        html += `    dont le siège social est situé <span class="variable-placeholder">{{company_address}} {{company_zip}} {{company_city}}</span>,<br>\n`;
        html += `    immatriculée sous le numéro <span class="variable-placeholder">{{company_rcs_number}}</span> au Registre du Commerce et des Sociétés de <span class="variable-placeholder">{{company_rcs_city}}</span>,<br>\n`;
        html += `    représentée par <span class="variable-placeholder">{{company_representative_name}}</span>, en qualité de <span class="variable-placeholder">{{company_representative_role}}</span>, spécialement habilité(e) aux fins des présentes.\n`;
        html += `  </p>\n`;
        html += `  <div class="signature-line">Signature : <span class="variable-placeholder">{{company_signature}}</span></div>\n`;
        html += `</div>\n\n`;
      }

      // 🟢 CO-SIGNATAIRES
      [...new Set(cosigners)].sort().forEach(num => {
        html += `<!-- Co-signataire ${num} -->\n`;
        html += `<div class="signatory-section">\n`;
        html += `  <p class="signatory-title">ET</p>\n`;
        html += `  <p class="signatory-text legal-text">\n`;
        html += `    Monsieur <span class="variable-placeholder">{{cosigner_name_${num}}}</span>, demeurant <span class="variable-placeholder">{{cosigner_address_${num}}}</span>, de nationalité <span class="variable-placeholder">{{cosigner_nationality_${num}}}</span>.\n`;
        html += `  </p>\n`;
        html += `  <div class="signature-line">Signature : <span class="variable-placeholder">{{cosigner_signature_line_${num}}}</span></div>\n`;
        html += `</div>\n\n`;
      });
    }

    // 📌 VARIABLES PLACÉES (blocs text_variable, signature, paraphe)
    const otherBlocks = blocks.filter(b => b.type !== 'signatory_block');
    if (otherBlocks.length > 0) {
      html += `\n<!-- Variables additionnelles placées -->\n`;
      html += `<div style="margin-top: 40px; border-top: 2px dashed #e5e7eb; padding-top: 20px;">\n`;
      html += `  <h3 style="color: #6b7280; font-size: 14px;">Variables placées sur le PDF :</h3>\n`;
      
      otherBlocks.forEach(block => {
        if (block.type === 'text_variable' && block.variable) {
          html += `  <p><span class="variable-placeholder">${block.variable}</span> <span style="color: #9ca3af; font-size: 12px;">(Page ${block.page})</span></p>\n`;
        }
        if (block.type === 'signature' && block.role) {
          const roleLabel = SIGNATURE_ROLES.find(r => r.value === block.role)?.label || block.role;
          html += `  <p><span class="variable-placeholder">Signature ${roleLabel}</span> <span style="color: #9ca3af; font-size: 12px;">(Page ${block.page})</span></p>\n`;
        }
      });
      
      html += `</div>\n`;
    }

    html += `</div>\n</body>\n</html>`;
    
    return html;
  };

  // 🆕 STEP 4 : Générer et prévisualiser le HTML
  const handleGenerateHtml = () => {
    if (pdfPages.length === 0) {
      toast({
        title: "❌ Erreur",
        description: "Aucun PDF chargé. Veuillez uploader un PDF d'abord.",
        variant: "destructive"
      });
      return;
    }
    
    console.log('=== DEBUG AVANT GÉNÉRATION HTML ===');
    console.log('overlayBlocks:', JSON.stringify(overlayBlocks, null, 2));
    console.log('Nombre de blocs:', overlayBlocks.length);
    console.log('Blocs signataires:', overlayBlocks.filter(b => b.type === 'signatory_block'));
    console.log('====================================');
    
    const html = convertJsonToHtml(overlayBlocks);
    
    console.log('=== HTML COMPLET GÉNÉRÉ ===');
    console.log('Pages PDF:', pdfPages.length);
    console.log('Blocs overlay:', overlayBlocks.length);
    console.log('Taille HTML:', (html.length / 1024).toFixed(2), 'KB');
    console.log('============================');
    
    // Copier dans le clipboard
    navigator.clipboard.writeText(html);
    
    // 🆕 STEP 5 : Stocker le HTML dans localStorage pour injection automatique
    localStorage.setItem('generatedContractHtml', html);
    localStorage.setItem('shouldInjectHtml', 'true');
    
    toast({
      title: "✅ HTML complet généré",
      description: `${pdfPages.length} page(s) PDF + ${overlayBlocks.length} bloc(s). Retour au formulaire...`,
      duration: 2000
    });
    
    // Rediriger vers le formulaire après 1 seconde
    setTimeout(() => {
      navigate('/admin/contract-templates');
    }, 1000);
  };

  // Supprimer bloc
  const handleDeleteBlock = (id) => {
    setOverlayBlocks(overlayBlocks.filter(b => b.id !== id));
    setSelectedBlockId(null);
  };

  // Drag & resize handlers
  const handleMouseDown = (e, blockId, action) => {
    e.stopPropagation();
    setSelectedBlockId(blockId);
    if (action === 'drag') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (action === 'resize') {
      setIsResizing(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;
    if (!selectedBlockId) return;

    const dx = (e.clientX - dragStart.x) / zoom;
    const dy = (e.clientY - dragStart.y) / zoom;

    setOverlayBlocks(blocks => blocks.map(block => {
      if (block.id !== selectedBlockId) return block;
      
      if (isDragging) {
        return {
          ...block,
          x: block.x + dx,
          y: block.y + dy
        };
      } else if (isResizing) {
        return {
          ...block,
          width: Math.max(50, block.width + dx),
          height: Math.max(30, block.height + dy)
        };
      }
      return block;
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/contract-templates')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-xl font-semibold">Éditeur de modèle de contrat</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-2" />
          
          <Button variant="outline" size="sm" onClick={handleAddBlock} disabled={!pdfUrl}>
            <Square className="h-4 w-4 mr-2" />
            Ajouter un bloc
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleGenerateJson}
            disabled={overlayBlocks.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Générer JSON ({overlayBlocks.length})
          </Button>

          <Button 
            variant="default" 
            size="sm" 
            onClick={handleGenerateHtml}
            disabled={overlayBlocks.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Générer HTML ({overlayBlocks.length})
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {!pdfUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Chargez un PDF pour commencer</p>
              <label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <Button variant="default" className="bg-purple-600 hover:bg-purple-700" asChild>
                  <span>Choisir un fichier PDF</span>
                </Button>
              </label>
            </div>
          </div>
        ) : (
          <div 
            className="relative mx-auto"
            style={{ 
              width: `${794 * zoom}px`
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {isLoadingPdf ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement et rendu du PDF...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Render PDF pages as images */}
                <div className="relative">
                  {pdfPages.map((page, idx) => (
                    <div 
                      key={page.pageNum}
                      className="mb-4 relative"
                      style={{
                        width: `${page.width * zoom}px`,
                        height: `${page.height * zoom}px`
                      }}
                    >
                      <img
                        src={page.canvas.toDataURL()}
                        alt={`Page ${page.pageNum}`}
                        className="border border-gray-300 rounded-lg shadow-lg"
                        style={{
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none'
                        }}
                      />
                    </div>
                  ))}
                </div>
            
                {/* Overlay blocs */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {overlayBlocks.map(block => {
                    // Calculer la position Y en fonction de la page
                    let offsetY = 0;
                    for (let i = 0; i < block.page - 1 && i < pdfPages.length; i++) {
                      offsetY += pdfPages[i].height * zoom + 16; // 16px = mb-4
                    }
                    
                    return (
                      <div
                        key={block.id}
                        className={`absolute border-2 pointer-events-auto ${selectedBlockId === block.id ? 'border-purple-600 bg-purple-100/30' : 'border-blue-500 bg-blue-100/20'} cursor-move`}
                        style={{
                          left: block.x * zoom,
                          top: (block.y + offsetY),
                          width: block.width * zoom,
                          height: block.height * zoom
                        }}
                        onMouseDown={(e) => handleMouseDown(e, block.id, 'drag')}
                      >
                        <div className="absolute top-0 left-0 bg-purple-600 text-white text-xs px-2 py-1 rounded-br max-w-[200px] truncate">
                          {getBlockLabel(block)}
                        </div>
                        
                        <button
                          className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl hover:bg-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBlock(block.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        
                        <div
                          className="absolute bottom-0 right-0 w-4 h-4 bg-purple-600 cursor-nwse-resize rounded-tl"
                          onMouseDown={(e) => handleMouseDown(e, block.id, 'resize')}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sidebar config bloc */}
      {isBlockConfigOpen && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-xl z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Configuration du bloc</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsBlockConfigOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <BlockConfigForm
              onSave={handleSaveBlockConfig}
              onCancel={() => setIsBlockConfigOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractTemplateEditorPage;
