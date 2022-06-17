import { get } from "lodash";

export function handleArrayUpdate<T>(
  someArray: T[],
  elementToFind: string,
  nameToUpdate: string,
  valueToUpdate: string
): T[] {
  const traitIndex = someArray.findIndex((x) =>
    elementToFind.includes(get(x, "name"))
  );
  const updatedTrait = {
    ...someArray[traitIndex],
    [nameToUpdate]: valueToUpdate,
  } as T;
  let someArrayCopy = [...someArray];
  someArrayCopy[traitIndex] = updatedTrait;
  return someArrayCopy;
}
