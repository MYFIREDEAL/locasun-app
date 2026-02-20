import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * /partner/contacts
 * Annuaire :
 *  - 1 mission → clic = navigation directe
 *  - 2+ missions → clic = accordéon pour choisir
 */
const PartnerContactsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [missions, setMissions] = useState([]);
  const [search, setSearch] = useState('');
  const [openContactId, setOpenContactId] = useState(null);

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
          .order('created_at', { ascending: false });

        setMissions(missionsData || []);

        if (!missionsData?.length) {
          setContacts([]);
          setLoading(false);
          return;
        }

        const prospectIds = [...new Set(missionsData.map(m => m.prospect_id).filter(Boolean))];

        const { data: prospects } = await supabase
          .from('prospects')
          .select('id, name, email, phone, address')
          .in('id', prospectIds);

        setContacts(prospects || []);
      } catch (err) {
        logger.error('PartnerContactsPage load error', { err: err.message });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  const getMissionsForContact = (contactId) => missions.filter(m => m.prospect_id === contactId);

  const handleContactClick = (contact) => {
    const contactMissions = getMissionsForContact(contact.id);
    if (contactMissions.length === 1) {
      // 1 mission → direct
      navigate(`/partner/missions/${contactMissions[0].id}`);
    } else {
      // 2+ missions → toggle accordéon
      setOpenContactId(prev => prev === contact.id ? null : contact.id);
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'pending': return { text: 'À faire', cls: 'bg-orange-100 text-orange-700' };
      case 'completed': return { text: 'Validée', cls: 'bg-green-100 text-green-700' };
      case 'submitted': return { text: 'En attente', cls: 'bg-blue-100 text-blue-700' };
      case 'blocked': return { text: 'Refusée', cls: 'bg-red-100 text-red-700' };
      default: return { text: status, cls: 'bg-gray-100 text-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-black text-gray-900">Annuaire</h1>
      <p className="text-sm text-gray-400 italic mt-1">Consultation seule</p>

      {/* Barre de recherche */}
      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client ou contact..."
          className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Liste des contacts */}
      <div className="mt-5 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Aucun contact trouvé.</p>
          </div>
        ) : (
          filtered.map(contact => {
            const initial = (contact.name || '?')[0].toUpperCase();
            const subLabel = contact.email || contact.phone || '—';
            const contactMissions = getMissionsForContact(contact.id);
            const hasMultiple = contactMissions.length > 1;
            const isOpen = openContactId === contact.id;

            return (
              <div key={contact.id} className="bg-gray-100/60 rounded-2xl overflow-hidden">
                {/* Header contact */}
                <div
                  onClick={() => handleContactClick(contact)}
                  className="flex items-center gap-3 p-4 cursor-pointer active:bg-gray-200/60 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{contact.name || '—'}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide truncate">{subLabel}</div>
                  </div>
                  {hasMultiple && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                      {contactMissions.length}
                    </span>
                  )}
                  {hasMultiple ? (
                    <ChevronDown className={`w-4 h-4 text-gray-300 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  )}
                </div>

                {/* Accordéon missions (2+ seulement) */}
                {hasMultiple && isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {contactMissions.map(m => {
                      const st = statusLabel(m.status);
                      const desc = m.step_name || m.description || m.project_type || '—';
                      return (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 bg-white rounded-xl p-3 cursor-pointer active:bg-gray-50 transition-colors"
                          onClick={() => navigate(`/partner/missions/${m.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{desc}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls} shrink-0`}>
                            {st.text}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PartnerContactsPage;
