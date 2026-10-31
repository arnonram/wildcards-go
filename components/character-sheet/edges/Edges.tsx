import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { Edge } from '../../../dtos/Edge';
import { cn } from '../../../helpers/cn';
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

  return (
    <div className="border-b border-line/60 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Field
          aria-label="Edge name"
          placeholder="New edge"
          variant="quiet"
          flush
          containerClassName="min-w-36 flex-1"
          value={edge.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <Field
          aria-label="Edge type"
          placeholder="Type"
          variant="quiet"
          containerClassName="w-28 shrink-0"
          value={edge.edgeType ?? ''}
          onChange={(event) => onChange({ edgeType: event.target.value })}
        />
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? 'Hide details' : 'Show details'}
          aria-expanded={expanded}
          className="rounded-[var(--radius)] p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
        <DeleteButton label={edge.name || 'edge'} onDelete={onDelete} />
      </div>

      {expanded && (
        <div className="mt-2 grid gap-2 pl-1">
          <Field
            label="Requirements"
            variant="quiet"
            placeholder="Novice, Agility d8…"
            value={edge.requirements ?? ''}
            onChange={(event) => onChange({ requirements: event.target.value })}
          />
          <Textarea
            label="Description"
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
      title="Edges"
      actions={
        <>
          <SortByNameButton
            items={edges}
            onSort={(sorted) => setWildcardData((previous) => ({ ...previous, edges: sorted }))}
            label="edges"
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus size={13} />
            Add
          </Button>
        </>
      }
    >
      {edges.length === 0 ? (
        <p className="py-3 text-sm text-faint">No edges yet.</p>
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
