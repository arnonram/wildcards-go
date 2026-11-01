import { ChevronDown, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Power } from '../../../dtos/Power.dto';
import { cn } from '../../../helpers/cn';
import { useTranslation } from '../../../helpers/context/locale-context';
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
  const { t } = useTranslation();
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
      title={t('section.powers')}
      actions={
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              <span className="sm:hidden">{t('sheet.powers.maxShort')}</span>
              <span className="hidden sm:inline">{t('sheet.powers.max')}</span>
            </span>
            <Stepper
              label={t('sheet.powers.maxLabel')}
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
              <span className="sm:hidden">{t('sheet.powers.currentShort')}</span>
              <span className="hidden sm:inline">{t('sheet.powers.current')}</span>
            </span>
            <Stepper
              label={t('sheet.powers.currentLabel')}
              value={currentPowerPoints}
              min={0}
              max={maxPowerPoints}
              onChange={(value) => update({ currentPowerPoints: value })}
            />
          </div>
          <SortByNameButton
            items={powers}
            onSort={(sorted) => setWildcardData((previous) => ({ ...previous, powers: sorted }))}
            label={t('sheet.powers.sortLabel')}
          />
          <Button size="sm" variant="outline" onClick={add}>
            <Plus size={13} />
            {t('common.add')}
          </Button>
        </div>
      }
    >
      {powers.length === 0 ? (
        <p className="py-3 text-sm text-faint">{t('sheet.powers.empty')}</p>
      ) : (
        <SheetTable className="table-fixed">
          <thead>
            <tr>
              <Th>{t('common.name')}</Th>
              <Th className="w-11 sm:w-16">{t('sheet.powers.pp')}</Th>
              <Th className="w-20 sm:w-32">{t('common.range')}</Th>
              <Th className="w-[4.25rem] max-[379px]:hidden sm:w-24">
                {t('sheet.powers.duration')}
              </Th>
              <Th className="w-14 sm:w-16">
                <span className="sr-only">{t('common.actions')}</span>
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
                        aria-label={t('sheet.powers.name')}
                        placeholder={t('sheet.powers.name')}
                        variant="quiet"
                        flush
                        value={power.name}
                        onChange={(event) => updatePower(power._id, { name: event.target.value })}
                      />
                    </Td>
                    <Td>
                      <Field
                        aria-label={t('sheet.powers.ppLabel')}
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
                        aria-label={t('common.range')}
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
                        aria-label={t('sheet.powers.duration')}
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
                          aria-label={t(
                            isOpen ? 'sheet.powers.hideDetails' : 'sheet.powers.showDetails',
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
                          label={power.name || t('sheet.powers.power')}
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
                            label={t('sheet.powers.duration')}
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
                            label={t('sheet.powers.effect')}
                            rows={2}
                            containerClassName="col-span-2"
                            value={power.effect ?? ''}
                            onChange={(event) =>
                              updatePower(power._id, { effect: event.target.value })
                            }
                          />
                          <Textarea
                            label={t('common.notes')}
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
