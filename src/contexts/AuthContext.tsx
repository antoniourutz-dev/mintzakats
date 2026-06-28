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

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, app_role, leaderboard_opt_in')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

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

  const loadProfileForUser = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      setProfileLoadError(null);
      return;
    }

    try {
      const nextProfile = await fetchProfile(nextUser.id);
      if (!nextProfile) {
        setProfile(null);
        setProfileLoadError('Ezin izan da erabiltzaile-profila kargatu.');
        return;
      }
      setProfile(nextProfile);
      setProfileLoadError(null);
    } catch {
      setProfile(null);
      setProfileLoadError('Ezin izan da erabiltzaile-profila kargatu.');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    await loadProfileForUser(user);
  }, [loadProfileForUser, user]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadProfileForUser(data.session?.user ?? null);
      if (mounted) setIsLoading(false);
    };

    void init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await loadProfileForUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfileForUser]);

  const signIn = useCallback(async (username: string, password: string) => {
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
      await loadProfileForUser(data.user);
    }
  }, [loadProfileForUser]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    setProfile(null);
    setProfileLoadError(null);
    sessionStorage.clear();
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
