import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Zap, Droplets, TestTube, Leaf, Flame } from "lucide-react";

const gradeIcons = {
  "RBD Palm Oil": Zap,
  "RBD Palm Stearin": Droplets,
  "RBD Palm Olein IV56": TestTube,
  "Olein IV64": Leaf,
  "RBD PKO": Flame,
  "RBD CNO": Zap,
  "CDSBO": Droplets,
};

const gradeColors = {
  "RBD Palm Oil": "from-trading-blue to-blue-500",
  "RBD Palm Stearin": "from-trading-amber to-orange-500",
  "RBD Palm Olein IV56": "from-purple-500 to-purple-600",
  "Olein IV64": "from-green-500 to-green-600",
  "RBD PKO": "from-red-500 to-red-600",
  "RBD CNO": "from-cyan-500 to-cyan-600",
  "CDSBO": "from-yellow-500 to-yellow-600",
};

export default function MarketTable() {
  const { data: marketData, isLoading, refetch } = useQuery({
    queryKey: ["/api/market/latest"],
  });

  const latestData = (marketData as any)?.data || [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatTndPrice = (usdPrice: number, usdTnd: number) => {
    const tndPrice = usdPrice * usdTnd;
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 2,
    }).format(tndPrice) + ' TND';
  };

  const renderChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <span className="flex items-center text-trading-green font-medium" data-testid="change-positive">
          <TrendingUp className="w-3 h-3 mr-1" />
          +{change.toFixed(1)}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-trading-red font-medium" data-testid="change-negative">
          <TrendingDown className="w-3 h-3 mr-1" />
          {change.toFixed(1)}%
        </span>
      );
    } else {
      return (
        <span className="flex items-center text-gray-400 font-medium" data-testid="change-neutral">
          <Minus className="w-3 h-3 mr-1" />
          0.0%
        </span>
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-trading-green/20 text-trading-green border-trading-green/20" data-testid="status-active">
            <div className="w-1.5 h-1.5 bg-trading-green rounded-full mr-1.5"></div>
            Active
          </Badge>
        );
      case 'limited':
        return (
          <Badge className="bg-trading-amber/20 text-trading-amber border-trading-amber/20" data-testid="status-limited">
            <div className="w-1.5 h-1.5 bg-trading-amber rounded-full mr-1.5"></div>
            Limited
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" data-testid="status-inactive">
            Inactive
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-trading-slate border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-white">
            Live Market Data
          </CardTitle>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">
              Last updated: <span className="text-white font-mono" data-testid="last-updated">
                {new Date().toLocaleTimeString()}
              </span>
            </span>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isLoading}
              data-testid="button-refresh-table"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Price (USD)
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Price (TND)
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Change 24h
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Volume
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                Array.from({ length: 7 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-32 bg-gray-700" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20 bg-gray-700" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24 bg-gray-700" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16 bg-gray-700" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16 bg-gray-700" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16 bg-gray-700" />
                    </td>
                  </tr>
                ))
              ) : latestData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No market data available
                  </td>
                </tr>
              ) : (
                latestData.map((item: any) => {
                  const IconComponent = gradeIcons[item.gradeName as keyof typeof gradeIcons] || Zap;
                  const gradientClass = gradeColors[item.gradeName as keyof typeof gradeColors] || "from-gray-500 to-gray-600";
                  
                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-gray-800/50 transition-colors"
                      data-testid={`row-${item.gradeId}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 bg-gradient-to-br ${gradientClass} rounded-lg flex items-center justify-center mr-3`}>
                            <IconComponent className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-white font-medium" data-testid={`grade-name-${item.gradeId}`}>
                            {item.gradeName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-white" data-testid={`price-usd-${item.gradeId}`}>
                        {formatPrice(item.priceUsd)}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-300" data-testid={`price-tnd-${item.gradeId}`}>
                        {formatTndPrice(item.priceUsd, item.usdTnd)}
                      </td>
                      <td className="px-6 py-4" data-testid={`change-${item.gradeId}`}>
                        {renderChangeIndicator(item.change24h || 0)}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-300" data-testid={`volume-${item.gradeId}`}>
                        {item.volume || 'N/A'}
                      </td>
                      <td className="px-6 py-4" data-testid={`status-${item.gradeId}`}>
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
