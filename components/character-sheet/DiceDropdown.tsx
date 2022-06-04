import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useState } from "react";
import { Trait } from "../../dtos/Trait.dto";
import { merge } from "lodash";

export interface DiceDropdownProps {
  isSkill?: boolean;
  trait: Trait;
  updateChanges: any;
}

export const DiceDropdown = (props: DiceDropdownProps) => {
  const [diceValue, updateDice] = useState(props.trait);

  const handleChange = (event) => {
    updateDice(merge(diceValue, { dice: event.target.value }));
    props.updateChanges(event, diceValue);
  };
  return (
    <FormControl sx={{ m: 1, minWidth: 80 }}>
      <Select
        labelId={`dice-${diceValue.name}`}
        id={`dice-${diceValue.name}`}
        name={`dice`}
        value={diceValue.dice}
        onChange={handleChange}
      >
        {props.isSkill && (
          <MenuItem value={DiceValues.untrained}>
            {DiceValues.untrained}
          </MenuItem>
        )}
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
  untrained = "d4-2",
  d4 = "d4",
  d6 = "d6",
  d8 = "d8",
  d10 = "d10",
  d12 = "d12",
}
