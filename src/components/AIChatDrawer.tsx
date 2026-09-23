import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  Loader2,
  ChevronDown,
  Layers,
  FileText
} from 'lucide-react';
import { ChatMessage } from '../types';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToDrive?: () => void;
  onNavigateToMatrix?: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: `¡Hola! Soy tu **Asistente Operativo Inteligente Liderman** para el proyecto **Tesalia CBC**, administrado por **José Manuel Arguello Coloma**.\n\nPuedo guiarte en:\n• Clasificación exacta de novedades (Seguridad Física vs SSOMA).\n• Asignación manual o análisis de archivos del Repositorio Digital.\n• Protocolos y consignas en sucursales.\n• Consultas sobre indicadores y datos registrados.\n\n¿En qué te puedo apoyar el día de hoy?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    quickPrompts: [
      '¿Cómo clasifico una falla de cámara CCTV?',
      '¿Qué ítems componen SSOMA?',
      '¿Cómo asigno un archivo del Drive si falla el análisis?',
      '¿Cuáles son las 6 sucursales oficiales?'
    ]
  }
];

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToDrive,
  onNavigateToMatrix
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 200);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-4)
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const assistantMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickPrompts: data.quickPrompts || []
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Respuesta vacía');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Lo siento, no pude procesar tu solicitud en este momento. Puedes volver a intentarlo o consultar directamente las opciones en la cabecera.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES);
  };

  // Formatter for markdown-like bold and bullet text
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;
          
          // Format bold **text**
          const parts = line.split(/(\*\*.*?\*\*)/g);
          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*');

          return (
            <p key={idx} className={`${isBullet ? 'pl-2 text-slate-700 font-medium' : ''}`}>
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-bold text-slate-900">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity pointer-events-auto"
      />

      {/* Floating Panel / Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col pointer-events-auto border-l border-slate-200 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight">Asistente IA Liderman</span>
                <span className="text-[9px] bg-red-500/20 text-red-300 font-bold px-1.5 py-0.5 rounded border border-red-500/40">
                  Tesalia CBC
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Admin: José Manuel Arguello Coloma
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              title="Reiniciar conversación"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Guide Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-600" />
            <span className="font-semibold text-slate-800">Guías Rápidas del Sistema:</span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToMatrix && (
              <button
                onClick={() => {
                  onNavigateToMatrix();
                  onClose();
                }}
                className="text-red-700 hover:underline font-bold flex items-center gap-1"
              >
                <Layers className="w-3 h-3" /> Matriz
              </button>
            )}
            {onNavigateToDrive && (
              <button
                onClick={() => {
                  onNavigateToDrive();
                  onClose();
                }}
                className="text-teal-700 hover:underline font-bold flex items-center gap-1"
              >
                <FileText className="w-3 h-3" /> Drive
              </button>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-red-600 text-white rounded-br-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                }`}
              >
                {renderFormattedText(msg.text)}

                <div
                  className={`text-[9px] mt-1.5 flex justify-end ${
                    msg.sender === 'user' ? 'text-red-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* Quick Prompt Chips from Assistant */}
              {msg.sender === 'assistant' && msg.quickPrompts && msg.quickPrompts.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                  {msg.quickPrompts.map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="text-left text-[11px] bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-200 transition-all shadow-xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs bg-white border border-slate-200 px-3 py-2 rounded-xl w-fit">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
              <span>El Asistente Liderman está procesando tu consulta...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Pregúntale al Asistente (ej: ¿Cómo clasifico un derrame?)"
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-400" />
              Asistente de consulta rápida para consola y supervisión
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
