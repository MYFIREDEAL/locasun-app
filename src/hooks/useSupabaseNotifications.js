import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logger } from '@/lib/logger'

/**
 * Hook pour gérer les notifications admin avec Supabase
 * Synchronisation temps réel des notifications de nouveaux messages
 * @param {string} userId - L'ID de l'utilisateur admin (owner_id)
 * @param {boolean} enabled - Active/désactive le hook (default: true)
 */
export function useSupabaseNotifications(userId, enabled = true) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 🔥 FIX: Ne pas charger si disabled ou pas d'userId
    if (!enabled || !userId) {
      setLoading(false)
      return
    }

    loadNotifications()

    // Real-time subscription pour les notifications
    // 🔥 CRITICAL: Realtime ne supporte PAS les RLS avec EXISTS/JOIN
    // On DOIT utiliser un filter simple sur owner_id
    const channelName = `notifications-${userId}-${Date.now()}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `owner_id=eq.${userId}` // 🔥 FILTER OBLIGATOIRE pour Realtime
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = transformFromDb(payload.new)
            setNotifications(prev => {
              // Vérifier si notification existe déjà
              const exists = prev.find(n => n.id === newNotif.id)
              if (exists) {
                return prev
              }
              return [newNotif, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = transformFromDb(payload.new)
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
            )
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => 
              prev.filter(n => n.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, enabled])

  async function loadNotifications() {
    try {
      setLoading(true)

      // Récupérer les notifications des prospects de l'utilisateur
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          prospects!inner(owner_id)
        `)
        .eq('prospects.owner_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformed = (data || []).map(transformFromDb)
      setNotifications(transformed)
    } catch (error) {
      logger.error('❌ Error loading admin notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Créer ou mettre à jour une notification
   * Si une notification existe déjà pour ce prospect+projet, incrémente le count
   * 🔥 IMPORTANT: ownerId est OBLIGATOIRE pour le real-time filter
   */
  async function createOrUpdateNotification(notificationData) {
    try {
      const { prospectId, projectType, prospectName, projectName, ownerId } = notificationData

      if (!ownerId) {
        logger.error('ownerId is REQUIRED for notifications');
        return;
      }

      logger.debug('Checking existing notification', { prospectId, projectType });

      // Vérifier si notification existe déjà (non lue, hors partenaire)
      const { data: existing, error: selectError } = await supabase
        .from('notifications')
        .select('*')
        .eq('prospect_id', prospectId)
        .eq('project_type', projectType)
        .eq('read', false)
        .neq('project_name', '🟠 Message partenaire')
        .maybeSingle()

      logger.debug('Existing notification check', { found: !!existing, error: !!selectError });

      if (selectError) {
        logger.error('❌ Error checking existing notification:', selectError);
        return;
      }

      if (existing) {
        // Incrémenter le count
        logger.debug('Incrementing notification count', { from: existing.count, to: existing.count + 1 });
        const { error } = await supabase
          .from('notifications')
          .update({ 
            count: existing.count + 1,
            created_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) {
          logger.error('Error updating notification:', error);
          throw error;
        }
        logger.debug('Notification count incremented successfully');
      } else {
        // 🔥 Récupérer organization_id depuis prospects (requis par DB)
        const { data: prospect, error: prospectError } = await supabase
          .from('prospects')
          .select('organization_id')
          .eq('id', prospectId)
          .single()

        if (prospectError || !prospect?.organization_id) {
          logger.error('Organization introuvable pour le prospect:', { prospectId, error: prospectError?.message });
          throw new Error('Organization introuvable pour le prospect');
        }

        // Créer nouvelle notification avec owner_id
        logger.debug('Creating new notification with count=1');
        const { error } = await supabase
          .from('notifications')
          .insert({
            prospect_id: prospectId,
            owner_id: ownerId, // 🔥 OBLIGATOIRE pour real-time filter
            organization_id: prospect.organization_id, // ✅ DEPUIS prospects
            project_type: projectType,
            prospect_name: prospectName,
            project_name: projectName,
            count: 1,
            read: false
          })

        if (error) {
          logger.error('Error creating notification:', error);
          throw error;
        }
        logger.debug('New notification created');
      }
    } catch (error) {
      logger.error('Error creating/updating notification:', error)
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async function markAsRead(notificationId) {
    // 🔥 FIX: Vérifier que l'ID est valide avant de faire la requête
    if (!notificationId) {
      logger.warn('markAsRead appelé sans notificationId valide');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
      
      // 🔥 FIX: Mettre à jour l'état local immédiatement (comme le hook client)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    } catch (error) {
      logger.error('Error marking notification as read:', error)
    }
  }

  /**
   * Transformer les données Supabase (snake_case) vers format app (camelCase)
   */
  function transformFromDb(dbNotif) {
    return {
      id: dbNotif.id,
      prospectId: dbNotif.prospect_id,
      projectType: dbNotif.project_type,
      prospectName: dbNotif.prospect_name,
      projectName: dbNotif.project_name,
      count: dbNotif.count,
      read: dbNotif.read,
      timestamp: dbNotif.created_at
    }
  }

  return {
    notifications,
    loading,
    createOrUpdateNotification,
    markAsRead,
    refresh: loadNotifications
  }
}
