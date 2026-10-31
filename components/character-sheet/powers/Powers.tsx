import { ChevronDown, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Power } from '../../../dtos/Power.dto';
import { cn } from '../../../helpers/cn';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { Button } from '../../ui/Button';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { Stepper } from '../../ui/Stepper';
import { SheetTable, Td, Th, Tr } from '../../ui/Table';
import { Textarea } from '../../ui/Textarea';
import { SortByNameButton } from '../SortByNameButton';

const COLUMN_COUNT = 5;
const compactField = 'px-1.5 sm:px-2.5';
const compactContainer = '-mx-1 sm:mx-0';

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function Powers() {
  const { wildcardData, setWildcardData, update } = useWildcard();
  const powers = wildcardData.powers ?? [];
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const maxPowerPoints = toNumber(wildcardData.maxPowerPoints);
  const currentPowerPoints = Math.min(maxPowerPoints, toNumber(wildcardData.currentPowerPoints));

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
      powers: [...(previous.powers ?? []), new Power('')],
    }));
  };

  const updatePower = (id: string, patch: Partial<Power>) => {
    setWildcardData((previous) => ({
      ...previous,
      powers: (previous.powers ?? []).map((power) =>
        power._id === id ? { ...power, ...patch } : power,
      ),
    }));
  };

  const remove = (id: string) => {
    setWildcardData((previous) => ({
      ...previous,
      powers: (previous.powers ?? []).filter((power) => power._id !== id),
    }));
  };

  return (
    <Section
      id="powers"
      title="Powers"
      actions={
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              <span className="sm:hidden">Max</span>
              <span className="hidden sm:inline">Max PP</span>
            </span>
            <Stepper
              label="Max power points"
              value={maxPowerPoints}
              min={0}
              max={99}
              onChange={(value) =>
                update({
                  maxPowerPoints: value,
                  currentPowerPoints: Math.min(currentPowerPoints, value),
                })
              }
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              <span className="sm:hidden">Cur</span>
              <span className="hidden sm:inline">Current</span>
            </span>
            <Stepper
              label="Current power points"
              value={currentPowerPoints}
              min={0}
              max={maxPowerPoints}
              onChange={(value) => update({ currentPowerPoints: value })}
            />
          </div>
          <SortByNameButton
            items={powers}
            onSort={(sorted) => setWildcardData((previous) => ({ ...previous, powers: sorted }))}
            label="powers"
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus size={13} />
            Add
          </Button>
        </div>
      }
    >
      {powers.length === 0 ? (
        <p className="py-3 text-sm text-faint">No powers yet.</p>
      ) : (
        <SheetTable className="table-fixed">
          <thead>
            <tr>
              <Th>Name</Th>
              <Th className="w-11 sm:w-16">PP</Th>
              <Th className="w-20 sm:w-32">Range</Th>
              <Th className="w-[4.25rem] max-[379px]:hidden sm:w-24">Duration</Th>
              <Th className="w-14 sm:w-16">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {powers.map((power) => {
              const isOpen = expanded.has(power._id);
              return (
                <Fragment key={power._id}>
                  <Tr>
                    <Td>
                      <Field
                        aria-label="Power name"
                        placeholder="Power name"
                        variant="quiet"
                        flush
                        value={power.name}
                        onChange={(event) => updatePower(power._id, { name: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label="Power points"
                        placeholder="—"
                        variant="quiet"
                        className={compactField}
                        containerClassName={compactContainer}
                        value={power.pp ?? ''}
                        onChange={(event) => updatePower(power._id, { pp: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label="Range"
                        placeholder="—"
                        variant="quiet"
                        className={compactField}
                        containerClassName={compactContainer}
                        value={power.range ?? ''}
                        onChange={(event) => updatePower(power._id, { range: event.target.value })}
                      />
                    </Td>
                    <Td className="max-[379px]:hidden">
                      <Field
                        aria-label="Duration"
                        placeholder="—"
                        type="number"
                        variant="quiet"
                        className={compactField}
                        containerClassName={compactContainer}
                        value={power.duration ?? ''}
                        onChange={(event) =>
                          updatePower(power._id, {
                            duration:
                              event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td className="px-1 sm:px-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggle(power._id)}
                          aria-label={isOpen ? 'Hide power details' : 'Show power details'}
                          aria-expanded={isOpen}
                          className="rounded-[var(--radius)] p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform', isOpen && 'rotate-180')}
                          />
                        </button>
                        <DeleteButton
                          label={power.name || 'power'}
                          onDelete={() => remove(power._id)}
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
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                          <Field
                            label="Duration"
                            type="number"
                            containerClassName="col-span-2 hidden max-[379px]:block"
                            value={power.duration ?? ''}
                            onChange={(event) =>
                              updatePower(power._id, {
                                duration:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Textarea
                            label="Effect"
                            rows={2}
                            containerClassName="col-span-2"
                            value={power.effect ?? ''}
                            onChange={(event) =>
                              updatePower(power._id, { effect: event.target.value })
                            }
                          />
                          <Textarea
                            label="Notes"
                            rows={2}
                            containerClassName="col-span-2"
                            value={power.comments ?? ''}
                            onChange={(event) =>
                              updatePower(power._id, { comments: event.target.value })
                            }
                          />
                        </div>
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
