import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, ChevronRight, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * /partner/contacts
 * Annuaire en consultation seule — le partenaire voit les prospects liés à ses missions
 * (Grâce à la RLS policy partners_can_read_mission_prospects)
 */
const PartnerContactsPage = () => {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Récupérer le partenaire
        const { data: partner } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!partner) return;

        // Récupérer les missions avec prospect_id
        const { data: missions } = await supabase
          .from('missions')
          .select('prospect_id')
          .eq('partner_id', partner.id);

        if (!missions?.length) {
          setContacts([]);
          setLoading(false);
          return;
        }

        // IDs uniques de prospects
        const prospectIds = [...new Set(missions.map(m => m.prospect_id).filter(Boolean))];

        // Récupérer les prospects (autorisé par la RLS policy)
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
            return (
              <div
                key={contact.id}
                className="flex items-center gap-3 bg-gray-100/60 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{contact.name || '—'}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide truncate">{subLabel}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PartnerContactsPage;
