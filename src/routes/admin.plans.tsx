import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SectionTitle } from "@/components/admin/SectionTitle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCatalog,
  adminUpdateProduct,
  adminUpdatePricingPlan,
  adminToggleProductFeature,
  type AdminCatalog,
} from "@/lib/products.functions";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Pencil, Users, ChevronDown, Settings2 } from "lucide-react";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [{ title: "Meu Barão · Planos" }] }),
  component: AdminPlansPage,
});

type Product = AdminCatalog["products"][number];
type Plan = Product["plans"][number];

const CYCLE_PT: Record<string, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  lifetime: "Vitalício",
  trial: "Trial",
};
const CYCLE_ORDER: Record<string, number> = {
  monthly: 1,
  quarterly: 2,
  semiannual: 3,
  annual: 4,
  lifetime: 5,
  trial: 0,
};

function fmtBRL(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtBRL2(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Internal / legacy products that must never appear in the main listing.
// Exception: the system Free tier is intentionally internal but must still
// be manageable from the admin.
function isMainProduct(p: Product) {
  if (p.tier === "free") return true;
  if (p.visibility === "internal") return false;
  const slug = p.slug?.toLowerCase() ?? "";
  if (slug.includes("manual") || slug.includes("admin") || slug.includes("legacy")) return false;
  return true;
}

function AdminPlansPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCatalog);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "catalog"],
    queryFn: () => list({ data: undefined as unknown as never }) as Promise<AdminCatalog>,
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "catalog"] });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <SectionTitle eyebrow="catálogo" title="Produtos & Preços" description="Carregando…" />
        <div className="rounded-xl border border-border/40 bg-black/30 p-8 text-center text-sm text-muted-foreground">
          Carregando…
        </div>
      </div>
    );
  }

  const mainProducts = data.products.filter(isMainProduct);
  const internalProducts = data.products.filter((p) => !isMainProduct(p));
  const { totals } = data;

  const editing = data.products.find((p) => p.id === editingId) ?? null;

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="catálogo"
        title="Produtos & Preços"
        description="Gerencie os planos comerciais oferecidos aos assinantes."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="MRR" value={fmtBRL(totals.mrr_brl)} />
        <Stat label="ARR estimado" value={fmtBRL(totals.arr_brl)} />
        <Stat label="Assinantes ativos" value={String(totals.active_subs)} />
        <Stat label="Receita 30 dias" value={fmtBRL(totals.revenue_30d_brl)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {mainProducts.map((prod) => (
          <ProductCard
            key={prod.id}
            product={prod}
            onEdit={() => setEditingId(prod.id)}
            onToggleActive={(active) => {
              // optimistic-ish: just fire & invalidate
              void fetch; // noop
              void active;
            }}
          />
        ))}
      </div>

      {internalProducts.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="group flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition-colors">
              <Settings2 className="h-3.5 w-3.5" />
              Controles avançados ({internalProducts.length} produto
              {internalProducts.length > 1 ? "s" : ""} interno
              {internalProducts.length > 1 ? "s" : ""})
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 grid md:grid-cols-2 gap-4">
            {internalProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onEdit={() => setEditingId(prod.id)}
                onToggleActive={() => {}}
                internal
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      <ProductEditor
        product={editing}
        allFeatures={data.all_features}
        onClose={() => setEditingId(null)}
        onChanged={invalidate}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-black/30 p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="serif mt-1 text-2xl gold-text">{value}</p>
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  internal,
}: {
  product: Product;
  onEdit: () => void;
  onToggleActive: (v: boolean) => void;
  internal?: boolean;
}) {
  const qc = useQueryClient();
  const updProdFn = useServerFn(adminUpdateProduct);
  const updProduct = useMutation({
    mutationFn: (v: {
      id: string;
      active?: boolean;
      visibility?: "public" | "internal" | "hidden";
      name?: string;
      description?: string | null;
      sort_order?: number;
    }) => updProdFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "catalog"] });
      toast.success("Atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sortedPlans = [...product.plans].sort(
    (a, b) => (CYCLE_ORDER[a.billing_cycle] ?? 99) - (CYCLE_ORDER[b.billing_cycle] ?? 99),
  );
  const totalSubs = product.plans.reduce((s, p) => s + p.active_subs, 0);

  return (
    <div className="group rounded-2xl border border-border/40 bg-gradient-to-b from-black/40 to-black/20 backdrop-blur p-6 transition-all hover:border-[var(--gold)]/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="serif text-2xl gold-text truncate">{product.name}</h3>
            {product.tier === "free" && (
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wider border-sky-500/60 text-sky-300"
              >
                Sistema
              </Badge>
            )}
            {internal && product.tier !== "free" && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                Interno
              </Badge>
            )}
          </div>
          {product.description && (
            <p className="mt-1 text-sm text-muted-foreground italic line-clamp-2">
              {product.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 ${
                product.active ? "text-emerald-400" : "text-muted-foreground"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  product.active ? "bg-emerald-400" : "bg-muted-foreground/50"
                }`}
              />
              {product.active ? "Ativo" : "Inativo"}
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              {totalSubs} assinante{totalSubs === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <Switch
          checked={product.active}
          onCheckedChange={(v) => updProduct.mutate({ id: product.id, active: v })}
        />
      </div>

      <div className="mt-5 space-y-1.5">
        {sortedPlans.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            Nenhum ciclo configurado
          </p>
        ) : (
          sortedPlans.map((pl) => (
            <div
              key={pl.id}
              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-1 w-1 rounded-full ${
                    pl.active ? "bg-[var(--gold)]" : "bg-muted-foreground/40"
                  }`}
                />
                <span
                  className={`text-sm ${
                    pl.active ? "text-foreground" : "text-muted-foreground line-through"
                  }`}
                >
                  {CYCLE_PT[pl.billing_cycle] ?? pl.billing_cycle}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="serif text-base">{fmtBRL(pl.price_brl)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-border/30 flex justify-end">
        <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
          <Pencil className="h-3.5 w-3.5" />
          Editar produto
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Editor modal — draft / save flow
// ──────────────────────────────────────────────────────────────────
type ProductDraft = {
  name: string;
  description: string;
  visibility: "public" | "internal" | "hidden";
  active: boolean;
};
type PlanDraft = {
  price_brl: number;
  active: boolean;
};
type FeaturesDraft = Record<string, boolean>;

function buildProductDraft(p: Product): ProductDraft {
  return {
    name: p.name,
    description: p.description ?? "",
    visibility: p.visibility,
    active: p.active,
  };
}
function buildPlansDraft(p: Product): Record<string, PlanDraft> {
  const out: Record<string, PlanDraft> = {};
  for (const pl of p.plans) out[pl.id] = { price_brl: pl.price_brl, active: pl.active };
  return out;
}
function buildFeaturesDraft(p: Product, all: AdminCatalog["all_features"]): FeaturesDraft {
  const out: FeaturesDraft = {};
  for (const f of all) out[f.key] = p.feature_keys.includes(f.key);
  return out;
}

function ProductEditor({
  product,
  allFeatures,
  onClose,
  onChanged,
}: {
  product: Product | null;
  allFeatures: AdminCatalog["all_features"];
  onClose: () => void;
  onChanged: () => void;
}) {
  const updProdFn = useServerFn(adminUpdateProduct);
  const updPriceFn = useServerFn(adminUpdatePricingPlan);
  const togFeatFn = useServerFn(adminToggleProductFeature);

  const [prodDraft, setProdDraft] = useState<ProductDraft | null>(null);
  const [plansDraft, setPlansDraft] = useState<Record<string, PlanDraft>>({});
  const [featsDraft, setFeatsDraft] = useState<FeaturesDraft>({});
  const [saving, setSaving] = useState(false);

  // Reset draft whenever the editor opens with a (new) product
  const productId = product?.id ?? null;
  useMemo(() => {
    if (product) {
      setProdDraft(buildProductDraft(product));
      setPlansDraft(buildPlansDraft(product));
      setFeatsDraft(buildFeaturesDraft(product, allFeatures));
    } else {
      setProdDraft(null);
      setPlansDraft({});
      setFeatsDraft({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const sortedPlans = useMemo(
    () =>
      product
        ? [...product.plans].sort(
            (a, b) => (CYCLE_ORDER[a.billing_cycle] ?? 99) - (CYCLE_ORDER[b.billing_cycle] ?? 99),
          )
        : [],
    [product],
  );

  const totals = useMemo(() => {
    if (!product) return { mrr: 0, subs: 0, rev30: 0 };
    return product.plans.reduce(
      (acc, p) => ({
        mrr: acc.mrr + p.mrr_brl,
        subs: acc.subs + p.active_subs,
        rev30: acc.rev30 + p.revenue_30d_brl,
      }),
      { mrr: 0, subs: 0, rev30: 0 },
    );
  }, [product]);

  // Dirty detection
  const dirty = useMemo(() => {
    if (!product || !prodDraft) return false;
    const origProd = buildProductDraft(product);
    if (
      origProd.name !== prodDraft.name.trim() ||
      origProd.description !== prodDraft.description.trim() ||
      origProd.visibility !== prodDraft.visibility ||
      origProd.active !== prodDraft.active
    )
      return true;
    for (const pl of product.plans) {
      const d = plansDraft[pl.id];
      if (!d) continue;
      if (d.price_brl !== pl.price_brl || d.active !== pl.active) return true;
    }
    const origFeats = buildFeaturesDraft(product, allFeatures);
    for (const k of Object.keys(featsDraft)) {
      if (origFeats[k] !== featsDraft[k]) return true;
    }
    return false;
  }, [product, prodDraft, plansDraft, featsDraft, allFeatures]);

  const handleCancel = () => {
    if (!product) {
      onClose();
      return;
    }
    setProdDraft(buildProductDraft(product));
    setPlansDraft(buildPlansDraft(product));
    setFeatsDraft(buildFeaturesDraft(product, allFeatures));
  };

  const handleSave = async () => {
    if (!product || !prodDraft) return;
    setSaving(true);
    try {
      const ops: Promise<unknown>[] = [];

      // Product fields
      const origProd = buildProductDraft(product);
      const prodPatch: {
        id: string;
        name?: string;
        description?: string | null;
        visibility?: "public" | "internal" | "hidden";
        active?: boolean;
      } = { id: product.id };
      let prodChanged = false;
      const name = prodDraft.name.trim();
      if (name && name !== origProd.name) {
        prodPatch.name = name;
        prodChanged = true;
      }
      const desc = prodDraft.description.trim();
      if (desc !== origProd.description) {
        prodPatch.description = desc || null;
        prodChanged = true;
      }
      if (prodDraft.visibility !== origProd.visibility) {
        prodPatch.visibility = prodDraft.visibility;
        prodChanged = true;
      }
      if (prodDraft.active !== origProd.active) {
        prodPatch.active = prodDraft.active;
        prodChanged = true;
      }
      if (prodChanged) ops.push(updProdFn({ data: prodPatch }));

      // Plans
      for (const pl of product.plans) {
        const d = plansDraft[pl.id];
        if (!d) continue;
        const patch: {
          id: string;
          price_brl?: number;
          active?: boolean;
        } = { id: pl.id };
        let changed = false;
        if (d.price_brl !== pl.price_brl) {
          patch.price_brl = d.price_brl;
          changed = true;
        }
        if (d.active !== pl.active) {
          patch.active = d.active;
          changed = true;
        }
        if (changed) ops.push(updPriceFn({ data: patch }));
      }

      // Features
      const origFeats = buildFeaturesDraft(product, allFeatures);
      for (const k of Object.keys(featsDraft)) {
        if (featsDraft[k] !== origFeats[k]) {
          ops.push(
            togFeatFn({
              data: { product_id: product.id, feature_key: k, enabled: featsDraft[k] },
            }),
          );
        }
      }

      await Promise.all(ops);
      onChanged();
      toast.success("Alterações salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const open = !!product;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) return;
        if (dirty && !confirm("Descartar alterações não salvas?")) return;
        onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {product && prodDraft && (
          <>
            <DialogHeader>
              <DialogTitle className="serif text-2xl gold-text flex items-center gap-3">
                {product.name}
                {dirty && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider border-amber-500/60 text-amber-400"
                  >
                    Alterações não salvas
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Editar configurações do produto e ciclos de cobrança.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="mt-2">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="general">Geral</TabsTrigger>
                <TabsTrigger value="pricing">Preços</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="advanced">Avançado</TabsTrigger>
              </TabsList>

              {/* GERAL */}
              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={prodDraft.name}
                    onChange={(e) => setProdDraft({ ...prodDraft, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={prodDraft.description}
                    rows={3}
                    onChange={(e) => setProdDraft({ ...prodDraft, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Visibilidade</Label>
                    <Select
                      value={prodDraft.visibility}
                      onValueChange={(v) =>
                        setProdDraft({
                          ...prodDraft,
                          visibility: v as "public" | "internal" | "hidden",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Público</SelectItem>
                        <SelectItem value="internal">Interno</SelectItem>
                        <SelectItem value="hidden">Oculto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex items-center gap-3 h-9 px-3 rounded-md border border-input">
                      <Switch
                        checked={prodDraft.active}
                        onCheckedChange={(v) => setProdDraft({ ...prodDraft, active: v })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {prodDraft.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* PREÇOS */}
              <TabsContent value="pricing" className="space-y-2 pt-4">
                {sortedPlans.map((pl) => {
                  const d = plansDraft[pl.id] ?? { price_brl: pl.price_brl, active: pl.active };
                  return (
                    <PriceRow
                      key={pl.id}
                      plan={pl}
                      draft={d}
                      onChange={(patch) =>
                        setPlansDraft((prev) => ({
                          ...prev,
                          [pl.id]: { ...d, ...patch },
                        }))
                      }
                    />
                  );
                })}
                {sortedPlans.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum ciclo de cobrança configurado.
                  </p>
                )}
              </TabsContent>

              {/* ANALYTICS */}
              <TabsContent value="analytics" className="space-y-3 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Assinantes" value={String(totals.subs)} />
                  <Stat label="MRR" value={fmtBRL(totals.mrr)} />
                  <Stat label="Receita 30d" value={fmtBRL(totals.rev30)} />
                </div>
                <div className="rounded-md border border-border/40 bg-black/30 mt-3">
                  <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr className="border-b border-border/30">
                        <th className="text-left p-3">Ciclo</th>
                        <th className="text-right p-3">Subs</th>
                        <th className="text-right p-3">MRR</th>
                        <th className="text-right p-3">Receita 30d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlans.map((pl) => (
                        <tr key={pl.id} className="border-b border-border/20 last:border-0">
                          <td className="p-3">{CYCLE_PT[pl.billing_cycle] ?? pl.billing_cycle}</td>
                          <td className="p-3 text-right">{pl.active_subs}</td>
                          <td className="p-3 text-right">{fmtBRL2(pl.mrr_brl)}</td>
                          <td className="p-3 text-right">{fmtBRL2(pl.revenue_30d_brl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* AVANÇADO */}
              <TabsContent value="advanced" className="space-y-4 pt-4">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button className="group flex items-center justify-between w-full p-3 rounded-md border border-border/40 bg-black/30 text-sm hover:border-border transition-colors">
                      <span>
                        Entitlements ({Object.values(featsDraft).filter(Boolean).length} ativos)
                      </span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <p className="text-xs text-muted-foreground mb-3">
                      Área técnica: controla quais recursos do produto estão habilitados.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {allFeatures.map((f) => {
                        const on = !!featsDraft[f.key];
                        return (
                          <button
                            key={f.key}
                            onClick={() => setFeatsDraft((prev) => ({ ...prev, [f.key]: !on }))}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                              on
                                ? "border-[var(--gold)]/60 bg-[var(--gold)]/15 text-foreground"
                                : "border-border/40 text-muted-foreground hover:border-border"
                            }`}
                            title={f.category}
                          >
                            {f.name}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button className="group flex items-center justify-between w-full p-3 rounded-md border border-border/40 bg-black/30 text-sm hover:border-border transition-colors">
                      <span>Metadados internos</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-2 text-xs font-mono text-muted-foreground">
                    <div className="flex justify-between gap-3 p-2 rounded bg-black/30">
                      <span>product.id</span>
                      <span className="truncate">{product.id}</span>
                    </div>
                    <div className="flex justify-between gap-3 p-2 rounded bg-black/30">
                      <span>slug</span>
                      <span>{product.slug}</span>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6 pt-4 border-t border-border/30 sticky bottom-0 bg-background">
              <Button variant="ghost" onClick={handleCancel} disabled={saving || !dirty}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !dirty}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PriceRow({
  plan,
  draft,
  onChange,
}: {
  plan: Plan;
  draft: PlanDraft;
  onChange: (patch: Partial<PlanDraft>) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-md border border-border/30 bg-black/30">
      <Switch checked={draft.active} onCheckedChange={(v) => onChange({ active: v })} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${!draft.active ? "text-muted-foreground" : ""}`}>
          {CYCLE_PT[plan.billing_cycle] ?? plan.billing_cycle}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {plan.active_subs} assinante{plan.active_subs === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">R$</span>
        <Input
          type="text"
          inputMode="decimal"
          key={`${plan.id}-${draft.price_brl}`}
          defaultValue={draft.price_brl.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          className="h-8 w-28 text-right [appearance:textfield]"
          onBlur={(e) => {
            const raw = e.target.value.replace(/\./g, "").replace(",", ".");
            const v = Number(raw);
            if (!Number.isNaN(v) && v !== draft.price_brl) onChange({ price_brl: v });
          }}
        />
      </div>
    </div>
  );
}
