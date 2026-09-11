import { ProfilePage } from "@/pages/ProfilePage";
import { OnlineStatus, type Profile } from "@/types";
import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actorMock = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  updateProfile: vi.fn(),
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

const ME = Principal.fromText("aaaaa-aa");

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: ME,
    displayName: "Alice",
    status: OnlineStatus.online,
    lastSeen: 1_700_000_000_000_000_000n,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    actorMock.getMyProfile.mockReset();
    actorMock.updateProfile.mockReset();
  });

  it("shows the current profile display name and status", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile());

    renderPage();

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("saves an edited display name through updateProfile", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile());
    actorMock.updateProfile.mockResolvedValue(
      makeProfile({ displayName: "Alicia" }),
    );

    const user = userEvent.setup();
    renderPage();

    // Wait for the profile to load and populate the form before editing.
    await screen.findByText("Alice");
    const nameInput = await screen.findByTestId("display_name_input");
    await user.clear(nameInput);
    await user.type(nameInput, "Alicia");
    await user.click(screen.getByTestId("save_profile_button"));

    await waitFor(() => {
      expect(actorMock.updateProfile).toHaveBeenCalledWith("Alicia", null);
    });
  });

  it("shows a success message after saving", async () => {
    actorMock.getMyProfile.mockResolvedValue(makeProfile());
    actorMock.updateProfile.mockResolvedValue(
      makeProfile({ displayName: "Alicia" }),
    );

    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Alice");
    const nameInput = await screen.findByTestId("display_name_input");
    await user.clear(nameInput);
    await user.type(nameInput, "Alicia");
    await user.click(screen.getByTestId("save_profile_button"));

    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
  });
});
