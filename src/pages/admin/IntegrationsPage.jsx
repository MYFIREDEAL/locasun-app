import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link2, Zap, Code2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CopyButton from '@/components/ui/CopyButton';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSupabaseProjectTemplates } from '@/hooks/useSupabaseProjectTemplates';
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

  // ─── Make : Contrat JSON officiel ───
  const makeContractJson = JSON.stringify({
    type_projet: 'centrale',
    owner_user_id: 'uuid-optionnel',
    owner_email: 'email-optionnel',
    contact: {
      nom: 'Dupont',
      prenom: 'Marie',
      email: 'marie.dupont@email.com',
      telephone: '06 12 34 56 78',
      adresse: '12 rue du Soleil, 31000 Toulouse',
    },
    project: {
      puissance_kwc: 9,
      type_toiture: 'surimposition',
      commentaire: 'Intéressée par autoconsommation',
    },
  }, null, 2);

  // ─── Make : Règles d'attribution ───
  const attributionRules = [
    {
      icon: '🎯',
      label: 'owner_user_id fourni',
      description: 'Assignation directe si le user appartient à l\'organisation.',
      badge: 'Priorité 1',
      badgeClass: 'bg-green-100 text-green-700',
    },
    {
      icon: '📧',
      label: 'owner_email fourni',
      description: 'Recherche automatique du user dans l\'organisation par email.',
      badge: 'Priorité 2',
      badgeClass: 'bg-blue-100 text-blue-700',
    },
    {
      icon: '🏢',
      label: 'Aucun owner spécifié',
      description: 'Fallback → assignation au Global Admin de l\'organisation.',
      badge: 'Fallback',
      badgeClass: 'bg-gray-100 text-gray-600',
    },
    {
      icon: '🔒',
      label: 'Isolation multi-tenant',
      description: 'Toujours scopé par organization_id — aucun accès cross-org possible.',
      badge: 'Obligatoire',
      badgeClass: 'bg-red-100 text-red-700',
    },
  ];

  // ─── Make : Sécurité & Mapping ───
  const securityPoints = [
    {
      icon: '🔄',
      label: 'Mapping dynamique',
      description: 'Les champs contact/project sont mappés automatiquement côté EVATIME.',
    },
    {
      icon: '🚫',
      label: 'Champs inconnus ignorés',
      description: 'Les clés non reconnues sont ignorées silencieusement — pas d\'erreur.',
    },
    {
      icon: '✅',
      label: 'Champs obligatoires validés',
      description: 'type_projet et au moins un champ contact (email ou téléphone) sont requis.',
    },
    {
      icon: '🏰',
      label: 'Isolation multi-tenant',
      description: 'Le secret Bearer identifie l\'org — aucune donnée ne fuit entre organisations.',
    },
  ];

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
    "type_projet": "centrale",
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
    type_projet: "centrale"
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
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-purple-800 text-sm">
            <strong>⚡ Connecter avec Make (No-code)</strong>
            <br />Envoyez vos formulaires ou simulateurs vers EVATIME sans écrire de code.
          </div>

          {/* Bloc 1 : Endpoint & Headers */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">🔗 Endpoint & Headers</h2>

            {/* Endpoint */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">Endpoint webhook</p>
                <p className="text-xs text-gray-400 mb-1">URL à coller dans votre scénario Make (module HTTP / Webhook)</p>
                <Input
                  value="POST https://api.evatime.fr/webhook/v1"
                  readOnly
                  className="font-mono text-xs bg-white cursor-pointer select-all"
                  onClick={(e) => e.target.select()}
                />
              </div>
              <CopyButton value="POST https://api.evatime.fr/webhook/v1" label="Copié !" />
            </div>

            {/* Headers */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">Headers requis</p>
                <p className="text-xs text-gray-400 mb-1">À configurer dans le module HTTP de Make</p>
                <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre">
{`Authorization: Bearer <integration_secret>
Content-Type: application/json`}
                </pre>
              </div>
              <CopyButton value={`Authorization: Bearer <integration_secret>\nContent-Type: application/json`} label="Copié !" />
            </div>

            {/* Secret notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs flex items-start gap-2">
              <span className="text-base">🔐</span>
              <div>
                <strong>Secret d'intégration</strong> — Sera généré automatiquement par organisation (Action 6 — backend).
                <br />Ne jamais exposer de secret réel dans le frontend.
              </div>
            </div>
          </div>

          {/* Bloc 2 : Contrat JSON */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">📋 Contrat JSON officiel</h2>
            <p className="text-sm text-gray-500">
              Structure du body JSON à envoyer dans le webhook. Les champs <code className="bg-gray-100 px-1 rounded">contact</code> et <code className="bg-gray-100 px-1 rounded">project</code> sont personnalisables.
            </p>

            <div className="relative">
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre">
{makeContractJson}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton value={makeContractJson} label="Copié !" />
              </div>
            </div>
          </div>

          {/* Bloc 3 : Règles d'attribution */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">👤 Règles d'attribution</h2>
            <p className="text-sm text-gray-500">
              Comment EVATIME attribue le prospect entrant au bon commercial.
            </p>

            <div className="space-y-2">
              {attributionRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-lg">{rule.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{rule.label}</p>
                    <p className="text-xs text-gray-500">{rule.description}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.badgeClass}`}>{rule.badge}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bloc 4 : Sécurité & Mapping */}
          <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">🛡️ Sécurité & Mapping</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {securityPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-base">{point.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{point.label}</p>
                    <p className="text-xs text-gray-500">{point.description}</p>
                  </div>
                </div>
              ))}
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
  );
};

export default IntegrationsPage;
