import { ChevronDown, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Armor } from '../../../dtos/Armor.dto';
import { ArmorLocations } from '../../../dtos/wildcards-consts';
import { cn } from '../../../helpers/cn';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { SheetTable, Td, Th, Tr } from '../../ui/Table';
import { Textarea } from '../../ui/Textarea';
import { SortByNameButton } from '../SortByNameButton';
import ArmorLocationSelect from './ArmorLocationSelect';

const COLUMN_COUNT = 6;

export default function Armors() {
  const { wildcardData, setWildcardData } = useWildcard();
  const armors = wildcardData.armors ?? [];
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
    const armor = new Armor('');
    armor.locations = ArmorLocations.Torso;
    setWildcardData((previous) => ({
      ...previous,
      armors: [...(previous.armors ?? []), armor],
    }));
  };

  const update = (id: string, patch: Partial<Armor>) => {
    setWildcardData((previous) => ({
      ...previous,
      armors: (previous.armors ?? []).map((armor) =>
        armor._id === id ? { ...armor, ...patch } : armor,
      ),
    }));
  };

  const remove = (id: string) => {
    setWildcardData((previous) => ({
      ...previous,
      armors: (previous.armors ?? []).filter((armor) => armor._id !== id),
    }));
  };

  return (
    <Section
      id="armor"
      title="Armor & Shields"
      actions={
        <>
          <SortByNameButton
            items={armors}
            onSort={(sorted) => setWildcardData((previous) => ({ ...previous, armors: sorted }))}
            label="armors"
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus size={13} />
            Add
          </Button>
        </>
      }
    >
      {armors.length === 0 ? (
        <p className="py-3 text-sm text-faint">No armor or shields yet.</p>
      ) : (
        <SheetTable>
          <thead>
            <tr>
              <Th className="w-12">
                <span className="sr-only">Equipped</span>
              </Th>
              <Th className="min-w-24 sm:min-w-40">Name</Th>
              <Th className="hidden w-16 sm:table-cell">Bonus</Th>
              <Th className="w-28 sm:w-44">Location</Th>
              <Th className="hidden w-16 sm:table-cell">Weight</Th>
              <Th className="w-12 sm:w-16">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {armors.map((armor) => {
              const isOpen = expanded.has(armor._id);
              return (
                <Fragment key={armor._id}>
                  <Tr>
                    <Td>
                      <Checkbox
                        id={`equipped-${armor._id}`}
                        checked={armor.isEquipped}
                        onCheckedChange={(checked) => update(armor._id, { isEquipped: checked })}
                        label={<span className="sr-only">Equipped</span>}
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label="Armor name"
                        placeholder="Armor name"
                        variant="quiet"
                        value={armor.name}
                        onChange={(event) => update(armor._id, { name: event.target.value })}
                      />
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Field
                        aria-label="Armor bonus"
                        type="number"
                        min={0}
                        variant="quiet"
                        value={armor.armorBonus ?? ''}
                        onChange={(event) =>
                          update(armor._id, {
                            armorBonus:
                              event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td>
                      <ArmorLocationSelect
                        id={`location-${armor._id}`}
                        value={armor.locations}
                        onChange={(value) => update(armor._id, { locations: value })}
                      />
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Field
                        aria-label="Weight"
                        type="number"
                        min={0}
                        variant="quiet"
                        value={armor.weight ?? ''}
                        onChange={(event) =>
                          update(armor._id, {
                            weight:
                              event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggle(armor._id)}
                          aria-label={isOpen ? 'Hide armor details' : 'Show armor details'}
                          aria-expanded={isOpen}
                          className="rounded-[var(--radius)] p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform', isOpen && 'rotate-180')}
                          />
                        </button>
                        <DeleteButton
                          label={armor.name || 'armor'}
                          onDelete={() => remove(armor._id)}
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
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <Field
                            label="Bonus"
                            type="number"
                            min={0}
                            containerClassName="sm:hidden"
                            value={armor.armorBonus ?? ''}
                            onChange={(event) =>
                              update(armor._id, {
                                armorBonus:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Field
                            label="Weight"
                            type="number"
                            min={0}
                            containerClassName="sm:hidden"
                            value={armor.weight ?? ''}
                            onChange={(event) =>
                              update(armor._id, {
                                weight:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Field
                            label="Cost"
                            type="number"
                            min={0}
                            value={armor.cost ?? ''}
                            onChange={(event) =>
                              update(armor._id, {
                                cost:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Textarea
                            label="Notes"
                            rows={2}
                            containerClassName="col-span-2 sm:col-span-3"
                            value={armor.comments ?? ''}
                            onChange={(event) =>
                              update(armor._id, { comments: event.target.value })
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
