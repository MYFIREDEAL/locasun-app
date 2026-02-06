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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/platform/organizations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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

      {/* Actions rapides */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Actions rapides</h3>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Bouton voir toutes les orgs */}
          <button
            onClick={() => navigate('/platform/organizations')}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voir toutes les organisations
          </button>

          {/* Recherche */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une organisation..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Rechercher
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlatformHomePage;
