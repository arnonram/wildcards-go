import { debounce } from "lodash";
import {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import { WildCardCharacter } from "../../dtos/WildCardCharacter.dto";
import { saveToDb } from "../save-action";

type WildcardProviderProps = {
  wildCard: WildCardCharacter;
  children: React.ReactNode;
};

export const WildcardContext = createContext<
  { wildcardData: WildCardCharacter; setWildcardData: any } | undefined
>(undefined);

export function WildCardProvider({
  wildCard,
  children,
}: WildcardProviderProps) {
  const [wildcardData, setWildcardData] = useState(wildCard);
  const value = useMemo(
    () => ({ wildcardData, setWildcardData }),
    [wildcardData]
  );
  const debouncedSave = useCallback(
    debounce((nextValue) => saveToDb(nextValue), 1000),
    []
  );

  useEffect(() => {
    debouncedSave(wildcardData);
    console.log(wildcardData);
  }, [wildcardData]);

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
