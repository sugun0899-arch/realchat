import { EmptyState } from "@/components/EmptyState";
import { PageShell } from "@/components/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetConversation,
  useListMessages,
  useListUsers,
  useMarkConversationRead,
  useMyProfile,
  useSendMessage,
  useStartCall,
} from "@/hooks/useQueries";
import { formatTime, shortPrincipal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CallKind, OnlineStatus } from "@/types";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Check, MessageSquare, Send, Video } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

function statusLabel(status: OnlineStatus): string {
  switch (status) {
    case OnlineStatus.online:
      return "Online";
    case OnlineStatus.away:
      return "Away";
    case OnlineStatus.offline:
      return "Offline";
  }
}

function statusDotClass(status: OnlineStatus): string {
  switch (status) {
    case OnlineStatus.online:
      return "bg-accent";
    case OnlineStatus.away:
      return "bg-warning";
    case OnlineStatus.offline:
      return "bg-muted-foreground/40";
  }
}

export function ChatPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();

  const conversationId = useMemo(() => {
    const raw = params.conversationId;
    if (!raw) return null;
    try {
      return BigInt(raw);
    } catch {
      return null;
    }
  }, [params.conversationId]);

  const { data: conversation, isLoading: conversationLoading } =
    useGetConversation(conversationId);
  const { data: messages, isLoading: messagesLoading } =
    useListMessages(conversationId);
  const { data: myProfile } = useMyProfile();
  const { data: users } = useListUsers();

  const sendMessage = useSendMessage();
  const markConversationRead = useMarkConversationRead();
  const startCall = useStartCall();

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const markedRef = useRef<bigint | null>(null);
  const markReadRef = useRef(markConversationRead.mutate);
  markReadRef.current = markConversationRead.mutate;

  // Mark the conversation read once when it is opened.
  useEffect(() => {
    if (conversationId !== null && markedRef.current !== conversationId) {
      markedRef.current = conversationId;
      markReadRef.current(conversationId);
    }
  }, [conversationId]);

  // Keep the newest message in view as new ones arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && messages) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const myId = myProfile?.id;
  const otherId =
    conversation && myId
      ? conversation.participantA.toString() === myId.toString()
        ? conversation.participantB
        : conversation.participantA
      : null;
  const otherProfile = users?.find(
    (u) => otherId !== null && u.id.toString() === otherId.toString(),
  );

  const displayName =
    otherProfile?.displayName ||
    (otherId ? shortPrincipal(otherId) : "Conversation");
  const status = otherProfile?.status ?? OnlineStatus.offline;
  const avatar = otherProfile?.avatar;

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || conversationId === null) return;
    setDraft("");
    sendMessage.mutate(
      { conversationId, body: text },
      {
        onError: () => setDraft((current) => (current === "" ? text : current)),
      },
    );
  };

  const handleVideoCall = () => {
    if (conversationId === null) return;
    startCall.mutate(
      { conversationId, kind: CallKind.video },
      {
        onSuccess: () =>
          navigate({
            to: "/call/$conversationId",
            params: { conversationId: conversationId.toString() },
          }),
      },
    );
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="relative" data-ocid="chat.avatar">
        <Avatar className="size-9">
          {avatar ? <AvatarImage src={avatar} alt={displayName} /> : null}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {displayName.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card",
            statusDotClass(status),
          )}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={handleVideoCall}
        disabled={startCall.isPending}
        aria-label={`Start a video call with ${displayName}`}
        data-ocid="chat.video_call_button"
      >
        <Video />
      </Button>
    </div>
  );

  return (
    <PageShell
      title={displayName}
      description={statusLabel(status)}
      actions={headerActions}
      data-ocid="page_chat"
    >
      <div className="flex h-full flex-col">
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-6 md:px-6"
          data-ocid="chat.message_list"
        >
          {conversationLoading || messagesLoading ? (
            <div className="space-y-3" data-ocid="chat.loading_state">
              {Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map(
                (id, idx) => (
                  <div
                    key={id}
                    className={cn(
                      "flex",
                      idx % 2 === 0 ? "justify-end" : "justify-start",
                    )}
                  >
                    <Skeleton className="h-12 w-2/3 rounded-2xl" />
                  </div>
                ),
              )}
            </div>
          ) : !conversation ? (
            <EmptyState
              icon={MessageSquare}
              title="Conversation not found"
              description="This conversation may have been removed or is no longer available."
            />
          ) : messages && messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description={`Say hello to ${displayName} to start the conversation.`}
            />
          ) : (
            messages?.map((msg, i) => {
              const mine = msg.sender.toString() === myId?.toString();
              return (
                <div
                  key={msg.id.toString()}
                  data-ocid={`chat.message.${i + 1}`}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-2 shadow-sm",
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border-border rounded-bl-sm border",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {msg.body}
                    </p>
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-1 font-mono text-[10px]",
                        mine
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      <span>{formatTime(msg.sentAt)}</span>
                      {mine && msg.read && <Check className="size-3" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSend}
          className="bg-card/60 flex shrink-0 items-center gap-2 border-t px-4 py-3 md:px-6"
          data-ocid="chat.composer"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${displayName}`}
            className="rounded-full"
            disabled={conversationId === null}
            data-ocid="chat.input"
            aria-label={`Message ${displayName}`}
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full"
            disabled={!draft.trim() || sendMessage.isPending}
            aria-label="Send message"
            data-ocid="chat.send_button"
          >
            <Send />
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
