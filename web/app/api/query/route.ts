export async function POST(req: Request) {
  const body = await req.text();
  const res = await fetch(
    "https://cheerful-contentment-production-2a8f.up.railway.app/query",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
  const data = await res.text();
  return new Response(data, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

export default {} as never;
