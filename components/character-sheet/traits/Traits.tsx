// biome-ignore-all lint/suspicious/noArrayIndexKey: skills and custom attributes have no stable id yet; index keys preserve focus while typing
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Trait } from '../../../dtos/Trait.dto';
import { DiceValues } from '../../../dtos/wildcards-consts';
import { useTranslation } from '../../../helpers/context/locale-context';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { skillNameToStore, traitLabel } from '../../../helpers/i18n';
import { sheetOptionState } from '../../../helpers/sheet-options';
import { Button } from '../../ui/Button';
import { DeleteButton } from '../../ui/DeleteButton';
import { Field } from '../../ui/Field';
import { Section } from '../../ui/Section';
import { DiePicker } from '../DiePicker';
import { SortByNameButton } from '../SortByNameButton';

type TraitKey = 'attributes' | 'customAttributes' | 'skills';

interface EditableName {
  ariaLabel: string;
  fallback: string;
  onChange: (typed: string) => void;
}

function TraitRow({
  label,
  trait,
  allowUntrained = false,
  editable,
  onDiceChange,
  onModChange,
  onDelete,
}: {
  label: string;
  trait: Trait;
  allowUntrained?: boolean;
  editable?: EditableName;
  onDiceChange: (dice: DiceValues) => void;
  onModChange: (mod: string) => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 border-b border-line/60 py-1">
      {editable ? (
        <Field
          aria-label={editable.ariaLabel}
          variant="quiet"
          flush
          containerClassName="min-w-0 flex-1"
          value={label}
          onChange={(event) => editable.onChange(event.target.value)}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-ink">{label}</span>
      )}
      <DiePicker
        name={label}
        value={trait.dice}
        onChange={onDiceChange}
        allowUntrained={allowUntrained}
      />
      <Field
        aria-label={t('sheet.traits.modifier', { name: label })}
        placeholder="+0"
        variant="quiet"
        containerClassName="w-14 shrink-0"
        value={trait.mod ?? ''}
        onChange={(event) => onModChange(event.target.value)}
      />
      {onDelete && <DeleteButton label={label || editable?.fallback || ''} onDelete={onDelete} />}
    </div>
  );
}

function AddTraitRow({
  id,
  initialDice,
  allowUntrained,
  nameLabel,
  placeholder,
  addLabel,
  toStore,
  onAdd,
}: {
  id: string;
  initialDice: DiceValues;
  allowUntrained: boolean;
  nameLabel: string;
  placeholder: string;
  addLabel: string;
  toStore: (typed: string) => string;
  onAdd: (trait: Trait) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [closedByUser, setClosedByUser] = useState(false);
  const [name, setName] = useState('');
  const [dice, setDice] = useState<DiceValues>(initialDice);

  const close = () => {
    setOpen(false);
    setClosedByUser(true);
    setName('');
    setDice(initialDice);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(new Trait(toStore(trimmed), dice));
    close();
  };

  if (!open) {
    return (
      <div className="mt-2 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          aria-label={addLabel}
          title={addLabel}
          autoFocus={closedByUser}
        >
          <Plus size={14} />
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <Field
        aria-label={nameLabel}
        placeholder={placeholder}
        variant="quiet"
        flush
        containerClassName="min-w-0 flex-1"
        value={name}
        autoFocus
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          } else if (event.key === 'Escape') {
            close();
          }
        }}
      />
      <DiePicker name={id} value={dice} onChange={setDice} allowUntrained={allowUntrained} />
      <Button variant="primary" size="sm" onClick={submit} disabled={!name.trim()}>
        {t('common.add')}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={close}
        aria-label={t('common.cancel')}
        title={t('common.cancel')}
      >
        <X size={14} />
      </Button>
    </div>
  );
}

export default function Traits() {
  const { wildcardData, setWildcardData } = useWildcard();
  const { t } = useTranslation();

  const customAttributes = wildcardData.customAttributes ?? [];

  const updateTrait = (key: TraitKey, index: number, patch: Partial<Trait>) => {
    setWildcardData((previous) => ({
      ...previous,
      [key]: (previous[key] ?? []).map((trait, position) =>
        position === index ? { ...trait, ...patch } : trait,
      ),
    }));
  };

  const removeTrait = (key: 'customAttributes' | 'skills', index: number) => {
    setWildcardData((previous) => ({
      ...previous,
      [key]: (previous[key] ?? []).filter((_, position) => position !== index),
    }));
  };

  const addTrait = (key: 'customAttributes' | 'skills', trait: Trait) => {
    setWildcardData((previous) => ({ ...previous, [key]: [...(previous[key] ?? []), trait] }));
  };

  const sortTraits = (key: 'customAttributes' | 'skills', sorted: Trait[]) => {
    setWildcardData((previous) => ({ ...previous, [key]: sorted }));
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
              key={trait.name}
              label={traitLabel('attribute', trait.name, t)}
              trait={trait}
              onDiceChange={(dice) => updateTrait('attributes', index, { dice })}
              onModChange={(mod) => updateTrait('attributes', index, { mod })}
            />
          ))}

          {sheetOptionState(wildcardData, 'customAttributes').shown && (
            <div className="mt-6 border-t border-line pt-3">
              <div className="mb-1 flex h-8 items-center justify-between gap-2">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  {t('sheet.traits.customAttributes')}
                </h4>
                <SortByNameButton
                  items={customAttributes}
                  onSort={(sorted) => sortTraits('customAttributes', sorted)}
                  label={t('sheet.traits.customAttributesSortLabel')}
                />
              </div>
              {customAttributes.map((trait, index) => (
                <TraitRow
                  key={`custom-attribute-${index}`}
                  label={trait.name}
                  trait={trait}
                  editable={{
                    ariaLabel: t('sheet.traits.customAttributeName'),
                    fallback: t('sheet.traits.customAttribute'),
                    onChange: (name) => updateTrait('customAttributes', index, { name }),
                  }}
                  onDiceChange={(dice) => updateTrait('customAttributes', index, { dice })}
                  onModChange={(mod) => updateTrait('customAttributes', index, { mod })}
                  onDelete={() => removeTrait('customAttributes', index)}
                />
              ))}
              <AddTraitRow
                id="new-custom-attribute"
                initialDice={DiceValues.d4}
                allowUntrained={false}
                nameLabel={t('sheet.traits.newCustomAttributeName')}
                placeholder={t('sheet.traits.newCustomAttributePlaceholder')}
                addLabel={t('sheet.traits.addCustomAttribute')}
                toStore={(typed) => typed}
                onAdd={(trait) => addTrait('customAttributes', trait)}
              />
            </div>
          )}
        </div>

        <div>
          <div className="mb-1 flex h-8 items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t('sheet.traits.skills')}
            </h3>
            <SortByNameButton
              items={wildcardData.skills}
              onSort={(sorted) => sortTraits('skills', sorted)}
              label={t('sheet.traits.sortLabel')}
              getName={(skill) => traitLabel('skill', skill.name, t)}
            />
          </div>
          {wildcardData.skills.map((trait, index) => (
            <TraitRow
              key={`skill-${index}`}
              label={traitLabel('skill', trait.name, t)}
              trait={trait}
              allowUntrained
              editable={{
                ariaLabel: t('sheet.traits.skillName'),
                fallback: t('sheet.traits.skill'),
                onChange: (typed) =>
                  updateTrait('skills', index, { name: skillNameToStore(typed, t) }),
              }}
              onDiceChange={(dice) => updateTrait('skills', index, { dice })}
              onModChange={(mod) => updateTrait('skills', index, { mod })}
              onDelete={() => removeTrait('skills', index)}
            />
          ))}
          <AddTraitRow
            id="new-skill"
            initialDice={DiceValues.untrained}
            allowUntrained
            nameLabel={t('sheet.traits.newSkillName')}
            placeholder={t('sheet.traits.newSkillPlaceholder')}
            addLabel={t('sheet.traits.addSkill')}
            toStore={(typed) => skillNameToStore(typed, t)}
            onAdd={(trait) => addTrait('skills', trait)}
          />
        </div>
      </div>
    </Section>
  );
}
