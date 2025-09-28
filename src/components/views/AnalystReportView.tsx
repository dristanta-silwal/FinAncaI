import { useEffect, useState } from 'react';
import { Lightbulb, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Insight, Report } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
const InsightIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'Anomaly':
      return <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />;
    case 'Suggestion':
      return <Lightbulb className="w-6 h-6 text-blue-500 flex-shrink-0" />;
    case 'Observation':
      return <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />;
    default:
      return null;
  }
};
const LoadingState = ({ count = 3 }: { count?: number }) => (
  <div className="p-4 space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-start gap-4 p-3 border-2 border-black">
        <Skeleton className="w-6 h-6 rounded-full" />
        <div className="space-y-2 flex-grow">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    ))}
  </div>
);
const ErrorState = ({ message }: { message: string }) => (
  <div className="p-4 text-center">
    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
    <p className="text-muted-foreground">{message}</p>
  </div>
);
export function AnalystReportView() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [report, setReport] = useState<string>('');
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setInsightsLoading(true);
        const response = await fetch('/api/insights');
        if (!response.ok) throw new Error('Failed to fetch insights');
        const result = await response.json();
        if (result.success) setInsights(result.data);
        else throw new Error(result.error);
      } catch (err) {
        setInsightsError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setInsightsLoading(false);
      }
    };
    const fetchReport = async () => {
      try {
        setReportLoading(true);
        const response = await fetch('/api/report');
        if (!response.ok) throw new Error('Failed to fetch report');
        const result = await response.json();
        if (result.success) setReport(result.data.report);
        else throw new Error(result.error);
      } catch (err) {
        setReportError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setReportLoading(false);
      }
    };
    fetchInsights();
    fetchReport();
  }, []);
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12">
      <header>
        <h1 className="text-4xl md:text-6xl">Analyst Report</h1>
        <p className="text-lg text-muted-foreground mt-2">
          AI-generated insights and comprehensive monthly reports.
        </p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 brutalist-card">
          <div className="p-6 border-b-2 border-black flex justify-between items-center">
            <h2 className="text-2xl font-bold">Monthly Report</h2>
            <button className="brutalist-button brutalist-button-yellow" disabled={reportLoading || !!reportError}>
              Generate PDF
            </button>
          </div>
          <div className="p-6 prose-lg max-w-none prose-headings:font-mono prose-headings:uppercase prose-p:font-sans prose-strong:font-bold">
            {reportLoading && (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/3 mt-4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            )}
            {reportError && <ErrorState message={reportError} />}
            {!reportLoading && !reportError && (
              <pre className="bg-gray-100 p-4 border-2 border-black whitespace-pre-wrap font-sans text-base">
                <code>{report}</code>
              </pre>
            )}
          </div>
        </div>
        <div className="brutalist-card">
          <div className="p-6 border-b-2 border-black">
            <h2 className="text-2xl font-bold">Recent Insights</h2>
          </div>
          {insightsLoading && <LoadingState count={4} />}
          {insightsError && <ErrorState message={insightsError} />}
          {!insightsLoading && !insightsError && (
            <div className="p-4 space-y-4">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <div key={insight.id} className="flex items-start gap-4 p-3 border-2 border-black">
                    <InsightIcon type={insight.type} />
                    <div>
                      <p className="font-bold">{insight.type}</p>
                      <p className="text-muted-foreground">{insight.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-muted-foreground">No new insights found.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}