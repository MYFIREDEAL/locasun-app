import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook pour gérer les notifications client avec Supabase
 * Synchronisation temps réel des notifications de réponses admin
 */
export function useSupabaseClientNotifications(prospectId) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!prospectId) {
      setLoading(false)
      return
    }

    loadNotifications()

    // Real-time subscription pour les notifications client
    const channel = supabase
      .channel(`client-notifications-${prospectId}-${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_notifications',
          filter: `prospect_id=eq.${prospectId}`
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
  }, [prospectId])

  async function loadNotifications() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('client_notifications')
        .select('*')
        .eq('prospect_id', prospectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const transformed = (data || []).map(transformFromDb)
      setNotifications(transformed)
    } catch (error) {
      console.error('Error loading client notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Créer ou mettre à jour une notification client
   * Si une notification existe déjà pour ce projet, incrémente le count
   */
  async function createOrUpdateNotification(notificationData) {
    try {
      const { prospectId, projectType, projectName, message } = notificationData

      // Vérifier si notification existe déjà (non lue) pour ce projet
      const { data: existing } = await supabase
        .from('client_notifications')
        .select('*')
        .eq('prospect_id', prospectId)
        .eq('project_type', projectType)
        .eq('read', false)
        .single()

      if (existing) {
        // Incrémenter le count
        const { error } = await supabase
          .from('client_notifications')
          .update({ 
            count: existing.count + 1,
            message: message, // Mettre à jour avec le dernier message
            created_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Créer nouvelle notification
        const { error } = await supabase
          .from('client_notifications')
          .insert({
            prospect_id: prospectId,
            project_type: projectType,
            project_name: projectName,
            message: message,
            count: 1,
            read: false
          })

        if (error) throw error
      }
    } catch (error) {
      console.error('Error creating/updating client notification:', error)
    }
  }

  /**
   * Marquer une notification comme lue
   */
  async function markAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('client_notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error marking client notification as read:', error)
    }
  }

  /**
   * Transformer les données Supabase (snake_case) vers format app (camelCase)
   */
  function transformFromDb(dbNotif) {
    return {
      id: dbNotif.id,
      projectType: dbNotif.project_type,
      projectName: dbNotif.project_name,
      message: dbNotif.message,
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
