import { Box, Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { Hindrance } from "../../../dtos/Hindrance.dto";
import { useWildcard } from "../../../helpers/context/wildcard-context";
import AddNewButton from "../AddNewButton";
import HindranceCard from "./HindranceCard";

export default function Hindrances() {
  const { wildcardData, setWildcardData } = useWildcard();
  const [hindrances, setHindrances] = useState<Hindrance[]>(
    wildcardData?.hindrances || []
  );

  useEffect(() => {
    setWildcardData({ ...wildcardData, hindrances });
  }, [hindrances]);

  const addHindrance = (): void => {
    setHindrances([...hindrances, new Hindrance("New Hindrance")]);
  };

  const handleUpdate = (updatedHindrance: Hindrance) => {
    const hindranceIndex = hindrances.findIndex(
      (x) => x._id === updatedHindrance._id
    );
    const currentHindrance = hindrances;
    currentHindrance[hindranceIndex] = updatedHindrance;
    setHindrances([...currentHindrance]);
  };

  const handleDelete = (id: string) => {
    const cleanedHindrances = hindrances.filter((x) => x._id !== id);
    setHindrances([...cleanedHindrances]);
  };

  return (
    <Box>
      <h3>Hindrances</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {hindrances.map((hindrance) => (
          <HindranceCard
            key={`hindrance-${hindrance._id}`}
            hindrance={hindrance}
            updateHindrance={handleUpdate}
            deleteHindrance={handleDelete}
          />
        ))}
      </Grid>
      <AddNewButton buttonText="Add Hindrance" onClick={addHindrance} />
    </Box>
  );
}
