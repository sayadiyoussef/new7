import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Droplets, Flame, TestTube, Leaf } from "lucide-react";

const iconMap: Record<string, any> = {
  "RBD Palm Oil": Droplets,
  "RBD Palm Stearin": Flame,
  "RBD Palm Olein IV56": TestTube,
  "Olein IV64": Leaf,
  "RBD PKO": Flame,
  "RBD CNO": Droplets,
  "CDSBO": Layers,
};

export default function Grades() {
  const { data, isLoading } = useQuery({ queryKey: ["/api/grades"] });
  const grades = (data as any)?.data || [];

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
                    {grades.map((g: any) => {
                      const Icon = iconMap[g.name] || Layers;
                      return (
                        <div key={g.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/60">
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-trading-blue" />
                            <div className="font-semibold">{g.name}</div>
                            <Badge className="ml-auto bg-gray-700 text-gray-200">{g.region || "—"}</Badge>
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
