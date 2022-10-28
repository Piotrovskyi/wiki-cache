/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	WIKI_CACHE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
}
const regexp = new RegExp('https:\/\/(.*?)\/');

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const { searchParams, pathname } = new URL(request.url)
		let invalidate = searchParams.get('invalidate') === 'true'

		const parts = pathname.split('/')
		if (parts.length > 2) {
			return new Response('bad url', { status: 400 });
		}
		const term = parts[1]
		if (term === 'favicon.ico' || !term) {
			return new Response('bad url', { status: 400 });
		}

		const existingResult = !invalidate && await env.WIKI_CACHE.get(term);
		if (existingResult) {
			return new Response(existingResult);
		}
		console.log('fetching from wiki')
		const res: any = await fetch(`https://dbpedia.org/data/${term}.json`).then((res) => res.json());
		try {
			if (Object.keys(res).length !== 0) {
				await env.WIKI_CACHE.put(term, JSON.stringify(res), { expirationTtl: 60 * 60 * 24 * 7 });
			}
		} catch (err) {
			console.log(err)
		}
		return new Response(JSON.stringify(res));
	},
};
