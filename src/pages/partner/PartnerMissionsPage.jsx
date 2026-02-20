import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, Bell, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

/**
 * /partner/missions
 * Mobile-first mission list grouped by priority
 * 🔴 CRITIQUE = is_blocking
 * 🟡 AUJOURD'HUI = créée aujourd'hui ou récente
 * ⚪ AUTRES = le reste
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

        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, company_name, email, phone, active')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partnerData) {
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

        // Uniquement les missions pending (à faire)
        const { data: missionsData, error: missionsError } = await supabase
          .from('missions')
          .select('*')
          .eq('partner_id', partnerData.id)
          .eq('status', 'pending')
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

  // Grouper les missions par priorité
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const critical = missions.filter(m => m.is_blocking);
  const todayMissions = missions.filter(m => {
    if (m.is_blocking) return false;
    const created = new Date(m.created_at);
    created.setHours(0, 0, 0, 0);
    return created.getTime() >= today.getTime();
  });
  const others = missions.filter(m => {
    if (m.is_blocking) return false;
    const created = new Date(m.created_at);
    created.setHours(0, 0, 0, 0);
    return created.getTime() < today.getTime();
  });

  // Nombre de missions pour la cloche
  const totalPending = missions.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const renderGroup = (title, items, dotColor, barColor) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <span className="text-xs font-bold text-gray-400 tracking-widest">{title}</span>
        </div>
        <div className="space-y-3">
          {items.map(m => {
            const clientName = m.client_name || m.title?.replace('Mission pour ', '') || 'Client';
            const desc = m.description || m.step_name || '—';
            return (
              <div
                key={m.id}
                className="flex items-center bg-gray-100/60 rounded-2xl overflow-hidden cursor-pointer active:bg-gray-200/60 transition-colors"
                onClick={() => navigate(`/partner/missions/${m.id}`)}
              >
                {/* Bande couleur gauche */}
                <div className={`w-1.5 self-stretch ${barColor} rounded-l-2xl shrink-0`} />
                <div className="flex-1 flex items-center gap-3 p-4 pl-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{clientName}</div>
                    <div className="text-sm text-gray-500 truncate mt-0.5">{desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Missions</h1>
          <p className="text-sm text-gray-400 mt-1">Commandé par Charly</p>
        </div>
        {totalPending > 0 && (
          <div className="relative mt-1">
            <Bell className="w-6 h-6 text-gray-400" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalPending}
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {missions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">Aucune mission en cours</p>
          <p className="text-xs text-gray-300 mt-1">Vos nouvelles missions apparaîtront ici.</p>
        </div>
      ) : (
        <>
          {renderGroup('CRITIQUE', critical, 'bg-red-500', 'bg-red-500')}
          {renderGroup("AUJOURD'HUI", todayMissions, 'bg-orange-400', 'bg-orange-400')}
          {renderGroup('AUTRES', others, 'bg-gray-300', 'bg-gray-300')}
        </>
      )}
    </div>
  );
};

export default PartnerMissionsPage;
