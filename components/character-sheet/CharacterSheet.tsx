import { Box } from "@mui/material";
import React from "react";
import Hindrances from "./hindrances/Hindrances";
import Table from "./Table";
import { Weapon } from "../../dtos/Weapon.dto";
import { WildCardCharacter } from "../../dtos/WildCardCharacter.dto";
import BasicDetails from "./BasicDetails";
import { WildCardProvider } from "../../helpers/context/wildcard-context";
import Edges from "./edges/Edges";
import Traits from "./traits/Traits";

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
        {/* <Table
          tableName="weapons"
          data={[
            new Weapon("Axe", "10/20/40", "2d6+1"),
            new Weapon("Gun", "10/20/40", "2d6+1"),
          ]}
        /> */}
        {/* <Weapons /> */}
        <Traits title="Attributes" isAttributes={true} />
        <Traits title="Skills" isAttributes={false} />
        <Hindrances />
        <Edges />
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
