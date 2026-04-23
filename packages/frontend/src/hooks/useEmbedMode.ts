import { useSearchParams } from 'react-router-dom';

export const useEmbedMode = () => {
  const [searchParams] = useSearchParams();
  const embedMode = searchParams.get('embed');

  return {
    isEmbedded: !!embedMode,
    embedType: embedMode, // 'conciliacion' u otro valor futuro
  };
};
