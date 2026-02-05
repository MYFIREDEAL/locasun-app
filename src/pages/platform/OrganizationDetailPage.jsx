import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const OrganizationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [domains, setDomains] = useState([]);
  const [settings, setSettings] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        // Utiliser RPC platform_get_organization_detail (pas d'accès direct tables)
        const { data, error: rpcError } = await supabase.rpc(
          'platform_get_organization_detail',
          { p_org_id: id }
        );

        if (rpcError) {
          console.error('[OrganizationDetailPage] RPC error:', rpcError);
          setError(rpcError.message);
          return;
        }

        // Vérifier si erreur retournée par la RPC
        if (data?.error) {
          console.error('[OrganizationDetailPage] RPC returned error:', data.error);
          setError(data.error);
          return;
        }

        // Extraire les données
        setOrganization(data.organization || null);
        setDomains(data.domains || []);
        setSettings(data.settings || null);

        // Charger les KPIs via RPC dédiée
        const { data: kpisData, error: kpisError } = await supabase.rpc(
          'platform_get_org_kpis',
          { p_org_id: id }
        );

        if (!kpisError && kpisData && !kpisData.error) {
          setKpis(kpisData);
        }
      } catch (err) {
        console.error('[OrganizationDetailPage] Exception:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationData();
  }, [id]);

  const handleBackClick = () => {
    navigate('/platform/organizations');
  };

  const copyToClipboard = (url, type) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Lien copié',
        description: `Le lien de connexion ${type} a été copié dans le presse-papiers`,
      });
    }).catch((err) => {
      console.error('Failed to copy:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de copier le lien',
        variant: 'destructive',
      });
    });
  };

  const getProLoginUrl = (slug) => `https://evatime.fr/login?org=${slug}`;
  const getClientLoginUrl = (slug) => `https://evatime.fr/client-access?org=${slug}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div>
        <button
          onClick={handleBackClick}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Retour à la liste
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Erreur lors du chargement de l'organisation</p>
          <p className="text-red-600 text-sm mt-1">{error || 'Organisation non trouvée'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation */}
      <button
        onClick={handleBackClick}
        className="mb-6 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
      >
        <span>←</span>
        <span>Retour à la liste</span>
      </button>

      {/* Titre */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{organization.name}</h2>
        <p className="text-gray-600 mt-1">ID: {organization.id}</p>
      </div>

      <div className="space-y-6">
        {/* Section Connexion EVATIME */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Connexion à EVATIME</h3>
          </div>
          <div className="px-6 py-4">
            <div className="space-y-4">
              {/* Connexion PRO */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-2xl">🔐</div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Connexion PRO</h4>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-3 py-2 rounded border border-gray-200 flex-1 break-all">
                      {getProLoginUrl(organization.slug)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(getProLoginUrl(organization.slug), 'PRO')}
                      className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                      Copier
                    </button>
                  </div>
                </div>
              </div>

              {/* Connexion CLIENT */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-2xl">👤</div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Connexion CLIENT</h4>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-3 py-2 rounded border border-gray-200 flex-1 break-all">
                      {getClientLoginUrl(organization.slug)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(getClientLoginUrl(organization.slug), 'CLIENT')}
                      className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors whitespace-nowrap"
                    >
                      Copier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section KPIs V1 */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">📊 KPIs Platform V1</h3>
          </div>
          <div className="px-6 py-4">
            {!kpis ? (
              <p className="text-sm text-gray-500 italic">Chargement des KPIs...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{kpis.admins}</p>
                  <p className="text-xs text-blue-600 mt-1">Admins</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{kpis.prospects}</p>
                  <p className="text-xs text-green-600 mt-1">Prospects</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{kpis.projects}</p>
                  <p className="text-xs text-purple-600 mt-1">Projets</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{kpis.forms_pending}</p>
                  <p className="text-xs text-orange-600 mt-1">Formulaires en attente</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                  <p className="text-2xl font-bold text-gray-700">{kpis.files}</p>
                  <p className="text-xs text-gray-600 mt-1">Fichiers</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-4 text-center col-span-2 sm:col-span-3 lg:col-span-5">
                  <p className="text-sm font-medium text-teal-700">
                    {kpis.last_activity 
                      ? new Date(kpis.last_activity).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Aucune activité'}
                  </p>
                  <p className="text-xs text-teal-600 mt-1">Dernière activité</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section Organization */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Organisation</h3>
          </div>
          <div className="px-6 py-4">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nom</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Slug</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization.slug}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Créée le</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(organization.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Mise à jour le</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(organization.updated_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Section Domains */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Domaines ({domains.length})</h3>
          </div>
          <div className="px-6 py-4">
            {domains.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Aucun domaine configuré</p>
            ) : (
              <div className="space-y-3">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{domain.domain}</p>
                      <p className="text-xs text-gray-500">
                        Créé le {new Date(domain.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {domain.is_primary && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section Settings */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Paramètres</h3>
          </div>
          <div className="px-6 py-4">
            {!settings ? (
              <p className="text-sm text-gray-500 italic">Aucun paramètre configuré</p>
            ) : (
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Nom de marque</dt>
                  <dd className="mt-1 text-sm text-gray-900">{settings.brand_name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Logo URL</dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">{settings.logo_url || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Couleur primaire</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {settings.primary_color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: settings.primary_color }}
                        />
                        <span>{settings.primary_color}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Couleur secondaire</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {settings.secondary_color ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: settings.secondary_color }}
                        />
                        <span>{settings.secondary_color}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Créé le</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(settings.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationDetailPage;
