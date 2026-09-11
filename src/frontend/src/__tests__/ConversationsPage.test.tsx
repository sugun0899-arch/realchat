import { ConversationsPage } from "@/pages/ConversationsPage";
import type { Conversation, Profile } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the actor infrastructure so the page's data hooks resolve to a
// controllable in-memory actor instead of a real canister.
const actorMock = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  listUsers: vi.fn(),
  listConversations: vi.fn(),
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: actorMock, isFetching: false }),
  useInternetIdentity: () => ({
    isAuthenticated: true,
    isInitializing: false,
    login: vi.fn(),
    clear: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      to,
      params,
      children,
      ...rest
    }: {
      to: string;
      params?: Record<string, string>;
      children: React.ReactNode;
    }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

const ME = Principal.fromText("aaaaa-aa");
const OTHER = Principal.fromText("2vxsx-fae");

function makeProfile(
  id: Principal,
  displayName: string,
  status = "online",
): Profile {
  return {
    id,
    displayName,
    status: status as Profile["status"],
    lastSeen: 1_700_000_000_000_000_000n,
  };
}

function makeConversation(
  id: bigint,
  preview: string,
  unreadA: bigint,
  unreadB: bigint,
): Conversation {
  return {
    id,
    participantA: ME,
    participantB: OTHER,
    lastMessagePreview: preview,
    lastMessageAt: 1_700_000_000_000_000_000n,
    unreadA,
    unreadB,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConversationsPage />
    </QueryClientProvider>,
  );
}

describe("ConversationsPage", () => {
  beforeEach(() => {
    actorMock.getMyProfile.mockReset();
    actorMock.listUsers.mockReset();
    actorMock.listConversations.mockReset();
  });

  it("shows the empty state when there are no conversations", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([]);
    actorMock.listConversations.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
    expect(screen.getByText("Browse directory")).toBeInTheDocument();
  });

  it("lists conversations with last message preview and unread badge", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([makeProfile(OTHER, "Bob")]);
    actorMock.listConversations.mockResolvedValue([
      makeConversation(1n, "Hey Alice", 0n, 2n),
    ]);

    renderPage();

    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Hey Alice")).toBeInTheDocument();
    // Alice is participantA, so her unread count is unreadA = 0 -> no badge.
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the unread badge for the current user's unread count", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([makeProfile(OTHER, "Bob")]);
    actorMock.listConversations.mockResolvedValue([
      makeConversation(1n, "Hey Alice", 3n, 0n),
    ]);

    renderPage();

    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
