import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ZoomIn, ZoomOut, Square, Trash2, Move, ChevronDown, Download, ArrowLeft, FileText } from 'lucide-react';

// 🆕 Step 3 : Types de blocs (liste FERMÉE)
const BLOCK_TYPES = [
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
    { value: '{{cosigner_label_X}}', label: 'Label co-signataire X' },
    { value: '{{cosigner_name_X}}', label: 'Nom co-signataire X' },
    { value: '{{cosigner_email_X}}', label: 'Email co-signataire X' },
    { value: '{{cosigner_phone_X}}', label: 'Téléphone co-signataire X' },
    { value: '{{cosigner_section_X}}', label: 'Section co-signataire X' },
    { value: '{{cosigner_signature_line_X}}', label: 'Ligne signature co-signataire X' }
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

    onSave({
      type: blockType,
      variable: selectedVariable || null,
      role: selectedRole || null
    });
  };

  return (
    <div className="space-y-4 py-4">
      {/* Sélection du type */}
      <div>
        <Label htmlFor="block-type">Type de bloc</Label>
        <Popover>
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
                  onClick={() => setBlockType(type.value)}
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
          <Popover>
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
                        onClick={() => setSelectedVariable(variable.value)}
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
          <Popover>
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
                    onClick={() => setSelectedRole(role.value)}
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
  const handlePdfUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      toast({
        title: "✅ PDF chargé",
        description: "Vous pouvez maintenant ajouter des blocs"
      });
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
      page: 1
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

  // 🆕 STEP 4 : Conversion JSON → HTML
  const convertJsonToHtml = (blocks) => {
    let html = '';

    blocks.forEach(block => {
      switch (block.type) {
        case 'text_variable':
          // Insérer la variable telle quelle
          if (block.variable) {
            html += `<span class="contract-variable">${block.variable}</span>\n`;
          }
          break;

        case 'signature':
          // Générer une ligne de signature HTML
          if (block.role) {
            const roleLabel = SIGNATURE_ROLES.find(r => r.value === block.role)?.label || block.role;
            html += `<div class="signature-block" data-role="${block.role}">\n`;
            html += `  <p class="signature-label">${roleLabel}</p>\n`;
            html += `  <div class="signature-line">\n`;
            html += `    <span class="signature-placeholder">Signature :</span>\n`;
            html += `    <div class="signature-area"></div>\n`;
            html += `  </div>\n`;
            html += `</div>\n`;
          }
          break;

        case 'paraphe':
          // Générer une zone HTML dédiée pour paraphe
          if (block.role) {
            const roleLabel = SIGNATURE_ROLES.find(r => r.value === block.role)?.label || block.role;
            html += `<div class="paraphe-block" data-role="${block.role}">\n`;
            html += `  <span class="paraphe-label">${roleLabel} - Paraphe :</span>\n`;
            html += `  <div class="paraphe-area"></div>\n`;
            html += `</div>\n`;
          }
          break;

        case 'reserve_block':
          // Wrapper HTML vide (zone réservée)
          html += `<div class="reserve-block">\n`;
          html += `  <!-- Zone réservée -->\n`;
          html += `</div>\n`;
          break;

        default:
          break;
      }
    });

    return html;
  };

  // 🆕 STEP 4 : Générer et prévisualiser le HTML
  const handleGenerateHtml = () => {
    const html = convertJsonToHtml(overlayBlocks);
    
    console.log('=== HTML GÉNÉRÉ (STEP 4) ===');
    console.log(html);
    console.log('============================');
    
    // Copier dans le clipboard
    navigator.clipboard.writeText(html);
    
    toast({
      title: "✅ HTML généré et copié",
      description: `${overlayBlocks.length} bloc(s) convertis. Voir console pour détails.`,
      duration: 3000
    });
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
      <div className="flex-1 overflow-auto p-6">
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
            className="relative inline-block"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* PDF */}
            <iframe 
              src={pdfUrl}
              className="border border-gray-300 rounded-lg shadow-lg"
              style={{ width: '794px', height: '1123px', pointerEvents: 'none' }}
            />
            
            {/* Overlay blocs */}
            {overlayBlocks.map(block => (
              <div
                key={block.id}
                className={`absolute border-2 ${selectedBlockId === block.id ? 'border-purple-600 bg-purple-100/30' : 'border-blue-500 bg-blue-100/20'} cursor-move`}
                style={{
                  left: block.x,
                  top: block.y,
                  width: block.width,
                  height: block.height
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
            ))}
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
