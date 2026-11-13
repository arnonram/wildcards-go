import type { ReactNode } from 'react';
import type { Trait } from '../../dtos/Trait.dto';
import { Ranks } from '../../dtos/wildcards-consts';
import { computeToughness, parseArmorBonus } from '../../helpers/armor-helpers';
import { cn } from '../../helpers/cn';
import { useTranslation } from '../../helpers/context/locale-context';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { armorLocationLabel, rankLabel, traitLabel } from '../../helpers/i18n';
import { runDie } from '../../helpers/run-die';
import { sheetOptionState } from '../../helpers/sheet-options';

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const label = 'text-[7pt] font-semibold uppercase tracking-[0.1em] text-neutral-600';
const cell = 'border-b border-neutral-400 px-[3px] py-[3px] align-top';
const center = 'text-center';

function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-1 border-b-[1.5pt] border-black pb-0.5 text-[9pt] font-bold uppercase tracking-[0.12em]">
      {children}
    </h2>
  );
}

function Table({
  headers,
  rows,
  blankRows,
  centered = [],
}: {
  headers?: string[];
  rows: ReactNode[][];
  blankRows: number;
  centered?: number[];
}) {
  const width = headers?.length ?? rows[0]?.length ?? 1;
  return (
    <table className="w-full border-collapse">
      {headers && (
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={header}
                className={cn(
                  label,
                  'border-b-[0.75pt] border-black px-[3px] py-0.5',
                  centered.includes(index) ? center : 'text-left',
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, rowIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static print rows
          <tr key={rowIndex}>
            {row.map((value, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static print cells
              <td key={index} className={cn(cell, centered.includes(index) && center)}>
                {value}
              </td>
            ))}
          </tr>
        ))}
        {Array.from({ length: blankRows }, (_, rowIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static print rows
          <tr key={`blank-${rowIndex}`}>
            {Array.from({ length: width }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static print cells
              <td key={index} className={cn(cell, 'h-[18px]')} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Box({ title, children, sub }: { title: string; children: ReactNode; sub?: string }) {
  return (
    <div className="rounded-[3px] border border-black px-1.5 py-1 text-center">
      <div className={label}>{title}</div>
      {children}
      {sub && <div className="text-[7pt] text-neutral-600">{sub}</div>}
    </div>
  );
}

function Track({ steps, inc }: { steps: number; inc: string }) {
  const circle =
    'inline-flex h-[26px] items-center justify-center rounded-full border-[1.5pt] border-black text-[8pt]';
  return (
    <div className="mt-1 flex items-center justify-center gap-2">
      {Array.from({ length: steps }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed penalty steps
        <span key={index} className={cn(circle, 'w-[26px]')}>
          −{index + 1}
        </span>
      ))}
      <span className={cn(circle, 'px-[7px]')}>{inc}</span>
    </div>
  );
}

const Blank = ({ className }: { className?: string }) => (
  <span className={cn('inline-block border-b border-black align-bottom', className)} />
);

const Detail = ({ children }: { children: ReactNode }) =>
  children ? <div className="text-[8pt] text-neutral-700">{children}</div> : null;

const traitRows = (traits: Trait[] | undefined, label: (name: string) => string = text) =>
  (traits ?? []).map((trait) => [
    label(text(trait.name)),
    <b key="die">{text(trait.dice)}</b>,
    text(trait.mod),
  ]);

/** Paper copy for the table: fixed values printed, values that change in play left to the pencil. */
export function PrintSheet() {
  const { wildcardData: c } = useWildcard();
  const { t } = useTranslation();
  const toughness = computeToughness(c);
  const pace = toNumber(c.pace) + toNumber(c.paceMod);
  const parry = toNumber(c.parry) + toNumber(c.parryMod);
  const maxPowerPoints = toNumber(c.maxPowerPoints);
  const hasPowers = (c.powers?.length ?? 0) > 0 || maxPowerPoints > 0;
  const attributeRows = [
    ...traitRows(c.attributes, (name) => traitLabel('attribute', name, t)),
    ...(sheetOptionState(c, 'customAttributes').shown ? traitRows(c.customAttributes) : []),
  ];
  const size = toNumber(c.size);

  return (
    <div className="hidden bg-white font-sans text-[9.5pt] leading-[1.3] text-black print:block">
      <header className="mb-2 flex items-end justify-between gap-4 border-b-[2.5pt] border-black pb-1">
        <h1 className="text-[20pt] font-bold tracking-[0.02em]">
          {text(c.name) || t('sheet.header.namePlaceholder')}
        </h1>
        <div className="flex gap-3.5 text-[9pt]">
          <div>
            <div className={label}>{t('sheet.basics.ancestry')}</div>
            {text(c.race)}
          </div>
          <div>
            <div className={label}>{t('sheet.basics.rank')}</div>
            {rankLabel(c.rank ?? Ranks.Novice, t)}
          </div>
          {size !== 0 &&
          <div className={center}>
            <div className={label}>{t('sheet.basics.size')}</div>
             {`${size > 0 ? '+' : '−'}${Math.abs(size)}`}
          </div>}
          {/* <div>
            <div className={label}>{t('print.advances')}</div>
            <Blank className="h-[14px] w-[34px]" />
          </div> */}
        </div>
      </header>

      <div
        className={cn(
          'mb-2.5 grid gap-1.5',
          hasPowers
            ? 'grid-cols-[1fr_1fr_1fr_1fr_1.6fr_1.3fr]'
            : 'grid-cols-[1fr_1fr_1fr_1.6fr_1.3fr]',
        )}
      >
        <Box title={t('stat.pace')} sub={`${t('stat.run')} ${runDie(c)}`}>
          <div className="text-[16pt] font-bold leading-[1.1]">{pace}</div>
        </Box>
        <Box title={t('stat.parry')}>
          <div className="text-[16pt] font-bold leading-[1.1]">{parry}</div>
        </Box>
        <Box title={t('stat.toughness')}>
          <div className="text-[16pt] font-bold leading-[1.1]">
            {toughness.total}
            {toughness.armor > 0 && <span className="text-[9pt]"> ({toughness.armor})</span>}
          </div>
        </Box>
        {hasPowers && (
          <Box title={t('sheet.powers.ppLabel')}>
            <div className="pt-1 text-[11pt] font-bold">
              <Blank className="h-[16px] w-[34px]" /> / {maxPowerPoints}
            </div>
          </Box>
        )}
        <Box title={t('stat.wounds')}>
          <Track steps={3} inc={t('print.incapacitated')} />
        </Box>
        <Box title={t('stat.fatigue')}>
          <Track steps={2} inc={t('print.incapacitated')} />
        </Box>
      </div>

      <div className="grid grid-cols-[1fr_1.35fr] gap-3.5">
        <div className="space-y-2.5">
          <section className="break-inside-avoid">
            <Heading>{t('sheet.traits.attributes')}</Heading>
            <Table rows={attributeRows} blankRows={0} centered={[1, 2]} />
          </section>
          <section className="break-inside-avoid">
            <Heading>{t('sheet.traits.skills')}</Heading>
            <Table
              headers={[t('common.name'), t('print.die'), t('print.mod')]}
              rows={traitRows(c.skills, (name) => traitLabel('skill', name, t))}
              blankRows={3}
              centered={[1, 2]}
            />
          </section>
          <section className="break-inside-avoid">
            <Heading>{t('section.hindrances')}</Heading>
            <Table
              rows={(c.hindrances ?? []).map((hindrance) => [
                <div key="h">
                  {text(hindrance.name)}
                  {hindrance.isMajor && (
                    <span>
                      ({t('sheet.hindrances.major')})
                    </span>
                  )}
                  <Detail>{text(hindrance.description)}</Detail>
                </div>,
              ])}
              blankRows={1}
            />
          </section>
          <section className="break-inside-avoid">
            <Heading>{t('section.edges')}</Heading>
            <Table
              rows={(c.edges ?? []).map((edge) => [
                <div key="e">
                  {text(edge.name)}
                  <Detail>{text(edge.description)}</Detail>
                </div>,
              ])}
              blankRows={2}
            />
          </section>
        </div>

        <div className="space-y-2.5">
          <section className="break-inside-avoid">
            <Heading>{t('section.weapons')}</Heading>
            <Table
              headers={[
                t('common.name'),
                t('common.range'),
                t('sheet.weapons.damage'),
                t('sheet.weapons.ap'),
                t('sheet.weapons.rof'),
                t('sheet.weapons.shots'),
              ]}
              rows={(c.weapons ?? []).map((weapon) => [
                text(weapon.name),
                text(weapon.range),
                text(weapon.damage),
                text(weapon.ap),
                text(weapon.rof),
                toNumber(weapon.shots) > 0 ? (
                  <span key="s" className="whitespace-nowrap">
                    <Blank className="h-[12px] w-[18px]" />/{toNumber(weapon.shots)}
                  </span>
                ) : (
                  ''
                ),
              ])}
              blankRows={2}
              centered={[3, 4, 5]}
            />
          </section>
          <section className="break-inside-avoid">
            <Heading>{t('section.armor')}</Heading>
            <Table
              headers={[
                t('common.name'),
                t('sheet.armor.bonus'),
                t('sheet.armor.locationHeader'),
                t('sheet.armor.equipped'),
              ]}
              rows={(c.armors ?? []).map((armor) => [
                text(armor.name),
                `+${parseArmorBonus(armor.armorBonus)}`,
                armorLocationLabel(text(armor.locations), t),
                armor.isEquipped ? '✓' : '',
              ])}
              blankRows={1}
              centered={[1, 3]}
            />
          </section>
          {hasPowers && (
            <section className="break-inside-avoid">
              <Heading>{t('section.powers')}</Heading>
              <Table
                headers={[
                  t('common.name'),
                  t('sheet.powers.pp'),
                  t('common.range'),
                  t('sheet.powers.duration'),
                  t('sheet.powers.effect'),
                ]}
                rows={(c.powers ?? []).map((power) => [
                  text(power.name),
                  text(power.pp),
                  text(power.range),
                  text(power.duration),
                  <span key="e" className="text-[8pt]">
                    {text(power.effect)}
                  </span>,
                ])}
                blankRows={1}
                centered={[1, 3]}
              />
            </section>
          )}
          <section className="break-inside-avoid">
            <Heading>{t('section.gear')}</Heading>
            <Table
              headers={[t('common.name'), t('sheet.weapons.weightShort')]}
              rows={(c.gear ?? []).map((item) => [text(item.name), text(item.weight)])}
              blankRows={4}
              centered={[1]}
            />
          </section>
          <section className="break-inside-avoid">
            <Heading>{t('common.notes')}</Heading>
            {text(c.bio) && <p className="mb-1 whitespace-pre-line text-[8.5pt]">{text(c.bio)}</p>}
            {Array.from({ length: 5 }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: blank writing lines
              <div key={index} className="h-[18px] border-b border-neutral-400" />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
