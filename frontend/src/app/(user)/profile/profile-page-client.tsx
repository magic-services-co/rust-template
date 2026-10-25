"use client";

import { usePublicFront } from "@/lib/public-front";
import ProfileHeader from "./profile-header";
import { Suspense } from "react";
import { ProfileTabs } from "./profile-tabs";
import { ProfileThemeProvider } from "@/components/profile-theme-provider";
import { ProfileTitles } from "@/components/profile-titles";
import { SupportPageShell } from "@/components/support/support-page-shell";
import type { UserSession } from "@/types/next-auth";

type ProfilePageClientProps = {
    user: UserSession;
    theme: Record<string, unknown> | undefined;
};

export function ProfilePageClient({ user, theme }: ProfilePageClientProps) {
    const Profile = usePublicFront().slots.profile
    if (Profile) return <Profile user={user} theme={theme} />

    return (
        <ProfileThemeProvider serverTheme={theme}>
            <SupportPageShell>
                <ProfileTitles serverTheme={theme} userName={user?.name ?? undefined} />
                <ProfileHeader user={user} serverTheme={theme} />
                <Suspense>
                    <ProfileTabs user={user} serverTheme={theme} />
                </Suspense>
            </SupportPageShell>
        </ProfileThemeProvider>
    );
}
