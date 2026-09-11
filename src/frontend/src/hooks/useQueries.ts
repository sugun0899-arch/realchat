import {
  type CallKind,
  type SignalKind,
  type UserId,
  createActor,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useMyProfile() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["myProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateProfile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      displayName,
      avatar,
    }: {
      displayName: string;
      avatar: string | null;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateProfile(displayName, avatar);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useListUsers() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListConversations() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listConversations();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useGetConversation(conversationId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!actor || conversationId === null) return null;
      return actor.getConversation(conversationId);
    },
    enabled: !!actor && !isFetching && conversationId !== null,
  });
}

export function useStartConversation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (other: UserId) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.startConversation(other);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useListMessages(conversationId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!actor || conversationId === null) return [];
      return actor.listMessages(conversationId);
    },
    enabled: !!actor && !isFetching && conversationId !== null,
    refetchInterval: 3000,
  });
}

export function useSendMessage() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      body,
    }: {
      conversationId: bigint;
      body: string;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.sendMessage(conversationId, body);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkConversationRead() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.markConversationRead(conversationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useStartCall() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      kind,
    }: {
      conversationId: bigint;
      kind: CallKind;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.startCall(conversationId, kind);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["calls", variables.conversationId],
      });
    },
  });
}

export function useAcceptCall() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (callId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.acceptCall(callId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useDeclineCall() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (callId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.declineCall(callId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useEndCall() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (callId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.endCall(callId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calls"] });
    },
  });
}

export function useListCalls(conversationId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["calls", conversationId],
    queryFn: async () => {
      if (!actor || conversationId === null) return [];
      return actor.listCalls(conversationId);
    },
    enabled: !!actor && !isFetching && conversationId !== null,
    refetchInterval: 3000,
  });
}

export function useSendSignal() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async ({
      conversationId,
      to,
      kind,
      payload,
    }: {
      conversationId: bigint;
      to: UserId;
      kind: SignalKind;
      payload: string;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.sendSignal(conversationId, to, kind, payload);
    },
  });
}

export function usePollSignals(conversationId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["signals", conversationId],
    queryFn: async () => {
      if (!actor || conversationId === null) return [];
      return actor.pollSignals(conversationId);
    },
    enabled: !!actor && !isFetching && conversationId !== null,
    refetchInterval: 2000,
  });
}
