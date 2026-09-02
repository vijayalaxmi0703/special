globalThis.__nitro_main__ = import.meta.url;
import { i as HTTPError, n as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
import { r as FastResponse } from "./_libs/h3-v2+rou3+srvx.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/left-arm.png": {
		"type": "image/png",
		"etag": "\"acde-NjSp/oAVIQyjsKJshj8JK0BnNPU\"",
		"mtime": "2026-08-30T05:27:35.062Z",
		"size": 44254,
		"path": "../public/left-arm.png"
	},
	"/crown.png": {
		"type": "image/png",
		"etag": "\"16d0c-AxJ8PPIhH3M+xTeSKHG5nzsywkE\"",
		"mtime": "2026-08-30T05:27:35.049Z",
		"size": 93452,
		"path": "../public/crown.png"
	},
	"/assets/styles-DxCbyhQC.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"13f57-l2gEfy8mLRLUSW2XiXQWNox1cGc\"",
		"mtime": "2026-09-02T04:50:17.143Z",
		"size": 81751,
		"path": "../public/assets/styles-DxCbyhQC.css"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"a0-CKGXSIe7TSsqDTmGm/nY1t/o5d0\"",
		"mtime": "2026-08-30T05:27:35.062Z",
		"size": 160,
		"path": "../public/robots.txt"
	},
	"/right-arm.png": {
		"type": "image/png",
		"etag": "\"9ff4-Qqrisj8fL4HH7OhdaL2Pj5ghpao\"",
		"mtime": "2026-08-30T05:27:35.053Z",
		"size": 40948,
		"path": "../public/right-arm.png"
	},
	"/assets/routes-B7C3NNJD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b5ba-1kB6JbUvW8UUMdoR5TdZi3snQdk\"",
		"mtime": "2026-09-02T04:50:17.143Z",
		"size": 374202,
		"path": "../public/assets/routes-B7C3NNJD.js"
	},
	"/assets/index-B1N1j1CR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"54b92-usmSf5skMTOh0U56TMPwjfYs2Z4\"",
		"mtime": "2026-09-02T04:50:17.143Z",
		"size": 347026,
		"path": "../public/assets/index-B1N1j1CR.js"
	},
	"/bunny/left-arm.png": {
		"type": "image/png",
		"etag": "\"bfb8-xDp16/Jq85eszmgzzkMHi73g/W0\"",
		"mtime": "2026-08-30T05:27:35.157Z",
		"size": 49080,
		"path": "../public/bunny/left-arm.png"
	},
	"/bunny/left-ear.png": {
		"type": "image/png",
		"etag": "\"1310b-XiR6Avha3ZCLUWAaFu0zd0eb6AY\"",
		"mtime": "2026-08-30T05:27:35.062Z",
		"size": 78091,
		"path": "../public/bunny/left-ear.png"
	},
	"/bunny/left-leg.png": {
		"type": "image/png",
		"etag": "\"a923-DjRCy44QxWAo8jUCmvZ5/RG9e2U\"",
		"mtime": "2026-08-30T05:27:35.077Z",
		"size": 43299,
		"path": "../public/bunny/left-leg.png"
	},
	"/bunny/left-pupil.png": {
		"type": "image/png",
		"etag": "\"23fe-68GYur4uCSczWLrnK8z6GGc2jO0\"",
		"mtime": "2026-08-30T05:27:35.125Z",
		"size": 9214,
		"path": "../public/bunny/left-pupil.png"
	},
	"/bunny/head.png": {
		"type": "image/png",
		"etag": "\"31765-ke0d2zc741axet8nzcqonMaIYfI\"",
		"mtime": "2026-08-30T05:27:35.125Z",
		"size": 202597,
		"path": "../public/bunny/head.png"
	},
	"/bunny/right-arm.png": {
		"type": "image/png",
		"etag": "\"c0c3-ZNSaiIYBoe6TRutsU/dLiukeH5U\"",
		"mtime": "2026-08-30T05:27:35.121Z",
		"size": 49347,
		"path": "../public/bunny/right-arm.png"
	},
	"/bunny/right-ear.png": {
		"type": "image/png",
		"etag": "\"12709-pDEs4LoWPZrijIRbs5zk7VkVh3c\"",
		"mtime": "2026-08-30T05:27:35.077Z",
		"size": 75529,
		"path": "../public/bunny/right-ear.png"
	},
	"/bunny/right-leg.png": {
		"type": "image/png",
		"etag": "\"b3a8-UzLGkaOxQJbQX3Tf2EIpIkznpIo\"",
		"mtime": "2026-08-30T05:27:35.094Z",
		"size": 45992,
		"path": "../public/bunny/right-leg.png"
	},
	"/bunny/right-pupil.png": {
		"type": "image/png",
		"etag": "\"2388-A8ogZNvmdiE1DfwmzNzXSwDKJ/I\"",
		"mtime": "2026-08-30T05:27:35.094Z",
		"size": 9096,
		"path": "../public/bunny/right-pupil.png"
	},
	"/bunny/body.png": {
		"type": "image/png",
		"etag": "\"c8c70-spJv4k5pL5jeCWTLLsCk7p+VgyA\"",
		"mtime": "2026-08-30T05:27:35.157Z",
		"size": 822384,
		"path": "../public/bunny/body.png"
	},
	"/bunny/mouth-mid.png": {
		"type": "image/png",
		"etag": "\"1e8ab0-gf17Ivpg0igpQdjX5xnx8urMu/g\"",
		"mtime": "2026-08-30T13:04:50.361Z",
		"size": 2001584,
		"path": "../public/bunny/mouth-mid.png"
	},
	"/bunny/mouth-open.png": {
		"type": "image/png",
		"etag": "\"1fb38b-1IBGSFXX88qYlx0mfitqUs7mZUk\"",
		"mtime": "2026-08-30T13:01:41.070Z",
		"size": 2077579,
		"path": "../public/bunny/mouth-open.png"
	},
	"/bunny/mouth.png": {
		"type": "image/png",
		"etag": "\"1e7075-LH3akIn2ZR/yeCeWeMiLSo3LE0k\"",
		"mtime": "2026-08-30T13:08:36.158Z",
		"size": 1994869,
		"path": "../public/bunny/mouth.png"
	},
	"/music/background.mp4": {
		"type": "video/mp4",
		"etag": "\"304563-MDLFpJjVw1SvSEYs1aCFb4q1gYk\"",
		"mtime": "2026-08-30T05:27:35.210Z",
		"size": 3163491,
		"path": "../public/music/background.mp4"
	},
	"/music/hug.mp4": {
		"type": "video/mp4",
		"etag": "\"7029c8-Qmj+9MWTTdyLizyM7CQbe/QPPaQ\"",
		"mtime": "2026-08-30T05:27:35.253Z",
		"size": 7350728,
		"path": "../public/music/hug.mp4"
	},
	"/video/memory.mp4": {
		"type": "video/mp4",
		"etag": "\"891e50-5niLqVud9F5D9d5Rf3MJ35UNn9s\"",
		"mtime": "2026-08-30T10:51:02.750Z",
		"size": 8986192,
		"path": "../public/video/memory.mp4"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_4DdUwE = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_4DdUwE
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
