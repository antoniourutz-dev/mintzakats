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
import { isValidLoginInput, isValidUsername, normalizeMintzakatsLogin, normalizeUsername } from '../utils/username';

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
  isLoading: boolean;
  isAdmin: boolean;
  profileLoadError: string | null;
  needsProfileSetup: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, app_role, leaderboard_opt_in')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Profile load failed', { userId, error });
      setProfile(null);
      setProfileLoadError('Ezin izan da erabiltzaile-profila kargatu.');
      return;
    }

    console.log('Profile resolved', data);

    if (!data) {
      setProfile(null);
      setProfileLoadError('Ez da profilik aurkitu erabiltzaile honentzat.');
      return;
    }

    setProfile(mapProfileRow(data));
    setProfileLoadError(null);
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoadError(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    await loadProfile(user.id);
  }, [loadProfile, user]);

  useEffect(() => {
    let cancelled = false;

    console.log('Auth bootstrap started');

    async function initialiseAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('getSession failed', error);
          return;
        }

        const currentSession = data.session ?? null;
        console.log('Session resolved', currentSession);

        if (!currentSession) {
          clearAuthState();
          return;
        }

        setSession(currentSession);
        setUser(currentSession.user);
        await loadProfile(currentSession.user.id);
      } catch (error) {
        console.error('Auth bootstrap failed', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          console.log('Auth loading finished');
        }
      }
    }

    void initialiseAuth();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        if (!nextSession) {
          clearAuthState();
          return;
        }

        setSession(nextSession);
        setUser(nextSession.user);
        await loadProfile(nextSession.user.id);
      } catch (error) {
        console.error('Auth state change failed', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          console.log('Auth loading finished');
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [clearAuthState, loadProfile]);

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
        await loadProfile(data.user.id);
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
      isLoading,
      isAdmin,
      profileLoadError,
      needsProfileSetup,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      isAdmin,
      profileLoadError,
      needsProfileSetup,
      signIn,
      signOut,
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
