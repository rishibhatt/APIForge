import WorkspaceShell from "@/components/sections/WorkspaceShell/WorkspaceShell";
import {
  generateOrganizationJsonLd,
  generateSoftwareApplicationJsonLd,
  generateWebSiteJsonLd,
} from "@/lib/seo/jsonld";

const homeJsonLd = [
  generateOrganizationJsonLd(),
  generateWebSiteJsonLd(),
  generateSoftwareApplicationJsonLd(
    "APIForge",
    "Parse, test, score and generate from any OpenAPI or Swagger spec in the browser. Free, open source, no account.",
    "/"
  ),
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <WorkspaceShell />
    </>
  );
}
