import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Save, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { permitsAPI } from '../api/client';
import { Breadcrumb } from '../components/Layout';
import useAuthStore from '../store/authStore';
import {
  Field, FieldGrid, YesNo, CheckPill, SectionLabel, Spinner, InfoHint,
} from '../components/FormElements';

// ── PPE items ─────────────────────────────────────────────────────────────
const PPE_ITEMS = [
  'Full Body Harness','Ear Plug','Goggle / Face shield','Dust Mask',
  'Hand Gloves (Chemical/ Heat/ Cut resistant/ Cotton / Electrically insulated)',
  'Apron & Leg Guard','Heat Resistant suit','Fitness Certificate',
  'Any other (Pl. specify) 1.','Any other (Pl. specify) 2.',
];

const WORK_TYPES = [
  'Hot work','Excavation/Civil work','Pipeline work','Confined space entry',
  'Height work (1.8m+)','Electrical','Emergency Machinery','Others',
];

// ── Initial form state ────────────────────────────────────────────────────
const INIT = {
  // Step 1
  validFrom: '', validTo: '', sNo: '', location: '',
  // Step 2
  workTypes: [], fireA: false, fireB: false, fireC: false, fireD: false,
  hazards: '', precautions: '', empResp: '',
  trainName: '', trainDesig: '', trainDept: '',
  legalName: '',
  entrant: '', attendant: '', supervisor: '',
  shiftHandover: '', personsNotified: '',
  // Step 3
  coName: '', contactPerson: '', mobile: '',
  startDate: '', endDate: '', shiftStart: '', shiftEnd: '',
  manpower: '', workDept: '', exactLoc: '',
  hra1: '', hra2: '', hra3: '',
  hraName: '', hraDate: '', conName: '', conDate: '', repName: '', repDate: '',
  // Step 4
  ppe: {},
  ppeOtherSpec1: '', // Specification for "Any other (Pl. specify) 1."
  ppeOtherSpec2: '', // Specification for "Any other (Pl. specify) 2."
  ppeApprName: '', ppeApprDate: '',
  copyIssuedBy: '', issuedDate: '',
  cmpContractor: '', cmpSiteIncharge: '', cmpPersonIssuing: '',
  // Step 5
  initName: '', initDate: '',
  hodUName: '', hodUDate: '',
  ehsName: '', ehsDate: '',
  hodFName: '', hodFDate: '',
};

const STEPS = [
  'Permit Info', 'Work Description', 'Contractor Details',
  'PPE & Safety','Review & Save', 
  // 'Approvals',
];

const FIRE_RISK_INFO = {
  fireA: 'Class A (Ordinary Combustibles)',
  fireB: 'Class B (Flammable Liquids)',
  fireC: 'Class C (Flammable Gases)',
  fireD: 'Class D (Combustible Metals)',
};

// ── Step panel wrapper ────────────────────────────────────────────────────
function StepPanel({ title, icon, children }) {
  return (
    <div className="panel-card">
      <div className="panel-card-header ">
        {icon ? <span>{icon}</span> : null}
        <h2>{title}</h2>
      </div>
      <div className="panel-card-body space-y-0">{children}</div>
    </div>
  );
}

// ── Progress tabs ─────────────────────────────────────────────────────────
function StepTabs({ current, total }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={i} className={`step-tab ${i === current ? 'active' : i < current ? 'done' : ''} cursor-default`}>
          <span className="num">{i < current ? '✓' : i + 1}</span>
          <span className="hidden sm:inline">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Review summary row ────────────────────────────────────────────────────
function RevRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1.5 border-b border-slate-50 text-sm">
      <span className="text-slate-400 w-44 flex-shrink-0 text-xs font-medium pt-0.5">{label}</span>
      <span className="text-slate-800 font-medium flex-1 text-xs">{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function PermitForm() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState(INIT);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [loadingSerial, setLoadingSerial] = useState(true);

  const set = useCallback((key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }, []);
  const setV = (e) => set(e.target.id || e.target.name, e.target.value);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (user?.approver_stages?.length) {
      toast.error('Approvers cannot create new permits.');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      empResp: user?.full_name || current.empResp,
      contactPerson: user?.full_name || current.contactPerson,
      mobile: user?.phone || current.mobile,
      workDept: user?.department || current.workDept,
      initName: user?.full_name || current.initName,
      initDate: current.initDate || new Date().toISOString().slice(0, 10),
      trainName: user?.full_name || current.trainName,
      trainDept: user?.department || current.trainDept,
    }));
  }, [user]);

  useEffect(() => {
    const loadNextSerial = async () => {
      setLoadingSerial(true);
      try {
        const { data } = await permitsAPI.nextSerial();
        setForm((current) => ({ ...current, sNo: data.serial_number || current.sNo }));
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to generate permit serial number.');
      } finally {
        setLoadingSerial(false);
      }
    };

    loadNextSerial();
  }, []);

  const toggleWorkType = (val) => {
    set('workTypes', form.workTypes.includes(val)
      ? form.workTypes.filter((v) => v !== val)
      : [...form.workTypes, val]);
  };

  const setPPE = (item, val) =>
    set('ppe', { ...form.ppe, [item]: form.ppe[item] === val ? '' : val });

  const validateStep = (stepIndex) => {
    const nextErrors = {};

    if (stepIndex === 0) {
      if (!form.validFrom) nextErrors.validFrom = 'Valid From is required.';
      if (!form.validTo) nextErrors.validTo = 'Valid To is required.';
      if (form.validFrom && form.validTo && form.validTo < form.validFrom) {
        nextErrors.validTo = 'Valid To cannot be earlier than Valid From.';
      }
      if (!form.sNo) nextErrors.sNo = 'Serial number is required.';
      if (!form.location.trim()) nextErrors.location = 'Location is required.';
    }

    if (stepIndex === 1 && form.workTypes.length === 0) {
      toast.error('Select at least one work type before moving on.');
      return false;
    }

    if (stepIndex === 2) {
      if (!form.coName.trim()) nextErrors.coName = 'Company name is required.';
      if (form.mobile && !/^\d{10,15}$/.test(form.mobile.trim())) {
        nextErrors.mobile = 'Phone number must contain only digits and be 10 to 15 digits long.';
      }
      if (form.startDate && form.endDate && form.endDate < form.startDate) {
        nextErrors.endDate = 'End Date cannot be earlier than Start Date.';
      }
      if (form.shiftStart && form.shiftEnd && form.shiftEnd <= form.shiftStart) {
        nextErrors.shiftEnd = 'Shift End must be later than Shift Start.';
      }
      if (form.manpower && (!/^\d+$/.test(form.manpower) || Number(form.manpower) <= 0)) {
        nextErrors.manpower = 'Manpower must be a positive whole number.';
      }
    }

    setErrors((current) => ({ ...current, ...nextErrors }));

    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fix the highlighted fields before continuing.');
      return false;
    }

    return true;
  };

  const validateAllSteps = () => [0, 1, 2].every((stepIndex) => validateStep(stepIndex));

  const next = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 5));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // ── Send JSON payload to Backend ───────────────────────────────────────
  const handleSave = async () => {
    if (!validateAllSteps()) {
      setStep(0);
      return;
    }
    setSaving(true);
    try {
      // Create a clean JSON payload mapping all required top-level fields
      // as well as sending the full raw form data for the backend to parse
      const payload = {
        serial_number: form.sNo,
        location: form.location,
        valid_from: form.validFrom || null,
        valid_to: form.validTo || null,
        form_data: form // Contains all the nested fields (PPE, Approvers, etc.)
      };

      // POST directly to Django. Since it's an object, Axios/Fetch will automatically 
      // set the Content-Type to application/json.
      const { data } = await permitsAPI.create(payload);

      toast.success(`Permit #${data.id || form.sNo} submitted successfully.`);
      navigate('/dashboard');
    } catch (err) {
      console.error('Permit save error:', err.response?.data || err.message);
      let msg = 'Failed to save permit.';
      
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.detail) {
          msg = err.response.data.detail;
        } else if (typeof err.response.data === 'object') {
          // Collect all validation errors
          const errors = Object.entries(err.response.data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join(' | ');
          msg = errors || msg;
        }
      }
      
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Field shorthand ───────────────────────────────────────────────────
  const F = (id, label, opts = {}) => (
    <Field id={id} label={label} required={opts.req} className={opts.cls} error={errors[id]}>
      {opts.textarea ? (
        <textarea id={id} value={form[id]} onChange={setV}
          className={`field-input ${errors[id] ? 'error' : ''}`} rows={3} placeholder={opts.ph || ''} disabled={opts.disabled} />
      ) : (
        <input id={id} type={opts.type || 'text'} value={form[id]}
          onChange={setV} className={`field-input ${errors[id] ? 'error' : ''}`} placeholder={opts.ph || ''} disabled={opts.disabled} />
      )}
    </Field>
  );

  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-5xl">
      <Breadcrumb items={[
        { to: '/dashboard', label: 'Dashboard' },
        { label: 'New Work Permit' },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Work Permit</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
        </div>
        {/* Progress bar */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-navy-700 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </span>
        </div>
      </div>

      <StepTabs current={step} total={STEPS.length} />

      {/* ═══ STEP 0 — Permit Info ══════════════════════════════════════ */}
      {step === 0 && (
        <StepPanel title="Permit Information" >
          <FieldGrid cols={4}>
            {F('validFrom', 'Valid From', { type: 'date', req: true })}
            {F('validTo',   'Valid To',   { type: 'date', req: true })}
            <div className="sm:col-span-2">
              {F('sNo', 'Serial No.', { req: true, disabled: true, ph: loadingSerial ? 'Generating...' : '' })}
            </div>
          </FieldGrid>
          <div className="mt-4">
            {F('location', 'Location of Work', { req: true, ph: 'Building / Floor / Area' })}
          </div>
        </StepPanel>
      )}

      {/* ═══ STEP 1 — Work Description ════════════════════════════════ */}
      {step === 1 && (
        <StepPanel title="Work Description">
          <SectionLabel>Type of Work — tick all that apply</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {WORK_TYPES.map((wt) => (
              <CheckPill key={wt} label={wt}
                checked={form.workTypes.includes(wt)}
                onChange={() => toggleWorkType(wt)} />
            ))}
          </div>
            <br />
          <SectionLabel>Fire Risk Evaluation (by Fire / Safety)</SectionLabel>
          <FieldGrid cols={4}>
            {['fireA', 'fireB', 'fireC', 'fireD'].map((id, idx) => (
              <div key={id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form[id]}
                      onChange={(e) => set(id, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-navy-700 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-slate-800">{String.fromCharCode(65 + idx)}</span>
                  </span>
                  <InfoHint text={FIRE_RISK_INFO[id]} />
                </label>
              </div>
            ))}
          </FieldGrid>
            <br />
          <SectionLabel>Work Details</SectionLabel>
          <FieldGrid cols={2}>
            {F('hazards',     'Potential Hazards',          { textarea: true })}
            {F('precautions', 'Precautions to be Taken',   { textarea: true })}
          </FieldGrid>
          <div className="mt-4">{F('empResp', 'Company Employee Responsible for the Work')}</div>
            <br />

          <SectionLabel>Specific Training Required (if Yes, specify)</SectionLabel>
          <FieldGrid cols={3}>
            {F('trainName',  'Name')}
            {F('trainDesig', 'Designation')}
            {F('trainDept',  'Dept.')}
          </FieldGrid>
            <br />

          <SectionLabel>Legal Requirements (Statutory)</SectionLabel>
          <FieldGrid cols={2}>
            {F('legalName', 'Name')}
          </FieldGrid>
            <br />

          <SectionLabel>For Confined Space Permit</SectionLabel>
          <FieldGrid cols={3}>
            {F('entrant',      'Entrant Name')}
            {F('attendant',    'Attendant Name')}
            {F('supervisor',   'Supervisor Name')}
          </FieldGrid>
            <br />

          <SectionLabel>Shift & Notifications</SectionLabel>
          <FieldGrid cols={2}>
            {F('shiftHandover',   'Shift Handover Requirements', { textarea: true })}
            {F('personsNotified', 'Persons to be Notified',      { textarea: true })}
          </FieldGrid>
        </StepPanel>
      )}

      {/* ═══ STEP 2 — Contractor Details ══════════════════════════════ */}
      {step === 2 && (
        <StepPanel title="Contractor & Work Area Details">
          <FieldGrid cols={3}>
            <div className="sm:col-span-3">{F('coName', 'Company Name', { req: true })}</div>
            {F('contactPerson', 'Contact Person')}
            {F('mobile',        'Mobile No.', { type: 'tel', ph: 'Digits only' })}
            <div/>
          </FieldGrid>
            <br />

          <SectionLabel>Work Duration</SectionLabel>
          <FieldGrid cols={4}>
            {F('startDate',  'Start Date', { type: 'date' })}
            {F('endDate',    'End Date',   { type: 'date' })}
            {F('shiftStart', 'Shift Start', { type: 'time' })}
            {F('shiftEnd',   'Shift End',   { type: 'time' })}
          </FieldGrid>
            <br />

          <SectionLabel>Work Area</SectionLabel>
          <FieldGrid cols={3}>
            {F('manpower', 'Manpower Count', { type: 'number' })}
            {F('workDept', 'Department')}
            {F('exactLoc', 'Exact Location')}
          </FieldGrid>
            <br />

          <SectionLabel>To be checked by HRA (at units) and Facility Management (at Corporate)</SectionLabel>
          {[
            ['hra1', 'Copy of registration – Contract Labour (Regulation & Abolition) Act 1970'],
            ['hra2', 'Copy of registration – Employees Provident Funds Act 1952'],
            ['hra3', 'Copy of registration – Employees State Insurance (ESI) Act 1948'],
          ].map(([id, label]) => (
            <div key={id} className="flex items-center justify-between gap-4 py-2.5
                                     border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-600 flex-1">{label}</span>
              <YesNo id={id} value={form[id]} onChange={(v) => set(id, v)} />
            </div>
          ))}
            <br />

          <SectionLabel>HRA Verification</SectionLabel>
          <FieldGrid cols={3}>
            {F('hraName', 'Name')}
            {F('hraDate', 'Date', { type: 'date' })}
          </FieldGrid>
            <br />

          <SectionLabel>Acceptance by Contractor</SectionLabel>
          <FieldGrid cols={3}>
            {F('conName', 'Name')}
            {F('conDate', 'Date', { type: 'date' })}
          </FieldGrid>
            <br />

          <SectionLabel>Acceptance by Person on Report</SectionLabel>
          <FieldGrid cols={3}>
            {F('repName', 'Name')}
            {F('repDate', 'Date', { type: 'date' })}
          </FieldGrid>
        </StepPanel>
      )}

      {/* ═══ STEP 3 — PPE & Safety ════════════════════════════════════ */}
      {step === 3 && (
        <>
          <StepPanel title="Precautionary measures recommended by Incharge Security & Safety / Facility Management">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5
                            text-xs text-blue-700 mb-4">
              Select <strong>Yes</strong> or <strong>No</strong> for each PPE item.
            </div>
            <div className="divide-y divide-slate-100">
              {PPE_ITEMS.map((item) => (
                <div key={item}>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sm text-slate-700 flex-1">{item}</span>
                    <YesNo id={item} value={form.ppe[item] || ''}
                      onChange={(v) => setPPE(item, v)} />
                  </div>
                  {/* Show input box for "Any other (Pl. specify)" items when Yes is selected */}
                  {item === 'Any other (Pl. specify) 1.' && form.ppe[item] === 'Yes' && (
                    <div className="pl-4 pr-2 pb-3">
                      <input
                        type="text"
                        id="ppeOtherSpec1"
                        value={form.ppeOtherSpec1}
                        onChange={setV}
                        placeholder="Please specify..."
                        className="field-input text-sm"
                      />
                    </div>
                  )}
                  {item === 'Any other (Pl. specify) 2.' && form.ppe[item] === 'Yes' && (
                    <div className="pl-4 pr-2 pb-3">
                      <input
                        type="text"
                        id="ppeOtherSpec2"
                        value={form.ppeOtherSpec2}
                        onChange={setV}
                        placeholder="Please specify..."
                        className="field-input text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* <SectionLabel>PPE Approved By</SectionLabel>
            <FieldGrid cols={3}>
              {F('ppeApprName', 'Name')}
              {F('ppeApprDate', 'Date', { type: 'date' })}
            </FieldGrid> */}
          </StepPanel>
        </>
      )}

      {/* ═══ STEP 4 — Approvals ═══════════════════════════════════════ */}
      {/* {step === 4 && (
        <StepPanel title="Approvals">
          {[
            ['Initiator / User Dept.',            'init'],
            ['HOD User Dept.',                    'hodU'],
            ['EHS Representative',                'ehs' ],
            ['HOD Facility Management / Unit Head','hodF'],
          ].map(([title_, prefix]) => (
            <div key={prefix}>
              <SectionLabel>{title_}</SectionLabel>
              <FieldGrid cols={2}>
                {F(`${prefix}Name`, 'Name')}
                {F(`${prefix}Date`, 'Date', { type: 'date' })}
              </FieldGrid>
            </div>
          ))}
        </StepPanel>
      )} */}

      {/* ═══ STEP 5 — Review & Save ═══════════════════════════════════ */}
      {step === 4 && (
        <div className="panel-card">
          <div className="panel-card-header">
            <FileText size={14} />
            <h2>Review &amp; Save</h2>
          </div>
          <div className="panel-card-body">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3
                            text-xs text-amber-700 mb-5">
              Review your entries below. Clicking <strong>Submit Permit</strong> will
              generate the PDF, save it to the database, and send the permit into the approval workflow.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Permit</p>
                <RevRow label="Serial No."  value={form.sNo} />
                <RevRow label="Location"    value={form.location} />
                <RevRow label="Valid From"  value={form.validFrom} />
                <RevRow label="Valid To"    value={form.validTo} />
                <RevRow label="Work Types"  value={form.workTypes.join(', ')} />
                <div className="border-t border-slate-100 mt-3 pt-3">
                  <p className="text-[10px] font-semibold text-slate-600 mb-2">Fire Risk Evaluation</p>
                  <div className="flex gap-2 text-xs">
                    {['fireA', 'fireB', 'fireC', 'fireD'].map((id, idx) => (
                      <span key={id} className={`px-2 py-1 rounded ${form[id] ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                        Col {String.fromCharCode(65 + idx)}: {form[id] ? '✓' : '○'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Contractor</p>
                <RevRow label="Company"       value={form.coName} />
                <RevRow label="Contact"       value={form.contactPerson} />
                <RevRow label="Mobile"        value={form.mobile} />
                <RevRow label="Work Duration" value={`${form.startDate} → ${form.endDate}`} />
                <RevRow label="Manpower"      value={form.manpower} />
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">PPE</p>
                {PPE_ITEMS.map((item) => form.ppe[item] && (
                  <div key={item}>
                    <RevRow label={item} value={form.ppe[item]} />
                    {item === 'Any other (Pl. specify) 1.' && form.ppeOtherSpec1 && (
                      <RevRow label="  └─ Specification" value={form.ppeOtherSpec1} />
                    )}
                    {item === 'Any other (Pl. specify) 2.' && form.ppeOtherSpec2 && (
                      <RevRow label="  └─ Specification" value={form.ppeOtherSpec2} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Approvals</p>
                <RevRow label="Initiator"    value={`${form.initName} — ${form.initDate}`} />
                <RevRow label="HOD User"     value={`${form.hodUName} — ${form.hodUDate}`} />
                <RevRow label="EHS Rep."     value={`${form.ehsName}  — ${form.ehsDate}`} />
                <RevRow label="HOD Facility" value={`${form.hodFName} — ${form.hodFDate}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={back} disabled={step === 0}
          className="btn-secondary btn-md disabled:opacity-0">
          <ChevronLeft size={15} /> Back
        </button>

        {step < 4 ? (
          <button onClick={next} className="btn-primary btn-md">
            Next <ChevronRight size={15} />
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-md">
            {saving ? <Spinner size={4} /> : <Save size={15} />}
            {saving ? 'Submitting…' : 'Submit Permit'}
          </button>
        )}
      </div>
    </div>
  );
}