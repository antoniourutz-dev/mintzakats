import { type ReactNode, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppRoute } from '../../hooks/useAppRoute';
import { RouteFallback } from '../RouteFallback';
import { buttonBaseStyle } from '../../styles';

type RequireAdminProps = {
  children: ReactNode;
};

export function RequireAdmin({ children }: RequireAdminProps) {
  const { isLoading: isSessionLoading, isProfileLoading, isAdmin, user, profile, profileLoadError, signOut } =
    useAuth();
  const { navigate } = useAppRoute();

  const authReady = !isSessionLoading && (!user || !isProfileLoading);

  useEffect(() => {
    if (authReady && (!user || !isAdmin || profileLoadError || !profile)) {
      navigate('/');
    }
  }, [authReady, isAdmin, navigate, profile, profileLoadError, user]);

  if (!authReady) {
    return <RouteFallback fullScreen />;
  }

  if (!user || !isAdmin || profileLoadError || !profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="bg-red-100 border-4 border-red-900 p-6 max-w-lg text-center space-y-4">
          <p className="font-bold">
            {profileLoadError ?? 'Ez duzu baimenik atal honetara sartzeko.'}
          </p>
          {user && (
            <button
              type="button"
              onClick={() => void signOut()}
              className={`${buttonBaseStyle} w-full text-sm py-3`}
            >
              Saioa itxi
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
