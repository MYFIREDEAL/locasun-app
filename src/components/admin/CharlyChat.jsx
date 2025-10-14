import React from 'react';
import { Calendar, Phone, MessageSquare, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
const CharlyChat = () => {
  const handleQuickAction = action => {
    toast({
      title: `🚧 Action rapide "${action}" non implémentée.`,
      description: "Vous pouvez demander son développement ! 🚀"
    });
  };
  return <div className="w-full flex-shrink-0 bg-white rounded-3xl shadow-soft flex flex-col overflow-hidden">
            <div className="relative">
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-br from-teal-400 to-green-500 rounded-t-3xl"></div>
                <div className="relative pt-6 px-6 flex justify-center">
                    {/* Avatar de Charly */}
                    <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                        <img className="w-full h-auto object-contain rounded-full" alt="Avatar de Charly, conseiller virtuel Evatime" src="https://horizons-cdn.hostinger.com/43725989-d002-4543-b65c-278701925e7e/4e3f809791e357819f31c585852d3a99.png" />
                    </div>
                </div>
            </div>
            
            <div className="p-4 text-center">
                <h3 className="font-bold text-lg text-gray-900">Bonjour 👋</h3>
                <p className="text-gray-600 text-xs">Je suis Charly, enchanté de vous connaitre !!  Posez-moi une question ou lancez une action.</p>
            </div>

            <div className="px-4 grid grid-cols-2 gap-2">
                <Button variant="outline" className="flex items-center justify-start space-x-2 text-xs h-9" onClick={() => handleQuickAction('RDV')}>
                    <Calendar className="h-4 w-4 text-blue-500" /> <span>RDV</span>
                </Button>
                <Button variant="outline" className="flex items-center justify-start space-x-2 text-xs h-9" onClick={() => handleQuickAction('Appel')}>
                    <Phone className="h-4 w-4 text-green-500" /> <span>Appel</span>
                </Button>
                <Button variant="outline" className="flex items-center justify-start space-x-2 text-xs h-9" onClick={() => handleQuickAction('SMS')}>
                    <MessageSquare className="h-4 w-4 text-purple-500" /> <span>SMS</span>
                </Button>
                <Button variant="outline" className="flex items-center justify-start space-x-2 text-xs h-9" onClick={() => handleQuickAction('Email')}>
                    <Mail className="h-4 w-4 text-orange-500" /> <span>Email</span>
                </Button>
            </div>

            <div className="p-4 mt-auto">
                <div className="relative">
                    <input type="text" placeholder="Écrire à Charly…" className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 h-8 w-8" onClick={() => toast({
          title: "Le chat n'est pas encore fonctionnel."
        })}>
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>;
};
export default CharlyChat;