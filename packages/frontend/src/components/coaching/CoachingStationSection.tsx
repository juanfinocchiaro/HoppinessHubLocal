import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChefHat, Calculator, Package, Droplets } from 'lucide-react';
import { useState } from 'react';
import { ScoreLegend, SCORE_LABELS } from './ScoreLegend';
import type { WorkStation, StationCompetency } from '@/types/coaching';

const stationIcons: Record<string, React.ReactNode> = {
  cocinero: <ChefHat className="h-4 w-4" />,
  cajero: <Calculator className="h-4 w-4" />,
  runner: <Package className="h-4 w-4" />,
  lavacopas: <Droplets className="h-4 w-4" />,
};

interface StationScore {
  stationId: string;
  score: number;
  competencyScores: { competencyId: string; score: number }[];
}

interface CoachingStationSectionProps {
  stations: WorkStation[];
  competenciesByStation: Record<string, StationCompetency[]>;
  selectedStations: string[];
  stationScores: StationScore[];
  onToggleStation: (stationId: string) => void;
  onScoreChange: (stationId: string, score: number) => void;
  onCompetencyScoreChange: (stationId: string, competencyId: string, score: number) => void;
}

export function CoachingStationSection({
  stations,
  competenciesByStation,
  selectedStations,
  stationScores,
  onToggleStation,
  onScoreChange,
  onCompetencyScoreChange,
}: CoachingStationSectionProps) {
  const [expandedStations, setExpandedStations] = useState<string[]>([]);

  const toggleExpanded = (stationId: string) => {
    setExpandedStations((prev) =>
      prev.includes(stationId) ? prev.filter((id) => id !== stationId) : [...prev, stationId],
    );
  };

  const getStationScore = (stationId: string) => {
    return stationScores.find((s) => s.stationId === stationId);
  };

  const getCompetencyScore = (stationId: string, competencyId: string) => {
    const stationData = getStationScore(stationId);
    return stationData?.competencyScores.find((c) => c.competencyId === competencyId)?.score ?? 0;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Estaciones Trabajadas</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Selecciona las estaciones donde trabajó este mes y evalúa cada competencia
        </p>
      </div>

      {/* Leyenda ARRIBA del formulario */}
      <ScoreLegend />

      <div className="grid gap-3">
        {stations.map((station) => {
          const isSelected = selectedStations.includes(station.id);
          const isExpanded = expandedStations.includes(station.id);
          const competencies = competenciesByStation[station.id] || [];
          const stationData = getStationScore(station.id);

          return (
            <Card key={station.id} className={isSelected ? 'border-primary' : ''}>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => {
                      if (!isSelected) {
                        onToggleStation(station.id);
                        toggleExpanded(station.id);
                      } else {
                        toggleExpanded(station.id);
                      }
                    }}
                  >
                    <div
                      className={`p-1.5 rounded ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                    >
                      {stationIcons[station.key] || <Package className="h-4 w-4" />}
                    </div>
                    <CardTitle className="text-sm font-medium">{station.name}</CardTitle>
                    {isSelected && stationData?.score && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {stationData.score}/5
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleStation(station.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {isSelected && (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform cursor-pointer ${isExpanded ? 'rotate-180' : ''}`}
                        onClick={() => toggleExpanded(station.id)}
                      />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isSelected && isExpanded && (
                <CardContent className="p-3 pt-0 space-y-4">
                  {/* Score general de la estación */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Evaluación General de la Estación
                    </Label>
                    {/* Wrapper con stopPropagation */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <RadioGroup
                        value={stationData?.score?.toString() || ''}
                        onValueChange={(value) => onScoreChange(station.id, parseInt(value))}
                        className="flex gap-2"
                      >
                        {SCORE_LABELS.map((score) => (
                          <div key={score.value} className="flex items-center">
                            <RadioGroupItem
                              value={score.value.toString()}
                              id={`${station.id}-${score.value}`}
                              className="sr-only"
                            />
                            <Label
                              htmlFor={`${station.id}-${score.value}`}
                              className={`px-3 py-1.5 text-xs rounded cursor-pointer border transition-colors
                                ${
                                  stationData?.score === score.value
                                    ? `${score.bgColor} ${score.color} border-current`
                                    : 'bg-muted hover:bg-muted/80 border-transparent'
                                }`}
                            >
                              {score.value}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Competencias individuales */}
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Competencias Específicas
                    </Label>
                    {competencies.map((comp) => (
                      <div key={comp.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{comp.name}</span>
                          {/* Wrapper con stopPropagation */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <RadioGroup
                              value={getCompetencyScore(station.id, comp.id).toString() || '0'}
                              onValueChange={(value) =>
                                onCompetencyScoreChange(station.id, comp.id, parseInt(value))
                              }
                              className="flex gap-1"
                            >
                              {[1, 2, 3, 4, 5].map((value) => {
                                const currentScore = getCompetencyScore(station.id, comp.id);
                                const scoreConfig = SCORE_LABELS.find((s) => s.value === value);
                                return (
                                  <div key={value}>
                                    <RadioGroupItem
                                      value={value.toString()}
                                      id={`${comp.id}-${value}`}
                                      className="sr-only"
                                    />
                                    <Label
                                      htmlFor={`${comp.id}-${value}`}
                                      className={`w-6 h-6 flex items-center justify-center text-xs rounded cursor-pointer border
                                        ${
                                          currentScore === value
                                            ? `${scoreConfig?.bgColor} ${scoreConfig?.color} border-current`
                                            : 'bg-muted hover:bg-muted/80 border-transparent'
                                        }`}
                                    >
                                      {value}
                                    </Label>
                                  </div>
                                );
                              })}
                            </RadioGroup>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
