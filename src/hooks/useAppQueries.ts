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

export function useTodayChallengeStatus(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.todayStatus,
    queryFn: fetchTodayChallengeStatus,
    enabled,
    staleTime: 30_000,
  });
}

export function useMyProgress(profile: ProfileIdentity | null, userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.myProgress(userId ?? ''),
    queryFn: () => fetchMyProgress(profile!),
    enabled: Boolean(userId && profile?.username),
    staleTime: 60_000,
  });
}

export function useWeeklyLeaderboard(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.weeklyLeaderboard,
    queryFn: () => fetchWeeklyLeaderboard(),
    enabled,
    staleTime: 60_000,
  });
}

export function useInvalidatePlayerData() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.todayStatus });
    void queryClient.invalidateQueries({ queryKey: ['myProgress'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.weeklyLeaderboard });
  };
}
