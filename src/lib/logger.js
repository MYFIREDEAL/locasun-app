const isDev = import.meta.env.DEV;

const colors = {
  debug: '#6366f1',
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444'
};

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
};

export const logger = {
  debug: (...args) => {
    // Désactivé pour performance - utiliser console.error/warn pour les logs critiques
  },

  info: (...args) => {
    // Désactivé pour performance - utiliser console.error/warn pour les logs critiques
  },

  warn: (...args) => {
    console.warn(
      `%c[${getTimestamp()}] WARN`,
      `color: ${colors.warn}; font-weight: bold`,
      ...args
    );
  },

  error: (...args) => {
    console.error(
      `%c[${getTimestamp()}] ERROR`,
      `color: ${colors.error}; font-weight: bold`,
      ...args
    );
  }
};

export const logErrorWithToast = (error, userMessage, toast) => {
  logger.error('Error:', error);
  if (toast) {
    toast({
      title: "Erreur",
      description: userMessage || "Une erreur est survenue.",
      variant: "destructive"
    });
  }
};

export default logger;
