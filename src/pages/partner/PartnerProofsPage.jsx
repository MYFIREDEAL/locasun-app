import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Clock, XCircle, ChevronRight, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * /partner/preuves
 * Registre — Missions envoyées/validées/refusées par l'admin
 * - submitted = en attente de validation
 * - completed (approved) = validées
 * - blocked (rejected) = refusées → notification + retour missions
 */
const PartnerProofsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: partner } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!partner) return;

        // Récupérer les missions terminées/envoyées (pas pending)
        const { data: missionsData } = await supabase
          .from('missions')
          .select('*')
          .eq('partner_id', partner.id)
          .in('status', ['completed', 'blocked', 'submitted'])
          .order('updated_at', { ascending: false });

        setMissions(missionsData || []);
      } catch (err) {
        logger.error('PartnerProofsPage load error', { err: err.message });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Grouper par statut
  const submitted = missions.filter(m => m.status === 'submitted');
  const completed = missions.filter(m => m.status === 'completed');
  const blocked = missions.filter(m => m.status === 'blocked');

  const statusConfig = {
    submitted: { label: 'EN ATTENTE', color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock },
    completed: { label: 'VALIDÉ', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
    blocked: { label: 'REFUSÉ', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
  };

  const renderMissionItem = (mission) => {
    const cfg = statusConfig[mission.status] || statusConfig.submitted;
    const StatusIcon = cfg.icon;
    const clientName = mission.client_name || mission.title?.replace('Mission pour ', '') || 'Client';
    const stepName = mission.step_name || mission.project_type || '';

    return (
      <div
        key={mission.id}
        className="flex items-center gap-3 bg-gray-100/60 rounded-2xl p-4 cursor-pointer active:bg-gray-200/60 transition-colors"
        onClick={() => navigate(`/partner/missions/${mission.id}`)}
      >
        <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
          <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{clientName}</div>
          <div className={`text-xs uppercase tracking-wide ${cfg.color} font-medium`}>
            {stepName ? `${stepName} — ` : ''}{cfg.label}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </div>
    );
  };

  const isEmpty = missions.length === 0;

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-black text-gray-900">Registre</h1>

      {isEmpty ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucune preuve pour le moment.</p>
          <p className="text-xs text-gray-300 mt-1">Vos missions validées apparaîtront ici.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* En attente */}
          {submitted.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs font-bold text-gray-400 tracking-widest">EN ATTENTE DE VALIDATION</span>
              </div>
              <div className="space-y-3">
                {submitted.map(renderMissionItem)}
              </div>
            </div>
          )}

          {/* Validées */}
          {completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-bold text-gray-400 tracking-widest">VALIDÉES</span>
              </div>
              <div className="space-y-3">
                {completed.map(renderMissionItem)}
              </div>
            </div>
          )}

          {/* Refusées */}
          {blocked.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-bold text-gray-400 tracking-widest">REFUSÉES</span>
              </div>
              <div className="space-y-3">
                {blocked.map(renderMissionItem)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnerProofsPage;
