import { Calendar, Building2, User, Shield } from 'lucide-react';
import PermitStatusBadge from '../PermitStatusBadge';

const PPE_ITEMS = [
  'Full Body Harness', 'Ear Plug', 'Goggle / Face shield', 'Dust Mask',
  'Hand Gloves (Chemical/ Heat/ Cut resistant/ Cotton / Electrically insulated)',
  'Apron & Leg Guard', 'Heat Resistant suit', 'Fitness Certificate',
  'Any other (Pl. specify) 1.', 'Any other (Pl. specify) 2.',
];

function InfoCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Icon size={15} className="text-navy-700" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 text-xs w-40 flex-shrink-0 pt-0.5 font-medium">{label}</span>
      <span className="text-slate-800 font-medium text-xs flex-1">{value}</span>
    </div>
  );
}

export function PermitApprovalTimeline({ permit }) {
  const logs = permit.approval_logs || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Workflow Activity</p>
          <p className="text-sm text-slate-500 mt-1">Track who approved or reinitiated this permit and when.</p>
        </div>
        <PermitStatusBadge status={permit.status} size="sm" />
      </div>

      {permit.rejection_reason && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-xs font-semibold text-red-700">Latest reinitiation reason</p>
          <p className="mt-1 text-sm text-red-600">{permit.rejection_reason}</p>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-slate-500">No approval activity has been recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Stage {log.stage} {log.action === 'rejected' ? 'Reinitiated' : log.action_display}
                  </p>
                  <p className="text-xs text-slate-500">
                    {log.approver_name} {log.approver_email ? `(${log.approver_email})` : ''}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
              {log.reason && <p className="mt-2 text-sm text-slate-600">{log.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PermitReviewContent({ permit }) {
  const fd = permit.form_data || {};

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard icon={Calendar} title="Permit Details">
          <Row label="Serial No." value={permit.serial_number} />
          <Row label="Location" value={permit.location} />
          <Row label="Valid From" value={permit.valid_from} />
          <Row label="Valid To" value={permit.valid_to} />
          <Row label="Work Types" value={(fd.workTypes || []).join(', ')} />
          <Row label="Status" value={permit.status_display} />
        </InfoCard>

        <InfoCard icon={Building2} title="Contractor Details">
          <Row label="Company" value={fd.coName} />
          <Row label="Contact Person" value={fd.contactPerson} />
          <Row label="Mobile" value={fd.mobile} />
          <Row label="Start Date" value={fd.startDate} />
          <Row label="End Date" value={fd.endDate} />
          <Row label="Shift Start" value={fd.shiftStart} />
          <Row label="Shift End" value={fd.shiftEnd} />
          <Row label="Manpower" value={fd.manpower} />
          <Row label="Department" value={fd.workDept} />
          <Row label="Exact Location" value={fd.exactLoc} />
        </InfoCard>

        <InfoCard icon={Shield} title="PPE Requirements">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {PPE_ITEMS.map((item) => {
              const value = (fd.ppe || {})[item];
              if (!value) return null;
              return (
                <div key={item} className="flex items-center gap-2 text-xs">
                  <span className={`w-8 text-center py-0.5 rounded-full font-bold text-[9px] ${value === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {value}
                  </span>
                  <span className="text-slate-600 leading-tight">{item}</span>
                </div>
              );
            })}
          </div>
        </InfoCard>

        <InfoCard icon={User} title="Approvals on Form">
          <Row label="Initiator" value={`${fd.initName || '—'} — ${fd.initDate || '—'}`} />
          <Row label="HOD User" value={`${fd.hodUName || '—'} — ${fd.hodUDate || '—'}`} />
          <Row label="EHS Rep." value={`${fd.ehsName || '—'} — ${fd.ehsDate || '—'}`} />
          <Row label="HOD Facility" value={`${fd.hodFName || '—'} — ${fd.hodFDate || '—'}`} />
          <Row label="HRA Verified By" value={fd.hraName} />
          <Row label="HRA Date" value={fd.hraDate} />
        </InfoCard>
      </div>

      {(fd.hazards || fd.precautions) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {fd.hazards && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Potential Hazards</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{fd.hazards}</p>
            </div>
          )}
          {fd.precautions && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Precautions</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{fd.precautions}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
