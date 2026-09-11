import { PageShell } from "@/components/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile, useUpdateProfile } from "@/hooks/useQueries";
import { formatRelativeTime, shortPrincipal } from "@/lib/format";
import { OnlineStatus } from "@/types";
import { Camera, Check, Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

function statusMeta(status: OnlineStatus) {
  switch (status) {
    case OnlineStatus.online:
      return { label: "Online", dot: "bg-accent" };
    case OnlineStatus.away:
      return { label: "Away", dot: "bg-warning" };
    case OnlineStatus.offline:
      return { label: "Offline", dot: "bg-muted-foreground" };
  }
}

export function ProfilePage() {
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setDisplayName(profile.displayName);
      setAvatar(profile.avatar ?? "");
      setInitialized(true);
    }
  }, [profile, initialized]);

  const trimmedName = displayName.trim();
  const trimmedAvatar = avatar.trim();
  const canSave = trimmedName.length > 0 && !updateProfile.isPending;

  const initials = (trimmedName || profile?.displayName || "?")
    .slice(0, 1)
    .toUpperCase();
  const previewAvatar = trimmedAvatar || profile?.avatar;
  const status = profile ? statusMeta(profile.status) : null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    const name = trimmedName;
    const avatarValue = trimmedAvatar === "" ? null : trimmedAvatar;
    updateProfile.mutate({ displayName: name, avatar: avatarValue });
  }

  return (
    <PageShell
      title="Profile"
      description="Your account details"
      data-ocid="page_profile"
    >
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
        {/* Profile summary */}
        <section
          className="bg-card shadow-subtle rounded-2xl border p-6"
          data-ocid="profile_summary"
        >
          {isLoading || !profile ? (
            <div className="flex items-center gap-5">
              <Skeleton className="size-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
              <div className="relative shrink-0">
                <Avatar className="size-20 border-4 border-background shadow-elevated">
                  {previewAvatar ? (
                    <AvatarImage
                      src={previewAvatar}
                      alt={profile.displayName}
                    />
                  ) : null}
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-display text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {status ? (
                  <span
                    className={`absolute right-1 bottom-1 size-4 rounded-full border-2 border-background ${status.dot}`}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  {profile.displayName}
                </h2>
                <p className="text-muted-foreground mt-0.5 font-mono text-sm">
                  {shortPrincipal(profile.id)}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  {status ? (
                    <span className="bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                      <span
                        className={`size-2 rounded-full ${status.dot}`}
                        aria-hidden="true"
                      />
                      {status.label}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground text-xs">
                    Last seen {formatRelativeTime(profile.lastSeen)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Edit form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card shadow-subtle rounded-2xl border p-6"
          data-ocid="profile_edit_form"
        >
          <div className="mb-5 flex items-center gap-2">
            <Camera className="text-primary size-5" />
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Edit profile
            </h3>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your display name"
                maxLength={40}
                data-ocid="display_name_input"
              />
              <p className="text-muted-foreground text-xs">
                Shown to others across REALCHAT.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar-url">Avatar URL</Label>
              <div className="flex items-center gap-3">
                <Avatar className="size-10 shrink-0">
                  {previewAvatar ? (
                    <AvatarImage src={previewAvatar} alt="Avatar preview" />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Input
                  id="avatar-url"
                  value={avatar}
                  onChange={(event) => setAvatar(event.target.value)}
                  placeholder="https://…/avatar.png"
                  data-ocid="avatar_url_input"
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Paste a link to an image. Leave blank to use your initials.
              </p>
            </div>

            {updateProfile.isError ? (
              <p
                className="text-destructive text-sm"
                data-ocid="profile_error_state"
              >
                Could not save your profile. Please try again.
              </p>
            ) : null}

            {updateProfile.isSuccess ? (
              <p
                className="text-success flex items-center gap-1.5 text-sm"
                data-ocid="profile_success_state"
              >
                <Check className="size-4" />
                Profile saved.
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-3 border-t pt-5">
              <Button
                type="submit"
                disabled={!canSave}
                data-ocid="save_profile_button"
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
