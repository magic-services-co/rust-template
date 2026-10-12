"use client";

import { useEffect, useState } from "react";
import { ColorPicker } from "@/components/admin/theme/color-picker";
import { Input } from "@/components/ui/input";
import {
  LINKED_CONTROLS,
  TOKEN_FIELDS,
  TOKEN_GROUPS,
  applyLinkedControl,
  hexToHsl,
  hslToHex,
  linkedControlForToken,
  tokenFieldByKey,
  type LinkedControl,
  type ThemeTokenValues,
  type TokenField,
} from "@/lib/theme-token-catalog";

export function SiteEditorTokens({
  settings,
  linkedOnly,
  focusKey,
  onChange,
  onInspectToken,
}: {
  settings: ThemeTokenValues;
  linkedOnly: boolean;
  focusKey: string | null;
  onChange: (next: ThemeTokenValues) => void;
  onInspectToken?: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(LINKED_CONTROLS[0]?.id ?? "");
  const [selectedToken, setSelectedToken] = useState<string | null>(focusKey);
  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (!focusKey || !linkedOnly) return;
    const control = linkedControlForToken(focusKey);
    if (control) setSelectedId(control.id);
  }, [focusKey, linkedOnly]);

  useEffect(() => {
    if (!focusKey || linkedOnly) return;
    setSelectedToken(focusKey);
    requestAnimationFrame(() => {
      document.getElementById(`token-${focusKey}`)?.scrollIntoView({ block: "nearest" });
    });
  }, [focusKey, linkedOnly]);

  if (linkedOnly) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Change a few colors and the related ones follow. Open Detailed when you want one button state on its own.
        </p>
        {LINKED_CONTROLS.map((control) => (
          <LinkedRow
            key={control.id}
            control={control}
            settings={settings}
            open={selectedId === control.id}
            onOpen={() => setSelectedId(control.id)}
            onChange={onChange}
            onInspectToken={onInspectToken}
          />
        ))}
      </div>
    );
  }

  const groups = TOKEN_GROUPS.map((group) => ({
    group,
    fields: TOKEN_FIELDS.filter(
      (field) =>
        field.group === group &&
        (!q || field.label.toLowerCase().includes(q) || field.key.toLowerCase().includes(q) || field.group.toLowerCase().includes(q)),
    ),
  })).filter((group) => group.fields.length > 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Every color, including each button state. These apply on every page. Copy and sections stay under This page.
      </p>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search buttons, text, cards…"
        className="h-8 text-xs"
      />
      {groups.length === 0 ? <p className="text-xs text-muted-foreground">No controls match that search.</p> : null}
      {groups.map((group) => (
        <section key={group.group} className="space-y-1">
          <h3 className="px-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group.group}</h3>
          {group.fields.map((field) => (
            <TokenRow
              key={field.key}
              field={field}
              settings={settings}
              open={selectedToken === field.key}
              onOpen={() => setSelectedToken(field.key)}
              onChange={(value) => onChange({ ...settings, [field.key]: value } as ThemeTokenValues)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function LinkedRow({
  control,
  settings,
  open,
  onOpen,
  onChange,
  onInspectToken,
}: {
  control: LinkedControl;
  settings: ThemeTokenValues;
  open: boolean;
  onOpen: () => void;
  onChange: (next: ThemeTokenValues) => void;
  onInspectToken?: (key: string) => void;
}) {
  const raw = String(settings[control.lead] ?? "");
  const pickerValue = control.type === "hsl" ? hslToHex(raw) : raw;
  const names = control.targets.map((target) => tokenFieldByKey(target.key)?.label ?? target.key);

  return (
    <div className={open ? "rounded-md border border-[#ba9142] p-2" : "rounded-md border p-2"}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 text-left">
        <span className="h-9 w-9 shrink-0 rounded-md border" style={{ background: displayColor(pickerValue) }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{control.label}</span>
          <span className="block text-[11px] text-muted-foreground">{control.hint}</span>
        </span>
      </button>
      {open ? (
        <div className="mt-3 space-y-2">
          <ColorPicker
            value={pickerValue}
            onChange={(value) => {
              const stored = control.type === "hsl" && value.startsWith("#") ? hexToHsl(value) : value;
              onChange(applyLinkedControl(settings, control, stored));
            }}
          />
          <p className="text-[11px] text-muted-foreground">Also sets {names.join(", ")}.</p>
          <div className="flex flex-wrap gap-1">
            {control.targets.map((target) => (
              <button
                key={target.key}
                type="button"
                onClick={() => onInspectToken?.(target.key)}
                className="rounded-sm border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {tokenFieldByKey(target.key)?.label ?? target.key}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TokenRow({
  field,
  settings,
  open,
  onOpen,
  onChange,
}: {
  field: TokenField;
  settings: ThemeTokenValues;
  open: boolean;
  onOpen: () => void;
  onChange: (value: string | number) => void;
}) {
  const raw = settings[field.key];
  const shown = field.type === "hsl" ? hslToHex(String(raw ?? "")) : String(raw ?? "");
  const isColor = field.type === "color" || field.type === "hsl";

  return (
    <div id={`token-${field.key}`} className={open ? "rounded-md border border-[#ba9142] p-2" : "rounded-md px-1 py-1"}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 text-left">
        {isColor ? <span className="h-6 w-6 shrink-0 rounded-sm border" style={{ background: displayColor(shown) }} /> : null}
        <span className="min-w-0 flex-1 text-xs">{field.label}</span>
        {isColor ? <span className="font-mono text-[10px] text-muted-foreground">{shown}</span> : null}
      </button>
      {open ? <div className="mt-2">
        {field.type === "hsl" ? (
          <ColorPicker
            value={hslToHex(String(raw ?? ""))}
            onChange={(value) => onChange(value.startsWith("#") ? hexToHsl(value) : value)}
          />
        ) : field.type === "color" ? (
          <ColorPicker value={String(raw ?? "")} onChange={onChange} />
        ) : field.type === "number" ? (
          <Input
            type="number"
            value={typeof raw === "number" ? raw : Number(raw) || 0}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className="h-8 text-xs"
          />
        ) : (
          <Input
            value={raw == null ? "" : String(raw)}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-xs"
          />
        )}
        {field.hint ? <p className="mt-1 text-[11px] text-muted-foreground">{field.hint}</p> : null}
      </div> : null}
    </div>
  );
}

function displayColor(value: string) {
  if (value.startsWith("#") || value.startsWith("rgb") || value.startsWith("hsl")) return value;
  return "#060608";
}
