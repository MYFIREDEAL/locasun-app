/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODULE PANEL - Workflow V2
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Panneau central affichant le contenu du module actif.
 * 
 * ⚠️  PHASE 1: READ_ONLY MODE
 *     - Affichage des données uniquement
 *     - Aucune écriture DB
 *     - Aucun envoi de formulaire
 *     - Boutons mockés (gérés par T6)
 * 
 * ONGLETS:
 *   📋 Contact — Infos client, formulaires, documents, historique
 *   ⚙️ Workflow V2 — Configuration IA du module (READ_ONLY)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { 
  User, 
  FileText, 
  FolderOpen, 
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  FileSignature,
  File,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ✅ Import composant config IA (V2 uniquement)
import ModuleConfigTab from './ModuleConfigTab';

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Section Header
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, count, className }) => (
  <div className={cn('flex items-center justify-between mb-3', className)}>
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-gray-400" />}
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    </div>
    {count !== undefined && (
      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
        {count}
      </span>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Client Info Card
// ─────────────────────────────────────────────────────────────────────────────

const ClientInfoCard = ({ prospect }) => {
  if (!prospect) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-400">Aucune info client</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {prospect.name || 'Client sans nom'}
          </p>
          {prospect.email && (
            <p className="text-sm text-gray-500 truncate">{prospect.email}</p>
          )}
          {prospect.phone && (
            <p className="text-sm text-gray-500">{prospect.phone}</p>
          )}
          {prospect.company_name && (
            <p className="text-xs text-gray-400 mt-1">🏢 {prospect.company_name}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Forms List (READ_ONLY)
// ─────────────────────────────────────────────────────────────────────────────

const FormsList = ({ forms = [] }) => {
  if (!forms || forms.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center border-2 border-dashed border-gray-200">
        <FileText className="h-6 w-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Aucun formulaire</p>
      </div>
    );
  }
  
  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'En attente', class: 'bg-amber-100 text-amber-700', icon: Clock },
      submitted: { label: 'Soumis', class: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      approved: { label: 'Approuvé', class: 'bg-green-100 text-green-700', icon: CheckCircle },
      rejected: { label: 'Rejeté', class: 'bg-red-100 text-red-700', icon: AlertCircle },
    };
    return configs[status] || configs.pending;
  };
  
  return (
    <div className="space-y-2">
      {forms.map((form, index) => {
        const statusConfig = getStatusBadge(form.status);
        const StatusIcon = statusConfig.icon;
        
        return (
          <div 
            key={form.id || index}
            className="bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">
                  {form.title || form.name || `Formulaire ${index + 1}`}
                </span>
              </div>
              <div className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                statusConfig.class
              )}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </div>
            </div>
            {form.submitted_at && (
              <p className="text-xs text-gray-400 mt-1 ml-6">
                Soumis le {new Date(form.submitted_at).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Documents List (READ_ONLY)
// ─────────────────────────────────────────────────────────────────────────────

const DocumentsList = ({ documents = [] }) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center border-2 border-dashed border-gray-200">
        <FolderOpen className="h-6 w-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Aucun document</p>
      </div>
    );
  }
  
  // Badge de statut pour les contrats
  const getContractStatusBadge = (status) => {
    const configs = {
      pending: { label: 'En attente', class: 'bg-amber-100 text-amber-700', icon: Clock },
      signed: { label: 'Signé', class: 'bg-green-100 text-green-700', icon: CheckCircle },
      expired: { label: 'Expiré', class: 'bg-red-100 text-red-700', icon: AlertCircle },
    };
    return configs[status] || configs.pending;
  };
  
  return (
    <div className="space-y-2">
      {documents.map((doc, index) => {
        const isContract = doc.type === 'contract';
        const DocIcon = isContract ? FileSignature : File;
        const statusConfig = isContract ? getContractStatusBadge(doc.status) : null;
        const StatusIcon = statusConfig?.icon;
        
        return (
          <div 
            key={doc.id || index}
            className={cn(
              "bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow",
              isContract && "border-l-4 border-l-blue-400"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <DocIcon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isContract ? "text-blue-500" : "text-gray-400"
                )} />
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-gray-700 truncate block">
                    {doc.name || doc.file_name || `Document ${index + 1}`}
                  </span>
                  {doc.category && (
                    <span className="text-xs text-gray-400">{doc.category}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Badge statut contrat */}
                {isContract && statusConfig && (
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                    statusConfig.class
                  )}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </div>
                )}
                
                {/* Lien externe (READ_ONLY: voir seulement) */}
                {doc.url && (
                  <a 
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                    title="Voir le document"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            
            {/* Métadonnées */}
            <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-gray-400">
              {doc.uploadedAt && (
                <span>Ajouté le {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}</span>
              )}
              {isContract && doc.signerName && (
                <span>• Signataire: {doc.signerName}</span>
              )}
              {isContract && doc.signedAt && (
                <span className="text-green-600">
                  • Signé le {new Date(doc.signedAt).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Chat Preview (READ_ONLY)
// ─────────────────────────────────────────────────────────────────────────────

const ChatPreview = ({ messages = [] }) => {
  // Afficher seulement les 5 derniers messages
  const recentMessages = messages.slice(-5);
  
  if (!messages || messages.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center border-2 border-dashed border-gray-200">
        <MessageSquare className="h-6 w-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Aucun message</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {recentMessages.map((msg, index) => {
        const isAdmin = msg.sender_type === 'admin' || msg.is_admin;
        
        return (
          <div 
            key={msg.id || index}
            className={cn(
              'p-2 rounded-lg text-sm',
              isAdmin ? 'bg-blue-50 ml-4' : 'bg-gray-50 mr-4'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                'text-xs font-medium',
                isAdmin ? 'text-blue-600' : 'text-gray-600'
              )}>
                {isAdmin ? '👤 Admin' : '👥 Client'}
              </span>
              {msg.created_at && (
                <span className="text-xs text-gray-400">
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
            <p className="text-gray-700 line-clamp-2">
              {msg.content || msg.message || '...'}
            </p>
          </div>
        );
      })}
      
      {messages.length > 5 && (
        <p className="text-xs text-gray-400 text-center py-1">
          + {messages.length - 5} messages précédents
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANT: Module Status Badge
// ─────────────────────────────────────────────────────────────────────────────

const ModuleStatusBadge = ({ status }) => {
  const configs = {
    completed: { 
      label: '✅ Terminé', 
      class: 'bg-green-100 text-green-700' 
    },
    in_progress: { 
      label: '🔄 En cours', 
      class: 'bg-blue-100 text-blue-700' 
    },
    pending: { 
      label: '⏳ À venir', 
      class: 'bg-gray-100 text-gray-500' 
    },
  };
  
  const config = configs[status] || configs.pending;
  
  return (
    <div className={cn(
      'px-3 py-1 rounded-full text-sm font-medium',
      config.class
    )}>
      {config.label}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Panneau central du module
 * 
 * @param {Object} props
 * @param {Object} props.step - Étape/module actif
 * @param {number} props.stepIndex - Index de l'étape (0-based)
 * @param {number} props.totalSteps - Nombre total d'étapes
 * @param {Object} props.prospect - Données du prospect/client
 * @param {Array} props.forms - Formulaires liés au module
 * @param {Array} props.documents - Documents liés au module
 * @param {Array} props.messages - Messages chat liés au module
 * @param {boolean} props.isReadOnly - Mode lecture seule
 * @param {React.ReactNode} props.children - Contenu additionnel (boutons T6)
 */
const ModulePanel = ({
  step,
  stepIndex = 0,
  totalSteps = 0,
  prospect,
  forms = [],
  documents = [],
  messages = [],
  isReadOnly = true,
  children,
  className,
}) => {
  // ─────────────────────────────────────────────────────────────────────────
  // SYSTÈME D'ONGLETS
  // ─────────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('contact');
  
  const TABS = [
    { id: 'contact', label: 'Contact', icon: User },
    { id: 'workflow-v2', label: 'Workflow V2', icon: Settings },
  ];
  
  if (!step) {
    return (
      <div className={cn('bg-white rounded-xl shadow-sm border', className)}>
        <div className="px-6 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun module sélectionné</p>
        </div>
      </div>
    );
  }
  
  // Générer un moduleId à partir du nom du step
  const moduleId = step.name 
    ? step.name.toLowerCase().replace(/[_\s]/g, '-').replace(/[^a-z0-9-]/g, '')
    : `step-${stepIndex}`;
  
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border', className)}>
      {/* ─────────────────────────────────────────────────────────────────
          HEADER MODULE
      ───────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {step.icon || '📋'} {step.name || 'Module'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Module {stepIndex + 1} sur {totalSteps}
            </p>
          </div>
          <ModuleStatusBadge status={step.status} />
        </div>
        
        {/* Description du module si disponible */}
        {step.description && (
          <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">
            {step.description}
          </p>
        )}
      </div>
      
      {/* ─────────────────────────────────────────────────────────────────
          NAVIGATION ONGLETS
      ───────────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 border-b">
        <nav className="flex gap-1" aria-label="Tabs">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
                  'border-b-2 -mb-px',
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* ─────────────────────────────────────────────────────────────────
          CONTENU ONGLET ACTIF
      ───────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-6">
        
        {/* ONGLET: Contact */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            {/* Section 1: Info Client */}
            <section>
              <SectionHeader icon={User} title="Client" />
              <ClientInfoCard prospect={prospect} />
            </section>
            
            {/* Section 2: Formulaires */}
            <section>
              <SectionHeader icon={FileText} title="Formulaires" count={forms.length} />
              <FormsList forms={forms} />
            </section>
            
            {/* Section 3: Documents */}
            <section>
              <SectionHeader icon={FolderOpen} title="Documents" count={documents.length} />
              <DocumentsList documents={documents} />
            </section>
            
            {/* Section 4: Historique Chat */}
            <section>
              <SectionHeader icon={MessageSquare} title="Historique" count={messages.length} />
              <ChatPreview messages={messages} />
            </section>
          </div>
        )}
        
        {/* ONGLET: Workflow V2 (Config IA) */}
        {activeTab === 'workflow-v2' && (
          <ModuleConfigTab
            moduleId={moduleId}
            moduleName={step.name || 'Module'}
            isReadOnly={isReadOnly}
          />
        )}
        
      </div>
      
      {/* ─────────────────────────────────────────────────────────────────
          FOOTER (Boutons d'action - T6) - Visible uniquement sur onglet Contact
      ───────────────────────────────────────────────────────────────── */}
      {children && activeTab === 'contact' && (
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          {children}
        </div>
      )}
      
      {/* Message READ_ONLY si pas de children */}
      {!children && isReadOnly && activeTab === 'contact' && (
        <div className="px-6 py-3 border-t bg-amber-50 rounded-b-xl">
          <p className="text-xs text-amber-600 text-center">
            ⚠️ Mode lecture seule — Actions désactivées
          </p>
        </div>
      )}
    </div>
  );
};

// Exports des sous-composants pour usage externe si nécessaire
ModulePanel.ClientInfoCard = ClientInfoCard;
ModulePanel.FormsList = FormsList;
ModulePanel.DocumentsList = DocumentsList;
ModulePanel.ChatPreview = ChatPreview;
ModulePanel.StatusBadge = ModuleStatusBadge;

export default ModulePanel;
