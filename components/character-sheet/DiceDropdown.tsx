import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import React from "react";

export interface DiceDropdownProps {
  isSkill?: boolean;
  trait?: string;
  dice?: DiceValues;
}

export const DiceDropdown = (props: DiceDropdownProps) => {
  const [diceValue, updateDice] = React.useState(props.dice ?? "");

  const handleChange = (event) => {
    updateDice(event.target.value);
  };

  return (
    <FormControl sx={{ m: 1, minWidth: 80 }}>
      <Select
        labelId={`dice-${props.trait}`}
        id={`dice-${props.trait}`}
        name={`dice-${props.trait}`}
        value={diceValue}
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
