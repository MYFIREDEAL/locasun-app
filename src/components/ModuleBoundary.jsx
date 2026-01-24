import React, { Component } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ModuleBoundary - ErrorBoundary isolé par zone
 * 
 * Isole les crashes par module pour éviter que toute l'app plante.
 * Affiche un fallback minimal avec:
 * - Nom du module qui a planté
 * - ErrorId (timestamp) pour traçabilité
 * - Boutons: Réessayer / Retour
 * 
 * Usage:
 * <ModuleBoundary name="Pipeline">
 *   <FinalPipeline />
 * </ModuleBoundary>
 */
class ModuleBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Générer un errorId unique pour traçabilité
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error, errorInfo) {
    const { name = 'Module' } = this.props;
    const { errorId } = this.state;

    // 🔥 Log structuré pour debug
    logger.error(`[ModuleBoundary] Crash dans "${name}"`, {
      errorId,
      module: name,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });

    // 🔥 Sentry integration (si disponible)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          module: name,
          errorId,
        },
        extra: {
          componentStack: errorInfo?.componentStack,
        },
      });
    }

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    // Reset l'erreur pour retenter le rendu
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleGoBack = () => {
    // Retour à la page précédente ou home
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  handleGoHome = () => {
    window.location.href = '/admin/pipeline';
  };

  render() {
    const { hasError, error, errorId } = this.state;
    const { children, name = 'Module' } = this.props;

    if (hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-md w-full text-center">
            {/* Icône d'erreur */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Message principal */}
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Module "{name}" a rencontré une erreur
            </h2>
            
            <p className="text-gray-500 text-sm mb-4">
              Une erreur inattendue s'est produite. Vous pouvez réessayer ou retourner à l'accueil.
            </p>

            {/* ErrorId pour traçabilité */}
            <div className="bg-gray-50 rounded-lg px-3 py-2 mb-6">
              <code className="text-xs text-gray-500 font-mono">
                {errorId}
              </code>
            </div>

            {/* Message d'erreur (dev only) */}
            {import.meta.env.DEV && error?.message && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-left">
                <p className="text-xs font-mono text-red-700 break-all">
                  {error.message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Accueil
              </Button>
              <Button
                onClick={this.handleRetry}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </Button>
            </div>

            {/* Lien support */}
            <p className="text-xs text-gray-400 mt-6">
              Si le problème persiste, contactez le support avec le code ci-dessus.
            </p>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ModuleBoundary;
