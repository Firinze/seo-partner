export const metadata = {
  title: "Next.js Real World Enterprise",
  description: "High performance enterprise Next.js application."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html><body>{children}</body></html>);
}