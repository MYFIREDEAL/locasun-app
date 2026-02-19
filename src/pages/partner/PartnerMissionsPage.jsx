import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

/**
 * /partner/missions
 * Mobile-first, EVATIME style list of missions for the current partner
 * - Fetch partner by auth.user.id
 * - Fetch missions for that partner
 * - Show cards: client name, short instruction, badges (is_blocking, status)
 * - Tap card -> /partner/missions/:missionId
 */
const PartnerMissionsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          navigate('/partner/login');
          return;
        }

        // Récupérer le partenaire lié à cet user
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, company_name, email, phone, active')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partnerData) {
          // Not a partner – force logout
          logger.warn('PartnerMissionsPage: utilisateur non-partenaire', { userId: user.id });
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        if (!partnerData.active) {
          await supabase.auth.signOut();
          toast({ title: 'Compte désactivé', description: 'Votre compte partenaire est désactivé.', variant: 'destructive' });
          navigate('/partner/login');
          return;
        }

        if (!mounted) return;
        setPartner(partnerData);

        // Récupérer les missions pour ce partenaire
        const { data: missionsData, error: missionsError } = await supabase
          .from('missions')
          .select(`
            id, 
            title, 
            description, 
            status, 
            is_blocking, 
            prospect_id, 
            created_at,
            prospects!inner(name, email, phone)
          `)
          .eq('partner_id', partnerData.id)
          .order('created_at', { ascending: false });

        if (missionsError) throw missionsError;

        if (!mounted) return;
        setMissions(missionsData || []);
      } catch (err) {
        logger.error('PartnerMissionsPage load error', { err: err.message });
        toast({ title: 'Erreur', description: "Impossible de charger les missions.", variant: 'destructive' });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => { mounted = false; };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Chargement des demandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Missions</h1>
          <p className="text-sm text-gray-600 mt-1">Demandes en cours</p>
        </div>

        {missions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <p className="text-gray-500">Aucune mission pour le moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {missions.map(m => (
              <article
                key={m.id}
                className="bg-white rounded-xl shadow-sm border p-4 cursor-pointer"
                onClick={() => navigate(`/partner/missions/${m.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">Client</div>
                    <div className="font-semibold text-gray-900 mt-1">{m.prospects?.name || m.title || 'Client'}</div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{m.description || '—'}</p>
                  </div>
                  <div className="ml-3 flex flex-col items-end space-y-2">
                    {m.is_blocking && (
                      <Badge className="bg-red-50 text-red-700 border-red-100">Bloquante</Badge>
                    )}
                    <Badge className={`mt-2 ${m.status === 'completed' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                      {m.status}
                    </Badge>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnerMissionsPage;
