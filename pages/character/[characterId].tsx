import CharacterSheet from "../../components/character-sheet/CharacterSheet";

export default function Character({ character }: any) {
  return <CharacterSheet wildCard={character} />;
}

export async function getStaticPaths() {
  const response = await fetch(`http://localhost:3000/api/character`, {
    method: "GET",
    headers: { "Content-type": "application/json" },
  });
  const characters = await response.json();

  const paths = characters.map((char: any) => ({
    params: { characterId: char._id },
  }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }: any) {
  const res = await fetch(
    `http://localhost:3000/api/character/${params.characterId}`
  );
  const character = await res.json();
  return { props: { character } };
}
