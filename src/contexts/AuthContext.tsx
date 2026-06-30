import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { clearRecoveryFlag } from '../utils/recoverClient';
import { isValidLoginInput, isValidUsername, normalizeMintzakatsLogin, normalizeUsername } from '../utils/username';
import { withTimeout } from '../utils/withTimeout';

export type AppRole = 'admin' | 'player';

export type UserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  app_role: AppRole;
  leaderboard_opt_in: boolean;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  /** True only while resolving the initial bootstrap (getSession + profile). */
  isLoading: boolean;
  /** True while the user profile is being fetched after sign-in or auth events. */
  isProfileLoading: boolean;
  isAdmin: boolean;
  profileLoadError: string | null;
  bootstrapError: string | null;
  needsProfileSetup: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Local sign-out for recovery; does not block the UI on network failures. */
  localSignOut: () => Promise<void>;
  updateProfile: (username: string, displayName?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function parseAppRole(value: unknown): AppRole {
  return value === 'admin' ? 'admin' : 'player';
}

function mapSignInError(error: { message: string }) {
  const message = error.message.toLowerCase();

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  ) {
    return new Error('Erabiltzaile-izena edo pasahitza ez da zuzena.');
  }

  return new Error('Ezin izan da saioa hasi. Saiatu berriro.');
}

function mapProfileRow(data: {
  id: string;
  username: string | null;
  display_name: string | null;
  app_role: string | null;
  leaderboard_opt_in: boolean | null;
}): UserProfile {
  return {
    id: data.id,
    username: data.username ?? '',
    display_name: data.display_name,
    app_role: parseAppRole(data.app_role),
    leaderboard_opt_in: Boolean(data.leaderboard_opt_in ?? true),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    console.log('[AUTH] profile load start', userId);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, app_role, leaderboard_opt_in')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[AUTH] profile load error', error);
      throw error;
    }

    console.log('[AUTH] profile load resolved', data);

    if (!data) {
      setProfile(null);
      setProfileLoadError('Ez da profilik aurkitu erabiltzaile honentzat.');
      return null;
    }

    const mapped = mapProfileRow(data);
    setProfile(mapped);
    setProfileLoadError(null);
    clearRecoveryFlag();
    return mapped;
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoadError(null);
    setBootstrapError(null);
    setIsProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    setIsProfileLoading(true);
    try {
      await loadProfile(user.id);
    } catch (error) {
      console.error('[AUTH] refresh profile failure', error);
      setProfile(null);
      setProfileLoadError(
        error instanceof Error ? error.message : 'Ezin izan da erabiltzaile-profila kargatu.',
      );
    } finally {
      setIsProfileLoading(false);
    }
  }, [loadProfile, user]);

  useEffect(() => {
    let cancelled = false;
    let initialBootstrapActive = true;

    async function bootstrap() {
      console.log('[AUTH] bootstrap start');

      try {
        console.log('[AUTH] getSession start');
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          3_000,
          'getSession',
        );
        console.log('[AUTH] getSession resolved', sessionResult);

        if (cancelled) {
          return;
        }

        const { data, error } = sessionResult;
        if (error) {
          throw error;
        }

        const currentSession = data.session;

        if (!currentSession?.user) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setProfileLoadError(null);
          clearRecoveryFlag();
          return;
        }

        setUser(currentSession.user);
        setSession(currentSession);

        await withTimeout(loadProfile(currentSession.user.id), 5_000, 'loadProfile');
      } catch (error) {
        console.error('[AUTH] bootstrap failure', error);
        setBootstrapError(
          error instanceof Error ? error.message : 'Auth bootstrap failed',
        );
      } finally {
        initialBootstrapActive = false;
        if (!cancelled) {
          setIsSessionLoading(false);
          console.log('[AUTH] bootstrap finished');
        }
      }
    }

    void bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        if (initialBootstrapActive) {
          return;
        }

        if (!nextSession?.user) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setProfileLoadError(null);
          setIsSessionLoading(false);
          return;
        }

        setUser(nextSession.user);
        setSession(nextSession);
        setIsProfileLoading(true);

        void loadProfile(nextSession.user.id)
          .catch((error) => {
            console.error('[AUTH] auth event profile failure', error);
            setProfile(null);
            setProfileLoadError(
              error instanceof Error
                ? error.message
                : 'Ezin izan da erabiltzaile-profila kargatu.',
            );
          })
          .finally(() => {
            setIsProfileLoading(false);
            setIsSessionLoading(false);
          });
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      if (!isValidLoginInput(username)) {
        throw new Error('Idatzi baliozko erabiltzaile-izen bat.');
      }

      if (!password) {
        throw new Error('Erabiltzaile-izena edo pasahitza ez da zuzena.');
      }

      const email = normalizeMintzakatsLogin(username);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw mapSignInError(error);
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        setIsProfileLoading(true);
        try {
          await loadProfile(data.user.id);
        } finally {
          setIsProfileLoading(false);
        }
      }
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    clearAuthState();
    sessionStorage.clear();
  }, [clearAuthState]);

  const localSignOut = useCallback(async () => {
    try {
      await withTimeout(supabase.auth.signOut({ scope: 'local' }), 3_000, 'localSignOut');
    } catch (error) {
      console.warn('[RECOVERY] local signout timed out or failed', error);
    } finally {
      console.log('[RECOVERY] local signout completed');
      setUser(null);
      setProfile(null);
      setSession(null);
      setProfileLoadError(null);
      setBootstrapError(null);
      setIsSessionLoading(false);
      setIsProfileLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (username: string, displayName?: string) => {
      if (!user) {
        throw new Error('Saioa hasi behar duzu.');
      }

      const normalizedUsername = normalizeUsername(username);
      if (!isValidUsername(normalizedUsername)) {
        throw new Error('Erabiltzaile-izenak 3-24 karaktere izan behar ditu (A-Z, 0-9, _, -).');
      }

      const payload = {
        id: user.id,
        username: normalizedUsername,
        display_name: displayName?.trim() || null,
        app_role: 'player' as const,
        leaderboard_opt_in: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Izen hori hartuta dago; aukeratu beste bat.');
        }
        throw new Error(error.message);
      }

      setProfile({
        id: user.id,
        username: normalizedUsername,
        display_name: payload.display_name,
        app_role: 'player',
        leaderboard_opt_in: true,
      });
      setProfileLoadError(null);
    },
    [user],
  );

  const isAdmin = profile?.app_role === 'admin';
  const needsProfileSetup = Boolean(user && profile && !profile.username.trim());

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      isLoading: isSessionLoading,
      isProfileLoading,
      isAdmin,
      profileLoadError,
      bootstrapError,
      needsProfileSetup,
      signIn,
      signOut,
      localSignOut,
      updateProfile,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      isSessionLoading,
      isProfileLoading,
      isAdmin,
      profileLoadError,
      bootstrapError,
      needsProfileSetup,
      signIn,
      signOut,
      localSignOut,
      updateProfile,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth hook AuthProvider barruan erabili behar da.');
  }
  return context;
}
