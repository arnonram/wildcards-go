import { FormLabel, TextField, Box, Button, IconButton } from "@mui/material";
import { DiceDropdown, DiceValues } from "./DiceDropdown";
import React, { useEffect, useState } from "react";
import { AddSkillDialog } from "./AddSkillDialog";
import { Trait } from "../../dtos/Trait.dto";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

export interface TraitsProps {
  isAttributes: boolean;
  traitsArray: Trait[];
  handleExternalUpdate: any;
}

export default function Traits(props: TraitsProps) {
  const [traits, setTraits] = useState(props.traitsArray);

  const handleInputChange = (event: any, traitName: string) => {
    const traitIndex = traits.findIndex((x) => traitName.includes(x.name));
    const { name, value } = event.target;
    const updatedTrait = {
      ...traits[traitIndex],
      [name]: value,
    } as Trait;
    let traitsCopy = [...traits];
    traitsCopy[traitIndex] = updatedTrait;

    setTraits(traitsCopy);
  };

  useEffect(() => {
    props.handleExternalUpdate({
      [props.isAttributes ? "attributes" : "skills"]: traits,
    });
  }, [traits]);

  const addNewSkill = (newSkill: Trait) => {
    setTraits([...traits, newSkill]);
  };

  const deleteSkill = (skillToDelete: string) => {
    setTraits(traits.filter((skill) => skill.name !== skillToDelete));
  };

  const addTrait = (trait: Trait) => (
    <Box id={`trait-${trait.name}`} key={`trait-${trait.name}`}>
      <FormLabel
        sx={{
          display: "block",
          typography: "body",
          textTransform: "uppercase",
          fontWeight: "bold",
        }}
      >
        {trait.name}
      </FormLabel>
      <DiceDropdown
        dice={trait.dice as DiceValues}
        traitName={trait.name as string}
        isSkill={!props.isAttributes}
        updateChanges={handleInputChange}
      />
      <TextField
        id={`${trait.name}-mod`}
        name={"mod"}
        label={`${trait.name} mod`}
        value={traits.find((x) => x.name === trait.name)?.mod}
        onChange={(event) => handleInputChange(event, trait.name)}
      />
      {!props.isAttributes && (
        <IconButton
          id={`${trait.name}-delete`}
          color="warning"
          aria-label="delete"
          edge="start"
          onClick={() => deleteSkill(trait.name)}
        >
          <DeleteForeverIcon />
        </IconButton>
      )}
    </Box>
  );

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
        }}
      >
        {traits.map((trait) => addTrait(trait))}
      </Box>
      {!props.isAttributes && <AddSkillDialog addSkill={addNewSkill} />}
    </Box>
  );
}
