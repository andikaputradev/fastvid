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
import { StatusBadge } from "../../components/admin/StatusBadge";
import { Button } from "../../components/ui/button";
import { adminApi } from "../../lib/adminApi";
import type { AdminPlatform, PlatformInput, PlatformStatus } from "../../lib/adminApi";

const platformSchema = z.object({
  allowed_url_patterns: z.string(),
  base_domains: z.string().min(1, "At least one domain is required."),
  blocked_url_patterns: z.string(),
  description: z.string(),
  icon_url: z.string().url().or(z.literal("")),
  is_active: z.boolean(),
  max_requests_per_minute: z.coerce.number().int().min(1).max(600),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  status: z.enum(["active", "inactive", "maintenance"])
});

type PlatformForm = z.infer<typeof platformSchema>;

const emptyPlatformForm: PlatformForm = {
  allowed_url_patterns: "",
  base_domains: "",
  blocked_url_patterns: "",
  description: "",
  icon_url: "",
  is_active: false,
  max_requests_per_minute: 10,
  name: "",
  slug: "",
  status: "inactive"
};

function listFromTextarea(value: string): string[] {
  return value
    .split(/\r?\n|,/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function nullableListFromTextarea(value: string): string[] | null {
  const list = listFromTextarea(value);
  return list.length > 0 ? list : null;
}

function formToPayload(values: PlatformForm): PlatformInput {
  return {
    allowed_url_patterns: nullableListFromTextarea(values.allowed_url_patterns),
    base_domains: listFromTextarea(values.base_domains),
    blocked_url_patterns: nullableListFromTextarea(values.blocked_url_patterns),
    description: values.description.length > 0 ? values.description : null,
    icon_url: values.icon_url.length > 0 ? values.icon_url : null,
    is_active: values.is_active,
    max_requests_per_minute: values.max_requests_per_minute,
    name: values.name,
    slug: values.slug,
    status: values.status as PlatformStatus
  };
}

function platformToForm(platform: AdminPlatform): PlatformForm {
  return {
    allowed_url_patterns: platform.allowed_url_patterns?.join("\n") ?? "",
    base_domains: platform.base_domains.join("\n"),
    blocked_url_patterns: platform.blocked_url_patterns?.join("\n") ?? "",
    description: platform.description ?? "",
    icon_url: platform.icon_url ?? "",
    is_active: platform.is_active,
    max_requests_per_minute: platform.max_requests_per_minute,
    name: platform.name,
    slug: platform.slug,
    status: platform.status
  };
}

export function PlatformsPage() {
  const [editingPlatform, setEditingPlatform] = useState<AdminPlatform | null>(null);
  const queryClient = useQueryClient();
  const platforms = useQuery({
    queryKey: ["admin", "platforms"],
    queryFn: adminApi.listPlatforms
  });
  const form = useForm<PlatformForm>({
    resolver: zodResolver(platformSchema),
    defaultValues: emptyPlatformForm
  });
  const savePlatform = useMutation({
    mutationFn: (values: PlatformForm) =>
      editingPlatform
        ? adminApi.updatePlatform(editingPlatform.id, formToPayload(values))
        : adminApi.createPlatform(formToPayload(values)),
    async onSuccess() {
      setEditingPlatform(null);
      form.reset(emptyPlatformForm);
      await queryClient.invalidateQueries({ queryKey: ["admin", "platforms"] });
    }
  });
  const deletePlatform = useMutation({
    mutationFn: adminApi.deletePlatform,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["admin", "platforms"] });
    }
  });

  if (platforms.isLoading) {
    return <LoadingState />;
  }

  const platformRows = platforms.data?.platforms ?? [];

  return (
    <section>
      <AdminNoIndex title="Platforms" />
      <AdminPageHeader title="Platforms" description="Control platform allowlists, status, and public availability." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form
          className="grid gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
          onSubmit={form.handleSubmit((values) => savePlatform.mutate(values))}
        >
          <h2 className="text-lg font-semibold text-foreground">
            {editingPlatform ? `Edit ${editingPlatform.slug}` : "Create platform"}
          </h2>
          {savePlatform.error ? <FormError error={savePlatform.error} /> : null}
          <TextInput form={form} name="name" label="Name" />
          <TextInput form={form} name="slug" label="Slug" />
          <TextareaInput form={form} name="base_domains" label="Base Domains" />
          <TextareaInput form={form} name="allowed_url_patterns" label="Allowed URL Patterns" />
          <TextareaInput form={form} name="blocked_url_patterns" label="Blocked URL Patterns" />
          <TextInput form={form} name="icon_url" label="Icon URL" />
          <TextareaInput form={form} name="description" label="Description" />
          <TextInput form={form} name="max_requests_per_minute" label="Max Requests Per Minute" type="number" />
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Status
            <select
              className="h-11 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary"
              {...form.register("status")}
            >
              <option value="inactive" className="bg-card text-foreground">inactive</option>
              <option value="active" className="bg-card text-foreground">active</option>
              <option value="maintenance" className="bg-card text-foreground">maintenance</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground">
            <input type="checkbox" className="h-4 w-4 accent-primary" {...form.register("is_active")} />
            Active
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={savePlatform.isPending}>
              {editingPlatform ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {editingPlatform ? "Save platform" : "Create platform"}
            </Button>
            {editingPlatform ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingPlatform(null);
                  form.reset(emptyPlatformForm);
                }}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
        <div>
          {platforms.error ? <FormError error={platforms.error} /> : null}
          {platformRows.length ? (
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeader>Platform</DataTableHeader>
                  <DataTableHeader>Domains</DataTableHeader>
                  <DataTableHeader>Status</DataTableHeader>
                  <DataTableHeader>Rate</DataTableHeader>
                  <DataTableHeader>Actions</DataTableHeader>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {platformRows.map((platform) => (
                  <tr key={platform.id}>
                    <DataTableCell>
                      <div className="font-semibold text-foreground">{platform.name}</div>
                      <div className="text-xs text-muted-foreground">{platform.slug}</div>
                    </DataTableCell>
                    <DataTableCell>{platform.base_domains.length > 0 ? platform.base_domains.join(", ") : "None"}</DataTableCell>
                    <DataTableCell>
                      <StatusBadge value={platform.status} />
                    </DataTableCell>
                    <DataTableCell>{platform.max_requests_per_minute}/min</DataTableCell>
                    <DataTableCell>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          onClick={() => {
                            setEditingPlatform(platform);
                            form.reset(platformToForm(platform));
                          }}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <ConfirmButton
                          label="Disable"
                          message="Disable this platform?"
                          disabled={deletePlatform.isPending}
                          onConfirm={() => deletePlatform.mutate(platform.id)}
                        />
                      </div>
                    </DataTableCell>
                  </tr>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <EmptyState label="No platforms found." />
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
  form: ReturnType<typeof useForm<PlatformForm>>;
  label: string;
  name: keyof PlatformForm;
  type?: "number" | "text";
}) {
  const error = form.formState.errors[name]?.message;

  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <input
        type={type}
        className="h-11 rounded-md border border-border bg-card px-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        {...form.register(name, type === "number" ? { valueAsNumber: true } : undefined)}
      />
      {error ? <span className="text-xs text-red-600 dark:text-red-400">{String(error)}</span> : null}
    </label>
  );
}

function TextareaInput({
  form,
  label,
  name
}: {
  form: ReturnType<typeof useForm<PlatformForm>>;
  label: string;
  name: keyof PlatformForm;
}) {
  const error = form.formState.errors[name]?.message;

  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <textarea
        className="min-h-20 rounded-md border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        {...form.register(name)}
      />
      {error ? <span className="text-xs text-red-600 dark:text-red-400">{String(error)}</span> : null}
    </label>
  );
}
