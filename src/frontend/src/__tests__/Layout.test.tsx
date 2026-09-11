import { Layout } from "@/components/Layout";
import { OnlineStatus, type Profile } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actorMock = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  listUsers: vi.fn(),
  listConversations: vi.fn(),
  listCalls: vi.fn(),
}));

const identityMock = vi.hoisted(() => ({
  isAuthenticated: true,
  isInitializing: false,
  login: vi.fn(),
  clear: vi.fn(),
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: actorMock, isFetching: false }),
  useInternetIdentity: () => identityMock,
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children: React.ReactNode;
    }) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
    Outlet: () => <div data-ocid="outlet" />,
  };
});

const ME = Principal.fromText("aaaaa-aa");

function makeProfile(): Profile {
  return {
    id: ME,
    displayName: "Alice",
    status: OnlineStatus.online,
    lastSeen: 1_700_000_000_000_000_000n,
  };
}

function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Layout />
    </QueryClientProvider>,
  );
}

describe("Layout", () => {
  beforeEach(() => {
    identityMock.isAuthenticated = true;
    identityMock.isInitializing = false;
    actorMock.getMyProfile.mockReset();
    actorMock.listUsers.mockReset();
    actorMock.listConversations.mockReset();
    actorMock.listCalls.mockReset();
  });

  it("shows the login screen when the user is not authenticated", () => {
    identityMock.isAuthenticated = false;

    renderLayout();

    expect(
      screen.getByRole("button", { name: "Sign in with Internet Identity" }),
    ).toBeInTheDocument();
  });

  it("shows the app shell with navigation when authenticated", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile());
    actorMock.listUsers.mockResolvedValue([]);
    actorMock.listConversations.mockResolvedValue([]);
    actorMock.listCalls.mockResolvedValue([]);

    renderLayout();

    expect(await screen.findByText("Conversations")).toBeInTheDocument();
    expect(screen.getByText("Directory")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });
});
