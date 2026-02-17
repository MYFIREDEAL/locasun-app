/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EDGE FUNCTION: auto-form-reminders
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Système de relances automatiques pour formulaires clients non complétés.
 * 
 * WORKFLOW EVATIME :
 * 1. Cron déclenche cette fonction toutes les heures
 * 2. Cherche les formulaires "pending" avec relances activées
 * 3. Calcule si une relance est due (délai + fenêtre horaire)
 * 4. Envoie un message de relance via chat
 * 5. Incrémente le compteur
 * 6. Si seuil atteint → crée une tâche pour le commercial
 * 
 * RESPECT ARCHITECTURE EVATIME :
 * - IA = Exécutant encadré (envoie relances dans un cadre strict)
 * - Workflows pilotent tout (config définie en amont)
 * - Traçable et déterministe (count, lastReminderAt, taskCreated)
 * 
 * Date: 30 janvier 2026
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const TIMEZONE = 'Europe/Paris';
const ALLOWED_HOURS_START = 8; // 08:00
const ALLOWED_HOURS_END = 20; // 20:00
const ALLOWED_DAYS = [1, 2, 3, 4, 5]; // Lundi à vendredi (0 = dimanche)

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si on est dans la fenêtre autorisée (08:00-20:00, lundi-vendredi)
 */
function isInAllowedTimeWindow() {
  const now = new Date();
  const parisTime = new Date(
    now.toLocaleString('en-US', { timeZone: TIMEZONE })
  );

  const hour = parisTime.getHours();
  const day = parisTime.getDay();

  const isAllowedHour = hour >= ALLOWED_HOURS_START && hour < ALLOWED_HOURS_END;
  const isAllowedDay = ALLOWED_DAYS.includes(day);

  return isAllowedHour && isAllowedDay;
}

/**
 * Calcule si une relance est due pour un panel
 */
function isReminderDue(lastReminderAt, delayDays) {
  if (!lastReminderAt) {
    // Première relance : basée sur created_at du panel
    return true; // On laisse la logique SQL filtrer par created_at
  }

  const lastReminder = new Date(lastReminderAt);
  const now = new Date();
  const diffMs = now.getTime() - lastReminder.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= delayDays;
}

/**
 * Crée un message de relance dans le chat
 */
async function sendReminderMessage(supabase, prospectId, projectType, formName, panelId) {
  const message = {
    prospect_id: prospectId,
    project_type: projectType,
    sender: 'admin',
    content: `🔔 **Rappel automatique**\n\nVous n'avez pas encore complété le formulaire **${formName}**.\n\nMerci de le remplir dès que possible pour que nous puissions avancer sur votre projet.`,
    timestamp: new Date().toISOString(),
    metadata: {
      type: 'reminder',
      panel_id: panelId,
      automated: true,
    },
  };

  const { error } = await supabase.from('chat_messages').insert(message);

  if (error) {
    throw new Error(`Erreur envoi message: ${error.message}`);
  }
}

/**
 * Crée une tâche pour le commercial
 */
async function createTaskForCommercial(
  supabase,
  prospectId,
  projectType,
  formName,
  ownerId
) {
  // Récupérer infos prospect + organization_id
  const { data: prospect, error: prospectError } = await supabase
    .from('prospects')
    .select('name, email, organization_id')
    .eq('id', prospectId)
    .single();

  if (prospectError) throw prospectError;

  // 🔥 FIX BUG #2: Guard owner_id valide, fallback vers Global Admin de l'org
  let validOwnerId = ownerId;

  if (!validOwnerId) {
    console.log(`[auto-form-reminders] owner_id NULL, recherche fallback Global Admin pour org ${prospect.organization_id}`);
    
    const { data: fallbackAdmin, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', prospect.organization_id)
      .eq('role', 'Global Admin')
      .limit(1)
      .single();

    if (!adminError && fallbackAdmin) {
      validOwnerId = fallbackAdmin.id;
      console.log(`[auto-form-reminders] Fallback Admin trouvé: ${validOwnerId}`);
    } else {
      console.error(`[auto-form-reminders] Aucun admin disponible pour org ${prospect.organization_id}`);
      throw new Error('Aucun admin disponible pour assigner la tâche');
    }
  }

  // Calculer scheduledAt (prochain créneau autorisé)
  const scheduledAt = getNextAuthorizedSlot();

  const task = {
    prospect_id: prospectId,
    project_type: projectType,
    title: `Relancer ${prospect.name} - Formulaire non complété`,
    description: `Le client n'a pas rempli le formulaire **${formName}** malgré ${
      3 // Par défaut
    } relances automatiques.\n\n📧 ${prospect.email}\n\nAction requise : Contacter le client pour débloquer la situation.`,
    status: 'pending',
    priority: 'high',
    created_by: validOwnerId,
    assigned_to: validOwnerId,
    scheduled_at: scheduledAt,
    metadata: {
      type: 'form_reminder_escalation',
      form_name: formName,
      automated: true,
    },
  };

  const { error: taskError } = await supabase.from('tasks').insert(task);

  if (taskError) {
    throw new Error(`Erreur création tâche: ${taskError.message}`);
  }
}

/**
 * Calcule le prochain créneau autorisé (08:00-20:00, lundi-vendredi)
 */
function getNextAuthorizedSlot() {
  const now = new Date();
  const paris = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));

  let candidate = new Date(paris);
  candidate.setHours(9, 0, 0, 0); // Proposer 09:00 par défaut

  // Si on est déjà dans une plage autorisée aujourd'hui
  const currentHour = paris.getHours();
  if (
    ALLOWED_DAYS.includes(paris.getDay()) &&
    currentHour >= ALLOWED_HOURS_START &&
    currentHour < ALLOWED_HOURS_END
  ) {
    candidate = new Date(paris);
    candidate.setHours(currentHour + 1, 0, 0, 0); // Dans 1h
  }

  // Avancer jusqu'à trouver un jour autorisé
  while (!ALLOWED_DAYS.includes(candidate.getDay())) {
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(9, 0, 0, 0);
  }

  return candidate.toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Vérifier qu'on est dans la fenêtre autorisée
  if (!isInAllowedTimeWindow()) {
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Hors fenêtre autorisée (08:00-20:00, lun-ven)',
        processed: 0,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Créer client Supabase avec service role (nécessaire pour cron)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ───────────────────────────────────────────────────────────────────────
    // 1. Récupérer les formulaires nécessitant une relance
    // ───────────────────────────────────────────────────────────────────────

    const { data: panels, error: panelsError } = await supabase
      .from('client_form_panels')
      .select(
        `
        panel_id,
        prospect_id,
        project_type,
        form_id,
        reminder_count,
        last_reminder_at,
        reminder_delay_days,
        max_reminders_before_task,
        created_at,
        forms:form_id (name),
        prospects:prospect_id (owner_id)
      `
      )
      .eq('status', 'pending')
      .eq('auto_reminder_enabled', true)
      .eq('task_created', false);

    if (panelsError) throw panelsError;

    if (!panels || panels.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Aucun formulaire nécessitant une relance',
          processed: 0,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // 2. Filtrer les panels où une relance est due
    // ───────────────────────────────────────────────────────────────────────

    const panelsDue = panels.filter((panel) => {
      // Vérifier si première relance (basée sur created_at)
      if (!panel.last_reminder_at) {
        const createdAt = new Date(panel.created_at);
        const now = new Date();
        const diffDays =
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= panel.reminder_delay_days;
      }

      // Relances suivantes
      return isReminderDue(panel.last_reminder_at, panel.reminder_delay_days);
    });

    // ───────────────────────────────────────────────────────────────────────
    // 3. Traiter chaque panel
    // ───────────────────────────────────────────────────────────────────────

    const results = [];

    for (const panel of panelsDue) {
      try {
        const formName = panel.forms?.name || 'Formulaire';
        const ownerId = panel.prospects?.owner_id;

        // Incrémenter le compteur
        const newCount = (panel.reminder_count || 0) + 1;

        await supabase
          .from('client_form_panels')
          .update({
            reminder_count: newCount,
            last_reminder_at: new Date().toISOString(),
          })
          .eq('panel_id', panel.panel_id);

        // Envoyer message de relance
        await sendReminderMessage(
          supabase,
          panel.prospect_id,
          panel.project_type,
          formName,
          panel.panel_id
        );

        // Si seuil atteint → créer tâche + bloquer relances
        if (newCount >= panel.max_reminders_before_task) {
          await createTaskForCommercial(
            supabase,
            panel.prospect_id,
            panel.project_type,
            formName,
            ownerId
          );

          await supabase
            .from('client_form_panels')
            .update({ task_created: true })
            .eq('panel_id', panel.panel_id);

          results.push({
            panel_id: panel.panel_id,
            action: 'reminder_sent + task_created',
            newCount,
          });
        } else {
          results.push({
            panel_id: panel.panel_id,
            action: 'reminder_sent',
            newCount,
          });
        }
      } catch (err) {
        results.push({
          panel_id: panel.panel_id,
          action: 'error',
          error: err.message,
        });
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // 4. Retour
    // ───────────────────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        message: `${results.length} relances traitées`,
        processed: results.length,
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
