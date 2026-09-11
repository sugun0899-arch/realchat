import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListUsers,
  useMyProfile,
  useStartConversation,
} from "@/hooks/useQueries";
import { shortPrincipal } from "@/lib/format";
import { OnlineStatus, type Profile } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { RefreshCw, Users, Video } from "lucide-react";
import { useState } from "react";

function statusLabel(status: OnlineStatus): string {
  switch (status) {
    case OnlineStatus.online:
      return "Online";
    case OnlineStatus.away:
      return "Away";
    default:
      return "Offline";
  }
}

function statusDotClass(status: OnlineStatus): string {
  switch (status) {
    case OnlineStatus.online:
      return "bg-accent";
    case OnlineStatus.away:
      return "bg-warning";
    default:
      return "bg-muted-foreground/40";
  }
}

function UserRow({
  user,
  index,
  busy,
  onChat,
  onCall,
}: {
  user: Profile;
  index: number;
  busy: boolean;
  onChat: (user: Profile) => void;
  onCall: (user: Profile) => void;
}) {
  const initial = user.displayName.slice(0, 1).toUpperCase() || "?";
  return (
    <li
      data-ocid={`directory.item.${index}`}
      className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3 transition-colors hover:bg-accent/40"
    >
      <button
        type="button"
        onClick={() => onChat(user)}
        disabled={busy}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
        data-ocid={`directory.chat_button.${index}`}
      >
        <span className="relative shrink-0">
          <Avatar className="size-11">
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.displayName} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground font-display text-base font-semibold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card ${statusDotClass(user.status)}`}
            aria-hidden="true"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{user.displayName}</span>
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <span
              className={`inline-block size-1.5 rounded-full ${statusDotClass(user.status)}`}
              aria-hidden="true"
            />
            {statusLabel(user.status)}
            <span aria-hidden="true">·</span>
            {shortPrincipal(user.id)}
          </span>
        </span>
      </button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 rounded-full"
        onClick={() => onCall(user)}
        disabled={busy}
        aria-label={`Start a video call with ${user.displayName}`}
        data-ocid={`directory.call_button.${index}`}
      >
        <Video className="text-accent" />
      </Button>
    </li>
  );
}

export function DirectoryPage() {
  const { data: users, isLoading, refetch } = useListUsers();
  const { data: myProfile } = useMyProfile();
  const startConversation = useStartConversation();
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const others = (users ?? []).filter(
    (user) => !myProfile || user.id.toString() !== myProfile.id.toString(),
  );

  const openChat = (user: Profile) => {
    setPendingId(user.id.toString());
    startConversation.mutate(user.id, {
      onSuccess: (conversationId) => {
        void navigate({
          to: "/conversations/$conversationId",
          params: { conversationId: conversationId.toString() },
        });
      },
      onSettled: () => setPendingId(null),
    });
  };

  const openCall = (user: Profile) => {
    setPendingId(user.id.toString());
    startConversation.mutate(user.id, {
      onSuccess: (conversationId) => {
        void navigate({
          to: "/call/$conversationId",
          params: { conversationId: conversationId.toString() },
        });
      },
      onSettled: () => setPendingId(null),
    });
  };

  return (
    <PageShell
      title="Directory"
      description="Find someone to chat or call"
      data-ocid="page_directory"
    >
      {isLoading ? (
        <div
          className="flex flex-col gap-3 p-4 md:p-6"
          data-ocid="directory.loading_state"
        >
          {Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((id) => (
            <div
              key={id}
              className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3"
            >
              <Skeleton className="size-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : others.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Registered users will appear here so you can start a conversation or video call."
          action={
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => void refetch()}
              data-ocid="directory.refresh_button"
            >
              <RefreshCw />
              Refresh
            </Button>
          }
        />
      ) : (
        <ul
          className="flex flex-col gap-3 p-4 md:p-6"
          data-ocid="directory.list"
        >
          {others.map((user, index) => (
            <UserRow
              key={user.id.toString()}
              user={user}
              index={index}
              busy={pendingId === user.id.toString()}
              onChat={openChat}
              onCall={openCall}
            />
          ))}
        </ul>
      )}
    </PageShell>
  );
}
