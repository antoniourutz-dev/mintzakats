import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWeeklyLeaderboard } from '../services/leaderboard';
import {
  buildMyProgress,
  buildTodayChallengeStatus,
  loadProgressSources,
  type ProfileIdentity,
} from '../services/progress';

export const queryKeys = {
  progressSources: (userId: string) => ['progressSources', userId] as const,
  myProgress: (userId: string) => ['myProgress', userId] as const,
  todayStatus: (userId: string) => ['todayChallengeStatus', userId] as const,
  weeklyLeaderboard: ['weeklyLeaderboard'] as const,
};

const queryDefaults = {
  retry: false as const,
  refetchOnWindowFocus: false as const,
};

function useProgressSources(userId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.progressSources(userId ?? ''),
    queryFn: loadProgressSources,
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
    ...queryDefaults,
  });
}

export function useTodayChallengeStatus(enabled: boolean, userId?: string) {
  const sourcesQuery = useProgressSources(userId, enabled);

  const todayQuery = useQuery({
    queryKey: queryKeys.todayStatus(userId ?? ''),
    queryFn: () => buildTodayChallengeStatus(sourcesQuery.data),
    enabled: enabled && Boolean(userId) && Boolean(sourcesQuery.data),
    staleTime: 30_000,
    ...queryDefaults,
  });

  return {
    ...todayQuery,
    isLoading: sourcesQuery.isLoading || todayQuery.isLoading,
    refetch: async () => {
      await sourcesQuery.refetch();
      return todayQuery.refetch();
    },
  };
}

export function useMyProgress(profile: ProfileIdentity | null, userId: string | undefined) {
  const username = profile?.username;
  const displayName = profile?.displayName ?? null;
  const leaderboardOptIn = profile?.leaderboardOptIn ?? true;
  const sourcesQuery = useProgressSources(userId, Boolean(userId && username));

  const progressQuery = useQuery({
    queryKey: queryKeys.myProgress(userId ?? ''),
    queryFn: () =>
      buildMyProgress(
        {
          username: username!,
          displayName,
          leaderboardOptIn,
        },
        sourcesQuery.data,
      ),
    enabled: Boolean(userId && username && sourcesQuery.data),
    staleTime: 60_000,
    ...queryDefaults,
  });

  return {
    ...progressQuery,
    isLoading: sourcesQuery.isLoading || progressQuery.isLoading,
    refetch: async () => {
      await sourcesQuery.refetch();
      return progressQuery.refetch();
    },
  };
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
    void queryClient.invalidateQueries({ queryKey: ['progressSources'] });
    void queryClient.invalidateQueries({ queryKey: ['myProgress'] });
    void queryClient.invalidateQueries({ queryKey: ['todayChallengeStatus'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.weeklyLeaderboard });
  }, [queryClient]);
}
