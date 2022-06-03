import { FormLabel, TextField, Box } from "@mui/material";
import { DiceDropdown, DiceValues } from "./DiceDropdown";
import React, { useState } from "react";
import { AddSkillDialog } from "./AddSkillDialog";
import { Trait } from "../../dtos/Trait.dto";

export interface TraitsProps {
  isAttributes: boolean;
  traitsArray?: Trait[];
}

export default function Traits(props: TraitsProps) {
  const [modValue, setValue] = useState("");

  const addTrait = (trait?: Trait) => {
    return (
      <Box id={`trait-${trait?.name}`}>
        <FormLabel
          key={`trait-${trait?.name}`}
          sx={{
            display: "block",
            typography: "body",
            textTransform: "uppercase",
            fontWeight: "bold",
          }}
        >
          {trait?.name}
        </FormLabel>
        <DiceDropdown
          trait={trait?.name ?? ""}
          isSkill={!props.isAttributes}
          dice={trait?.dice}
        />
        <TextField key={`trait-${trait?.name}`} label={`${trait?.name} mod`} />
      </Box>
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
        }}
      >
        {props.traitsArray?.map((trait) => addTrait(trait))}
      </Box>
      {!props.isAttributes && <AddSkillDialog />}
    </Box>
  );
}
