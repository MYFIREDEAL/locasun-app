// CORRECTION À AJOUTER DANS App.jsx LIGNE 328
// Remplacer le useEffect onAuthStateChange par celui-ci :

useEffect(() => {
  // 🔥 MAGIC LINK: Parser le hash dans l'URL pour extraire l'access_token
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  
  if (accessToken && refreshToken) {
    console.log('🔐 Magic Link détecté, activation session...');
    supabase.auth.setSession({ 
      access_token: accessToken, 
      refresh_token: refreshToken 
    }).then(({ data, error }) => {
      if (!error && data.session) {
        console.log('✅ Session activée:', data.session.user.email);
        setSession(data.session);
        window.location.hash = '/dashboard'; // Nettoyer + rediriger
      }
    });
  }
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('🔐 Auth event:', event);
      setSession(session ?? null);
    }
  );

  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session ?? null);
  });

  return () => subscription.unsubscribe();
}, []);
