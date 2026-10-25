"use client";

import { usePublicFront } from "@/lib/public-front";
import { JoinCommunity } from "@/components/home/join-community";
import Rules, { type Rule } from "@/components/home/rules";
import Team, { type TeamMember } from "@/components/home/team";
import { DiscordIcon } from "@/components/icons";
import { DiscordUserCount } from "@/components/DiscordUserCount";
import HomeServers from "@/components/home/home-servers";
import { SupportPageShell } from "@/components/support/support-page-shell";
import { useHomeTheme } from "@/hooks/use-home-theme";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { HomeTheme } from "@/lib/home-theme-defaults";

type ThemeLike = Record<string, unknown> | null | undefined;
type SiteSettingsLike = { name?: string; discordInvite?: string | null } | null | undefined;
type PageSettingsLike = {
  features?: { showJoinCommunity?: boolean; showServerRules?: boolean; showServers?: boolean; showTeam?: boolean };
  featureSettings?: { serverRules?: { rules?: Rule[] }; team?: { members?: TeamMember[] } };
  home?: Record<string, unknown>;
};

export type HomePageClientProps = {
  theme: ThemeLike;
  siteSettings: SiteSettingsLike;
  settings: PageSettingsLike;
  teamMembersWithRoles: TeamMember[];
};

function themeMark(field: keyof HomeTheme, label: string) {
  return {
    "data-theme-field": field,
    "data-theme-label": label,
  };
}

function HomeSectionHeading({
  kicker,
  kickerField,
  kickerLabel,
  title,
  titleField,
  titleLabel,
  titleAccent,
  accentField,
  accentLabel,
  subtitle,
  subtitleField,
  subtitleLabel,
  accentColor,
  align = "left",
}: {
  kicker: string;
  kickerField: keyof HomeTheme;
  kickerLabel: string;
  title: string;
  titleField: keyof HomeTheme;
  titleLabel: string;
  titleAccent?: string;
  accentField: keyof HomeTheme;
  accentLabel: string;
  subtitle?: string;
  subtitleField: keyof HomeTheme;
  subtitleLabel: string;
  accentColor: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" && "mx-auto flex max-w-[760px] flex-col items-center text-center")}>
      <p
        {...themeMark(kickerField, kickerLabel)}
        className="support-hero-kicker font-mono text-[10px] font-medium leading-[10px] tracking-[1.45px]"
      >
        {kicker}
      </p>
      <h2 className="support-hero-title pt-2.5 text-[32px] font-extrabold leading-[40px] tracking-[-1.6px] sm:text-[40px] sm:leading-[48px]">
        <span {...themeMark(titleField, titleLabel)}>{title}</span>
        {titleAccent ? (
          <>
            {" "}
            <span {...themeMark(accentField, accentLabel)} style={{ color: accentColor }}>
              {titleAccent}
            </span>
          </>
        ) : null}
      </h2>
      {subtitle ? (
        <p
          {...themeMark(subtitleField, subtitleLabel)}
          className="support-hero-subtitle max-w-[555px] pt-3 text-[14px] leading-[22px]"
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function HomeCta({
  field,
  label,
  href,
  variant,
  children,
  style,
}: {
  field: keyof HomeTheme;
  label: string;
  href: string;
  variant: "primary" | "secondary";
  children: ReactNode;
  style: CSSProperties;
}) {
  const className =
    "ghost link-cta inline-flex h-12 min-w-[216px] items-center justify-center gap-2 rounded-lg border px-3.5";
  const external = /^https?:\/\//i.test(href);
  const body = (
    <>
      {children}
      {variant === "primary" ? <span className="link-cta-chevron">›</span> : null}
    </>
  );
  const marks = {
    ...themeMark(field, label),
    "data-theme-editable": "text",
    className,
    style,
  };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...marks}>
        {body}
      </a>
    );
  }

  return (
    <Link href={href || "/"} {...marks}>
      {body}
    </Link>
  );
}

export function HomePageClient({ siteSettings, settings, teamMembersWithRoles }: HomePageClientProps) {
  const front = usePublicFront();
  const liveSettings = useSiteSettings();
  const serverHome = {
    ...(settings?.home ?? {}),
    ...(settings?.features ?? {}),
  };
  const { theme: t } = useHomeTheme(serverHome);
  const siteName = (siteSettings?.name || "Magic Rust").replace(/\s+/g, " ").trim();
  const discordInvite = liveSettings.data?.discordInvite ?? siteSettings?.discordInvite ?? "";
  const heroAccent = t.useSiteNameAsAccent
    ? siteName.toUpperCase()
    : (t.pageTitleAccent || siteName).toUpperCase();
  const heroSecondaryHref = t.heroSecondaryHref || discordInvite;
  const communityHref = t.communityCtaHref || discordInvite;

  const Home = front.slots.home;
  if (front.ready && Home) {
    return <Home />;
  }

  return (
    <SupportPageShell>
      <div
        className="home-page"
        style={{
          ["--support-kicker" as string]: t.kickerColor,
          ["--support-title" as string]: t.titleColor,
          ["--support-subtitle" as string]: t.subtitleColor,
          ["--home-accent" as string]: t.titleAccentColor,
          ["--home-card-bg" as string]: t.rulesCardBackground || t.cardBackground,
          ["--home-card-border" as string]: t.rulesCardBorder || t.cardBorder,
          ["--home-trigger" as string]: t.rulesTriggerColor || t.triggerTextColor,
          ["--home-content" as string]: t.rulesBodyColor || t.contentTextColor,
          ["--home-primary-bg" as string]: t.primaryButtonBg,
          ["--home-primary-border" as string]: t.primaryButtonBorder,
          ["--home-primary-text" as string]: t.primaryButtonText,
          ["--home-secondary-bg" as string]: t.secondaryButtonBg,
          ["--home-secondary-border" as string]: t.secondaryButtonBorder,
          ["--home-secondary-text" as string]: t.secondaryButtonText,
          ["--home-avatar-from" as string]: t.avatarSlotFrom,
          ["--home-avatar-to" as string]: t.avatarSlotTo,
          ["--home-avatar-border" as string]: t.avatarSlotBorder,
          ["--home-count" as string]: t.memberCountColor,
          ["--home-rules-bg" as string]: t.rulesCardBackground,
          ["--home-rules-border" as string]: t.rulesCardBorder,
          ["--home-rules-corner" as string]: t.rulesCornerColor,
          ["--home-rules-hover" as string]: t.rulesHoverBackground,
          ["--home-rules-radius" as string]: `${t.rulesRadius}px`,
          ["--home-team-bg" as string]: t.teamCardBackground,
          ["--home-team-border" as string]: t.teamCardBorder,
          ["--home-team-hover" as string]: t.teamCardHover,
          ["--home-team-corner" as string]: t.teamCornerColor,
          ["--home-team-name" as string]: t.teamNameColor,
          ["--home-team-role" as string]: t.teamFallbackRoleColor,
          ["--home-team-avatar-border" as string]: t.teamAvatarBorder,
          ["--home-team-avatar-empty" as string]: t.teamAvatarEmpty,
          ["--home-team-cols" as string]: String(t.teamColumns),
          ["--home-team-avatar" as string]: `${t.teamAvatarSize}px`,
          ["--home-team-avatar-radius" as string]: `${t.teamAvatarRadius}px`,
          ["--home-team-radius" as string]: `${t.teamCardRadius}px`,
          ["--home-team-pad" as string]: `${t.teamCardPad}px`,
          ["--home-team-gap" as string]: `${t.teamCardGap}px`,
          ["--home-servers-bg" as string]: t.serversCardBackground,
          ["--home-servers-border" as string]: t.serversCardBorder,
          ["--home-servers-hover" as string]: t.serversCardHover,
          ["--home-servers-corner" as string]: t.serversCornerColor,
          ["--home-servers-name" as string]: t.serversNameColor,
          ["--home-servers-meta" as string]: t.serversMetaColor,
          ["--home-servers-count" as string]: t.serversCountColor,
          ["--home-servers-connect" as string]: t.serversConnectColor,
          ["--home-servers-divider" as string]: t.serversDivider,
          ["--home-servers-bar-track" as string]: t.serversBarTrack,
          ["--home-servers-bar-from" as string]: t.serversBarFrom,
          ["--home-servers-bar-to" as string]: t.serversBarTo,
          ["--home-servers-cols" as string]: String(t.serversColumns),
          ["--home-servers-radius" as string]: `${t.serversCardRadius}px`,
          ["--home-servers-pad" as string]: `${t.serversCardPad}px`,
          ["--home-servers-gap" as string]: `${t.serversCardGap}px`,
        }}
        data-rules-corners={t.rulesShowCorners ? "on" : "off"}
        data-team-corners={t.teamShowCorners ? "on" : "off"}
        data-servers-corners={t.serversShowCorners ? "on" : "off"}
      >
        <div className="flex flex-col gap-8 border-b border-[rgba(255,255,255,0.1)] pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[640px]">
            <p
              {...themeMark("kickerLabel", "Hero kicker")}
              className="support-hero-kicker font-mono text-[10px] font-medium leading-[10px] tracking-[1.45px]"
            >
              {t.kickerLabel}
            </p>
            <h1 className="support-hero-title pt-2.5 text-[40px] font-extrabold leading-[48px] tracking-[-2.4px] sm:text-[56px] sm:leading-[60px] lg:text-[62px] lg:leading-[62px] lg:tracking-[-2.9px]">
              <span {...themeMark("pageTitle", "Hero title")}>{t.pageTitle} </span>
              <span
                {...themeMark(t.useSiteNameAsAccent ? "useSiteNameAsAccent" : "pageTitleAccent", "Hero gold words")}
                style={{ color: t.titleAccentColor }}
              >
                {heroAccent}
              </span>
            </h1>
            <p
              {...themeMark("pageSubtitle", "Hero subtitle")}
              className="support-hero-subtitle max-w-[510px] pt-4 text-[14px] leading-[22px]"
            >
              {t.pageSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {t.showHeroPrimaryCta ? (
              <HomeCta
                field="heroPrimaryLabel"
                label="Primary button text"
                href={t.heroPrimaryHref || "/store"}
                variant="primary"
                style={{
                  backgroundColor: t.primaryButtonBg,
                  borderColor: t.primaryButtonBorder,
                  color: t.primaryButtonText,
                }}
              >
                {t.heroPrimaryLabel}
              </HomeCta>
            ) : null}
            {t.showHeroSecondaryCta && heroSecondaryHref ? (
              <HomeCta
                field="heroSecondaryLabel"
                label="Secondary button text"
                href={heroSecondaryHref}
                variant="secondary"
                style={{
                  backgroundColor: t.secondaryButtonBg,
                  borderColor: t.secondaryButtonBorder,
                  color: t.secondaryButtonText,
                }}
              >
                <DiscordIcon className="h-4 w-4" />
                {t.heroSecondaryLabel}
              </HomeCta>
            ) : null}
          </div>
        </div>

        {t.showJoinCommunity ? (
          <section
            id="join-community"
            className="flex flex-col gap-10 pt-16 lg:flex-row lg:items-center lg:justify-between"
          >
            <div className="max-w-[510px]">
              <HomeSectionHeading
                kicker={t.communityKicker}
                kickerField="communityKicker"
                kickerLabel="Community kicker"
                title={t.communityTitle}
                titleField="communityTitle"
                titleLabel="Community title"
                titleAccent={t.communityTitleAccent}
                accentField="communityTitleAccent"
                accentLabel="Community gold words"
                subtitle={t.communitySubtitle}
                subtitleField="communitySubtitle"
                subtitleLabel="Community subtitle"
                accentColor={t.titleAccentColor}
              />
              <div className="flex flex-wrap items-center gap-3 pt-8">
                {t.showCommunityCta && communityHref ? (
                  <HomeCta
                    field="communityCtaLabel"
                    label="Community button text"
                    href={communityHref}
                    variant="primary"
                    style={{
                      backgroundColor: t.primaryButtonBg,
                      borderColor: t.primaryButtonBorder,
                      color: t.primaryButtonText,
                    }}
                  >
                    {t.communityCtaLabel}
                  </HomeCta>
                ) : null}
                {t.showDiscordCount ? (
                  <p
                    {...themeMark("discordCountSuffix", "Member count label")}
                    className="font-mono text-[11px] tracking-[1.4px]"
                    style={{ color: t.memberCountColor }}
                  >
                    <DiscordUserCount suffix={t.discordCountSuffix} />
                  </p>
                ) : null}
              </div>
            </div>
            <JoinCommunity slots={t.communitySlots} emptyLabel={t.avatarEmptyLabel} />
          </section>
        ) : null}

        {t.showServers ? (
          <section className="pt-20">
            <HomeSectionHeading
              align="center"
              kicker={t.serversKicker}
              kickerField="serversKicker"
              kickerLabel="Servers kicker"
              title={t.serversTitle}
              titleField="serversTitle"
              titleLabel="Servers title"
              titleAccent={t.serversTitleAccent}
              accentField="serversTitleAccent"
              accentLabel="Servers gold words"
              subtitle={t.serversSubtitle}
              subtitleField="serversSubtitle"
              subtitleLabel="Servers subtitle"
              accentColor={t.titleAccentColor}
            />
            <div className="pt-10">
              <HomeServers
                ctaLabel={t.serversCtaLabel}
                ctaHref={t.serversCtaHref}
                showCta={t.showServersCta}
                limit={t.serversLimit}
                ctaStyle={{
                  backgroundColor: t.primaryButtonBg,
                  borderColor: t.primaryButtonBorder,
                  color: t.primaryButtonText,
                }}
              />
            </div>
          </section>
        ) : null}

        {t.showServerRules ? (
          <section
            id="server-rules"
            className="flex flex-col-reverse gap-10 pt-20 md:gap-12 lg:flex-row lg:items-start lg:justify-between"
          >
            <div className="min-w-0 flex-1">
              <Rules
                rules={settings?.featureSettings?.serverRules?.rules}
                emptyTitle={t.emptyRulesTitle}
                emptyBody={t.emptyRulesBody}
              />
            </div>
            <div className="max-w-[420px] lg:pt-2">
              <HomeSectionHeading
                kicker={t.rulesKicker}
                kickerField="rulesKicker"
                kickerLabel="Rules kicker"
                title={t.rulesTitle}
                titleField="rulesTitle"
                titleLabel="Rules title"
                titleAccent={t.rulesTitleAccent}
                accentField="rulesTitleAccent"
                accentLabel="Rules gold words"
                subtitle={t.rulesSubtitle}
                subtitleField="rulesSubtitle"
                subtitleLabel="Rules subtitle"
                accentColor={t.titleAccentColor}
              />
            </div>
          </section>
        ) : null}

        {t.showTeam ? (
          <section id="team" className="pt-20">
            <HomeSectionHeading
              align="center"
              kicker={t.teamKicker}
              kickerField="teamKicker"
              kickerLabel="Team kicker"
              title={t.teamTitle}
              titleField="teamTitle"
              titleLabel="Team title"
              titleAccent={t.teamTitleAccent}
              accentField="teamTitleAccent"
              accentLabel="Team gold words"
              subtitle={t.teamSubtitle}
              subtitleField="teamSubtitle"
              subtitleLabel="Team subtitle"
              accentColor={t.titleAccentColor}
            />
            <div className="pt-10">
              <Team members={teamMembersWithRoles} emptyText={t.emptyTeamText} />
            </div>
          </section>
        ) : null}
      </div>
    </SupportPageShell>
  );
}
