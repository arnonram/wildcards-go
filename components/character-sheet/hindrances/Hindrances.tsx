import { Box } from "@mui/material";
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

  return (
    <Box>
      <h3>Hindrances</h3>
      {hindrances.map((hindrance) => (
        <HindranceCard hindrance={hindrance} updateHindrance={handleUpdate} />
      ))}
      <AddNewButton buttonText="Add Hindrance" onClick={addHindrance} />
    </Box>
  );
}
