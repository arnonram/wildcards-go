import { Box } from "@mui/material";
import React from "react";
import { WildCardCharacter } from "../../dtos/WildCardCharacter.dto";
import BasicDetails from "./BasicDetails";
import { WildCardProvider } from "../../helpers/context/wildcard-context";
import Edges from "./edges/Edges";
import Traits from "./traits/Traits";
import Hindrances from "./hindrances/Hindrances";
import Armors from "./armor/Armors";
import Weapons from "./weapons/Weapons";
import Powers from "./powers/Powers";
import GearList from "./gear/Gear";

export interface CharacterSheetProps {
  wildCard: WildCardCharacter;
}

export default function CharacterSheet({ wildCard }: CharacterSheetProps) {
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
        <Armors />
        <Weapons />
        <Powers />
        <GearList />
      </Box>
    </WildCardProvider>
  );
}
