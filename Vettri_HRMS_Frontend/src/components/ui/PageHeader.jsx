export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="hz-page-header d-flex align-items-end justify-content-between flex-wrap gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="hz-page-header__eyebrow">{eyebrow}</p>}
        <h1 className="hz-page-header__title">{title}</h1>
        {description && <p className="hz-page-header__description">{description}</p>}
      </div>
      {actions && <div className="d-flex align-items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
