import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import ClientHeader from '@/components/client/ClientHeader';
import useWindowSize from '@/hooks/useWindowSize';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

const ClientLayout = () => {
  const { width } = useWindowSize();
  const isDesktop = width >= 1024;
  const { currentUser, setCurrentUser, companyLogo } = useAppContext();
  const navigate = useNavigate();
  const [sessionCheckDone, setSessionCheckDone] = useState(false);
  
  // 🔥 NOUVEAU: Vérifier et créer session Supabase si manquante
  useEffect(() => {
    const ensureSupabaseSession = async () => {
      if (!currentUser?.email) {
        setSessionCheckDone(true);
        return;
      }

      // Vérifier si session Supabase existe
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Envoyer un magic link automatiquement
        // 🔥 Utiliser le hostname actuel pour rediriger vers la bonne org
        const redirectUrl = `${window.location.origin}/dashboard`;
        
        const { error } = await supabase.auth.signInWithOtp({
          email: currentUser.email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectUrl
          }
        });
        
        if (!error) {
          toast({
            title: "📧 Activation requise",
            description: `Un lien de connexion a été envoyé à ${currentUser.email}. Cliquez dessus pour activer toutes les fonctionnalités.`,
            duration: 10000,
          });
        } else {
          logger.error('Erreur envoi magic link', { error: error.message });
        }
      }
      
      setSessionCheckDone(true);
    };

    ensureSupabaseSession();
  }, [currentUser?.email]);
  
  // 🔥 Real-time : Écouter les modifications du prospect connecté
  useEffect(() => {
    if (!currentUser?.id || !sessionCheckDone) return;

    const channel = supabase
      .channel(`prospect-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'prospects',
          filter: `id=eq.${currentUser.id}`
        },
        (payload) => {
          // Mettre à jour currentUser avec les nouvelles données
          const updatedProspect = {
            id: payload.new.id,
            userId: payload.new.user_id,
            name: payload.new.name,
            email: payload.new.email,
            phone: payload.new.phone,
            company: payload.new.company_name,
            address: payload.new.address,
            tags: payload.new.tags || [],
            status: payload.new.status,
            ownerId: payload.new.owner_id,
            hasAppointment: payload.new.has_appointment,
            affiliateName: payload.new.affiliate_name,
          };
          
          setCurrentUser(updatedProspect);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, setCurrentUser]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientHeader />
      <div className="flex flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-24 md:pb-8">
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
