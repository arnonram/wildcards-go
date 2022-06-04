import { FormLabel, TextField, Box } from "@mui/material";
import { DiceDropdown, DiceValues } from "./DiceDropdown";
import React, { useState } from "react";
import { AddSkillDialog } from "./AddSkillDialog";
import { Trait } from "../../dtos/Trait.dto";
import { merge } from "lodash";

export interface TraitsProps {
  isAttributes: boolean;
  traitsArray?: Trait[];
}

export default function Traits(props: TraitsProps) {
  const [traitValue, setTraitValue] = useState({} as Trait);

  const handleInputChange = (e: any, trait?: Trait) => {
    const { name, value } = e.target;
    setTraitValue(merge(trait, { [name]: value }));
  };

  const addTrait = (trait?: Trait) => {
    return (
      <Box id={`trait-${trait?.name}`} key={`trait-${trait?.name}`}>
        <FormLabel
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
          trait={trait as Trait}
          isSkill={!props.isAttributes}
          updateChanges={handleInputChange}
        />
        <TextField
          id={`${trait?.name}-mod`}
          name={"mod"}
          label={`${trait?.name} mod`}
          value={trait?.mod || ""}
          onChange={handleInputChange}
        />
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
