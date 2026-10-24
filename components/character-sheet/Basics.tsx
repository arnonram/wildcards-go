import { Ranks } from '../../dtos/wildcards-consts';
import { computeToughness } from '../../helpers/armor-helpers';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { Field } from '../ui/Field';
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

  return (
    <Section id="basics" title="Basics">
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Pace"
            type="number"
            min={0}
            value={toNumber(wildcardData.pace)}
            onChange={(event) => update({ pace: Number(event.target.value) })}
          />
          <Field
            label="Pace mod"
            type="number"
            value={toNumber(wildcardData.paceMod)}
            onChange={(event) => update({ paceMod: Number(event.target.value) })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Parry"
            type="number"
            min={0}
            value={toNumber(wildcardData.parry)}
            onChange={(event) => update({ parry: Number(event.target.value) })}
          />
          <Field
            label="Parry mod"
            type="number"
            value={toNumber(wildcardData.parryMod)}
            onChange={(event) => update({ parryMod: Number(event.target.value) })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Toughness"
            type="number"
            min={0}
            value={toNumber(wildcardData.toughness)}
            onChange={(event) => update({ toughness: Number(event.target.value) })}
            hint={toughness.armor > 0 ? `+${toughness.armor} armor` : undefined}
          />
          <Field
            label="Toughness mod"
            type="number"
            value={toNumber(wildcardData.toughnessMod)}
            onChange={(event) => update({ toughnessMod: Number(event.target.value) })}
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
