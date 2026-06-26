import OperatorLayout from "../components/OperatorLayout";

export default function ScanLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OperatorLayout>{children}</OperatorLayout>;
}
