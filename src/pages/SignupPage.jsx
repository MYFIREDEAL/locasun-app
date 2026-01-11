import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Building2, Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const SignupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    // Clear error when user types
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.companyName || formData.companyName.trim().length < 2) {
      newErrors.companyName = "Le nom de l'entreprise doit contenir au moins 2 caractères";
    }

    if (!formData.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = "Email invalide";
    }

    if (!formData.adminPassword || formData.adminPassword.length < 6) {
      newErrors.adminPassword = "Le mot de passe doit contenir au moins 6 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Appel direct HTTP sans supabase-js (évite preflight CORS bloqué)
      const res = await fetch(
        'https://vvzxvtiyybilkswslqfn.supabase.co/functions/v1/create_organization_onboarding',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            companyName: formData.companyName.trim(),
            adminEmail: formData.adminEmail.trim().toLowerCase(),
            adminPassword: formData.adminPassword,
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error('[SignupPage] Edge Function error:', data);
        throw new Error(data.error || 'Erreur lors de la création de l\'organisation');
      }

      if (!data?.success) {
        console.error('[SignupPage] Edge Function returned error:', data);
        throw new Error(data?.error || 'Erreur lors de la création de l\'organisation');
      }

      toast({
        title: "Organisation créée avec succès !",
        description: "Vous allez être redirigé vers la page de connexion...",
      });

      // Auto-login après création
      setTimeout(async () => {
        try {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: formData.adminEmail.trim().toLowerCase(),
            password: formData.adminPassword,
          });

          if (loginError) {
            console.error('[SignupPage] Auto-login failed:', loginError);
            navigate('/client-access');
          } else {
            navigate('/admin');
          }
        } catch (err) {
          console.error('[SignupPage] Auto-login exception:', err);
          navigate('/client-access');
        }
      }, 1500);

    } catch (error) {
      console.error('[SignupPage] Error:', error);
      
      toast({
        title: "Erreur",
        description: error.message || 'Une erreur est survenue lors de la création de l\'organisation',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Créer votre organisation
            </h1>
            <p className="text-gray-600 text-sm">
              Commencez votre essai gratuit en quelques clics
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Name */}
            <div>
              <Label htmlFor="companyName" className="text-sm font-medium text-gray-700 mb-1.5">
                Nom de l'entreprise *
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Ex: Acme Corporation"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`pl-10 ${errors.companyName ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.companyName && (
                <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>
              )}
            </div>

            {/* Admin Email */}
            <div>
              <Label htmlFor="adminEmail" className="text-sm font-medium text-gray-700 mb-1.5">
                Email administrateur *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@acme.com"
                  value={formData.adminEmail}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`pl-10 ${errors.adminEmail ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.adminEmail && (
                <p className="text-red-500 text-xs mt-1">{errors.adminEmail}</p>
              )}
            </div>

            {/* Admin Password */}
            <div>
              <Label htmlFor="adminPassword" className="text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={formData.adminPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={`pl-10 ${errors.adminPassword ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.adminPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.adminPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                'Créer mon organisation'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte ?{' '}
              <button
                onClick={() => navigate('/client-access')}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={loading}
              >
                Se connecter
              </button>
            </p>
          </div>
        </div>

        {/* Info Badge */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            🔒 Vos données sont sécurisées et chiffrées
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
