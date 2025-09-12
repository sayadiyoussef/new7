import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Navires() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["/api/vessels"] });
  const rows = (data as any)?.data || [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ name: "", type: "Tanker", dwt: "", status: "Planned", eta: "", origin: "", destination: "" });

  const mutate = useMutation({
    mutationFn: async (payload:any)=>{ const res = await fetch("/api/vessels",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) }); if(!res.ok) throw new Error("Failed to save vessel"); return res.json(); },
    onSuccess: ()=>{ qc.invalidateQueries({queryKey:["/api/vessels"]}); setOpen(false); }
  });

  return (
    <div className="flex h-screen overflow-hidden bg-trading-dark">
      <Sidebar />
      <div className="flex-1 overflow-hidden flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Navires</h2>
              <Button onClick={()=>setOpen(true)} className="bg-trading-blue">Add Vessel</Button>
            </div>
            <Card className="bg-trading-slate border-gray-700">
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-300"><tr className="text-left">
                      <th className="py-2 px-3">Name</th><th className="py-2 px-3">Type</th><th className="py-2 px-3">DWT</th>
                      <th className="py-2 px-3">Status</th><th className="py-2 px-3">ETA</th><th className="py-2 px-3">Origin</th><th className="py-2 px-3">Destination</th>
                    </tr></thead>
                    <tbody className="text-gray-200">
                      {rows.map((r:any)=>(
                        <tr key={r.id} className="border-t border-gray-700">
                          <td className="py-2 px-3">{r.name}</td><td className="py-2 px-3">{r.type}</td><td className="py-2 px-3">{r.dwt}</td>
                          <td className="py-2 px-3">{r.status}</td><td className="py-2 px-3">{r.eta||"—"}</td><td className="py-2 px-3">{r.origin||"—"}</td><td className="py-2 px-3">{r.destination||"—"}</td>
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
            <div className="text-lg font-semibold mb-3">New Vessel</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm">Name</Label><Input value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/></div>
              <div><Label className="text-sm">Type</Label><Input value={form.type} onChange={e=>setForm({...form, type:e.target.value})}/></div>
              <div><Label className="text-sm">DWT</Label><Input type="number" value={form.dwt} onChange={e=>setForm({...form, dwt:e.target.value})}/></div>
              <div><Label className="text-sm">Status</Label><Input value={form.status} onChange={e=>setForm({...form, status:e.target.value})}/></div>
              <div><Label className="text-sm">ETA</Label><Input type="date" value={form.eta} onChange={e=>setForm({...form, eta:e.target.value})}/></div>
              <div><Label className="text-sm">Origin</Label><Input value={form.origin} onChange={e=>setForm({...form, origin:e.target.value})}/></div>
              <div><Label className="text-sm">Destination</Label><Input value={form.destination} onChange={e=>setForm({...form, destination:e.target.value})}/></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button className="bg-trading-blue" onClick={()=>mutate.mutate(form)}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
