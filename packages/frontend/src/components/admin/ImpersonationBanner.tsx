/**
 * ImpersonationBanner - Banner que indica modo "Ver como..."
 *
 * Aparece en la parte superior cuando el superadmin está impersonando a otro usuario.
 */
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Eye, X, User } from 'lucide-react';

export default function ImpersonationBanner() {
  const { isImpersonating, targetUser, stopImpersonating } = useImpersonation();

  if (!isImpersonating || !targetUser) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100]">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-full shadow-sm text-sm">
        <Eye className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span className="text-amber-800 font-medium">Viendo como</span>
        <div className="flex items-center gap-1.5">
          {targetUser.avatar_url ? (
            <img src={targetUser.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-amber-700" />
          )}
          <span className="font-semibold text-amber-900 max-w-[120px] truncate">
            {targetUser.full_name.split(' ')[0]}
          </span>
        </div>
        <button
          onClick={stopImpersonating}
          className="ml-1 p-1 rounded-full hover:bg-amber-200 text-amber-700 hover:text-amber-900 transition-colors"
          aria-label="Salir del modo vista previa"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
