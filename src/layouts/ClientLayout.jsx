import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import ClientHeader from '@/components/client/ClientHeader';
import MobileBottomNav from '@/components/client/MobileBottomNav';
import useWindowSize from '@/hooks/useWindowSize';
import { useAppContext } from '@/App';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import ModuleBoundary from '@/components/ModuleBoundary';
import { usePWAManifest, isPWAInstalled } from '@/hooks/usePWAManifest';
import InstallPWAPrompt from '@/components/client/InstallPWAPrompt';
import NotificationOptIn from '@/components/client/NotificationOptIn';
import { useOrganization } from '@/contexts/OrganizationContext';

const ClientLayout = () => {
  const { width } = useWindowSize();
  const isDesktop = width >= 1024;
  const isMobile = width < 768;
  const { currentUser, setCurrentUser, companyLogo, brandName, logoUrl, mobileLogoUrl, primaryColor, authLoading } = useAppContext();
  const { organizationId } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessionCheckDone, setSessionCheckDone] = useState(false);

  // 📱 PWA : Manifest dynamique avec branding de l'org (mobileLogoUrl prioritaire sur logoUrl)
  usePWAManifest({ brandName, logoUrl, mobileLogoUrl, primaryColor });

  // 🔴 PWA : Effacer le badge app (pastille rouge sur l'icône) quand le client ouvre l'app
  useEffect(() => {
    if (navigator && navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [location.pathname]); // Se déclenche à chaque navigation

  // 🔇 PRESENCE: Dire au serveur si l'app est active (pour décider côté serveur d'envoyer le push)
  useEffect(() => {
    if (!currentUser?.id) return;

    const updatePresence = async (active) => {
      try {
        await supabase.from('user_presence').upsert({
          prospect_id: currentUser.id,
          is_active: active,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'prospect_id' });
      } catch (err) {
        // Non bloquant — si ça échoue, le push sera envoyé (fallback safe)
      }
    };

    // Marquer actif immédiatement
    updatePresence(true);

    // Heartbeat toutes les 25s quand visible (fenetre 45s cote trigger)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence(true);
      }
    }, 25000);

    // Quand l'app passe en arrière-plan → marquer inactif
    const handleVisibility = () => {
      updatePresence(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Marquer inactif en quittant
      updatePresence(false);
    };
  }, [currentUser?.id]);

  // 📱 PWA SANS SESSION → Rediriger vers /client-access (flow OTP)
  useEffect(() => {
    if (authLoading) return; // Attendre que l'auth soit résolue
    if (currentUser) return; // Déjà connecté → OK

    // Pas de session : vérifier Supabase directement
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && isPWAInstalled()) {
        logger.info('[ClientLayout] PWA sans session → redirect /client-access (OTP)');
        navigate('/client-access', { replace: true });
      } else if (!session) {
        logger.info('[ClientLayout] Browser sans session → redirect /client-access');
        navigate('/client-access', { replace: true });
      }
    });
  }, [authLoading, currentUser]);

  // Cacher header + bottom nav quand on est dans le chat d'un projet (MobileChatProjectPage gère tout)
  const isChatProjectPage = /\/chat\/[^/]+/.test(location.pathname);
  // Cacher bottom nav sur la page offre détail (elle a son propre CTA sticky)
  const isOfferDetailPage = /\/offres\/[^/]+/.test(location.pathname);
  
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
        // � PWA: rediriger vers /open-app pour guider vers la PWA installée
        const redirectUrl = `${window.location.origin}/open-app?redirect=/dashboard`;
        
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
    <div className={`min-h-screen flex flex-col ${isChatProjectPage ? 'bg-white' : 'bg-background'}`}>
      {/* Header complet sur desktop, mini header (logo seul) sur mobile — masqué dans le chat projet */}
      {!isChatProjectPage && <ClientHeader />}
      {isChatProjectPage ? (
        <Outlet />
      ) : (
        <div className="flex flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 pb-28 md:pb-8">
          <main className="flex-1 min-w-0">
            <ModuleBoundary name="Espace Client">
              <Outlet />
            </ModuleBoundary>
          </main>
        </div>
      )}
      {/* 📱 Bannière installation PWA — uniquement mobile, pas dans le chat */}
      {isMobile && !isChatProjectPage && !isOfferDetailPage && (
        <InstallPWAPrompt brandName={brandName} logoUrl={logoUrl} isMobile={isMobile} />
      )}
      {/* 🔔 Soft prompt push notifications — uniquement mobile, après X visites, pas si PWA install prompt visible */}
      {isMobile && !isChatProjectPage && !isOfferDetailPage && currentUser?.id && (
        <NotificationOptIn 
          prospectId={currentUser.id} 
          organizationId={organizationId} 
          brandName={brandName} 
          isMobile={isMobile} 
        />
      )}
      {/* Bottom nav mobile — masqué dans le chat projet et la page offre détail */}
      {isMobile && !isOfferDetailPage && <MobileBottomNav />}
    </div>
  );
};

export default ClientLayout;
