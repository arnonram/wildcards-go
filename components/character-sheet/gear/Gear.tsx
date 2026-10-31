import { ChevronDown, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Gear } from '../../../dtos/Gear.dto';
import { cn } from '../../../helpers/cn';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { Button } from '../../ui/Button';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { SheetTable, Td, Th, Tr } from '../../ui/Table';
import { Textarea } from '../../ui/Textarea';
import { SortByNameButton } from '../SortByNameButton';

const COLUMN_COUNT = 4;

export default function GearList() {
  const { wildcardData, setWildcardData } = useWildcard();
  const gear = wildcardData.gear ?? [];
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const add = () => {
    setWildcardData((previous) => ({
      ...previous,
      gear: [...(previous.gear ?? []), new Gear('')],
    }));
  };

  const update = (id: string, patch: Partial<Gear>) => {
    setWildcardData((previous) => ({
      ...previous,
      gear: (previous.gear ?? []).map((item) => (item._id === id ? { ...item, ...patch } : item)),
    }));
  };

  const remove = (id: string) => {
    setWildcardData((previous) => ({
      ...previous,
      gear: (previous.gear ?? []).filter((item) => item._id !== id),
    }));
  };

  return (
    <Section
      id="gear"
      title="Gear"
      actions={
        <>
          <SortByNameButton
            items={gear}
            onSort={(sorted) => setWildcardData((previous) => ({ ...previous, gear: sorted }))}
            label="gear"
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus size={13} />
            Add
          </Button>
        </>
      }
    >
      {gear.length === 0 ? (
        <p className="py-3 text-sm text-faint">No gear yet.</p>
      ) : (
        <SheetTable>
          <thead>
            <tr>
              <Th className="min-w-32 sm:min-w-44">Name</Th>
              <Th className="w-16">Weight</Th>
              <Th className="w-16">Cost</Th>
              <Th className="w-12 sm:w-16">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {gear.map((item) => {
              const isOpen = expanded.has(item._id);
              return (
                <Fragment key={item._id}>
                  <Tr>
                    <Td>
                      <Field
                        aria-label="Gear name"
                        placeholder="Item name"
                        variant="quiet"
                        flush
                        value={item.name}
                        onChange={(event) => update(item._id, { name: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label="Weight"
                        type="number"
                        min={0}
                        variant="quiet"
                        value={item.weight ?? ''}
                        onChange={(event) =>
                          update(item._id, {
                            weight:
                              event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label="Cost"
                        type="number"
                        min={0}
                        variant="quiet"
                        value={item.cost ?? ''}
                        onChange={(event) =>
                          update(item._id, {
                            cost:
                              event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggle(item._id)}
                          aria-label={isOpen ? 'Hide gear details' : 'Show gear details'}
                          aria-expanded={isOpen}
                          className="rounded-[var(--radius)] p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform', isOpen && 'rotate-180')}
                          />
                        </button>
                        <DeleteButton
                          label={item.name || 'gear'}
                          onDelete={() => remove(item._id)}
                        />
                      </div>
                    </Td>
                  </Tr>

                  {isOpen && (
                    <tr>
                      <td
                        colSpan={COLUMN_COUNT}
                        className="border-b border-line/70 bg-surface-2/40 px-3 py-3"
                      >
                        <Textarea
                          label="Details"
                          rows={2}
                          value={item.details ?? ''}
                          onChange={(event) => update(item._id, { details: event.target.value })}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </SheetTable>
      )}
    </Section>
  );
}
