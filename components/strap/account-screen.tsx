"use client";

// /account: settings that belong to the signed-in user rather than to a Strap.
// They render the same whichever Strap is active. Strap-scoped settings stay
// on /settings (see SettingsScreen).

import { AccountSecuritySettings } from "@/components/strap/account-security-settings";
import { LegacySubscriptionNotice } from "@/components/strap/legacy-subscription-notice";
import { EditableProfileAvatar } from "@/components/strap/profile-avatar";
import { useStrap } from "@/components/strap/strap-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AccountScreen() {
  const { state, setDisplayName, setProfileAvatar, refreshState, deleteAccount } =
    useStrap();
  const [nameDraft, setNameDraft] = useState(state.user.name);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Deleting the account cascades the Company Strap the user owns, if any (a
  // user owns at most one, see creeds_one_company_per_owner), so the danger
  // zone names it.
  const ownedCompany = state.creeds?.find(
    (creed) => creed.type === "company" && creed.role === "owner",
  )?.name;

  async function saveDisplayName() {
    const next = nameDraft.trim();
    if (!next || next === state.user.name) {
      setNameDraft(state.user.name);
      return;
    }

    const ok = await setDisplayName(next);
    if (ok) {
      setNameDraft(next);
      toast.success("Name updated.");
    } else {
      setNameDraft(state.user.name);
      toast.error("Could not update name.");
    }
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.set("scope", "personal");
      form.set("file", file);
      const response = await fetch("/api/app/profile/avatar", {
        method: "POST",
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        avatarUrl?: string;
      };
      if (!response.ok) {
        toast.error(data.error ?? "Could not save profile picture.");
        return;
      }
      if (data.avatarUrl) {
        setProfileAvatar(data.avatarUrl, "personal");
      }
      void refreshState();
      toast.success("Profile picture saved.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleDeleteAccount() {
    try {
      setDeleting(true);
      await deleteAccount();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete account.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="h-full overflow-y-auto bg-[var(--strap-surface)] strap-scrollbar">
        <div className="mx-auto max-w-3xl px-8 py-10 md:px-14">
          <h1 className="font-heading text-[1.75rem] font-semibold tracking-[-0.03em] text-[var(--strap-text-primary)]">
            Account
          </h1>
          <p className="mt-2 text-[14px] leading-7 text-[var(--strap-text-secondary)]">
            Your profile and sign-in. These stay the same in every Strap you
            belong to.
          </p>

          <section id="account-profile" className="mt-10 scroll-mt-6">
            <h2 className="text-[16px] font-medium text-[var(--strap-text-primary)]">
              Profile
            </h2>
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--strap-border)] bg-[var(--strap-surface)] p-5">
              <div className="grid grid-cols-[calc(1.25rem+0.5rem+2.75rem)_minmax(0,1fr)] items-start gap-x-4 gap-y-4 md:flex md:gap-5">
                <EditableProfileAvatar
                  kind="person"
                  name={state.user.name}
                  initials={state.user.avatarInitials}
                  avatarUrl={state.user.avatarUrl}
                  uploading={avatarUploading}
                  onFile={(file) => void uploadAvatar(file)}
                />
                <div className="contents md:block md:min-w-0 md:flex-1 md:space-y-3">
                  <div className="min-w-0">
                    <label
                      htmlFor="account-name"
                      className="mb-2 block text-[14px] font-medium leading-5 text-[var(--strap-text-secondary)]"
                    >
                      Name
                    </label>
                    <Input
                      id="account-name"
                      value={nameDraft}
                      onChange={(event) => setNameDraft(event.target.value)}
                      onBlur={() => void saveDisplayName()}
                      className="h-11 rounded-xl border-[var(--strap-border)] bg-[var(--strap-surface)] px-4 text-[15px]"
                    />
                  </div>
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <label
                      htmlFor="account-email"
                      className="mb-2 block text-[14px] font-medium leading-5 text-[var(--strap-text-secondary)]"
                    >
                      Email
                    </label>
                    <Input
                      id="account-email"
                      value={state.user.email}
                      readOnly
                      className="h-11 rounded-xl border-[var(--strap-border)] bg-[var(--strap-surface)] px-4 text-[15px] text-[var(--strap-text-secondary)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator className="my-10 bg-[var(--strap-border)]" />

          <AccountSecuritySettings />

          <Separator className="my-10 bg-[var(--strap-border)]" />

          <LegacySubscriptionNotice scope="personal" />

          <section id="account-danger" className="scroll-mt-6">
            <h2 className="text-[16px] font-medium text-[var(--strap-text-primary)]">
              Danger zone
            </h2>
            <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--strap-danger)] bg-[var(--strap-warning-tint)] p-5">
              <div className="flex items-center justify-between gap-5">
                <div className="min-w-0">
                  <div className="text-[15px] font-medium text-[var(--strap-danger)]">
                    Delete account
                  </div>
                  <div className="mt-2 hidden text-[14px] leading-7 text-[var(--strap-danger)] md:block">
                    Permanently deletes your account and your personal Strap,
                    with its tokens, proposals and activity.
                    {ownedCompany
                      ? ` It also deletes ${ownedCompany}, which you own, for every member.`
                      : null}
                  </div>
                </div>
                <Button
                  className="rounded-md bg-[var(--strap-danger-fill)] px-4 text-white hover:bg-[var(--strap-danger-fill-hover)] hover:text-white"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-[var(--radius-xl)] border-[var(--strap-frame)] bg-[var(--strap-surface)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-[var(--strap-danger)]" />
              Delete account
            </DialogTitle>
          </DialogHeader>
          <p className="text-[14px] leading-7 text-[var(--strap-text-secondary)]">
            This deletes your account and everything linked to it.
            {ownedCompany
              ? ` That includes ${ownedCompany}, which you own, and its content for every member.`
              : null}{" "}
            This cannot be undone.
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="rounded-md"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-md bg-[var(--strap-danger-fill)] text-white hover:bg-[var(--strap-danger-fill-hover)]"
              onClick={() => void handleDeleteAccount()}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  Deleting
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                </>
              ) : (
                "Confirm delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
