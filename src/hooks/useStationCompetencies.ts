import { useQuery } from '@tanstack/react-query';
import {
  fetchAllWorkStations,
  fetchStationCompetencies as fetchStationCompetenciesService,
  fetchAllStationCompetencies as fetchAllStationCompetenciesService,
  fetchAllGeneralCompetencies,
  fetchManagerCompetencies as fetchManagerCompetenciesService,
} from '@/services/coachingService';
import type {
  WorkStation,
  StationCompetency,
  GeneralCompetency,
  ManagerCompetency,
} from '@/types/coaching';

export function useWorkStations() {
  return useQuery({
    queryKey: ['work-stations'],
    queryFn: async (): Promise<WorkStation[]> => {
      return (await fetchAllWorkStations()) as WorkStation[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useStationCompetencies(stationId: string | null) {
  return useQuery({
    queryKey: ['station-competencies', stationId],
    queryFn: async (): Promise<StationCompetency[]> => {
      if (!stationId) return [];
      return (await fetchStationCompetenciesService(stationId)) as StationCompetency[];
    },
    enabled: !!stationId,
    staleTime: 1000 * 60 * 30,
  });
}

export function useAllStationCompetencies() {
  return useQuery({
    queryKey: ['all-station-competencies'],
    queryFn: async (): Promise<StationCompetency[]> => {
      return (await fetchAllStationCompetenciesService()) as StationCompetency[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useGeneralCompetencies() {
  return useQuery({
    queryKey: ['general-competencies'],
    queryFn: async (): Promise<GeneralCompetency[]> => {
      return (await fetchAllGeneralCompetencies()) as GeneralCompetency[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useManagerCompetencies() {
  return useQuery({
    queryKey: ['manager-competencies'],
    queryFn: async (): Promise<ManagerCompetency[]> => {
      return (await fetchManagerCompetenciesService()) as ManagerCompetency[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Hook combinado para obtener toda la configuración de competencias
 */
export function useCompetencyConfig() {
  const stations = useWorkStations();
  const stationCompetencies = useAllStationCompetencies();
  const generalCompetencies = useGeneralCompetencies();
  const managerCompetencies = useManagerCompetencies();

  const isLoading =
    stations.isLoading ||
    stationCompetencies.isLoading ||
    generalCompetencies.isLoading ||
    managerCompetencies.isLoading;

  const error =
    stations.error ||
    stationCompetencies.error ||
    generalCompetencies.error ||
    managerCompetencies.error;

  // Agrupar competencias por estación
  const competenciesByStation =
    stationCompetencies.data?.reduce(
      (acc, comp) => {
        if (!acc[comp.station_id]) {
          acc[comp.station_id] = [];
        }
        acc[comp.station_id].push(comp);
        return acc;
      },
      {} as Record<string, StationCompetency[]>,
    ) ?? {};

  return {
    stations: stations.data ?? [],
    stationCompetencies: stationCompetencies.data ?? [],
    competenciesByStation,
    generalCompetencies: generalCompetencies.data ?? [],
    managerCompetencies: managerCompetencies.data ?? [],
    isLoading,
    error,
  };
}
