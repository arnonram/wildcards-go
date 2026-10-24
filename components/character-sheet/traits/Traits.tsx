// biome-ignore-all lint/suspicious/noArrayIndexKey: skills have no stable id yet; index keys preserve focus while typing
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Trait } from '../../../dtos/Trait.dto';
import { DiceValues } from '../../../dtos/wildcards-consts';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { Button } from '../../ui/Button';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { DiePicker } from '../DiePicker';

type TraitKey = 'attributes' | 'skills';

function TraitRow({
  trait,
  onDiceChange,
  onModChange,
  onNameChange,
  onDelete,
}: {
  trait: Trait;
  onDiceChange: (dice: DiceValues) => void;
  onModChange: (mod: string) => void;
  onNameChange?: (name: string) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-line/60 py-1">
      {onNameChange ? (
        <Field
          aria-label="Skill name"
          variant="quiet"
          containerClassName="min-w-0 flex-1"
          value={trait.name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{trait.name}</span>
      )}
      <DiePicker
        name={trait.name}
        value={trait.dice}
        onChange={onDiceChange}
        allowUntrained={!!onDelete}
      />
      <Field
        aria-label={`${trait.name} modifier`}
        placeholder="+0"
        variant="quiet"
        containerClassName="w-14 shrink-0"
        value={trait.mod ?? ''}
        onChange={(event) => onModChange(event.target.value)}
      />
      {onDelete && <DeleteButton label={trait.name || 'skill'} onDelete={onDelete} />}
    </div>
  );
}

function AddSkillRow({ onAdd }: { onAdd: (skill: Trait) => void }) {
  const [name, setName] = useState('');
  const [dice, setDice] = useState<DiceValues>(DiceValues.untrained);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(new Trait(trimmed, dice));
    setName('');
    setDice(DiceValues.untrained);
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <Field
        aria-label="New skill name"
        placeholder="New skill…"
        variant="quiet"
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
        aria-label="Add skill"
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}

export default function Traits() {
  const { wildcardData, setWildcardData } = useWildcard();

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

  const addSkill = (skill: Trait) => {
    setWildcardData((previous) => ({ ...previous, skills: [...previous.skills, skill] }));
  };

  return (
    <Section id="traits" title="Traits">
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Attributes
          </h3>
          {wildcardData.attributes.map((trait, index) => (
            <TraitRow
              key={trait.name}
              trait={trait}
              onDiceChange={(dice) => updateTrait('attributes', index, { dice })}
              onModChange={(mod) => updateTrait('attributes', index, { mod })}
            />
          ))}
        </div>

        <div>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Skills
          </h3>
          {wildcardData.skills.map((trait, index) => (
            <TraitRow
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
