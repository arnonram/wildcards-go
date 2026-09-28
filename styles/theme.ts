import { createTheme } from "@mui/material/styles";

const commonTypography = {
  fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
  h1: {
    fontFamily: "'Cinzel', 'Georgia', 'serif'",
    fontWeight: 700,
  },
  h2: {
    fontFamily: "'Cinzel', 'Georgia', 'serif'",
    fontWeight: 700,
  },
  h3: {
    fontFamily: "'Cinzel', 'Georgia', 'serif'",
    fontWeight: 600,
  },
  h4: {
    fontFamily: "'Cinzel', 'Georgia', 'serif'",
    fontWeight: 600,
  },
  h5: {
    fontFamily: "'Cinzel', 'Georgia', 'serif'",
    fontWeight: 600,
  },
  h6: {
    fontFamily: "'Cinzel', 'Georgia', 'serif'",
    fontWeight: 600,
  },
};

const commonComponents = {
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundImage: "none",
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: "none",
        fontWeight: 600,
      },
    },
  },
};

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#c9a227",
      light: "#f0c94a",
      dark: "#8a6e1a",
      contrastText: "#1a1a2e",
    },
    secondary: {
      main: "#4a6fa5",
      light: "#7a9fc7",
      dark: "#2d4a6e",
      contrastText: "#ffffff",
    },
    background: {
      default: "#0f0f1a",
      paper: "#1a1a2e",
    },
    text: {
      primary: "#e8e6e3",
      secondary: "#a0a0b0",
    },
    divider: "rgba(201, 162, 39, 0.2)",
  },
  typography: commonTypography,
  shape: {
    borderRadius: 8,
  },
  components: {
    ...commonComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          ...commonComponents.MuiCard.styleOverrides.root,
          border: "1px solid rgba(201, 162, 39, 0.15)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "rgba(201, 162, 39, 0.3)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(201, 162, 39, 0.5)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#c9a227",
            },
          },
          "& .MuiInputLabel-root": {
            color: "#a0a0b0",
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "#c9a227",
          },
        },
      },
    },
  },
});

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#8a6e1a",
      light: "#c9a227",
      dark: "#5a4a10",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#2d4a6e",
      light: "#4a6fa5",
      dark: "#1a2d42",
      contrastText: "#ffffff",
    },
    background: {
      default: "#faf8f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#1a1a2e",
      secondary: "#5a5a6e",
    },
    divider: "rgba(138, 110, 26, 0.2)",
  },
  typography: commonTypography,
  shape: {
    borderRadius: 8,
  },
  components: {
    ...commonComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          ...commonComponents.MuiCard.styleOverrides.root,
          border: "1px solid rgba(138, 110, 26, 0.15)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "rgba(138, 110, 26, 0.3)",
            },
            "&:hover fieldset": {
              borderColor: "rgba(138, 110, 26, 0.5)",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#8a6e1a",
            },
          },
          "& .MuiInputLabel-root": {
            color: "#5a5a6e",
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "#8a6e1a",
          },
        },
      },
    },
  },
});
