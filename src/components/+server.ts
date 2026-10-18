export async function GET({ params, url, platform }) {
  const handler = await platform?.env.MIGHTY_KV.get("handler");

  // rest implementation
  return new Response(handler || "No handler found", { status: 200 });
}