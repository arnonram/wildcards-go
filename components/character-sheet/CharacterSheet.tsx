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

export interface CharacterSheetProps {
  wildCard: WildCardCharacter;
}

export default function CharacterSheet({ wildCard }: CharacterSheetProps) {
  const [wildCardData, setWildCardData] = useState(wildCard);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setWildCardData({
      ...wildCardData,
      [name]: value,
    });
  };

  // let weapons: Weapon[] = [new Weapon("axe")];

  const saveUpdate = async (e: any) => {
    e.preventDefault();
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
      <div>
        <h3>Basics</h3>
        <div>
          <TextField
            id="name"
            name="name"
            label="Name"
            type="text"
            value={wildCardData.name}
            onChange={handleInputChange}
            onBlur={saveUpdate}
          />
          <TextField
            id="race"
            name="race"
            label="Race"
            type="text"
            value={wildCardData.race}
            onChange={handleInputChange}
            onBlur={saveUpdate}
          />
          <TextField
            id="bennies"
            name="bennies"
            label="Bennies"
            type="number"
            inputProps={{ min: 0 }}
            value={wildCardData.bennies}
            onChange={handleInputChange}
            onBlur={saveUpdate}
          />
          <TextField
            id="conviction"
            name="conviction"
            label="Conviction"
            type="text"
            value={wildCardData.conviction}
            onChange={handleInputChange}
            onBlur={saveUpdate}
          />
        </div>
        <div>
          <TextField
            id="pace"
            name="pace"
            label="Pace"
            type="number"
            inputProps={{ min: 0 }}
            value={wildCardData.pace}
            onChange={handleInputChange}
            onBlur={saveUpdate}
          />
          <TextField
            id="parry"
            name="parry"
            label="Parry"
            type="number"
            value={wildCardData.parry}
            onChange={handleInputChange}
            onBlur={saveUpdate}
          />
          <TextField
            id="toughness"
            name="toughness"
            label="Toughness"
            type="number"
            value={wildCardData.toughness}
            onChange={handleInputChange}
            onBlur={saveUpdate}
          />
        </div>
      </div>
      <div>
        <h3>Attributes</h3>
        <Traits traitsArray={wildCard.attributes} isAttributes={true} />
      </div>
      <div>
        <h3>Skill</h3>
        <Traits traitsArray={wildCardData.skills} isAttributes={false} />
      </div>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
        }}
      >
        <div>
          <h3>Hindrances</h3>
          <EdgeHindrance />
        </div>
        <div>
          <h3>Edges</h3>
          <EdgeHindrance />
        </div>
      </Box>
      <div>
        <h3>Armor</h3>
      </div>
      <div>
        <h3>Weapons</h3>
      </div>
      <div>
        <h3>Powers</h3>
      </div>
      <div>
        <h3>Gear</h3>
      </div>
    </Box>
  );
}
