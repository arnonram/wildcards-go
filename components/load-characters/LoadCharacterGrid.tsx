import {
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Grid,
  Typography,
} from "@mui/material";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { CharToLoad } from "../../dtos/CharToLoad";

export default function LoadCharactersGrid() {
  const router = useRouter();
  const [listOfChars, setListOfChars] = useState<CharToLoad[]>([]);
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

  const handleOpenChar = (e: any, id: string) => {
    e.preventDefault();
    router.push(`/character/${encodeURIComponent(id)}`);
  };

  const handleDeleteChar = async (id: string) => {
    await fetch(`api/character/${id}`, {
      method: "DELETE",
      headers: { "Content-type": "application/json" },
    });
    console.log(listOfChars.length);

    const cleanedList = listOfChars.filter((x) => x._id !== id);
    console.log(listOfChars.length);
    setListOfChars(cleanedList);
  };

  const generateCard = (character: CharToLoad) => {
    return (
      <Grid item key={`wildcard-load-grid-${character._id}`}>
        <Card
          sx={{
            margin: 1,
            border: 3,
            borderRadius: 4,
          }}
          id={`wildcard-card-${character._id}`}
          elevation={7}
        >
          <CardActionArea onClick={(e) => handleOpenChar(e, character._id)}>
            <CardMedia
              component="img"
              image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6O694YvEuQNDxXMOr2UJqR1DLGXJUD8kAcw&usqp=CAU"
            />
            <CardContent>
              <Typography gutterBottom variant="h6" component="div">
                {character.name}
              </Typography>
            </CardContent>
          </CardActionArea>
          <CardActions>
            <Button
              size="small"
              color="primary"
              onClick={() => handleDeleteChar(character._id)}
            >
              Delete
            </Button>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  if (isLoading) {
    return <div className="App">Loading...</div>;
  }
  return (
    <div>
      <Typography
        variant="h3"
        align="center"
        sx={{ boxShadow: 3 }}
        fontFamily="fantasy"
        marginBottom={2}
      >
        List of Characters
      </Typography>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {listOfChars.map((char) => generateCard(char))}
      </Grid>
    </div>
  );
}
