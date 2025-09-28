import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { DashboardData, StatementCycleData, CreditUtilizationData } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="brutalist-card p-4 bg-white">
        <p className="label font-bold">{`${label}`}</p>
        <p className="text-green-600">{`Income: $${payload[0].value.toFixed(2)}`}</p>
        <p className="text-red-600">{`Expenses: $${payload[1].value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};
const LoadingState = () => (
  <div className="p-6 h-[400px] space-y-4">
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-full w-full" />
  </div>
);
const ErrorState = ({ message }: { message: string }) => (
  <div className="p-6 h-[400px] flex flex-col items-center justify-center text-center">
    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
    <h3 className="text-xl font-bold">Could not load data</h3>
    <p className="text-muted-foreground">{message}</p>
  </div>
);
export function StatementVisualizerView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/dashboard-data');
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const result = await response.json();
        if (result.success) {
          // Add fill colors for pie chart
          const colors = ['#000000', '#333333', '#666666', '#999999'];
          const creditData = result.data.creditUtilization.map((item: CreditUtilizationData, index: number) => ({
            ...item,
            fill: colors[index % colors.length],
          }));
          setData({ ...result.data, creditUtilization: creditData });
        } else {
          throw new Error(result.error || 'An unknown error occurred');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  return (
    <div className="w-full max-w-7xl mx-auto space-y-12">
      <header>
        <h1 className="text-4xl md:text-6xl">Statement Visualizer</h1>
        <p className="text-lg text-muted-foreground mt-2">
          At-a-glance insights from your processed statements.
        </p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="brutalist-card">
          <div className="p-6 border-b-2 border-black">
            <h2 className="text-2xl font-bold">Statement-Cycle Intelligence</h2>
          </div>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {data && (
            <div className="p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.statementCycle}>
                  <XAxis dataKey="name" stroke="#000" tick={{ fontFamily: 'Inter', fontWeight: 'bold' }} />
                  <YAxis stroke="#000" tick={{ fontFamily: 'Inter' }} tickFormatter={(value) => `$${value/1000}k`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#FFFF00', fillOpacity: 0.3 }} />
                  <Legend wrapperStyle={{ fontFamily: 'Inter', fontWeight: 'bold' }} />
                  <Bar dataKey="income" fill="#00C49F" name="Income" barSize={30} />
                  <Bar dataKey="expenses" fill="#FF8042" name="Expenses" barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="brutalist-card">
          <div className="p-6 border-b-2 border-black">
            <h2 className="text-2xl font-bold">Credit Utilization by Card</h2>
          </div>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {data && (
            <div className="p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.creditUtilization}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.creditUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="#000" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ fontFamily: 'Inter' }}
                    contentStyle={{ border: '2px solid #000', borderRadius: 0, boxShadow: '4px 4px 0 #000', background: 'white' }}
                    formatter={(value) => [`$${(value as number).toFixed(2)}`, 'Balance']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}