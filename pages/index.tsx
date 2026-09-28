import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  Typography,
  Skeleton,
  Fade,
  useTheme,
} from "@mui/material";
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { createNewCharacter } from "../helpers/api-actions";
import { CharToLoad } from "../dtos/CharToLoad";

const Home: NextPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const [characters, setCharacters] = useState<CharToLoad[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch("/api/character");
        const data = await response.json();
        setCharacters(data);
      } catch (error) {
        console.error("Failed to fetch characters:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCharacters();
  }, []);

  const handleCreateNew = async (e: any) => {
    e.preventDefault();
    const { characterId } = await createNewCharacter();
    router.push(`/character/${encodeURIComponent(characterId)}`);
  };

  const handleOpenCharacter = (id: string) => {
    router.push(`/character/${encodeURIComponent(id)}`);
  };

  return (
    <>
      <Head>
        <title>Wild Cards Go</title>
        <meta name="description" content="Have your Savage Worlds characters with you anywhere" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hero Section */}
      <Box
        sx={{
          textAlign: "center",
          py: { xs: 4, md: 6 },
          mb: 4,
        }}
      >
        <Typography
          variant="h2"
          sx={{
            fontFamily: "'Cinzel', 'Georgia', 'serif'",
            fontWeight: 700,
            color: "primary.main",
            mb: 2,
            fontSize: { xs: "2rem", md: "3rem" },
          }}
        >
          Wild Cards on-the-go
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 3, fontSize: { xs: "1rem", md: "1.25rem" } }}
        >
          Have your Savage Worlds characters with you anywhere
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 4,
          }}
        >
          <Image
            src="/images/SW_LOGO_FP_2018-300x200-1.png"
            alt="Savage Worlds"
            width={200}
            height={133}
            style={{ objectFit: "contain" }}
          />
        </Box>
      </Box>

      {/* Characters Section */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: "'Cinzel', 'Georgia', 'serif'",
            fontWeight: 600,
            mb: 3,
            color: "text.primary",
          }}
        >
          Your Characters
        </Typography>

        {isLoading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : characters.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              border: "2px dashed",
              borderColor: "primary.main",
              borderRadius: 2,
              opacity: 0.6,
            }}
          >
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              No characters yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first Wildcard to get started!
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {characters.map((char) => (
              <Grid item xs={12} sm={6} md={4} key={char._id}>
                <Fade in timeout={500}>
                  <Card
                    elevation={3}
                    sx={{
                      height: "100%",
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: theme.shadows[8],
                        borderColor: "primary.main",
                      },
                    }}
                    onClick={() => handleOpenCharacter(char._id)}
                  >
                    <CardActionArea sx={{ height: "100%" }}>
                      <CardContent>
                        <Typography
                          variant="h6"
                          sx={{
                            fontFamily: "'Cinzel', 'Georgia', 'serif'",
                            fontWeight: 600,
                            mb: 1,
                          }}
                        >
                          {char.name || "Unnamed Character"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Click to view character sheet
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Actions Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 3,
          justifyContent: "center",
          mt: 4,
        }}
      >
        <Card
          elevation={5}
          onClick={handleCreateNew}
          sx={{
            width: { xs: "100%", sm: 250 },
            minHeight: 100,
            cursor: "pointer",
            background: `linear-gradient(135deg, ${theme.palette.primary.main}26 0%, ${theme.palette.primary.main}0D 100%)`,
            border: `2px solid ${theme.palette.primary.main}66`,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: `0 8px 24px ${theme.palette.primary.main}4D`,
              borderColor: "primary.main",
            },
          }}
        >
          <CardActionArea sx={{ height: "100%" }}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "'Cinzel', 'Georgia', 'serif'",
                  fontWeight: 600,
                  color: "primary.main",
                }}
              >
                ✨ Create New Wildcard
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card
          elevation={5}
          onClick={() => router.push("/load-character")}
          sx={{
            width: { xs: "100%", sm: 250 },
            minHeight: 100,
            cursor: "pointer",
            background: `linear-gradient(135deg, ${theme.palette.secondary.main}26 0%, ${theme.palette.secondary.main}0D 100%)`,
            border: `2px solid ${theme.palette.secondary.main}66`,
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: `0 8px 24px ${theme.palette.secondary.main}4D`,
              borderColor: "secondary.main",
            },
          }}
        >
          <CardActionArea sx={{ height: "100%" }}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "'Cinzel', 'Georgia', 'serif'",
                  fontWeight: 600,
                  color: "secondary.main",
                }}
              >
                📂 Load Wildcard
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </>
  );
};

export default Home;
