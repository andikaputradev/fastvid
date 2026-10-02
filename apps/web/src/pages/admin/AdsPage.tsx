import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, Edit, Image as ImageIcon, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AdminNoIndex } from "../../components/admin/AdminNoIndex";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader } from "../../components/admin/DataTable";
import { EmptyState } from "../../components/admin/EmptyState";
import { FormError } from "../../components/admin/FormError";
import { LoadingState } from "../../components/admin/LoadingState";
import { StatusBadge } from "../../components/admin/StatusBadge";
import { Button } from "../../components/ui/button";
import { adminApi } from "../../lib/adminApi";
import type { AdminAdSlot } from "../../lib/adminApi";
import { cn } from "../../lib/utils";

const adSchema = z
  .object({
    ad_type: z.enum(["code", "custom"]),
    provider_name: z.string().max(100),
    ad_code: z.string().max(20_000).optional(),
    image_url: z.string().max(2048).optional(),
    target_url: z.string().max(2048).optional(),
    alt_text: z.string().max(200).optional(),
    is_active: z.boolean()
  })
  .superRefine((data, ctx) => {
    if (data.ad_type === "custom") {
      const img = data.image_url?.trim() ?? "";
      const target = data.target_url?.trim() ?? "";

      if (!img.startsWith("http://") && !img.startsWith("https://")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL Gambar harus diawali http:// atau https://",
          path: ["image_url"]
        });
      }
      if (!target.startsWith("http://") && !target.startsWith("https://")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "URL Tujuan harus diawali http:// atau https://",
          path: ["target_url"]
        });
      }
    }
  });

type AdForm = z.infer<typeof adSchema>;

const emptyAdForm: AdForm = {
  ad_type: "code",
  ad_code: "",
  image_url: "",
  target_url: "",
  alt_text: "",
  is_active: false,
  provider_name: ""
};

function adToForm(ad: AdminAdSlot): AdForm {
  if (ad.ad_type === "custom" && ad.custom_ad) {
    return {
      ad_type: "custom",
      provider_name: ad.provider_name ?? "Iklan Mandiri",
      ad_code: "",
      image_url: ad.custom_ad.imageUrl,
      target_url: ad.custom_ad.targetUrl,
      alt_text: ad.custom_ad.altText,
      is_active: ad.is_active
    };
  }

  if (ad.ad_code && ad.ad_code.startsWith('{"type":"custom"')) {
    try {
      const parsed = JSON.parse(ad.ad_code) as Record<string, unknown>;
      if (typeof parsed.imageUrl === "string" && typeof parsed.targetUrl === "string") {
        return {
          ad_type: "custom",
          provider_name: ad.provider_name ?? "Iklan Mandiri",
          ad_code: "",
          image_url: parsed.imageUrl,
          target_url: parsed.targetUrl,
          alt_text: typeof parsed.altText === "string" ? parsed.altText : "",
          is_active: ad.is_active
        };
      }
    } catch {
      // Keep as code fallback
    }
  }

  return {
    ad_type: "code",
    ad_code: ad.ad_code ?? "",
    image_url: "",
    target_url: "",
    alt_text: "",
    is_active: ad.is_active,
    provider_name: ad.provider_name ?? ""
  };
}

export function AdsPage() {
  const [editingSlot, setEditingSlot] = useState<AdminAdSlot | null>(null);
  const queryClient = useQueryClient();
  const ads = useQuery({
    queryKey: ["admin", "ads"],
    queryFn: adminApi.listAds
  });
  const form = useForm<AdForm>({
    resolver: zodResolver(adSchema),
    defaultValues: emptyAdForm
  });

  const adType = form.watch("ad_type");
  const previewImageUrl = form.watch("image_url");

  const updateAd = useMutation({
    mutationFn: (values: AdForm) => {
      if (!editingSlot) {
        throw new Error("No ad slot selected.");
      }

      if (values.ad_type === "custom") {
        return adminApi.updateAdSlot(editingSlot.slot_key, {
          ad_type: "custom",
          provider_name: values.provider_name.trim().length > 0 ? values.provider_name.trim() : "Iklan Mandiri",
          image_url: values.image_url ? values.image_url.trim() : null,
          target_url: values.target_url ? values.target_url.trim() : null,
          alt_text: values.alt_text ? values.alt_text.trim() : null,
          is_active: values.is_active
        });
      }

      return adminApi.updateAdSlot(editingSlot.slot_key, {
        ad_type: "code",
        provider_name: values.provider_name.trim().length > 0 ? values.provider_name.trim() : null,
        ad_code: values.ad_code && values.ad_code.trim().length > 0 ? values.ad_code : null,
        is_active: values.is_active
      });
    },
    async onSuccess() {
      setEditingSlot(null);
      form.reset(emptyAdForm);
      await queryClient.invalidateQueries({ queryKey: ["admin", "ads"] });
    }
  });

  if (ads.isLoading) {
    return <LoadingState />;
  }

  return (
    <section>
      <AdminNoIndex title="Ads" />
      <AdminPageHeader
        title="Manajemen Iklan"
        description="Konfigurasi slot iklan. Mendukung Google Ads (Script Embed) dan Iklan Mandiri (Custom Banner)."
      />
      <div className="grid gap-5 xl:grid-cols-[440px_1fr]">
        <form
          className="grid gap-4 rounded-xl border border-border bg-white p-5 shadow-sm"
          onSubmit={form.handleSubmit((values) => updateAd.mutate(values))}
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-base font-semibold text-slate-950">
              {editingSlot ? `Edit Slot: ${editingSlot.slot_key}` : "Pilih slot iklan di tabel"}
            </h2>
            {editingSlot ? (
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 uppercase">
                {editingSlot.slot_key}
              </span>
            ) : null}
          </div>

          {updateAd.error ? <FormError error={updateAd.error} /> : null}

          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-border bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => form.setValue("ad_type", "code")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition",
                adType === "code"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              Google Ads / Script
            </button>
            <button
              type="button"
              onClick={() => form.setValue("ad_type", "custom")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition",
                adType === "custom"
                  ? "bg-white text-brand-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Iklan Mandiri (Banner)
            </button>
          </div>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Nama Provider / Sponsor
            <input
              className="h-10 rounded-md border border-border px-3 text-sm text-slate-900 outline-none focus:border-primary"
              placeholder={adType === "custom" ? "Contoh: Sponsor Toko Saya" : "Contoh: Google AdSense"}
              {...form.register("provider_name")}
            />
          </label>

          {adType === "custom" ? (
            <div className="space-y-3 rounded-lg border border-brand-100 bg-brand-50/30 p-3">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                URL Gambar Banner
                <input
                  type="url"
                  className="h-10 rounded-md border border-border px-3 text-sm text-slate-900 outline-none focus:border-primary"
                  placeholder="https://domain.com/banner-promo.png"
                  {...form.register("image_url")}
                />
                {form.formState.errors.image_url ? (
                  <span className="text-xs text-red-600">{form.formState.errors.image_url.message}</span>
                ) : null}
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                URL Tujuan (Target Link)
                <input
                  type="url"
                  className="h-10 rounded-md border border-border px-3 text-sm text-slate-900 outline-none focus:border-primary"
                  placeholder="https://toko.com/produk-diskon"
                  {...form.register("target_url")}
                />
                {form.formState.errors.target_url ? (
                  <span className="text-xs text-red-600">{form.formState.errors.target_url.message}</span>
                ) : null}
              </label>

              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Alt Text / Deskripsi Banner
                <input
                  className="h-10 rounded-md border border-border px-3 text-sm text-slate-900 outline-none focus:border-primary"
                  placeholder="Promo Diskon 50% Hosting Murah"
                  {...form.register("alt_text")}
                />
              </label>

              {previewImageUrl && previewImageUrl.startsWith("http") ? (
                <div className="mt-2 rounded-md border border-border bg-white p-2">
                  <p className="mb-1 text-[11px] font-medium text-slate-500">Preview Gambar:</p>
                  <img
                    src={previewImageUrl}
                    alt="Preview banner"
                    className="max-h-24 w-auto rounded object-contain mx-auto"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Kode Iklan (Script / HTML)
              <textarea
                className="min-h-40 rounded-md border border-border px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-primary"
                placeholder="<ins class='adsbygoogle' ...></ins>"
                {...form.register("ad_code")}
              />
            </label>
          )}

          <label className="flex min-h-10 items-center gap-3 rounded-md border border-border px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 rounded text-brand-600" {...form.register("is_active")} />
            <span>Aktifkan Slot Iklan Ini</span>
          </label>

          <Button type="submit" disabled={!editingSlot || updateAd.isPending} className="w-full">
            <Save className="h-4 w-4" aria-hidden="true" />
            {updateAd.isPending ? "Menyimpan..." : "Simpan Slot Iklan"}
          </Button>
        </form>

        <div>
          {ads.error ? <FormError error={ads.error} /> : null}
          {ads.data?.ads.length ? (
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeader>Slot</DataTableHeader>
                  <DataTableHeader>Tipe</DataTableHeader>
                  <DataTableHeader>Provider</DataTableHeader>
                  <DataTableHeader>Status</DataTableHeader>
                  <DataTableHeader>Detail Iklan</DataTableHeader>
                  <DataTableHeader>Aksi</DataTableHeader>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {ads.data.ads.map((ad) => {
                  const isCustom = ad.ad_type === "custom" || (ad.ad_code && ad.ad_code.startsWith('{"type":"custom"'));

                  return (
                    <tr key={ad.id}>
                      <DataTableCell>
                        <span className="font-semibold text-slate-900">{ad.slot_key}</span>
                      </DataTableCell>
                      <DataTableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            isCustom ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {isCustom ? "Iklan Mandiri" : "Script / Ads"}
                        </span>
                      </DataTableCell>
                      <DataTableCell>{ad.provider_name ?? "None"}</DataTableCell>
                      <DataTableCell>
                        <StatusBadge value={ad.is_active ? "active" : "inactive"} />
                      </DataTableCell>
                      <DataTableCell>
                        {isCustom && ad.custom_ad ? (
                          <div className="max-w-xs text-xs text-slate-600">
                            <p className="truncate font-medium text-slate-800">{ad.custom_ad.altText || "Custom Banner"}</p>
                            <p className="truncate text-slate-400">{ad.custom_ad.targetUrl}</p>
                          </div>
                        ) : (
                          <pre className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-slate-500">
                            {ad.ad_code ?? ""}
                          </pre>
                        )}
                      </DataTableCell>
                      <DataTableCell>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-8 px-3 text-xs"
                          onClick={() => {
                            setEditingSlot(ad);
                            form.reset(adToForm(ad));
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </Button>
                      </DataTableCell>
                    </tr>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : (
            <EmptyState label="Belum ada slot iklan yang tersedia." />
          )}
        </div>
      </div>
    </section>
  );
}
