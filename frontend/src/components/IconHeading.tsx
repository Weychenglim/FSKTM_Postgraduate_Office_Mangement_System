import React from 'react';

/** Keep the icon centred on the title row; supporting text gets its own row. */
export function IconHeading({ icon, title, description, as: Heading = 'h2', titleId,
  titleClassName = 'section-label', descriptionClassName = 'card-description mt-1', className = '',
}: {
  icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode;
  as?: 'h2' | 'h3' | 'h4'; titleId?: string; titleClassName?: string;
  descriptionClassName?: string; className?: string;
}) {
  const column = icon ? 'col-start-2' : 'col-start-1';
  return <div className={`grid min-w-0 items-center ${icon ? 'grid-cols-[auto_minmax(0,1fr)] gap-x-3' : 'grid-cols-1'} ${className}`}>
    {icon ? <div aria-hidden="true" className="col-start-1 row-start-1 flex items-center">{icon}</div> : null}
    <Heading id={titleId} className={`row-start-1 min-w-0 break-words ${column} ${titleClassName}`}>{title}</Heading>
    {description ? <p className={`row-start-2 min-w-0 break-words ${column} ${descriptionClassName}`}>{description}</p> : null}
  </div>;
}
