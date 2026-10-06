import { getAllContributors } from "@/lib/support/contributors";
import ContributorGrid from "./ContributorGrid";

/** Server component: merges contributors.json with the GitHub contributors list, then hands it to the client grid. */
export default async function Contributors() {
  const contributors = await getAllContributors();
  return <ContributorGrid contributors={contributors} />;
}
