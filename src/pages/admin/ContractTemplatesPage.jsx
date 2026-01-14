import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSupabaseContractTemplates } from '@/hooks/useSupabaseContractTemplates';
import { Plus, FileText, Edit, Upload, ZoomIn, ZoomOut, X, Square, Trash2, Move, ChevronDown } from 'lucide-react';

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
    { value: '{{client_city}}', label: 'Ville client' }
  ],
  'SOCIÉTÉ': [
    { value: '{{company_name}}', label: 'Nom société' },
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

// Options de projets (même liste que ProfilePage)
const projectOptions = [
  { value: 'ACC', label: 'ACC' },
  { value: 'Centrale', label: 'Centrale' },
  { value: 'Investissement', label: 'Investissement' },
  { value: 'Autonomie', label: 'Autonomie' },
  { value: 'Borne', label: 'Borne' },
  { value: 'Autre', label: 'Autre' },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

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
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                      {category}
                    </div>
                    {variables.map(variable => (
                      <button
                        key={variable.value}
                        onClick={() => setSelectedVariable(variable.value)}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm"
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

const ContractTemplatesPage = () => {
  const {
    templates: contractTemplates,
    loading: templatesLoading,
    createTemplate,
    updateTemplate,
    deactivateTemplate
  } = useSupabaseContractTemplates();

  const [editingContractTemplate, setEditingContractTemplate] = useState(null);
  const [isPreviewTemplateOpen, setIsPreviewTemplateOpen] = useState(false);
  
  // 🆕 États pour le choix du mode de création
  const [isModeSelectionOpen, setIsModeSelectionOpen] = useState(false);
  const [creationMode, setCreationMode] = useState(null); // null | 'pdf' | 'manual'
  
  // 🆕 États pour le PDF viewer (Step 1)
  const [uploadedPdfFile, setUploadedPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  
  // 🆕 États pour l'overlay et les blocs (Step 2)
  const [overlayBlocks, setOverlayBlocks] = useState([]); // { id, x, y, width, height, type, variable, role, page }
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // 🆕 Step 3 : États pour la configuration des blocs
  const [isBlockConfigOpen, setIsBlockConfigOpen] = useState(false);
  const [blockConfigData, setBlockConfigData] = useState(null);
  const [generatedJson, setGeneratedJson] = useState(null);

  // 🆕 Forcer le scroll body pour désactiver le scroll lock Radix Dialog
  useEffect(() => {
    document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // 🆕 Gestionnaire pour démarrer la création (affiche le choix du mode)
  const handleStartCreation = () => {
    setIsModeSelectionOpen(true);
  };

  // 🆕 Gestionnaire pour continuer après sélection du mode
  const handleModeSelected = (mode) => {
    setCreationMode(mode);
    setIsModeSelectionOpen(false);
    
    if (mode === 'manual') {
      // Mode manuel : afficher directement le formulaire avec contentHtml vide
      setEditingContractTemplate({
        name: '',
        projectType: 'ACC',
        contentHtml: ''
      });
    } else if (mode === 'pdf') {
      // Mode PDF : ouvrir l'interface d'upload/viewer PDF
      setIsPdfViewerOpen(true);
    }
  };

  // 🆕 Gestionnaire pour upload PDF
  const handlePdfUpload = (event) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedPdfFile(file);
      
      // Créer une URL pour afficher le PDF
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      
      toast({
        title: "✅ PDF chargé",
        description: `${file.name} est prêt à être visualisé`,
        className: "bg-green-500 text-white"
      });
    } else {
      toast({
        title: "❌ Erreur",
        description: "Veuillez sélectionner un fichier PDF valide",
        variant: "destructive"
      });
    }
  };

  // 🆕 Nettoyer l'URL du PDF lors de la fermeture
  const handleClosePdfViewer = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setIsPdfViewerOpen(false);
    setPdfUrl(null);
    setUploadedPdfFile(null);
    setCreationMode(null);
    // Reset des blocs overlay
    setOverlayBlocks([]);
    setSelectedBlockId(null);
  };

  // 🆕 Step 2 : Gestion des blocs overlay
  const handleAddBlock = () => {
    // 🆕 Step 3 : Ouvrir la modal de configuration au lieu de créer directement
    const tempBlock = {
      id: `block-${Date.now()}`,
      x: 50,
      y: 50,
      width: 200,
      height: 100,
      page: 1 // Par défaut page 1
    };
    setBlockConfigData(tempBlock);
    setIsBlockConfigOpen(true);
  };

  // 🆕 Step 3 : Sauvegarder le bloc configuré
  const handleSaveBlockConfig = (config) => {
    const newBlock = {
      ...blockConfigData,
      type: config.type,
      variable: config.variable || null,
      role: config.role || null
    };
    
    setOverlayBlocks([...overlayBlocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setIsBlockConfigOpen(false);
    setBlockConfigData(null);
    
    toast({
      title: "✅ Bloc ajouté",
      description: `Bloc ${BLOCK_TYPES.find(t => t.value === config.type)?.label} créé`,
      className: "bg-green-500 text-white"
    });
  };

  const handleDeleteBlock = (blockId) => {
    setOverlayBlocks(overlayBlocks.filter(block => block.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    
    toast({
      title: "🗑️ Bloc supprimé",
      className: "bg-gray-500 text-white"
    });
  };

  const handleBlockMouseDown = (blockId, e) => {
    e.stopPropagation();
    setSelectedBlockId(blockId);
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleResizeMouseDown = (blockId, e) => {
    e.stopPropagation();
    setSelectedBlockId(blockId);
    setIsResizing(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleMouseMove = (e) => {
    if (!selectedBlockId) return;

    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setOverlayBlocks(overlayBlocks.map(block => {
        if (block.id === selectedBlockId) {
          return {
            ...block,
            x: Math.max(0, block.x + deltaX),
            y: Math.max(0, block.y + deltaY)
          };
        }
        return block;
      }));

      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
    } else if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setOverlayBlocks(overlayBlocks.map(block => {
        if (block.id === selectedBlockId) {
          return {
            ...block,
            width: Math.max(50, block.width + deltaX),
            height: Math.max(30, block.height + deltaY)
          };
        }
        return block;
      }));

      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // 🆕 Step 3 : Génération du JSON structuré
  const handleGenerateJson = () => {
    const jsonData = overlayBlocks.map(block => {
      const obj = {
        type: block.type,
        page: block.page,
        x: block.x,
        y: block.y,
        width: block.width,
        height: block.height
      };

      // Ajouter variable si type = text_variable
      if (block.type === 'text_variable' && block.variable) {
        obj.variable = block.variable;
      }

      // Ajouter role si type = signature ou paraphe
      if ((block.type === 'signature' || block.type === 'paraphe') && block.role) {
        obj.role = block.role;
      }

      return obj;
    });

    setGeneratedJson(jsonData);
    
    toast({
      title: "✅ JSON généré",
      description: `${jsonData.length} bloc(s) structuré(s)`,
      className: "bg-green-500 text-white"
    });
  };

  const handleSaveContractTemplate = async (templateToSave) => {
    const isNew = !templateToSave.id;
    
    const result = isNew 
      ? await createTemplate({
          name: templateToSave.name,
          projectType: templateToSave.projectType || 'ACC',
          contentHtml: templateToSave.contentHtml || '',
        })
      : await updateTemplate(templateToSave.id, {
          name: templateToSave.name,
          projectType: templateToSave.projectType,
          contentHtml: templateToSave.contentHtml,
        });

    if (result.success) {
      toast({
        title: "✅ Template enregistré !",
        description: `Le template "${templateToSave.name}" a été sauvegardé.`,
        className: "bg-green-500 text-white"
      });
      setEditingContractTemplate(null);
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible d'enregistrer le template : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  const handleDeactivateContractTemplate = async (templateId) => {
    const result = await deactivateTemplate(templateId);

    if (result.success) {
      toast({
        title: "✅ Template désactivé !",
        description: "Le template a été désactivé.",
        className: "bg-green-500 text-white"
      });
    } else {
      toast({
        title: "❌ Erreur",
        description: `Impossible de désactiver le template : ${result.error}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 sm:p-6 lg:p-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📄 Templates de contrats</h1>
          <p className="text-gray-600">Gérez vos modèles de contrats HTML pour chaque type de projet</p>
        </motion.div>

        {/* Layout 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Colonne 1: Liste des templates (25%) */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex flex-col gap-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Mes templates</h2>
                <Button 
                  onClick={handleStartCreation}
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  <Plus className="mr-2 h-4 w-4" /> Nouveau template
                </Button>
              </div>
              
              <div className="space-y-2">
                {templatesLoading ? (
                  <div className="text-center py-8 text-gray-500">Chargement...</div>
                ) : contractTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Aucun template</p>
                  </div>
                ) : (
                  contractTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setEditingContractTemplate(template)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all hover:shadow-md ${
                        editingContractTemplate?.id === template.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{template.name}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-6">
                        <span className="text-xs text-gray-500">{template.projectType}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">v{template.version}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${
                          template.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {template.isActive ? '✅' : '⛔'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Colonne 2: Éditeur de template (75%) */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-card p-6">
              {editingContractTemplate ? (
                <div className="space-y-6">
                  {/* Header de l'éditeur */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">
                        {editingContractTemplate.id ? (
                          <>
                            <Edit className="inline h-5 w-5 mr-2 text-purple-600" />
                            Modifier le template
                          </>
                        ) : (
                          <>
                            <Plus className="inline h-5 w-5 mr-2 text-purple-600" />
                            Créer un nouveau template
                          </>
                        )}
                      </h2>
                      {editingContractTemplate.id && (
                        <p className="text-sm text-gray-500 mt-1">
                          Version actuelle: v{editingContractTemplate.version || 1}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {editingContractTemplate.id && editingContractTemplate.isActive && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              Désactiver
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Désactiver "{editingContractTemplate.name}" ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Le template sera marqué comme inactif mais restera dans la base.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => {
                                  handleDeactivateContractTemplate(editingContractTemplate.id);
                                  setEditingContractTemplate(null);
                                }} 
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Désactiver
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Formulaire d'édition */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="template-name">Nom du template</Label>
                      <Input 
                        id="template-name"
                        value={editingContractTemplate.name || ''}
                        onChange={(e) => setEditingContractTemplate(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                        placeholder="Ex: Contrat ACC Standard"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="template-project-type">Type de projet</Label>
                      <Select 
                        value={editingContractTemplate.projectType || 'ACC'}
                        onValueChange={(value) => setEditingContractTemplate(prev => ({
                          ...prev,
                          projectType: value
                        }))}
                        modal={false}
                      >
                        <SelectTrigger id="template-project-type" className="mt-1">
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {projectOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="template-content">Contenu HTML</Label>
                      <Textarea 
                        id="template-content"
                        value={editingContractTemplate.contentHtml || ''}
                        onChange={(e) => setEditingContractTemplate(prev => ({
                          ...prev,
                          contentHtml: e.target.value
                        }))}
                        placeholder="Entrez le contenu HTML du contrat..."
                        rows={20}
                        className="font-mono text-sm mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Utilisez du HTML valide. Les variables dynamiques seront remplacées lors de la génération du contrat.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => setEditingContractTemplate(null)}
                    >
                      Annuler
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="secondary"
                        onClick={() => setIsPreviewTemplateOpen(true)}
                        disabled={!editingContractTemplate.contentHtml}
                      >
                        👁️ Visualiser
                      </Button>
                      <Button 
                        onClick={() => handleSaveContractTemplate(editingContractTemplate)}
                        className="bg-purple-600 hover:bg-purple-700"
                        disabled={!editingContractTemplate.name || !editingContractTemplate.contentHtml}
                      >
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Sélectionnez un template
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Choisissez un template dans la liste ou créez-en un nouveau
                  </p>
                  <Button 
                    onClick={handleStartCreation}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Créer un template
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* 🆕 Modal Choix du mode de création */}
      <Dialog open={isModeSelectionOpen} onOpenChange={setIsModeSelectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choisissez votre méthode de création</DialogTitle>
            <DialogDescription>
              Comment souhaitez-vous créer votre template de contrat ?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-6">
            {/* Option 1 : Import PDF */}
            <button
              onClick={() => handleModeSelected('pdf')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-800 mb-1">
                    📄 Importer un PDF et générer le HTML
                  </h3>
                  <p className="text-sm text-gray-600">
                    Uploadez un PDF, placez les champs dynamiques avec l'éditeur visuel, puis générez automatiquement le HTML
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2 : HTML manuel */}
            <button
              onClick={() => handleModeSelected('manual')}
              className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Edit className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-800 mb-1">
                    ✍️ J'ai déjà mon HTML
                  </h3>
                  <p className="text-sm text-gray-600">
                    Collez ou écrivez directement votre HTML dans l'éditeur. Parfait si vous avez déjà préparé votre template
                  </p>
                </div>
              </div>
            </button>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsModeSelectionOpen(false)}
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🆕 Modal PDF Viewer (Step 1) */}
      <Dialog open={isPdfViewerOpen} onOpenChange={handleClosePdfViewer}>
        <DialogContent className="sm:max-w-6xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Visualisation du PDF
            </DialogTitle>
            <DialogDescription>
              {uploadedPdfFile ? `${uploadedPdfFile.name} (${(uploadedPdfFile.size / 1024).toFixed(2)} KB)` : 'Importez un fichier PDF pour le visualiser'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Zone d'upload */}
            {!pdfUrl && (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-400 transition-colors">
                <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Importez votre fichier PDF
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Cliquez pour sélectionner ou glissez-déposez votre PDF
                </p>
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <input
                    id="pdf-upload"
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                  <Button asChild className="bg-purple-600 hover:bg-purple-700">
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      Sélectionner un PDF
                    </span>
                  </Button>
                </label>
              </div>
            )}

            {/* Viewer PDF */}
            {pdfUrl && (
              <div className="space-y-3">
                {/* Barre d'actions */}
                <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {uploadedPdfFile?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 🆕 Bouton Ajouter un bloc */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAddBlock}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Ajouter un bloc
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (pdfUrl) {
                          URL.revokeObjectURL(pdfUrl);
                        }
                        setPdfUrl(null);
                        setUploadedPdfFile(null);
                        setOverlayBlocks([]);
                        setSelectedBlockId(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Changer de PDF
                    </Button>
                  </div>
                </div>

                {/* Container du PDF avec overlay */}
                <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                  <div 
                    className="h-[60vh] overflow-auto relative"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {/* PDF en arrière-plan */}
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full"
                      title="PDF Viewer"
                      style={{ minHeight: '600px' }}
                    />
                    
                    {/* 🆕 Overlay avec blocs */}
                    <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{ zIndex: 10 }}
                    >
                      <div className="relative w-full h-full pointer-events-auto">
                        {overlayBlocks.map(block => {
                          const blockTypeLabel = BLOCK_TYPES.find(t => t.value === block.type)?.label || '🔷';
                          return (
                          <div
                            key={block.id}
                            className={`absolute border-2 bg-blue-500 bg-opacity-20 cursor-move transition-all ${
                              selectedBlockId === block.id 
                                ? 'border-blue-600 shadow-lg' 
                                : 'border-blue-400'
                            }`}
                            style={{
                              left: `${block.x}px`,
                              top: `${block.y}px`,
                              width: `${block.width}px`,
                              height: `${block.height}px`
                            }}
                            onMouseDown={(e) => handleBlockMouseDown(block.id, e)}
                          >
                            {/* Label du type de bloc */}
                            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
                              {blockTypeLabel}
                            </div>
                            
                            {/* Icône de déplacement */}
                            <div className="absolute top-1 left-1 bg-blue-600 rounded p-1">
                              <Move className="h-3 w-3 text-white" />
                            </div>
                            
                            {/* Bouton supprimer */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBlock(block.id);
                              }}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 rounded p-1 transition-colors"
                            >
                              <Trash2 className="h-3 w-3 text-white" />
                            </button>
                            
                            {/* Handle de redimensionnement (coin bas-droit) */}
                            <div
                              className="absolute bottom-0 right-0 w-4 h-4 bg-blue-600 cursor-se-resize"
                              onMouseDown={(e) => handleResizeMouseDown(block.id, e)}
                              style={{ borderBottomRightRadius: '2px' }}
                            />
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 🆕 Info sur les blocs */}
                {overlayBlocks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <Square className="inline h-4 w-4 mr-1" />
                        {overlayBlocks.length} bloc{overlayBlocks.length > 1 ? 's' : ''} positionné{overlayBlocks.length > 1 ? 's' : ''}
                      </p>
                      <Button
                        size="sm"
                        onClick={handleGenerateJson}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        📋 Générer JSON
                      </Button>
                    </div>
                    
                    {/* 🆕 Affichage du JSON généré */}
                    {generatedJson && (
                      <div className="p-3 bg-gray-900 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 font-mono">JSON généré</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(generatedJson, null, 2));
                              toast({
                                title: "✅ Copié !",
                                description: "JSON copié dans le presse-papier",
                                className: "bg-green-500 text-white"
                              });
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            📋 Copier
                          </button>
                        </div>
                        <pre className="text-xs text-green-400 font-mono overflow-auto max-h-60">
                          {JSON.stringify(generatedJson, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 pb-4">
            <Button 
              variant="outline" 
              onClick={handleClosePdfViewer}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🆕 Step 3 : Modal Configuration de bloc */}
      <Dialog open={isBlockConfigOpen} onOpenChange={setIsBlockConfigOpen}>
        <DialogContent 
          className="sm:max-w-md overflow-visible"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Configuration du bloc</DialogTitle>
            <DialogDescription>
              Choisissez le type de bloc et ses paramètres
            </DialogDescription>
          </DialogHeader>
          
          <BlockConfigForm
            onSave={handleSaveBlockConfig}
            onCancel={() => {
              setIsBlockConfigOpen(false);
              setBlockConfigData(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal Prévisualisation Template */}
      <Dialog open={isPreviewTemplateOpen} onOpenChange={setIsPreviewTemplateOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Prévisualisation : {editingContractTemplate?.name || 'Template'}
            </DialogTitle>
            <DialogDescription>
              Aperçu du rendu HTML du template de contrat
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 max-h-[70vh] overflow-y-auto bg-white border rounded-lg">
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: editingContractTemplate?.contentHtml || '' }}
            />
          </div>
          <DialogFooter className="px-6 pb-4">
            <Button onClick={() => setIsPreviewTemplateOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractTemplatesPage;
