import { Box, Button, TextField } from "@mui/material";
import { Fragment, useState } from "react";
import { Hindrance } from "../../../dtos/Hindrance.dto";
import AddNewButton from "../AddNewButton";
import HindranceCard from "./HindranceCard";

export interface HindracesProps {
  hindrances: Hindrance[];
  // handleExternalUpdate: any;
}

export default function Hindrances(props: HindracesProps) {
  const [open, setOpen] = useState(false);
  const [hindrances, setHindrances] = useState(props.hindrances);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  const handleAdd = (event: any) => {
    event.preventDefault();
    // props.addSkill(newSkill as Trait);
    setOpen(false);
  };

  return (
    <Box>
      {hindrances.map((hindrance) => (
        <HindranceCard hindrance={hindrance} />
      ))}
      <AddNewButton buttonText="Add Hindrance" onClick={handleOpen} />
    </Box>
  );
}
