import React from "react"
import { Helmet } from "react-helmet"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useOrganization } from "@/contexts/OrganizationContext"
import { useLandingPageConfig } from "@/hooks/useLandingPageConfig"
import {
  Sparkles,
  Zap,
  FileText,
  Workflow,
  FileCheck,
  CreditCard,
  FolderKanban,
  Database,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  Bot,
  HardHat,
  Scaling,
  ClipboardSignature as Signature,
  FileUp,
  Wrench,
  ChevronRight,
  MapPin,
  Droplets,
  Shovel,
  DraftingCompass,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function Landing() {
  const { toast } = useToast()
  const navigate = useNavigate()
  
  // Contexte organisation - isPlatformOrg vient directement du contexte
  const { 
    organizationId, 
    isPlatformOrg, 
    brandName, 
    logoUrl: orgLogoUrl,
    organizationLoading 
  } = useOrganization() || {}
  const { landingConfig, loading: configLoading } = useLandingPageConfig(organizationId)
  
  // Détermine si on est sur la plateforme EVATIME ou une organisation tierce
  const isPlatform = isPlatformOrg || !organizationId
  
  // Valeurs dynamiques pour l'en-tête (toujours utilisées)
  const displayName = isPlatform ? "EVATIME" : (brandName || "EVATIME")
  const displayLogo = isPlatform ? "/evatime-logo.png" : (orgLogoUrl || "/evatime-logo.png")

  const automations = [
    "Génération automatique de devis personnalisés",
    "Création de factures intelligentes",
    "Suivi des paiements en temps réel",
    "Relances clients automatisées",
    "Rapports d'activité instantanés",
  ]

  const features = [
    {
      icon: Sparkles,
      title: "Automatisations intelligentes",
      description:
        "L'IA gère vos tâches répétitives pendant que vous vous concentrez sur l'essentiel",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: FileText,
      title: "Formulaires & questionnaires IA",
      description:
        "Créez des formulaires adaptatifs qui s'ajustent automatiquement aux réponses",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      icon: Workflow,
      title: "Workflows automatiques",
      description: "Orchestrez vos processus métier sans une ligne de code",
      gradient: "from-blue-600 to-indigo-600",
    },
    {
      icon: FileCheck,
      title: "Documents instantanés",
      description: "Générez devis, factures et contrats en quelques secondes",
      gradient: "from-indigo-600 to-blue-500",
    },
    {
      icon: CreditCard,
      title: "Paiements & signatures",
      description: "Encaissez et faites signer vos documents en un clic",
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      icon: FolderKanban,
      title: "Gestion de projets complète",
      description: "Pilotez tous vos projets depuis une interface unifiée",
      gradient: "from-cyan-600 to-blue-500",
    },
    {
      icon: Database,
      title: "Données connectées en temps réel",
      description: "Synchronisation instantanée de toutes vos informations",
      gradient: "from-blue-500 to-indigo-500",
    },
  ]

  const workflowSteps = [
    {
      icon: FileSearch,
      title: "Qualification du projet",
      description:
        "Le client remplit un formulaire intelligent qui collecte les informations clés sur son projet (localisation, consommation, type de toiture...). L'IA analyse les données en temps réel pour valider l'éligibilité du projet.",
    },
    {
      icon: Bot,
      title: "Pré-étude automatique",
      description:
        "L'IA génère instantanément une pré-étude complète : Le client peut simuler lui même son installation.",
    },
    {
      icon: HardHat,
      title: "Étude technique",
      description:
        "Si le client est intéressé, l'IA assigne le projet à un technicien. Le technicien complète les informations sur site via une application, et l'IA met à jour l'étude technique en temps réel.",
    },
    {
      icon: Scaling,
      title: "Offre personnalisée",
      description:
        "Sur la base de l'étude finalisée, l'IA génère une offre commerciale détaillée et personnalisée, incluant le plan de financement et les garanties. Elle est envoyée automatiquement au client. Un rdv avec un commercial en visio ou sur le terrain est souvent nécéssaire pour le contact humain et facilité la récupération des documents",
    },
    {
      icon: Signature,
      title: "Signature & Paiement",
      description:
        "Le client peut signer électroniquement son devis en un clic en direct avec un closer au telephone ou what app. L'IA déclenche ensuite la demande d'acompte et suit le paiement en temps réel.",
    },
    {
      icon: FileUp,
      title: "Démarches administratives",
      description:
        "Une fois le devis signé, l'IA pré-remplit tous les documents administratifs nécessaires (mairie, Enedis...) et suit leur avancement, vous notifiant à chaque étape clé.",
    },
    {
      icon: Wrench,
      title: "Installation & Mise en service",
      description:
        "L'IA planifie l'intervention avec le client et les équipes techniques. Elle génère le rapport de fin de chantier et déclenche la facturation finale une fois l'installation validée.",
    },
  ]

  const poolWorkflowSteps = [
    {
      icon: FileSearch,
      title: "Qualification du besoin",
      description:
        "Le client décrit son projet de piscine via un questionnaire interactif : dimensions, type (enterrée, hors-sol), options (chauffage, volet...). L'IA affine les questions pour cerner précisément ses attentes.",
    },
    {
      icon: MapPin,
      title: "Étude du terrain",
      description:
        "L'IA analyse l'adresse du client, les règles d'urbanisme locales (PLU) et utilise des données satellites pour une première validation de la faisabilité technique (accès, topographie).",
    },
    {
      icon: DraftingCompass,
      title: "Proposition de modèles adaptés",
      description:
        "En fonction du budget, des dimensions et des contraintes du terrain, l'IA propose une sélection de modèles de piscines et d'aménagements pertinents, avec des visuels 3D.",
    },
    {
      icon: FileText,
      title: "Offre complète & devis",
      description:
        "Une fois le modèle choisi, l'IA génère un devis détaillé incluant la piscine, les équipements, les travaux de terrassement et les options, le tout envoyé instantanément au client.",
    },
    {
      icon: Signature,
      title: "Signature & paiement acompte",
      description:
        "Le client signe son devis en ligne. L'IA génère la facture d'acompte et propose le paiement en ligne pour lancer officiellement le projet.",
    },
    {
      icon: FileUp,
      title: "Déclarations & démarches",
      description:
        "L'IA prépare automatiquement la déclaration préalable de travaux ou la demande de permis de construire avec toutes les pièces nécessaires, prête à être déposée en mairie.",
    },
    {
      icon: Shovel,
      title: "Préparation & travaux",
      description:
        "L'IA coordonne le planning des équipes (terrassement, maçonnerie, pose...) et informe le client en temps réel de l'avancement du chantier à chaque étape clé.",
    },
    {
      icon: Droplets,
      title: "Mise en eau & livraison",
      description:
        "Une fois les travaux terminés, l'IA planifie la mise en eau, génère le procès-verbal de réception et envoie les guides d'entretien personnalisés au client.",
    },
  ]

  const logoUrl =
    "https://horizons-cdn.hostinger.com/0006a1c4-b9a7-4c6e-882d-144771383456/3bfa51980327b635c396a2f5c6661668.png"
  const rocketImageUrl =
    "https://horizons-cdn.hostinger.com/0006a1c4-b9a7-4c6e-882d-144771383456/1f9d3e047ee189487d139fbe166d1557.png"

  const handleToast = () => {
    toast({
      title: "Fonctionnalité à venir !",
      description:
        "🚧 Cette fonctionnalité n'est pas encore implémentée—mais ne vous inquiétez pas ! 🚀",
    })
  }

  // Contenu pour les organisations tierces (non-EVATIME)
  const renderOrganizationContent = () => {
    const config = landingConfig || {}
    const heroTitle = config.hero_title || `Bienvenue chez ${displayName}`
    const heroSubtitle = config.hero_subtitle || "Suivez l'avancement de votre projet en temps réel"
    const ctaText = config.hero_cta_text || "Je démarre mon projet"
    const showHowItWorks = config.show_how_it_works !== false // Par défaut true
    const steps = config.blocks || [
      { title: "Étude", description: "Analyse de votre projet" },
      { title: "Installation", description: "Réalisation des travaux" },
      { title: "Suivi", description: "Accompagnement continu" },
    ]

    return (
      <>
        {/* Hero Organisation */}
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-900 to-cyan-900 bg-clip-text text-transparent leading-tight">
                {heroTitle}
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
                {heroSubtitle}
              </p>
              <div className="flex justify-center items-center gap-4">
                <Button
                  onClick={() => navigate('/client-access')}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full px-10 py-6 text-lg font-semibold"
                >
                  {ctaText}
                </Button>
                {showHowItWorks && (
                  <button
                    onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-green-600 hover:text-green-700 font-medium text-lg transition-colors"
                  >
                    Comment ça marche ?
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Étapes du projet - Affichage conditionnel */}
        {showHowItWorks && (
        <section id="how-it-works" className="py-20 px-6 bg-gradient-to-br from-blue-50 to-cyan-50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-gray-900">
              {config.how_it_works_title || "Comment ça marche ?"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-8 shadow-lg"
                >
                  <div className="w-16 h-16 flex items-center justify-center text-4xl mb-4">
                    {step.icon || (index + 1)}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* CTA Organisation */}
        <section className="py-20 px-6 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700">
          <div className="container mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                Prêt à commencer ?
              </h2>
              <Button
                onClick={() => navigate('/client-access')}
                className="bg-white text-blue-600 hover:bg-gray-100 rounded-full px-10 py-6 text-lg shadow-xl font-semibold"
              >
                {ctaText}
              </Button>
            </motion.div>
          </div>
        </section>
      </>
    )
  }

  // Loading state - attendre que l'organisation soit résolue
  if (organizationLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Loading state pour les organisations tierces (chargement de la config)
  if (!isPlatform && configLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>EVATIME - L'IA qui pilote votre activité</title>
        <meta
          name="description"
          content="Automatisez votre activité avec l'intelligence artificielle. Formulaires IA, workflows automatiques, documents instantanés et gestion de projets complète."
        />
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <img
                    src={displayLogo}
                    alt={`${displayName} Logo`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                    {displayName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-full px-6"
                >
                  Espace Pro
                </Button>
                <Button
                  onClick={() => navigate('/client-access')}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full px-6"
                >
                  Espace Client
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu conditionnel */}
        {!isPlatform && renderOrganizationContent()}
        
        {isPlatform && (
        <>
        {/* Hero */}
        <section className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-900 to-cyan-900 bg-clip-text text-transparent leading-tight">
                L&apos;IA qui pilote
                <br />
                votre activité{" "}
                <img
                  src={rocketImageUrl}
                  alt="Rocket icon"
                  className="inline-block h-20 w-20 align-middle -mt-5 ml-1"
                />
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
                Automatisez vos processus, générez vos documents et pilotez votre
                entreprise avec l&apos;intelligence artificielle
              </p>

              <div className="flex justify-center">
                <Button
                  onClick={handleToast}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full px-8 py-6 text-lg shadow-xl"
                >
                  Essayer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="py-20 px-6 bg-gradient-to-br from-blue-50 to-cyan-50">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                Comment ça marche ?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Une plateforme qui connecte votre entreprise, vos clients et l&apos;IA
                pour automatiser l&apos;ensemble de votre activité
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8"
            >
              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6">
                  <span className="text-3xl">🏢</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  Votre entreprise
                </h3>
                <p className="text-gray-600">
                  Dites à EVATIME comment vous travaillez. Elle transforme vos étapes
                  en un système 100 % automatisé.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  L&apos;IA EVATIME
                </h3>
                <p className="text-gray-600">
                  Elle crée les formulaires, pose les bonnes questions, collecte les
                  documents, envoie les relances, gère le pipeline et vous notifie
                  uniquement quand il faut agir.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-6">
                  <span className="text-3xl">👥</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">
                  Vos clients
                </h3>
                <p className="text-gray-600">
                  Une interface simple où ils envoient leurs infos, déposent leurs
                  documents, signent, paient et suivent l'avancement, sans jamais vous
                  déranger.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Workflow solaire */}
        <section className="py-20 px-6 bg-white">
          <div className="container mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                Exemple : Workflow automatisé pour une société solaire
              </h2>
            </motion.div>

            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-px bg-gray-200 hidden md:block" />
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="relative flex md:items-center mb-12"
                >
                  <div
                    className={`flex items-center w-full md:w-1/2 ${
                      index % 2 === 0
                        ? "md:pr-12"
                        : "md:pl-12 md:ml-auto md:text-right"
                    }`}
                  >
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center md:hidden mr-4">
                      <step.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </div>

                  <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-gray-200 items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <step.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-8 text-center text-white flex flex-col md:flex-row items-center justify-between gap-6"
            >
              <p className="text-xl font-semibold">
                Ce processus est 100% automatique et piloté par l&apos;IA d&apos;EVATIME
              </p>
              <Button
                onClick={handleToast}
                variant="outline"
                className="bg-white/10 text-white hover:bg-white/20 border-white/30 rounded-full px-6 py-3 flex-shrink-0"
              >
                Voir un autre exemple de workflow
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Automatisations */}
        <section className="py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full mb-6">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    Automatisations intelligentes
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                  L&apos;IA travaille pour vous 24/7
                </h2>

                <p className="text-xl text-gray-600 mb-8">
                  Libérez-vous des tâches répétitives et concentrez-vous sur ce qui
                  compte vraiment : développer votre activité
                </p>

                <div className="space-y-4">
                  {automations.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <CheckCircle2 className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                      <span className="text-gray-700 text-lg">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                  <img
                    alt="Automatisations intelligentes EVATIME"
                    className="w-full h-auto"
                    src="https://images.unsplash.com/photo-1516383274235-5f42d6c6426d"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Une suite complète d&apos;outils pilotés par l&apos;IA pour gérer votre
                activité de A à Z
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group cursor-pointer"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow piscine */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="container mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                Exemple : Workflow pour un constructeur de piscine
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Du premier contact à la mise en eau, EVATIME génère et pilote
                automatiquement l&apos;intégralité du processus pour chaque projet de
                construction de piscine.
              </p>
            </motion.div>

            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-px bg-gray-200 hidden md:block" />
              {poolWorkflowSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="relative flex md:items-center mb-12"
                >
                  <div
                    className={`flex items-center w-full md:w-1/2 ${
                      index % 2 !== 0
                        ? "md:pr-12"
                        : "md:pl-12 md:ml-auto md:text-right"
                    }`}
                  >
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center md:hidden mr-4">
                      <step.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="w-full">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-gray-600">{step.description}</p>
                    </div>
                  </div>

                  <div className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-gray-200 items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <step.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <p className="text-lg text-gray-700 font-medium bg-blue-50 p-4 rounded-lg inline-block">
                Tout ce workflow piscine est généré automatiquement dès qu&apos;un client
                démarre un projet.{" "}
                <span className="font-bold text-blue-700">
                  EVATIME s&apos;adapte à chaque métier.
                </span>
              </p>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 px-6 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute top-0 left-0 w-full h-full"
              style={{
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "50px 50px",
              }}
            />
          </div>

          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
                Prêt à transformer votre activité ?
              </h2>
              <p className="text-xl md:text-2xl text-blue-100 mb-12">
                Rejoignez les entreprises qui ont choisi l&apos;intelligence artificielle
                pour piloter leur croissance
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleToast}
                  className="bg-white text-blue-600 hover:bg-gray-100 rounded-full px-10 py-6 text-lg shadow-xl font-semibold"
                >
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  onClick={handleToast}
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white/10 rounded-full px-10 py-6 text-lg"
                >
                  Planifier une démo
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
        </>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img
                    src={logoUrl}
                    alt="EVATIME Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl font-bold">EVATIME</span>
              </div>
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} EVATIME. Tous droits réservés.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
