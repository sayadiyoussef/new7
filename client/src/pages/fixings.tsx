import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, Pencil, Copy, Trash2 } from "lucide-react";

export default function Fixings() {
  // Helpers for actions
  const exportRowToCSV = (row:any) => {
    const headers = ["Date","Route","Grade","Volume","PriceUsd","Counterparty","Vessel"];
    const values = [row.date, row.route, row.grade, row.volume, row.priceUsd, row.counterparty, row.vessel||""];
    const escape = (s:any)=>`"${String(s??"").replace(/"/g,'""')}"`;
    const csv = headers.join(",")+ "\n" + values.map(escape).join(",");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixing_${row.id||"row"}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["/api/fixings"] });
  const { data: gradesData } = useQuery({ queryKey: ["/api/grades"] });
  const { data: vesselsData } = useQuery({ queryKey: ["/api/vessels"] });
  const rows = (data as any)?.data || []; const grades = (gradesData as any)?.data || []; const vessels = (vesselsData as any)?.data || [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ date: new Date().toISOString().slice(0,10), route: "", grade: "", volume: "", priceUsd: "", counterparty: "", vessel: "" });

  const mutate = useMutation({
    mutationFn: async (payload:any)=>{ const res = await fetch("/api/fixings",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) }); if(!res.ok) throw new Error("Failed to save fixing"); return res.json(); },
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["/api/fixings"]}); qc.invalidateQueries({queryKey:["/api/vessels"]}); setOpen(false); }
  });

  return (
    <div className="flex h-screen overflow-hidden bg-trading-dark">
      <Sidebar />
      <div className="flex-1 overflow-hidden flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Fixings</h2>
              <Button onClick={()=>{ setEditingId(null); setForm({ date:"", route:"", grade:"", volume:"", priceUsd:"", counterparty:"", vessel:"" }); setOpen(true); }} className="bg-trading-blue">Add Fixing</Button>
            </div>
            <Card className="bg-trading-slate border-gray-700">
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-300"><tr className="text-left">
                      <th className="py-2 px-3">Date</th><th className="py-2 px-3">Route</th><th className="py-2 px-3">Grade</th>
                      <th className="py-2 px-3">Volume</th><th className="py-2 px-3">Price (USD/MT)</th><th className="py-2 px-3">Counterparty</th><th className="py-2 px-3">Vessel</th><th className="py-2 px-3">Actions</th>
                    </tr></thead>
                    <tbody className="text-gray-200">
                      {rows.map((r:any)=>(
                        <tr key={r.id} className="border-t border-gray-700">
                          <td className="py-2 px-3">{r.date}</td><td className="py-2 px-3">{r.route}</td><td className="py-2 px-3">{r.grade}</td>
                          <td className="py-2 px-3">{r.volume}</td><td className="py-2 px-3">${r.priceUsd}</td><td className="py-2 px-3">{r.counterparty}</td><td className="py-2 px-3">{r.vessel || "—"}</td><td className="py-2 px-3">
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="icon" title="Export Excel (CSV)" onClick={()=>exportRowToCSV(r)}>
      <FileSpreadsheet className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" title="Modifier" onClick={()=>{ setForm(r); setEditingId(r.id); setOpen(true); }}>
      <Pencil className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" title="Dupliquer" onClick={()=>{ const {id, ...rest} = r; setForm(rest); setEditingId(null as any); setOpen(true); }}>
      <Copy className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" title="Supprimer" onClick={()=>delFixing.mutate(r.id)}>
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
          </div>
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-[680px]">
            <div className="text-lg font-semibold mb-3">{editingId ? "Edit Fixing" : "New Fixing"}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form, date:e.target.value})}/></div>
              <div><Label className="text-sm">Route</Label><Input value={form.route} onChange={e=>setForm({...form, route:e.target.value})} placeholder="MAL → TUN"/></div>
              <div><Label className="text-sm">Grade</Label>
                <select value={form.grade} onChange={e=>setForm({...form, grade:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-2 py-2">
                  <option value="">-- select --</option>
                  {grades.map((g:any)=>(<option key={g.id} value={g.name}>{g.name}</option>))}
                </select>
              </div>
              <div><Label className="text-sm">Volume</Label><Input value={form.volume} onChange={e=>setForm({...form, volume:e.target.value})} placeholder="5000 MT"/></div>
              <div><Label className="text-sm">Price (USD/MT)</Label><Input type="number" value={form.priceUsd} onChange={e=>setForm({...form, priceUsd:e.target.value})}/></div>
              <div><Label className="text-sm">Counterparty</Label><Input value={form.counterparty} onChange={e=>setForm({...form, counterparty:e.target.value})}/></div>
              <div className="col-span-2"><Label className="text-sm">Vessel</Label>
                <select value={form.vessel} onChange={e=>setForm({...form, vessel:e.target.value})} className="bg-gray-800 border border-gray-700 rounded px-2 py-2 w-full">
                  <option value="">-- select --</option>
                  {vessels.map((v:any)=>(<option key={v.id} value={v.name}>{v.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="bg-trading-blue" onClick={()=>saveFixing.mutate(form)}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
