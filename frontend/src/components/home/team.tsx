"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfilePanel } from "@/components/profile/profile-ui";
import { readableText } from "@/lib/color-contrast";

export interface TeamMember {
  userId: string;
  name?: string;
  image?: string;
  role?: string;
  roleColor?: string;
}

interface TeamProps {
  members?: TeamMember[];
  emptyText?: string;
}

export default function Team({ members, emptyText = "No team members configured yet." }: TeamProps) {
  const [activeTab, setActiveTab] = useState(0);

  const membersPerTab = 9;
  const tabsCount = useMemo(() => {
    return members && members.length > 0 ? Math.ceil(members.length / membersPerTab) : 0;
  }, [members]);

  const currentTabMembers = useMemo(() => {
    if (!members || members.length === 0) return [];
    const start = activeTab * membersPerTab;
    return members.slice(start, start + membersPerTab);
  }, [members, activeTab]);

  useEffect(() => {
    if (activeTab >= tabsCount && tabsCount > 0) {
      setActiveTab(Math.max(0, tabsCount - 1));
    }
  }, [tabsCount, activeTab]);

  if (!members || members.length === 0) {
    return (
      <p className="home-team-empty py-8 text-center text-[13px]">{emptyText}</p>
    );
  }

  return (
    <div className="space-y-6">
      {tabsCount > 1 && (
        <div className="flex items-center justify-center">
          <Select value={activeTab.toString()} onValueChange={(v) => setActiveTab(Number(v))}>
            <SelectTrigger className="ghost home-team-pager h-9 w-[250px] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: tabsCount }).map((_, index) => (
                <SelectItem key={index} value={index.toString()}>
                  Tab {index + 1} (Members {index * membersPerTab + 1}-
                  {Math.min((index + 1) * membersPerTab, members.length)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="home-team-grid">
        {currentTabMembers.map((member, index) => (
          <div
            key={member.userId || index}
            data-theme-field="teamCardBackground"
            data-theme-label="Team card fill"
          >
            <ProfilePanel
              className="home-team-card flex h-full flex-col items-center"
              style={{
                backgroundColor: "var(--home-team-bg, rgba(8, 12, 17, 0.94))",
                borderColor: "var(--home-team-border, rgba(255, 255, 255, 0.1))",
                borderRadius: "var(--home-team-radius, 0px)",
                padding: "var(--home-team-pad, 24px)",
              }}
            >
            {member.image ? (
              <Image
                src={member.image}
                alt={member.name || "Team member"}
                width={128}
                height={128}
                className="home-team-avatar object-cover"
              />
            ) : (
              <div className="home-team-avatar home-team-avatar-empty flex items-center justify-center text-xl">
                ?
              </div>
            )}
            <p className="home-team-name w-full truncate pt-3 text-center text-[13px] font-medium">
              {member.name || "Unknown"}
            </p>
            {member.role ? (
              <p
                className="home-team-role w-full truncate pt-1 text-center text-[10px] font-medium tracking-[1.2px]"
                style={{
                  color:
                    member.roleColor && /^#[0-9A-F]{6}$/i.test(member.roleColor)
                      ? readableText(member.roleColor, "#12181f")
                      : "var(--home-team-role, #ba9142)",
                }}
              >
                {member.role.toUpperCase()}
              </p>
            ) : null}
          </ProfilePanel>
          </div>
        ))}
      </div>
    </div>
  );
}
