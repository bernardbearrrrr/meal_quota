import KantinLayout from "../components/KantinLayout";

export default function KantinRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <KantinLayout>{children}</KantinLayout>;
}
