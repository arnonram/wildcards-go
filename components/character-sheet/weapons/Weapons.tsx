import { ChevronDown, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Weapon } from '../../../dtos/Weapon.dto';
import { cn } from '../../../helpers/cn';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { Button } from '../../ui/Button';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { SheetTable, Td, Th, Tr } from '../../ui/Table';
import { Textarea } from '../../ui/Textarea';

const COLUMN_COUNT = 7;

export default function Weapons() {
  const { wildcardData, setWildcardData } = useWildcard();
  const weapons = wildcardData.weapons ?? [];
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
      weapons: [...(previous.weapons ?? []), new Weapon('')],
    }));
  };

  const update = (id: string, patch: Partial<Weapon>) => {
    setWildcardData((previous) => ({
      ...previous,
      weapons: (previous.weapons ?? []).map((weapon) =>
        weapon._id === id ? { ...weapon, ...patch } : weapon,
      ),
    }));
  };

  const remove = (id: string) => {
    setWildcardData((previous) => ({
      ...previous,
      weapons: (previous.weapons ?? []).filter((weapon) => weapon._id !== id),
    }));
  };

  return (
    <Section
      id="weapons"
      title="Weapons"
      actions={
        <Button size="sm" variant="outline" onClick={add}>
          <Plus size={13} />
          Add
        </Button>
      }
    >
      {weapons.length === 0 ? (
        <p className="py-3 text-sm text-faint">No weapons yet.</p>
      ) : (
        <SheetTable>
          <thead>
            <tr>
              <Th className="min-w-28 sm:min-w-44">Name</Th>
              <Th className="hidden w-28 sm:table-cell">Range</Th>
              <Th className="w-20 sm:w-28">Damage</Th>
              <Th className="hidden w-14 sm:table-cell">AP</Th>
              <Th className="hidden w-14 sm:table-cell">ROF</Th>
              <Th className="hidden w-16 sm:table-cell">Weight</Th>
              <Th className="w-12 sm:w-16">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {weapons.map((weapon) => {
              const isOpen = expanded.has(weapon._id);
              return (
                <Fragment key={weapon._id}>
                  <Tr>
                    <Td>
                      <Field
                        aria-label="Weapon name"
                        placeholder="Weapon name"
                        variant="quiet"
                        value={weapon.name}
                        onChange={(event) => update(weapon._id, { name: event.target.value })}
                      />
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Field
                        aria-label="Range"
                        placeholder="3/6/12"
                        variant="quiet"
                        value={weapon.range ?? ''}
                        onChange={(event) => update(weapon._id, { range: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label="Damage"
                        placeholder="Str+d6"
                        variant="quiet"
                        value={weapon.damage ?? ''}
                        onChange={(event) => update(weapon._id, { damage: event.target.value })}
                      />
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Field
                        aria-label="Armor piercing"
                        type="number"
                        variant="quiet"
                        value={weapon.ap ?? ''}
                        onChange={(event) =>
                          update(weapon._id, {
                            ap: event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Field
                        aria-label="Rate of fire"
                        type="number"
                        variant="quiet"
                        value={weapon.rof ?? ''}
                        onChange={(event) =>
                          update(weapon._id, {
                            rof: event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <Field
                        aria-label="Weight"
                        type="number"
                        variant="quiet"
                        value={weapon.weight ?? ''}
                        onChange={(event) =>
                          update(weapon._id, {
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
                          onClick={() => toggle(weapon._id)}
                          aria-label={isOpen ? 'Hide weapon details' : 'Show weapon details'}
                          aria-expanded={isOpen}
                          className="rounded-[var(--radius)] p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform', isOpen && 'rotate-180')}
                          />
                        </button>
                        <DeleteButton
                          label={weapon.name || 'weapon'}
                          onDelete={() => remove(weapon._id)}
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
                            label="Range"
                            placeholder="3/6/12"
                            variant="quiet"
                            containerClassName="sm:hidden"
                            value={weapon.range ?? ''}
                            onChange={(event) => update(weapon._id, { range: event.target.value })}
                          />
                          <Field
                            label="AP"
                            type="number"
                            variant="quiet"
                            containerClassName="sm:hidden"
                            value={weapon.ap ?? ''}
                            onChange={(event) =>
                              update(weapon._id, {
                                ap:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Field
                            label="ROF"
                            type="number"
                            variant="quiet"
                            containerClassName="sm:hidden"
                            value={weapon.rof ?? ''}
                            onChange={(event) =>
                              update(weapon._id, {
                                rof:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Field
                            label="Weight"
                            type="number"
                            variant="quiet"
                            containerClassName="sm:hidden"
                            value={weapon.weight ?? ''}
                            onChange={(event) =>
                              update(weapon._id, {
                                weight:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Field
                            label="Shots"
                            type="number"
                            min={0}
                            value={weapon.shots ?? ''}
                            onChange={(event) =>
                              update(weapon._id, {
                                shots:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Field
                            label="Ammo"
                            type="number"
                            min={0}
                            value={weapon.ammo ?? ''}
                            onChange={(event) =>
                              update(weapon._id, {
                                ammo:
                                  event.target.value === ''
                                    ? undefined
                                    : Number(event.target.value),
                              })
                            }
                          />
                          <Field
                            label="Min Strength"
                            placeholder="d6"
                            value={weapon.minStr ?? ''}
                            onChange={(event) => update(weapon._id, { minStr: event.target.value })}
                          />
                          <Textarea
                            label="Notes"
                            rows={2}
                            containerClassName="col-span-2 sm:col-span-4"
                            value={weapon.comments ?? ''}
                            onChange={(event) =>
                              update(weapon._id, { comments: event.target.value })
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
