export default function PermitStatsBar({ permits }) {
  const tiles = [
    { label: 'Total', value: permits.length, color: 'bg-navy-50 text-navy-700' },
    { label: 'Stage 1', value: permits.filter((permit) => permit.status === 'stage_1').length, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Stage 2', value: permits.filter((permit) => permit.status === 'stage_2').length, color: 'bg-orange-50 text-orange-700' },
    { label: 'Reinitiated', value: permits.filter((permit) => permit.status === 'stage_1_rejected' || permit.status === 'stage_2_rejected').length, color: 'bg-red-50 text-red-700' },
    { label: 'Approved', value: permits.filter((permit) => permit.status === 'approved').length, color: 'bg-green-50 text-green-700' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {tiles.map(({ label, value, color }) => (
        <div key={label} className={`rounded-xl p-4 ${color} border border-current/10`}>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs font-medium mt-1 opacity-70">{label}</p>
        </div>
      ))}
    </div>
  );
}
