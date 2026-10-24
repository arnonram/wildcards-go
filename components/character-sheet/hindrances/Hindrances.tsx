import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { Hindrance } from '../../../dtos/Hindrance.dto';
import { cn } from '../../../helpers/cn';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { Textarea } from '../../ui/Textarea';

function HindranceRow({
  hindrance,
  onChange,
  onDelete,
}: {
  hindrance: Hindrance;
  onChange: (patch: Partial<Hindrance>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-line/60 py-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Field
          aria-label="Hindrance name"
          placeholder="New hindrance"
          variant="quiet"
          containerClassName="min-w-40 flex-1"
          value={hindrance.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <Checkbox
          id={`major-${hindrance._id}`}
          checked={hindrance.isMajor}
          onCheckedChange={(checked) => onChange({ isMajor: checked })}
          label="Major"
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
        <DeleteButton label={hindrance.name || 'hindrance'} onDelete={onDelete} />
      </div>

      {expanded && (
        <div className="mt-2 grid gap-2 pl-1 sm:grid-cols-2">
          <Field
            label="Blurb"
            variant="quiet"
            placeholder="One-line summary"
            value={hindrance.blurb ?? ''}
            onChange={(event) => onChange({ blurb: event.target.value })}
          />
          <Textarea
            label="Description"
            rows={2}
            value={hindrance.description ?? ''}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}

export default function Hindrances() {
  const { wildcardData, setWildcardData } = useWildcard();
  const hindrances = wildcardData.hindrances ?? [];

  const add = () => {
    setWildcardData((previous) => ({
      ...previous,
      hindrances: [...(previous.hindrances ?? []), new Hindrance('')],
    }));
  };

  const update = (index: number, patch: Partial<Hindrance>) => {
    setWildcardData((previous) => ({
      ...previous,
      hindrances: (previous.hindrances ?? []).map((hindrance, position) =>
        position === index ? { ...hindrance, ...patch } : hindrance,
      ),
    }));
  };

  const remove = (index: number) => {
    setWildcardData((previous) => ({
      ...previous,
      hindrances: (previous.hindrances ?? []).filter((_, position) => position !== index),
    }));
  };

  return (
    <Section
      id="hindrances"
      title="Hindrances"
      actions={
        <Button size="sm" variant="outline" onClick={add}>
          <Plus size={13} />
          Add
        </Button>
      }
    >
      {hindrances.length === 0 ? (
        <p className="py-3 text-sm text-faint">No hindrances yet.</p>
      ) : (
        hindrances.map((hindrance, index) => (
          <HindranceRow
            key={hindrance._id}
            hindrance={hindrance}
            onChange={(patch) => update(index, patch)}
            onDelete={() => remove(index)}
          />
        ))
      )}
    </Section>
  );
}
