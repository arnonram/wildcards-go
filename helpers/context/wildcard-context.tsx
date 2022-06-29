import { ActionTypes } from "@mui/base";
import {
  createContext,
  useState,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { WildCardCharacter } from "../../dtos/WildCardCharacter.dto";

// type Action =
//   | { type: "updateValue" }
//   | { type: "addToArray" }
//   | { type: "deleteFromArray" };
// type Dispatch = (action: Action) => void;
// type State = { wildcardData: WildCardCharacter };
type WildcardProviderProps = {
  wildCard: WildCardCharacter;
  children: React.ReactNode;
};

export const WildcardContext = createContext<
  { wildcardData: WildCardCharacter; setWildcardData: any } | undefined
>(undefined);

// function reducer(state, action: Action) {
//   switch (action.type) {
//     case "updateValue":
//       return {
//         ...state,
//       };
//     case "addToArray":
//       break;
//     case "deleteFromArray":
//       break;
//   }
// }

export function WildCardProvider({
  wildCard,
  children,
}: WildcardProviderProps) {
  const [wildcardData, setWildcardData] = useState(wildCard);
  // const [wildcardData, setWildcardData] = useReducer(reducer, wildCard);
  const value = useMemo(
    () => ({ wildcardData, setWildcardData }),
    [wildcardData]
  );

  // const value = { wildcardData, setWildcardData };
  console.log(wildcardData);
  return (
    <WildcardContext.Provider value={value}>
      {children}
    </WildcardContext.Provider>
  );
}

export function useWildcard() {
  const context = useContext(WildcardContext);
  if (context === undefined) {
    throw new Error("useWildcard must be used within a WildCardProvider");
  }
  return context;
}
