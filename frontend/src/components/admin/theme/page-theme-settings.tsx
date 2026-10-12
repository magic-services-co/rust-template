'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { backendApi } from '@/lib/api';
import { getAuthToken } from '@/lib/laravel-auth';
import { prepareSanctumMutationHeaders } from '@/lib/sanctum-csrf';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Info, Save, Trash2, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_PAGE_THEMES, getDefaultFormValues } from '@/lib/theme-defaults';
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { HomeAppearanceFields } from "@/components/admin/theme/home-appearance-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const pageThemeSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  enabled: z.boolean().default(true),
  settings: z.object({
    layout: z.object({
      maxWidth: z.string(),
      padding: z.string(),
      margin: z.string(),
      containerType: z.string(),
    }),
    header: z.object({
      height: z.string(),
      backgroundColor: z.string(),
      textColor: z.string(),
      isSticky: z.boolean(),
      showOnScroll: z.boolean(),
      transparency: z.number(),
    }),
    content: z.object({
      backgroundColor: z.string(),
      textColor: z.string(),
      maxWidth: z.string(),
      lineHeight: z.number(),
      paragraphSpacing: z.string(),
      headingSpacing: z.string(),
    }).optional(),
    cards: z.object({
      backgroundColor: z.string(),
      borderRadius: z.string(),
      padding: z.string(),
      shadow: z.string(),
      hoverEffect: z.string(),
    }).optional(),
    forms: z.object({
      inputBackground: z.string(),
      inputBorderColor: z.string(),
      inputTextColor: z.string(),
      inputBorderRadius: z.string(),
      inputPadding: z.string(),
      labelColor: z.string(),
      errorColor: z.string(),
    }).optional(),
    links: z.object({
      backgroundColor: z.string(),
      borderRadius: z.string(),
      padding: z.string(),
      shadow: z.string(),
      hoverEffect: z.string(),
      spacing: z.string(),
      iconSize: z.string(),
      iconColor: z.string(),
      textColor: z.string(),
      hoverTextColor: z.string(),
    }).optional(),
    features: z.object({
      showJoinCommunity: z.boolean(),
      showServerRules: z.boolean(),
      showServers: z.boolean(),
      showTeam: z.boolean(),
    }).optional(),
    featureSettings: z.object({
      joinCommunity: z.object({
        showDiscord: z.boolean(),
        showSteam: z.boolean(),
        showSocialLinks: z.boolean(),
      }).optional(),
      serverRules: z.object({
        showCategories: z.boolean(),
        showLastUpdated: z.boolean(),
        rules: z.array(z.object({
          title: z.string(),
          content: z.string(),
        })).optional(),
      }).optional(),
      team: z.object({
        members: z.array(z.object({
          userId: z.string(),
          name: z.string().optional(),
          image: z.string().optional(),
          role: z.string().optional(),
          roleColor: z.string().optional(),
        })).optional(),
      }).optional(),
    }).optional(),
    leaderboard: z.object({
      pageBackground: z.string(),
      backgroundColor: z.string(),
      tabActiveBg: z.string(),
      tabInactiveBg: z.string(),
      tabActiveText: z.string(),
      tabInactiveText: z.string(),
      tableHeaderBg: z.string(),
      tableHeaderText: z.string(),
      tableRowBg: z.string(),
      tableRowText: z.string(),
      searchBg: z.string(),
      searchText: z.string(),
      playerCountBg: z.string(),
      playerCountText: z.string(),
      titleColor: z.string(),
      subtitleColor: z.string(),
      blurIntensity: z.number().optional(),
    }).optional(),
    servers: z.object({
      backgroundColor: z.string(),
      cardBackground: z.string(),
      cardBorderRadius: z.string(),
      cardShadow: z.string(),
      cardHoverEffect: z.string(),
      titleColor: z.string(),
      subtitleColor: z.string(),
      categoryTitleColor: z.string(),
      categoryTitleSize: z.string(),
      statusOnlineColor: z.string(),
      statusOfflineColor: z.string(),
      wipeTextColor: z.string(),
      progressBarBackground: z.string(),
      progressBarForeground: z.string(),
      progressBarTextColor: z.string(),
      playerCountBackground: z.string(),
      playerCountTextColor: z.string(),
      buttonPrimaryBg: z.string(),
      buttonPrimaryText: z.string(),
      buttonPrimaryHoverBg: z.string(),
      buttonSecondaryBg: z.string(),
      buttonSecondaryText: z.string(),
      buttonSecondaryBorder: z.string(),
      buttonSecondaryHoverBg: z.string(),
      buttonBorderRadius: z.string(),
      rankBadgeBackground: z.string(),
      rankBadgeTextColor: z.string(),
      serverImageOverlay: z.string(),
      spacing: z.string(),
      cardPadding: z.string(),
    }).optional(),
    store: z.object({
      layoutPreset: z.enum(["default", "tabs-left", "all-packs"]).default("default"),
      backgroundColor: z.string(),
      kickerColor: z.string().optional(),
      kickerLabel: z.string().optional(),
      titleColor: z.string(),
      titleAccentColor: z.string().optional(),
      pageTitle: z.string().optional(),
      pageTitleAccent: z.string().optional(),
      pageSubtitle: z.string().optional(),
      subtitleColor: z.string(),
      categoryCardBackground: z.string(),
      categoryCardBorder: z.string(),
      categoryCardHoverBackground: z.string(),
      categoryCardTitleColor: z.string(),
      categoryCardHoverTitleColor: z.string(),
      tabActiveBackground: z.string().optional(),
      tabActiveText: z.string().optional(),
      tabInactiveText: z.string().optional(),
      packageCountColor: z.string().optional(),
      productCardBackground: z.string(),
      productCardBorder: z.string(),
      productCardHoverBackground: z.string(),
      productCardTitleColor: z.string(),
      productCardDescriptionColor: z.string(),
      productCardPriceColor: z.string(),
      productCardOriginalPriceColor: z.string(),
      productCardDiscountBadgeBackground: z.string(),
      productCardDiscountBadgeText: z.string(),
      productCardMetaColor: z.string().optional(),
      productCardBrandColor: z.string().optional(),
      sidebarBackground: z.string(),
      sidebarBorder: z.string(),
      sidebarTitleColor: z.string(),
      sidebarTextColor: z.string(),
      sidebarPriceColor: z.string().optional(),
      sidebarSelectedNameColor: z.string().optional(),
      saleBackground: z.string().optional(),
      saleBorder: z.string().optional(),
      saleTitleColor: z.string().optional(),
      saleMetaColor: z.string().optional(),
      buttonPrimaryBackground: z.string(),
      buttonPrimaryText: z.string(),
      buttonPrimaryHoverBackground: z.string(),
      buttonSecondaryBackground: z.string(),
      buttonSecondaryText: z.string(),
      buttonSecondaryBorder: z.string(),
      buttonSecondaryHoverBackground: z.string(),
      buttonBorderRadius: z.string(),
      inputBackground: z.string(),
      inputBorder: z.string(),
      inputText: z.string(),
      inputPlaceholder: z.string(),
      loadingSpinnerColor: z.string(),
      errorTextColor: z.string(),
      successTextColor: z.string(),
      blurIntensity: z.number().optional(),
      cardBorderRadius: z.string(),
      cardPadding: z.string(),
      spacing: z.string(),
      cardHoverEffect: z.string(),
      helpTitle: z.string().optional(),
      helpBody: z.string().optional(),
      helpCta: z.string().optional(),
      helpTitleColor: z.string().optional(),
      helpBodyColor: z.string().optional(),
      perksNote: z.string().optional(),
    }).optional(),
    support: z.object({
      backgroundColor: z.string(),
      kickerColor: z.string().optional(),
      kickerLabel: z.string().optional(),
      titleColor: z.string(),
      subtitleColor: z.string(),
      pageTitle: z.string().optional(),
      pageSubtitle: z.string().optional(),
      categoryCardBackground: z.string(),
      categoryCardBorder: z.string(),
      categoryCardHoverBackground: z.string(),
      categoryCardTitleColor: z.string(),
      categoryCardIconColor: z.string(),
      categoryCardLockColor: z.string(),
      categoryCardBodyColor: z.string().optional(),
      categoryCardMetaColor: z.string().optional(),
      openTicketLabel: z.string().optional(),
      buttonPrimaryBackground: z.string(),
      buttonPrimaryText: z.string(),
      buttonPrimaryHoverBackground: z.string(),
      buttonSecondaryBackground: z.string(),
      buttonSecondaryText: z.string(),
      buttonSecondaryBorder: z.string(),
      buttonSecondaryHoverBackground: z.string(),
      buttonBorderRadius: z.string(),
      formBackground: z.string(),
      formBorder: z.string(),
      inputBackground: z.string(),
      inputBorder: z.string(),
      inputText: z.string(),
      inputPlaceholder: z.string(),
      inputFocusBorder: z.string(),
      labelColor: z.string(),
      errorTextColor: z.string(),
      successTextColor: z.string(),
      warningTextColor: z.string(),
      helpTextColor: z.string(),
      loadingSpinnerColor: z.string(),
      banMessageBackground: z.string(),
      banMessageBorder: z.string(),
      banMessageTextColor: z.string(),
      breadcrumbTextColor: z.string(),
      breadcrumbActiveColor: z.string(),
      blurIntensity: z.number().optional(),
      cardBorderRadius: z.string(),
      cardPadding: z.string(),
      spacing: z.string(),
      cardHoverEffect: z.string(),
    }).optional(),
    maps: z.object({
      backgroundColor: z.string(),
      titleColor: z.string(),
      subtitleColor: z.string(),
      searchInputBackground: z.string(),
      searchInputBorder: z.string(),
      searchInputText: z.string(),
      searchInputPlaceholder: z.string(),
      searchInputFocusBorder: z.string(),
      sectionTitleColor: z.string(),
      sectionTitleSize: z.string(),
      mapCardBackground: z.string(),
      mapCardBorder: z.string(),
      mapCardHoverBackground: z.string(),
      mapCardTitleColor: z.string(),
      mapCardServerNameColor: z.string(),
      mapCardStatusTextColor: z.string(),
      mapCardStatusActiveColor: z.string(),
      mapCardStatusInactiveColor: z.string(),
      mapCardStatusUpcomingColor: z.string(),
      mapCardVoteCountBackground: z.string(),
      mapCardVoteCountText: z.string(),
      mapCardBadgeActiveBackground: z.string(),
      mapCardBadgeActiveText: z.string(),
      mapCardBadgeSecondaryBackground: z.string(),
      mapCardBadgeSecondaryText: z.string(),
      buttonPrimaryBackground: z.string(),
      buttonPrimaryText: z.string(),
      buttonPrimaryHoverBackground: z.string(),
      buttonSecondaryBackground: z.string(),
      buttonSecondaryText: z.string(),
      buttonSecondaryBorder: z.string(),
      buttonSecondaryHoverBackground: z.string(),
      buttonBorderRadius: z.string(),
      loadingSpinnerColor: z.string(),
      loadingSkeletonBackground: z.string(),
      errorTextColor: z.string(),
      errorBackground: z.string(),
      errorBorder: z.string(),
      blurIntensity: z.number().optional(),
      cardBorderRadius: z.string(),
      cardPadding: z.string(),
      cardShadow: z.string(),
      spacing: z.string(),
      cardHoverEffect: z.string(),
    }).optional(),
    profile: z.object({
      backgroundColor: z.string(),
      headerCardBackground: z.string(),
      headerCardBorder: z.string(),
      avatarBorderColor: z.string(),
      userNameColor: z.string(),
      userIdColor: z.string(),
      roleBadgeBackground: z.string(),
      roleBadgeBorder: z.string(),
      roleBadgeText: z.string(),
      tabsBackground: z.string(),
      tabsBorder: z.string(),
      tabActiveBackground: z.string(),
      tabActiveText: z.string(),
      tabInactiveBackground: z.string(),
      tabInactiveText: z.string(),
      tabHoverBackground: z.string(),
      contentCardBackground: z.string(),
      contentCardBorder: z.string(),
      contentCardTitleColor: z.string(),
      contentCardDescriptionColor: z.string(),
      connectedAccountSteamBackground: z.string(),
      connectedAccountDiscordBackground: z.string(),
      connectedAccountIconColor: z.string(),
      connectedAccountTextColor: z.string(),
      connectedAccountStageColor: z.string(),
      buttonPrimaryBackground: z.string(),
      buttonPrimaryText: z.string(),
      buttonPrimaryHoverBackground: z.string(),
      buttonSecondaryBackground: z.string(),
      buttonSecondaryText: z.string(),
      buttonSecondaryBorder: z.string(),
      buttonSecondaryHoverBackground: z.string(),
      buttonSuccessBackground: z.string(),
      buttonSuccessText: z.string(),
      buttonDestructiveBackground: z.string(),
      buttonDestructiveText: z.string(),
      buttonBorderRadius: z.string(),
      copyButtonBackground: z.string(),
      copyButtonText: z.string(),
      copyButtonHoverBackground: z.string(),
      tableHeaderBackground: z.string(),
      tableHeaderText: z.string(),
      tableRowBackground: z.string(),
      tableRowText: z.string(),
      tableRowHoverBackground: z.string(),
      statusActiveColor: z.string(),
      statusInactiveColor: z.string(),
      statusPendingColor: z.string(),
      linkColor: z.string(),
      linkHoverColor: z.string(),
      blurIntensity: z.number().optional(),
      cardBorderRadius: z.string(),
      cardPadding: z.string(),
      cardShadow: z.string(),
      spacing: z.string(),
      cardHoverEffect: z.string(),
    }).optional(),
    bans: z.object({
      backgroundColor: z.string(),
      titleColor: z.string(),
      subtitleColor: z.string(),
      cardBackground: z.string(),
      cardBorder: z.string(),
      cardBorderRadius: z.string(),
      cardShadow: z.string(),
      buttonPrimaryBackground: z.string(),
      buttonPrimaryText: z.string(),
      buttonPrimaryHoverBackground: z.string(),
      buttonSecondaryBackground: z.string(),
      buttonSecondaryText: z.string(),
      buttonSecondaryBorder: z.string(),
      buttonSecondaryHoverBackground: z.string(),
      buttonBorderRadius: z.string(),
      badgeActiveBackground: z.string(),
      badgeActiveText: z.string(),
      badgeInactiveBackground: z.string(),
      badgeInactiveText: z.string(),
      badgeGlobalBackground: z.string(),
      badgeGlobalText: z.string(),
      badgeCategoryBackground: z.string(),
      badgeCategoryText: z.string(),
      badgeIndividualBackground: z.string(),
      badgeIndividualText: z.string(),
      textPrimaryColor: z.string(),
      textSecondaryColor: z.string(),
      textMutedColor: z.string(),
      inputBackground: z.string(),
      inputBorder: z.string(),
      inputTextColor: z.string(),
      inputPlaceholderColor: z.string(),
      inputBorderRadius: z.string(),
      searchBackground: z.string(),
      searchBorder: z.string(),
      searchBorderRadius: z.string(),
      spacing: z.string(),
      cardPadding: z.string(),
      cardHoverEffect: z.string()
    }).optional(),
    home: z.object({}).passthrough().optional(),
  }),
});

const newPageSchema = z.object({
  newSlug: z.string().min(1, "Slug is required"),
});

type PageThemeFormValues = z.output<typeof pageThemeSchema>;
type NewPageFormValues = z.output<typeof newPageSchema>;

interface PageTheme {
  id: string;
  slug: string;
  enabled: boolean;
  settings: any;
  createdAt: string;
  updatedAt: string;
}

function parseColorAndAlpha(value: string): { color: string, alpha: number } {
  if (/^#([0-9a-f]{8})$/i.test(value)) {
    const hex = value.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = parseInt(hex.slice(6, 8), 16) / 255;
    return { color: `#${hex.slice(0, 6)}`, alpha: a };
  }
  const rgbaMatch = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    return { color: `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`, alpha: a };
  }
  if (/^#([0-9a-f]{6})$/i.test(value)) {
    return { color: value, alpha: 1 };
  }
  return { color: '#ffffff', alpha: 1 };
}

function combineColorAndAlpha(color: string, alpha: number, preferRgba = false): string {
  if (alpha === 1 && !preferRgba) return color;
  if (/^#([0-9a-f]{6})$/i.test(color)) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

function ColorInputRow({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  const { color, alpha } = useMemo(() => parseColorAndAlpha(value), [value]);
  const handleColorChange = (newColor: string) => {
    onChange(combineColorAndAlpha(newColor, alpha));
  };
  const handleAlphaChange = (newAlpha: number) => {
    onChange(combineColorAndAlpha(color, newAlpha, value.startsWith('rgba')));
  };
  const handleTextChange = (v: string) => {
    onChange(v);
  };
  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-2 w-full max-w-md shadow-sm">
      <label className="font-semibold text-sm mb-1">{label}</label>
      <div className="flex items-center gap-4">
        <div
          className="relative flex-shrink-0"
          style={{
            width: 40, height: 40, borderRadius: 6, border: '1px solid #888', overflow: 'hidden',
            background: 'repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 0% 0%/16px 16px',
          }}
          aria-label="Color preview"
        >
          <div style={{
            background: value,
            width: '100%', height: '100%', borderRadius: 6, position: 'absolute', top: 0, left: 0
          }} />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <input
                type="color"
                value={/^#([0-9a-f]{6})$/i.test(color) ? color : '#ffffff'}
                onChange={e => handleColorChange(e.target.value)}
                className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer"
                aria-label="Color picker"
                title="Pick a color"
                style={{ minWidth: 32 }}
              />
              <span className="text-xs text-muted-foreground mt-1">Color</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={alpha}
                  onChange={e => handleAlphaChange(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent/60 shadow-sm transition-all duration-200
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-5
                    [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-accent
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-accent-foreground
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:transition-all
                    [&::-webkit-slider-thumb]:duration-200
                    [&::-moz-range-thumb]:appearance-none
                    [&::-moz-range-thumb]:w-5
                    [&::-moz-range-thumb]:h-5
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-accent
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-accent-foreground
                    [&::-moz-range-thumb]:shadow-md
                    [&::-moz-range-thumb]:transition-all
                    [&::-moz-range-thumb]:duration-200
                  "
                  aria-label="Opacity slider"
                  title="Adjust opacity"
                  style={{ minWidth: 60 }}
                />
                <span className="text-xs w-8 text-right text-muted-foreground">{Math.round(alpha * 100)}%</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Opacity</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col mt-2">
        <label className="text-xs text-muted-foreground mb-1">Color Value</label>
        <input
          type="text"
          value={value || ''}
          onChange={e => handleTextChange(e.target.value)}
          className="px-2 py-1 bg-muted border rounded text-sm font-mono"
          placeholder="#ffffff or rgba(0,0,0,0.5)"
          style={{ width: '100%' }}
          aria-label="Color value input"
        />
      </div>
    </div>
  );
}

interface TeamUser {
  id: string;
  name: string;
  email: string | null;
  image?: string;
  type: 'user' | 'linked' | 'player' | 'steam_group';
  steamId?: string;
  username?: string;
}

interface TeamSectionProps {
  form: UseFormReturn<z.input<typeof pageThemeSchema>, any, PageThemeFormValues>;
}

function TeamSection({ form }: TeamSectionProps) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  const watchedMembers = form.watch("settings.featureSettings.team.members");
  const teamMembers = useMemo(() => {
    return watchedMembers || [];
  }, [watchedMembers]);
  
  const membersPerTab = 9;
  const tabsCount = Math.ceil(teamMembers.length / membersPerTab);
  const currentTabMembers = useMemo(() => {
    const start = activeTab * membersPerTab;
    return teamMembers.slice(start, start + membersPerTab);
  }, [teamMembers, activeTab]);

  useEffect(() => {
    if (activeTab >= tabsCount && tabsCount > 0) {
      setActiveTab(Math.max(0, tabsCount - 1));
    }
  }, [tabsCount, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowUserSearch(false);
      }
    };

    if (showUserSearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserSearch]);

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUsers([]);
      return;
    }

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(backendApi(`admin/users/search?q=${encodeURIComponent(query)}`), { credentials: 'include', headers });
      if (response.ok) {
        const data = await response.json();
        const existingIds = teamMembers.map((m: any) => m.userId);
        setUsers((data.users || []).filter((user: TeamUser) => !existingIds.includes(user.id)));
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleUserSelect = (user: TeamUser) => {
    const currentMembers = form.getValues("settings.featureSettings.team.members") || [];
    form.setValue("settings.featureSettings.team.members", [
      ...currentMembers,
      {
        userId: user.id,
        name: user.name,
        image: user.image,
        role: '',
        roleColor: '',
      }
    ]);
    setSearchTerm('');
    setShowUserSearch(false);
    setUsers([]);
    toast.success('Team member added');
  };

  const handleRemoveMember = (index: number) => {
    const currentMembers = form.getValues("settings.featureSettings.team.members") || [];
    const globalIndex = activeTab * membersPerTab + index;
    form.setValue(
      "settings.featureSettings.team.members",
      currentMembers.filter((_: any, i: number) => i !== globalIndex)
    );
    if (activeTab >= tabsCount - 1 && activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
    toast.success('Team member removed');
  };

  return (
    <div className="space-y-4 mt-4">
      <h3 className="text-lg font-medium">Team Section</h3>
      
      <div className="space-y-2">
        <FormLabel>Add Team Member</FormLabel>
        <div className="relative" ref={searchRef}>
          <Input
            placeholder="Search for user by name or steamid..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              searchUsers(e.target.value);
              setShowUserSearch(true);
            }}
            onFocus={() => {
              if (searchTerm.length >= 2) {
                setShowUserSearch(true);
              }
            }}
          />
          {showUserSearch && users.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="px-4 py-3 hover:bg-accent cursor-pointer flex items-start space-x-3 border-b last:border-b-0"
                  onClick={() => handleUserSelect(user)}
                >
                  {user.image && (
                    <Image
                      src={user.image}
                      alt={user.name || ''}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full border-2 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {user.name || 'No name'}
                    </p>
                    {user.email && (
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {teamMembers.length > 0 && (
        <div className="space-y-4">
          {tabsCount > 1 && (
            <div className="flex items-center gap-2">
              <Select value={activeTab.toString()} onValueChange={(v) => setActiveTab(Number(v))}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: tabsCount }).map((_, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      Tab {index + 1} (Members {index * membersPerTab + 1}-{Math.min((index + 1) * membersPerTab, teamMembers.length)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {currentTabMembers.map((member: any, index: number) => {
              const globalIndex = activeTab * membersPerTab + index;
              return (
                <div key={member.userId || index} className="relative p-4 border rounded-lg space-y-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => handleRemoveMember(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {member.image ? (
                    <Image
                      src={member.image}
                      alt={member.name || 'Team member'}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full mx-auto border-2"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full mx-auto border-2 bg-muted flex items-center justify-center">
                      <span className="text-2xl">?</span>
                    </div>
                  )}
                  <p className="text-center text-sm font-medium truncate">
                    {member.name || 'Unknown'}
                  </p>
                  <FormField
                    control={form.control}
                    name={`settings.featureSettings.team.members.${globalIndex}.role`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Role Override (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Override role (e.g., Owner, Admin, Moderator)"
                            className="text-center text-xs"
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Leave empty to use user&apos;s highest role from the website
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`settings.featureSettings.team.members.${globalIndex}.roleColor`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Role Color (Hex)</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="#000000"
                              className="text-center text-xs font-mono"
                              maxLength={7}
                            />
                          </FormControl>
                          <input
                            type="color"
                            value={field.value && /^#[0-9A-F]{6}$/i.test(field.value) ? field.value : '#000000'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-8 h-8 p-0 border rounded cursor-pointer"
                            title="Pick role color"
                          />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {teamMembers.length === 0 && (
        <p className="text-sm text-muted-foreground">No team members added yet. Search and add users above.</p>
      )}
    </div>
  );
}

export function PageThemeSettings() {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pages, setPages] = useState<PageTheme[]>([]);
  const [selectedPageTheme, setSelectedPageTheme] = useState<PageTheme | null>(null);

  const form = useForm<z.input<typeof pageThemeSchema>, any, PageThemeFormValues>({
    resolver: zodResolver(pageThemeSchema),
    defaultValues: getDefaultFormValues(),
  });

  const newPageForm = useForm<z.input<typeof newPageSchema>, any, NewPageFormValues>({
    resolver: zodResolver(newPageSchema),
    defaultValues: {
      newSlug: '',
    },
  });

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      const page = pages.find(p => p.slug === selectedPage);
      if (page) {
        const defaultValues = getDefaultFormValues(selectedPage);
        
        let parsedSettings = {};
        try {
          parsedSettings = typeof page.settings === 'string' 
            ? JSON.parse(page.settings) 
            : page.settings;
        } catch (e) {
          console.error('Error parsing page settings:', e);
        }
        
        const savedPageSettings = (parsedSettings as any)[selectedPage] || {};
        
        const mergedSettings = {
          ...defaultValues.settings,
          ...(parsedSettings as any),
          [selectedPage]: {
            ...((defaultValues.settings as any)[selectedPage] || {}),
            ...savedPageSettings
          }
        };
        
        setSelectedPageTheme(page);
        form.reset({
          slug: page.slug,
          enabled: page.enabled ?? true,
          settings: mergedSettings,
        });
      }
    }
  }, [selectedPage, pages, form]);

  const fetchPages = async () => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(backendApi('admin/theme/page'), { credentials: 'include', headers });
      if (!response.ok) throw new Error('Failed to fetch pages');
      const data = await response.json();
      setPages(data);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Failed to load pages');
    }
  };

  const onCreateNewPage = async (data: NewPageFormValues) => {
    try {
      setIsSubmitting(true);
      const headers = await prepareSanctumMutationHeaders({
        json: true,
        bearerToken: getAuthToken(),
      });
      const response = await fetch(backendApi('admin/theme/page'), {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          slug: data.newSlug,
          settings: {
            layout: DEFAULT_PAGE_THEMES.layout,
            header: DEFAULT_PAGE_THEMES.header,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to create page');
      
      await fetchPages();
      setIsCreateDialogOpen(false);
      toast.success('Page created successfully');
    } catch (error) {
      console.error('Error creating page:', error);
      toast.error('Failed to create page');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: PageThemeFormValues) => {
    try {
      setIsSubmitting(true);
      
      if (!selectedPage) {
        throw new Error('No page selected');
      }
      
      const pageSpecificSettings = data.settings[selectedPage as keyof typeof data.settings];
      const globalFeatures = data.settings.features;
      const globalFeatureSettings = data.settings.featureSettings;
      
      const settingsToSave = {
        layout: data.settings.layout,
        header: data.settings.header,
        [selectedPage]: pageSpecificSettings,
        ...(globalFeatures ? { features: globalFeatures } : {}),
        ...(globalFeatureSettings ? { featureSettings: globalFeatureSettings } : {}),
      };
            
      const headers = await prepareSanctumMutationHeaders({
        json: true,
        bearerToken: getAuthToken(),
      });
      const response = await fetch(backendApi('admin/theme/page'), {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ 
          slug: data.slug, 
          enabled: data.enabled,
          settings: settingsToSave
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to update page';
        try {
          const errorText = await response.text();
          errorMsg = errorText || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      
      const result = await response.json();      
      await fetchPages();
      toast.success('Page updated successfully');
    } catch (error: any) {
      console.error('Error updating page:', error);
      toast.error(error?.message || 'Failed to update page');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async () => {
    try {
      setIsSubmitting(true);
      const headers = await prepareSanctumMutationHeaders({
        bearerToken: getAuthToken(),
      });
      const response = await fetch(backendApi(`admin/theme/page?slug=${selectedPage}`), {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });

      if (!response.ok) throw new Error('Failed to delete page');
      
      await fetchPages();
      setSelectedPage(null);
      setIsDeleteDialogOpen(false);
      toast.success('Page deleted successfully');
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetToDefaults = () => {
    if (!selectedPage) return;

    try {
      const defaultValues = getDefaultFormValues(selectedPage);
      
      form.reset({
        slug: selectedPage,
        enabled: true,
        settings: {
          ...defaultValues.settings,
          [selectedPage]: (defaultValues.settings as any)[selectedPage] || {}
        }
      });
      
      toast.success('Theme reset to default values');
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      toast.error('Failed to reset to defaults');
    }
  };

  return (
    <div className="flex">
      <div className="w-1/4 pr-4">
        <Tabs orientation="vertical" value={selectedPage || undefined} onValueChange={setSelectedPage}>
          <TabsList className="flex flex-col h-full">
            {pages?.map((page) => (
              <TabsTrigger
                key={page.slug}
                value={page.slug}
                className="capitalize w-full"
              >
                {page.slug}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create New Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Page</DialogTitle>
            </DialogHeader>
            <Form {...newPageForm}>
              <form onSubmit={newPageForm.handleSubmit(onCreateNewPage)} className="space-y-4">
                <FormField
                  control={newPageForm.control}
                  name="newSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Page Slug</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter new page slug" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="flex-1">
        {selectedPage && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center space-x-2">
                      <FormLabel>Slug</FormLabel>
                      <Popover>
                        <PopoverTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3 text-muted-foreground text-sm">
                          The unique identifier for this page in the URL.
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Page Enabled</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Enable or disable this page. When disabled, the page will not be accessible to users.
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {selectedPage === 'home' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Feature Toggles</h3>
                    <FormField
                      control={form.control}
                      name="settings.features.showJoinCommunity"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Join Community Section</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Show or hide the Join Community section on the home page
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.features.showServerRules"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Server Rules Section</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Show or hide the Server Rules section on the home page
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.features.showServers"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Servers Section</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Show or hide the Servers section on the home page
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.features.showTeam"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Team Section</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Show or hide the Team section on the home page
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch("settings.features.showServerRules") && (
                      <div className="space-y-4 mt-4">
                        <h3 className="text-lg font-medium">Server Rules</h3>
                        <div className="space-y-4">
                          {form.watch("settings.featureSettings.serverRules.rules")?.map((_, index) => (
                            <div key={index} className="space-y-4 p-4 border rounded-lg">
                              <FormField
                                control={form.control}
                                name={`settings.featureSettings.serverRules.rules.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Rule Title</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`settings.featureSettings.serverRules.rules.${index}.content`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Rule Content</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                  const currentRules = form.getValues("settings.featureSettings.serverRules.rules") ?? [];
                                  form.setValue(
                                    "settings.featureSettings.serverRules.rules",
                                    currentRules.filter((_, i) => i !== index)
                                  );
                                }}
                              >
                                Remove Rule
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const rules = form.getValues("settings.featureSettings.serverRules.rules") || [];
                              form.setValue("settings.featureSettings.serverRules.rules", [
                                ...rules,
                                { title: "New Rule", content: "Rule content goes here" }
                              ]);
                            }}
                          >
                            Add Rule
                          </Button>
                        </div>
                      </div>
                    )}
                    {form.watch("settings.features.showTeam") && (
                      <TeamSection form={form} />
                    )}
                    <HomeAppearanceFields form={form} />
                  </div>
                </div>
              )}
              
              {selectedPage === 'leaderboard' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Leaderboard Theme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.pageBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Leaderboard Page Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Leaderboard Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.tabActiveBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Active Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.tabInactiveBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Inactive Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.tabActiveText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Active Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.tabInactiveText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Inactive Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.tableHeaderBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Header Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.tableHeaderText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Header Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.tableRowBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Row Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.tableRowText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Row Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.searchBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.searchText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.playerCountBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Player Count Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.playerCountText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Player Count Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.titleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.subtitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Subtitle Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.leaderboard.blurIntensity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blur Intensity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="1" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || 0.5}
                            />
                          </FormControl>
                          <FormDescription>
                            Controls the intensity of the backdrop blur effect (0-1)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {selectedPage === 'servers' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Server Theme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="settings.servers.backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.cardBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Server Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.titleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Server Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.subtitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Server Subtitle Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.categoryTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.statusOnlineColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Online Status Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.statusOfflineColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Offline Status Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.wipeTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Wipe Information Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.progressBarBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Progress Bar Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.progressBarForeground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Progress Bar Foreground" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.progressBarTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Progress Bar Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.playerCountBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Player Count Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.playerCountTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Player Count Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.buttonPrimaryBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.buttonPrimaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.buttonPrimaryHoverBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.buttonSecondaryBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.buttonSecondaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.buttonSecondaryBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.buttonSecondaryHoverBg"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.buttonBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 0.375rem" />
                          </FormControl>
                          <FormDescription>
                            Border radius for buttons (e.g., 0.375rem, 6px)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.rankBadgeBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Rank Badge Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.rankBadgeTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Rank Badge Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.serverImageOverlay"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Server Image Overlay" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.cardBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.75rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.cardShadow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Shadow</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0 4px 6px rgba(0, 0, 0, 0.3)" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.cardHoverEffect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Hover Effect</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hover effect" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="lift">Lift</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                                <SelectItem value="glow">Glow</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.categoryTitleSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Title Size</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1.5rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.spacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Element Spacing</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.servers.cardPadding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Padding</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {selectedPage === 'store' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Store Theme</h3>
                  <FormField
                    control={form.control}
                    name="settings.store.layoutPreset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Layout Preset</FormLabel>
                        <FormControl>
                          <Select value={field.value ?? 'default'} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select layout preset" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default (Sidebar Right)</SelectItem>
                              <SelectItem value="tabs-left">Tabs Left (Categories on Left)</SelectItem>
                              <SelectItem value="all-packs">All Packs (Single Page)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Choose the layout structure for the store page. Default shows sidebar on the right, Tabs Left shows categories as tabs on the left side, All Packs shows all products in a single page layout.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="settings.store.backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.titleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.subtitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Subtitle Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.kickerColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Kicker Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.titleAccentColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Title Accent Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.kickerLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kicker Label</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="OFFICIAL STORE / MAGIC RUST" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.pageTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="GEAR UP." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.pageTitleAccent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Title Accent</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="STAND OUT." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.pageSubtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Subtitle</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Secure your edge with server ranks and exclusive cosmetics." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.helpTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Help Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Need help with a purchase?" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.helpBody"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Help Body</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Our support team is available around the clock for account and payment assistance." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.helpCta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Help CTA</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="OPEN SUPPORT →" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.perksNote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Perks Note</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ranks activate automatically after a completed purchase." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.tabActiveBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Active Tab Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.saleTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Sale Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.categoryCardBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.categoryCardBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.categoryCardHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.categoryCardTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.categoryCardHoverTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Hover Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Product Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Product Card Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Product Card Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Product Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardDescriptionColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Product Description Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardPriceColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Product Price Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardOriginalPriceColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Original Price Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardDiscountBadgeBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Discount Badge Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.productCardDiscountBadgeText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Discount Badge Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.sidebarBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Sidebar Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.sidebarBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Sidebar Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.sidebarTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Sidebar Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.sidebarTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Sidebar Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.buttonPrimaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.buttonPrimaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.buttonPrimaryHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Hover" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.buttonSecondaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.buttonSecondaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.buttonSecondaryBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.buttonSecondaryHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.buttonBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="8px" />
                          </FormControl>
                          <FormDescription>
                            Border radius for buttons (e.g., 8px, 0.5rem)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.inputBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.inputBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.inputText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.loadingSpinnerColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Loading Spinner Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.errorTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Error Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.successTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Success Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.blurIntensity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blur Intensity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="1" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || 0.5}
                            />
                          </FormControl>
                          <FormDescription>
                            Controls the intensity of the backdrop blur effect (0-1)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.cardBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.5rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.cardPadding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Padding</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.spacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Element Spacing</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.store.cardHoverEffect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Hover Effect</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hover effect" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="lift">Lift</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                                <SelectItem value="glow">Glow</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {selectedPage === 'support' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Support Theme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="settings.support.backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.titleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.subtitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Subtitle Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.kickerColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Kicker Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.kickerLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kicker Label</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="FAST AND EASY" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.pageTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="SUPPORT TICKETS" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.pageSubtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Subtitle</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Choose one of the following options below that best suits you." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.categoryCardBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.categoryCardBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.categoryCardHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.categoryCardTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.categoryCardIconColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Icon Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.categoryCardLockColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Lock Icon Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.categoryCardBodyColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Body Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.categoryCardMetaColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Card Meta Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.openTicketLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Open Ticket Label</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Open ticket" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.buttonPrimaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.buttonPrimaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.buttonPrimaryHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Hover" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.buttonSecondaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.buttonSecondaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.buttonSecondaryBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.formBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Form Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.formBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Form Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.inputBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.inputBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.inputText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.inputPlaceholder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Placeholder Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.inputFocusBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Focus Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.labelColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Form Label Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.errorTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Error Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.successTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Success Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.warningTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Warning Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.helpTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Help Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.loadingSpinnerColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Loading Spinner Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.banMessageBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Ban Message Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.banMessageBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Ban Message Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.banMessageTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Ban Message Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.breadcrumbTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Breadcrumb Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.breadcrumbActiveColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Breadcrumb Active Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.blurIntensity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blur Intensity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="1" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value ?? 0}
                            />
                          </FormControl>
                          <FormDescription>
                            Controls the intensity of the backdrop blur effect (0-1)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.cardBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.5rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.cardPadding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Padding</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.spacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Element Spacing</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.support.cardHoverEffect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Hover Effect</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hover effect" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="lift">Lift</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                                <SelectItem value="glow">Glow</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {selectedPage === 'maps' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Maps Theme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="settings.maps.backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.titleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.subtitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Subtitle Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.searchInputBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Input Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.searchInputBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Input Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.searchInputText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Input Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.searchInputPlaceholder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Input Placeholder" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.searchInputFocusBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Input Focus Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.sectionTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Section Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.sectionTitleSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section Title Size</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1.125rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardServerNameColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Server Name Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardStatusTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Status Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardStatusActiveColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Status Active Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardStatusInactiveColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Status Inactive Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardStatusUpcomingColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Status Upcoming Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardVoteCountBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Vote Count Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardVoteCountText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Vote Count Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardBadgeActiveBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Badge Active Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardBadgeActiveText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Badge Active Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardBadgeSecondaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Badge Secondary Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.mapCardBadgeSecondaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Map Card Badge Secondary Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.buttonPrimaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.buttonPrimaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.buttonPrimaryHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Hover" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.buttonSecondaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.buttonSecondaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.buttonSecondaryBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.buttonBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.375rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.loadingSpinnerColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Loading Spinner Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.loadingSkeletonBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Loading Skeleton Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.errorTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Error Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.errorBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Error Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.errorBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Error Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.blurIntensity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blur Intensity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="1" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || 0.5}
                            />
                          </FormControl>
                          <FormDescription>
                            Controls the intensity of the backdrop blur effect (0-1)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.cardBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.5rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.cardPadding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Padding</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.cardShadow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Shadow</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0 4px 6px rgba(0, 0, 0, 0.1)" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.spacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Element Spacing</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.maps.cardHoverEffect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Hover Effect</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hover effect" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="lift">Lift</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                                <SelectItem value="glow">Glow</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {selectedPage === 'profile' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Profile Theme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="settings.profile.backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.headerCardBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Header Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.headerCardBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Header Card Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.avatarBorderColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Avatar Border Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.userNameColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="User Name Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.userIdColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="User ID Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.roleBadgeBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Role Badge Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.roleBadgeBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Role Badge Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.roleBadgeText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Role Badge Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tabsBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tabs Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tabsBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tabs Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tabActiveBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Active Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tabActiveText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Active Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tabInactiveBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Inactive Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tabInactiveText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Inactive Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tabHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Tab Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.contentCardBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Content Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.contentCardBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Content Card Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.contentCardTitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Content Card Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.contentCardDescriptionColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Content Card Description Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.connectedAccountSteamBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Steam Account Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.connectedAccountDiscordBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Discord Account Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.connectedAccountIconColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Connected Account Icon Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.connectedAccountTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Connected Account Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.connectedAccountStageColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Connected Account Stage Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonPrimaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonPrimaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonPrimaryHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Hover" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonSecondaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonSecondaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonSecondaryBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonSuccessBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Success Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonSuccessText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Success Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonDestructiveBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Destructive Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonDestructiveText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Destructive Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.buttonBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.375rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.copyButtonBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Copy Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.copyButtonText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Copy Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.copyButtonHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Copy Button Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tableHeaderBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Header Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tableHeaderText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Header Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tableRowBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Row Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tableRowText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Row Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.tableRowHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Table Row Hover Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.statusActiveColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Status Active Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.statusInactiveColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Status Inactive Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.statusPendingColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Status Pending Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.linkColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Link Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.linkHoverColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Link Hover Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.blurIntensity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blur Intensity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="1" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              value={field.value || 0.5}
                            />
                          </FormControl>
                          <FormDescription>
                            Controls the intensity of the backdrop blur effect (0-1)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.cardBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.5rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.cardPadding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Padding</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1.5rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.cardShadow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Shadow</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0 4px 6px rgba(0, 0, 0, 0.1)" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.spacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Element Spacing</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.profile.cardHoverEffect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Hover Effect</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hover effect" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="lift">Lift</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                                <SelectItem value="glow">Glow</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              {selectedPage === 'bans' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Bans Theme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="settings.bans.backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Page Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.titleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Title Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.subtitleColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Subtitle Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.cardBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Card Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.cardBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Card Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.cardBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.75rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.cardShadow"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Shadow</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0 4px 6px rgba(0, 0, 0, 0.3)" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.buttonPrimaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.buttonPrimaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.buttonPrimaryHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Button Hover" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.buttonSecondaryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.buttonSecondaryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.buttonSecondaryBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.buttonSecondaryHoverBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Button Hover" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.buttonBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.375rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeActiveBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Active Badge Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeActiveText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Active Badge Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeInactiveBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Inactive Badge Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeInactiveText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Inactive Badge Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeGlobalBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Global Badge Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeGlobalText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Global Badge Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeCategoryBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Badge Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeCategoryText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Category Badge Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeIndividualBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Individual Badge Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.badgeIndividualText"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Individual Badge Text" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.textPrimaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Primary Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.textSecondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Secondary Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.textMutedColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Muted Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.inputBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.inputBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.inputTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Text Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.inputPlaceholderColor"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Input Placeholder Color" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.inputBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Input Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.375rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.searchBackground"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Background" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.searchBorder"
                      render={({ field }) => (
                        <FormItem>
                          <ColorInputRow label="Search Border" value={field.value || ''} onChange={field.onChange} />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.searchBorderRadius"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Search Border Radius</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.375rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.spacing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spacing</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.cardPadding"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Padding</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="1rem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="settings.bans.cardHoverEffect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Hover Effect</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select hover effect" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="lift">Lift</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              <Button type="submit" disabled={isSubmitting} className='mr-4'>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                disabled={isSubmitting} 
                onClick={onResetToDefaults}
                className='mr-4'
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={isSubmitting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Page
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      page theme settings for &quot;{selectedPage}&quot;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          </Form>
        )}
      </div>
    </div>
  );
} 