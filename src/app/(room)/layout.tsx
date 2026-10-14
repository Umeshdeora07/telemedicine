/** Full-screen consult room: no site header or navigation. */
export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <main id="main">{children}</main>;
}
