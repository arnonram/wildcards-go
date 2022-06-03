import { Box, Button, TextField } from "@mui/material";
import { Fragment, useState } from "react";
import AddNewButton from "./AddNewButton";

export default function EdgeHindrance() {
  const Elem = () => (
    <Box>
      <TextField />
    </Box>
  );

  const [count, setCount] = useState(0);

  return (
    <Fragment>
      <AddNewButton buttonText="Add New" onClick={() => setCount(count + 1)} />

      {[...Array(count)].map((_, i) => (
        <Elem key={i} />
      ))}
    </Fragment>
  );
}
