import { Alert, Box, Button, TextField } from "@mui/material";

import { Attributes, CoreSkills } from "../../dtos/wildcards-consts";
import SaveIcon from "@mui/icons-material/Save";
import React, { useEffect, useState } from "react";
import Hindrances from "./hindrances/Hindrances";
import Table from "./Table";
import { Weapon } from "../../dtos/Weapon.dto";
import { WildCardCharacter } from "../../dtos/WildCardCharacter.dto";
import { updateCharacter } from "../../helpers/api-actions";
import { RankDropdown } from "./RankDropdown";
import { Hindrance } from "../../dtos/Hindrance.dto";
import BasicDetails from "./BasicDetails";
import { WildCardProvider } from "../../helpers/context/wildcard-context";
import SaveButton from "./save-wildcard";
import Edges from "./edges/Edges";
import Traits from "./traits/Traits";

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
    // console.log(wildCardData);
  };

  // let weapons: Weapon[] = [new Weapon("axe")];

  const saveUpdate = async (event: any) => {
    event.preventDefault();
    const response = await updateCharacter(wildCardData);
  };

  return (
    <WildCardProvider wildCard={wildCard}>
      <Box
        component="form"
        sx={{ "& .MuiTextField-root": { m: 1, width: "25ch" } }}
        noValidate
        autoComplete="off"
        margin={3}
      >
        <BasicDetails />
        <Traits title="Attributes" isAttributes={true} />
        <Traits title="Skills" isAttributes={false} />
        <Hindrances />
        <Edges />
        {/* <Table tableName="weapons" data={weapons} /> */}
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
    </WildCardProvider>
  );
}
