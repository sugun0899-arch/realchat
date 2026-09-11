import { createActor } from "@/backend";
import { useListConversations, useMyProfile } from "@/hooks/useQueries";
import { CallStatus } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * Global watcher for incoming calls. Polls every conversation for a call where
 * the current user is the callee and the status is still #ringing, then
 * navigates the callee to the call viewport so they can accept or decline.
 * Mount this once in the authenticated layout so it works from any page.
 */
export function useIncomingCall() {
  const navigate = useNavigate();
  const { data: profile } = useMyProfile();
  const { data: conversations } = useListConversations();
  const { actor, isFetching } = useActor(createActor);

  const conversationIds = (conversations ?? []).map((c) => c.id);

  const { data: ringingCalls } = useQuery({
    queryKey: ["incomingCalls", conversationIds],
    queryFn: async () => {
      if (!actor || conversationIds.length === 0) return [];
      const me = profile?.id;
      if (!me) return [];
      const results = await Promise.all(
        conversationIds.map((id) => actor.listCalls(id)),
      );
      return results
        .flat()
        .filter(
          (call) =>
            call.status === CallStatus.ringing &&
            call.callee.toString() === me.toString(),
        );
    },
    enabled: !!actor && !isFetching && conversationIds.length > 0 && !!profile,
    refetchInterval: 3000,
  });

  const navigatedRef = useRef<bigint | null>(null);

  useEffect(() => {
    if (!ringingCalls || ringingCalls.length === 0) {
      navigatedRef.current = null;
      return;
    }
    const call = ringingCalls[0];
    if (navigatedRef.current === call.conversationId) return;
    navigatedRef.current = call.conversationId;
    navigate({
      to: "/call/$conversationId",
      params: { conversationId: call.conversationId.toString() },
    });
  }, [ringingCalls, navigate]);

  return ringingCalls ?? [];
}
