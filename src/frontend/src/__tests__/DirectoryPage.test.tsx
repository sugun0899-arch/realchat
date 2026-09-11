import { DirectoryPage } from "@/pages/DirectoryPage";
import type { Profile } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actorMock = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  listUsers: vi.fn(),
  startConversation: vi.fn(),
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
    useNavigate: () => navigateMock,
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DirectoryPage />
    </QueryClientProvider>,
  );
}

describe("DirectoryPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    actorMock.getMyProfile.mockReset();
    actorMock.listUsers.mockReset();
    actorMock.startConversation.mockReset();
  });

  it("shows the empty state when there are no other users", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([makeProfile(ME, "Alice")]);

    renderPage();

    expect(await screen.findByText("No users found")).toBeInTheDocument();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("lists other users and excludes the current user", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([
      makeProfile(ME, "Alice"),
      makeProfile(OTHER, "Bob"),
    ]);

    renderPage();

    expect(await screen.findByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("starts a conversation and navigates to the chat when a user is selected", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile(ME, "Alice"));
    actorMock.listUsers.mockResolvedValue([makeProfile(OTHER, "Bob")]);
    actorMock.startConversation.mockResolvedValue(7n);

    const user = userEvent.setup();
    renderPage();

    const chatButton = await screen.findByTestId("directory.chat_button.0");
    await user.click(chatButton);

    await waitFor(() => {
      expect(actorMock.startConversation).toHaveBeenCalledWith(OTHER);
    });
    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: "/conversations/$conversationId",
        params: { conversationId: "7" },
      });
    });
  });
});
