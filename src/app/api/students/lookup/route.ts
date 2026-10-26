import {
  createLookupDependencies,
} from "@/lib/lookup/dependencies";
import {
  lookupResponse,
  performLookup,
} from "@/lib/lookup/perform-lookup";

export async function POST(request: Request): Promise<Response> {
  const outcome = await performLookup(
    request,
    createLookupDependencies(request),
  );
  return lookupResponse(outcome);
}
