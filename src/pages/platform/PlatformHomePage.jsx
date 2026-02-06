import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

const PlatformHomePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [signals, setSignals] = useState({ lowPricing: [], churnRisk: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [allOrgs, setAllOrgs] = useState([]);

  // Filtrer les organisations selon la recherche
  const filteredOrgs = allOrgs.filter(org => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      org.name?.toLowerCase().includes(query) ||
      org.slug?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    const fetchHomeKpis = async () => {
      try {
        const { data, error } = await supabase.rpc('platform_get_home_kpis');

        if (error) {
          console.error('[PlatformHomePage] RPC error:', error);
          toast({
            title: 'Erreur',
            description: error.message,
            variant: 'destructive',
          });
          return;
        }

        if (data?.error) {
          console.error('[PlatformHomePage] RPC returned error:', data.error);
          toast({
            title: 'Erreur',
            description: data.error,
            variant: 'destructive',
          });
          return;
        }

        setKpis({
          orgsActive: data.orgs_active || 0,
          orgsSuspended: data.orgs_suspended || 0,
          revenueEstimate: data.revenue_estimate || 0,
        });

        // Calculer les signaux business
        const orgsData = data.orgs_data || [];
        setAllOrgs(orgsData);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Low pricing avec forte activité (pricing < 1000, activité récente)
        const lowPricing = orgsData.filter(org => {
          const price = org.monthly_price_reference || 0;
          const hasRecentActivity = org.last_activity && new Date(org.last_activity) > thirtyDaysAgo;
          const hasProspects = org.prospects_count > 5;
          return price > 0 && price < 1000 && (hasRecentActivity || hasProspects);
        });

        // Churn risk (pricing élevé avec faible activité)
        const churnRisk = orgsData.filter(org => {
          const price = org.monthly_price_reference || 0;
          const hasNoRecentActivity = !org.last_activity || new Date(org.last_activity) < thirtyDaysAgo;
          const lowProspects = org.prospects_count < 3;
          return price >= 1000 && hasNoRecentActivity && lowProspects;
        });

        setSignals({ lowPricing, churnRisk });
      } catch (err) {
        console.error('[PlatformHomePage] Exception:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeKpis();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">🏠 Platform Dashboard</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de l'activité EVATIME</p>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🟢</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{kpis?.orgsActive || 0}</p>
              <p className="text-sm text-gray-600">Organisations actives</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔴</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{kpis?.orgsSuspended || 0}</p>
              <p className="text-sm text-gray-600">Organisations suspendues</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {(kpis?.revenueEstimate || 0).toLocaleString('fr-FR')} €
              </p>
              <p className="text-sm text-gray-600">Revenu mensuel estimé</p>
            </div>
          </div>
        </div>
      </div>

      {/* Signaux business */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low pricing avec forte activité */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-orange-50 border-b border-orange-200">
            <h3 className="text-lg font-semibold text-orange-800">
              ⚠️ À revoir (pricing &lt; 1000€ avec activité)
            </h3>
          </div>
          <div className="px-6 py-4">
            {signals.lowPricing.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Aucun signal</p>
            ) : (
              <ul className="space-y-2">
                {signals.lowPricing.slice(0, 5).map(org => (
                  <li key={org.id} className="flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/platform/organizations/${org.id}`)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {org.name}
                    </button>
                    <span className="text-xs text-gray-500">
                      {org.monthly_price_reference?.toLocaleString('fr-FR') || 0} € • {org.prospects_count} prospects
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Churn risk */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200">
            <h3 className="text-lg font-semibold text-red-800">
              ⚠️ Risque churn (pricing élevé, faible activité)
            </h3>
          </div>
          <div className="px-6 py-4">
            {signals.churnRisk.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Aucun signal</p>
            ) : (
              <ul className="space-y-2">
                {signals.churnRisk.slice(0, 5).map(org => (
                  <li key={org.id} className="flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/platform/organizations/${org.id}`)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {org.name}
                    </button>
                    <span className="text-xs text-gray-500">
                      {org.monthly_price_reference?.toLocaleString('fr-FR') || 0} € • {org.prospects_count} prospects
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Liste des organisations */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Organisations</h3>
            <p className="text-sm text-gray-500">{allOrgs.length} organisation{allOrgs.length > 1 ? 's' : ''} enregistrée{allOrgs.length > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => navigate('/platform/organizations?action=create')}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <span>+</span> Créer une organisation
          </button>
        </div>

        {/* Search bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, slug..."
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pricing</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Users</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Prospects</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Connexions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {searchQuery ? 'Aucune organisation trouvée' : 'Aucune organisation'}
                  </td>
                </tr>
              ) : (
                filteredOrgs.map(org => (
                  <tr key={org.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/platform/organizations/${org.id}`)}>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{org.name}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{org.slug}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {org.status === 'active' ? '✓ Actif' : '⏸ Suspendu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {org.monthly_price_reference ? (
                        <span className="text-gray-900 font-medium">{org.monthly_price_reference.toLocaleString('fr-FR')} €</span>
                      ) : (
                        <span className="text-gray-400 italic">Non défini</span>
                      )}
                      {org.pricing_plan && (
                        <span className="ml-2 text-xs text-gray-500">({org.pricing_plan})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{org.users_count || 0}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{org.prospects_count || 0}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => window.open(`https://evatime.fr/admin?org=${org.slug}`, '_blank')}
                          className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition-colors"
                        >
                          👤 PRO
                        </button>
                        <button
                          onClick={() => window.open(`https://evatime.fr/dashboard?org=${org.slug}`, '_blank')}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          👤 CLIENT
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlatformHomePage;
