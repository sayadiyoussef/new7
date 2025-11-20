import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Import, PlusCircle } from "lucide-react";

// ---- Types alignés avec @shared/schema (Client) ----
type Client = {
  id?: string;
  name: string;

  // ✅ champs pris en charge par l'API
  market?: "LOCAL" | "EXPORT";
  terms?: string; // (Règlement côté API/UI)

  // ✅ anciens champs conservés pour l'UI
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string; // alias d’affichage pour terms
  incoterm?: string;
  notes?: string;

  createdAt?: string;
  updatedAt?: string;
};

// Utilitaires
const fetchJSON = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${text || ""}`);
  return JSON.parse(text);
};

export default function ClientsPage() {
  const qc = useQueryClient();

  // Data
  const { data: clientsRes, isLoading, error } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => fetchJSON("/api/clients"),
  });

  // ✅ Normalise: calcule 'terms' et le reflète aussi dans 'paymentTerms' pour l'UI
  const rows: Client[] = useMemo(() => {
    const raw: Client[] = (clientsRes as any)?.data ?? [];
    return raw.map((c) => {
      const terms = (c as any).terms ?? (c as any).paymentTerms ?? "";
      return { ...c, terms, paymentTerms: terms };
    });
  }, [clientsRes]);

  // UI states
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Client>({
    name: "",
    market: undefined,
    terms: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    taxId: "",
    paymentTerms: "",
    incoterm: "",
    notes: "",
  });

  const resetForm = () =>
    setForm({
      name: "",
      market: undefined,
      terms: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      taxId: "",
      paymentTerms: "",
      incoterm: "",
      notes: "",
    });

  // Mutations
  const saveClient = useMutation({
    mutationFn: async (payload: Client) => {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/clients/${editingId}` : "/api/clients";
      const method = isEdit ? "PUT" : "POST";

      // ✅ N’ENVOYER QUE LES CHAMPS ACCEPTÉS PAR l’API: name, market, terms
      const body = {
        name: payload.name,
        market: payload.market,
        terms: payload.terms ?? payload.paymentTerms ?? "",
      };

      return fetchJSON(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: (res: any) => {
      const saved = res?.data;
      qc.setQueryData(["/api/clients"], (prev: any) => {
        const prevArr: Client[] = prev?.data ?? [];
        if (!saved) return prev;
        // ✅ normaliser pour l’UI (paymentTerms = terms)
        const normalized = { ...saved, paymentTerms: saved.terms ?? "" };
        if (editingId) {
          const next = prevArr.map((c) => (c.id === saved.id ? normalized : c));
          return { data: next };
        } else {
          return { data: [normalized, ...prevArr] };
        }
      });
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      qc.refetchQueries({ queryKey: ["/api/clients"] });
      setOpen(false);
      setEditingId(null);
    },
    onError: (e: any) => {
      alert(`Erreur lors de l'enregistrement du client:\n${e?.message || e}`);
    },
  });

  const delClient = useMutation({
    mutationFn: async (id: string) => fetchJSON(`/api/clients/${id}`, { method: "DELETE" }),
    onSuccess: (_res: any, id: string) => {
      qc.setQueryData(["/api/clients"], (prev: any) => {
        const prevArr: Client[] = prev?.data ?? [];
        return { data: prevArr.filter((c) => c.id !== id) };
      });
      qc.invalidateQueries({ queryKey: ["/api/clients"] });
      qc.refetchQueries({ queryKey: ["/api/clients"] });
    },
    onError: (e: any) => {
      alert(`Erreur lors de la suppression:\n${e?.message || e}`);
    },
  });

  // Import (placeholder)
  const handleImport = () => {
    alert("Import Clients (placeholder) — brancher un upload CSV/XLSX ici.");
  };

  return (
    <div className="flex h-screen bg-trading-dark text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Clients</h2>
            <div className="flex gap-2">
              <Button className="bg-emerald-600" onClick={handleImport} title="Importer">
                <Import className="h-4 w-4 mr-2" />
                Importer
              </Button>
              <Button
                className="bg-trading-blue"
                onClick={() => {
                  setEditingId(null);
                  resetForm();
                  setOpen(true);
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Nouveau
              </Button>
            </div>
          </div>

          <Card className="bg-trading-slate border-gray-700">
            <CardContent>
              {isLoading ? (
                <div className="p-4 text-gray-300">Chargement…</div>
              ) : error ? (
                <div className="p-4 text-red-400">Erreur de chargement</div>
              ) : rows.length === 0 ? (
                <div className="p-4 text-gray-300">Aucun client pour l’instant.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-300">
                      <tr className="text-left">
                        <th className="py-2 px-3">Client</th>
                        {/* ✅ Nouvelle colonne Marché */}
                        <th className="py-2 px-3">Marché</th>
                        <th className="py-2 px-3">Contact</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Téléphone</th>
                        <th className="py-2 px-3">Adresse</th>
                        <th className="py-2 px-3">Ville</th>
                        <th className="py-2 px-3">Pays</th>
                        <th className="py-2 px-3">TVA</th>
                        <th className="py-2 px-3">Règlement</th>
                        <th className="py-2 px-3">Incoterm</th>
                        <th className="py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-200">
                      {rows.map((r: Client, idx: number) => (
                        <tr key={r.id || idx} className="border-t border-gray-700">
                          <td className="py-2 px-3">{r.name}</td>
                          {/* ✅ badge Marché */}
                          <td className="py-2 px-3">
                            {r.market ? (
                              <span
                                className={`text-xs px-2 py-1 rounded-full border ${
                                  r.market === "LOCAL"
                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-600/40"
                                    : "bg-blue-500/15 text-blue-300 border-blue-600/40"
                                }`}
                              >
                                {r.market}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2 px-3">{r.contactName || "—"}</td>
                          <td className="py-2 px-3">{r.email || "—"}</td>
                          <td className="py-2 px-3">{r.phone || "—"}</td>
                          <td className="py-2 px-3">{r.address || "—"}</td>
                          <td className="py-2 px-3">{r.city || "—"}</td>
                          <td className="py-2 px-3">{r.country || "—"}</td>
                          <td className="py-2 px-3">{r.taxId || "—"}</td>
                          {/* ✅ Règlement lit terms puis paymentTerms */}
                          <td className="py-2 px-3">{r.terms ?? r.paymentTerms ?? "—"}</td>
                          <td className="py-2 px-3">{r.incoterm || "—"}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Modifier"
                                onClick={() => {
                                  const t = r.terms ?? r.paymentTerms ?? "";
                                  setEditingId(r.id || null);
                                  setForm({
                                    name: r.name || "",
                                    market: r.market,
                                    terms: t,
                                    contactName: r.contactName || "",
                                    email: r.email || "",
                                    phone: r.phone || "",
                                    address: r.address || "",
                                    city: r.city || "",
                                    country: r.country || "",
                                    taxId: r.taxId || "",
                                    paymentTerms: t, // ✅ garder cohérent avec terms dans l’UI
                                    incoterm: r.incoterm || "",
                                    notes: r.notes || "",
                                  });
                                  setOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                title="Supprimer"
                                onClick={() => {
                                  if (!r.id) return;
                                  if (confirm("Supprimer ce client ?")) {
                                    delClient.mutate(r.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Modal Create/Edit */}
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-[900px]">
            <div className="text-lg font-semibold mb-3">
              {editingId ? "Modifier un client" : "Nouveau client"}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <Label className="text-sm">Client</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* ✅ Champ Marché (LOCAL/EXPORT) */}
              <div>
                <Label className="text-sm">Marché</Label>
                <select
                  className="w-full h-9 rounded-md bg-black/40 border border-gray-700 text-white px-3"
                  value={form.market ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, market: (e.target.value || undefined) as "LOCAL" | "EXPORT" | undefined })
                  }
                >
                  <option value="">—</option>
                  <option value="LOCAL">LOCAL</option>
                  <option value="EXPORT">EXPORT</option>
                </select>
              </div>

              <div>
                <Label className="text-sm">Contact</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.contactName || ""}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-sm">Email</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-sm">Téléphone</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label className="text-sm">Adresse</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.address || ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-sm">Ville</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.city || ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-sm">Pays</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.country || ""}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-sm">TVA</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.taxId || ""}
                  onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                />
              </div>

              {/* ✅ Règlement (lié à terms) */}
              <div>
                <Label className="text-sm">Règlement</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  placeholder='ex: "120 j", "A vue", "60 j"'
                  value={form.terms ?? form.paymentTerms ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      terms: e.target.value,
                      paymentTerms: e.target.value, // synchro UI
                    })
                  }
                />
              </div>

              <div>
                <Label className="text-sm">Incoterm</Label>
                <Input
                  className="bg-black/40 border-gray-700 text-white"
                  placeholder="ex: CIF"
                  value={form.incoterm || ""}
                  onChange={(e) => setForm({ ...form, incoterm: e.target.value })}
                />
              </div>

              <div className="col-span-3">
                <Label className="text-sm">Notes</Label>
                <textarea
                  className="w-full h-28 rounded-md bg-black/40 border border-gray-700 text-white p-3"
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                className="bg-trading-blue"
                onClick={() => {
                  if (!form.name.trim()) {
                    alert("Le nom du client est requis.");
                    return;
                  }
                  const payload: Client = {
                    ...form,
                    terms: form.terms ?? form.paymentTerms ?? "",
                  };
                  saveClient.mutate(payload);
                }}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
