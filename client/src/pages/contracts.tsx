import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, PlusCircle } from "lucide-react";

/** ---------- Types basiques (coté UI) ---------- */
type Market = "LOCAL" | "EXPORT";
type Client = { id: string; name: string; market: Market; paymentTerms?: string };
type Product = { id: string; name: string; reference?: string | null };

type Contract = {
  id?: string;
  code?: string;           // généré côté backend (incrémental par marché+année)
  market: Market;          // redondant (dérivé du client) mais pratique pour l’affichage
  clientId: string;
  clientName?: string;     // dénormalisé pour l’affichage
  productId: string;
  productName?: string;    // dénormalisé pour l’affichage
  quantityT: number;       // en tonnes
  priceCurrency: "USD" | "TND";
  pricePerT: number;       // prix par tonne dans la devise ci-dessus
  fxRate: number;          // taux de change utilisé (USD->TND)
  dateStart: string;       // YYYY-MM-DD
  dateEnd: string;         // YYYY-MM-DD
  contractDate: string;    // YYYY-MM-DD (par défaut aujourd’hui, modifiable)
  createdAt?: string;
  updatedAt?: string;
};

const fetchJSON = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${text || ""}`);
  return JSON.parse(text);
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ContractsPage() {
  const qc = useQueryClient();

  /** --------- Data sources: clients & produits --------- */
  const { data: clientsRes } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => fetchJSON("/api/clients"),
  });
  const clients: Client[] = useMemo(() => (clientsRes as any)?.data ?? [], [clientsRes]);

  const { data: productsRes } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => fetchJSON("/api/products"),
  });
  const products: Product[] = useMemo(() => (productsRes as any)?.data ?? [], [productsRes]);

  /** --------- Contrats --------- */
  const { data: contractsRes, isLoading, error } = useQuery({
    queryKey: ["/api/contracts"],
    queryFn: () => fetchJSON("/api/contracts"),
  });
  const rows: Contract[] = useMemo(() => (contractsRes as any)?.data ?? [], [contractsRes]);

  /** --------- UI state --------- */
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Contract>({
    clientId: "",
    productId: "",
    market: "LOCAL",
    quantityT: 0,
    priceCurrency: "USD",
    pricePerT: 0,
    fxRate: 3.2,
    dateStart: todayStr(),
    dateEnd: todayStr(),
    contractDate: todayStr(),
  });

  const resetForm = () =>
    setForm({
      clientId: "",
      productId: "",
      market: "LOCAL",
      quantityT: 0,
      priceCurrency: "USD",
      pricePerT: 0,
      fxRate: 3.2,
      dateStart: todayStr(),
      dateEnd: todayStr(),
      contractDate: todayStr(),
    });

  /** --------- Mutations --------- */
  const saveContract = useMutation({
    mutationFn: async (payload: Contract) => {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/contracts/${editingId}` : "/api/contracts";
      const method = isEdit ? "PUT" : "POST";
      // Le code est généré côté backend en fonction market+année => on n’envoie pas "code"
      const body = {
        clientId: payload.clientId,
        productId: payload.productId,
        quantityT: Number(payload.quantityT) || 0,
        priceCurrency: payload.priceCurrency,
        pricePerT: Number(payload.pricePerT) || 0,
        fxRate: Number(payload.fxRate) || 0,
        dateStart: payload.dateStart,
        dateEnd: payload.dateEnd,
        contractDate: payload.contractDate,
      };
      return fetchJSON(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    onSuccess: (res: any) => {
      const saved: Contract = res?.data;
      // maj cache (optimiste + refetch pour rester safe)
      qc.setQueryData(["/api/contracts"], (prev: any) => {
        const prevArr: Contract[] = prev?.data ?? [];
        if (!saved) return prev;
        if (editingId) {
          const next = prevArr.map(c => (c.id === saved.id ? saved : c));
          return { data: next };
        } else {
          return { data: [saved, ...prevArr] };
        }
      });
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
      qc.refetchQueries({ queryKey: ["/api/contracts"] });
      setOpen(false);
      setEditingId(null);
    },
    onError: (e: any) => {
      alert(`Erreur enregistrement contrat:\n${e?.message || e}`);
    },
  });

  const delContract = useMutation({
    mutationFn: async (id: string) => fetchJSON(`/api/contracts/${id}`, { method: "DELETE" }),
    onSuccess: (_res: any, id: string) => {
      qc.setQueryData(["/api/contracts"], (prev: any) => {
        const prevArr: Contract[] = prev?.data ?? [];
        return { data: prevArr.filter(c => c.id !== id) };
      });
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
      qc.refetchQueries({ queryKey: ["/api/contracts"] });
    },
    onError: (e: any) => {
      alert(`Erreur suppression contrat:\n${e?.message || e}`);
    },
  });

  /** --------- Helpers UI --------- */
  const selectedClient = clients.find(c => c.id === form.clientId) || null;
  const selectedProduct = products.find(p => p.id === form.productId) || null;

  // Quand on change de client, caler le marché automatiquement
  const handleClientChange = (id: string) => {
    const c = clients.find(x => x.id === id);
    setForm(f => ({
      ...f,
      clientId: id,
      market: c?.market ?? "LOCAL",
    }));
  };

  const currencySuffix = form.priceCurrency === "USD" ? "USD/T" : "TND/T";

  return (
    <div className="flex h-screen bg-trading-dark text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Contrats</h2>
            <Button
              className="bg-trading-blue"
              onClick={() => {
                setEditingId(null);
                resetForm();
                setOpen(true);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Créer un contrat
            </Button>
          </div>

          <Card className="bg-trading-slate border-gray-700">
            <CardContent>
              {isLoading ? (
                <div className="p-4 text-gray-300">Chargement…</div>
              ) : error ? (
                <div className="p-4 text-red-400">Erreur de chargement</div>
              ) : rows.length === 0 ? (
                <div className="p-4 text-gray-300">Aucun contrat pour l’instant.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-300">
                      <tr className="text-left">
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Marché</th>
                        <th className="py-2 px-3">Client</th>
                        <th className="py-2 px-3">Produit</th>
                        <th className="py-2 px-3">Qté (T)</th>
                        <th className="py-2 px-3">Prix</th>
                        <th className="py-2 px-3">FX</th>
                        <th className="py-2 px-3">Début</th>
                        <th className="py-2 px-3">Fin</th>
                        <th className="py-2 px-3">Date contrat</th>
                        <th className="py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-200">
                      {rows.map((r, idx) => (
                        <tr key={r.id || idx} className="border-t border-gray-700">
                          <td className="py-2 px-3">{r.code || "—"}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`text-xs px-2 py-1 rounded-full border ${
                                r.market === "LOCAL"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-600/40"
                                  : "bg-blue-500/15 text-blue-300 border-blue-600/40"
                              }`}
                            >
                              {r.market}
                            </span>
                          </td>
                          <td className="py-2 px-3">{r.clientName || "—"}</td>
                          <td className="py-2 px-3">{r.productName || "—"}</td>
                          <td className="py-2 px-3">{r.quantityT?.toLocaleString() ?? "—"}</td>
                          <td className="py-2 px-3">
                            {r.pricePerT?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {r.priceCurrency}/T
                          </td>
                          <td className="py-2 px-3">{r.fxRate ?? "—"}</td>
                          <td className="py-2 px-3">{r.dateStart}</td>
                          <td className="py-2 px-3">{r.dateEnd}</td>
                          <td className="py-2 px-3">{r.contractDate}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Modifier"
                                onClick={() => {
                                  setEditingId(r.id || null);
                                  setForm({
                                    ...r,
                                    clientId: r.clientId,
                                    productId: r.productId,
                                    market: r.market,
                                  } as Contract);
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
                                  if (confirm("Supprimer ce contrat ?")) {
                                    delContract.mutate(r.id);
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
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-[980px]">
            <div className="text-lg font-semibold mb-3">
              {editingId ? "Modifier un contrat" : "Nouveau contrat"}
            </div>

            <div className="grid grid-cols-4 gap-3">
              {/* Client */}
              <div className="col-span-2">
                <Label className="text-sm">Client</Label>
                <select
                  className="w-full h-9 rounded-md bg-black/40 border border-gray-700 text-white px-3"
                  value={form.clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                >
                  <option value="">Sélectionner…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.paymentTerms ? `(${c.paymentTerms})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marché (auto depuis client, mais modifiable si besoin) */}
              <div>
                <Label className="text-sm">Marché</Label>
                <select
                  className="w-full h-9 rounded-md bg-black/40 border border-gray-700 text-white px-3"
                  value={form.market}
                  onChange={(e) => setForm({ ...form, market: (e.target.value as Market) })}
                >
                  <option value="LOCAL">LOCAL</option>
                  <option value="EXPORT">EXPORT</option>
                </select>
              </div>

              {/* Date contrat (aujourd’hui par défaut) */}
              <div>
                <Label className="text-sm">Date contrat</Label>
                <Input
                  type="date"
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.contractDate}
                  onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
                />
              </div>

              {/* Produit */}
              <div className="col-span-2">
                <Label className="text-sm">Produit</Label>
                <select
                  className="w-full h-9 rounded-md bg-black/40 border border-gray-700 text-white px-3"
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                >
                  <option value="">Sélectionner…</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Qté */}
              <div>
                <Label className="text-sm">Quantité (T)</Label>
                <Input
                  inputMode="decimal"
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.quantityT}
                  onChange={(e) => setForm({ ...form, quantityT: Number(e.target.value) || 0 })}
                />
              </div>

              {/* Devise prix */}
              <div>
                <Label className="text-sm">Devise</Label>
                <select
                  className="w-full h-9 rounded-md bg-black/40 border border-gray-700 text-white px-3"
                  value={form.priceCurrency}
                  onChange={(e) => setForm({ ...form, priceCurrency: e.target.value as "USD" | "TND" })}
                >
                  <option value="USD">USD</option>
                  <option value="TND">TND</option>
                </select>
              </div>

              {/* Prix par tonne */}
              <div>
                <Label className="text-sm">Prix ({currencySuffix})</Label>
                <Input
                  inputMode="decimal"
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.pricePerT}
                  onChange={(e) => setForm({ ...form, pricePerT: Number(e.target.value) || 0 })}
                />
              </div>

              {/* FX */}
              <div>
                <Label className="text-sm">Taux de change</Label>
                <Input
                  inputMode="decimal"
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.fxRate}
                  onChange={(e) => setForm({ ...form, fxRate: Number(e.target.value) || 0 })}
                />
              </div>

              {/* Début / Fin */}
              <div>
                <Label className="text-sm">Date début</Label>
                <Input
                  type="date"
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.dateStart}
                  onChange={(e) => setForm({ ...form, dateStart: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm">Date fin</Label>
                <Input
                  type="date"
                  className="bg-black/40 border-gray-700 text-white"
                  value={form.dateEnd}
                  onChange={(e) => setForm({ ...form, dateEnd: e.target.value })}
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
                  if (!form.clientId) return alert("Choisis un client.");
                  if (!form.productId) return alert("Choisis un produit.");
                  if (!form.quantityT || form.quantityT <= 0) return alert("Saisis une quantité en tonnes.");
                  if (!form.pricePerT || form.pricePerT <= 0) return alert("Saisis un prix par tonne.");
                  if (!form.contractDate) return alert("La date de contrat est requise.");

                  const payload: Contract = { ...form };
                  saveContract.mutate(payload);
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
