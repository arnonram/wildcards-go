import { ArmorLocations } from '../../../dtos/wildcards-consts';
import { isArmorLocationKnown } from '../../../helpers/armor-helpers';
import { Field } from '../../ui/Field';
import { Select } from '../../ui/Select';

export const CUSTOM_LOCATION = '__custom__';

export interface ArmorLocationSelectProps {
  id: string;
  value?: string;
  onChange: (value: string) => void;
}

/**
 * Location picker for armor. Offers the four Savage Worlds damage locations
 * plus an "Other" choice that reveals a free-text field. Only the final string
 * is stored - selecting "Other" clears it so the custom field takes over.
 */
export default function ArmorLocationSelect({ id, value, onChange }: ArmorLocationSelectProps) {
  const isKnown = isArmorLocationKnown(value);

  return (
    <div className="min-w-24 sm:min-w-36">
      <Select
        id={id}
        aria-label="Armor location"
        size="sm"
        value={isKnown ? value : CUSTOM_LOCATION}
        onValueChange={(next) => onChange(next === CUSTOM_LOCATION ? '' : next)}
        options={[
          ...Object.values(ArmorLocations).map((location) => ({
            value: location,
            label: location,
          })),
          { value: CUSTOM_LOCATION, label: 'Other…' },
        ]}
      />
      {!isKnown && (
        <Field
          aria-label="Custom armor location"
          placeholder="Custom location"
          variant="quiet"
          containerClassName="mt-1"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
