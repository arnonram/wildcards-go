import { ChevronDown, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Weapon } from '../../../dtos/Weapon.dto';
import { cn } from '../../../helpers/cn';
import { useTranslation } from '../../../helpers/context/locale-context';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { Button } from '../../ui/Button';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { SheetTable, Td, Th, Tr } from '../../ui/Table';
import { Textarea } from '../../ui/Textarea';
import { SortByNameButton } from '../SortByNameButton';

const COLUMN_COUNT = 7;
const compactField = 'px-1.5 sm:px-2.5';
const compactContainer = '-mx-1 sm:mx-0';

export default function Weapons() {
  const { wildcardData, setWildcardData } = useWildcard();
  const { t } = useTranslation();
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
      title={t('section.weapons')}
      actions={
        <>
          <SortByNameButton
            items={weapons}
            onSort={(sorted) => setWildcardData((previous) => ({ ...previous, weapons: sorted }))}
            label={t('sheet.weapons.sortLabel')}
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus size={13} />
            {t('common.add')}
          </Button>
        </>
      }
    >
      {weapons.length === 0 ? (
        <p className="py-3 text-sm text-faint">{t('sheet.weapons.empty')}</p>
      ) : (
        <SheetTable className="table-fixed">
          <thead>
            <tr>
              <Th>{t('common.name')}</Th>
              <Th className="w-[4.75rem] sm:w-28">{t('common.range')}</Th>
              <Th className="w-[5.5rem] sm:w-28">{t('sheet.weapons.damage')}</Th>
              <Th className="w-12 max-[379px]:hidden sm:w-14">{t('sheet.weapons.ap')}</Th>
              <Th className="hidden w-10 min-[420px]:table-cell sm:w-14">
                {t('sheet.weapons.rof')}
              </Th>
              <Th className="hidden w-11 min-[520px]:table-cell sm:w-16">
                <span className="sm:hidden">{t('sheet.weapons.weightShort')}</span>
                <span className="hidden sm:inline">{t('common.weight')}</span>
              </Th>
              <Th className="w-14 sm:w-16">
                <span className="sr-only">{t('common.actions')}</span>
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
                        aria-label={t('sheet.weapons.name')}
                        placeholder={t('sheet.weapons.name')}
                        variant="quiet"
                        flush
                        value={weapon.name}
                        onChange={(event) => update(weapon._id, { name: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label={t('common.range')}
                        placeholder="—"
                        variant="quiet"
                        className={compactField}
                        containerClassName={compactContainer}
                        value={weapon.range ?? ''}
                        onChange={(event) => update(weapon._id, { range: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label={t('sheet.weapons.damage')}
                        placeholder="—"
                        variant="quiet"
                        className={compactField}
                        containerClassName={compactContainer}
                        value={weapon.damage ?? ''}
                        onChange={(event) => update(weapon._id, { damage: event.target.value })}
                      />
                    </Td>
                    <Td className="max-[379px]:hidden">
                      <Field
                        aria-label={t('sheet.weapons.apLabel')}
                        placeholder="—"
                        type="number"
                        variant="quiet"
                        className={compactField}
                        containerClassName={compactContainer}
                        value={weapon.ap ?? ''}
                        onChange={(event) =>
                          update(weapon._id, {
                            ap: event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td className="hidden min-[420px]:table-cell">
                      <Field
                        aria-label={t('sheet.weapons.rofLabel')}
                        placeholder="—"
                        type="number"
                        variant="quiet"
                        className={compactField}
                        containerClassName={compactContainer}
                        value={weapon.rof ?? ''}
                        onChange={(event) =>
                          update(weapon._id, {
                            rof: event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td className="hidden min-[520px]:table-cell">
                      <Field
                        aria-label={t('common.weight')}
                        placeholder="—"
                        type="number"
                        variant="quiet"
                        className={compactField}
                        containerClassName={compactContainer}
                        value={weapon.weight ?? ''}
                        onChange={(event) =>
                          update(weapon._id, {
                            weight:
                              event.target.value === '' ? undefined : Number(event.target.value),
                          })
                        }
                      />
                    </Td>
                    <Td className="px-1 sm:px-2">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => toggle(weapon._id)}
                          aria-label={t(
                            isOpen ? 'sheet.weapons.hideDetails' : 'sheet.weapons.showDetails',
                          )}
                          aria-expanded={isOpen}
                          className="rounded-[var(--radius)] p-1 text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <ChevronDown
                            size={14}
                            className={cn('transition-transform', isOpen && 'rotate-180')}
                          />
                        </button>
                        <DeleteButton
                          label={weapon.name || t('sheet.weapons.weapon')}
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
                            label={t('sheet.weapons.ap')}
                            type="number"
                            variant="quiet"
                            containerClassName="hidden max-[379px]:block"
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
                            label={t('sheet.weapons.rof')}
                            type="number"
                            variant="quiet"
                            containerClassName="min-[420px]:hidden"
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
                            label={t('common.weight')}
                            type="number"
                            variant="quiet"
                            containerClassName="min-[520px]:hidden"
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
                            label={t('sheet.weapons.shots')}
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
                            label={t('sheet.weapons.ammo')}
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
                            label={t('sheet.weapons.minStrength')}
                            placeholder="d6"
                            value={weapon.minStr ?? ''}
                            onChange={(event) => update(weapon._id, { minStr: event.target.value })}
                          />
                          <Textarea
                            label={t('common.notes')}
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
