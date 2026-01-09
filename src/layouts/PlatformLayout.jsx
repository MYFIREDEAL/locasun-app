import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const PlatformLayout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [platformUser, setPlatformUser] = useState(null);

  useEffect(() => {
    const checkPlatformAccess = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.log('[PlatformLayout] Non authentifié, redirect /platform-login');
          navigate('/platform-login');
          return;
        }

        // Vérifier que l'utilisateur a le rôle platform_admin
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData) {
          console.error('[PlatformLayout] Utilisateur non trouvé dans public.users');
          navigate('/platform-login');
          return;
        }

        if (userData.role !== 'platform_admin') {
          console.error('[PlatformLayout] Access denied - role:', userData.role);
          setLoading(false);
          setPlatformUser(null); // Afficher message refus
          return;
        }

        setPlatformUser(userData);
        setLoading(false);
      } catch (err) {
        console.error('[PlatformLayout] Error checking access:', err);
        navigate('/platform-login');
      }
    };

    checkPlatformAccess();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Vérification des accès plateforme...</p>
        </div>
      </div>
    );
  }

  // Message de refus si connecté mais pas platform_admin
  if (!platformUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h2>
          <p className="text-gray-600 mb-6">
            Votre compte n'a pas les permissions nécessaires pour accéder à la plateforme EVATIME.
            Seuls les utilisateurs avec le rôle <span className="font-mono font-semibold">platform_admin</span> peuvent y accéder.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/platform-login');
            }}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded hover:bg-gray-800 transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header simple sans branding */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">EVATIME Platform</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {platformUser?.first_name} {platformUser?.last_name}
              </span>
              <span className="text-xs bg-gray-900 text-white px-2 py-1 rounded">
                Platform Admin
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default PlatformLayout;
