import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
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
import type { BlockedPattern, RateLimitRule } from "../../lib/adminApi";

function isValidPublicDomain(value: string): boolean {
  const domain = value.trim().toLowerCase().replace(/^\.+|\.+$/gu, "");
  const labels = domain.split(".");

  return (
    domain.length > 0 &&
    domain.length <= 255 &&
    domain !== "localhost" &&
    !domain.endsWith(".localhost") &&
    !domain.endsWith(".local") &&
    !/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(domain) &&
    /^[a-z0-9.-]+$/u.test(domain) &&
    labels.length > 1 &&
    labels.every((label) => label.length > 0 && !label.startsWith("-") && !label.endsWith("-"))
  );
}

const domainSchema = z.object({
  domain: z.string().min(1).max(255).refine(isValidPublicDomain, "Enter a public domain such as example.com."),
  reason: z.string().max(1000)
});

const patternSchema = z
  .object({
    is_active: z.boolean(),
    pattern: z.string().min(1).max(2000),
    pattern_type: z.enum(["exact", "glob", "regex"]),
    reason: z.string().max(1000)
  })
  .superRefine((value, context) => {
    if (value.pattern_type !== "regex") {
      return;
    }

    try {
      new RegExp(value.pattern, "u");
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid regex pattern.",
        path: ["pattern"]
      });
    }
  });

const rateRuleSchema = z.object({
  is_active: z.boolean(),
  max_requests: z.coerce.number().int().min(1).max(100_000),
  platform_slug: z.string().max(50),
  scope: z.enum(["global", "per_ip", "per_platform"]),
  window_seconds: z.coerce.number().int().min(1).max(86_400)
});

type DomainForm = z.infer<typeof domainSchema>;
type PatternForm = z.infer<typeof patternSchema>;
type RateRuleFormValues = z.infer<typeof rateRuleSchema>;

export function SecurityPage() {
  const queryClient = useQueryClient();
  const blockedDomains = useQuery({
    queryKey: ["admin", "blocked-domains"],
    queryFn: adminApi.listBlockedDomains
  });
  const blockedPatterns = useQuery({
    queryKey: ["admin", "blocked-patterns"],
    queryFn: adminApi.listBlockedPatterns
  });
  const rateRules = useQuery({
    queryKey: ["admin", "rate-rules"],
    queryFn: adminApi.listRateRules
  });
  const domainForm = useForm<DomainForm>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: "", reason: "" }
  });
  const patternForm = useForm<PatternForm>({
    resolver: zodResolver(patternSchema),
    defaultValues: { is_active: true, pattern: "", pattern_type: "regex", reason: "" }
  });
  const createDomain = useMutation({
    mutationFn: (values: DomainForm) =>
      adminApi.createBlockedDomain({
        domain: values.domain,
        reason: values.reason.length > 0 ? values.reason : null
      }),
    async onSuccess() {
      domainForm.reset({ domain: "", reason: "" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "blocked-domains"] });
    }
  });
  const deleteDomain = useMutation({
    mutationFn: adminApi.deleteBlockedDomain,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["admin", "blocked-domains"] });
    }
  });
  const createPattern = useMutation({
    mutationFn: (values: PatternForm) =>
      adminApi.createBlockedPattern({
        is_active: values.is_active,
        pattern: values.pattern,
        pattern_type: values.pattern_type,
        reason: values.reason.length > 0 ? values.reason : null
      }),
    async onSuccess() {
      patternForm.reset({ is_active: true, pattern: "", pattern_type: "regex", reason: "" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "blocked-patterns"] });
    }
  });
  const deletePattern = useMutation({
    mutationFn: adminApi.deleteBlockedPattern,
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["admin", "blocked-patterns"] });
    }
  });

  if (blockedDomains.isLoading || blockedPatterns.isLoading || rateRules.isLoading) {
    return <LoadingState />;
  }

  const domainRows = blockedDomains.data?.blocked_domains ?? [];
  const patternRows = blockedPatterns.data?.url_patterns ?? [];
  const rateRuleRows = rateRules.data?.rate_rules ?? [];

  return (
    <section>
      <AdminNoIndex title="Security" />
      <AdminPageHeader title="Security" description="Manage blocklists and rate-limit rule values." />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Blocked Domains</h2>
          <form
            className="mt-3 grid gap-3"
            onSubmit={domainForm.handleSubmit((values) => createDomain.mutate(values))}
          >
            {createDomain.error ? <FormError error={createDomain.error} /> : null}
            <input
              placeholder="example.com"
              className="h-11 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
              {...domainForm.register("domain")}
            />
            <FieldError message={domainForm.formState.errors.domain?.message} />
            <input
              placeholder="Reason"
              className="h-11 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
              {...domainForm.register("reason")}
            />
            <FieldError message={domainForm.formState.errors.reason?.message} />
            <Button type="submit" disabled={createDomain.isPending}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add domain
            </Button>
          </form>
          <div className="mt-4">
            {domainRows.length ? (
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeader>Domain</DataTableHeader>
                    <DataTableHeader>Reason</DataTableHeader>
                    <DataTableHeader>Actions</DataTableHeader>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {domainRows.map((domain) => (
                    <tr key={domain.id}>
                      <DataTableCell>{domain.domain}</DataTableCell>
                      <DataTableCell>{domain.reason ?? ""}</DataTableCell>
                      <DataTableCell>
                        <ConfirmButton
                          label="Delete"
                          message="Delete blocked domain?"
                          disabled={deleteDomain.isPending}
                          onConfirm={() => deleteDomain.mutate(domain.id)}
                        />
                      </DataTableCell>
                    </tr>
                  ))}
                </DataTableBody>
              </DataTable>
            ) : (
              <EmptyState label="No blocked domains." />
            )}
          </div>
        </section>
        <section className="rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Blocked URL Patterns</h2>
          <form
            className="mt-3 grid gap-3"
            onSubmit={patternForm.handleSubmit((values) => createPattern.mutate(values))}
          >
            {createPattern.error ? <FormError error={createPattern.error} /> : null}
            <input
              placeholder="Pattern"
              className="h-11 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
              {...patternForm.register("pattern")}
            />
            <FieldError message={patternForm.formState.errors.pattern?.message} />
            <select className="h-11 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary" {...patternForm.register("pattern_type")}>
              <option value="regex">regex</option>
              <option value="glob">glob</option>
              <option value="exact">exact</option>
            </select>
            <input
              placeholder="Reason"
              className="h-11 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
              {...patternForm.register("reason")}
            />
            <FieldError message={patternForm.formState.errors.reason?.message} />
            <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground">
              <input type="checkbox" className="h-4 w-4" {...patternForm.register("is_active")} />
              Active
            </label>
            <Button type="submit" disabled={createPattern.isPending}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add pattern
            </Button>
          </form>
          <div className="mt-4">
            {patternRows.length ? (
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeader>Pattern</DataTableHeader>
                    <DataTableHeader>Type</DataTableHeader>
                    <DataTableHeader>Status</DataTableHeader>
                    <DataTableHeader>Actions</DataTableHeader>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {patternRows.map((pattern) => (
                    <PatternRow
                      key={pattern.id}
                      pattern={pattern}
                      disabled={deletePattern.isPending}
                      onDelete={() => deletePattern.mutate(pattern.id)}
                    />
                  ))}
                </DataTableBody>
              </DataTable>
            ) : (
              <EmptyState label="No blocked patterns." />
            )}
          </div>
        </section>
      </div>
      <section className="mt-5 rounded-md border border-border bg-card p-4 text-card-foreground shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Rate-Limit Rules</h2>
        {rateRules.error ? <FormError error={rateRules.error} /> : null}
        <div className="mt-4 grid gap-3">
          {rateRuleRows.length > 0 ? rateRuleRows.map((rule) => <RateRuleForm key={rule.id} rule={rule} />) : <EmptyState label="No rate-limit rules." />}
        </div>
      </section>
    </section>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  return message ? <span className="text-xs text-red-600 dark:text-red-400">{message}</span> : null;
}

function PatternRow({
  disabled,
  onDelete,
  pattern
}: {
  disabled: boolean;
  onDelete: () => void;
  pattern: BlockedPattern;
}) {
  return (
    <tr>
      <DataTableCell>{pattern.pattern}</DataTableCell>
      <DataTableCell>{pattern.pattern_type}</DataTableCell>
      <DataTableCell>
        <StatusBadge value={pattern.is_active ? "active" : "inactive"} />
      </DataTableCell>
      <DataTableCell>
        <ConfirmButton label="Delete" message="Delete blocked pattern?" disabled={disabled} onConfirm={onDelete} />
      </DataTableCell>
    </tr>
  );
}

function RateRuleForm({ rule }: { rule: RateLimitRule }) {
  const queryClient = useQueryClient();
  const form = useForm<RateRuleFormValues>({
    resolver: zodResolver(rateRuleSchema),
    defaultValues: {
      is_active: rule.is_active,
      max_requests: rule.max_requests,
      platform_slug: rule.platform_slug ?? "",
      scope: rule.scope,
      window_seconds: rule.window_seconds
    }
  });
  const mutation = useMutation({
    mutationFn: (values: RateRuleFormValues) =>
      adminApi.updateRateRule(rule.id, {
        is_active: values.is_active,
        max_requests: values.max_requests,
        platform_slug: values.platform_slug.length > 0 ? values.platform_slug : null,
        scope: values.scope,
        window_seconds: values.window_seconds
      }),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: ["admin", "rate-rules"] });
    }
  });

  return (
    <form
      className="grid gap-3 rounded-md border border-border bg-card p-3 text-card-foreground md:grid-cols-[1.2fr_1fr_1fr_1fr_auto] md:items-end"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      {mutation.error ? <div className="md:col-span-5"><FormError error={mutation.error} /></div> : null}
      <div>
        <div className="text-sm font-semibold text-foreground">{rule.rule_name}</div>
        <select className="mt-1 h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary" {...form.register("scope")}>
          <option value="global">global</option>
          <option value="per_ip">per_ip</option>
          <option value="per_platform">per_platform</option>
        </select>
      </div>
      <label className="grid gap-1 text-sm font-medium text-foreground">
        Platform
        <input className="h-10 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary" {...form.register("platform_slug")} />
      </label>
      <label className="grid gap-1 text-sm font-medium text-foreground">
        Max Requests
        <input
          type="number"
          className="h-10 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary"
          {...form.register("max_requests", { valueAsNumber: true })}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-foreground">
        Window Seconds
        <input
          type="number"
          className="h-10 rounded-md border border-border bg-card px-3 text-foreground outline-none focus:border-primary"
          {...form.register("window_seconds", { valueAsNumber: true })}
        />
      </label>
      <div className="flex items-center gap-2">
        <label className="flex h-10 items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
          Active
        </label>
        <Button type="submit" className="h-10 px-3" disabled={mutation.isPending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Save
        </Button>
      </div>
    </form>
  );
}
