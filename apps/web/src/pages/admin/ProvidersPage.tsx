import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminNoIndex } from "../../components/admin/AdminNoIndex";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { ConfirmButton } from "../../components/admin/ConfirmDialog";
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "../../components/admin/DataTable";
import { EmptyState } from "../../components/admin/EmptyState";
import { FormError } from "../../components/admin/FormError";
import { LoadingState } from "../../components/admin/LoadingState";
import { SecretFieldNotice } from "../../components/admin/SecretFieldNotice";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { Button } from "../../components/ui/button";
import { adminApi } from "../../lib/adminApi";
import type { AdminProvider, ProviderInput } from "../../lib/adminApi";

const providerSchema = z.object({
  api_key: z.string().optional().default(""),
  base_url: z.string().min(1, "Base URL wajib diisi.").url("Format URL tidak valid (harus http atau https)."),
  daily_limit: z.coerce.number().int().min(1).max(1_000_000),
  is_active: z.boolean(),
  name: z.string().min(1, "Name wajib diisi.").max(100),
  platform_slug: z.string().trim().min(1, "Pilih platform terlebih dahulu.").max(50),
  priority: z.coerce.number().int().min(1).max(100),
  slug: z.string().trim().min(1, "Slug wajib diisi.").max(50)
});

type ProviderForm = z.infer<typeof providerSchema>;

const emptyProviderForm: ProviderForm = {
  api_key: "",
  base_url: "",
  daily_limit: 1000,
  is_active: false,
  name: "",
  platform_slug: "",
  priority: 1,
  slug: ""
};

function providerToForm(provider: AdminProvider): ProviderForm {
  return {
    api_key: "",
    base_url: provider.base_url,
    daily_limit: provider.daily_limit,
    is_active: provider.is_active,
    name: provider.name,
    platform_slug: provider.platform_slug,
    priority: provider.priority,
    slug: provider.slug
  };
}

function formToPayload(values: ProviderForm, includeEmptyApiKey: boolean): ProviderInput {
  const trimmedKey = values.api_key.trim();
  return {
    base_url: values.base_url.trim(),
    daily_limit: values.daily_limit,
    ...(trimmedKey.length > 0 || includeEmptyApiKey ? { api_key: trimmedKey.length > 0 ? trimmedKey : null } : {}),
    is_active: values.is_active,
    name: values.name.trim(),
    platform_slug: values.platform_slug.trim(),
    priority: values.priority,
    slug: values.slug.trim()
  };
}

export function ProvidersPage() {
  const [editingProvider, setEditingProvider] = useState<AdminProvider | null>(null);
  const queryClient = useQueryClient();
  const providers = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: adminApi.listProviders
  });
  const platforms = useQuery({
    queryKey: ["admin", "platforms"],
    queryFn: adminApi.listPlatforms
  });
  const platformList = platforms.data?.platforms ?? [];
  const form = useForm<ProviderForm>({
    resolver: zodResolver(providerSchema),
    defaultValues: emptyProviderForm
  });
  const saveProvider = useMutation({
    mutationFn: (values: ProviderForm) =>
      editingProvider
        ? adminApi.updateProvider(editingProvider.id, formToPayload(values, false))
        : adminApi.createProvider(formToPayload(values, true)),
    async onSuccess() {
      setEditingProvider(null);
      form.reset(emptyProviderForm);
      await queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });
  const deleteProvider = useMutation({
    mutationFn: adminApi.deleteProvider,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  if (providers.isLoading) {
    return <LoadingState />;
  }

  const providerRows = providers.data?.providers ?? [];

  return (
    <section>
      <AdminNoIndex title="Providers" />
      <AdminPageHeader
        title="Providers"
        description="Kelola provider downloader API untuk mode Public API (open/keyless) maupun Private API (terautentikasi / encrypted API key)."
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form
          className="grid gap-3 rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm"
          onSubmit={form.handleSubmit((values) => saveProvider.mutate(values))}
        >
          <h2 className="text-lg font-semibold text-foreground">
            {editingProvider ? `Edit ${editingProvider.slug}` : "Create provider"}
          </h2>
          <SecretFieldNotice />
          {saveProvider.error ? <FormError error={saveProvider.error} /> : null}
          <TextInput form={form} name="name" label="Name" />
          <TextInput form={form} name="slug" label="Slug" />
          <div className="grid gap-1 text-sm font-medium text-foreground">
            <label htmlFor="platform_slug">Platform Slug</label>
            {platformList.length > 0 ? (
              <select
                id="platform_slug"
                className="h-11 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary"
                {...form.register("platform_slug")}
              >
                <option value="">-- Pilih Platform --</option>
                <option value="all">Semua Platform (All Sosmed / Universal Provider)</option>
                {platformList
                  .filter((platform) => platform.slug !== "all")
                  .map((platform) => (
                    <option key={platform.id} value={platform.slug}>
                      {platform.name} ({platform.slug})
                    </option>
                  ))}
              </select>
            ) : (
              <input
                id="platform_slug"
                type="text"
                placeholder="cth: tiktok"
                className="h-11 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary"
                {...form.register("platform_slug")}
              />
            )}
            {form.formState.errors.platform_slug ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                {String(form.formState.errors.platform_slug.message)}
              </span>
            ) : null}
          </div>
          <div>
            <TextInput form={form} name="base_url" label="Base URL" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Contoh: <code>https://api.jerexd.my.id/api/downloader/aiov2</code> (Universal Sosmed), <code>https://api.kyzzz.xyz</code>, atau REST downloader endpoint lainnya.
            </p>
          </div>
          <div>
            <TextInput form={form} name="api_key" label="API Key" type="password" />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Opsional. Kosongkan jika provider menggunakan Public API (keyless/open). Isi jika menggunakan Private API.
            </p>
          </div>
          <TextInput form={form} name="priority" label="Priority" type="number" />
          <TextInput form={form} name="daily_limit" label="Daily Limit" type="number" />
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground">
            <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
            Active
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={saveProvider.isPending}>
              {editingProvider ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {editingProvider ? "Save provider" : "Create provider"}
            </Button>
            {editingProvider ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingProvider(null);
                  form.reset(emptyProviderForm);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
        <div>
          {providers.error ? <FormError error={providers.error} /> : null}
          {providerRows.length ? (
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeader>Provider</DataTableHeader>
                  <DataTableHeader>Platform</DataTableHeader>
                  <DataTableHeader>Key</DataTableHeader>
                  <DataTableHeader>Status</DataTableHeader>
                  <DataTableHeader>Daily</DataTableHeader>
                  <DataTableHeader>Actions</DataTableHeader>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {providerRows.map((provider) => (
                  <tr key={provider.id}>
                    <DataTableCell>
                      <div className="font-semibold text-foreground">{provider.name}</div>
                      <div className="text-xs text-muted-foreground">{provider.slug}</div>
                    </DataTableCell>
                    <DataTableCell>{provider.platform_slug}</DataTableCell>
                    <DataTableCell>
                      {provider.has_api_key ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-purple-600 dark:text-purple-400">Configured</span>
                          <span className="text-[10px] text-muted-foreground">Private API</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium text-muted-foreground">Empty</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Public API</span>
                        </div>
                      )}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge value={provider.is_active ? "active" : "inactive"} />
                    </DataTableCell>
                    <DataTableCell>
                      {provider.daily_used}/{provider.daily_limit}
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          onClick={() => {
                            setEditingProvider(provider);
                            form.reset(providerToForm(provider));
                          }}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Disable"
                          message="Disable this provider?"
                          disabled={deleteProvider.isPending}
                          onConfirm={() => deleteProvider.mutate(provider.id)}
                        />
                      </div>
                    </DataTableCell>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <EmptyState label="No providers found." />
          )}
        </div>
      </div>
    </section>
  );
}

function TextInput({
  form,
  label,
  name,
  type = "text"
}: {
  form: ReturnType<typeof useForm<ProviderForm>>;
  label: string;
  name: keyof ProviderForm;
  type?: "number" | "password" | "text";
}) {
  const error = form.formState.errors[name]?.message;

  return (
    <label className="grid gap-1 text-sm font-medium text-foreground">
      {label}
      <input
        type={type}
        className="h-11 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary"
        {...form.register(name, type === "number" ? { valueAsNumber: true } : undefined)}
      />
      {error ? <span className="text-xs text-red-600 dark:text-red-400">{String(error)}</span> : null}
    </label>
  );
}
