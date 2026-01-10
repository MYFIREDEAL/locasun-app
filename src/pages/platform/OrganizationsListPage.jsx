import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const OrganizationsListPage = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('id, name, slug, created_at')
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('[OrganizationsListPage] Error fetching organizations:', fetchError);
          setError(fetchError.message);
          return;
        }

        setOrganizations(data || []);
      } catch (err) {
        console.error('[OrganizationsListPage] Exception:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleOrganizationClick = (orgId) => {
    navigate(`/platform/organizations/${orgId}`);
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

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Erreur lors du chargement des organisations</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Organisations</h2>
        <p className="text-gray-600 mt-1">
          {organizations.length} organisation{organizations.length !== 1 ? 's' : ''} enregistrée{organizations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {organizations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">Aucune organisation trouvée</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créée le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Connexions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organizations.map((org) => (
                <tr
                  key={org.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td 
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => handleOrganizationClick(org.id)}
                  >
                    <div className="text-sm font-medium text-gray-900">{org.name}</div>
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => handleOrganizationClick(org.id)}
                  >
                    <div className="text-sm text-gray-600">{org.slug}</div>
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => handleOrganizationClick(org.id)}
                  >
                    <div className="text-sm text-gray-600">
                      {new Date(org.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(getProLoginUrl(org.slug), 'PRO');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                        title="Copier le lien de connexion PRO"
                      >
                        🔐 PRO
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(getClientLoginUrl(org.slug), 'CLIENT');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
                        title="Copier le lien de connexion CLIENT"
                      >
                        👤 CLIENT
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrganizationsListPage;
