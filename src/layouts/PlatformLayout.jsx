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
          navigate('/client-access');
          return;
        }

        // Vérifier que l'utilisateur a le rôle platform_admin
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, role, first_name, last_name')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData || userData.role !== 'platform_admin') {
          console.error('[PlatformLayout] Access denied - not platform_admin');
          navigate('/client-access');
          return;
        }

        setPlatformUser(userData);
        setLoading(false);
      } catch (err) {
        console.error('[PlatformLayout] Error checking access:', err);
        navigate('/client-access');
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
