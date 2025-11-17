import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook pour gérer les notifications admin avec Supabase
 * Synchronisation temps réel des notifications de nouveaux messages
 */
export function useSupabaseNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔔 useSupabaseNotifications - userId:', userId);
    
    if (!userId) {
      console.log('⚠️ No userId, skipping admin notifications loading');
      setLoading(false)
      return
    }

    loadNotifications()

    // Real-time subscription pour les notifications
    const channel = supabase
      .channel(`notifications-${userId}-${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `prospect_id=in.(select id from prospects where owner_id=eq.${userId})`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = transformFromDb(payload.new)
            setNotifications(prev => {
              // Vérifier si notification existe déjà
              const exists = prev.find(n => n.id === newNotif.id)
              if (exists) return prev
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
  }, [userId])

  async function loadNotifications() {
    try {
      setLoading(true)
      console.log('📥 Loading admin notifications for user:', userId);

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
      console.log('✅ Admin notifications loaded:', transformed.length, transformed);
      setNotifications(transformed)
    } catch (error) {
      console.error('❌ Error loading admin notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Créer ou mettre à jour une notification
   * Si une notification existe déjà pour ce prospect+projet, incrémente le count
   */
  async function createOrUpdateNotification(notificationData) {
    try {
      const { prospectId, projectType, prospectName, projectName } = notificationData

      // Vérifier si notification existe déjà (non lue)
      const { data: existing } = await supabase
        .from('notifications')
        .select('*')
        .eq('prospect_id', prospectId)
        .eq('project_type', projectType)
        .eq('read', false)
        .single()

      if (existing) {
        // Incrémenter le count
        const { error } = await supabase
          .from('notifications')
          .update({ 
            count: existing.count + 1,
            created_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Créer nouvelle notification
        const { error } = await supabase
          .from('notifications')
          .insert({
            prospect_id: prospectId,
            project_type: projectType,
            prospect_name: prospectName,
            project_name: projectName,
            count: 1,
            read: false
          })

        if (error) throw error
      }
    } catch (error) {
      console.error('Error creating/updating notification:', error)
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async function markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notification as read:', error)
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
