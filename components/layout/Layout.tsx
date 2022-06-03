import { Navbar } from "./Navbar";
import { Sidemenu } from "./Sidemenu";

export default function Layout({ children }): JSX.Element {
  return (
    <>
      <Navbar />;
      <Sidemenu />;<main>{children}</main>
    </>
  );
}
