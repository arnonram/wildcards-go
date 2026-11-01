import { Ranks } from '../../dtos/wildcards-consts';
import { computeToughness } from '../../helpers/armor-helpers';
import { useTranslation } from '../../helpers/context/locale-context';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { rankLabel } from '../../helpers/i18n';
import { Field } from '../ui/Field';
import { NumberField } from '../ui/NumberField';
import { Section } from '../ui/Section';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
      <div className="grid gap-4 sm:grid-cols-3">
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
        <NumberField
          label={t('sheet.basics.size')}
          value={size}
          hint={t('sheet.basics.sizeAddsToToughness')}
          onValueChange={(value) => update({ size: value })}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('stat.pace')}
            min={0}
            value={toNumber(wildcardData.pace)}
            onValueChange={(value) => update({ pace: value })}
          />
          <NumberField
            label={t('sheet.basics.paceMod')}
            value={toNumber(wildcardData.paceMod)}
            onValueChange={(value) => update({ paceMod: value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('stat.parry')}
            min={0}
            value={toNumber(wildcardData.parry)}
            onValueChange={(value) => update({ parry: value })}
          />
          <NumberField
            label={t('sheet.basics.parryMod')}
            value={toNumber(wildcardData.parryMod)}
            onValueChange={(value) => update({ parryMod: value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label={t('stat.toughness')}
            min={0}
            value={toNumber(wildcardData.toughness)}
            onValueChange={(value) => update({ toughness: value })}
            hint={toughnessHint}
          />
          <NumberField
            label={t('sheet.basics.toughnessMod')}
            value={toNumber(wildcardData.toughnessMod)}
            onValueChange={(value) => update({ toughnessMod: value })}
          />
        </div>
      </div>

      <Textarea
        label={t('sheet.basics.notes')}
        rows={3}
        className="mt-4"
        placeholder={t('sheet.basics.notesPlaceholder')}
        value={wildcardData.bio ?? ''}
        onChange={(event) => update({ bio: event.target.value })}
      />
    </Section>
  );
}
