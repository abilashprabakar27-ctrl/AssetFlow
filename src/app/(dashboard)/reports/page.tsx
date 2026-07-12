import { createClient } from '@/lib/supabase/server';
import { DepartmentChart } from './DepartmentChart';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = createClient();

  // Handshake 3 (Reports Query)
  const { data: chartRows, error } = await supabase.rpc('get_department_allocations_summary');

  let chartData: { name: string; total_allocations: number }[] = [];

  if (error || !chartRows) {
    // If RPC is missing or fails, we fallback to selecting from DB manually to keep the application functional
    console.warn('RPC function get_department_allocations_summary not found or failed, falling back to basic query:', error);
    
    // Fallback logic
    const { data: departments } = await supabase
      .from('departments')
      .select('id, name');
    
    const { data: allocations } = await supabase
      .from('allocations')
      .select('id, department_id');

    if (departments) {
      chartData = departments.map((dept: any) => {
        const count = allocations?.filter((a: any) => a.department_id === dept.id).length || 0;
        return {
          name: dept.name,
          total_allocations: count,
        };
      });
    }
  } else {
    chartData = (chartRows as { name: string; total_allocations: number | string }[]).map((row) => ({
      name: row.name,
      total_allocations: Number(row.total_allocations || 0),
    }));
  }

  return (
    <div className="container mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-gray-500">Visualization of hardware and software resources allocated by department.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Department-Wise Allocations</h2>
        <DepartmentChart data={chartData} />
      </div>
    </div>
  );
}
