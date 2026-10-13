import "./globals.css";
import Link from "next/link";
export const metadata = { title: "Restro Pro Chain" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>
    <nav><b>Restro Pro Chain</b><Link href="/">Dashboard</Link><Link href="/manage">Manage branches</Link></nav>
    <main>{children}</main></body></html>);
}
