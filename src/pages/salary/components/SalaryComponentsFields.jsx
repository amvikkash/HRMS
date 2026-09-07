const EARNING_FIELDS = [
  { key: 'basicSalary', label: 'Basic Salary' },
  { key: 'hra', label: 'HRA' },
  { key: 'specialAllowance', label: 'Special Allowance' },
  { key: 'medicalAllowance', label: 'Medical Allowance' },
  { key: 'travelAllowance', label: 'Travel Allowance' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'incentives', label: 'Incentives' },
  { key: 'overtime', label: 'Overtime' },
];

const DEDUCTION_FIELDS = [
  { key: 'pf', label: 'PF' },
  { key: 'esi', label: 'ESI' },
  { key: 'professionalTax', label: 'Professional Tax' },
  { key: 'tds', label: 'TDS' },
  { key: 'otherDeductions', label: 'Other Deductions' },
];

function AmountField({ label, value, onChange }) {
  return (
    <div className="col-6 col-md-4">
      <label className="hz-form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
        {label}
      </label>
      <div className="input-group">
        <span className="input-group-text" style={{ background: 'var(--hz-gray-50)', color: 'var(--hz-text-muted)', fontSize: 13 }}>
          ₹
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          className="form-control"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      </div>
    </div>
  );
}

/** Renders the 13 earning/deduction fields and calls onChange(key, value) as they're edited. `components` is a flat { key: number } object. */
export default function SalaryComponentsFields({ components, onChange }) {
  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <p className="text-uppercase mb-2" style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--hz-text-muted)', fontWeight: 600 }}>
          Earnings
        </p>
        <div className="row g-3">
          {EARNING_FIELDS.map((f) => (
            <AmountField key={f.key} label={f.label} value={components[f.key] ?? 0} onChange={(v) => onChange(f.key, v)} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-uppercase mb-2" style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--hz-text-muted)', fontWeight: 600 }}>
          Deductions
        </p>
        <div className="row g-3">
          {DEDUCTION_FIELDS.map((f) => (
            <AmountField key={f.key} label={f.label} value={components[f.key] ?? 0} onChange={(v) => onChange(f.key, v)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function computeTotals(components) {
  const gross = EARNING_FIELDS.reduce((sum, f) => sum + Number(components[f.key] || 0), 0);
  const deductions = DEDUCTION_FIELDS.reduce((sum, f) => sum + Number(components[f.key] || 0), 0);
  return { gross, deductions, net: gross - deductions };
}

export const EMPTY_COMPONENTS = Object.fromEntries([...EARNING_FIELDS, ...DEDUCTION_FIELDS].map((f) => [f.key, 0]));
