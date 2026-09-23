import { POST as handler } from "../../groq/payload/route";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  return handler(req);
}
