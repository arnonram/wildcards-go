import { Alert, Box, Button, TextField } from "@mui/material";
import { AddSkillDialog } from "./AddSkillDialog";
import Traits from "./Traits";
import { Attributes, CoreSkills } from "../../dtos/wildcards-consts";
import SaveIcon from "@mui/icons-material/Save";
import React, { useEffect, useState } from "react";
import EdgeHindrance from "./EdgeHindrance";
import Table from "./Table";
import { Weapon } from "../../dtos/Weapon.dto";
import { WildCardCharacter } from "../../dtos/WildCardCharacter.dto";
import { updateCharacter } from "../../helpers/api-actions";
import { RankDropdown } from "./RankDropdown";

export interface CharacterSheetProps {
  wildCard: WildCardCharacter;
}

export default function CharacterSheet({ wildCard }: CharacterSheetProps) {
  const [wildCardData, setWildCardData] = useState(wildCard);

  const handleCharacterUpdate = (event: any) => {
    const { name, value } = event.target;
    setWildCardData({
      ...wildCardData,
      [name]: value,
    });
  };

  const handleExternalUpdate = (data: {}) => {
    setWildCardData({
      ...wildCardData,
      ...data,
    });
  };

  // let weapons: Weapon[] = [new Weapon("axe")];

  const saveUpdate = async (event: any) => {
    event.preventDefault();
    const response = await updateCharacter(wildCardData);
  };

  return (
    <Box
      component="form"
      sx={{ "& .MuiTextField-root": { m: 1, width: "25ch" } }}
      noValidate
      autoComplete="off"
      onSubmit={saveUpdate}
    >
      <Button
        startIcon={<SaveIcon />}
        variant="contained"
        color="secondary"
        type="submit"
      >
        Save Wild Card
      </Button>
      {/* <Table tableName="weapons" data={weapons} /> */}
      <Box>
        <h3>Basics</h3>
        <Box>
          <TextField
            id="name"
            name="name"
            label="Name"
            value={wildCardData.name}
            onChange={handleCharacterUpdate}
            onBlur={saveUpdate}
          />
          <RankDropdown
            rank={wildCardData.rank}
            saveChange={saveUpdate}
            updateChanges={handleCharacterUpdate}
          />
          <TextField
            id="race"
            name="race"
            label="Race"
            value={wildCardData.race}
            onChange={handleCharacterUpdate}
            onBlur={saveUpdate}
          />
        </Box>
        <Box>
          <TextField
            id="bennies"
            name="bennies"
            label="Bennies"
            type="number"
            inputProps={{ min: 0 }}
            value={wildCardData.bennies}
            onChange={handleCharacterUpdate}
            onBlur={saveUpdate}
          />
          <TextField
            id="conviction"
            name="conviction"
            label="Conviction"
            value={wildCardData.conviction}
            onChange={handleCharacterUpdate}
            onBlur={saveUpdate}
          />
        </Box>
        <Box>
          <TextField
            id="pace"
            name="pace"
            label="Pace"
            type="number"
            inputProps={{ min: 0 }}
            value={wildCardData.pace}
            onChange={handleCharacterUpdate}
            onBlur={saveUpdate}
          />
          <TextField
            id="parry"
            name="parry"
            label="Parry"
            type="number"
            value={wildCardData.parry}
            onChange={handleCharacterUpdate}
            onBlur={saveUpdate}
          />
          <TextField
            id="toughness"
            name="toughness"
            label="Toughness"
            type="number"
            value={wildCardData.toughness}
            onChange={handleCharacterUpdate}
            onBlur={saveUpdate}
          />
        </Box>
      </Box>
      <Box>
        <h3>Attributes</h3>
        <Traits
          traitsArray={wildCard.attributes}
          isAttributes={true}
          handleExternalUpdate={handleExternalUpdate}
        />
      </Box>
      <Box>
        <h3>Skill</h3>
        <Traits
          traitsArray={wildCardData.skills}
          isAttributes={false}
          handleExternalUpdate={handleExternalUpdate}
        />
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
        }}
      >
        <Box>
          <h3>Hindrances</h3>
          <EdgeHindrance />
        </Box>
        <Box>
          <h3>Edges</h3>
          <EdgeHindrance />
        </Box>
      </Box>
      <Box>
        <h3>Armor</h3>
      </Box>
      <Box>
        <h3>Weapons</h3>
      </Box>
      <Box>
        <h3>Powers</h3>
      </Box>
      <Box>
        <h3>Gear</h3>
      </Box>
    </Box>
  );
}
