import { Box, Grid, TextField } from "@mui/material";
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
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        <Grid item>
          <TextField
            id="name"
            name="name"
            label="Name"
            value={wildcardData.name}
            onChange={handleChange}
          />
        </Grid>
        <Grid item>
          <RankDropdown rank={wildcardData.rank} updateChanges={handleChange} />
        </Grid>
        <Grid item>
          <TextField
            id="race"
            name="race"
            label="Race"
            value={wildcardData.race}
            onChange={handleChange}
          />{" "}
        </Grid>

        <Grid item>
          <TextField
            id="bennies"
            name="bennies"
            label="Bennies"
            type="number"
            inputProps={{ min: 0 }}
            value={wildcardData.bennies}
            onChange={handleChange}
          />
        </Grid>

        <Grid item>
          <TextField
            id="conviction"
            name="conviction"
            label="Conviction"
            value={wildcardData.conviction}
            onChange={handleChange}
          />
        </Grid>
      </Grid>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        <Grid item>
          <TextField
            id="pace"
            name="pace"
            label="Pace"
            type="number"
            inputProps={{ min: 0 }}
            value={wildcardData.pace}
            onChange={handleChange}
          />
        </Grid>
        <Grid item>
          <TextField
            id="parry"
            name="parry"
            label="Parry"
            type="number"
            value={wildcardData.parry}
            onChange={handleChange}
          />
        </Grid>
        <Grid item>
          <TextField
            id="toughness"
            name="toughness"
            label="Toughness"
            type="number"
            value={wildcardData.toughness}
            onChange={handleChange}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
