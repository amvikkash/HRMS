function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = { sm: 28, md: 36, lg: 48, xl: 64 };

export default function Avatar({ name, size = 'md', src }) {
  const px = SIZES[size] || SIZES.md;
  const style = { width: px, height: px, fontSize: px * 0.38 };

  if (src) {
    return <img src={src} alt={name} className="hz-avatar" style={{ ...style, objectFit: 'cover' }} />;
  }

  return (
    <span className="hz-avatar" style={style}>
      {getInitials(name)}
    </span>
  );
}
