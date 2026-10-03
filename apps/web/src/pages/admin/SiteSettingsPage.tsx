import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminNoIndex } from "../../components/admin/AdminNoIndex";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { FormError } from "../../components/admin/FormError";
import { LoadingState } from "../../components/admin/LoadingState";
import { Button } from "../../components/ui/button";
import { adminApi } from "../../lib/adminApi";
import type { AdminSetting } from "../../lib/adminApi";

const settingsSchema = z.object({
  favicon_url: z.string().url().or(z.literal("")),
  logo_url: z.string().url().or(z.literal("")),
  maintenance_message: z.string().max(1000),
  maintenance_mode: z.boolean(),
  meta_description: z.string().min(1).max(500),
  rate_limit_public_per_minute: z.coerce.number().int().min(1).max(10000),
  site_name: z.string().min(1).max(100),
  site_status: z.enum(["active", "inactive", "maintenance"]),
  site_title: z.string().min(1).max(200),
  tagline: z.string().min(1).max(500),
  turnstile_enabled: z.boolean()
});

type SettingsForm = z.infer<typeof settingsSchema>;

const settingLabels: Record<keyof SettingsForm, string> = {
  favicon_url: "Favicon URL",
  logo_url: "Logo URL",
  maintenance_message: "Maintenance Message",
  maintenance_mode: "Maintenance Mode",
  meta_description: "Meta Description",
  rate_limit_public_per_minute: "Public Rate Limit Per Minute",
  site_name: "Site Name",
  site_status: "Site Status",
  site_title: "Site Title",
  tagline: "Tagline",
  turnstile_enabled: "Turnstile Enabled"
};

const defaultValues: SettingsForm = {
  favicon_url: "",
  logo_url: "",
  maintenance_message: "",
  maintenance_mode: false,
  meta_description: "",
  rate_limit_public_per_minute: 10,
  site_name: "FastVid",
  site_status: "active",
  site_title: "FastVid",
  tagline: "",
  turnstile_enabled: true
};

function settingsToForm(settings: AdminSetting[]): SettingsForm {
  const values = { ...defaultValues };

  for (const setting of settings) {
    if (!(setting.key in values)) {
      continue;
    }

    const key = setting.key as keyof SettingsForm;

    if (setting.value_type === "boolean") {
      values[key] = (setting.value === "true") as never;
    } else if (setting.value_type === "number") {
      const parsed = Number(setting.value);
      values[key] = (Number.isFinite(parsed) ? parsed : defaultValues[key]) as never;
    } else {
      values[key] = setting.value as never;
    }
  }

  return values;
}

export function SiteSettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminApi.listSettings
  });
  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues
  });
  const mutation = useMutation({
    mutationFn: async (values: SettingsForm) => {
      await Promise.all(
        (Object.keys(values) as Array<keyof SettingsForm>).map((key) =>
          adminApi.updateSetting(key, values[key])
        )
      );
    },
    async onSuccess() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "settings"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "status"] })
      ]);
    }
  });

  useEffect(() => {
    if (settings.data?.settings) {
      form.reset(settingsToForm(settings.data.settings));
    }
  }, [form, settings.data]);

  if (settings.isLoading) {
    return <LoadingState />;
  }

  return (
    <section>
      <AdminNoIndex title="Settings" />
      <AdminPageHeader title="Settings" description="Site metadata, maintenance, Turnstile, and public rate limit." />
      <form
        className="grid gap-4 rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        {settings.error ? <FormError error={settings.error} /> : null}
        {mutation.error ? <FormError error={mutation.error} /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <TextField form={form} name="site_name" />
          <TextField form={form} name="site_title" />
          <TextField form={form} name="meta_description" textarea />
          <TextField form={form} name="tagline" textarea />
          <TextField form={form} name="logo_url" />
          <TextField form={form} name="favicon_url" />
          <label className="grid gap-1 text-sm font-medium text-foreground">
            {settingLabels.site_status}
            <select className="h-11 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary" {...form.register("site_status")}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="maintenance">maintenance</option>
            </select>
          </label>
          <TextField form={form} name="rate_limit_public_per_minute" type="number" />
          <ToggleField form={form} name="maintenance_mode" />
          <ToggleField form={form} name="turnstile_enabled" />
          <TextField form={form} name="maintenance_message" textarea />
        </div>
        <div>
          <Button type="submit" disabled={mutation.isPending}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {mutation.isPending ? "Saving" : "Save settings"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function TextField({
  form,
  name,
  textarea = false,
  type = "text"
}: {
  form: ReturnType<typeof useForm<SettingsForm>>;
  name: keyof SettingsForm;
  textarea?: boolean;
  type?: "number" | "text";
}) {
  const error = form.formState.errors[name]?.message;
  const inputClass = "rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground";

  return (
    <label className="grid gap-1 text-sm font-medium text-foreground">
      {settingLabels[name]}
      {textarea ? (
        <textarea className={`${inputClass} min-h-24 py-2`} {...form.register(name)} />
      ) : (
        <input
          type={type}
          className={`${inputClass} h-11`}
          {...form.register(name, type === "number" ? { valueAsNumber: true } : undefined)}
        />
      )}
      {error ? <span className="text-xs text-red-600 dark:text-red-400">{String(error)}</span> : null}
    </label>
  );
}

function ToggleField({ form, name }: { form: ReturnType<typeof useForm<SettingsForm>>; name: keyof SettingsForm }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground">
      <input type="checkbox" className="h-4 w-4" {...form.register(name)} />
      {settingLabels[name]}
    </label>
  );
}
