import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const OrganizationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [domains, setDomains] = useState([]);
  const [settings, setSettings] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState(null); // 'suspend' | 'reactivate'
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Pricing states
  const [pricingPlan, setPricingPlan] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [pricingSaving, setPricingSaving] = useState(false);
  
  // EVATIME Load states
  const [evatimeLoad, setEvatimeLoad] = useState('');
  const [loadSaving, setLoadSaving] = useState(false);
  
  // EVATIME Load Auto states
  const [evatimeLoadEstimated, setEvatimeLoadEstimated] = useState(null);
  const [evatimeLoadScore, setEvatimeLoadScore] = useState(null);
  const [loadCalculating, setLoadCalculating] = useState(false);

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
      
      // Initialiser les valeurs pricing
      if (data.organization) {
        setPricingPlan(data.organization.pricing_plan || '');
        setMonthlyPrice(data.organization.monthly_price_reference || '');
        setEvatimeLoad(data.organization.evatime_load !== null ? String(data.organization.evatime_load) : '');
        setEvatimeLoadEstimated(data.organization.evatime_load_estimated);
        setEvatimeLoadScore(data.organization.evatime_load_score);
      }

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

  useEffect(() => {
    fetchOrganizationData();
  }, [id]);

  const handleBackClick = () => {
    navigate('/platform');
  };

  const openStatusDialog = (action) => {
    setStatusAction(action);
    setStatusDialogOpen(true);
  };

  const handleStatusChange = async () => {
    if (!statusAction) return;
    
    setStatusLoading(true);
    const newStatus = statusAction === 'suspend' ? 'suspended' : 'active';
    
    try {
      const { data, error: rpcError } = await supabase.rpc('platform_set_org_status', {
        p_org_id: id,
        p_status: newStatus
      });

      if (rpcError) {
        console.error('[OrganizationDetailPage] Status change RPC error:', rpcError);
        toast({
          title: 'Erreur',
          description: rpcError.message,
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Erreur',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: statusAction === 'suspend' ? 'Organisation suspendue' : 'Organisation réactivée',
        description: `L'organisation a été ${statusAction === 'suspend' ? 'suspendue' : 'réactivée'} avec succès.`,
      });

      // Rafraîchir les données
      await fetchOrganizationData();
    } catch (err) {
      console.error('[OrganizationDetailPage] Status change exception:', err);
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setStatusLoading(false);
      setStatusDialogOpen(false);
      setStatusAction(null);
    }
  };

  const handlePricingSave = async () => {
    setPricingSaving(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('platform_update_org_pricing', {
        p_org_id: id,
        p_pricing_plan: pricingPlan || null,
        p_monthly_price: monthlyPrice ? parseInt(monthlyPrice, 10) : null
      });

      if (rpcError) {
        console.error('[OrganizationDetailPage] Pricing update RPC error:', rpcError);
        toast({
          title: 'Erreur',
          description: rpcError.message,
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Erreur',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Pricing mis à jour',
        description: 'Les informations de pricing ont été enregistrées.',
      });

      // Rafraîchir les données
      await fetchOrganizationData();
    } catch (err) {
      console.error('[OrganizationDetailPage] Pricing update exception:', err);
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setPricingSaving(false);
    }
  };

  const handleLoadSave = async () => {
    setLoadSaving(true);
    try {
      const loadValue = evatimeLoad === '' ? null : parseInt(evatimeLoad, 10);
      
      const { data, error: rpcError } = await supabase.rpc('platform_update_org_load', {
        p_org_id: id,
        p_evatime_load: loadValue
      });

      if (rpcError) {
        console.error('[OrganizationDetailPage] Load update RPC error:', rpcError);
        toast({
          title: 'Erreur',
          description: rpcError.message,
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Erreur',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Charge EVATIME mise à jour',
        description: 'L\'indicateur de charge a été enregistré.',
      });

      // Rafraîchir les données
      await fetchOrganizationData();
    } catch (err) {
      console.error('[OrganizationDetailPage] Load update exception:', err);
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoadSaving(false);
    }
  };

  // Vérifier incohérence pricing/load
  const isPricingInconsistent = () => {
    const price = parseInt(monthlyPrice, 10) || 0;
    const load = parseInt(evatimeLoad, 10);
    
    if (isNaN(load) || price === 0) return false;
    
    // Incohérences simples
    if (load === 0 && price > 2000) return true;  // Léger mais > 2000€
    if (load === 1 && price > 5000) return true;  // Normal mais > 5000€
    if (load === 3 && price < 2000) return true;  // Critique mais < 2000€
    
    return false;
  };

  // Recalculer la charge automatique
  const handleRecalculateLoad = async () => {
    setLoadCalculating(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('platform_calculate_evatime_load', {
        p_org_id: id
      });

      if (rpcError) {
        console.error('[OrganizationDetailPage] Calculate load RPC error:', rpcError);
        toast({
          title: 'Erreur',
          description: rpcError.message,
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Erreur',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      // Mettre à jour les valeurs locales
      setEvatimeLoadEstimated(data.load);
      setEvatimeLoadScore(data.score);

      toast({
        title: 'Charge recalculée',
        description: `Score: ${data.score} → Niveau: ${data.load}`,
      });
    } catch (err) {
      console.error('[OrganizationDetailPage] Calculate load exception:', err);
      toast({
        title: 'Erreur',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoadCalculating(false);
    }
  };

  // Helper pour afficher le badge de charge
  const getLoadBadge = (load) => {
    switch (load) {
      case 0: return { emoji: '🟢', label: 'Léger', color: 'bg-green-100 text-green-800' };
      case 1: return { emoji: '🟡', label: 'Normal', color: 'bg-yellow-100 text-yellow-800' };
      case 2: return { emoji: '🟠', label: 'Complexe', color: 'bg-orange-100 text-orange-800' };
      case 3: return { emoji: '🔴', label: 'Critique', color: 'bg-red-100 text-red-800' };
      default: return { emoji: '⚪', label: 'Non calculé', color: 'bg-gray-100 text-gray-600' };
    }
  };

  // Calcul automatique de la charge basé sur les KPIs disponibles
  const getAutoCalculatedLoad = () => {
    // Si déjà calculé en DB, utiliser cette valeur
    if (evatimeLoadEstimated !== null && evatimeLoadEstimated !== undefined) {
      return evatimeLoadEstimated;
    }
    // Sinon, calculer à partir des KPIs
    if (!kpis) return null;
    const score = (kpis.admins || 0) * 2 + (kpis.prospects || 0) + (kpis.forms_pending || 0) * 5;
    if (score <= 15) return 0;
    if (score <= 40) return 1;
    if (score <= 70) return 2;
    return 3;
  };

  // Charge effective (auto-calculée)
  const effectiveLoad = getAutoCalculatedLoad();

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

      {/* Titre + Gouvernance */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-900">{organization.name}</h2>
              {/* Badge de statut */}
              {organization.status === 'suspended' ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  🔴 Suspendue
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  🟢 Active
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">ID: {organization.id}</p>
          </div>
          
          {/* Bouton Suspendre / Réactiver */}
          <div>
            {organization.status === 'suspended' ? (
              <button
                onClick={() => openStatusDialog('reactivate')}
                disabled={statusLoading}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                {statusLoading ? 'En cours...' : '✅ Réactiver'}
              </button>
            ) : (
              <button
                onClick={() => openStatusDialog('suspend')}
                disabled={statusLoading}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {statusLoading ? 'En cours...' : '⛔ Suspendre'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AlertDialog de confirmation */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusAction === 'suspend' 
                ? 'Suspendre cette organisation ?' 
                : 'Réactiver cette organisation ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusAction === 'suspend'
                ? 'Les utilisateurs de cette organisation ne pourront plus accéder à la plateforme.'
                : 'Les utilisateurs de cette organisation pourront à nouveau accéder à la plateforme.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              disabled={statusLoading}
              className={statusAction === 'suspend' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'}
            >
              {statusLoading 
                ? 'En cours...' 
                : statusAction === 'suspend' ? 'Suspendre' : 'Réactiver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

        {/* Section Pricing (interne) */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">💰 Pricing (interne)</h3>
          </div>
          <div className="px-6 py-4">
            {/* Badge info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                ℹ️ Indicateur interne – aucune facturation automatique
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select pricing_plan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan tarifaire
                </label>
                <select
                  value={pricingPlan}
                  onChange={(e) => setPricingPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Non défini --</option>
                  <option value="standard">Standard</option>
                  <option value="custom">Custom</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              {/* Input monthly_price_reference */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix mensuel de référence (€)
                </label>
                <input
                  type="number"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  placeholder="490 / 1500 / 3000 / 10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Bouton Save */}
            <div className="mt-4">
              <button
                onClick={handlePricingSave}
                disabled={pricingSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {pricingSaving ? 'Enregistrement...' : 'Enregistrer le pricing'}
              </button>
            </div>
          </div>
        </div>

        {/* Section Charge EVATIME (auto) */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🤖 Charge EVATIME (auto)</h3>
          </div>
          <div className="px-6 py-4">
            {/* Helper text */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                Calculée automatiquement à partir de l'activité réelle.
              </p>
            </div>
            
            {/* Badge de charge */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getLoadBadge(effectiveLoad).emoji}</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getLoadBadge(effectiveLoad).color}`}>
                  {getLoadBadge(effectiveLoad).label}
                </span>
              </div>
              {kpis && (
                <span className="text-sm text-gray-500">
                  Score: {(kpis.admins || 0) * 2 + (kpis.prospects || 0) + (kpis.forms_pending || 0) * 5}
                </span>
              )}
            </div>
            
            {/* Bouton Recalculer */}
            <button
              onClick={handleRecalculateLoad}
              disabled={loadCalculating}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loadCalculating ? 'Calcul en cours...' : '🔄 Recalculer'}
            </button>
          </div>
        </div>

        {/* Section Prix recommandé (indicatif) */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">💰 Prix recommandé (indicatif)</h3>
          </div>
          <div className="px-6 py-4">
            {/* Helper text */}
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Basé sur la charge observée. Aucun changement automatique.
              </p>
            </div>
            
            {/* Prix recommandé */}
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-lg font-semibold text-blue-800">
                  {(() => {
                    const PRICE_BY_LOAD = {
                      0: '≈ 490 € / mois',
                      1: '≈ 1 500 € / mois',
                      2: '≈ 3 000 € / mois',
                      3: 'Sur engagement'
                    };
                    return PRICE_BY_LOAD[effectiveLoad] || 'Non calculé';
                  })()}
                </p>
              </div>
            </div>
            
            {/* Alerte incohérence */}
            {(() => {
              const price = parseInt(monthlyPrice, 10) || 0;
              const load = effectiveLoad;
              const expectedPrices = { 0: 490, 1: 1500, 2: 3000, 3: 5000 };
              const expected = expectedPrices[load];
              if (load === null || load === undefined || price === 0 || !expected) return null;
              const diff = Math.abs(price - expected) / expected;
              if (diff > 0.5) {
                return (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <p className="text-sm text-orange-700">
                      Prix actuel très différent de la charge observée.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
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
