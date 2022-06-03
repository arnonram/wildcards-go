import { NavigateNextTwoTone } from "@mui/icons-material";
import { Checkbox, List, ListItem, ListItemText } from "@mui/material";
import { Box } from "@mui/system";
import Link from "next/link";
import React, { useEffect, useState } from "react";

export interface ListOfChars {
  name: string;
  _id: string;
}

export default function LoadCharacter() {
  const [listOfChars, setListOfChars] = useState([] as ListOfChars[]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const getData = async () => {
      const response = await fetch(`api/character`, {
        method: "GET",
        headers: { "Content-type": "application/json" },
      });
      setListOfChars(await response.json());
    };
    getData().catch(console.error);
    setLoading(false);
  }, []);

  if (isLoading) {
    return <div className="App">Loading...</div>;
  }
  return (
    <Box>
      <List
        component="nav"
        dense
        sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}
      >
        {listOfChars.map(({ name, _id }) => {
          const labelId = `checkbox-list-secondary-label-${_id}`;

          return (
            <ListItem key={_id} disablePadding>
              <Link href={`/character/${encodeURIComponent(_id)}`}>{name}</Link>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
