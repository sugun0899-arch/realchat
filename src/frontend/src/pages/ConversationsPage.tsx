import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListConversations,
  useListUsers,
  useMyProfile,
} from "@/hooks/useQueries";
import { formatRelativeTime } from "@/lib/format";
import type { Conversation, Profile } from "@/types";
import { Link } from "@tanstack/react-router";
import { MessageSquare, Plus, Users } from "lucide-react";
import { useMemo } from "react";

interface ConversationRow {
  conversation: Conversation;
  other: Profile | undefined;
  unread: bigint;
}

function isSamePrincipal(a: { toString(): string }, b: { toString(): string }) {
  return a.toString() === b.toString();
}

function buildRows(
  conversations: Conversation[],
  users: Profile[],
  myId: { toString(): string } | undefined,
): ConversationRow[] {
  return conversations.map((conversation) => {
    const otherId = myId
      ? isSamePrincipal(conversation.participantA, myId)
        ? conversation.participantB
        : conversation.participantA
      : conversation.participantA;
    const other = users.find((user) => isSamePrincipal(user.id, otherId));
    const unread = myId
      ? isSamePrincipal(conversation.participantA, myId)
        ? conversation.unreadA
        : conversation.unreadB
      : 0n;
    return { conversation, other, unread };
  });
}

function ConversationsSkeleton() {
  return (
    <div className="divide-y" data-ocid="loading_state">
      {Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((id) => (
        <div key={id} className="flex items-center gap-3 px-4 py-4 md:px-6">
          <Skeleton className="size-12 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

export function ConversationsPage() {
  const { data: conversations, isLoading } = useListConversations();
  const { data: users } = useListUsers();
  const { data: myProfile } = useMyProfile();

  const rows = useMemo(
    () => buildRows(conversations ?? [], users ?? [], myProfile?.id),
    [conversations, users, myProfile],
  );

  return (
    <PageShell
      title="Conversations"
      description="Your recent chats"
      data-ocid="page_conversations"
      actions={
        <Button
          asChild
          size="sm"
          className="rounded-full"
          data-ocid="new_conversation_button"
        >
          <Link to="/directory">
            <Plus />
            New chat
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <ConversationsSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Find someone in the directory to start your first chat or video call."
          action={
            <Button
              asChild
              className="rounded-full"
              data-ocid="go_directory_button"
            >
              <Link to="/directory">
                <Users />
                Browse directory
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y" data-ocid="conversation_list">
          {rows.map((row, index) => {
            const { conversation, other, unread } = row;
            const displayName = other?.displayName || "Unknown user";
            const avatar = other?.avatar;
            const isOnline = other?.status === "online";
            const hasUnread = unread > 0n;
            return (
              <li key={conversation.id.toString()}>
                <Link
                  to="/conversations/$conversationId"
                  params={{ conversationId: conversation.id.toString() }}
                  className="hover:bg-muted/60 flex items-center gap-3 px-4 py-4 transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none md:px-6"
                  data-ocid={`conversation_item.${index + 1}`}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-12">
                      {avatar ? (
                        <AvatarImage src={avatar} alt={displayName} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary font-display text-base font-semibold">
                        {displayName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline ? (
                      <span
                        className="bg-accent absolute right-0 bottom-0 size-3 rounded-full ring-2 ring-white"
                        aria-label="Online"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display truncate text-sm font-semibold">
                        {displayName}
                      </p>
                      <span className="text-muted-foreground shrink-0 font-mono text-xs">
                        {formatRelativeTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p
                        className={`truncate text-sm ${
                          hasUnread
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {conversation.lastMessagePreview || "No messages yet"}
                      </p>
                      {hasUnread ? (
                        <Badge
                          className="bg-primary shrink-0 rounded-full px-2 text-primary-foreground"
                          data-ocid={`unread_badge.${index + 1}`}
                        >
                          {unread.toString()}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
