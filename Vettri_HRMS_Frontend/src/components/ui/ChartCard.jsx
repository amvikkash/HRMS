import Card from './Card';

export default function ChartCard({ title, subtitle, actions, children, className = '', bodyClassName = '' }) {
  return <Card title={title} subtitle={subtitle} actions={actions} className={`hz-chart-card ${className}`.trim()} bodyClassName={`hz-chart-card__body ${bodyClassName}`.trim()}>{children}</Card>;
}
