import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, MessageSquare, CalendarClock, DollarSign, ChevronRight } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useCommunications';
import { useMyMeetings } from '@/hooks/useMeetings';
import { useMyAdvances } from '@/hooks/useSalaryAdvances';

interface PendingItemsPanelProps {
  userId: string;
}

interface PendingItem {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  href: string;
  variant: 'destructive' | 'default' | 'secondary';
}

export function PendingItemsPanel({ userId }: PendingItemsPanelProps) {
  const unreadComms = useUnreadCount();
  const { data: myMeetings } = useMyMeetings();
  const { data: myAdvances } = useMyAdvances(userId);

  const pendingMeetings =
    myMeetings?.filter((m) => m.status === 'convocada' || m.status === 'en_curso').length || 0;

  const pendingAdvances = myAdvances?.filter((a) => a.status === 'pending').length || 0;

  const items = [
    {
      key: 'comms',
      label: 'Comunicados sin leer',
      count: unreadComms || 0,
      icon: <MessageSquare className="w-4 h-4" />,
      href: '/cuenta/comunicados',
      variant: 'destructive',
    },
    {
      key: 'meetings',
      label: 'Reuniones pendientes',
      count: pendingMeetings,
      icon: <CalendarClock className="w-4 h-4" />,
      href: '/cuenta/reuniones',
      variant: 'default',
    },
    {
      key: 'advances',
      label: 'Adelantos en espera',
      count: pendingAdvances,
      icon: <DollarSign className="w-4 h-4" />,
      href: '/cuenta/adelantos',
      variant: 'secondary',
    },
  ].filter((item) => item.count > 0) as PendingItem[];

  if (items.length === 0) return null;

  const totalPending = items.reduce((acc, i) => acc + i.count, 0);

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Pendientes
          <Badge variant="secondary" className="ml-auto">
            {totalPending}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.key}
            to={item.href}
            className="flex items-center gap-3 p-2.5 -mx-1 rounded-lg hover:bg-muted transition-colors"
          >
            <span className="text-muted-foreground">{item.icon}</span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <Badge variant={item.variant} className="text-xs">
              {item.count}
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
