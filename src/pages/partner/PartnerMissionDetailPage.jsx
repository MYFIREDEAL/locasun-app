import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Phone, MessageCircle, MapPin, Mail } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

/**
 * /partner/missions/:missionId
 * - Shows mission details
 * - Shows client brief
 * - Renders questions if present (boolean/text)
 * - Allows partner to VALIDATE or mark IMPOSSIBLE (blocked)
 * - Saves responses + comment into partner_notes JSON
 */
const PartnerMissionDetailPage = () => {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState(null);
  const [client, setClient] = useState(null);
  const [responses, setResponses] = useState({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

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

        // Récupérer partenaire
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, active')
          .eq('user_id', user.id)
          .single();

        if (partnerError || !partnerData) {
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        if (!partnerData.active) {
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        // Récupérer la mission et vérifier qu'elle appartient au partenaire
        const { data: missionData, error: missionError } = await supabase
          .from('missions')
          .select('*')
          .eq('id', missionId)
          .single();

        if (missionError || !missionData) {
          toast({ title: 'Erreur', description: 'Mission introuvable.', variant: 'destructive' });
          navigate('/partner/missions');
          return;
        }

        if (missionData.partner_id !== partnerData.id) {
          // Tentative d'accès non autorisé
          logger.warn('Accès mission non autorisé', { missionId, userId: user.id });
          await supabase.auth.signOut();
          navigate('/partner/login');
          return;
        }

        if (!mounted) return;
        setMission(missionData);

        // Charger client (prospect) minimal
        const { data: prospectData } = await supabase
          .from('prospects')
          .select('id, name, email, phone, address')
          .eq('id', missionData.prospect_id)
          .maybeSingle();

        if (mounted) setClient(prospectData || null);

        // Préparer questions si présentes (champ JSON dans partner_notes? ou questions)
        // On tente de récupérer `questions` si la colonne existe, sinon on ignore
        const qs = missionData.questions || missionData.payload || null;
        if (qs && typeof qs === 'object') {
          // init responses with defaults
          const init = {};
          qs.forEach((q, idx) => {
            init[q.id || idx] = q.type === 'boolean' ? null : (q.default || '');
          });
          setResponses(init);
        }

      } catch (err) {
        logger.error('PartnerMissionDetail load error', { err: err.message });
        toast({ title: 'Erreur', description: "Impossible de charger la mission.", variant: 'destructive' });
        navigate('/partner/missions');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [missionId, navigate]);

  const handleBack = () => navigate('/partner/missions');

  const handleAnswerChange = (key, value) => {
    setResponses(prev => ({ ...prev, [key]: value }));
  };

  const saveResult = async (newStatus) => {
    try {
      setSaving(true);

      // For 'blocked' (impossible) require comment
      if (newStatus === 'blocked' && (!comment || comment.trim() === '')) {
        toast({ title: 'Commentaire requis', description: 'Veuillez fournir un commentaire.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Prepare partner_notes payload
      const payload = {
        responses,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      };

      const updates = {
        status: newStatus,
        partner_notes: JSON.stringify(payload),
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', mission.id)
        .select()
        .single();

      if (error) throw error;

      toast({ title: '✅ Enregistré', description: 'Votre réponse a été sauvegardée.', className: 'bg-green-500 text-white' });
      navigate('/partner/missions');
    } catch (err) {
      logger.error('PartnerMissionDetail save error', { err: err.message });
      toast({ title: 'Erreur', description: "Impossible d'enregistrer la mission.", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleActionClick = (action) => {
    const clientData = {
      name: mission?.client_name || mission?.title?.replace('Mission pour ', '') || client?.name || '—',
      phone: mission?.phone || client?.phone,
      email: mission?.email || client?.email,
      address: mission?.address || client?.address,
    };

    switch (action) {
      case 'Appel':
        if (clientData.phone) window.location.href = `tel:${clientData.phone}`;
        break;
      case 'Mail':
        if (clientData.email) window.location.href = `mailto:${clientData.email}`;
        break;
      case 'WhatsApp':
        if (clientData.phone) {
          const phoneNumber = clientData.phone.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/${phoneNumber}`, '_blank');
        } else {
          toast({
            title: 'Numéro manquant',
            description: "Ce client n'a pas de numéro de téléphone.",
            variant: 'destructive',
          });
        }
        break;
      case 'GPS':
        if (clientData.address) {
          const encodedAddress = encodeURIComponent(clientData.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-4">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!mission) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <header className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{mission.title}</h2>
            <p className="text-sm text-gray-500">{mission.step_name || mission.project_type}</p>
          </div>
        </header>

        {/* Client block - Actions rapides style ProspectDetailsAdmin */}
        <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="flex flex-wrap justify-between gap-2 text-center">
            {[
              { icon: Phone, label: 'Appel' },
              { icon: Mail, label: 'Mail' },
              { icon: MessageCircle, label: 'WhatsApp' },
              { icon: MapPin, label: 'GPS' },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => handleActionClick(label)}
                className="flex flex-col items-center space-x-1 transition-colors group text-gray-600 hover:text-blue-600"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Instruction */}
        <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <Label className="text-xs text-gray-500">ORDRE EVATIME</Label>
          <div className="mt-2 font-medium text-gray-900">Instruction</div>
          <p className="text-sm text-gray-600 mt-2">{mission.description || '—'}</p>
        </section>

        {/* Questions block (if any) */}
        {(mission.questions || mission.payload) ? (
          <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
            <Label className="text-xs text-gray-500">Merci de confirmer les éléments suivants</Label>
            <div className="mt-3 space-y-3">
              {(mission.questions || mission.payload).map((q, idx) => (
                <div key={q.id || idx} className="space-y-2">
                  <div className="font-medium text-gray-900">{q.label}</div>
                  {q.type === 'boolean' ? (
                    <div className="flex items-center gap-3 mt-2">
                      <button onClick={() => handleAnswerChange(q.id || idx, true)} className={`px-3 py-2 rounded ${responses[q.id || idx] === true ? 'bg-green-50 border' : 'bg-gray-50'}`}>Oui</button>
                      <button onClick={() => handleAnswerChange(q.id || idx, false)} className={`px-3 py-2 rounded ${responses[q.id || idx] === false ? 'bg-red-50 border' : 'bg-gray-50'}`}>Non</button>
                    </div>
                  ) : (
                    <input type="text" value={responses[q.id || idx] || ''} onChange={(e) => handleAnswerChange(q.id || idx, e.target.value)} className="w-full px-3 py-2 border rounded" />
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Comment */}
        <section className="bg-white rounded-xl p-4 shadow-sm border mb-4">
          <Label className="text-xs text-gray-500">Commentaire (optionnel)</Label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full mt-2 px-3 py-2 border rounded min-h-[80px]" />
          <p className="text-xs text-gray-400 mt-2">Le commentaire devient requis si vous marquez la mission comme impossible.</p>
        </section>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => saveResult('blocked')} className="flex-1 border">IMPOSSIBLE À RÉALISER</Button>
          <Button onClick={() => saveResult('completed')} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">VALIDER LA MISSION</Button>
        </div>

      </div>
    </div>
  );
};

export default PartnerMissionDetailPage;
