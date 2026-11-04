import { MainLayout } from '@/components/layout/MainLayout';
import { ReservoirMap } from '@/components/map/ReservoirMap';
import { Button } from '@/components/ui/button';
import { Download, Maximize2, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function MapPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Map View</h1>
          <p className="text-muted-foreground">Interactive map with reservoirs, employees, and data entries</p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  <Info className="h-4 w-4 mr-2" />
                  Help
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs space-y-2 text-sm">
                  <p><strong>Click markers</strong> to view details</p>
                  <p><strong>Search</strong> to filter reservoirs</p>
                  <p><strong>Toggle layers</strong> to show/hide features</p>
                  <p><strong>Use 3D mode</strong> for better visualization</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <ReservoirMap />
    </div>
  );
}
