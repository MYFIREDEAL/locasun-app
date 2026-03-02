import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link2, Zap, Code2, ArrowLeft, Key, Copy, Check, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CopyButton from '@/components/ui/CopyButton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSupabaseProjectTemplates } from '@/hooks/useSupabaseProjectTemplates';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const TABS = [
  { id: 'sans-code', label: 'Sans code', icon: Link2, description: 'Liens, QR codes, widgets embed', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'make', label: 'Make', icon: Zap, description: 'Scénarios Make prêts à l\'emploi', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'developpeur', label: 'Développeur', icon: Code2, description: 'Webhooks, API keys, endpoints', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
];

const IntegrationsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sans-code');

  // ─── État clé d'intégration ───
  const [activeKey, setActiveKey] = useState(null);       // { key_prefix, created_at } ou null
  const [keyLoading, setKeyLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);  // Clé brute (modal)
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // 🔌 Données org-level pour générer les liens
  const { organizationId } = useOrganization();
  const { projectTemplates, loading: templatesLoading } = useSupabaseProjectTemplates({ organizationId });

  // Multi-tenant : origin = sous-domaine actif (ex: https://locasun.evatime.fr)
  const origin = window.location.origin;

  // Liens globaux (org-level, aucune dépendance user)
  const globalLinks = useMemo(() => [
    { label: 'Landing page', url: `${origin}/landing`, description: 'Page d\'accueil publique de votre organisation' },
    { label: 'Inscription client', url: `${origin}/inscription`, description: 'Page d\'inscription client pour cette organisation' },
    { label: 'Espace client (connexion)', url: `${origin}/client-access`, description: 'Connexion espace client existant' },
    { label: 'Connexion pro', url: `${origin}/login`, description: 'Connexion espace admin / commercial' },
    { label: 'Espace partenaire (connexion)', url: `${origin}/partner/login`, description: 'Connexion espace partenaire' },
  ], [origin]);

  // Liens par projet (scoped par org via useSupabaseProjectTemplates, filtrés public)
  const projectLinks = useMemo(() => {
    if (!projectTemplates || projectTemplates.length === 0) return [];
    return projectTemplates
      .filter(p => p.isPublic || p.is_public)
      .map(p => {
        const projectSlug = slugify(p.type);
        return {
          name: p.clientTitle || p.client_title || p.type,
          type: p.type,
          projectSlug,
          url: `${origin}/inscription?project=${projectSlug}`,
        };
      });
  }, [projectTemplates, origin]);

  // ─── Charger la clé d'intégration active ───
  useEffect(() => {
    if (!organizationId) return;
    const fetchActiveKey = async () => {
      setKeyLoading(true);
      try {
        const { data, error } = await supabase
          .from('integration_keys')
          .select('key_prefix, created_at')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setActiveKey(data || null);
      } catch (err) {
        console.error('Erreur chargement clé:', err.message);
        setActiveKey(null);
      } finally {
        setKeyLoading(false);
      }
    };
    fetchActiveKey();
  }, [organizationId]);

  // ─── Générer une nouvelle clé ───
  const handleGenerateKey = useCallback(async () => {
    setGenerating(true);
    setShowConfirmReplace(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non connecté');

      const response = await supabase.functions.invoke('generate-integration-key', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message || 'Erreur serveur');

      const result = response.data;
      if (!result?.success) throw new Error(result?.message || 'Échec génération');

      // Afficher la clé brute dans le modal
      setGeneratedKey(result.key);
      setShowKeyModal(true);
      setKeyCopied(false);

      // Mettre à jour l'état local avec le preview pour l'affichage
      setActiveKey({ key_prefix: result.key_preview || result.key_prefix, created_at: new Date().toISOString() });
    } catch (err) {
      console.error('Erreur génération clé:', err.message);
      alert(`Erreur : ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, []);

  // ─── Type de projet dynamique (premier template de l'org) ───
  const exampleProjectType = projectTemplates?.[0]?.type || 'projet';

  // ─── Make : JSON simple pour l'exemple ───
  const makeSimpleJson = JSON.stringify({
    nom: 'Jean Dupont',
    email: 'jean@mail.com',
    type_projet: exampleProjectType,
  }, null, 2);

  // ─── Développeur : Endpoint webhook réel ───
  const supabaseProjectRef = (import.meta.env.VITE_SUPABASE_URL || '').replace('https://', '').replace('.supabase.co', '');
  const webhookEndpoint = `POST https://${supabaseProjectRef}.supabase.co/functions/v1/webhook-v1`;
  const webhookUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/webhook-v1`;

  // ─── Développeur : Exemple curl ───
  const curlExample = `curl -X POST ${webhookUrl} \\
  -H "Authorization: Bearer eva_xxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nom": "Jean Dupont",
    "email": "jean@mail.com",
    "type_projet": "${exampleProjectType}",
    "owner_email": "commercial@org.com",
    "send_magic_link": true
  }'`;

  // ─── Développeur : Exemple JS fetch ───
  const fetchExample = `fetch("${webhookUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer eva_xxxxxxxxx",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    nom: "Jean Dupont",
    email: "jean@mail.com",
    type_projet: "${exampleProjectType}"
  })
});`;

  // ─── Développeur : Codes erreurs ───
  const errorCodes = [
    { http: '401', code: 'INVALID_KEY', description: 'Clé d\'intégration absente, invalide ou introuvable.', httpClass: 'bg-red-100 text-red-700' },
    { http: '403', code: 'KEY_DISABLED', description: 'La clé existe mais est désactivée (is_active = false).', httpClass: 'bg-orange-100 text-orange-700' },
    { http: '403', code: 'KEY_EXPIRED', description: 'La clé a expiré (expires_at dépassé).', httpClass: 'bg-orange-100 text-orange-700' },
    { http: '403', code: 'INSUFFICIENT_PERMISSIONS', description: 'La clé n\'a pas la permission "create_prospect".', httpClass: 'bg-orange-100 text-orange-700' },
    { http: '400', code: 'INVALID_EMAIL', description: 'Champ email manquant ou format invalide.', httpClass: 'bg-yellow-100 text-yellow-700' },
    { http: '400', code: 'INVALID_PROJECT_TYPE', description: 'type_projet ne correspond à aucun project_template de l\'org.', httpClass: 'bg-yellow-100 text-yellow-700' },
    { http: '400', code: 'INVALID_OWNER', description: 'owner_user_id ou owner_email ne correspond à aucun user de l\'org.', httpClass: 'bg-yellow-100 text-yellow-700' },
    { http: '409', code: 'DUPLICATE_EMAIL', description: 'Un prospect avec cet email existe déjà dans l\'organisation.', httpClass: 'bg-purple-100 text-purple-700' },
    { http: '500', code: 'NO_PIPELINE_STEP', description: 'Aucune étape pipeline trouvée pour ce type de projet.', httpClass: 'bg-red-100 text-red-700' },
  ];

  // ─── Développeur : Règles d'attribution ───
  const devAttributionRules = [
    { icon: '🎯', label: 'owner_user_id (priorité 1)', description: 'Si fourni, assignation directe. Le UUID doit appartenir à un user de l\'organisation.', badge: 'Priorité 1', badgeClass: 'bg-green-100 text-green-700' },
    { icon: '📧', label: 'owner_email (priorité 2)', description: 'Si fourni (et pas de owner_user_id), recherche automatique du user par email dans l\'org.', badge: 'Priorité 2', badgeClass: 'bg-blue-100 text-blue-700' },
    { icon: '🏢', label: 'Aucun owner → Global Admin', description: 'Si ni owner_user_id ni owner_email : fallback automatique vers le Global Admin de l\'organisation.', badge: 'Fallback', badgeClass: 'bg-gray-100 text-gray-600' },
    { icon: '🔄', label: 'Mapping dynamique', description: 'Les champs contact/project sont mappés automatiquement dans form_data du prospect.', badge: 'Auto', badgeClass: 'bg-emerald-100 text-emerald-700' },
    { icon: '🔒', label: 'Isolation multi-tenant stricte', description: 'La clé Bearer détermine l\'org — aucun accès cross-organisation possible.', badge: 'Obligatoire', badgeClass: 'bg-red-100 text-red-700' },
  ];

  return (
  <>
    <motion.div
      className="max-w-5xl mx-auto space-y-8 p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/profil')}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Intégrations</h1>
          <p className="text-gray-500 mt-1">Liens, Make ou webhook</p>
        </div>
      </motion.div>

      {/* Tabs / Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                isActive
                  ? `${tab.color} shadow-md ring-2 ring-offset-2 ring-current`
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/60' : 'bg-gray-100'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-semibold text-lg">{tab.label}</span>
              <span className={`text-sm ${isActive ? 'opacity-80' : 'text-gray-400'}`}>{tab.description}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Content */}
      {activeTab === 'sans-code' && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Message d'intro */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm">
            <strong>💡 Collez ces liens sur vos boutons, menus ou landing pages.</strong>
            <br />Aucune compétence technique requise — copiez, collez, c'est prêt.
          </div>

          {/* Bloc 1 : Liens prêts à coller */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">🔗 Liens prêts à coller sur votre site</h2>

            <div className="space-y-3">
              {globalLinks.map((link) => (
                <div key={link.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">{link.label}</p>
                    <p className="text-xs text-gray-400 mb-1">{link.description}</p>
                    <Input
                      value={link.url}
                      readOnly
                      className="font-mono text-xs bg-white cursor-pointer select-all"
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                  <CopyButton value={link.url} label="Copié !" />
                </div>
              ))}
            </div>
          </div>

          {/* Bloc 2 : Liens d'inscription par projet */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">📋 Liens d'inscription par projet</h2>
            <p className="text-sm text-gray-500">
              Un lien par type de projet — le client arrive directement sur l'inscription avec le projet pré-sélectionné.
            </p>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full mr-3" />
                Chargement des projets…
              </div>
            ) : projectLinks.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-500 text-sm text-center">
                Aucun projet public trouvé pour votre organisation. Créez des projets avec la visibilité "public" dans Mon Profil.
              </div>
            ) : (
              <div className="space-y-3">
                {projectLinks.map((project) => (
                  <div key={project.type} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">{project.name}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">{project.projectSlug}</span>
                      </div>
                      <Input
                        value={project.url}
                        readOnly
                        className="font-mono text-xs bg-white cursor-pointer select-all"
                        onClick={(e) => e.target.select()}
                      />
                    </div>
                    <CopyButton value={project.url} label="Copié !" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Onglet Make ─── */}
      {activeTab === 'make' && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Intro */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🔌 Connecter Make à EVATIME
            </h1>
            <p className="text-purple-100 mt-2 text-base">
              Suivez ces étapes pour envoyer automatiquement vos prospects dans EVATIME.
            </p>
          </div>

          {/* ── Prérequis — Générer une clé ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">🔑</span>
              <h2 className="text-lg font-semibold text-gray-900">Prérequis — Clé d'intégration</h2>
            </div>

            {keyLoading ? (
              <div className="flex items-center justify-center py-6 text-gray-400">
                <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full mr-3" />
                Chargement…
              </div>
            ) : activeKey ? (
              /* ── Clé active existante ── */
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <Key className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Clé active</p>
                    <p className="text-xs text-green-600 font-mono">{activeKey.key_prefix}</p>
                    <p className="text-xs text-green-500 mt-0.5">
                      Créée le {new Date(activeKey.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {showConfirmReplace ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        <strong>Attention :</strong> l'ancienne clé sera désactivée immédiatement. Tous les services qui l'utilisent cesseront de fonctionner.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        disabled={generating}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {generating ? (
                          <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Génération…</>
                        ) : (
                          <>Confirmer le remplacement</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmReplace(false)}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmReplace(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition-colors"
                  >
                    🔑 Générer une nouvelle clé (l'ancienne sera désactivée)
                  </button>
                )}
              </div>
            ) : (
              /* ── Aucune clé ── */
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center space-y-3">
                <p className="text-sm text-gray-500">Aucune clé active pour cette organisation.</p>
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {generating ? (
                    <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Génération…</>
                  ) : (
                    <>🔑 Générer une clé d'intégration</>
                  )}
                </button>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs flex items-start gap-2">
              <span className="text-base">🔐</span>
              <span>La clé complète est affichée <strong>une seule fois</strong> lors de sa création. Conservez-la en lieu sûr.</span>
            </div>
          </div>

          {/* ── Étape 1 — Créer un scénario ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">1</span>
              <h2 className="text-lg font-semibold text-gray-900">Créer un scénario</h2>
            </div>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">1.</span>
                <span>Connectez-vous à <a href="https://www.make.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline font-medium">Make.com</a></span>
              </li>
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">2.</span>
                <span>Cliquez sur <strong>Create a new scenario</strong></span>
              </li>
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">3.</span>
                <span>Choisissez <strong>Build from scratch</strong></span>
              </li>
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">4.</span>
                <span>Vous arrivez sur un écran vide avec un bouton <strong className="text-lg">➕</strong></span>
              </li>
            </ol>
          </div>

          {/* ── Étape 2 — Ajouter le module HTTP ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">2</span>
              <h2 className="text-lg font-semibold text-gray-900">Ajouter le module HTTP</h2>
            </div>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">1.</span>
                <span>Cliquez sur le bouton <strong className="text-lg">➕</strong></span>
              </li>
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">2.</span>
                <span>Recherchez et sélectionnez <strong>HTTP → Make a request</strong></span>
              </li>
            </ol>
          </div>

          {/* ── Étape 3 — Configurer la requête ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">3</span>
              <h2 className="text-lg font-semibold text-gray-900">Remplir le module HTTP</h2>
            </div>

            <p className="text-sm text-gray-500">Un panneau s'ouvre avec plusieurs champs. Remplissez-les dans l'ordre :</p>

            <div className="space-y-3 text-sm text-gray-700">
              {/* Authentication type */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Authentication type</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">champ Make</span>
                </div>
                <p>Laissez sur : <code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono text-xs font-bold">No authentication</code></p>
              </div>

              {/* URL */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">URL</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">champ Make</span>
                </div>
                <p className="text-gray-500 text-xs">Copiez et collez cette URL :</p>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-xs bg-white cursor-pointer select-all"
                    onClick={(e) => e.target.select()}
                  />
                  <CopyButton value={webhookUrl} label="Copié !" />
                </div>
              </div>

              {/* Method */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Method</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">champ Make</span>
                </div>
                <p>Sélectionnez : <code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono text-xs font-bold">POST</code></p>
              </div>
            </div>
          </div>

          {/* ── Étape 4 — Ajouter les Headers ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">4</span>
              <h2 className="text-lg font-semibold text-gray-900">Ajouter le Header d'authentification</h2>
            </div>

            <p className="text-sm text-gray-500">
              Dans la section <strong>Headers</strong>, cliquez sur <strong>+ Add a header</strong> :
            </p>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              {/* Name */}
              <div className="grid grid-cols-[80px_1fr] gap-2 items-center text-sm">
                <span className="text-gray-500 font-medium">Name :</span>
                <div className="flex items-center gap-2">
                  <code className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg font-mono text-xs flex-1">Authorization</code>
                  <CopyButton value="Authorization" label="Copié !" />
                </div>
              </div>

              {/* Value */}
              <div className="grid grid-cols-[80px_1fr] gap-2 items-start text-sm">
                <span className="text-gray-500 font-medium mt-1.5">Value :</span>
                <div className="space-y-2">
                  <p className="text-gray-600">
                    Écrivez <code className="font-mono bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">Bearer</code> suivi d'un <strong>espace</strong>, puis <strong>collez votre clé</strong>.
                  </p>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-500">
                    Bearer <span className="text-purple-600">eva_live_xxxxxxxx...</span>
                  </div>

                  {activeKey ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-green-800 text-xs flex items-start gap-2">
                      <span>✅</span>
                      <span>Vous avez une clé active (<code className="font-mono bg-green-100 px-1 rounded">{activeKey.key_prefix}</code>). Si vous l'avez déjà copiée, collez-la après <code className="font-mono bg-green-100 px-1 rounded">Bearer </code>.</span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-800 text-xs flex items-start gap-2">
                      <span>⚠️</span>
                      <span>Vous n'avez pas encore de clé. Remontez au <strong>Prérequis</strong> en haut de page pour en générer une. La clé n'est affichée <strong>qu'une seule fois</strong>.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-blue-800 text-xs flex items-start gap-2">
              <span>💡</span>
              <span>Pas besoin d'ajouter le header <code className="font-mono bg-blue-100 px-1 rounded">Content-Type</code> — Make le gère automatiquement quand vous choisissez le body type JSON à l'étape suivante.</span>
            </div>
          </div>

          {/* ── Étape 5 — Ajouter le Body ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">5</span>
              <h2 className="text-lg font-semibold text-gray-900">Ajouter le Body</h2>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              {/* Body content type */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Body content type</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">champ Make</span>
                </div>
                <p>Sélectionnez : <code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono text-xs font-bold">application/json</code></p>
              </div>

              {/* Body input method */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Body input method</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">champ Make</span>
                </div>
                <p>Sélectionnez : <code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono text-xs font-bold">JSON string</code></p>
              </div>

              {/* Body content */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Body content</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">champ Make</span>
                </div>

                <p className="text-gray-600 text-xs">
                  Construisez le JSON en utilisant les <strong>variables du module précédent</strong> (panneau violet à droite dans Make).
                  Chaque valeur doit être une variable Make, <strong>pas du texte en dur</strong>.
                </p>

                <div className="bg-gray-900 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre space-y-0">
                  <span className="text-gray-400">{'{'}</span>{'\n'}
                  <span className="text-green-400">  "nom"</span><span className="text-gray-400">: "</span><span className="text-purple-400 bg-purple-900/30 px-1 rounded">{'{{1.nom}}'}</span><span className="text-gray-400">",</span>{'\n'}
                  <span className="text-green-400">  "email"</span><span className="text-gray-400">: "</span><span className="text-purple-400 bg-purple-900/30 px-1 rounded">{'{{1.email}}'}</span><span className="text-gray-400">",</span>{'\n'}
                  <span className="text-green-400">  "type_projet"</span><span className="text-gray-400">: "</span><span className="text-purple-400 bg-purple-900/30 px-1 rounded">{'{{1.type_projet}}'}</span><span className="text-gray-400">"</span>{'\n'}
                  <span className="text-gray-400">{'}'}</span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-800 text-xs flex items-start gap-2">
                  <span>⚠️</span>
                  <div>
                    <p><strong>Ne collez pas de valeurs en dur</strong> ("Jean Dupont", "jean@mail.com"…).</p>
                    <p className="mt-1">Les noms en violet (<code className="font-mono bg-amber-100 px-1 rounded">{'{{1.xxx}}'}</code>) représentent les <strong>variables dynamiques</strong> de votre module précédent (Webhook, Google Sheets, etc.).</p>
                  </div>
                </div>

                <p className="text-gray-500 text-xs">
                  <strong>Champs obligatoires :</strong> <code className="bg-gray-100 px-1 rounded font-mono">nom</code> et <code className="bg-gray-100 px-1 rounded font-mono">email</code>.
                  Champs optionnels : <code className="bg-gray-100 px-1 rounded font-mono">telephone</code>, <code className="bg-gray-100 px-1 rounded font-mono">type_projet</code>, <code className="bg-gray-100 px-1 rounded font-mono">owner_email</code>.
                </p>
              </div>

              {/* Parse response */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Parse response</span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">champ Make</span>
                </div>
                <p>Cochez : <code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono text-xs font-bold">Yes</code></p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-xs flex items-start gap-2">
                <span>💡</span>
                <div>
                  <p><strong>type_projet</strong> doit correspondre à un projet existant dans votre organisation.</p>
                  {projectTemplates && projectTemplates.length > 0 && (
                    <p className="mt-1">
                      Vos projets : {projectTemplates.map(t => (
                        <code key={t.type} className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs mx-0.5">{t.type}</code>
                      ))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Étape 6 — Tester ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">6</span>
              <h2 className="text-lg font-semibold text-gray-900">Tester</h2>
            </div>

            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">1.</span>
                <span>Cliquez sur <strong>Save</strong></span>
              </li>
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">2.</span>
                <span>Cliquez sur <strong>Run once</strong></span>
              </li>
              <li className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold text-green-600 mt-0.5">3.</span>
                <span>Si tout est correct, vous verrez : <code className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono text-xs font-bold">Status Code: 200</code></span>
              </li>
            </ol>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm flex items-start gap-2">
              <span className="text-base">✅</span>
              <span>Le prospect sera automatiquement créé et assigné dans EVATIME. Vous le retrouverez dans votre Pipeline.</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Onglet Développeur ─── */}
      {activeTab === 'developpeur' && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Intro */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm">
            <strong>🛠️ Documentation technique — Webhook V1</strong>
            <br />Intégrez EVATIME depuis n'importe quel langage ou plateforme via notre API webhook.
          </div>

          {/* ── A) Bloc Endpoint ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">🔗 Endpoint</h2>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">URL du webhook</p>
                <Input
                  value={webhookEndpoint}
                  readOnly
                  className="font-mono text-xs bg-white cursor-pointer select-all mt-1"
                  onClick={(e) => e.target.select()}
                />
              </div>
              <CopyButton value={webhookEndpoint} label="Copié !" />
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Headers requis</p>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre">
{`Authorization: Bearer <integration_key>
Content-Type: application/json`}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-xs flex items-start gap-2">
              <span className="text-base">ℹ️</span>
              <span>L'organisation est résolue automatiquement via la clé d'intégration. Aucun <code className="bg-blue-100 px-1 rounded font-mono">org_slug</code> requis.</span>
            </div>
          </div>

          {/* ── B) Exemple curl ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">📟 Exemple curl</h2>

            <div className="relative">
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre">
{curlExample}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton value={curlExample} label="Copié !" />
              </div>
            </div>
          </div>

          {/* ── C) Exemple JavaScript (fetch) ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">🟨 Exemple JavaScript (fetch)</h2>

            <div className="relative">
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre">
{fetchExample}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton value={fetchExample} label="Copié !" />
              </div>
            </div>
          </div>

          {/* ── D) Codes erreurs ── */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">⚠️ Codes erreurs</h2>
            <p className="text-sm text-gray-500">
              Réponses d'erreur possibles du webhook. Toutes les réponses sont au format JSON avec <code className="bg-gray-100 px-1 rounded font-mono">{"{ success: false, error: \"CODE\" }"}</code>.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">HTTP</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">Code erreur</th>
                    <th className="text-left py-2 px-3 text-gray-600 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {errorCodes.map((err) => (
                    <tr key={err.code} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <span className={`inline-block text-xs font-mono font-bold px-2 py-0.5 rounded ${err.httpClass}`}>
                          {err.http}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-xs text-gray-800">{err.code}</td>
                      <td className="py-2 px-3 text-xs text-gray-500">{err.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Encadré : Règles d'attribution ── */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-emerald-900">📐 Règles d'attribution du prospect</h2>

            <div className="space-y-2">
              {devAttributionRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-emerald-200">
                  <span className="text-lg">{rule.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{rule.label}</p>
                    <p className="text-xs text-gray-500">{rule.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${rule.badgeClass}`}>{rule.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>

    {/* ─── Modal clé générée ─── */}
    {showKeyModal && generatedKey && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative">
          <button
            type="button"
            onClick={() => { setShowKeyModal(false); setGeneratedKey(null); }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Clé générée avec succès</h3>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-700">⚠️ Cette clé ne sera plus affichée. Copiez-la maintenant.</p>
            <div className="flex items-center gap-2">
              <Input
                value={generatedKey}
                readOnly
                className="font-mono text-xs bg-white cursor-pointer select-all flex-1"
                onClick={(e) => e.target.select()}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`Bearer ${generatedKey}`);
                    setKeyCopied('bearer');
                    setTimeout(() => setKeyCopied(false), 3000);
                  } catch { /* ignore */ }
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex-1 justify-center ${
                  keyCopied === 'bearer'
                    ? 'bg-green-600 text-white'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {keyCopied === 'bearer' ? <><Check className="w-4 h-4" /> Copié !</> : <><Copy className="w-4 h-4" /> Copier pour Make</>}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(generatedKey);
                    setKeyCopied('raw');
                    setTimeout(() => setKeyCopied(false), 3000);
                  } catch { /* ignore */ }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs transition-colors ${
                  keyCopied === 'raw'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {keyCopied === 'raw' ? <><Check className="w-4 h-4" /> Copié !</> : <>Clé seule</>}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Copier pour Make</strong> = copie <code className="bg-gray-100 px-1 rounded font-mono text-[10px]">Bearer votre_clé</code> — prêt à coller dans le header Authorization.
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Collez cette clé dans votre scénario Make ou dans vos headers d'API.
          </p>

          <button
            type="button"
            onClick={() => { setShowKeyModal(false); setGeneratedKey(null); }}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            J'ai copié ma clé, fermer
          </button>
        </div>
      </div>
    )}
  </>
  );
};

export default IntegrationsPage;
