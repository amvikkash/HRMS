/**
 * The exact markup this replaces - `<label className="form-label"
 * style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>` - is
 * copy-pasted verbatim across at least four modal files today. One
 * component means one place to fix if the label style ever needs to
 * change, and a form built from these visually matches every other form
 * in the app automatically.
 *
 * Renders an <input>/<textarea> by default, or a <select> when `as="select"`
 * (pass <option> elements as children in that case, same as a native select).
 *
 * Usage:
 *   <FormField label="First Name" value={form.firstName} onChange={(v) => set('firstName', v)} required />
 *   <FormField as="select" label="Employment Type" value={form.employmentType} onChange={(v) => set('employmentType', v)}>
 *     <option value="FULL_TIME">Full-Time</option>
 *   </FormField>
 */
import { useId } from 'react';

export default function FormField({
  as = 'input',
  type = 'text',
  label,
  value,
  onChange,
  required = false,
  placeholder,
  rows,
  col,
  hint,
  error,
  children,
  ...rest
}) {
  const generatedId = useId();
  const controlId = rest.id || `hz-field-${generatedId.replace(/:/g, '')}`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const handleChange = (e) => onChange?.(e.target.value);

  const control =
    as === 'select' ? (
      <select id={controlId} className="form-select" value={value} onChange={handleChange} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...rest}>
        {children}
      </select>
    ) : as === 'textarea' ? (
      <textarea
        className="form-control"
        id={controlId}
        value={value}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        rows={rows || 3}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...rest}
      />
    ) : (
      <input
        type={type}
        className="form-control"
        id={controlId}
        value={value}
        onChange={handleChange}
        required={required}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...rest}
      />
    );

  const field = (
    <div className="mb-3">
      {label && (
        <label className="hz-form-label" htmlFor={controlId}>
          {label}
          {required && <span style={{ color: 'var(--hz-danger-500)' }}> *</span>}
        </label>
      )}
      {control}
      {hint && !error && <p id={hintId} className="hz-form-hint">{hint}</p>}
      {error && <p id={errorId} className="hz-form-error" role="alert">{error}</p>}
    </div>
  );

  return col ? <div className={`col-12 col-md-${col}`}>{field}</div> : field;
}
