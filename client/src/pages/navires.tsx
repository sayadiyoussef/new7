import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Copy, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

type Vessel = {
  id?: string;
  name: string;
  type: string;
  dwt: number | string;
  status: string;
  eta?: string;
  origin?: string;
  destination?: string;
};

export default function Navires() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["/api/vessels"] });
  const rows: Vessel[] = useMemo(() => (data as any)?.data ?? [], [data]);

  // Modal / Form
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Vessel>({
    id: undefined,
    name: "",
    type: "Tanker",
    dwt: "",
    status: "Planned",
    eta: "",
    origin: "",
    destination: ""
  });

  const resetForm = () =>
    setForm({
      id: undefined,
      name: "",
      type: "Tanker",
      dwt: "",
      status: "Planned",
      eta: "",
      origin: "",
      destination: ""
    });

  // SAVE (PUT avec fallback POST si 404)
const saveVessel = useMutation({
  mutationFn: async (payload: Vessel) => {
    const headers = { "Content-Type": "application/json" };

    // Édition => PUT
    if (editingId) {
      try {
        const res = await fetch(`/api/vessels/${editingId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          // Fallback: si le serveur ne trouve pas l'id (ex: redémarré), on crée
          if (res.status === 404) {
            const res2 = await fetch(`/api/vessels`, {
              method: "POST",
              headers,
              body: JSON.stringify(payload),
            });
            if (!res2.ok) {
              const t2 = await res2.text().catch(() => "");
              throw new Error(`${res2.status} ${res2.statusText} ${t2 || ""}`.trim());
            }
            return res2.json();
          }
          throw new Error(`${res.status} ${res.statusText} ${text || ""}`.trim());
        }
        return res.json();
      } catch (err) {
        // propage les erreurs réseau
        throw err;
      }
    }

    // Création => POST
    const res = await fetch(`/api/vessels`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text || ""}`.trim());
    }
    return res.json();
  },
  onSuccess: (resp: any) => {
    const saved = resp?.data;
    // MàJ immédiate du cache pour voir le résultat sans refresh manuel
    qc.setQueryData(["/api/vessels"], (prev: any) => {
      const arr = (prev?.data ?? []) as Vessel[];
      if (!saved) return prev;

      if (editingId) {
        const i = arr.findIndex(v => v.id === editingId || v.id === saved.id);
        if (i !== -1) {
          const next = arr.slice();
          next[i] = saved;
          return { data: next };
        }
      }
      return { data: [saved, ...arr] };
    });

    qc.invalidateQueries({ queryKey: ["/api/vessels"] });
    qc.refetchQueries({ queryKey: ["/api/vessels"] });

    setOpen(false);
    setEditingId(null);
  },
  onError: (err: any) => {
    alert(`Erreur lors de l’enregistrement du navire:\n${err?.message || err}`);
  }
});


  // DELETE
  const delVessel = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vessels/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${text || ""}`.trim());
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/vessels"] });
    },
    onError: (err: any) => {
      alert(`Erreur lors de la suppression du navire:\n${err?.message || err}`);
    }
  });

  // ---- Calendar helpers ----------------------------------------------------
  const [showCal, setShowCal] = useState(false);
  function formatYmd(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  return (
    <div className="flex h-screen bg-trading-dark text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Vessels</h2>
            <Button
              className="bg-trading-blue"
              onClick={() => {
                setEditingId(null);
                resetForm();
                setOpen(true);
              }}
            >
              Add Vessel
            </Button>
          </div>

          <Card className="bg-trading-slate border-gray-700">
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-gray-300">
                    <tr className="text-left">
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">DWT</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">ETA</th>
                      <th className="py-2 px-3">Origin</th>
                      <th className="py-2 px-3">Destination</th>
                      <th className="py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {rows.map((r: any) => (
                      <tr key={r.id} className="border-t border-gray-700">
                        <td className="py-2 px-3">{r.name}</td>
                        <td className="py-2 px-3">{r.type}</td>
                        <td className="py-2 px-3">{r.dwt}</td>
                        <td className="py-2 px-3">{r.status}</td>
                        <td className="py-2 px-3">{r.eta || "—"}</td>
                        <td className="py-2 px-3">{r.origin || "—"}</td>
                        <td className="py-2 px-3">{r.destination || "—"}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {/* Modifier */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Modifier"
                              onClick={() => {
                                setEditingId(r.id);
                                setForm({
                                  id: r.id,
                                  name: r.name ?? "",
                                  type: r.type ?? "Tanker",
                                  dwt: r.dwt ?? "",
                                  status: r.status ?? "Unknown",
                                  eta: r.eta ?? "",
                                  origin: r.origin ?? "",
                                  destination: r.destination ?? ""
                                });
                                setOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            {/* Dupliquer */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Dupliquer"
                              onClick={() => {
                                setEditingId(null); // force POST
                                setForm({
                                  id: undefined,
                                  name: r.name ?? "",
                                  type: r.type ?? "Tanker",
                                  dwt: r.dwt ?? "",
                                  status: r.status ?? "Unknown",
                                  eta: r.eta ?? "",
                                  origin: r.origin ?? "",
                                  destination: r.destination ?? ""
                                });
                                setOpen(true);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>

                            {/* Supprimer */}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Supprimer"
                              onClick={() => {
                                if (!r.id) return;
                                if (confirm(`Supprimer le navire "${r.name}" ?`)) {
                                  delVessel.mutate(r.id);
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
            </CardContent>
          </Card>
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-[680px]">
            <div className="text-lg font-semibold mb-3">
              {editingId ? "Edit Vessel" : "New Vessel"}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Name</Label>
                <Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
              </div>
              <div>
                <Label className="text-sm">Type</Label>
                <Input value={form.type} onChange={e=>setForm({...form, type:e.target.value})}/>
              </div>
              <div>
                <Label className="text-sm">DWT</Label>
                <Input value={form.dwt} onChange={e=>setForm({...form, dwt:e.target.value})}/>
              </div>
              <div>
                <Label className="text-sm">Status</Label>
                <Input value={form.status} onChange={e=>setForm({...form, status:e.target.value})}/>
              </div>

              {/* ETA with custom calendar popover */}
              <div className="relative">
                <Label className="text-sm">ETA</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={form.eta ? String(form.eta).slice(0, 10) : ""}
                    placeholder="YYYY-MM-DD"
                    onClick={() => setShowCal(true)}
                  />
                  <Button variant="outline" size="icon" title="Pick date" onClick={() => setShowCal(v => !v)}>
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </div>
                {showCal && (
                  <div className="absolute z-50 mt-2 bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-xl">
                    <MiniCalendar
                      value={form.eta ? new Date(form.eta) : null}
                      onSelect={(d) => { setForm({ ...form, eta: formatYmd(d) }); setShowCal(false); }}
                      onDismiss={() => setShowCal(false)}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm">Origin</Label>
                <Input value={form.origin} onChange={e=>setForm({...form, origin:e.target.value})}/>
              </div>
              <div>
                <Label className="text-sm">Destination</Label>
                <Input value={form.destination} onChange={e=>setForm({...form, destination:e.target.value})}/>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={()=>{ setOpen(false); setShowCal(false); }}>Cancel</Button>
              <Button className="bg-trading-blue" onClick={()=>saveVessel.mutate(form)}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** -----------------------------------------------------------------------
 * Very small calendar widget (no deps) used in the ETA popover
 * ----------------------------------------------------------------------*/
function MiniCalendar({
  value,
  onSelect,
  onDismiss
}: {
  value: Date | null;
  onSelect: (d: Date) => void;
  onDismiss?: () => void;
}) {
  const [cursor, setCursor] = useState<Date>(() => {
    const base = value ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Build grid (start on Monday)
  const startDay = (() => {
    const day = cursor.getDay(); // 0 Sun .. 6 Sat
    const diff = (day + 6) % 7;  // 0 Mon .. 6 Sun
    const d = new Date(cursor);
    d.setDate(1 - diff);
    d.setHours(0,0,0,0);
    return d;
  })();

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    days.push(d);
  }

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date(); today.setHours(0,0,0,0);
  const selected = value ? new Date(value) : null;
  if (selected) selected.setHours(0,0,0,0);

  return (
    <div className="w-[280px] select-none">
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-medium">{monthLabel}</div>
        <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
        <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, today);
          const isSel = selected ? isSameDay(d, selected) : false;

          const base = "py-1.5 rounded-md text-sm";
          const tone = isSel
            ? "bg-trading-blue text-white"
            : isToday
            ? "border border-trading-blue text-white"
            : inMonth
            ? "text-gray-100 hover:bg-gray-800"
            : "text-gray-500 hover:bg-gray-800";

          return (
            <button
              key={i}
              className={`${base} ${tone}`}
              onClick={() => onSelect(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mt-3">
        <Button variant="outline" size="sm" onClick={onDismiss}>Close</Button>
      </div>
    </div>
  );
}

