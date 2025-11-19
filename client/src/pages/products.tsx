import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Upload } from "lucide-react";

/** Types alignés avec @shared/schema.ts */
type ProductComponent = { gradeName: string; percent: number };
type Product = {
  id: string;
  name: string;
  reference?: string | null;
  composition: ProductComponent[];
  updatedAt: string;
};
type Grade = { id: number; name: string };

const fetchJSON = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${text || ""}`);
  return JSON.parse(text);
};

// ordre d’affichage demandé
const GRADE_ORDER = [
  "RBD PO",
  "RBD POL IV56",
  "RBD PS",
  "RBD POL IV64",
  "RBD CNO",
  "RBD PKO",
  "RBD PKS",
  "CDSBO",
];

// util: "70,5" -> 70.5, "70.5" -> 70.5
const parsePercent = (v: string | number): number => {
  if (typeof v === "number") return v;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default function ProduitsPage() {
  const qc = useQueryClient();

  const { data: productsRes } = useQuery({ queryKey: ["/api/products"] });
  const { data: gradesRes }   = useQuery({ queryKey: ["/api/grades"] });

  const products: Product[] = useMemo(() => (productsRes as any)?.data ?? [], [productsRes]);
  const grades: Grade[]     = useMemo(() => (gradesRes as any)?.data ?? [], [gradesRes]);

  // colonnes: on garde l’ordre fixe, mais on n’affiche que celles existantes
  const gradeColumns = useMemo(() => {
    const names = new Set(grades.map(g => g.name));
    return GRADE_ORDER.filter(n => names.has(n));
  }, [grades]);

  // ----- Etat UI (édition) -----
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [reference, setReference] = useState<string>("");
  // valeurs par grade (string pour inputs)
  const [compByGrade, setCompByGrade] = useState<Record<string, string>>({});

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setReference("");
    setCompByGrade({});
  };

  // ouvrir modal en création
  const openCreate = () => {
    resetForm();
    // pré-init toutes les colonnes à ""
    const init: Record<string, string> = {};
    gradeColumns.forEach(g => (init[g] = ""));
    setCompByGrade(init);
    setOpen(true);
  };

  // ouvrir modal en édition
  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setReference(p.reference ?? "");
    const map: Record<string, string> = {};
    // init toutes les colonnes à ""
    gradeColumns.forEach((g) => (map[g] = ""));
    // puis remplir celles présentes
    p.composition.forEach((c) => {
      if (GRADE_ORDER.includes(c.gradeName)) {
        map[c.gradeName] = String(c.percent).replace(".", ","); // joli en FR
      }
    });
    setCompByGrade(map);
    setOpen(true);
  };

  // mutations
  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Product, "id" | "updatedAt">) =>
      fetchJSON("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => alert(e?.message || e),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<Product> }) =>
      fetchJSON(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => alert(e?.message || e),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => fetchJSON(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (e: any) => alert(e?.message || e),
  });

  const onSave = () => {
    // construire composition en nombres
    const composition: ProductComponent[] = gradeColumns
      .map((g) => ({
        gradeName: g,
        percent: parsePercent(compByGrade[g] ?? ""),
      }))
      .filter((c) => c.percent !== 0);

    if (!name.trim()) return alert("Nom requis");

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        body: { name: name.trim(), reference: reference || null, composition },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        reference: reference || null,
        composition,
      } as any);
    }
  };

  // bouton Importer (placeholder)
  const onImport = () => {
    alert(
      "Importer: à raccorder à un upload CSV/Excel. Pour l’instant, utilisez 'Nouveau' pour saisir manuellement."
    );
  };

  // ---------- rendu ----------
  return (
    <div className="flex h-screen bg-trading-dark text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Produits</h2>
            <div className="flex gap-2">
              <Button className="bg-amber-600" onClick={onImport}>
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
              <Button className="bg-trading-blue" onClick={openCreate}>
                Nouveau
              </Button>
            </div>
          </div>

          <Card className="bg-trading-slate border-gray-700">
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-gray-300">
                    <tr className="text-left">
                      <th className="py-2 px-3">Nom</th>
                      {gradeColumns.map((g) => (
                        <th key={g} className="py-2 px-3 whitespace-nowrap">{g}</th>
                      ))}
                      <th className="py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {products.map((p) => {
                      // map composition -> { gradeName: percent }
                      const map: Record<string, number> = {};
                      p.composition.forEach((c) => (map[c.gradeName] = c.percent));
                      return (
                        <tr key={p.id} className="border-t border-gray-700">
                          <td className="py-2 px-3">{p.name}</td>
                          {gradeColumns.map((g) => (
                            <td key={g} className="py-2 px-3">
                              {typeof map[g] === "number"
                                ? `${String(map[g]).replace(".", ",")}%`
                                : "—"}
                            </td>
                          ))}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white"
                                onClick={() => openEdit(p)}
                                title="Modifier"
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Modifier
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400"
                                onClick={() => {
                                  if (confirm("Supprimer ce produit ?")) deleteMutation.mutate(p.id);
                                }}
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Supprimer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {products.length === 0 && (
                      <tr>
                        <td className="py-6 px-3 text-gray-400" colSpan={2 + gradeColumns.length}>
                          Aucun produit pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal création/édition */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-[860px]">
            <div className="text-lg font-semibold mb-3">
              {editingId ? "Modifier le produit" : "Nouveau produit"}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <Label className="text-sm">Nom</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm">Référence (optionnel)</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gradeColumns.map((g) => (
                <div key={g}>
                  <Label className="text-sm">{g} (%)</Label>
                  <Input
                    className="bg-black/40 border-gray-700 text-white"
                    inputMode="decimal"
                    placeholder="ex: 70,5"
                    value={compByGrade[g] ?? ""}
                    onChange={(e) =>
                      setCompByGrade((prev) => ({ ...prev, [g]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button className="bg-trading-blue" onClick={onSave}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
