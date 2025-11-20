// src/pages/produits.tsx
import { useMemo, useState } from "react";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Grade = { id: number; name: string };
type ProductComponent = { gradeName: string; percent: number };
type Product = {
  id: string;
  name: string;
  reference?: string | null;
  composition: ProductComponent[];
  updatedAt: string;
};

const fetchJSON = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${txt || ""}`);
  return JSON.parse(txt);
};

const fmtPct = (n: number) => {
  if (!Number.isFinite(n)) return "—";
  // garder le style de tes données, virgule + % et jusqu'à 2 décimales
  const s = (Math.round(n * 100) / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: n % 1 !== 0 ? 1 : 0,
    maximumFractionDigits: 2,
  });
  return `${s}%`;
};

export default function ProduitsPage() {
  const qc = useQueryClient();

  // Data
  const { data: gradesRes } = useQuery({ queryKey: ["/api/grades"] });
  const { data: productsRes } = useQuery({ queryKey: ["/api/products"] });

  const grades: Grade[] = useMemo(() => (gradesRes as any)?.data ?? [], [gradesRes]);
  const products: Product[] = useMemo(
    () => (productsRes as any)?.data ?? [],
    [productsRes]
  );

  // UI (modal édition simple: nom + composition à la main)
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formName, setFormName] = useState("");
  const [formComp, setFormComp] = useState<Record<string, string>>({}); // gradeName -> "xx,yy"

  const openEdit = (p: Product) => {
    setEditing(p);
    setFormName(p.name);
    const obj: Record<string, string> = {};
    p.composition.forEach((c) => {
      // afficher comme "70,5"
      const fr = (Math.round(c.percent * 100) / 100)
        .toString()
        .replace(".", ",");
      obj[c.gradeName] = fr;
    });
    setFormComp(obj);
    setOpen(true);
  };

  const newProduct = () => {
    setEditing(null);
    setFormName("");
    setFormComp({});
    setOpen(true);
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      // convertir formComp en [{gradeName, percent}]
      const comp: ProductComponent[] = Object.entries(formComp)
        .map(([gradeName, v]) => {
          const cleaned = String(v || "")
            .replace(/\s+/g, "")
            .replace("%", "")
            .replace(",", ".");
          const n = Number(cleaned);
          return { gradeName, percent: Number.isFinite(n) ? n : 0 };
        })
        .filter((c) => c.percent !== 0);

      if (editing) {
        return fetchJSON(`/api/products/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName || editing.name, composition: comp }),
        });
      }
      return fetchJSON(`/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName || "Sans nom", composition: comp }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      setOpen(false);
    },
    onError: (e: any) => alert(e?.message || e),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => fetchJSON(`/api/products/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/products"] }),
    onError: (e: any) => alert(e?.message || e),
  });

  return (
    <div className="flex h-screen bg-trading-dark text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Produits</h2>
            <div className="flex gap-2">
              <Button className="bg-amber-600" onClick={() => alert("Import bientôt…")}>
                <Upload className="h-4 w-4 mr-2" />
                Importer
              </Button>
              <Button className="bg-trading-blue" onClick={newProduct}>
                Nouveau
              </Button>
            </div>
          </div>

          <Card className="bg-trading-slate border-gray-700">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-gray-300 bg-black/20">
                    <tr className="text-left">
                      <th className="py-3 px-3 w-64">Nom</th>
                      {grades.map((g) => (
                        <th key={g.id} className="py-3 px-3 whitespace-nowrap">
                          {g.name}
                        </th>
                      ))}
                      <th className="py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {products.map((p) => (
                      <tr key={p.id} className="border-t border-gray-700">
                        <td className="py-2 px-3">{p.name}</td>
                        {grades.map((g) => {
                          const comp = p.composition.find((c) => c.gradeName === g.name);
                          return (
                            <td key={`${p.id}-${g.id}`} className="py-2 px-3 text-center">
                              {comp ? fmtPct(comp.percent) : "—"}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="border-gray-600 text-white"
                              onClick={() => openEdit(p)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Modifier
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (confirm("Supprimer ce produit ?")) deleteMutation.mutate(p.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td className="py-6 px-3 text-gray-400" colSpan={2 + grades.length}>
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

      {/* ----- Modal Edition ----- */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-[860px]">
            <div className="text-lg font-semibold mb-3">
              {editing ? "Modifier le produit" : "Nouveau produit"}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nom</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              {grades.map((g) => (
                <div key={`form-${g.id}`}>
                  <Label>{g.name} (%)</Label>
                  <Input
                    className="bg-black/40 border-gray-700 text-white"
                    placeholder="ex: 70,5"
                    value={formComp[g.name] ?? ""}
                    onChange={(e) =>
                      setFormComp((prev) => ({ ...prev, [g.name]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button className="bg-trading-blue" onClick={() => saveMutation.mutate()}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
