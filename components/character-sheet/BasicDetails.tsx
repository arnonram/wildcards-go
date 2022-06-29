import { Box, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { WildCardCharacter } from "../../dtos/WildCardCharacter.dto";
import { saveUpdate } from "../../helpers/save-action";
import { useWildcard } from "../../helpers/context/wildcard-context";
import { RankDropdown } from "./RankDropdown";

export default function BasicDetails() {
  const { wildcardData, setWildcardData } = useWildcard();
  //   const [basicData, setBasicData] = useState();

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setWildcardData({ ...wildcardData, [name]: value });
  };

  return (
    <Box>
      <h3>Basics</h3>
      <Box>
        <TextField
          id="name"
          name="name"
          label="Name"
          value={wildcardData.name}
          onChange={handleChange}
          //   onFocus={}
          //   onBlur={}
        />
        <RankDropdown
          rank={wildcardData.rank}
          // saveChange={saveUpdate}
          updateChanges={handleChange}
        />
        <TextField
          id="race"
          name="race"
          label="Race"
          value={wildcardData.race}
          onChange={handleChange}
          //   onBlur={saveUpdate}
        />
        <TextField
          id="bennies"
          name="bennies"
          label="Bennies"
          type="number"
          inputProps={{ min: 0 }}
          value={wildcardData.bennies}
          onChange={handleChange}
          //   onBlur={saveUpdate}
        />
        <TextField
          id="conviction"
          name="conviction"
          label="Conviction"
          value={wildcardData.conviction}
          onChange={handleChange}
          //   onBlur={saveUpdate}
        />
      </Box>
      <Box>
        <TextField
          id="pace"
          name="pace"
          label="Pace"
          type="number"
          inputProps={{ min: 0 }}
          value={wildcardData.pace}
          onChange={handleChange}
          //   onBlur={saveUpdate}
        />
        <TextField
          id="parry"
          name="parry"
          label="Parry"
          type="number"
          value={wildcardData.parry}
          onChange={handleChange}
          //   onBlur={saveUpdate}
        />
        <TextField
          id="toughness"
          name="toughness"
          label="Toughness"
          type="number"
          value={wildcardData.toughness}
          onChange={handleChange}
          //   onBlur={saveUpdate}
        />
      </Box>
    </Box>
  );
}
