import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Clock, XCircle, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * /partner/preuves
 * Registre — 3 sections accordéon avec compteurs :
 *   ⏳ En attente de validation (X)
 *   ✅ Validées (X)
 *   ❌ Refusées (X)
 * Clic sur le header → déplie/replie la liste
 */
const PartnerProofsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [openSections, setOpenSections] = useState({ submitted: true, completed: false, blocked: false });

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

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const submitted = missions.filter(m => m.status === 'submitted');
  const completed = missions.filter(m => m.status === 'completed');
  const blocked = missions.filter(m => m.status === 'blocked');

  const isEmpty = missions.length === 0;

  const sections = [
    {
      key: 'submitted',
      label: 'En attente de validation',
      count: submitted.length,
      items: submitted,
      dotColor: 'bg-orange-500',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-700',
      icon: Clock,
      iconColor: 'text-orange-500',
    },
    {
      key: 'completed',
      label: 'Validées',
      count: completed.length,
      items: completed,
      dotColor: 'bg-green-500',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-700',
      icon: CheckCircle,
      iconColor: 'text-green-500',
    },
    {
      key: 'blocked',
      label: 'Refusées',
      count: blocked.length,
      items: blocked,
      dotColor: 'bg-red-500',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-700',
      icon: XCircle,
      iconColor: 'text-red-500',
    },
  ];

  const renderMissionItem = (mission, section) => {
    const clientName = mission.client_name || mission.title?.replace('Mission pour ', '') || 'Client';
    const stepName = mission.step_name || mission.project_type || '';

    return (
      <div
        key={mission.id}
        className="flex items-center gap-3 bg-white rounded-xl p-3 cursor-pointer active:bg-gray-50 transition-colors"
        onClick={() => navigate(`/partner/missions/${mission.id}`)}
      >
        <div className={`w-9 h-9 rounded-full ${section.badgeBg} flex items-center justify-center shrink-0`}>
          <section.icon className={`w-4 h-4 ${section.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm truncate">{clientName}</div>
          {stepName && (
            <div className="text-xs text-gray-400 truncate mt-0.5">{stepName}</div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </div>
    );
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-black text-gray-900">Registre</h1>

      {isEmpty ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Aucune preuve pour le moment.</p>
          <p className="text-xs text-gray-300 mt-1">Vos missions soumises apparaîtront ici.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {sections.map((section) => {
            const isOpen = openSections[section.key];
            return (
              <div key={section.key} className="bg-gray-100/60 rounded-2xl overflow-hidden">
                {/* Header accordéon — toujours visible */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-200/60 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${section.dotColor}`} />
                    <span className="text-sm font-semibold text-gray-900">{section.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${section.badgeBg} ${section.badgeText}`}>
                      {section.count}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {/* Contenu dépliable */}
                {isOpen && section.items.length > 0 && (
                  <div className="px-3 pb-3 space-y-2">
                    {section.items.map((m) => renderMissionItem(m, section))}
                  </div>
                )}

                {isOpen && section.items.length === 0 && (
                  <div className="px-4 pb-4 text-center">
                    <p className="text-xs text-gray-400">Aucune mission dans cette catégorie.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PartnerProofsPage;
