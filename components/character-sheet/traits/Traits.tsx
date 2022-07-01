import { FormLabel, TextField, Box, IconButton, Grid } from "@mui/material";
import { DiceDropdown, DiceValues } from "../DiceDropdown";
import React, { useEffect, useState } from "react";
import { AddSkillDialog } from "./AddSkillDialog";
import { Trait } from "../../../dtos/Trait.dto";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { handleArrayUpdate } from "../../../helpers/array-helpers";
import { useWildcard } from "../../../helpers/context/wildcard-context";

export interface TraitsProps {
  title: string;
  isAttributes: boolean;
}

export default function Traits(props: TraitsProps) {
  const { wildcardData, setWildcardData } = useWildcard();
  const [traits, setTraits] = useState(
    props.isAttributes ? wildcardData.attributes : wildcardData.skills
  );

  const handleInputChange = (event: any, traitName: string) => {
    const { name, value } = event.target;
    setTraits(handleArrayUpdate(traits, traitName, name, value));
  };

  useEffect(() => {
    setWildcardData({
      ...wildcardData,
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
    <Grid item id={`trait-${trait.name}`} key={`trait-${trait.name}`}>
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
    </Grid>
  );

  return (
    <Box>
      <h3>{props.title}</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {traits.map((trait) => addTrait(trait))}
      </Grid>
      {!props.isAttributes && <AddSkillDialog addSkill={addNewSkill} />}
    </Box>
  );
}
