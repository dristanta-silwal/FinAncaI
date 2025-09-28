import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DataIngestView } from '@/components/views/DataIngestView';
import { StatementVisualizerView } from '@/components/views/StatementVisualizerView';
import { AnalystReportView } from '@/components/views/AnalystReportView';
import { ViewName } from '@/lib/constants';
import { Toaster } from '@/components/ui/sonner';
export function HomePage() {
  const [currentView, setCurrentView] = useState<ViewName>('Data Ingest');
  const renderView = () => {
    switch (currentView) {
      case 'Data Ingest':
        return <DataIngestView />;
      case 'Statement Visualizer':
        return <StatementVisualizerView />;
      case 'Analyst Report':
        return <AnalystReportView />;
      default:
        return <DataIngestView />;
    }
  };
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="ml-[250px] p-8 md:p-12">
        {renderView()}
      </main>
      <Toaster />
    </div>
  );
}