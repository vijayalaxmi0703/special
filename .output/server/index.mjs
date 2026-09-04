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
	"/crown.png": {
		"type": "image/png",
		"etag": "\"16d0c-AxJ8PPIhH3M+xTeSKHG5nzsywkE\"",
		"mtime": "2026-09-04T06:18:28.129Z",
		"size": 93452,
		"path": "../public/crown.png"
	},
	"/left-arm.png": {
		"type": "image/png",
		"etag": "\"acde-NjSp/oAVIQyjsKJshj8JK0BnNPU\"",
		"mtime": "2026-09-04T06:18:28.140Z",
		"size": 44254,
		"path": "../public/left-arm.png"
	},
	"/robots.txt": {
		"type": "text/plain; charset=utf-8",
		"etag": "\"a0-CKGXSIe7TSsqDTmGm/nY1t/o5d0\"",
		"mtime": "2026-09-04T06:18:28.145Z",
		"size": 160,
		"path": "../public/robots.txt"
	},
	"/right-arm.png": {
		"type": "image/png",
		"etag": "\"9ff4-Qqrisj8fL4HH7OhdaL2Pj5ghpao\"",
		"mtime": "2026-09-04T06:18:28.135Z",
		"size": 40948,
		"path": "../public/right-arm.png"
	},
	"/assets/styles-DQibvGOj.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"13de5-aNjHsKr3YxPKoydI8PiFWSsGjmI\"",
		"mtime": "2026-09-04T16:56:17.794Z",
		"size": 81381,
		"path": "../public/assets/styles-DQibvGOj.css"
	},
	"/assets/routes-BxKJJkQr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5bdb5-LlftMipsctvCMdMsrmrUHtrTc6k\"",
		"mtime": "2026-09-04T16:56:17.786Z",
		"size": 376245,
		"path": "../public/assets/routes-BxKJJkQr.js"
	},
	"/assets/index-WoTpOns2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"54be3-VtMIkG/2aHsgbeDX/b341jKqZ30\"",
		"mtime": "2026-09-04T16:56:17.786Z",
		"size": 347107,
		"path": "../public/assets/index-WoTpOns2.js"
	},
	"/bunny/head.png": {
		"type": "image/png",
		"etag": "\"31765-ke0d2zc741axet8nzcqonMaIYfI\"",
		"mtime": "2026-09-04T06:18:28.202Z",
		"size": 202597,
		"path": "../public/bunny/head.png"
	},
	"/bunny/left-leg.png": {
		"type": "image/png",
		"etag": "\"a923-DjRCy44QxWAo8jUCmvZ5/RG9e2U\"",
		"mtime": "2026-09-04T06:18:28.164Z",
		"size": 43299,
		"path": "../public/bunny/left-leg.png"
	},
	"/bunny/left-ear.png": {
		"type": "image/png",
		"etag": "\"1310b-XiR6Avha3ZCLUWAaFu0zd0eb6AY\"",
		"mtime": "2026-09-04T06:18:28.152Z",
		"size": 78091,
		"path": "../public/bunny/left-ear.png"
	},
	"/bunny/left-arm.png": {
		"type": "image/png",
		"etag": "\"bfb8-xDp16/Jq85eszmgzzkMHi73g/W0\"",
		"mtime": "2026-09-04T06:18:28.216Z",
		"size": 49080,
		"path": "../public/bunny/left-arm.png"
	},
	"/bunny/left-pupil.png": {
		"type": "image/png",
		"etag": "\"23fe-68GYur4uCSczWLrnK8z6GGc2jO0\"",
		"mtime": "2026-09-04T06:18:28.194Z",
		"size": 9214,
		"path": "../public/bunny/left-pupil.png"
	},
	"/bunny/mouth-open.png": {
		"type": "image/png",
		"etag": "\"17457-fjKe/JbuekrizhP4vwzMwNeL4oM\"",
		"mtime": "2026-09-04T06:18:28.232Z",
		"size": 95319,
		"path": "../public/bunny/mouth-open.png"
	},
	"/bunny/mouth-mid.png": {
		"type": "image/png",
		"etag": "\"166ef-F4eIEYIFrb8u4h0vPdfH7BWhmjQ\"",
		"mtime": "2026-09-04T06:18:28.182Z",
		"size": 91887,
		"path": "../public/bunny/mouth-mid.png"
	},
	"/bunny/mouth.png": {
		"type": "image/png",
		"etag": "\"16339-sCHULWsCO9L5MF3/zriDrmE5QIM\"",
		"mtime": "2026-09-04T06:18:28.207Z",
		"size": 90937,
		"path": "../public/bunny/mouth.png"
	},
	"/bunny/right-leg.png": {
		"type": "image/png",
		"etag": "\"b3a8-UzLGkaOxQJbQX3Tf2EIpIkznpIo\"",
		"mtime": "2026-09-04T06:18:28.176Z",
		"size": 45992,
		"path": "../public/bunny/right-leg.png"
	},
	"/bunny/right-arm.png": {
		"type": "image/png",
		"etag": "\"c0c3-ZNSaiIYBoe6TRutsU/dLiukeH5U\"",
		"mtime": "2026-09-04T06:18:28.189Z",
		"size": 49347,
		"path": "../public/bunny/right-arm.png"
	},
	"/bunny/right-pupil.png": {
		"type": "image/png",
		"etag": "\"2388-A8ogZNvmdiE1DfwmzNzXSwDKJ/I\"",
		"mtime": "2026-09-04T06:18:28.166Z",
		"size": 9096,
		"path": "../public/bunny/right-pupil.png"
	},
	"/bunny/right-ear.png": {
		"type": "image/png",
		"etag": "\"12709-pDEs4LoWPZrijIRbs5zk7VkVh3c\"",
		"mtime": "2026-09-04T06:18:28.152Z",
		"size": 75529,
		"path": "../public/bunny/right-ear.png"
	},
	"/bunny/body.png": {
		"type": "image/png",
		"etag": "\"c8c70-spJv4k5pL5jeCWTLLsCk7p+VgyA\"",
		"mtime": "2026-09-04T06:18:28.216Z",
		"size": 822384,
		"path": "../public/bunny/body.png"
	},
	"/music/background.mp4": {
		"type": "video/mp4",
		"etag": "\"1775a8-aCKuOH4ySfVQo2X47VkNs5cS6is\"",
		"mtime": "2026-09-04T06:18:28.252Z",
		"size": 1537448,
		"path": "../public/music/background.mp4"
	},
	"/music/hug.mp4": {
		"type": "video/mp4",
		"etag": "\"2a0de0-5NCTz1Hx+HLaReP/hfOAabT344s\"",
		"mtime": "2026-09-04T06:18:28.277Z",
		"size": 2756064,
		"path": "../public/music/hug.mp4"
	},
	"/video/memory.mp4": {
		"type": "video/mp4",
		"etag": "\"67efc1-7XrqBN/L2+SgvFlHLHo84ynmsrQ\"",
		"mtime": "2026-09-04T06:18:28.329Z",
		"size": 6811585,
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
