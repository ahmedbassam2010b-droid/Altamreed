export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const root = "bawabet-altamreed.com";
    const host = incoming.hostname.toLowerCase();
    if (host === root || host === "www." + root) return fetch(request);
    const suffix = "." + root;
    if (!host.endsWith(suffix)) return new Response("Not found", { status: 404 });
    const slug = host.slice(0, -suffix.length);
    if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(slug)) return new Response("Invalid academy address", { status: 404 });
    const target = new URL(incoming.pathname + incoming.search, "https://" + root);
    if (incoming.pathname === "/" || incoming.pathname === "/academy.html") {
      target.pathname = "/academy.html";
      target.searchParams.set("slug", slug);
    } else if (!/^\/(css|js|assets)\//.test(incoming.pathname) && incoming.pathname !== "/favicon.ico") {
      return new Response("Not found", { status: 404 });
    }
    return fetch(new Request(target.toString(), request));
  }
};
