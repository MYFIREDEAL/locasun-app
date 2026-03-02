import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link2, Zap, Code2, ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CopyButton from '@/components/ui/CopyButton';
import { useAppContext } from '@/App';
import { useUsers } from '@/contexts/UsersContext';
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

  // 🔌 Données nécessaires pour générer les liens
  const { activeAdminUser } = useAppContext();
  const { users } = useUsers();
  const { organizationId } = useOrganization();
  const { projectTemplates, loading: templatesLoading } = useSupabaseProjectTemplates({ organizationId });

  // Dériver l'orgSlug depuis l'affiliate_slug de l'admin connecté (même source que Mon Profil)
  const currentUserFull = useMemo(() => {
    if (!users || !activeAdminUser) return null;
    return users.find(u => u.user_id === activeAdminUser.id || u.user_id === activeAdminUser.user_id);
  }, [users, activeAdminUser]);

  const orgSlug = currentUserFull?.affiliate_slug || null;
  const origin = window.location.origin;

  // Liens globaux
  const globalLinks = useMemo(() => {
    if (!orgSlug) return [];
    return [
      { label: 'Lien inscription global', url: `${origin}/inscription/${orgSlug}`, description: 'Page d\'inscription client avec affiliation automatique' },
      { label: 'Espace client (connexion)', url: `${origin}/login`, description: 'Connexion espace client existant' },
      { label: 'Connexion pro', url: `${origin}/login-pro`, description: 'Connexion espace admin / commercial' },
    ];
  }, [orgSlug, origin]);

  // Liens par projet (scoped par org, filtrés public uniquement — même logique que RegistrationPage)
  const projectLinks = useMemo(() => {
    if (!orgSlug || !projectTemplates || projectTemplates.length === 0) return [];
    return projectTemplates
      .filter(p => p.isPublic || p.is_public)
      .map(p => {
        const projectSlug = slugify(p.type);
        return {
          name: p.clientTitle || p.client_title || p.type,
          type: p.type,
          projectSlug,
          url: `${origin}/inscription/${orgSlug}?project=${projectSlug}`,
        };
      });
  }, [orgSlug, projectTemplates, origin]);

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

            {!orgSlug ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                ⚠️ Aucun lien d'affiliation trouvé pour votre compte. Vérifiez votre <code className="bg-amber-100 px-1 rounded">affiliate_slug</code> dans Mon Profil.
              </div>
            ) : (
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
            )}
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
            ) : !orgSlug ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                ⚠️ Aucun lien d'affiliation — impossible de générer les liens par projet.
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

      {/* Placeholder pour Make & Développeur */}
      {activeTab !== 'sans-code' && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-card border border-gray-100 p-8 text-center"
        >
          <div className="flex flex-col items-center gap-4 py-8">
            {activeTab === 'make' && <Zap className="w-12 h-12 text-purple-400" />}
            {activeTab === 'developpeur' && <Code2 className="w-12 h-12 text-emerald-400" />}

            <h2 className="text-xl font-semibold text-gray-800">
              {TABS.find(t => t.id === activeTab)?.label}
            </h2>
            <p className="text-gray-400 max-w-md">
              À configurer (Action suivante)
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default IntegrationsPage;
