import {
  createLookupDependencies,
} from "@/lib/lookup/dependencies";
import {
  lookupResponse,
  performLookup,
} from "@/lib/lookup/perform-lookup";
import { recordLookupEvent } from "@/lib/postgres/lookup-events";

export async function POST(request: Request): Promise<Response> {
  const logged = request.clone();
  const outcome = await performLookup(
    request,
    createLookupDependencies(request),
  );
  await recordLookupEvent(logged, outcome);
  return lookupResponse(outcome);
}
