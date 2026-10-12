"use client";

import { UseFormReturn } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/admin/theme/color-picker";
import { HOME_THEME_FIELDS, HOME_THEME_GROUPS } from "@/lib/home-theme-defaults";

export function HomeAppearanceFields({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="space-y-8 pt-2">
      <div>
        <h3 className="text-lg font-medium">Home copy and colors</h3>
        <p className="text-sm text-muted-foreground">
          These fields are the same ones in the Site Editor on the live site.
        </p>
      </div>
      {HOME_THEME_GROUPS.filter((group) => group.id !== "visibility").map((group) => (
        <div key={group.id} className="space-y-4 rounded-lg border p-4">
          <div>
            <h4 className="font-medium">{group.label}</h4>
            <p className="text-sm text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {HOME_THEME_FIELDS.filter((field) => field.group === group.id).map((field) => (
              <FormField
                key={field.key}
                control={form.control}
                name={`settings.home.${field.key}`}
                render={({ field: f }) => (
                  <FormItem className={field.type === "textarea" ? "md:col-span-2" : undefined}>
                    {field.type === "toggle" ? (
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>{field.label}</FormLabel>
                          {field.hint ? (
                            <FormDescription>{field.hint}</FormDescription>
                          ) : null}
                        </div>
                        <FormControl>
                          <Switch className="ghost" checked={Boolean(f.value)} onCheckedChange={f.onChange} />
                        </FormControl>
                      </div>
                    ) : field.type === "color" ? (
                      <ColorPicker label={field.label} value={f.value || ""} onChange={f.onChange} />
                    ) : field.type === "textarea" ? (
                      <>
                        <FormLabel>{field.label}</FormLabel>
                        {field.hint ? <FormDescription>{field.hint}</FormDescription> : null}
                        <FormControl>
                          <Textarea rows={3} {...f} value={f.value ?? ""} />
                        </FormControl>
                      </>
                    ) : (
                      <>
                        <FormLabel>{field.label}</FormLabel>
                        {field.hint ? <FormDescription>{field.hint}</FormDescription> : null}
                        <FormControl>
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            {...f}
                            value={f.value ?? ""}
                            onChange={(e) =>
                              f.onChange(
                                field.type === "number" ? Number(e.target.value) : e.target.value,
                              )
                            }
                          />
                        </FormControl>
                      </>
                    )}
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
