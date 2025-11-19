import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Droplets, Flame, TestTube, Leaf, Save } from "lucide-react";

const iconMap: Record<string, any> = {
  "RBD Palm Oil": Droplets,
  "RBD Palm Stearin": Flame,
  "RBD Palm Olein IV56": TestTube,
  "Olein IV64": Leaf,
  "RBD PKO": Flame,
  "RBD CNO": Droplets,
  "CDSBO": Layers,
};

type Grade = {
  id: number;
  name: string;
  region?: string;      // conservé pour compat mais non affiché
  ffa?: string;
  moisture?: string;
  iv?: string;
  dobi?: string;
  freightUsd?: number;  // valeur sauvegardée côté serveur
};

const fetchJSON = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${text || ""}`);
  return JSON.parse(text);
};

export default function Grades() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["/api/grades"] });
  const grades: Grade[] = useMemo(() => (data as any)?.data || [], [data]);

  // brouillons locaux (par id de grade)
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const saveFreight = useMutation({
    mutationFn: async ({ id, freightUsd }: { id: number; freightUsd: number }) => {
      return fetchJSON(`/api/grades/${id}/freight`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freightUsd }),
      });
    },
    onSuccess: (_json, vars) => {
      // mise à jour immédiate du cache
      qc.setQueryData(["/api/grades"], (old: any) => {
        const prev: Grade[] = old?.data ?? [];
        const idx = prev.findIndex(g => g.id === vars.id);
        if (idx < 0) return old;
        const next = prev.slice();
        next[idx] = { ...next[idx], freightUsd: vars.freightUsd };
        return { data: next };
      });
    },
    onError: (e: any) => {
      alert(`Erreur lors de l'enregistrement du Freight:\n${e?.message || e}`);
    },
  });

  const handleSave = (id: number) => {
    const raw = drafts[id] ?? "";
    const val = Number(raw);
    if (!Number.isFinite(val)) {
      alert("Veuillez saisir un nombre valide pour Freight.");
      return;
    }
    saveFreight.mutate({ id, freightUsd: val });
  };

  return (
    <div className="min-h-screen bg-trading-dark text-white">
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <TopBar />
          <div className="p-6 space-y-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Oil Grades</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {grades.map((g) => {
                      const Icon = iconMap[g.name] || Layers;
                      const shown = drafts[g.id] ?? (g.freightUsd ?? "");
                      return (
                        <div key={g.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/60">
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-trading-blue" />
                            <div className="font-semibold">{g.name}</div>

                            {/* Champ FREIGHT (remplace la capsule pays) */}
                            <div className="ml-auto flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Freight"
                                aria-label="Freight"
                                className="h-7 w-28 bg-black/30 border-gray-700 text-white"
                                value={String(shown)}
                                onChange={(e) =>
                                  setDrafts((d) => ({ ...d, [g.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSave(g.id);
                                }}
                              />
                              <Button
                                size="sm"
                                className="h-7 px-2 bg-trading-blue"
                                onClick={() => handleSave(g.id)}
                                title="Save Freight"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-300">
                            <div><span className="text-gray-400">FFA:</span> {g.ffa || "—"}</div>
                            <div><span className="text-gray-400">Moisture:</span> {g.moisture || "—"}</div>
                            <div><span className="text-gray-400">IV:</span> {g.iv || "—"}</div>
                            <div><span className="text-gray-400">DOBI:</span> {g.dobi || "—"}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
