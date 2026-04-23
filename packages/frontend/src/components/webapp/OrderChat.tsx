/**
 * OrderChat — Embedded chat component for TrackingPage.
 * Uses edge function for guest access and Supabase Realtime for live updates.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { subscribeToChatMessages, unsubscribeChannel } from '@/services/webappOrderService';
import { formatTime } from '@/lib/formatters';

interface ChatMessage {
  id: string;
  sender_type: 'cliente' | 'local';
  sender_name: string;
  message: string;
  leido: boolean;
  created_at: string;
}

interface OrderChatProps {
  trackingCode: string;
  pedidoId: string;
  branchName: string;
  clienteNombre: string;
  chatActive: boolean;
}

export function OrderChat({
  trackingCode,
  pedidoId,
  branchName,
  clienteNombre,
  chatActive,
}: OrderChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/webapp/orders/${trackingCode}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      /* silent */
    }
  }, [trackingCode]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!pedidoId) return;
    const channel = subscribeToChatMessages(
      pedidoId,
      `chat-${pedidoId}`,
      (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_type === 'local' && !open) {
          setUnread((prev) => prev + 1);
        }
      },
    );

    return () => {
      unsubscribeChannel(channel);
    };
  }, [pedidoId, open]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Clear unread on open
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    try {
      const res = await fetch(`/api/webapp/orders/${trackingCode}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: trackingCode,
          message: text,
          sender_name: clienteNombre || 'Cliente',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Optimistic add
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            sender_type: 'cliente',
            sender_name: clienteNombre || 'Cliente',
            message: text,
            leido: false,
            created_at: data.created_at,
          },
        ]);
        setInput('');
      }
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  };

  if (!chatActive && messages.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Toggle button */}
      {!open && (
        <Button variant="outline" className="w-full gap-2 relative" onClick={() => setOpen(true)}>
          <MessageCircle className="w-4 h-4" />
          Chatear con {branchName}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unread}
            </span>
          )}
        </Button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="rounded-xl border overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Chat con {branchName}
            </span>
            <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-56 overflow-y-auto bg-muted/30 px-3 py-2 space-y-2">
            {messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground pt-8">
                Escribí tu consulta al local
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'cliente' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    msg.sender_type === 'cliente'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm break-words">{msg.message}</p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      msg.sender_type === 'cliente' ? 'opacity-70' : 'text-muted-foreground'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {chatActive ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2 p-2 border-t bg-background"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu mensaje..."
                maxLength={500}
                className="text-sm h-9"
                disabled={sending}
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 px-3"
                disabled={!input.trim() || sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <div className="p-3 text-center text-xs text-muted-foreground border-t bg-muted/50">
              Este chat ya no está activo
            </div>
          )}
        </div>
      )}
    </div>
  );
}
