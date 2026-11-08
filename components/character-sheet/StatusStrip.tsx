import { Pin } from 'lucide-react';
import { computeToughness } from '../../helpers/armor-helpers';
import { cn } from '../../helpers/cn';
import { useTranslation } from '../../helpers/context/locale-context';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { sheetOptionState } from '../../helpers/sheet-options';
import { Pips } from '../ui/Pips';
import { Stat } from '../ui/Stat';
import { ConvictionToggle } from './ConvictionToggle';

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value)}`;
const negative = (value: number) => (value === 0 ? '0' : `-${value}`);

export interface StatusStripProps {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

export function StatusStrip({ pinned, onPinnedChange }: StatusStripProps) {
  const { wildcardData, update } = useWildcard();
  const { t } = useTranslation();
  const pinLabel = t(pinned ? 'sheet.status.unpin' : 'sheet.status.pin');

  const pace = toNumber(wildcardData.pace) + toNumber(wildcardData.paceMod);
  const parry = toNumber(wildcardData.parry) + toNumber(wildcardData.parryMod);
  const toughness = computeToughness(wildcardData);
  const woundFatiguePenalty = toNumber(wildcardData.wounds) + toNumber(wildcardData.fatigue);

  return (
    <div className="relative rounded-[var(--radius)] border border-line bg-surface/70 px-3 py-3">
      <button
        type="button"
        aria-label={pinLabel}
        aria-pressed={pinned}
        title={pinLabel}
        onClick={() => onPinnedChange(!pinned)}
        className={cn(
          'absolute right-2 top-2 flex size-7 items-center justify-center rounded-full transition-colors',
          pinned ? 'bg-accent-soft text-accent' : 'text-faint hover:bg-surface-2 hover:text-ink',
        )}
      >
        <Pin size={13} fill={pinned ? 'currentColor' : 'none'} />
      </button>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pr-8">
        <Pips
          label={t('stat.bennies')}
          value={toNumber(wildcardData.bennies)}
          max={5}
          allowAdd
          onChange={(value) => update({ bennies: value })}
        />
        {sheetOptionState(wildcardData, 'conviction').shown && <ConvictionToggle />}
        <Pips
          label={t('stat.wounds')}
          value={toNumber(wildcardData.wounds)}
          max={3}
          tone="danger"
          formatValue={negative}
          onChange={(value) => update({ wounds: value })}
        />
        <Pips
          label={t('stat.fatigue')}
          value={toNumber(wildcardData.fatigue)}
          max={2}
          tone="warn"
          formatValue={negative}
          onChange={(value) => update({ fatigue: value })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-2 border-t border-line/70 pt-3">
        <Stat
          label={t('stat.pace')}
          value={pace}
          hint={t('sheet.status.baseHint', {
            base: toNumber(wildcardData.pace),
            mod: signed(toNumber(wildcardData.paceMod)),
          })}
        />
        <Stat
          label={t('stat.parry')}
          value={parry}
          hint={t('sheet.status.baseHint', {
            base: toNumber(wildcardData.parry),
            mod: signed(toNumber(wildcardData.parryMod)),
          })}
        />
        <Stat
          label={t('stat.toughness')}
          value={toughness.armor > 0 ? `${toughness.total} (${toughness.armor})` : toughness.total}
          hint={t('sheet.status.toughnessHint', { base: toughness.base, armor: toughness.armor })}
        />
        {woundFatiguePenalty > 0 && (
          <Stat
            label={t('stat.woundFatigue')}
            value={negative(woundFatiguePenalty)}
            hint={t('sheet.status.penaltyHint')}
          />
        )}
      </div>
    </div>
  );
}
