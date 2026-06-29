import ITLayout from "../components/ITLayout";

export default function ITRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ITLayout>{children}</ITLayout>;
}
