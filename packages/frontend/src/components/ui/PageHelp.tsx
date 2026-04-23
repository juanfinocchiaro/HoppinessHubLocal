import { HelpCircle, ChevronDown, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { useState } from 'react';

interface PageHelpProps {
  pageId: string;
}

export function PageHelp({ pageId }: PageHelpProps) {
  const { config, isDismissed, dismissHelp } = useContextualHelp(pageId);
  const [isOpen, setIsOpen] = useState(true);

  if (!config || isDismissed) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card className="bg-primary/5 border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-row items-center justify-between py-3 cursor-pointer hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              <span className="font-medium text-primary">{config.title}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3">
            <p className="text-sm text-foreground/80 mb-3">{config.description}</p>
            <ul className="text-sm space-y-1.5 mb-3">
              {config.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span className="text-foreground/70">{tip}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissHelp}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              No mostrar de nuevo
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
