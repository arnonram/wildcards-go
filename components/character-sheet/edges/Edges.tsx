import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { Edge } from '../../../dtos/Edge';
import { cn } from '../../../helpers/cn';
import { useTranslation } from '../../../helpers/context/locale-context';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { Button } from '../../ui/Button';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { Textarea } from '../../ui/Textarea';
import { SortByNameButton } from '../SortByNameButton';

function EdgeRow({
  edge,
  onChange,
  onDelete,
}: {
  edge: Edge;
  onChange: (patch: Partial<Edge>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="border-b border-line/60 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Field
          aria-label={t('sheet.edges.name')}
          placeholder={t('sheet.edges.namePlaceholder')}
          variant="quiet"
          flush
          containerClassName="min-w-36 flex-1"
          value={edge.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <Field
          aria-label={t('sheet.edges.type')}
          placeholder={t('sheet.edges.typePlaceholder')}
          variant="quiet"
          containerClassName="w-28 shrink-0"
          value={edge.edgeType ?? ''}
          onChange={(event) => onChange({ edgeType: event.target.value })}
        />
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={t(expanded ? 'common.hideDetails' : 'common.showDetails')}
          aria-expanded={expanded}
          className="rounded-[var(--radius)] p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
        <DeleteButton label={edge.name || t('sheet.edges.edge')} onDelete={onDelete} />
      </div>

      {expanded && (
        <div className="mt-2 grid gap-2 pl-1">
          <Field
            label={t('sheet.edges.requirements')}
            variant="quiet"
            placeholder={t('sheet.edges.requirementsPlaceholder')}
            value={edge.requirements ?? ''}
            onChange={(event) => onChange({ requirements: event.target.value })}
          />
          <Textarea
            label={t('common.description')}
            rows={2}
            value={edge.description ?? ''}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export default function Edges() {
  const { wildcardData, setWildcardData } = useWildcard();
  const { t } = useTranslation();
  const edges = wildcardData.edges ?? [];

  const add = () => {
    setWildcardData((previous) => ({
      ...previous,
      edges: [...(previous.edges ?? []), new Edge('')],
    }));
  };

  const update = (index: number, patch: Partial<Edge>) => {
    setWildcardData((previous) => ({
      ...previous,
      edges: (previous.edges ?? []).map((edge, position) =>
        position === index ? { ...edge, ...patch } : edge,
      ),
    }));
  };

  const remove = (index: number) => {
    setWildcardData((previous) => ({
      ...previous,
      edges: (previous.edges ?? []).filter((_, position) => position !== index),
    }));
  };

  return (
    <Section
      id="edges"
      title={t('section.edges')}
      actions={
        <>
          <SortByNameButton
            items={edges}
            onSort={(sorted) => setWildcardData((previous) => ({ ...previous, edges: sorted }))}
            label={t('sheet.edges.sortLabel')}
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus size={13} />
            {t('common.add')}
          </Button>
        </>
      }
    >
      {edges.length === 0 ? (
        <p className="py-3 text-sm text-faint">{t('sheet.edges.empty')}</p>
      ) : (
        edges.map((edge, index) => (
          <EdgeRow
            key={edge._id}
            edge={edge}
            onChange={(patch) => update(index, patch)}
            onDelete={() => remove(index)}
          />
        ))
      )}
    </Section>
  );
}
