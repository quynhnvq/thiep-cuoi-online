import type { ReactNode } from "react";

export default function LinhToanLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/wedding/css/animate.css" />
      <link rel="stylesheet" href="/wedding/css/envelope.css" />
      <link rel="stylesheet" href="/wedding/css/main.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Taviraj:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Dancing+Script:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap"
      />
      {children}
    </>
  );
}
