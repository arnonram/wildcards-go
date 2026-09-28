import { FormControl, MenuItem, Select } from '@mui/material';
import { useState } from 'react';

export interface DiceDropdownProps {
  isSkill?: boolean;
  traitName: string;
  dice: DiceValues;
  updateChanges: (event: React.ChangeEvent<{ value: string }>, traitName: string) => void;
}

export const DiceDropdown = (props: DiceDropdownProps) => {
  const [diceValue, updateDice] = useState(props.dice);

  const handleChange = (event: React.ChangeEvent<{ value: string }>) => {
    updateDice(event.target.value);
    props.updateChanges(event, props.traitName);
  };

  return (
    <FormControl sx={{ m: 1, minWidth: 80 }}>
      <Select
        labelId={`${props.traitName}-dice`}
        id={`${props.traitName}-dice`}
        name={`dice`}
        value={diceValue}
        onChange={handleChange}
      >
        {props.isSkill && <MenuItem value={DiceValues.untrained}>{DiceValues.untrained}</MenuItem>}
        <MenuItem value={DiceValues.d4}>{DiceValues.d4}</MenuItem>
        <MenuItem value={DiceValues.d6}>{DiceValues.d6}</MenuItem>
        <MenuItem value={DiceValues.d8}>{DiceValues.d8}</MenuItem>
        <MenuItem value={DiceValues.d10}>{DiceValues.d10}</MenuItem>
        <MenuItem value={DiceValues.d12}>{DiceValues.d12}</MenuItem>
      </Select>
    </FormControl>
  );
};

export enum DiceValues {
  untrained = 'd4-2',
  d4 = 'd4',
  d6 = 'd6',
  d8 = 'd8',
  d10 = 'd10',
  d12 = 'd12',
}
