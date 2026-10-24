import { computeToughness } from '../../helpers/armor-helpers';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { Pips } from '../ui/Pips';
import { Stat } from '../ui/Stat';
import { ConvictionToggle } from './ConvictionToggle';

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function StatusStrip() {
  const { wildcardData, update } = useWildcard();

  const pace = toNumber(wildcardData.pace) + toNumber(wildcardData.paceMod);
  const parry = toNumber(wildcardData.parry) + toNumber(wildcardData.parryMod);
  const toughness = computeToughness(wildcardData);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[var(--radius)] border border-line bg-surface/70 px-3 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Pips
          label="Bennies"
          value={toNumber(wildcardData.bennies)}
          max={5}
          allowAdd
          onChange={(value) => update({ bennies: value })}
        />
        <ConvictionToggle />
        <Pips
          label="Wounds"
          value={toNumber(wildcardData.wounds)}
          max={3}
          tone="danger"
          onChange={(value) => update({ wounds: value })}
        />
        <Pips
          label="Fatigue"
          value={toNumber(wildcardData.fatigue)}
          max={2}
          tone="warn"
          onChange={(value) => update({ fatigue: value })}
        />
      </div>

      <span className="hidden h-8 w-px bg-line sm:block" aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
        <Stat
          label="Pace"
          value={pace}
          hint={`Base ${toNumber(wildcardData.pace)} ${toNumber(wildcardData.paceMod) >= 0 ? '+' : '−'} ${Math.abs(toNumber(wildcardData.paceMod))}`}
        />
        <Stat
          label="Parry"
          value={parry}
          hint={`Base ${toNumber(wildcardData.parry)} ${toNumber(wildcardData.parryMod) >= 0 ? '+' : '−'} ${Math.abs(toNumber(wildcardData.parryMod))}`}
        />
        <Stat
          label="Toughness"
          value={toughness.armor > 0 ? `${toughness.total} (${toughness.armor})` : toughness.total}
          hint={`${toughness.base} base + ${toughness.armor} armor`}
        />
      </div>
    </div>
  );
}
