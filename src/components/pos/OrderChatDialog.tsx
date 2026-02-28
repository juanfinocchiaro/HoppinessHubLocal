/**
 * OrderChatDialog — POS-side chat dialog for staff to reply to customer messages.
 * Uses Supabase client directly (authenticated via RLS).
 */
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  fetchOrderChatMessages,
  insertOrderChatMessage,
  markChatMessagesRead,
  subscribeToChatMessages,
  removeSupabaseChannel,
  getAuthUser,
} from '@/services/posService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatTime } from '@/lib/formatters';

interface ChatMessage {
  id: string;
  sender_type: string;
  sender_nombre: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
}

interface OrderChatDialogProps {
  pedidoId: string;
  branchId: string;
  branchName: string;
  numeroPedido: number;
  clienteNombre: string | null;
}

export function OrderChatDialog({
  pedidoId,
  branchId,
  branchName,
  numeroPedido,
  clienteNombre,
}: OrderChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['order-chat', pedidoId],
    queryFn: async () => {
      const data = await fetchOrderChatMessages(pedidoId);
      return data as ChatMessage[];
    },
    enabled: !!pedidoId,
    refetchInterval: open ? 10000 : 30000,
  });

  const unreadCount = messages.filter((m) => m.sender_type === 'cliente' && !m.leido).length;

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const user = await getAuthUser();
      await insertOrderChatMessage({
        pedido_id: pedidoId,
        branch_id: branchId,
        sender_type: 'local',
        sender_id: user?.id,
        sender_nombre: branchName,
        mensaje: text.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-chat', pedidoId] });
      setInput('');
    },
  });

  // Mark as read when opening
  useEffect(() => {
    if (!open || unreadCount === 0) return;
    markChatMessagesRead(pedidoId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['order-chat', pedidoId] });
    });
  }, [open, unreadCount, pedidoId, queryClient]);

  // Realtime
  useEffect(() => {
    const channel = subscribeToChatMessages(pedidoId, () => {
      queryClient.invalidateQueries({ queryKey: ['order-chat', pedidoId] });
    });
    return () => {
      removeSupabaseChannel(channel);
    };
  }, [pedidoId, queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 relative">
          <MessageCircle className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 min-w-4 animate-pulse">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm">
            💬 Chat · Pedido #{numeroPedido}
            {clienteNombre && (
              <span className="font-normal text-muted-foreground"> · {clienteNombre}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div className="h-64 overflow-y-auto px-3 py-2 space-y-2 bg-muted/30">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground pt-8">Sin mensajes aún</p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'local' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 ${
                  msg.sender_type === 'local'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border rounded-bl-sm'
                }`}
              >
                {msg.sender_type === 'cliente' && (
                  <p className="text-[10px] font-semibold mb-0.5">{msg.sender_nombre}</p>
                )}
                <p className="text-sm break-words">{msg.mensaje}</p>
                <p
                  className={`text-[10px] mt-0.5 ${
                    msg.sender_type === 'local' ? 'opacity-70' : 'text-muted-foreground'
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) sendMutation.mutate(input);
          }}
          className="flex gap-2 p-3 border-t"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Respondé al cliente..."
            maxLength={500}
            className="text-sm h-9"
            disabled={sendMutation.isPending}
          />
          <Button
            type="submit"
            size="sm"
            className="h-9 px-3"
            disabled={!input.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
