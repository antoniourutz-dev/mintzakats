import { type ReactNode, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppRoute } from '../../hooks/useAppRoute';

type RequireAdminProps = {
  children: ReactNode;
};

export function RequireAdmin({ children }: RequireAdminProps) {
  const { isLoading, isAdmin, user, profileLoadError } = useAuth();
  const { navigate } = useAppRoute();

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin || profileLoadError)) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate, profileLoadError, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <p className="font-black text-lg">Kargatzen...</p>
      </div>
    );
  }

  if (!user || !isAdmin || profileLoadError) {
    return null;
  }

  return <>{children}</>;
}
