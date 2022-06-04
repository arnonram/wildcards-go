import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import React from "react";
import { Ranks } from "../../dtos/wildcards-consts";

export interface RankDropdownProps {
  rank?: Ranks;
  saveChange: any;
  updateChanges: any;
}

export const RankDropdown = (props: RankDropdownProps) => {
  return (
    <FormControl sx={{ m: 1, width: 150 }}>
      <Select
        labelId={"rank"}
        id={"rank"}
        name={"rank"}
        value={props.rank || ""}
        onChange={props.updateChanges}
        onBlur={props.saveChange}
      >
        {Object.values(Ranks).map((rank) => {
          return (
            <MenuItem key={rank} value={rank}>
              {rank}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
};
