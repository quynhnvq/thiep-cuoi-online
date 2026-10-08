import { readFile } from "fs/promises";
import path from "path";
import { Suspense } from "react";
import { WeddingApp } from "@/components/wedding/WeddingApp";

async function loadFragment(name: "envelope" | "main") {
  const file = path.join(
    process.cwd(),
    "public/wedding/fragments",
    `${name === "main" ? "main" : "envelope"}.html`,
  );
  return readFile(file, "utf8");
}

export async function WeddingPage({ guestName }: { guestName?: string }) {
  const [envelopeHtml, inviteHtml] = await Promise.all([
    loadFragment("envelope"),
    loadFragment("main"),
  ]);

  return (
    <>
      <link rel="stylesheet" href="/wedding/css/animate.css" />
      <link rel="stylesheet" href="/wedding/css/envelope.css" />
      <link rel="stylesheet" href="/wedding/css/main.css" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Taviraj:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Dancing+Script:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap"
      />
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fff" }} />}>
        <WeddingApp
          envelopeHtml={envelopeHtml}
          inviteHtml={inviteHtml}
          guestName={guestName}
        />
      </Suspense>
    </>
  );
}
