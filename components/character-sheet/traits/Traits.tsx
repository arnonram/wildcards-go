// biome-ignore-all lint/suspicious/noArrayIndexKey: skills have no stable id yet; index keys preserve focus while typing
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Trait } from '../../../dtos/Trait.dto';
import { DiceValues } from '../../../dtos/wildcards-consts';
import { useTranslation } from '../../../helpers/context/locale-context';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { skillNameToStore, traitLabel } from '../../../helpers/i18n';
import { Button } from '../../ui/Button';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { DiePicker } from '../DiePicker';
import { SortByNameButton } from '../SortByNameButton';

type TraitKey = 'attributes' | 'skills';

function TraitRow({
  kind,
  trait,
  onDiceChange,
  onModChange,
  onNameChange,
  onDelete,
}: {
  kind: 'attribute' | 'skill';
  trait: Trait;
  onDiceChange: (dice: DiceValues) => void;
  onModChange: (mod: string) => void;
  onNameChange?: (name: string) => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const label = traitLabel(kind, trait.name, t);

  return (
    <div className="flex items-center gap-2 border-b border-line/60 py-1">
      {onNameChange ? (
        <Field
          aria-label={t('sheet.traits.skillName')}
          variant="quiet"
          flush
          containerClassName="min-w-0 flex-1"
          value={label}
          onChange={(event) => onNameChange(skillNameToStore(event.target.value, t))}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{label}</span>
      )}
      <DiePicker
        name={label}
        value={trait.dice}
        onChange={onDiceChange}
        allowUntrained={!!onDelete}
      />
      <Field
        aria-label={t('sheet.traits.modifier', { name: label })}
        placeholder="+0"
        variant="quiet"
        containerClassName="w-14 shrink-0"
        value={trait.mod ?? ''}
        onChange={(event) => onModChange(event.target.value)}
      />
      {onDelete && <DeleteButton label={label || t('sheet.traits.skill')} onDelete={onDelete} />}
    </div>
  );
}

function AddSkillRow({ onAdd }: { onAdd: (skill: Trait) => void }) {
  const [name, setName] = useState('');
  const [dice, setDice] = useState<DiceValues>(DiceValues.untrained);
  const { t } = useTranslation();

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(new Trait(skillNameToStore(trimmed, t), dice));
    setName('');
    setDice(DiceValues.untrained);
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <Field
        aria-label={t('sheet.traits.newSkillName')}
        placeholder={t('sheet.traits.newSkillPlaceholder')}
        variant="quiet"
        flush
        containerClassName="min-w-0 flex-1"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
      />
      <DiePicker name="new-skill" value={dice} onChange={setDice} allowUntrained />
      <Button
        variant="outline"
        size="sm"
        onClick={submit}
        disabled={!name.trim()}
        aria-label={t('sheet.traits.addSkill')}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}

export default function Traits() {
  const { wildcardData, setWildcardData } = useWildcard();
  const { t } = useTranslation();

  const updateTrait = (key: TraitKey, index: number, patch: Partial<Trait>) => {
    setWildcardData((previous) => ({
      ...previous,
      [key]: previous[key].map((trait, position) =>
        position === index ? { ...trait, ...patch } : trait,
      ),
    }));
  };

  const removeSkill = (index: number) => {
    setWildcardData((previous) => ({
      ...previous,
      skills: previous.skills.filter((_, position) => position !== index),
    }));
  };

  const sortSkills = (skills: Trait[]) => {
    setWildcardData((previous) => ({ ...previous, skills }));
  };

  const addSkill = (skill: Trait) => {
    setWildcardData((previous) => ({ ...previous, skills: [...previous.skills, skill] }));
  };

  return (
    <Section id="traits" title={t('section.traits')}>
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-1 flex h-8 items-center text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            {t('sheet.traits.attributes')}
          </h3>
          {wildcardData.attributes.map((trait, index) => (
            <TraitRow
              kind="attribute"
              key={trait.name}
              trait={trait}
              onDiceChange={(dice) => updateTrait('attributes', index, { dice })}
              onModChange={(mod) => updateTrait('attributes', index, { mod })}
            />
          ))}
        </div>

        <div>
          <div className="mb-1 flex h-8 items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t('sheet.traits.skills')}
            </h3>
            <SortByNameButton
              items={wildcardData.skills}
              onSort={sortSkills}
              label={t('sheet.traits.sortLabel')}
              getName={(skill) => traitLabel('skill', skill.name, t)}
            />
          </div>
          {wildcardData.skills.map((trait, index) => (
            <TraitRow
              kind="skill"
              key={`skill-${index}`}
              trait={trait}
              onDiceChange={(dice) => updateTrait('skills', index, { dice })}
              onModChange={(mod) => updateTrait('skills', index, { mod })}
              onNameChange={(name) => updateTrait('skills', index, { name })}
              onDelete={() => removeSkill(index)}
            />
          ))}
          <AddSkillRow onAdd={addSkill} />
        </div>
      </div>
    </Section>
  );
}
