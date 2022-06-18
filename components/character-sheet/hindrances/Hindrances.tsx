import { Box, Button, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import { Hindrance } from "../../../dtos/Hindrance.dto";
import AddNewButton from "../AddNewButton";
import HindranceCard from "./HindranceCard";

export interface HindracesProps {
  hindrances: Hindrance[];
  handleExternalUpdate: any;
}

export default function Hindrances(props: HindracesProps) {
  const [hindrances, setHindrances] = useState<Hindrance[]>(props.hindrances);

  useEffect(() => {
    props.handleExternalUpdate({ hindrances });
  }, [hindrances]);

  const addHindrance = () => {
    setHindrances([...hindrances, new Hindrance("New Hindrance")]);
  };

  return (
    <Box>
      {hindrances.map((hindrance) => (
        <HindranceCard
          hindrance={hindrance}
          handleExternalUpdate={props.handleExternalUpdate}
        />
      ))}
      <AddNewButton buttonText="Add Hindrance" onClick={addHindrance} />
    </Box>
  );
}
