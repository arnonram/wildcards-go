import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { ArmorLocations } from '../../../dtos/wildcards-consts';
import { isArmorLocationKnown } from '../../../helpers/armor-helpers';

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
    <>
      <FormControl fullWidth variant="standard" sx={{ mt: 1 }}>
        <InputLabel id={`${id}-label`}>Location</InputLabel>
        <Select
          labelId={`${id}-label`}
          id={id}
          label="Location"
          value={isKnown ? value : CUSTOM_LOCATION}
          onChange={(event) =>
            onChange(event.target.value === CUSTOM_LOCATION ? '' : event.target.value)
          }
        >
          {Object.values(ArmorLocations).map((location) => (
            <MenuItem key={location} value={location}>
              {location}
            </MenuItem>
          ))}
          <MenuItem value={CUSTOM_LOCATION}>Other…</MenuItem>
        </Select>
      </FormControl>

      {!isKnown && (
        <TextField
          id={`${id}-custom`}
          label="Custom location"
          fullWidth
          variant="standard"
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          sx={{ mt: 1 }}
        />
      )}
    </>
  );
}
