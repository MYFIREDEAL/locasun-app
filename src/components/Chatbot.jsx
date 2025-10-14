import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CharlyChat from '@/components/admin/CharlyChat';

const Chatbot = ({ isDesktop }) => {
  const [isOpen, setIsOpen] = useState(false);

  const ChatPanel = ({ onClose, isMobile }) => {
    return (
      <motion.div
        initial={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, x: "20px" }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        exit={isMobile ? { opacity: 0, y: "100%" } : { opacity: 0, x: "20px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={isMobile ? "fixed inset-0 bg-white z-50 flex flex-col" : "w-full"}
      >
        <CharlyChat />
        {isMobile && (
          <div className="absolute top-4 right-4">
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-black/20 text-white hover:bg-black/40">
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  if (isDesktop) {
    return <ChatPanel onClose={() => {}} isMobile={false} />;
  }

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full gradient-green shadow-soft hover:shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
            <img 
              className="w-full h-auto object-contain" 
              alt="Ouvrir le chat avec Charly" 
              src="https://horizons-cdn.hostinger.com/43725989-d002-4543-b65c-278701925e7e/4e3f809791e357819f31c585852d3a99.png" 
            />
          </div>
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && <ChatPanel onClose={() => setIsOpen(false)} isMobile={true} />}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;