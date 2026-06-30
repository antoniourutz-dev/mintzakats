import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWeeklyLeaderboard } from '../services/leaderboard';
import {
  fetchMyProgress,
  fetchTodayChallengeStatus,
  type ProfileIdentity,
} from '../services/progress';

export const queryKeys = {
  todayStatus: ['todayChallengeStatus'] as const,
  myProgress: (userId: string) => ['myProgress', userId] as const,
  weeklyLeaderboard: ['weeklyLeaderboard'] as const,
};

const queryDefaults = {
  retry: false as const,
  refetchOnWindowFocus: false as const,
};

export function useTodayChallengeStatus(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.todayStatus,
    queryFn: fetchTodayChallengeStatus,
    enabled,
    staleTime: 30_000,
    ...queryDefaults,
  });
}

export function useMyProgress(profile: ProfileIdentity | null, userId: string | undefined) {
  const username = profile?.username;
  const displayName = profile?.displayName ?? null;
  const leaderboardOptIn = profile?.leaderboardOptIn ?? true;

  return useQuery({
    queryKey: queryKeys.myProgress(userId ?? ''),
    queryFn: () =>
      fetchMyProgress({
        username: username!,
        displayName,
        leaderboardOptIn,
      }),
    enabled: Boolean(userId && username),
    staleTime: 60_000,
    ...queryDefaults,
  });
}

export function useWeeklyLeaderboard(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.weeklyLeaderboard,
    queryFn: () => fetchWeeklyLeaderboard(),
    enabled,
    staleTime: 60_000,
    ...queryDefaults,
  });
}

export function useInvalidatePlayerData() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.todayStatus });
    void queryClient.invalidateQueries({ queryKey: ['myProgress'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.weeklyLeaderboard });
  }, [queryClient]);
}
