import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Phone, Mail, Edit, Save, X, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/App';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';

const tagColors = {
  'ACC': 'bg-blue-100 text-blue-800',
  'Autonomie': 'bg-green-100 text-green-800',
  'Centrale': 'bg-orange-100 text-orange-800',
  'Investissement': 'bg-teal-100 text-teal-800',
  'ProducteurPro': 'bg-purple-100 text-purple-800',
};

const EditModal = ({ open, onOpenChange, prospect, users, onSave }) => {
  const [formData, setFormData] = useState({
    name: prospect.name || '',
    email: prospect.email || '',
    phone: prospect.phone || '',
    ownerId: prospect.ownerId || '',
    status: prospect.status || 'Intéressé',
    notes: prospect.notes || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSave({ ...formData, id: prospect.id });
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner">Propriétaire</Label>
              <select
                id="owner"
                value={formData.ownerId}
                onChange={(e) => setFormData(prev => ({ ...prev, ownerId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(users).map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Statut</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Intéressé">Intéressé</option>
                <option value="Contacté">Contacté</option>
                <option value="Qualifié">Qualifié</option>
                <option value="Négociation">Négociation</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Sauvegarder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SafeProspectDetailsAdmin = ({ prospect, onBack, onUpdate }) => {
  const { projectsData = {} } = useAppContext();
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers(); // 🔥 Charger les utilisateurs Supabase
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 🔥 Transformer array Supabase en object pour compatibilité
  const users = useMemo(() => {
    return supabaseUsers.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [supabaseUsers]);

  const getOwnerName = (ownerId) => {
    const owner = users[ownerId];
    return owner ? owner.name : 'Non assigné';
  };

  const getProjectTitle = (type) => {
    const project = Object.values(projectsData).find(p => p.type === type);
    return project ? project.title : type;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Modifier le contact' : 'Détails du contact'}
          </h1>
        </div>
        
        <Button onClick={() => setIsEditModalOpen(true)} className="flex items-center space-x-2">
          <Edit className="w-4 h-4" />
          <span>Modifier</span>
        </Button>
      </div>

      {/* Informations principales */}
      <div className="bg-white rounded-lg shadow-soft">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{prospect.name}</h2>
              <p className="text-gray-500 text-sm">Contact</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Email</span>
              </Label>
              <p className="text-gray-900">{prospect.email}</p>
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>Téléphone</span>
              </Label>
              <p className="text-gray-900">{prospect.phone}</p>
            </div>

            {/* Propriétaire */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>Propriétaire</span>
              </Label>
              <p className="text-gray-900">{getOwnerName(prospect.ownerId)}</p>
            </div>

            {/* Statut */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Statut</Label>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {prospect.status || 'Intéressé'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags/Projets */}
      {prospect.tags && prospect.tags.length > 0 && (
        <div className="bg-white rounded-lg shadow-soft p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projets d'intérêt</h3>
          <div className="flex flex-wrap gap-2">
            {prospect.tags.map(tag => (
              <span
                key={tag}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  tagColors[tag] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {getProjectTitle(tag)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-soft p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Phone className="w-4 h-4" />
            <span>Appeler</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span>Envoyer un email</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <span>📅</span>
            <span>Planifier RDV</span>
          </Button>
        </div>
      </div>

      {/* Notes (si disponibles) */}
      <div className="bg-white rounded-lg shadow-soft p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
        <p className="text-gray-600 whitespace-pre-wrap">
          {prospect.notes || 'Aucune note pour ce contact.'}
        </p>
      </div>

      {/* Modal de modification */}
      <EditModal 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        prospect={prospect}
        users={users}
        onSave={onUpdate}
      />
    </motion.div>
  );
};

export default SafeProspectDetailsAdmin;