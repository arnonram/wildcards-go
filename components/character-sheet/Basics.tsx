import { Ranks } from '../../dtos/wildcards-consts';
import { computeToughness } from '../../helpers/armor-helpers';
import { useWildcard } from '../../helpers/context/wildcard-context';
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
  const toughness = computeToughness(wildcardData);
  const size = toNumber(wildcardData.size);
  const toughnessHint =
    [
      size !== 0 ? `${size > 0 ? '+' : '−'}${Math.abs(size)} size` : null,
      toughness.armor > 0 ? `+${toughness.armor} armor` : null,
    ]
      .filter(Boolean)
      .join(' · ') || undefined;

  return (
    <Section id="basics" title="Basics">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Ancestry"
          placeholder="Human, Elf, …"
          value={wildcardData.race ?? ''}
          onChange={(event) => update({ race: event.target.value })}
        />
        <Select
          label="Rank"
          value={wildcardData.rank ?? Ranks.Novice}
          onValueChange={(value) => update({ rank: value as Ranks })}
          options={Object.values(Ranks).map((rank) => ({ value: rank, label: rank }))}
        />
        <NumberField
          label="Size"
          value={size}
          hint="Added to Toughness"
          onValueChange={(value) => update({ size: value })}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Pace"
            min={0}
            value={toNumber(wildcardData.pace)}
            onValueChange={(value) => update({ pace: value })}
          />
          <NumberField
            label="Pace mod"
            value={toNumber(wildcardData.paceMod)}
            onValueChange={(value) => update({ paceMod: value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Parry"
            min={0}
            value={toNumber(wildcardData.parry)}
            onValueChange={(value) => update({ parry: value })}
          />
          <NumberField
            label="Parry mod"
            value={toNumber(wildcardData.parryMod)}
            onValueChange={(value) => update({ parryMod: value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Toughness"
            min={0}
            value={toNumber(wildcardData.toughness)}
            onValueChange={(value) => update({ toughness: value })}
            hint={toughnessHint}
          />
          <NumberField
            label="Toughness mod"
            value={toNumber(wildcardData.toughnessMod)}
            onValueChange={(value) => update({ toughnessMod: value })}
          />
        </div>
      </div>

      <Textarea
        label="Notes & background"
        rows={3}
        className="mt-4"
        placeholder="A line or two about this Wildcard…"
        value={wildcardData.bio ?? ''}
        onChange={(event) => update({ bio: event.target.value })}
      />
    </Section>
  );
}
