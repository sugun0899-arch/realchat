import { ChatPage } from "@/pages/ChatPage";
import {
  type Conversation,
  type Message,
  OnlineStatus,
  type Profile,
} from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actorMock = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  listUsers: vi.fn(),
  getConversation: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
  markConversationRead: vi.fn(),
  startCall: vi.fn(),
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

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: () => ({ conversationId: "1" }),
    useNavigate: () => navigateMock,
  };
});

const ME = Principal.fromText("aaaaa-aa");
const OTHER = Principal.fromText("2vxsx-fae");

function makeProfile(id: Principal, displayName: string): Profile {
  return {
    id,
    displayName,
    status: OnlineStatus.online,
    lastSeen: 1_700_000_000_000_000_000n,
  };
}

function makeConversation(): Conversation {
  return {
    id: 1n,
    participantA: ME,
    participantB: OTHER,
    lastMessagePreview: "Hello",
    lastMessageAt: 1_700_000_000_000_000_000n,
    unreadA: 0n,
    unreadB: 0n,
  };
}

function makeMessage(
  id: bigint,
  sender: Principal,
  body: string,
  read = true,
): Message {
  return {
    id,
    conversationId: 1n,
    sender,
    body,
    sentAt: 1_700_000_000_000_000_000n,
    read,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ChatPage />
    </QueryClientProvider>,
  );
}

describe("ChatPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    actorMock.getMyProfile.mockReset();
    actorMock.listUsers.mockReset();
    actorMock.getConversation.mockReset();
    actorMock.listMessages.mockReset();
    actorMock.sendMessage.mockReset();
    actorMock.markConversationRead.mockReset();
    actorMock.startCall.mockReset();
  });

  it("renders the other party's name and status in the header", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([makeProfile(OTHER, "Bob")]);
    actorMock.getConversation.mockResolvedValue(makeConversation());
    actorMock.listMessages.mockResolvedValue([]);
    actorMock.markConversationRead.mockResolvedValue(undefined);

    renderPage();

    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("No messages yet")).toBeInTheDocument();
  });

  it("distinguishes my messages from the other party's", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([makeProfile(OTHER, "Bob")]);
    actorMock.getConversation.mockResolvedValue(makeConversation());
    actorMock.listMessages.mockResolvedValue([
      makeMessage(1n, OTHER, "Hi Alice"),
      makeMessage(2n, ME, "Hi Bob"),
    ]);
    actorMock.markConversationRead.mockResolvedValue(undefined);

    renderPage();

    expect(await screen.findByText("Hi Alice")).toBeInTheDocument();
    expect(screen.getByText("Hi Bob")).toBeInTheDocument();
  });

  it("sends a message through the actor and clears the composer", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([makeProfile(OTHER, "Bob")]);
    actorMock.getConversation.mockResolvedValue(makeConversation());
    actorMock.listMessages.mockResolvedValue([]);
    actorMock.markConversationRead.mockResolvedValue(undefined);
    actorMock.sendMessage.mockResolvedValue(makeMessage(3n, ME, "Hello there"));

    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByPlaceholderText("Message Bob");
    await user.type(input, "Hello there");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(actorMock.sendMessage).toHaveBeenCalledWith(1n, "Hello there");
    });
    expect(input).toHaveValue("");
  });
});
