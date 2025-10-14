export const allProjectsData = {
  ACC: {
    id: 1, type: 'ACC', title: 'ACC (Consommateur)', clientTitle: 'Autoconsommation Collective (ACC)', icon: '🔌', color: 'gradient-blue', progress: 0, status: 'Inscription', isPublic: true,
    steps: [
      { 
        name: 'Inscription', 
        status: 'completed', 
        icon: '✅',
        descriptions: {
          completed: "Votre compte client a été créé avec succès. Bienvenue chez Evatime !"
        }
      },
      { 
        name: 'Connexion à la centrale', 
        status: 'current', 
        icon: '⚡',
        descriptions: {
          current: "Veuillez compléter les informations ci-dessous pour connecter votre centrale.",
          completed: "Vos informations ont été validées. Nous préparons votre contrat."
        },
        form: 'ACC_CONNECTION'
      },
      { 
        name: 'Contrat', 
        status: 'pending', 
        icon: '📝',
        descriptions: {
          current: "Veuillez signer le contrat en ligne pour finaliser votre adhésion.",
          completed: "Contrat signé. Le raccordement est en cours.",
          pending: "Disponible après validation de vos informations de connexion."
        }
      },
      { 
        name: 'Attente raccordement', 
        status: 'pending', 
        icon: '⏳',
        descriptions: {
          current: "Votre centrale est en attente de raccordement, vous serez notifié dès qu’elle est connectée.",
          completed: "Votre centrale est raccordée et active !",
          pending: "Disponible après la signature du contrat."
        }
      },
      { 
        name: 'Actif', 
        status: 'pending', 
        icon: '🌞',
        descriptions: {
          completed: "Félicitations ! Vous bénéficiez de l'électricité de votre centrale locale."
        }
      },
    ]
  },
  Autonomie: {
    id: 6, type: 'Autonomie', title: 'Autonomie Énergie', clientTitle: 'Devenez 100 % autonome en électricité', icon: '💡', color: 'gradient-blue', progress: 0, status: 'Inscription', isPublic: true,
    steps: [
      { name: 'Inscription', status: 'current', icon: '✅' },
      { name: 'Étude', status: 'pending', icon: '🔎' },
      { name: 'Contrat', status: 'pending', icon: '📝' },
      { name: 'Installation', status: 'pending', icon: '🛠️' },
      { name: 'Actif', status: 'pending', icon: '🌞' },
    ]
  },
  Centrale: {
    id: 7, type: 'Centrale', title: 'Centrale Solaire [3-500 kWc]', clientTitle: 'Devenez producteur solaire rentable', icon: '☀️', color: 'gradient-orange', progress: 0, status: 'Inscription', isPublic: true,
    steps: [
      { 
        name: 'Inscription', 
        status: 'completed', 
        icon: '✅',
        descriptions: {
          completed: "Votre compte client a été créé avec succès le [date]. Vous pouvez suivre toutes les étapes de votre projet ici."
        }
      },
      { 
        name: 'Étude technique & financière', 
        status: 'completed', 
        icon: '📝',
        descriptions: {
          current: "Merci de compléter vos informations pour que nous puissions vérifier la faisabilité de votre projet : Surface de toiture ou terrain disponible (m²),Adresse Longeur et largeur du batiment, Type de toiture : Bac acier, everite, Fibrociment, amiante oui/non, Orientation/inclinaison approximatives. Prendre Rdv, demande d'appel",
          completed: "Étude validée le [date]. Votre étude a été envoyée par email et ajoutée à vos documents."
        }
      },
      { 
        name: 'Dossier administratif', 
        status: 'completed', 
        icon: '✍️',
        descriptions: {
          current: "Merci de déposer vos documents : Carte d'identité, RIB, Justificatif de propriété (ou bail), Kbis (si société).",
          completed: "Votre dossier administratif a été validé et transmis le [date].",
          pending: "Disponible une fois l'étude technique validée."
        }
      },
       { 
        name: 'Contrat', 
        status: 'current', 
        icon: '✍️',
        descriptions: {
          current: "Veuillez signer le contrat en ligne. (Pour toute question, contactez Charly.)",
          completed: "Contrat signé le [date]. Merci de votre confiance !",
          pending: "Vous pourrez signer le contrat une fois votre dossier administratif validé."
        }
      },
       { 
        name: 'Contrat', 
        status: 'current', 
        icon: '✍️',
        descriptions: {
          current: "Veuillez signer le contrat en ligne. (Pour toute question, contactez Charly.)",
          completed: "Contrat signé le [date]. Merci de votre confiance !",
          pending: "Vous pourrez signer le contrat une fois votre dossier administratif validé."
        }
      },
      { 
        name: 'Dépôt mairie', 
        status: 'pending', 
        icon: '🏦',
        descriptions: {
          current: "Nous préparons votre dossier urbanisme. Vous serez averti automatiquement lors du résultat .",
          completed: "Votre dossier a été déposé en mairie le [date]. Permis accordé le ( date ).",
          pending: "Disponible après la signature du contrat."
        }
      },
      { 
        name: 'Validation Enedis', 
        status: 'pending', 
        icon: '💡',
        descriptions: {
          current: "Demande de raccordement envoyée à Enedis. Délai moyen : [X] semaines.",
          completed: "Raccordement validé par Enedis le [date].",
          pending: "Disponible après la validation en mairie."
        }
      },
      { 
        name: 'Commande matériel', 
        status: 'pending', 
        icon: '📦',
        descriptions: {
          current: "Le matériel (panneaux, onduleurs, structures) est en cours de commande. Livraison prévue le [date].",
          completed: "Matériel livré et prêt pour l’installation.",
          pending: "Disponible après validation Enedis."
        }
      },
      { 
        name: 'Installation chantier', 
        status: 'pending', 
        icon: '👷',
        descriptions: {
          current: "Notre équipe installe actuellement votre centrale solaire. Durée moyenne : 1 à 3 semaines.",
          completed: "Installation terminée le [date].",
          pending: "Disponible après livraison du matériel."
        }
      },
      { 
        name: 'Contrôles & Consuel', 
        status: 'pending', 
        icon: '📋',
        descriptions: {
          current: "Inspection en cours par le Consuel pour vérifier la conformité électrique.",
          completed: "Contrôle validé par le Consuel le [date].",
          pending: "Disponible après l’installation."
        }
      },
      { 
        name: 'Mise en service', 
        status: 'pending', 
        icon: '⚡️',
        descriptions: {
          current: "Nous finalisons la mise en service avec Enedis. Vous serez averti dès activation.",
          completed: "Félicitations ! Votre centrale est en service depuis le [date]. Vous commencez à vendre votre électricité.",
          pending: "Disponible après validation Consuel."
        }
      }
    ]
  },
  Investissement: {
    id: 8, type: 'Investissement', title: 'Investissement Solaire', clientTitle: 'Investissez dans le solaire dès 50 €', icon: '💸', color: 'gradient-teal', progress: 0, status: 'Inscription', isPublic: true,
    steps: [
      { name: 'Inscription', status: 'current', icon: '✅' },
      { name: 'Validation', status: 'pending', icon: '🔎' },
      { name: 'Placement', status: 'pending', icon: '💶' },
      { name: 'Gains', status: 'pending', icon: '📈' },
    ]
  },
  ProducteurPro: {
    id: 9, type: 'ProducteurPro', title: 'Producteur Professionnel', clientTitle: 'Devenez Producteur Professionnel', icon: '🏭', color: 'gradient-purple', progress: 0, status: 'Inscription', isPublic: false,
    steps: [
      { name: 'Inscription', status: 'current', icon: '✅' },
      { name: 'Analyse Technique', status: 'pending', icon: '🔧' },
      { name: 'Offre de rachat', status: 'pending', icon: '💶' },
      { name: 'Contrat Partenaire', status: 'pending', icon: '✍️' },
      { name: 'Actif', status: 'pending', icon: '⚡️' },
    ]
  }
};