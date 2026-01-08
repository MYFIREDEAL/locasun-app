import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const OrganizationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [domains, setDomains] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        // Charger organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', id)
          .single();

        if (orgError) {
          console.error('[OrganizationDetailPage] Error fetching organization:', orgError);
          setError(orgError.message);
          return;
        }

        setOrganization(orgData);

        // Charger domains
        const { data: domainsData, error: domainsError } = await supabase
          .from('organization_domains')
          .select('*')
          .eq('organization_id', id)
          .order('created_at', { ascending: false });

        if (domainsError) {
          console.error('[OrganizationDetailPage] Error fetching domains:', domainsError);
        } else {
          setDomains(domainsData || []);
        }

        // Charger settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('[OrganizationDetailPage] Error fetching settings:', settingsError);
        } else {
          setSettings(settingsData);
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
