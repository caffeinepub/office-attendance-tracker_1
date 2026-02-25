import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AttendanceRecord, UserProfile } from '../backend';
import { useActor } from './useActor';

// ─── User Profile ────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Attendance Records ───────────────────────────────────────────────────────

export function useGetAllRecords() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AttendanceRecord[]>({
    queryKey: ['allRecords'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllRecords();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetRecord(date: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AttendanceRecord | null>({
    queryKey: ['record', date],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getRecord(date);
    },
    enabled: !!actor && !actorFetching && !!date,
  });
}

export function useGetRecordsByDateRange(startDate: string, endDate: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AttendanceRecord[]>({
    queryKey: ['records', startDate, endDate],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecordsByDateRange({ startDate, endDate });
    },
    enabled: !!actor && !actorFetching && !!startDate && !!endDate,
  });
}

export function useSaveRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: AttendanceRecord) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveRecord(record);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allRecords'] });
      queryClient.invalidateQueries({ queryKey: ['record', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}

export function useDeleteRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (date: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteRecord(date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allRecords'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
    },
  });
}
