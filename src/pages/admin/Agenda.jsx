import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, add, sub, startOfWeek, isSameDay, addDays, set } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Video, Phone, Check, Book, Share2, ChevronDown, Plus, MapPin, X, FileText, CheckSquare, Mail, MessageCircle, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList, CommandGroup } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAppContext } from '@/App';
import { allProjectsData } from '@/data/projects';
import { cn } from '@/lib/utils';
import { useSupabaseAgenda } from '@/hooks/useSupabaseAgenda';
import { useSupabaseProspects } from '@/hooks/useSupabaseProspects';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25C22.56 11.45 22.49 10.68 22.36 9.92H12.27V14.4H18.16C17.86 15.86 17.03 17.11 15.82 17.9V20.36H19.34C21.43 18.42 22.56 15.58 22.56 12.25Z" fill="#4285F4"/>
    <path d="M12.27 23C15.22 23 17.73 22.03 19.34 20.36L15.82 17.9C14.86 18.53 13.66 18.88 12.27 18.88C9.56 18.88 7.23 17.13 6.38 14.71H2.74V17.2C4.43 20.62 8.03 23 12.27 23Z" fill="#34A853"/>
    <path d="M6.38 14.71C6.15 14.03 6.02 13.29 6.02 12.5C6.02 11.71 6.15 10.97 6.38 10.29V7.8H2.74C1.65 9.94 1 12.12 1 14.5C1 16.88 1.65 19.06 2.74 21.2L6.38 17.81V14.71Z" fill="#FBBC05"/>
    <path d="M12.27 6.12C13.75 6.12 15.05 6.63 15.98 7.5L19.41 4.08C17.73 2.54 15.22 1.5 12.27 1.5C8.03 1.5 4.43 3.88 2.74 7.29L6.38 9.71C7.23 7.37 9.56 6.12 12.27 6.12Z" fill="#EA4335"/>
  </svg>
);

const SidebarToggleIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <line x1="8" y1="6" x2="8" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <polyline points="12 8 16 12 12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const hours = Array.from({ length: 15 }, (_, i) => `${8 + i}:00`);

const EventDetailsPopup = ({ event, onClose, onReport, onEdit, prospects, supabaseUsers, updateAppointment, deleteAppointment }) => {
  const [status, setStatus] = useState(event?.status || 'pending');

  useEffect(() => {
    if (event) {
      setStatus(event.status);
    }
  }, [event]);

  if (!event) return null;

  const contact = prospects.find(p => p.id === event.contactId);
  const assignedUser = supabaseUsers.find(u => u.id === event.assignedUserId) || (contact ? supabaseUsers.find(u => u.id === contact.ownerId) : null);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    updateAppointment(event.id, { status: newStatus });
    
    setTimeout(() => {
      onClose();
      if (newStatus === 'reporte') {
        onReport(event);
      }
    }, 300);
  };

  const handleDelete = () => {
    deleteAppointment(event.id);
    toast({ title: "✅ RDV supprimé", description: "Le rendez-vous a été retiré de votre agenda." });
    onClose();
  };

  const handleActionClick = (action) => {
    if (!contact) {
      toast({ title: "Contact non trouvé", variant: "destructive" });
      return;
    }
    switch (action) {
      case 'Appel':
        if (contact.phone) window.location.href = `tel:${contact.phone}`;
        break;
      case 'Mail':
        if (contact.email) window.location.href = `mailto:${contact.email}`;
        break;
      case 'WhatsApp':
        if (contact.phone) {
          let phoneNumber = contact.phone.replace(/\D/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = `33${phoneNumber.substring(1)}`;
          }
          const prefilledMessage = encodeURIComponent("Bonjour");
          window.open(`https://wa.me/${phoneNumber}?text=${prefilledMessage}`, '_blank');
        }
        break;
      case 'GPS':
        if (contact.address) {
          const encodedAddress = encodeURIComponent(contact.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        toast({
          title: `Action: ${action}`,
          description: "🚧 Cette fonctionnalité n'est pas encore implémentée."
        });
    }
  };

  const statusConfig = {
    pending: { color: 'bg-blue-500', label: 'Qualifier votre activité' },
    effectue: { color: 'bg-green-500', label: 'Effectué' },
    annule: { color: 'bg-red-500', label: 'Annulé' },
    reporte: { color: 'bg-yellow-500', label: 'Reporté' },
  };

  return (
    <Dialog open={!!event} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="p-6 space-y-4">
          <DialogHeader className="p-0 text-left space-y-1">
            <DialogTitle className="text-2xl font-bold text-gray-900">{event.summary}</DialogTitle>
            <DialogDescription className="text-base text-gray-500">
              {capitalizeFirstLetter(format(event.start, "eeee d MMMM, HH:mm", { locale: fr }))} - {format(event.end, "HH:mm", { locale: fr })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-start space-x-3 text-gray-600">
            <Users className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="font-medium">Participants</p>
              {contact && <p className="text-sm">{contact.name} (Client)</p>}
              {assignedUser && <p className="text-sm">{assignedUser.name} (Assigné)</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions rapides</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ icon: Phone, label: 'Appel' }, { icon: Mail, label: 'Mail' }, { icon: MessageCircle, label: 'WhatsApp' }, { icon: MapPin, label: 'GPS' }].map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => handleActionClick(label)} className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors group">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`p-4 text-white transition-colors ${statusConfig[status].color}`}>
          <Select onValueChange={handleStatusChange} value={status}>
            <SelectTrigger className="w-full bg-transparent border-none text-white text-lg font-semibold focus:ring-0 focus:ring-offset-0 h-auto p-0 text-center justify-center" iconClassName="h-8 w-8 opacity-100">
              <SelectValue placeholder="Qualifier votre activité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending" disabled>Qualifier votre activité</SelectItem>
              <SelectItem value="effectue">Effectué</SelectItem>
              <SelectItem value="annule">Annulé</SelectItem>
              <SelectItem value="reporte">Reporté</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Infos activité</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Projet</span>
              <span className="font-medium text-gray-800">{allProjectsData[event.projectId]?.title || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Étape</span>
              <span className="font-medium text-gray-800">{event.step || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Note</span>
              <span className="font-medium text-gray-800 text-right">{event.description || 'Aucune'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interlocuteur</span>
              <span className="font-medium text-gray-800">{contact?.name || 'N/A'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Voulez-vous vraiment supprimer ce RDV ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le rendez-vous sera définitivement supprimé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button 
            className={
              event?.status && event.status !== 'pending' 
                ? "bg-gray-400 hover:bg-gray-500 text-gray-700" 
                : "bg-blue-600 hover:bg-blue-700"
            } 
            onClick={() => onEdit(event)}
          >
            Modifier l’activité
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const OtherActivityDetailsPopup = ({ activity, type, onClose, onEdit, prospects, supabaseUsers, updateCall, deleteCall, updateTask, deleteTask }) => {
  const [status, setStatus] = useState(activity?.status || 'pending');
  const [done, setDone] = useState(activity?.done || false);

  useEffect(() => {
    if (activity) {
      if (type === 'call') setStatus(activity.status || 'pending');
      if (type === 'task') setDone(activity.done || false);
    }
  }, [activity, type]);

  if (!activity) return null;

  const contact = prospects.find(p => p.id === activity.contactId);
  const assignedUser = supabaseUsers.find(u => u.id === activity.assignedUserId) || (contact ? supabaseUsers.find(u => u.id === contact.ownerId) : null);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    const updatedActivity = { ...activity, status: newStatus };
    if (type === 'call') {
      updateCall(updatedActivity);
    }
    setTimeout(() => onClose(), 300);
  };

  const handleDoneChange = (newDone) => {
    setDone(newDone);
    const updatedActivity = { ...activity, done: newDone };
    if (type === 'task') {
      updateTask(updatedActivity);
    }
    setTimeout(() => onClose(), 300);
  };

  const handleDelete = () => {
    if (type === 'call') {
      deleteCall(activity.id);
      toast({ title: "✅ Appel supprimé", description: "L'appel a été retiré de votre agenda." });
    } else if (type === 'task') {
      deleteTask(activity.id);
      toast({ title: "✅ Tâche supprimée", description: "La tâche a été retirée de votre agenda." });
    }
    onClose();
  };

  const handleActionClick = (action) => {
    if (!contact) {
      toast({ title: "Contact non trouvé", variant: "destructive" });
      return;
    }
    switch (action) {
      case 'Appel':
        if (contact.phone) window.location.href = `tel:${contact.phone}`;
        break;
      case 'Mail':
        if (contact.email) window.location.href = `mailto:${contact.email}`;
        break;
      case 'WhatsApp':
        if (contact.phone) {
          let phoneNumber = contact.phone.replace(/\D/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = `33${phoneNumber.substring(1)}`;
          }
          const prefilledMessage = encodeURIComponent("Bonjour");
          window.open(`https://wa.me/${phoneNumber}?text=${prefilledMessage}`, '_blank');
        }
        break;
      case 'GPS':
        if (contact.address) {
          const encodedAddress = encodeURIComponent(contact.address);
          const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
          if (isAppleDevice) {
            window.location.href = `maps://?q=${encodedAddress}`;
          } else {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
          }
        }
        break;
      default:
        toast({
          title: `Action: ${action}`,
          description: "🚧 Cette fonctionnalité n'est pas encore implémentée."
        });
    }
  };

  const isCall = type === 'call';
  const isTask = type === 'task';

  const title = isCall ? `Appel: ${activity.name}` : `Tâche: ${activity.text}`;
  const description = `Prévu le ${capitalizeFirstLetter(format(new Date(activity.date), "eeee d MMMM 'à' HH:mm", { locale: fr }))}`;

  const callStatusConfig = {
    pending: { color: 'bg-blue-500', label: 'Qualifier votre activité' },
    effectue: { color: 'bg-green-500', label: 'Effectué' },
    annule: { color: 'bg-red-500', label: 'Annulé' },
  };

  return (
    <Dialog open={!!activity} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="p-6 space-y-4">
          <DialogHeader className="p-0 text-left space-y-1">
            <DialogTitle className="text-2xl font-bold text-gray-900">{title}</DialogTitle>
            <DialogDescription className="text-base text-gray-500">{description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex items-start space-x-3 text-gray-600">
            <Users className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <p className="font-medium">Participants</p>
              {contact && <p className="text-sm">{contact.name} (Client)</p>}
              {assignedUser && <p className="text-sm">{assignedUser.name} (Assigné)</p>}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Actions rapides</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[{ icon: Phone, label: 'Appel' }, { icon: Mail, label: 'Mail' }, { icon: MessageCircle, label: 'WhatsApp' }, { icon: MapPin, label: 'GPS' }].map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => handleActionClick(label)} className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors group">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {isCall && (
          <div className={`p-4 text-white transition-colors ${callStatusConfig[status].color}`}>
            <Select onValueChange={handleStatusChange} value={status}>
              <SelectTrigger className="w-full bg-transparent border-none text-white text-lg font-semibold focus:ring-0 focus:ring-offset-0 h-auto p-0 text-center justify-center" iconClassName="h-8 w-8 opacity-100">
                <SelectValue placeholder="Qualifier votre activité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" disabled>Qualifier votre activité</SelectItem>
                <SelectItem value="effectue">Effectué</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isTask && (
          <div className="p-6 bg-green-500 text-white">
            <div className="flex items-center space-x-3">
              <Switch
                id="task-done"
                checked={done}
                onCheckedChange={handleDoneChange}
                className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 ${
                  done ? 'bg-white border border-gray-300' : 'bg-gray-500'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-300 ${
                    done ? 'translate-x-6 bg-gray-300' : 'translate-x-1 bg-white'
                  }`}
                />
              </Switch>
              <Label htmlFor="task-done" className="text-lg font-semibold text-white">{done ? 'Tâche effectuée' : 'Marquer comme effectuée'}</Label>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Infos activité</h3>
          <div className="space-y-3 text-sm">
            {isCall && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Projet</span>
                  <span className="font-medium text-gray-800">
                    {allProjectsData[activity.projectId]?.title || 'Aucun'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Étape</span>
                  <span className="font-medium text-gray-800">
                    {activity.step || 'Aucune'}
                  </span>
                </div>
              </>
            )}
            {isTask && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Projet</span>
                  <span className="font-medium text-gray-800">
                    {allProjectsData[activity.projectId]?.title || 'Aucun'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Étape</span>
                  <span className="font-medium text-gray-800">
                    {activity.step || 'Aucune'}
                  </span>
                </div>
              </>
            )}
             <div className="flex justify-between">
              <span className="text-gray-500">Note</span>
              <span className="font-medium text-gray-800 text-right">{activity.details || (isTask ? activity.text : 'Aucune')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interlocuteur</span>
              <span className="font-medium text-gray-800">{contact?.name || 'N/A'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-gray-50 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Voulez-vous vraiment supprimer cette activité ?</AlertDialogTitle>
                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
           <Button 
              className={
                (type === 'call' && activity?.status && activity.status !== 'pending') ||
                (type === 'task' && activity?.done)
                  ? "bg-gray-400 hover:bg-gray-500 text-gray-700" 
                  : "bg-blue-600 hover:bg-blue-700"
              }
              onClick={() => onEdit(activity, type)}
            >
              Modifier l’activité
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Appointment = ({ appointment, onAppointmentClick, onDrop }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startDate = appointment.start instanceof Date ? appointment.start : new Date(appointment.start);
  const endDate = appointment.end instanceof Date ? appointment.end : new Date(appointment.end);

  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime()) || !(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
    console.warn('[Agenda] Rendez-vous ignoré car la date est invalide.', appointment);
    return null;
  }

  const startHour = startDate.getHours();
  const startMinute = startDate.getMinutes();
  const endHour = endDate.getHours();
  const endMinute = endDate.getMinutes();
  const top = ((startHour - 8) * 60 + startMinute) * (60 / 60) + 1;
  const height = ((endHour - startHour) * 60 + (endMinute - startMinute)) * (60/60);

  const statusBadgeStyles = {
    effectue: 'bg-green-500 text-white',
    annule: 'bg-red-500 text-white',
    reporte: 'bg-yellow-400 text-black',
  };

  const statusLabels = {
    effectue: 'Effectué',
    annule: 'Annulé',
    reporte: 'Reporté',
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    const payload = JSON.stringify({
      appointmentId: appointment.id,
      originalStart: startDate,
      originalEnd: endDate,
      duration: endHour - startHour + (endMinute - startMinute) / 60
    });
    
    // Créer une image de drag personnalisée centrée
    const dragImage = e.target.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    dragImage.style.width = e.target.offsetWidth + 'px';
    dragImage.style.height = e.target.offsetHeight + 'px';
    dragImage.style.transform = 'none';
    document.body.appendChild(dragImage);
    
    // Centrer l'image de drag sur le curseur
    const rect = e.target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    
    e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2);
    
    // Nettoyer l'élément temporaire après un court délai
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 100);
    
    // Some browsers (Safari) require a text/plain payload to allow drops
    try { e.dataTransfer.setData('application/json', payload); } catch {}
    try { e.dataTransfer.setData('text/plain', payload); } catch {}
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <motion.div
      style={{ top: `${top}px`, height: `${height}px` }}
      className={cn(
        "absolute w-[90%] left-[5%] p-2 rounded-lg border-l-4 cursor-move overflow-hidden select-none",
        appointment.color || (appointment.type === 'physical' ? 'bg-blue-100 border-blue-500 text-blue-800' : 'bg-purple-100 border-purple-500 text-purple-800'),
        isDragging && "opacity-50 scale-95 shadow-lg z-50"
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(e) => { 
        e.stopPropagation(); 
        if (!isDragging) onAppointmentClick({ ...appointment, start: startDate, end: endDate }); 
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      title="Glissez pour déplacer le rendez-vous"
    >
      <p className="font-semibold text-sm truncate">{appointment.title || appointment.summary || 'RDV'}</p>
      <p className="text-xs truncate">{format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}</p>
      {appointment.notes && <p className="text-xs text-gray-500 truncate mt-0.5">{appointment.notes}</p>}
      
      {statusLabels[appointment.status] && (
        <span className={`absolute bottom-1 right-1 text-xs font-bold px-2 py-0.5 rounded-full ${statusBadgeStyles[appointment.status]}`}>
          {statusLabels[appointment.status]}
        </span>
      )}
    </motion.div>
  );
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const AgendaSidebar = ({ onAddActivity, currentDate, selectedUserId, onSelectActivity, onAppointmentClick }) => {
  const { calls, tasks, appointments, prospects, updateTask, activeAdminUser } = useAppContext();
  
  const visibleCalls = useMemo(() => {
    if (!activeAdminUser) return [];
    const allowedIds = (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') 
      ? null 
      : [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
    
    return calls.filter(call => {
      const isVisible = allowedIds ? allowedIds.includes(call.assignedUserId) : true;
      return isVisible && isSameDay(new Date(call.date), currentDate) && call.assignedUserId === selectedUserId;
    });
  }, [calls, currentDate, selectedUserId, activeAdminUser]);

  const visibleTasks = useMemo(() => {
    if (!activeAdminUser) return [];
    const allowedIds = (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') 
      ? null 
      : [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
      
    return tasks.filter(task => {
      const isVisible = allowedIds ? allowedIds.includes(task.assignedUserId) : true;
      return isVisible && isSameDay(new Date(task.date), currentDate) && task.assignedUserId === selectedUserId;
    });
  }, [tasks, currentDate, selectedUserId, activeAdminUser]);

  const overdueActivities = useMemo(() => {
    if (!activeAdminUser) return { calls: [], tasks: [], appointments: [] };
    const allowedIds = (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') 
      ? null 
      : [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
    
    const now = new Date();
    
    const overdueCalls = calls.filter(call => {
      const isVisible = allowedIds ? allowedIds.includes(call.assignedUserId) : true;
      const callDateTime = new Date(`${call.date}T${call.time}`);
      return isVisible && 
             callDateTime < now && 
             call.assignedUserId === selectedUserId &&
             call.status !== 'effectue' && 
             call.status !== 'annule';
    });

    const overdueTasks = tasks.filter(task => {
      const isVisible = allowedIds ? allowedIds.includes(task.assignedUserId) : true;
      const taskDate = new Date(task.date);
      taskDate.setHours(23, 59, 59, 999); // End of the day
      return isVisible && 
             taskDate < now && 
             task.assignedUserId === selectedUserId &&
             !task.done;
    });

    const overdueAppointments = appointments.filter(appointment => {
      const isVisible = allowedIds ? allowedIds.includes(appointment.assignedUserId) : true;
      const appointmentEnd = new Date(appointment.end || appointment.start);
      return isVisible && 
             appointmentEnd < now && 
             appointment.assignedUserId === selectedUserId &&
             appointment.status !== 'effectue' && 
             appointment.status !== 'annule' &&
             appointment.status !== 'reporte';
    });

    return { calls: overdueCalls, tasks: overdueTasks, appointments: overdueAppointments };
  }, [calls, tasks, appointments, selectedUserId, activeAdminUser]);

  return (
  <aside className="w-full lg:w-80 h-full p-5 space-y-6 overflow-y-auto no-scrollbar bg-white rounded-3xl shadow-lg border border-gray-100">
    <div className="pb-4 border-b border-gray-200 mb-4 flex justify-between items-center">
        <h2 className="flex items-center text-xl font-bold text-gray-900">
            <span className="mr-2 text-2xl">🚀</span> Activité du jour
        </h2>
        <Button size="icon" className="rounded-full" onClick={() => onAddActivity()}>
            <Plus className="h-5 w-5"/>
        </Button>
    </div>

    {/* Section Activités en retard */}
    {(overdueActivities.calls.length > 0 || overdueActivities.tasks.length > 0 || overdueActivities.appointments.length > 0) && (
      <details open className="group">
        <summary className="cursor-pointer">
          <div className="bg-red-500 text-white p-3 rounded-lg flex items-center justify-between shadow-md">
            <h3 className="flex items-center text-base font-semibold">
              <Zap className="mr-2 h-5 w-5" /> Activités en retard ({overdueActivities.calls.length + overdueActivities.tasks.length + overdueActivities.appointments.length})
            </h3>
            <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
          </div>
        </summary>
        <div className="space-y-2 pt-3 pl-2">
          {/* Rendez-vous en retard */}
          {overdueActivities.appointments.map(appointment => {
            const contact = prospects.find(p => p.id === appointment.contactId);
            const appointmentDate = new Date(appointment.start);
            
            return (
              <div key={`overdue-appointment-${appointment.id}`} onClick={() => onAppointmentClick && onAppointmentClick(appointment)} className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:bg-gray-50 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <CalendarIcon className="mr-2 h-4 w-4 text-red-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-gray-800 truncate">
                        {appointment.summary || appointment.title || 'RDV'}
                      </p>
                      {contact && (
                        <p className="text-xs text-gray-600 truncate">
                          avec {contact.name}
                        </p>
                      )}
                      {appointment.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {appointment.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end ml-2">
                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap">
                      {format(appointmentDate, 'dd/MM')}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {format(appointmentDate, 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Appels en retard */}
          {overdueActivities.calls.map(call => (
            <div key={`overdue-call-${call.id}`} onClick={() => onSelectActivity('call', call)} className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 border-l-4 border-red-500">
              <div className="flex items-center">
                <Phone className="mr-2 h-4 w-4 text-red-500" />
                <p className="font-medium text-sm text-gray-800">{call.name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                  {format(new Date(call.date), 'dd/MM')} {call.time}
                </span>
              </div>
            </div>
          ))}
          
          {/* Tâches en retard */}
          {overdueActivities.tasks.map(task => (
            <div key={`overdue-task-${task.id}`} onClick={() => onSelectActivity('task', task)} className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 border-l-4 border-red-500">
              <div className="flex items-center">
                <Check className="mr-2 h-4 w-4 text-red-500" />
                <p className="text-sm font-medium text-gray-800">{task.text}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                  {format(new Date(task.date), 'dd/MM')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </details>
    )}

    <details open className="group">
      <summary className="cursor-pointer">
        <div className="bg-blue-500 text-white p-3 rounded-lg flex items-center justify-between shadow-md">
          <h3 className="flex items-center text-base font-semibold">
            <Phone className="mr-2 h-5 w-5" /> Appels du jour
            {overdueActivities.calls.length > 0 && (
              <span className="ml-2 text-xs font-bold bg-red-500 text-white px-2 py-1 rounded-full">
                {overdueActivities.calls.length} en retard
              </span>
            )}
          </h3>
          <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>
      <div className="space-y-2 pt-3 pl-2">
        {visibleCalls.length > 0 ? visibleCalls.map(call => (
          <div key={call.id} onClick={() => onSelectActivity('call', call)} className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50">
            <p className={`font-medium text-sm text-gray-800 ${call.status === 'effectue' || call.status === 'annule' ? 'line-through text-gray-400' : ''}`}>{call.name}</p>
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">{call.time}</span>
          </div>
        )) : <p className="text-sm text-gray-500 px-2">Aucun appel aujourd'hui.</p>}
      </div>
    </details>

    <details open className="group">
      <summary className="cursor-pointer">
        <div className="bg-green-500 text-white p-3 rounded-lg flex items-center justify-between shadow-md">
          <h3 className="flex items-center text-base font-semibold">
            <Check className="mr-2 h-5 w-5" /> Tâches
            {overdueActivities.tasks.length > 0 && (
              <span className="ml-2 text-xs font-bold bg-red-500 text-white px-2 py-1 rounded-full">
                {overdueActivities.tasks.length} en retard
              </span>
            )}
          </h3>
          <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>
      <div className="space-y-2 pt-3 pl-2">
        {visibleTasks.length > 0 ? visibleTasks.map(task => (
          <div 
            key={task.id} 
            onClick={() => onSelectActivity('task', task)}
            className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50"
          >
            <p className={`text-sm font-medium ${task.done ? 'line-through text-gray-500' : 'text-gray-800'}`}>
              {task.text}
            </p>
            {task.done && <Check className="h-5 w-5 text-green-500" />}
          </div>
        )) : <p className="text-sm text-gray-500 px-2">Aucune tâche aujourd'hui.</p>}
      </div>
    </details>
  </aside>
)};

const AddActivityModal = ({ 
  open, 
  onOpenChange, 
  initialData, 
  defaultAssignedUserId,
  addAppointment: addAppointmentProp,
  addCall: addCallProp,
  addTask: addTaskProp,
  updateAppointment: updateAppointmentProp,
  updateCall: updateCallProp,
  updateTask: updateTaskProp,
  prospects: prospectsProp, // 🔥 Recevoir les prospects en props
}) => {
    const { users, getProjectSteps } = useAppContext();
    
    // Utiliser les prospects Supabase passés en props
    const prospects = prospectsProp || [];
    
    // Utiliser les fonctions passées en props (Supabase) ou fallback contexte
    const addAppointment = addAppointmentProp;
    const addCall = addCallProp;
    const addTask = addTaskProp;
    const updateAppointment = updateAppointmentProp;
    const updateCall = updateCallProp;
    const updateTask = updateTaskProp;
    const [selectedContact, setSelectedContact] = useState(null);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedStep, setSelectedStep] = useState('');
    const [activityType, setActivityType] = useState('physical');
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState('14:30');
    const [details, setDetails] = useState('');
    const [share, setShare] = useState(false);
    const [contactSearchOpen, setContactSearchOpen] = useState(false);
    const [userSearchOpen, setUserSearchOpen] = useState(false);
    const [assignedUserId, setAssignedUserId] = useState(defaultAssignedUserId || 'user-1');
    const [isEditing, setIsEditing] = useState(false);

    const userOptions = useMemo(() => Object.values(users).map(user => ({ value: user.id, label: user.name })), [users]);
    
    useEffect(() => {
      if (initialData) {
        setIsEditing(!!initialData.id);
        const contact = prospects.find(p => p.id === initialData.contactId);
        if (contact) setSelectedContact(contact);
        setSelectedProject(initialData.projectId || '');
        setSelectedStep(initialData.step || '');
        setDetails(initialData.description || initialData.details || initialData.text || '');
        setShare(initialData.share || false);
        
        const initialDate = initialData.start || initialData.date;
        const initialStartDate = initialDate instanceof Date ? initialDate : new Date(initialDate);
        
        setDate(initialStartDate);
        setTime(format(initialStartDate, 'HH:mm'));
        setAssignedUserId(initialData.assignedUserId || defaultAssignedUserId || 'user-1');
        
        const type = initialData.type || (initialData.color?.includes('blue') ? 'physical' : 'virtual');
        setActivityType(type);

      } else {
        setIsEditing(false);
        resetForm();
      }
    }, [initialData, prospects, defaultAssignedUserId]);

    useEffect(() => {
      if (selectedContact && selectedProject) {
        const projectSteps = getProjectSteps(selectedContact.id, selectedProject);
        const currentStep = projectSteps.find(step => step.status === 'in_progress' || step.status === 'current');
        if (currentStep) {
          setSelectedStep(currentStep.name);
        } else {
          setSelectedStep('');
        }
      }
    }, [selectedContact, selectedProject, getProjectSteps]);


    const resetForm = () => {
        setSelectedContact(null);
        setSelectedProject('');
        setSelectedStep('');
        setActivityType('physical');
        setDate(new Date());
        setTime('14:30');
        setDetails('');
        setShare(false);
        setAssignedUserId(defaultAssignedUserId || 'user-1');
        setIsEditing(false);
    };

    const handleClose = () => {
      onOpenChange(false);
    }

    const handleSubmit = () => {
        if (!selectedContact || (activityType !== 'task' && !selectedProject) || !assignedUserId) {
            toast({ title: "Champs requis", description: "Veuillez sélectionner un contact, un projet et un utilisateur.", variant: "destructive" });
            return;
        }
        if( (activityType === 'physical' || activityType === 'virtual' || activityType === 'call') && !selectedStep){
            toast({ title: "Champs requis", description: "Veuillez sélectionner une étape.", variant: "destructive" });
            return;
        }
        
        const [hours, minutes] = time.split(':').map(Number);
        const activityDateTime = set(date, { hours, minutes, seconds: 0, milliseconds: 0 });

        if (activityType === 'call') {
            const newCall = {
                id: isEditing ? initialData.id : Date.now(),
                name: selectedContact.name,
                time: format(activityDateTime, 'HH:mm'),
                date: activityDateTime.toISOString(),
                details: details,
                assignedUserId: assignedUserId,
                contactId: selectedContact.id,
                projectId: selectedProject, 
                step: selectedStep,
                type: 'call',
            };
            if (isEditing) {
              updateCall(newCall);
              toast({ title: `✅ Appel modifié !`, description: `Les changements ont été enregistrés.` });
            } else {
              addCall(newCall);
              toast({ title: `✅ Appel ajouté !`, description: `Appel avec ${selectedContact.name} planifié.` });
            }
        } else if (activityType === 'task') {
            const newTask = {
                id: isEditing ? initialData.id : Date.now(),
                text: details || `Tâche pour ${selectedContact.name}`,
                done: isEditing ? initialData.done : false,
                date: activityDateTime.toISOString(),
                assignedUserId: assignedUserId,
                contactId: selectedContact.id,
                projectId: selectedProject,
                step: selectedStep,
                type: 'task',
            };
            if (isEditing) {
              updateTask(newTask);
              toast({ title: `✅ Tâche modifiée !`, description: `Les changements ont été enregistrés.` });
            } else {
              addTask(newTask);
              toast({ title: `✅ Tâche ajoutée !`, description: `Tâche planifiée pour ${selectedContact.name}.` });
            }
        } else { // RDV
            const endDateTime = add(activityDateTime, { hours: 1 });
            const appointmentData = {
                title: `${activityType === 'physical' ? '📍' : '🎥'} RDV avec ${selectedContact.name}`,
                startTime: activityDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                contactId: selectedContact.id,
                projectId: selectedProject,
                step: selectedStep,
                assignedUserId: assignedUserId,
                type: activityType,
                status: isEditing ? initialData.status : 'pending',
                share: share,
                notes: details,
                location: activityType === 'physical' ? 'À définir' : 'Visio',
            };
            
            if (isEditing) {
                updateAppointment(initialData.id, appointmentData);
                toast({ title: '✅ RDV Modifié !', description: `Le RDV a été mis à jour.` });
            } else {
                addAppointment(appointmentData);
                toast({ title: '✅ RDV Ajouté !', description: `RDV le ${format(activityDateTime, 'dd/MM/yy à HH:mm')}.` });
            }

            if (share) {
                toast({ title: '✅ RDV partagé avec le client.', description: `Placé sous l'étape: ${selectedStep}.` });
            }
        }

        handleClose();
    };
    
    const isRdv = activityType === 'physical' || activityType === 'virtual';

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[480px] p-0">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Modifier l'activité" : "Ajouter une activité"}</DialogTitle>
                    <DialogDescription>{isEditing ? "Mettez à jour les détails de l'activité." : "Planifiez un nouveau rendez-vous et intégrez-le au projet d'un client."}</DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto px-6 py-4 grid gap-6 flex-1">
                    <div className="space-y-2">
                        <Label>Étape 1 : Sélectionner un Contact</Label>
                        <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={contactSearchOpen} className="w-full justify-between">
                                    {selectedContact ? selectedContact.name : "Sélectionner un contact..."}
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[420px] p-0">
                                <Command>
                                    <CommandInput placeholder="Rechercher un contact..." />
                                    <CommandList>
                                        <CommandEmpty>Aucun contact trouvé.</CommandEmpty>
                                        <CommandGroup>
                                            {prospects.map((prospect) => (
                                                <CommandItem
                                                    key={prospect.id}
                                                    value={prospect.name}
                                                    onSelect={() => {
                                                        setSelectedContact(prospect);
                                                        if (!initialData || !isEditing) {
                                                          setSelectedProject('');
                                                          setSelectedStep('');
                                                        }
                                                        setContactSearchOpen(false);
                                                    }}
                                                >
                                                    {prospect.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    {selectedContact && (
                      <>
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                            <Label>Étape 2 : Sélectionner le Projet</Label>
                            <Select value={selectedProject} onValueChange={(value) => { setSelectedProject(value); setSelectedStep(''); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un projet" />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedContact.tags.map(tag => (
                                        <SelectItem key={tag} value={tag}>{allProjectsData[tag]?.title || tag}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </motion.div>
                        
                        {selectedProject && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Étape 3 : Étape du projet</Label>
                                    <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                                      <span>{(isRdv || activityType === 'call' || activityType === 'task') ? (selectedStep || "Sélectionnez une étape") : "Non applicable"}</span>
                                      {(isRdv || activityType === 'call' || activityType === 'task') && <Zap className="h-4 w-4 text-gray-400" />}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Étape 4 : Créer l'activité</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant={activityType === 'physical' ? 'default' : 'outline'} onClick={() => setActivityType('physical')} className={activityType === 'physical' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'text-blue-500 border-blue-500'}>
                                            <MapPin className="mr-2 h-4 w-4"/>RDV Physique
                                        </Button>
                                        <Button variant={activityType === 'virtual' ? 'default' : 'outline'} onClick={() => setActivityType('virtual')} className={activityType === 'virtual' ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'text-purple-500 border-purple-500'}>
                                            <Video className="mr-2 h-4 w-4"/>RDV Virtuel
                                        </Button>
                                        <Button variant={activityType === 'call' ? 'default' : 'outline'} onClick={() => setActivityType('call')} className={activityType === 'call' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'text-yellow-500 border-yellow-500'}>
                                            <Phone className="mr-2 h-4 w-4"/>Appel
                                        </Button>
                                        <Button variant={activityType === 'task' ? 'default' : 'outline'} onClick={() => setActivityType('task')} className={activityType === 'task' ? 'bg-green-500 hover:bg-green-600 text-white' : 'text-green-500 border-green-500'}>
                                            <CheckSquare className="mr-2 h-4 w-4"/>Tâche
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="date">Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date ? format(date, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="time">Heure</Label>
                                        <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Assigné à</Label>
                                    <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" aria-expanded={userSearchOpen} className="w-full justify-between">
                                                {assignedUserId ? users[assignedUserId]?.name : "Sélectionner un utilisateur..."}
                                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[420px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Rechercher un utilisateur..." />
                                                <CommandList>
                                                    <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                                                    <CommandGroup>
                                                        {userOptions.map((user) => (
                                                            <CommandItem
                                                                key={user.value}
                                                                value={user.label}
                                                                onSelect={() => {
                                                                    setAssignedUserId(user.value);
                                                                    setUserSearchOpen(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", assignedUserId === user.value ? "opacity-100" : "opacity-0")} />
                                                                {user.label}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="details">Détails</Label>
                                    <Textarea id="details" placeholder={activityType === 'task' ? "Description de la tâche..." : "Ajouter des détails..."} value={details} onChange={(e) => setDetails(e.target.value)} />
                                </div>
                                
                                {isRdv && (
                                  <div className="flex items-center space-x-2">
                                      <Switch id="share-client" checked={share} onCheckedChange={setShare} />
                                      <Label htmlFor="share-client">Partager avec le client</Label>
                                  </div>
                                )}
                            </motion.div>
                        )}
                      </>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={!selectedContact || !selectedProject || !assignedUserId} className="bg-green-600 hover:bg-green-700">
                        Valider
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const Agenda = () => {
  const { users, activeAdminUser } = useAppContext();
  
  // 🔥 Charger l'UUID Supabase de l'utilisateur authentifié
  const { supabaseUserId, loading: userIdLoading } = useSupabaseUser();
  
  // 🔥 Charger TOUS les utilisateurs Supabase pour le dropdown
  const { users: supabaseUsers, loading: usersLoading } = useSupabaseUsers();
  
  // 🚀 MIGRATION SUPABASE : Charger les données depuis Supabase
  const {
    appointments: supabaseAppointments,
    calls: supabaseCalls,
    tasks: supabaseTasks,
    loading: agendaLoading,
    addAppointment: addSupabaseAppointment,
    updateAppointment: updateSupabaseAppointment,
    deleteAppointment: deleteSupabaseAppointment,
    addCall: addSupabaseCall,
    updateCall: updateSupabaseCall,
    deleteCall: deleteSupabaseCall,
    addTask: addSupabaseTask,
    updateTask: updateSupabaseTask,
    deleteTask: deleteSupabaseTask,
  } = useSupabaseAgenda(activeAdminUser);

  // 🔥 Charger les prospects depuis Supabase pour l'autocomplétion
  const {
    prospects: supabaseProspects,
    loading: prospectsLoading,
  } = useSupabaseProspects(activeAdminUser);

  // Utiliser les données Supabase
  const appointments = supabaseAppointments;
  const calls = supabaseCalls;
  const tasks = supabaseTasks;
  const prospects = supabaseProspects; // 🔥 Utiliser les prospects Supabase
  const addAppointment = addSupabaseAppointment;
  const updateAppointment = updateSupabaseAppointment;
  
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedOtherActivity, setSelectedOtherActivity] = useState({ type: null, data: null });
  const [isAddActivityModalOpen, setAddActivityModalOpen] = useState(false);
  const [activityModalData, setActivityModalData] = useState(null);
  // 🔧 Utiliser supabaseUserId au lieu de activeAdminUser.id (qui est "user-1")
  const [selectedUserId, setSelectedUserId] = useState(supabaseUserId || activeAdminUser?.id || 'user-1');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // UI state: highlight hovered/selected hour row across the grid
  const [hoveredHourIndex, setHoveredHourIndex] = useState(null); // 0 -> 08:00, 1 -> 09:00, ...
  const [selectedHourIndex, setSelectedHourIndex] = useState(null);
  
  // Drag and drop state
  const [dragOverSlot, setDragOverSlot] = useState(null); // {day, hour} pour highlighter la zone de drop

  const normalizedAppointments = useMemo(() => {
    return appointments
      .map((appointment) => {
        const startDate = appointment?.start instanceof Date ? appointment.start : new Date(appointment?.start);
        const endDate = appointment?.end instanceof Date ? appointment.end : new Date(appointment?.end);

        if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime()) || !(endDate instanceof Date) || Number.isNaN(endDate.getTime())) {
          console.warn('[Agenda] Rendez-vous ignoré car les dates sont invalides.', appointment);
          return null;
        }

        return { ...appointment, start: startDate, end: endDate };
      })
      .filter(Boolean);
  }, [appointments]);

  // 🔥 Utiliser les utilisateurs Supabase pour le dropdown
  const allowedUsers = useMemo(() => {
    if (!activeAdminUser || supabaseUsers.length === 0) return [];
    // Pour l'instant, on affiche tous les utilisateurs Supabase
    // TODO: Implémenter les droits d'accès plus tard
    return supabaseUsers;
  }, [activeAdminUser, supabaseUsers]);

  const userOptions = useMemo(() => {
    console.log('👥 userOptions générés:', allowedUsers.length, 'utilisateurs');
    return allowedUsers.map(user => ({ value: user.id, label: user.name }));
  }, [allowedUsers]);

  // 🔧 Mettre à jour selectedUserId quand supabaseUserId est chargé
  useEffect(() => {
    if (supabaseUserId) {
      console.log('🔧 Mise à jour selectedUserId avec supabaseUserId:', supabaseUserId);
      setSelectedUserId(supabaseUserId);
    } else if (activeAdminUser) {
      if (!allowedUsers.some(u => u.id === selectedUserId)) {
        setSelectedUserId(activeAdminUser.id);
      }
    }
  }, [supabaseUserId, activeAdminUser, selectedUserId, allowedUsers]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const prevWeek = () => setCurrentDate(sub(currentDate, { weeks: 1 }));
  const nextWeek = () => setCurrentDate(add(currentDate, { weeks: 1 }));
  const goToToday = () => setCurrentDate(today);

  const handleConnectGoogleCalendar = () => {
    toast({ title: "Connexion à Google Agenda 🚀", description: "Simulation: Authentification réussie, votre agenda est synchronisé !" });
    setIsGoogleCalendarConnected(true);
  };

  const handleReport = (eventToReport) => {
    const { id, ...rest } = eventToReport;
    setActivityModalData({ ...rest, start: new Date() });
    setAddActivityModalOpen(true);
  };

  const handleEdit = (activityToEdit, type) => {
    setSelectedEvent(null);
    setSelectedOtherActivity({ type: null, data: null });
    setActivityModalData({ ...activityToEdit, type: type || activityToEdit.type });
    setAddActivityModalOpen(true);
  };

  const handleAddActivity = (date) => {
    const initialData = date ? { start: date } : { start: new Date() };
    setActivityModalData(initialData);
    setAddActivityModalOpen(true);
  };

  const handleSelectOtherActivity = (type, activity) => {
    setSelectedOtherActivity({ type, data: activity });
  };

  const handleAddActivityModalClose = (isOpen) => {
    if (!isOpen) {
      setActivityModalData(null);
    }
    setAddActivityModalOpen(isOpen);
  };

  const handleSlotClick = (day, hour) => {
    const [hourPart] = hour.split(':');
    const clickedDate = set(day, { hours: parseInt(hourPart, 10), minutes: 0, seconds: 0, milliseconds: 0 });
    // Reset la sélection visuelle lors du clic pour éviter le fond bleu persistant
    setSelectedHourIndex(null);
    setHoveredHourIndex(null);
    handleAddActivity(clickedDate);
  };

  // Fonctions drag and drop
  const handleDragOver = (e, day, hour) => {
    e.preventDefault(); // Necessary to allow drop
    // Some browsers need explicit dropEffect on dragover
    try { e.dataTransfer.dropEffect = 'move'; } catch {}
    setDragOverSlot({ day: day.toString(), hour });
  };

  const handleDragLeave = (e) => {
    // Ne réinitialiser que si on sort vraiment de la zone (pas juste un changement d'élément enfant)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverSlot(null);
    }
  };

  const handleDrop = (e, day, hour) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    try {
      let raw = e.dataTransfer.getData('application/json');
      if (!raw) {
        raw = e.dataTransfer.getData('text/plain');
      }
      const dragData = JSON.parse(raw);
      const { appointmentId, duration } = dragData;
      
      // Calculer l'heure exacte basée sur la position de la souris
      const rect = e.currentTarget.getBoundingClientRect();
      const cellHeight = rect.height;
      const mouseY = e.clientY - rect.top;
      // Ajuster le calcul pour compenser le décalage - utiliser la position exacte du dragOver
      const minuteOffset = Math.max(0, Math.min(59, Math.round((mouseY / cellHeight) * 60)));
      
      // Si on a un dragOverSlot, utiliser sa position exacte plutôt que le calcul de souris
      let finalMinutes = minuteOffset;
      if (dragOverSlot && dragOverSlot.day === day.toString() && dragOverSlot.hour === hour) {
        // Utiliser 0 minutes pour être cohérent avec l'affichage du dragOver
        finalMinutes = 0;
      }
      
      // Calculer la nouvelle heure
      const [hourPart] = hour.split(':');
      const newStart = set(day, { 
        hours: parseInt(hourPart, 10), 
        minutes: finalMinutes, 
        seconds: 0, 
        milliseconds: 0 
      });
      
      // Calculer la nouvelle heure de fin en préservant la durée
  let durHours = Math.floor(duration);
  let durMinutes = Math.round((duration - durHours) * 60);
  if (durMinutes >= 60) { durHours += 1; durMinutes -= 60; }
  const newEnd = add(newStart, { hours: durHours, minutes: durMinutes });
      
      // Mettre à jour le rendez-vous
      const original = normalizedAppointments.find(app => app.id === appointmentId);
      if (original) {
        // 1) Marquer l'original comme reporté (il reste à sa place)
        updateAppointment(original.id, { status: 'reporte' });

        // 2) Créer un nouveau RDV à la nouvelle date en conservant les infos
        const newAppointmentData = {
          title: original.title,
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
          contactId: original.contactId,
          assignedUserId: original.assignedUserId,
          projectId: original.projectId,
          step: original.step,
          type: original.type,
          status: 'pending',
          share: original.share,
          notes: original.notes,
          location: original.location,
        };
        addAppointment(newAppointmentData);

        toast({
          title: "📅 RDV replanifié",
          description: `Original marqué comme reporté. Nouveau : ${format(newStart, 'EEEE d MMMM à HH:mm', { locale: fr })}`
        });
      }
    } catch (error) {
      console.error('Erreur lors du drop:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déplacer le rendez-vous",
        variant: "destructive"
      });
    }
  };

  const filteredAppointments = useMemo(() => {
    if (!activeAdminUser) return [];
    const allowedIds = (activeAdminUser.role === 'Global Admin' || activeAdminUser.role === 'Admin') 
      ? null 
      : [activeAdminUser.id, ...(activeAdminUser.accessRights?.users || [])];
      
    console.log('🔍 Filtrage appointments:', {
      total: normalizedAppointments.length,
      selectedUserId,
      activeAdminUserId: activeAdminUser?.id,
      premier_apt: normalizedAppointments[0]
    });
    
    return normalizedAppointments.filter(app => {
      const isVisible = allowedIds ? allowedIds.includes(app.assignedUserId) : true;
      const match = app.assignedUserId === selectedUserId;
      console.log(`🔍 Appointment ${app.id}: assignedUserId=${app.assignedUserId}, selectedUserId=${selectedUserId}, match=${match}`);
      return isVisible && match;
    });
  }, [normalizedAppointments, selectedUserId, activeAdminUser]);

  // Afficher le loader si les données chargent
  if (agendaLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement de l'agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
      <div className="flex flex-col flex-1 min-w-0 bg-white rounded-3xl shadow-lg border border-gray-100">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 flex-wrap gap-2">
          <div className="flex items-center space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-auto md:w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">{capitalizeFirstLetter(format(currentDate, 'MMMM yyyy', { locale: fr }))}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={currentDate} onSelect={(date) => date && setCurrentDate(date)} initialFocus />
              </PopoverContent>
            </Popover>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={prevWeek} className="h-10 w-10"><ChevronLeft className="h-5 w-5" /></Button>
              <Button variant="outline" onClick={goToToday} className="hidden sm:inline-flex">Aujourd'hui</Button>
              <Button variant="ghost" size="icon" onClick={nextWeek} className="h-10 w-10"><ChevronRight className="h-5 w-5" /></Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={userSearchOpen} className="w-[180px] justify-between">
                        <Users className="mr-2 h-4 w-4" />
                        {selectedUserId ? (supabaseUsers.find(u => u.id === selectedUserId)?.name || "Utilisateur") : "Utilisateur"}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder="Rechercher..." />
                        <CommandList>
                            <CommandEmpty>Aucun utilisateur</CommandEmpty>
                            <CommandGroup>
                                {userOptions.map((user) => (
                                    <CommandItem
                                        key={user.value}
                                        value={user.label}
                                        onSelect={() => {
                                            setSelectedUserId(user.value);
                                            setUserSearchOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.value ? "opacity-100" : "opacity-0")} />
                                        {user.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {!isGoogleCalendarConnected ? (
              <Button onClick={handleConnectGoogleCalendar} className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm">
                <GoogleLogo /><span className="ml-2 hidden sm:inline">Connecter Google Agenda</span>
              </Button>
            ) : (
              <div className="flex items-center space-x-2 text-sm text-green-600 font-medium">
                <GoogleLogo /><span>Synchronisé</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden rounded-b-3xl">
          <div className="flex flex-1 overflow-auto no-scrollbar">
            <div className="w-16 text-right pr-2 relative bg-[#f6f9ff] border-r border-gray-100 select-none">
              <div className="absolute top-[112px] right-0 w-full">
                <div
                  className={cn(
                    "h-[60px] -translate-y-1/2 cursor-pointer pr-2 flex items-center justify-end text-xs transition-colors",
                    hoveredHourIndex === 0 && "bg-blue-50",
                    selectedHourIndex === 0 && "bg-blue-100"
                  )}
                  onMouseEnter={() => setHoveredHourIndex(0)}
                  onMouseLeave={() => setHoveredHourIndex(null)}
                  onClick={() => setSelectedHourIndex(0)}
                  aria-label="08:00"
                  role="button"
                />
                {hours.slice(1).map((hour, i) => (
                  <div
                    key={hour}
                    className={cn(
                      "h-[60px] -translate-y-1/2 cursor-pointer pr-2 flex items-center justify-end text-xs transition-colors",
                      hoveredHourIndex === i + 1 && "bg-blue-50",
                      selectedHourIndex === i + 1 && "bg-blue-100 font-medium text-blue-700"
                    )}
                    onMouseEnter={() => setHoveredHourIndex(i + 1)}
                    onMouseLeave={() => setHoveredHourIndex(null)}
                    onClick={() => setSelectedHourIndex(i + 1)}
                    role="button"
                    aria-label={hour}
                  >
                    <span className={cn("text-gray-400", (hoveredHourIndex === i + 1 || selectedHourIndex === i + 1) && "text-blue-600 font-medium")}>{hour}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-5 flex-1 pr-4 bg-white" onMouseLeave={() => setHoveredHourIndex(null)}>
              {days.map((day) => (
                <div key={day.toString()} className="relative border-l border-gray-200">
                  <div className="sticky top-0 bg-white z-10 p-2 text-center border-b border-gray-200">
                    <p className={`text-xs font-medium ${isSameDay(day, today) ? 'text-blue-600' : 'text-gray-500'}`}>{format(day, 'eee', { locale: fr }).toUpperCase()}</p>
                    <div className="flex justify-center items-center h-10">
                      <p className={`text-2xl font-bold ${isSameDay(day, today) ? 'text-blue-600 bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center' : 'text-gray-800'}`}>{format(day, 'd')}</p>
                    </div>
                  </div>
                  <div className="relative h-full">
                    {/* 08:00 row */}
                      <div
                        className={cn(
                          "h-[60px] cursor-pointer transition-colors relative",
                          hoveredHourIndex === 0 && "bg-blue-50",
                          selectedHourIndex === 0 && "bg-blue-100",
                          dragOverSlot?.day === day.toString() && dragOverSlot?.hour === '08:00' && "bg-green-100 border-2 border-green-400 border-dashed"
                        )}
                        onMouseEnter={() => setHoveredHourIndex(0)}
                        onMouseLeave={() => setHoveredHourIndex(null)}
                        onClick={() => handleSlotClick(day, '08:00')}
                        onDragEnter={(e) => handleDragOver(e, day, '08:00')}
                        onDragOver={(e) => handleDragOver(e, day, '08:00')}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day, '08:00')}
                      >
                        {dragOverSlot?.day === day.toString() && dragOverSlot?.hour === '08:00' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-green-600 font-medium text-sm bg-green-50 px-2 py-1 rounded shadow">
                              Déposer ici
                            </span>
                          </div>
                        )}
                      </div>
                    {hours.slice(1).map((hour, hourIndex) => (
                        <div 
                          key={hourIndex} 
                          className={cn(
                            "h-[60px] border-t border-gray-200 cursor-pointer transition-colors relative",
                            hoveredHourIndex === hourIndex + 1 && "bg-blue-50",
                            selectedHourIndex === hourIndex + 1 && "bg-blue-100",
                            dragOverSlot?.day === day.toString() && dragOverSlot?.hour === hour && "bg-green-100 border-2 border-green-400 border-dashed"
                          )}
                          onMouseEnter={() => setHoveredHourIndex(hourIndex + 1)}
                          onMouseLeave={() => setHoveredHourIndex(null)}
                          onClick={() => handleSlotClick(day, hour)}
                          onDragEnter={(e) => handleDragOver(e, day, hour)}
                          onDragOver={(e) => handleDragOver(e, day, hour)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day, hour)}
                        >
                          {dragOverSlot?.day === day.toString() && dragOverSlot?.hour === hour && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-green-600 font-medium text-sm bg-green-50 px-2 py-1 rounded shadow">
                                Déposer ici
                              </span>
                            </div>
                          )}
                        </div>
                    ))}
                    {filteredAppointments.filter(app => isSameDay(app.start, day)).map(app => (
                 <Appointment key={app.id} appointment={app} onAppointmentClick={setSelectedEvent} onDrop={handleDrop} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="block lg:hidden border-t border-gray-200">
        <AgendaSidebar onAddActivity={handleAddActivity} currentDate={currentDate} selectedUserId={selectedUserId} onSelectActivity={handleSelectOtherActivity} onAppointmentClick={setSelectedEvent}/>
      </div>
      
      <motion.div 
        className="hidden lg:flex lg:flex-shrink-0 relative h-full"
        initial={false}
        animate={{ 
          width: isSidebarCollapsed ? 0 : 320,
          opacity: isSidebarCollapsed ? 0 : 1 
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{ overflow: "visible", pointerEvents: isSidebarCollapsed ? "none" : "auto" }}
      >
        {/* Bouton de rétraction sur la bordure gauche */}
        <Button
          variant="default"
          size="icon"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-30 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-xl rounded-full border-2 border-white flex items-center justify-center p-0"
          title={isSidebarCollapsed ? "Ouvrir la sidebar" : "Fermer la sidebar"}
        >
          <SidebarToggleIcon className={cn("h-6 w-6 text-white transition-transform duration-200", isSidebarCollapsed ? "rotate-180" : "")} />
        </Button>
        
        {!isSidebarCollapsed && (
          <AgendaSidebar onAddActivity={handleAddActivity} currentDate={currentDate} selectedUserId={selectedUserId} onSelectActivity={handleSelectOtherActivity} onAppointmentClick={setSelectedEvent}/>
        )}
      </motion.div>

      {/* Bouton flottant quand la sidebar est rétractée */}
      {isSidebarCollapsed && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed right-6 top-1/2 -translate-y-1/2 z-30 lg:block hidden"
        >
          <Button
            variant="default"
            size="icon"
            onClick={() => setIsSidebarCollapsed(false)}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 shadow-xl rounded-full border-2 border-white"
            title="Ouvrir la sidebar"
          >
            <SidebarToggleIcon className="h-6 w-6 text-white transition-transform duration-200 rotate-180" />
          </Button>
        </motion.div>
      )}

      <EventDetailsPopup 
        event={selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        onReport={handleReport} 
        onEdit={handleEdit}
        prospects={prospects}
        supabaseUsers={supabaseUsers}
        updateAppointment={updateAppointment}
        deleteAppointment={deleteSupabaseAppointment}
      />
      <OtherActivityDetailsPopup 
        activity={selectedOtherActivity.data} 
        type={selectedOtherActivity.type} 
        onClose={() => setSelectedOtherActivity({ type: null, data: null })} 
        onEdit={handleEdit}
        prospects={prospects}
        supabaseUsers={supabaseUsers}
        updateCall={updateSupabaseCall}
        deleteCall={deleteSupabaseCall}
        updateTask={updateSupabaseTask}
        deleteTask={deleteSupabaseTask}
      />
      <AddActivityModal 
        open={isAddActivityModalOpen} 
        onOpenChange={handleAddActivityModalClose} 
        initialData={activityModalData} 
        defaultAssignedUserId={selectedUserId}
        addAppointment={addAppointment}
        addCall={addSupabaseCall}
        addTask={addSupabaseTask}
        updateAppointment={updateAppointment}
        updateCall={updateSupabaseCall}
        updateTask={updateSupabaseTask}
        prospects={prospects}
      />
    </div>
  );
};

export default Agenda;
export { AddActivityModal };
