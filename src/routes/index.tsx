import { createFileRoute } from "@tanstack/react-router";
import App from "@/components/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "For Sirisha Mam — A Teacher's Day Film" },
      {
        name: "description",
        content:
          "A magical little bunny film: a shy thank you, a golden crown, and a warm hug for the most wonderful teacher.",
      },
      { property: "og:title", content: "For Sirisha Mam — A Teacher's Day Film" },
      {
        property: "og:description",
        content: "A bunny walks out of the night sky to say thank you. Happy Teacher's Day, Mam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});
