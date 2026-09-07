import { Check, ChevronDown, Download } from 'lucide-react';
import { useState } from 'react';
import Button from './Button';

export default function ExportMenu({ options = [{ label: 'Export CSV', value: 'csv' }], onExport, disabled = false }) {
  const [open, setOpen] = useState(false);

  function choose(option) {
    setOpen(false);
    onExport?.(option.value, option);
  }

  return (
    <div className="hz-export-menu">
      <Button icon={Download} variant="secondary" size="sm" disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        Export <ChevronDown size={14} aria-hidden="true" />
      </Button>
      {open && (
        <div className="hz-export-menu__popover" role="menu">
          {options.map((option) => (
            <button type="button" role="menuitem" key={option.value} onClick={() => choose(option)}>
              {option.icon ? <option.icon size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
