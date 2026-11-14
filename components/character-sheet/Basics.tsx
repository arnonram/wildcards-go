import { useId } from 'react';
import type { DiceValues } from '../../dtos/wildcards-consts';
import { Ranks, STEPPED_DICE } from '../../dtos/wildcards-consts';
import { computeToughness } from '../../helpers/armor-helpers';
import { useTranslation } from '../../helpers/context/locale-context';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { rankLabel } from '../../helpers/i18n';
import { runDie } from '../../helpers/run-die';
import { Field } from '../ui/Field';
import { NumberField } from '../ui/NumberField';
import { Section } from '../ui/Section';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted';
const numberClass = 'text-center tabular-nums';

interface StatPairProps {
  label: string;
  modLabel: string;
  base: number;
  mod: number;
  hint?: string;
  onBaseChange: (value: number) => void;
  onModChange: (value: number) => void;
}

function StatPair({ label, modLabel, base, mod, hint, onBaseChange, onModChange }: StatPairProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <fieldset className="min-w-0">
      <legend className={labelClass}>{label}</legend>
      <div className="flex items-center gap-1.5">
        <NumberField
          aria-label={label}
          aria-describedby={hintId}
          min={0}
          value={base}
          onValueChange={onBaseChange}
          containerClassName="w-14"
          className={numberClass}
        />
        <span aria-hidden className="text-sm font-semibold text-faint">
          +
        </span>
        <NumberField
          aria-label={modLabel}
          aria-describedby={hintId}
          value={mod}
          onValueChange={onModChange}
          containerClassName="w-14"
          className={numberClass}
        />
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-[11px] leading-tight text-faint">
          {hint}
        </p>
      )}
    </fieldset>
  );
}

const Divider = () => <div aria-hidden className="hidden w-px self-stretch bg-line sm:block" />;

export default function Basics() {
  const { wildcardData, update } = useWildcard();
  const { t } = useTranslation();
  const toughness = computeToughness(wildcardData);
  const size = toNumber(wildcardData.size);
  const toughnessHint =
    [
      size !== 0
        ? t('sheet.basics.sizeHint', { size: `${size > 0 ? '+' : '−'}${Math.abs(size)}` })
        : null,
      toughness.armor > 0 ? t('sheet.basics.armorHint', { armor: toughness.armor }) : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined;

  return (
    <Section id="basics" title={t('section.basics')}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('sheet.basics.ancestry')}
          placeholder={t('sheet.basics.ancestryPlaceholder')}
          value={wildcardData.race ?? ''}
          onChange={(event) => update({ race: event.target.value })}
        />
        <Select
          label={t('sheet.basics.rank')}
          value={wildcardData.rank ?? Ranks.Novice}
          onValueChange={(value) => update({ rank: value as Ranks })}
          options={Object.values(Ranks).map((rank) => ({ value: rank, label: rankLabel(rank, t) }))}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-4">
        <StatPair
          label={t('stat.pace')}
          modLabel={t('sheet.basics.paceMod')}
          base={toNumber(wildcardData.pace)}
          mod={toNumber(wildcardData.paceMod)}
          onBaseChange={(value) => update({ pace: value })}
          onModChange={(value) => update({ paceMod: value })}
        />
        <Select
          label={t('stat.run')}
          className="w-20"
          value={runDie(wildcardData)}
          onValueChange={(value) => update({ runDie: value as DiceValues })}
          options={STEPPED_DICE.map((die) => ({ value: die, label: die }))}
        />
        <Divider />
        <StatPair
          label={t('stat.parry')}
          modLabel={t('sheet.basics.parryMod')}
          base={toNumber(wildcardData.parry)}
          mod={toNumber(wildcardData.parryMod)}
          onBaseChange={(value) => update({ parry: value })}
          onModChange={(value) => update({ parryMod: value })}
        />
        <Divider />
        <StatPair
          label={t('stat.toughness')}
          modLabel={t('sheet.basics.toughnessMod')}
          base={toNumber(wildcardData.toughness)}
          mod={toNumber(wildcardData.toughnessMod)}
          hint={toughnessHint}
          onBaseChange={(value) => update({ toughness: value })}
          onModChange={(value) => update({ toughnessMod: value })}
        />
        <NumberField
          label={t('sheet.basics.size')}
          value={size}
          onValueChange={(value) => update({ size: value })}
          containerClassName="w-14"
          className={numberClass}
        />
      </div>

      <Textarea
        label={t('sheet.basics.notes')}
        rows={3}
        containerClassName="mt-4"
        placeholder={t('sheet.basics.notesPlaceholder')}
        value={wildcardData.bio ?? ''}
        onChange={(event) => update({ bio: event.target.value })}
      />
    </Section>
  );
}
