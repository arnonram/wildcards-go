import type { NextApiRequest, NextApiResponse } from "next";
import { WildCardCharacter } from "../../dtos/WildCardCharacter.dto";
import { Collections, DbActions } from "../../helpers/db-actions";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let dbActions = new DbActions();

  switch (req.method) {
    case "POST":
      console.info("creating new character entry");
      const createCharacter = await dbActions.createNew(
        Collections.Characters,
        new WildCardCharacter()
      );
      res.status(200).json({ characterId: createCharacter.insertedId });
      break;
    case "GET":
      const allChars = await dbActions.getAllCharacters(Collections.Characters);
      res.status(200).json(allChars);
      break;
  }
}
