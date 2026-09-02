import { n as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, r as performance_default, t as motion } from "../_libs/framer-motion+[...].mjs";
import { n as require_jsx_runtime, r as require_react } from "../_libs/react+tanstack__react-query.mjs";
import { n as Volume2, r as RotateCcw, t as VolumeX } from "../_libs/lucide-react.mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cs5gQCQd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var P = {
	leftEar: {
		left: 172,
		top: 6,
		width: 98,
		z: 1
	},
	rightEar: {
		left: 330,
		top: 6,
		width: 98,
		z: 1
	},
	body: {
		left: 170,
		top: 348,
		width: 260,
		z: 3
	},
	leftLeg: {
		left: 206,
		top: 548,
		width: 88,
		z: 2
	},
	rightLeg: {
		left: 306,
		top: 548,
		width: 88,
		z: 2
	},
	head: {
		left: 140,
		top: 124,
		width: 320,
		z: 4
	},
	leftShoulder: {
		left: 203,
		top: 408,
		z: 4
	},
	rightShoulder: {
		left: 398,
		top: 408,
		z: 4
	},
	leftPupil: {
		left: 197,
		top: 248,
		width: 50,
		z: 6
	},
	rightPupil: {
		left: 347,
		top: 248,
		width: 50,
		z: 6
	},
	mouth: {
		left: 241,
		top: 265,
		width: 111,
		z: 6
	}
};
var HEAD_GEOMETRY = {
	left: P.head.left,
	width: P.head.width
};
/** The three lip-sync frames, in mouth-opening order. Speaking steps
through [0,1,2,1,0] (closed -> mid -> open -> mid -> closed) on a loop
via MOUTH_STEP_MS below. Only the <Img src> changes. */
var MOUTH_CLOSED = "/bunny/mouth.png";
var MOUTH_MID = "/bunny/mouth-mid.png";
var MOUTH_OPEN = "/bunny/mouth-open.png";
var MOUTH_FRAMES = [
	MOUTH_CLOSED,
	MOUTH_MID,
	MOUTH_OPEN,
	MOUTH_MID,
	MOUTH_CLOSED
];
var MOUTH_STEP_MS = 220;
/** Every static PNG the bunny needs for its very first paint. This is
the actual fix for the piece-by-piece loading bug — see PRODUCTION
ASSET-LOADING FIX above. Paths verified against public/bunny/ in the
uploaded project. */
var CRITICAL_BUNNY_ASSETS = [
	"/bunny/body.png",
	"/bunny/head.png",
	"/bunny/left-ear.png",
	"/bunny/right-ear.png",
	"/bunny/left-arm.png",
	"/bunny/right-arm.png",
	"/bunny/left-leg.png",
	"/bunny/right-leg.png",
	"/bunny/left-pupil.png",
	"/bunny/right-pupil.png",
	MOUTH_CLOSED,
	MOUTH_MID,
	MOUTH_OPEN
];
/** Crown lives at /crown.png (site root) — verified directly against
public/crown.png in the uploaded project. It's needed much later
(the crown scene), so it's deliberately kept OUT of the critical
eager-preload list above and fetched once the browser is idle
instead, so it doesn't compete with first-paint bandwidth. */
var CROWN_ASSET = "/crown.png";
function preloadImages(sources) {
	sources.forEach((src) => {
		const img = new Image();
		img.src = src;
	});
}
if (typeof window !== "undefined") {
	preloadImages(CRITICAL_BUNNY_ASSETS);
	("requestIdleCallback" in window ? (cb) => window.requestIdleCallback(cb) : (cb) => window.setTimeout(cb, 1500))(() => preloadImages([CROWN_ASSET]));
}
/** Hook: returns the mouth image src to show right now. Advances through
MOUTH_FRAMES on an interval while `talking` is true; snaps back to (and
stays on) the closed frame the instant `talking` goes false. This is
the entire "speaking animation" — no transforms involved. */
function useMouthFrame(talking) {
	const [frame, setFrame] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		if (!talking) {
			setFrame(0);
			return;
		}
		const id = setInterval(() => {
			setFrame((f) => (f + 1) % MOUTH_FRAMES.length);
		}, MOUTH_STEP_MS);
		return () => clearInterval(id);
	}, [talking]);
	return talking ? MOUTH_FRAMES[frame] : MOUTH_CLOSED;
}
/** MOUTH POSITION FIX: the reported "whole mouth moving up/down" bug is
the mouth's own container box changing SIZE when the src swaps
between mouth.png / mouth-mid.png / mouth-open.png. Previously the
mouth was a plain `<img className="w-full">` with no explicit
height, so its rendered height was whatever each individual PNG's
own natural aspect ratio produced — if the three frames aren't
pixel-identical in size (very likely, since they're separate
exported assets), the image's bottom edge (and, depending on how
each frame's artwork is centered on its own canvas, the apparent
position of the drawn mouth shape) shifts every time the frame
changes, even though the container's `top`/`left` never move.
Fixed here by measuring mouth.png's OWN natural aspect ratio once
(it's guaranteed to exist and is never itself animated) and locking
the mouth's box to that exact size permanently; every frame is then
rendered with `object-fit: contain` inside that fixed box, so the
box itself can never resize regardless of what the other frames'
own dimensions turn out to be. This doesn't touch the mouth's
position (still driven only by the static P.mouth left/top), any
existing mouth PNGs, or the mouth-opening logic above — it only
stops the BOX from silently changing size under the fixed anchor. */
function useMouthBoxSize(width) {
	const [size, setSize] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const img = new Image();
		img.onload = () => {
			const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1;
			setSize({
				width,
				height: width * ratio
			});
		};
		img.src = MOUTH_CLOSED;
	}, [width]);
	return size;
}
var spring = {
	type: "spring",
	stiffness: 60,
	damping: 16,
	mass: 1.1
};
var smooth = {
	duration: 1.1,
	ease: [
		.22,
		1,
		.36,
		1
	]
};
var fade = {
	duration: .5,
	ease: "easeInOut"
};
var Slot = ({ p, origin, children, ...rest }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
	className: "pointer-events-none absolute",
	style: {
		left: p.left,
		top: p.top,
		width: p.width,
		zIndex: p.z,
		transformOrigin: origin
	},
	...rest,
	children
});
var Img = ({ src, alt = "" }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
	src,
	alt,
	className: "pointer-events-none block w-full select-none",
	draggable: false
});
var ArmPivot = ({ p, imageLeft, imageTop, src, animate, transition }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
	className: "pointer-events-none absolute",
	style: {
		left: p.left,
		top: p.top,
		width: 1,
		height: 1,
		zIndex: p.z,
		transformOrigin: "0 0"
	},
	animate,
	transition,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute",
		style: {
			left: imageLeft,
			top: imageTop,
			width: 96
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src })
	})
});
var LOOK = {
	viewer: {
		x: 0,
		y: 0,
		head: 0
	},
	crown: {
		x: 11,
		y: 4,
		head: 5
	},
	shy: {
		x: -4,
		y: 8,
		head: -6
	},
	up: {
		x: 0,
		y: -8,
		head: -3
	},
	down: {
		x: 0,
		y: 9,
		head: 4
	},
	left: {
		x: -11,
		y: 0,
		head: -7
	},
	right: {
		x: 11,
		y: 0,
		head: 7
	},
	away: {
		x: 8,
		y: -6,
		head: 6
	}
};
function IntroBunny({ phase, peekX, peekTilt, blink }) {
	const headOn = phase !== "hidden";
	const armOn = phase === "wave" || phase === "greeting";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		className: "relative",
		style: {
			width: 600,
			height: 700,
			transformOrigin: "50% 100%"
		},
		animate: {
			x: peekX,
			y: 6,
			scale: 1,
			rotate: peekTilt
		},
		transition: smooth,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: headOn && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			className: "absolute inset-0",
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			exit: { opacity: 0 },
			transition: fade,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.leftEar,
					origin: "60% 92%",
					animate: { rotate: 0 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/left-ear.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.rightEar,
					origin: "40% 92%",
					animate: { rotate: 0 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/right-ear.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.head,
					origin: "50% 80%",
					animate: { scale: 1 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/head.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.leftPupil,
					origin: "50% 50%",
					animate: { scaleY: blink ? .08 : 1 },
					transition: { duration: .1 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/left-pupil.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.rightPupil,
					origin: "50% 50%",
					animate: { scaleY: blink ? .08 : 1 },
					transition: { duration: .1 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/right-pupil.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.mouth,
					origin: "50% 35%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: MOUTH_CLOSED })
				})
			]
		}, "intro-head-group") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: armOn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			exit: { opacity: 0 },
			transition: fade,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArmPivot, {
				p: P.rightShoulder,
				imageLeft: -18,
				imageTop: -13,
				src: "/bunny/right-arm.png",
				animate: {
					rotate: [
						-104,
						-118,
						-104
					],
					scale: 1.05
				},
				transition: {
					duration: .45,
					repeat: Infinity,
					ease: "easeInOut"
				}
			})
		}, "intro-arm-group") })]
	});
}
function Bunny({ pose = "idle", look = "viewer", talking = false, walking = false, smiling = false, holdingCrown = false, introPhase, peekX, peekTilt = 0, walkInFrom }) {
	const [blink, setBlink] = (0, import_react.useState)(false);
	const mouthSrc = useMouthFrame(talking);
	const mouthBox = useMouthBoxSize(P.mouth.width);
	(0, import_react.useEffect)(() => {
		let t;
		const loop = () => {
			t = setTimeout(() => {
				setBlink(true);
				setTimeout(() => setBlink(false), 130);
				loop();
			}, 2200 + Math.random() * 3800);
		};
		loop();
		return () => clearTimeout(t);
	}, []);
	if (introPhase) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntroBunny, {
		phase: introPhase,
		peekX: peekX ?? 0,
		peekTilt,
		blink
	});
	const gaze = LOOK[look];
	const isHug = pose === "hug";
	const isApproach = pose === "approach";
	const isRaise = pose === "raise";
	const isHold = pose === "holdCrown";
	const isLean = pose === "lean";
	const isHoldFrame = pose === "holdFrame";
	const rootAnim = (() => {
		switch (pose) {
			case "offstage": return {
				x: -640,
				y: 0,
				scale: .95,
				rotate: 0,
				opacity: 1
			};
			case "walkIn": return {
				x: 0,
				y: 0,
				scale: .96,
				rotate: 0,
				opacity: 1
			};
			case "toCrown": return {
				x: 190,
				y: 0,
				scale: .82,
				rotate: 0,
				opacity: 1
			};
			case "holdCrown": return walking ? {
				x: 0,
				y: 0,
				scale: 1.08,
				rotate: 0,
				opacity: 1
			} : {
				x: 190,
				y: 0,
				scale: .82,
				rotate: 0,
				opacity: 1
			};
			case "approach": return {
				x: 0,
				y: [
					0,
					6,
					14,
					24
				],
				scale: [
					1,
					1.15,
					1.4,
					1.65
				],
				rotate: 0,
				opacity: 1
			};
			case "hug": return {
				x: 0,
				y: 44,
				scale: 1.75,
				rotate: 0,
				opacity: 1
			};
			case "release": return {
				x: 0,
				y: 8,
				scale: 1.15,
				rotate: 0,
				opacity: 1
			};
			case "sit": return {
				x: 0,
				y: 30,
				scale: .88,
				rotate: 0,
				opacity: 1
			};
			default: return {
				x: 0,
				y: 0,
				scale: 1,
				rotate: 0,
				opacity: 1
			};
		}
	})();
	const rootTransition = isApproach ? {
		duration: 3.2,
		ease: "easeInOut"
	} : isHug ? {
		duration: 1.4,
		ease: [
			.22,
			1,
			.36,
			1
		]
	} : pose === "walkIn" ? {
		duration: 3.4,
		ease: [
			.32,
			.72,
			.35,
			1
		]
	} : isHold && walking ? {
		duration: 2.4,
		ease: [
			.32,
			.72,
			.35,
			1
		]
	} : { ...spring };
	const bobAnim = walking ? {
		y: [
			0,
			-9,
			0,
			-9,
			0
		],
		rotate: [
			0,
			-1.1,
			0,
			1.1,
			0
		]
	} : isHug ? {
		y: [
			0,
			-5,
			0
		],
		rotate: [
			0,
			.6,
			0
		]
	} : {
		y: [
			0,
			-5,
			0
		],
		rotate: [
			0,
			.5,
			0,
			-.5,
			0
		]
	};
	const bobTransition = {
		duration: walking ? .78 : isHug ? 2.6 : 4.6,
		repeat: Infinity,
		ease: "easeInOut"
	};
	const headTilt = pose === "shy" ? -8 : pose === "curious" ? 9 : pose === "surprised" ? -4 : pose === "wave" ? 5 : gaze.head * .6;
	const headAnim = {
		rotate: [
			headTilt - 1.2,
			headTilt + 1.2,
			headTilt - 1.2
		],
		y: pose === "shy" ? 8 : pose === "surprised" ? -6 : 0,
		x: gaze.x * .25
	};
	const earSwing = walking ? 7 : isHug ? 3 : 4;
	const earTransition = {
		duration: walking ? .78 : 4.2,
		repeat: Infinity,
		ease: "easeInOut"
	};
	const armLeft = (() => {
		if (isHug) return {
			rotate: [
				2,
				22,
				44,
				64
			],
			scale: [
				1,
				1.05,
				1.09,
				1.11
			]
		};
		if (isApproach) return {
			rotate: [
				-6,
				-30,
				-58
			],
			scale: 1
		};
		if (isRaise) return {
			rotate: 100,
			scale: 1.04
		};
		if (isHold) return {
			rotate: 56,
			scale: 1.4
		};
		if (isHoldFrame) return {
			rotate: 62,
			scale: 1
		};
		if (isLean) return {
			rotate: 62,
			scale: 1
		};
		if (pose === "wave") return {
			rotate: [
				120,
				152,
				120
			],
			scale: 1
		};
		if (walking) return {
			rotate: [
				-4,
				10,
				-4
			],
			scale: 1
		};
		return {
			rotate: [
				-2,
				4,
				-2
			],
			scale: 1
		};
	})();
	const armRight = (() => {
		if (isHug) return {
			rotate: [
				-2,
				-22,
				-44,
				-64
			],
			scale: [
				1,
				1.05,
				1.09,
				1.11
			]
		};
		if (isApproach) return {
			rotate: [
				6,
				30,
				58
			],
			scale: 1
		};
		if (isRaise) return {
			rotate: -100,
			scale: 1.04
		};
		if (isHold) return {
			rotate: -56,
			scale: 1.4
		};
		if (isHoldFrame) return {
			rotate: -62,
			scale: 1
		};
		if (isLean) return {
			rotate: -62,
			scale: 1
		};
		if (pose === "wave") return {
			rotate: [
				4,
				-8,
				4
			],
			scale: 1
		};
		if (walking) return {
			rotate: [
				4,
				-10,
				4
			],
			scale: 1
		};
		return {
			rotate: [
				2,
				-4,
				2
			],
			scale: 1
		};
	})();
	const showHeldCrown = holdingCrown;
	const HELD_CROWN_WIDTH = 220;
	const heldCrownTop = isRaise ? 188 : 375;
	const HELD_CROWN_Z = 4;
	const armTransition = isHug ? {
		duration: 1.2,
		ease: [
			.22,
			1,
			.36,
			1
		],
		times: [
			0,
			.45,
			.8,
			1
		]
	} : isRaise || isHold || isLean || isHoldFrame ? {
		type: "spring",
		stiffness: 55,
		damping: 15
	} : isApproach ? {
		duration: 3.2,
		ease: "easeInOut"
	} : {
		duration: pose === "wave" ? .6 : walking ? .78 : 4,
		repeat: Infinity,
		ease: "easeInOut"
	};
	const legTransition = {
		duration: .78,
		repeat: Infinity,
		ease: "easeInOut"
	};
	const legIdleTransition = {
		duration: 4.6,
		repeat: Infinity,
		ease: "easeInOut"
	};
	const legL = walking ? { rotate: [
		9,
		-9,
		9
	] } : { rotate: [
		.8,
		-.8,
		.8
	] };
	const legR = walking ? { rotate: [
		-9,
		9,
		-9
	] } : { rotate: [
		-.8,
		.8,
		-.8
	] };
	const pupil = {
		x: gaze.x,
		y: gaze.y,
		scaleY: blink ? .08 : 1
	};
	const pupilTransition = {
		x: spring,
		y: spring,
		scaleY: { duration: .1 }
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		className: "relative",
		style: {
			width: 600,
			height: 700,
			transformOrigin: "50% 100%"
		},
		initial: walkInFrom ? {
			x: walkInFrom.x,
			y: walkInFrom.y,
			scale: 1,
			rotate: walkInFrom.rotate,
			opacity: 1
		} : false,
		animate: rootAnim,
		transition: rootTransition,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			className: "absolute inset-0",
			style: { transformOrigin: "50% 100%" },
			animate: bobAnim,
			transition: bobTransition,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.leftEar,
					origin: "60% 92%",
					animate: { rotate: [
						-earSwing,
						earSwing * .4,
						-earSwing
					] },
					transition: { rotate: earTransition },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/left-ear.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.rightEar,
					origin: "40% 92%",
					animate: { rotate: [
						earSwing,
						-earSwing * .4,
						earSwing
					] },
					transition: { rotate: earTransition },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/right-ear.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.body,
					origin: "50% 90%",
					animate: {
						scaleY: [
							1,
							1.018,
							1
						],
						scaleX: [
							1,
							.992,
							1
						]
					},
					transition: {
						scaleY: legIdleTransition,
						scaleX: legIdleTransition
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, {
						src: "/bunny/body.png",
						alt: "A soft white plush bunny"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.leftLeg,
					origin: "50% 8%",
					animate: legL,
					transition: { rotate: walking ? legTransition : legIdleTransition },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/left-leg.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
					p: P.rightLeg,
					origin: "50% 8%",
					animate: legR,
					transition: { rotate: walking ? legTransition : legIdleTransition },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/right-leg.png" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: showHeldCrown && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					className: "pointer-events-none absolute",
					style: {
						left: 300,
						marginLeft: -110,
						width: HELD_CROWN_WIDTH,
						zIndex: HELD_CROWN_Z,
						transformOrigin: "50% 70%"
					},
					initial: {
						opacity: 0,
						top: heldCrownTop + 12,
						scale: .85
					},
					animate: {
						opacity: 1,
						top: heldCrownTop,
						scale: 1
					},
					exit: {
						opacity: 0,
						scale: .85
					},
					transition: {
						type: "spring",
						stiffness: 55,
						damping: 15
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, {
						src: CROWN_ASSET,
						alt: "A golden crown held between both hands"
					})
				}, "held-crown") }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					className: "absolute inset-0",
					style: {
						transformOrigin: "50% 60%",
						zIndex: 5
					},
					animate: headAnim,
					transition: {
						rotate: {
							duration: 4.6,
							repeat: Infinity,
							ease: "easeInOut"
						},
						default: spring
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
							p: P.head,
							origin: "50% 80%",
							animate: { scale: [
								1,
								1.006,
								1
							] },
							transition: legIdleTransition,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/head.png" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
							p: P.leftPupil,
							origin: "50% 50%",
							animate: pupil,
							transition: pupilTransition,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/left-pupil.png" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
							p: P.rightPupil,
							origin: "50% 50%",
							animate: pupil,
							transition: pupilTransition,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Img, { src: "/bunny/right-pupil.png" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slot, {
							p: P.mouth,
							origin: "50% 35%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								style: {
									width: P.mouth.width,
									height: mouthBox?.height,
									position: "relative"
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: mouthSrc,
									alt: "",
									draggable: false,
									className: "pointer-events-none absolute inset-0 block h-full w-full select-none",
									style: { objectFit: "contain" }
								})
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArmPivot, {
					p: P.leftShoulder,
					imageLeft: -79,
					imageTop: -13,
					src: "/bunny/left-arm.png",
					animate: armLeft,
					transition: armTransition
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArmPivot, {
					p: P.rightShoulder,
					imageLeft: -18,
					imageTop: -13,
					src: "/bunny/right-arm.png",
					animate: armRight,
					transition: armTransition
				})
			]
		})
	});
}
function useSeeded(count, seed = 1) {
	return (0, import_react.useMemo)(() => {
		let s = seed;
		const rnd = () => {
			s = (s * 9301 + 49297) % 233280;
			return s / 233280;
		};
		return Array.from({ length: count }, () => ({
			x: rnd() * 100,
			y: rnd() * 100,
			size: 1 + rnd() * 2.4,
			delay: rnd() * 4,
			dur: 2.4 + rnd() * 3.6
		}));
	}, [count, seed]);
}
function Background({ showMoon = false, warm = false }) {
	const stars = useSeeded(70, 7);
	const motes = useSeeded(18, 31);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-night-gradient" }),
			stars.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
				className: "absolute rounded-full bg-star",
				style: {
					left: `${s.x}%`,
					top: `${s.y * .75}%`,
					width: s.size,
					height: s.size
				},
				animate: {
					opacity: [
						.15,
						.9,
						.15
					],
					scale: [
						.8,
						1.25,
						.8
					]
				},
				transition: {
					duration: s.dur,
					delay: s.delay,
					repeat: Infinity,
					ease: "easeInOut"
				}
			}, `star-${i}`)),
			motes.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
				className: "absolute rounded-full bg-glow blur-[2px]",
				style: {
					left: `${m.x}%`,
					bottom: "-5%",
					width: m.size * 3,
					height: m.size * 3
				},
				animate: {
					y: ["0vh", "-105vh"],
					opacity: [
						0,
						.75,
						0
					]
				},
				transition: {
					duration: 14 + m.dur * 2,
					delay: m.delay * 2,
					repeat: Infinity,
					ease: "linear"
				}
			}, `mote-${i}`)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				className: "absolute left-1/2 top-[58%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-stage-glow blur-3xl",
				animate: {
					opacity: [
						.45,
						.7,
						.45
					],
					scale: [
						.96,
						1.04,
						.96
					]
				},
				transition: {
					duration: 6,
					repeat: Infinity,
					ease: "easeInOut"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				className: "absolute inset-0 bg-warm-wash",
				animate: { opacity: warm ? 1 : 0 },
				transition: {
					duration: 1.6,
					ease: "easeInOut"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				className: "absolute left-1/2 top-[14%] h-[22vmin] w-[22vmin] -translate-x-1/2 rounded-full bg-moon shadow-moon",
				initial: false,
				animate: showMoon ? {
					opacity: 1,
					scale: 1,
					y: 0
				} : {
					opacity: 0,
					scale: .7,
					y: -40
				},
				transition: {
					duration: 2.2,
					ease: "easeInOut"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-vignette" })
		]
	});
}
function Dialogue({ line, position = "bottom", tone = "soft" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `pointer-events-none absolute inset-x-0 z-50 flex justify-center px-6 ${position === "bottom" ? "bottom-[6vh]" : "top-[12vh]"}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
			mode: "wait",
			children: line ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.p, {
				initial: {
					opacity: 0,
					y: 14,
					filter: "blur(8px)"
				},
				animate: {
					opacity: 1,
					y: 0,
					filter: "blur(0px)"
				},
				exit: {
					opacity: 0,
					y: -10,
					filter: "blur(8px)"
				},
				transition: {
					duration: .7,
					ease: [
						.22,
						1,
						.36,
						1
					]
				},
				className: `max-w-[34rem] text-balance text-center font-display text-[1.35rem] leading-snug tracking-wide drop-shadow-glow sm:text-2xl ${tone === "gold" ? "text-gold" : "text-cream"}`,
				children: line
			}, line) : null
		})
	});
}
function CrownGlow({ active }) {
	const sparks = (0, import_react.useMemo)(() => Array.from({ length: 14 }, (_, i) => {
		const angle = i / 14 * Math.PI * 2;
		return {
			x: Math.cos(angle) * 120,
			y: Math.sin(angle) * 120,
			d: i * .05
		};
	}), []);
	if (!active) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute left-1/2 top-[13%] z-30 -translate-x-1/2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
			className: "h-[36vmin] w-[36vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-burst blur-2xl",
			initial: {
				opacity: 0,
				scale: .4
			},
			animate: {
				opacity: [
					0,
					.95,
					.5,
					.8
				],
				scale: [
					.4,
					1.15,
					.95,
					1.05
				]
			},
			transition: {
				duration: 2.4,
				ease: "easeOut"
			}
		}), sparks.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
			className: "absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-gold shadow-spark",
			initial: {
				opacity: 0,
				x: 0,
				y: 0,
				scale: .4
			},
			animate: {
				opacity: [
					0,
					1,
					0
				],
				x: s.x,
				y: s.y,
				scale: [
					.4,
					1.3,
					.2
				]
			},
			transition: {
				duration: 1.8,
				delay: .25 + s.d,
				repeat: Infinity,
				repeatDelay: 1.1,
				ease: "easeOut"
			}
		}, i))]
	});
}
/**
* QuestionCard — the one deliberately non-linear beat in the whole film:
* "I believe you are one of the best lecturers a student could ask for.
* Do you agree?" with a playfully evasive NO button.
*
* ROUND 4:
*
* 1) NO's final (3rd) escape is now a distinct, sequenced beat instead
*    of happening at the same instant as the fade-out. Previously
*    `noVisible = attempts < MAX_NO_ATTEMPTS` flipped to false the same
*    render the 3rd attempt's state committed, so the final hop and the
*    opacity fade animated simultaneously — the move was barely
*    legible before the button vanished. Attempt/interaction gating
*    (`noInteractive`) and actual unmounting (`noHidden`) are now two
*    separate pieces of state: on the 3rd attempt, NO immediately stops
*    accepting further attempts AND jumps to a bigger "final escape"
*    offset (FINAL_ESCAPE_MULTIPLIER × a normal hop) — but stays
*    mounted and visible for FINAL_ESCAPE_DELAY_MS so that big final
*    move is actually seen — THEN it's removed (fading/scaling out via
*    its own `exit`).
*
* 2) YES now animates into the horizontal center once NO is gone,
*    instead of staying pinned on the right. This falls directly out of
*    the true-flex-row layout from the previous round: NO is wrapped in
*    <AnimatePresence mode="popLayout">, and YES is now a
*    `motion.button` with the `layout` prop. `popLayout` removes an
*    exiting item from the flex flow immediately (while it's still
*    animating its own exit), which lets YES's `layout` animation pick
*    up the resulting flex reflow — from "second of two centered items"
*    to "sole centered item" — and glide there smoothly via Framer's
*    FLIP animation, rather than snapping or leaving a gap.
*
* Everything else — the reaction text, the dark-purple glass card
* styling, NO's normal (1st/2nd attempt) hop mechanism and its
* ~80px NO_DODGE_DISTANCE, the analytics calls (`onAttempt`, `onYes`),
* and the question text — is unchanged from before.
*/
var REACTIONS = [
	"Wait— you actually clicked No?.Hmm… I knew you might say that.But unfortunately, I don't think I'm going to accept that answer.🤭",
	"I'll pretend I didn't see that.,reconsider mam",
	"Due to this bunny respectfully disagreeing, the No button has been politely dismissed.😄",
	"Well… I suppose there's only one option left now, Mam.😁hehe"
];
var MAX_NO_ATTEMPTS = REACTIONS.length;
var REACTION_HOLD_MS = 5200;
/** How much bigger the 3rd/final escape is than a normal hop, and how
long NO stays visible after that final hop before it's removed —
long enough that the bigger move actually reads before NO fades. */
var FINAL_ESCAPE_MULTIPLIER = 1.6;
var FINAL_ESCAPE_DELAY_MS = 420;
var COLOR = {
	outerFrom: "rgba(58, 28, 92, 0.92)",
	outerTo: "rgba(30, 14, 54, 0.92)",
	outerBorder: "rgba(247, 209, 158, 0.35)",
	innerBorder: "rgba(232, 178, 255, 0.22)",
	glow: "rgba(232, 168, 255, 0.28)",
	text: "#fdf1e2",
	no: "#e8776c",
	noText: "#ffffff",
	yes: "#e0b45c",
	yesText: "#33204f"
};
var BUTTON_CLASS = "rounded-full px-7 py-2.5 font-display text-sm font-semibold shadow-md sm:px-8 sm:text-base";
/** Hand-picked hop offsets (relative to NO's own resting flex slot), all
at ~NO_DODGE_DISTANCE px. Biased toward negative x / moderate y so
NO always stays well clear of YES (which sits a fixed ~140px+ to its
right in the flex row while both are present) and inside the card. */
var DODGE_OFFSETS = [
	{
		x: -75,
		y: -30
	},
	{
		x: -40,
		y: -68
	},
	{
		x: -78,
		y: 28
	},
	{
		x: -25,
		y: 66
	},
	{
		x: -80,
		y: 0
	},
	{
		x: -55,
		y: -45
	},
	{
		x: -60,
		y: 40
	},
	{
		x: -30,
		y: -62
	}
];
var REST_OFFSET = {
	x: 0,
	y: 0
};
/** Smooth, quick, slightly bouncy "hop" — matches the 200–350ms /
natural-easing / playful requirement instead of an open-ended spring. */
var hopTransition = {
	x: {
		duration: .26,
		ease: [
			.34,
			1.56,
			.64,
			1
		]
	},
	y: {
		duration: .26,
		ease: [
			.34,
			1.56,
			.64,
			1
		]
	},
	default: {
		duration: .2,
		ease: "easeOut"
	}
};
var pickDodgeIndex = (excludeIndex) => {
	if (DODGE_OFFSETS.length <= 1) return 0;
	let idx = excludeIndex;
	while (idx === excludeIndex) idx = Math.floor(Math.random() * DODGE_OFFSETS.length);
	return idx;
};
function QuestionCard({ questionText, onYes, onAttempt }) {
	const [attempts, setAttempts] = (0, import_react.useState)(0);
	const [noOffset, setNoOffset] = (0, import_react.useState)(REST_OFFSET);
	const [noHidden, setNoHidden] = (0, import_react.useState)(false);
	const [reaction, setReaction] = (0, import_react.useState)(null);
	const reactionTimer = (0, import_react.useRef)(null);
	const hideTimer = (0, import_react.useRef)(null);
	const lastDodgeIndex = (0, import_react.useRef)(-1);
	(0, import_react.useEffect)(() => () => {
		if (reactionTimer.current) clearTimeout(reactionTimer.current);
		if (hideTimer.current) clearTimeout(hideTimer.current);
	}, []);
	/** Stops accepting further attempts as soon as the 3rd/final one
	starts — separate from `noHidden`, which controls whether NO is
	still mounted at all. This gap between the two is exactly the
	window where the final, bigger escape plays out before NO is
	removed. */
	const noInteractive = attempts < MAX_NO_ATTEMPTS;
	const handleNoAttempt = () => {
		if (!noInteractive) return;
		const next = attempts + 1;
		setAttempts(next);
		onAttempt(next);
		const isFinal = next === MAX_NO_ATTEMPTS;
		const nextIndex = pickDodgeIndex(lastDodgeIndex.current);
		lastDodgeIndex.current = nextIndex;
		const base = DODGE_OFFSETS[nextIndex];
		setNoOffset(isFinal ? {
			x: base.x * FINAL_ESCAPE_MULTIPLIER,
			y: base.y * FINAL_ESCAPE_MULTIPLIER
		} : base);
		const msg = REACTIONS[Math.min(next, REACTIONS.length) - 1] ?? null;
		setReaction(msg);
		if (reactionTimer.current) clearTimeout(reactionTimer.current);
		reactionTimer.current = setTimeout(() => setReaction(null), REACTION_HOLD_MS);
		if (isFinal) {
			if (hideTimer.current) clearTimeout(hideTimer.current);
			hideTimer.current = setTimeout(() => setNoHidden(true), FINAL_ESCAPE_DELAY_MS);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		className: "pointer-events-none absolute inset-0 z-50 flex items-end justify-center px-5",
		style: { paddingBottom: `3vh` },
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: .6 },
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "pointer-events-auto relative w-[92vw] max-w-sm rounded-[26px] p-[1.5px] shadow-2xl backdrop-blur-md",
			style: {
				maxHeight: `34vh`,
				background: `linear-gradient(160deg, ${COLOR.outerFrom}, ${COLOR.outerTo})`,
				border: `1px solid ${COLOR.outerBorder}`,
				boxShadow: `0 0 28px ${COLOR.glow}, 0 8px 30px rgba(0,0,0,0.45)`
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					className: "pointer-events-none absolute -top-2 left-5 text-sm opacity-80 sm:text-base",
					children: "✨"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					className: "pointer-events-none absolute -top-2 right-5 text-sm opacity-80 sm:text-base",
					children: "🌙"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full flex-col justify-center gap-3 rounded-[24px] border border-dashed px-4 py-4 text-center backdrop-blur-md sm:gap-4 sm:px-6 sm:py-5",
					style: {
						backgroundColor: "rgba(20, 10, 40, 0.55)",
						borderColor: COLOR.innerBorder
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
						mode: "wait",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.p, {
							initial: {
								opacity: 0,
								y: 6
							},
							animate: {
								opacity: 1,
								y: 0
							},
							exit: {
								opacity: 0,
								y: -6
							},
							transition: { duration: .35 },
							className: "font-display text-sm font-medium leading-snug sm:text-base",
							style: { color: COLOR.text },
							children: reaction ?? questionText
						}, reaction ?? "question")
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex h-28 w-full flex-row items-center justify-center gap-6 sm:h-32",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
							mode: "popLayout",
							children: !noHidden && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.button, {
								onPointerEnter: handleNoAttempt,
								onPointerDown: handleNoAttempt,
								onTouchStart: handleNoAttempt,
								onClick: (e) => e.preventDefault(),
								initial: false,
								animate: {
									opacity: 1,
									scale: 1,
									x: noOffset.x,
									y: noOffset.y
								},
								exit: {
									opacity: 0,
									scale: .8,
									transition: { duration: .3 }
								},
								transition: hopTransition,
								style: {
									backgroundColor: COLOR.no,
									color: COLOR.noText,
									pointerEvents: noInteractive ? "auto" : "none"
								},
								className: BUTTON_CLASS,
								children: "NO"
							}, "no-button")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.button, {
							layout: true,
							onClick: onYes,
							transition: { layout: {
								type: "spring",
								stiffness: 260,
								damping: 28
							} },
							style: {
								backgroundColor: COLOR.yes,
								color: COLOR.yesText
							},
							className: `${BUTTON_CLASS} transition-transform active:scale-95`,
							children: "YES"
						})]
					})]
				})
			]
		})
	});
}
var HOLD_MS = 1500;
var FADE_MS = 900;
var VideoScene = (0, import_react.forwardRef)(function VideoScene({ active, onComplete, onEnded, frameMaxHVh = 75, frameBottomVh = 3 }, ref) {
	const videoRef = (0, import_react.useRef)(null);
	const [stage, setStage] = (0, import_react.useState)("idle");
	const [needsUnmute, setNeedsUnmute] = (0, import_react.useState)(false);
	const [shouldPreload, setShouldPreload] = (0, import_react.useState)(false);
	const completedRef = (0, import_react.useRef)(false);
	const endedFiredRef = (0, import_react.useRef)(false);
	const holdTimer = (0, import_react.useRef)(null);
	const fadeTimer = (0, import_react.useRef)(null);
	/** Bumped every time `active` becomes true; async play() attempts
	check this so a rapid active->inactive->active cycle can never
	apply a stale attempt's result. */
	const runTokenRef = (0, import_react.useRef)(0);
	/** Mirrors `active` for the native ended/error listeners, which are
	attached once (mount-only) since the element itself never
	unmounts anymore. */
	const activeRef = (0, import_react.useRef)(active);
	(0, import_react.useEffect)(() => {
		activeRef.current = active;
	}, [active]);
	/** True once a silent, gesture-linked play()+pause() has actually
	succeeded on this element — see `prime()` below. */
	const primedRef = (0, import_react.useRef)(false);
	const finish = () => {
		if (completedRef.current) return;
		completedRef.current = true;
		onComplete();
	};
	/** TEMPORARY DIAGNOSTICS — safe to delete once the audio path is
	confirmed working on the real target device/browser; only reads
	state, never changes behavior. */
	const logVideoState = (label) => {
		const video = videoRef.current;
		if (!video) return;
		console.log(`[VideoScene DEBUG] ${label}`, {
			muted: video.muted,
			volume: video.volume,
			paused: video.paused,
			readyState: video.readyState,
			currentSrc: video.currentSrc,
			currentTime: video.currentTime,
			duration: video.duration,
			networkState: video.networkState,
			error: video.error ? {
				code: video.error.code,
				message: video.error.message
			} : null
		});
	};
	const attemptPlay = async (video, token) => {
		logVideoState("before unmuted play() attempt");
		try {
			video.muted = false;
			video.volume = 1;
			await video.play();
			if (runTokenRef.current !== token) return;
			logVideoState("unmuted play() resolved");
			setStage("playing");
		} catch (err) {
			console.error("[VideoScene DEBUG] unmuted play() REJECTED:", err);
			try {
				video.muted = true;
				await video.play();
				if (runTokenRef.current !== token) return;
				logVideoState("fallback muted play() resolved (needs tap-to-unmute)");
				setNeedsUnmute(true);
				setStage("playing");
			} catch (err2) {
				console.error("[VideoScene DEBUG] fallback muted play() ALSO REJECTED — skipping scene:", err2);
				if (runTokenRef.current !== token) return;
				finish();
			}
		}
	};
	(0, import_react.useEffect)(() => {
		const video = videoRef.current;
		if (!video) return;
		if (active) {
			setShouldPreload(true);
			const token = ++runTokenRef.current;
			completedRef.current = false;
			endedFiredRef.current = false;
			setNeedsUnmute(false);
			setStage("entering");
			video.currentTime = 0;
			attemptPlay(video, token);
		} else {
			setShouldPreload(false);
			runTokenRef.current++;
			if (holdTimer.current) clearTimeout(holdTimer.current);
			if (fadeTimer.current) clearTimeout(fadeTimer.current);
			video.pause();
			setStage("idle");
		}
	}, [active]);
	(0, import_react.useEffect)(() => {
		const video = videoRef.current;
		if (!video) return;
		const handleEnded = () => {
			if (!activeRef.current) return;
			logVideoState("native `ended` event fired");
			if (!endedFiredRef.current) {
				endedFiredRef.current = true;
				onEnded?.();
			}
			setStage("holding");
			holdTimer.current = setTimeout(() => {
				setStage("fading");
				fadeTimer.current = setTimeout(() => {
					setStage("done");
					finish();
				}, FADE_MS);
			}, HOLD_MS);
		};
		const handleError = () => {
			if (!endedFiredRef.current) {
				endedFiredRef.current = true;
				onEnded?.();
			}
			finish();
		};
		video.addEventListener("ended", handleEnded);
		video.addEventListener("error", handleError);
		return () => {
			video.removeEventListener("ended", handleEnded);
			video.removeEventListener("error", handleError);
		};
	}, []);
	(0, import_react.useEffect)(() => () => {
		if (holdTimer.current) clearTimeout(holdTimer.current);
		if (fadeTimer.current) clearTimeout(fadeTimer.current);
	}, []);
	const handleUnmute = () => {
		const video = videoRef.current;
		if (!video) return;
		video.muted = false;
		video.volume = 1;
		setNeedsUnmute(false);
		video.play().catch((err) => {
			console.log("[VideoScene DEBUG] handleUnmute play() rejected:", err);
		});
	};
	/** Shared pause/resume core — used by both the on-frame click handler
	and the imperative `togglePauseResume()` (which App.tsx's
	tap-to-advance "skip" calls for clicks on the middle of the
	screen during the video scene). */
	const handleTogglePauseResume = () => {
		const video = videoRef.current;
		if (!video) return;
		if (needsUnmute) {
			handleUnmute();
			return;
		}
		if (stage !== "entering" && stage !== "playing") return;
		if (video.paused) video.play().catch((err) => {
			console.error("[VideoScene DEBUG] manual resume play() FAILED:", err);
		});
		else video.pause();
	};
	const handleSceneTap = (e) => {
		e.stopPropagation();
		if (needsUnmute) {
			handleUnmute();
			return;
		}
		handleTogglePauseResume();
	};
	const handleFrameClick = (e) => {
		e.stopPropagation();
		handleTogglePauseResume();
	};
	(0, import_react.useImperativeHandle)(ref, () => ({
		/** Silent, gesture-linked play()+pause() cycle so this exact
		<video> element is granted gesture-based playback permission
		ahead of time — see the top-of-file note. Safe to call from
		every gesture; a no-op once already primed. */
		prime: () => {
			if (primedRef.current) return;
			const video = videoRef.current;
			if (!video) return;
			video.muted = false;
			video.volume = 0;
			video.play().then(() => {
				primedRef.current = true;
				video.pause();
				video.currentTime = 0;
			}).catch(() => {
				video.pause();
			});
		},
		togglePauseResume: handleTogglePauseResume,
		reset: () => {
			const video = videoRef.current;
			if (video) {
				video.pause();
				video.currentTime = 0;
			}
			runTokenRef.current++;
			completedRef.current = false;
			endedFiredRef.current = false;
			setNeedsUnmute(false);
			setStage("idle");
		}
	}), [needsUnmute, stage]);
	const fadingOut = stage === "fading" || stage === "done";
	const visible = active && stage !== "idle" && stage !== "done";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		className: "absolute inset-0 z-40 flex items-end justify-center px-5",
		style: {
			paddingBottom: `${frameBottomVh}vh`,
			pointerEvents: active ? "auto" : "none",
			visibility: visible ? "visible" : "hidden"
		},
		onClick: handleSceneTap,
		animate: { opacity: visible ? 1 : 0 },
		transition: { duration: .8 },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				className: "absolute inset-0 bg-black",
				animate: { opacity: visible && !fadingOut ? .45 : 0 },
				transition: { duration: 1 }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-0 overflow-hidden",
				children: Array.from({ length: 14 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
					className: "absolute rounded-full bg-gold/70",
					style: {
						left: `${6 + i * 37 % 90}%`,
						width: i % 3 === 0 ? 4 : 2,
						height: i % 3 === 0 ? 4 : 2,
						filter: "blur(0.5px)"
					},
					initial: {
						y: "100%",
						opacity: 0
					},
					animate: {
						y: visible && !fadingOut ? ["100%", "-10%"] : "100%",
						opacity: visible && !fadingOut ? [
							0,
							.9,
							0
						] : 0
					},
					transition: {
						duration: 6 + i % 5,
						delay: i * .4,
						repeat: visible && !fadingOut ? Infinity : 0,
						ease: "easeOut"
					}
				}, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				className: "pointer-events-auto relative w-[96vw] max-w-3xl rounded-[22px] p-[2px]",
				style: { background: "linear-gradient(160deg, rgba(247,209,158,0.55), rgba(232,168,255,0.35))" },
				onClick: handleFrameClick,
				animate: {
					opacity: visible ? fadingOut ? 0 : 1 : 0,
					scale: visible ? fadingOut ? .94 : 1 : .88
				},
				transition: {
					duration: fadingOut ? .9 : 1.1,
					ease: [
						.22,
						1,
						.36,
						1
					]
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					className: "pointer-events-none absolute -inset-1 rounded-[26px]",
					style: { background: "radial-gradient(closest-side, rgba(232,168,255,0.45), transparent 70%)" },
					animate: { opacity: visible && !fadingOut ? [
						.35,
						.75,
						.35
					] : 0 },
					transition: {
						duration: 3.2,
						repeat: visible && !fadingOut ? Infinity : 0,
						ease: "easeInOut"
					}
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative overflow-hidden rounded-[20px] backdrop-blur-md",
					style: {
						backgroundColor: "rgba(20, 10, 40, 0.35)",
						border: "1px solid rgba(247, 209, 158, 0.25)",
						boxShadow: "0 0 40px rgba(232,168,255,0.3), 0 10px 40px rgba(0,0,0,0.5)"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
						ref: videoRef,
						src: shouldPreload ? "/video/memory.mp4" : void 0,
						playsInline: true,
						preload: shouldPreload ? "auto" : "none",
						poster: "",
						className: "block w-full",
						style: {
							objectFit: "contain",
							maxHeight: `${frameMaxHVh}vh`,
							visibility: shouldPreload ? "visible" : "hidden"
						}
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: needsUnmute && (stage === "entering" || stage === "playing") && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
						onClick: (e) => {
							e.stopPropagation();
							handleUnmute();
						},
						initial: {
							opacity: 0,
							y: 8
						},
						animate: {
							opacity: 1,
							y: 0
						},
						exit: { opacity: 0 },
						className: "absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-cream/30 bg-black/50 px-3 py-1.5 text-xs text-cream backdrop-blur-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { size: 14 }), " Tap for sound"]
					}, "unmute") })]
				})]
			})
		]
	});
});
/**
* FIX (previous version of this file crashed the whole app):
* @supabase/supabase-js's createClient() throws synchronously —
* "supabaseKey is required." — the instant it's called with an empty
* key. The old version of this file called createClient() unconditionally,
* with `?? ""` fallbacks, so when the env vars were missing that throw
* happened during module evaluation, before React ever rendered. Because
* this file is imported by analytics.ts, which is imported by App.tsx,
* the crash propagated all the way up to the root route's error boundary
* — that's the "This page didn't load" screen and the "supabaseKey is
* required" error at supabase.ts:58.
*
* The fix: never call createClient() unless both required values are
* actually present. When they're missing, `supabase` below is `null`
* instead — analytics.ts checks for that and no-ops instead of calling
* anything on it. The rest of the app doesn't touch this file at all, so
* it now loads normally with or without Supabase configured.
*
* KEY NAMING (verified against this project's actual .env.local, not
* guessed): this project already has real credentials checked in
* locally, but under Supabase's newer "publishable key" naming rather
* than the older "anon key" naming:
*
*   VITE_SUPABASE_URL=https://ihiyhdkurmhbsnbvcwhd.supabase.co
*   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
*
* (Supabase renamed "anon key" -> "publishable key" and "service_role
* key" -> "secret key" — the sb_publishable_... prefix is the new
* format. Same purpose, safe to expose client-side, new name.) This
* file reads VITE_SUPABASE_PUBLISHABLE_KEY first, matching what's
* already in your .env.local, and falls back to VITE_SUPABASE_ANON_KEY
* for compatibility if you ever use an older-style Supabase project.
* With .env.local already containing the right values, local dev needs
* no further setup.
*
* VERCEL SETUP: add both of these in Project Settings → Environment
* Variables (values from Supabase → Project Settings → API):
*
*   VITE_SUPABASE_URL             = https://ihiyhdkurmhbsnbvcwhd.supabase.co
*   VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_7xi6vmDIu053xIK2op-GFA__PUF7EON
*
* (These are the exact values already sitting in your local .env.local —
* copy them in as-is.) Do NOT put a secret/service-role key here; this
* is a client-side file and ships to the browser.
*
* If the Supabase table these events insert into doesn't exist yet:
*
*   create table teacher_day_events (
*     id bigint generated always as identity primary key,
*     event text not null,
*     session_id text not null,
*     created_at timestamptz not null default now()
*   );
*
*   alter table teacher_day_events enable row level security;
*
*   create policy "Allow anonymous inserts"
*     on teacher_day_events for insert
*     to anon
*     with check (true);
*/
var supabaseUrl = "https://ihiyhdkurmhbsnbvcwhd.supabase.co";
var supabaseKey = "sb_publishable_7xi6vmDIu053xIK2op-GFA__PUF7EON";
var supabase = Boolean(supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
var SESSION_KEY = "teacher_day_session";
function createSessionId() {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
	return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
}
function getSessionId() {
	try {
		let sessionId = sessionStorage.getItem(SESSION_KEY);
		if (!sessionId) {
			sessionId = createSessionId();
			sessionStorage.setItem(SESSION_KEY, sessionId);
		}
		return sessionId;
	} catch (e) {
		return "no-storage-" + createSessionId();
	}
}
async function send(event, meta) {
	if (!supabase) return;
	const session_id = getSessionId();
	try {
		const { error } = await supabase.from("teacher_day_events").insert({
			event,
			session_id
		});
	} catch (thrown) {}
}
function track(event, meta) {
	send(event, meta);
}
/** 🚨 No teacher name was present anywhere in the project files or
prompts I was given, and the brief is explicit not to invent one —
so this is the one placeholder in the whole file. Fill in the real
name before shipping; everything else (the "Dr." reveal card) reads
from this single constant. */
var TEACHER_NAME = "Sirisha";
var DIALOGUE_LINES = [
	"Hi Mam... 😊",
	"How are u?",
	"I hope you're doing well.",
	"I just wanted to say a few things to you ..",
	"So please bear with me for just a few minutes😅.",
	"mam i could have just wished u today but..",
	"I have spent days coding this for u cuz ...",
	"I just wanted u to feel special today and hopefully make u smile a little"
];
var HUG_LINES = [
	"Thank you...",
	"...for being such a wonderful teacher. ❤️",
	"I hope you always know how much you are appreciated."
];
var QUESTION_TEXT = "I believe you are one of the best lecturers a student could ask for. Do you agree?";
/**
* PEEK POSITIONING — LITERAL LEFT/OVERFLOW-HIDDEN CLIP
* (unchanged from the original — see Bunny.tsx for the full derivation.
* Kept verbatim so the existing peek/wave/greeting scene is pixel-
* identical to before.)
*/
var PEEK_VISIBLE_FRACTION = .72;
var HEAD_RIGHT = HEAD_GEOMETRY.left + HEAD_GEOMETRY.width;
var computeLeftHidden = (fitVal) => -fitVal * 800;
var computeLeftVisible = (fitVal) => -fitVal * (HEAD_RIGHT - PEEK_VISIBLE_FRACTION * HEAD_GEOMETRY.width);
var PEEK_TILT = -4;
var peekTransition = {
	duration: 1.1,
	ease: [
		.22,
		1,
		.36,
		1
	]
};
/** How long a single caption holds, purely as a function of its own
character count — longer sentences get more time, short ones don't
linger. Clamped to a floor (so a two-word line doesn't vanish
instantly) and a ceiling (so nothing holds indefinitely). */
var READ_BASE_MS = 2e3;
var READ_MS_PER_CHAR = 40;
var READ_MIN_MS = 2500;
var READ_MAX_MS = 9e3;
function readDuration(text) {
	const raw = READ_BASE_MS + text.length * READ_MS_PER_CHAR;
	return Math.max(READ_MIN_MS, Math.min(READ_MAX_MS, raw));
}
/** A sentinel value inside a TEXT_LINES array: when the current line
equals this, App.tsx renders the special "Dr. [Name]" reveal card
instead of the normal bottom caption for that beat. Never shown as
literal text. Given a fixed, slightly-generous hold (a deliberate,
designed pause for that one emotional beat) rather than running the
sentinel string itself through readDuration(). */
var NAME_CARD = "__NAME_CARD__";
var NAME_CARD_HOLD_MS = 3200;
/** Every phase that's "hold a caption, then move to the next line" maps
here — this is the single source of both the text shown during a
phase (App.tsx's dialogueLine computation) and, via
buildPhaseLines()/readDuration(), how long that phase lasts.
`questionActive` and `video` are deliberately NOT in this map —
neither is a caption at all, they're gates (see `answered` and
`videoReleased` below). */
var TEXT_LINES = {
	talk: DIALOGUE_LINES,
	questionSetup: ["Mam, I have a very important question…"],
	yesAffirm: ["Yes… it's true. ✨", "You are valued, appreciated, and remembered more than you know.. 🌷"],
	teacherImpact: ["In my eyes ur the sweetest, kindest, greatest and most amazing person💕🥰", "Your words, your patience, and the encouragement you give can stay with someone for a long time."],
	pgCongrats: [
		"And Mam… there's something else I want to congratulate you for.",
		"Congratulations on your postgraduate journey. 🎓",
		"Balancing your studies, college, and everything you manage at home is no small achievement.",
		"Seeing you manage so much and still keep moving forward inspires me to work harder and do better too. ✨",
		"I hope you’re always proud of how much you’re accomplishing, even on the days when it feels difficult."
	],
	restMessage: ["It must get exhausting sometimes isnt it…", "So please remember to take some time for yourself too. "],
	drMoment: [
		"And someday…",
		NAME_CARD,
		"I can't wait to see 'Dr.' before your name. 😊",
		"Until then, I'll be quietly cheering for you. 🤍"
	],
	preCrown: ["And for everything you do…", "you deserve this mam. 👑"],
	crownFly: ["There… Now that looks perfect.Exactly where it belongs."],
	/** VIDEO SCENE transition: the bunny "suddenly remembers something"
	and delivers these two lines before hopping aside for the memory.
	Ordinary reading-time-based caption phase — same mechanism as
	preCrown/preHug, nothing new. */
	videoTransition: ["Wait…", "Before we continue, there's something I wanted you to see. 👀"],
	finalAffirmation: [
		"So please remember…",
		"The little things you do may mean more to your students than you'll ever know. ✨",
		"Thank you for being someone worth looking up to. 🌷"
	],
	preHug: ["And this one is just for you. 🤍"],
	hug: HUG_LINES
};
/** A floor on a phase's TOTAL duration, applied by stretching its last
line's hold time if the natural reading-time sum falls short. Only
crownFly needs this: its one caption is short, but the phase's
duration also has to cover the existing crown-fly visual (the
flying crown image's 1.8s transition plus its glow/sparkle). */
var PHASE_MIN_TOTAL_MS = { crownFly: 4600 };
function buildPhaseLines(phaseKey, lines) {
	let t = 0;
	const segs = lines.map((text) => {
		const dur = text === NAME_CARD ? NAME_CARD_HOLD_MS : readDuration(text);
		const seg = {
			text,
			start: t,
			end: t + dur
		};
		t += dur;
		return seg;
	});
	const minTotal = PHASE_MIN_TOTAL_MS[phaseKey];
	if (minTotal && t < minTotal && segs.length > 0) {
		segs[segs.length - 1].end += minTotal - t;
		t = minTotal;
	}
	return {
		lines: segs,
		total: t
	};
}
var PHASE_LINES = Object.fromEntries(Object.entries(TEXT_LINES).map(([phase, lines]) => [phase, buildPhaseLines(phase, lines)]));
var findLineIndex = (pl, into) => {
	for (let i = 0; i < pl.lines.length; i++) if (into < pl.lines[i].end) return i;
	return Math.max(0, pl.lines.length - 1);
};
/** Nominal duration for the "questionActive" phase on the timeline. Its
real on-screen duration is governed entirely by the `answered` gate
(see below), not by this number — this just needs to be small and
positive so the phase occupies a well-formed, non-zero slot in the
timeline. Reused as-is for the "video" phase's nominal slot, which
is governed the same way by the `videoReleased` gate. */
var QUESTION_GATE_MS = 100;
var FLOW_DURATIONS = [
	{
		phase: "introHidden",
		ms: 500
	},
	{
		phase: "introPeek",
		ms: 2200
	},
	{
		phase: "introWave",
		ms: 1400
	},
	{
		phase: "introGreeting",
		ms: 2200
	},
	{
		phase: "introEnter",
		ms: 2800
	},
	{
		phase: "talk",
		ms: PHASE_LINES.talk.total
	},
	{
		phase: "questionSetup",
		ms: PHASE_LINES.questionSetup.total
	},
	{
		phase: "questionActive",
		ms: QUESTION_GATE_MS
	},
	{
		phase: "yesAffirm",
		ms: PHASE_LINES.yesAffirm.total
	},
	{
		phase: "teacherImpact",
		ms: PHASE_LINES.teacherImpact.total
	},
	{
		phase: "pgCongrats",
		ms: PHASE_LINES.pgCongrats.total
	},
	{
		phase: "restMessage",
		ms: PHASE_LINES.restMessage.total
	},
	{
		phase: "drMoment",
		ms: PHASE_LINES.drMoment.total
	},
	{
		phase: "preCrown",
		ms: PHASE_LINES.preCrown.total
	},
	{
		phase: "noticeCrown",
		ms: 2600
	},
	{
		phase: "walkToCrown",
		ms: 2800
	},
	{
		phase: "grabCrown",
		ms: 2200
	},
	{
		phase: "backToViewer",
		ms: 2600
	},
	{
		phase: "raiseCrown",
		ms: 1800
	},
	{
		phase: "crownFly",
		ms: PHASE_LINES.crownFly.total
	},
	{
		phase: "videoTransition",
		ms: PHASE_LINES.videoTransition.total
	},
	{
		phase: "video",
		ms: QUESTION_GATE_MS
	},
	{
		phase: "finalAffirmation",
		ms: PHASE_LINES.finalAffirmation.total
	},
	{
		phase: "preHug",
		ms: PHASE_LINES.preHug.total
	},
	{
		phase: "approach",
		ms: 3400
	},
	{
		phase: "hug",
		ms: PHASE_LINES.hug.total
	},
	{
		phase: "release",
		ms: 3e3
	},
	{
		phase: "wave",
		ms: 4200
	}
];
var TIMELINE = (() => {
	let t = 0;
	return FLOW_DURATIONS.map((f) => {
		const seg = {
			phase: f.phase,
			start: t,
			end: t + f.ms
		};
		t += f.ms;
		return seg;
	});
})();
var TOTAL_MS = TIMELINE[TIMELINE.length - 1].end;
var QUESTION_SEGMENT = TIMELINE.find((s) => s.phase === "questionActive");
/** VIDEO SCENE: the second gated segment, same pattern as
QUESTION_SEGMENT above. */
var VIDEO_SEGMENT = TIMELINE.find((s) => s.phase === "video");
var INTRO_PHASES = [
	"introHidden",
	"introPeek",
	"introWave",
	"introGreeting"
];
var introPhaseFor = (p) => {
	switch (p) {
		case "introHidden": return "hidden";
		case "introPeek": return "head";
		case "introWave": return "wave";
		case "introGreeting": return "greeting";
		default: return;
	}
};
/** A pure function of `elapsed`. The per-line lookup uses each phase's
own (possibly non-uniform) line durations via PHASE_LINES instead of
dividing by a flat constant. */
function resolveTimeline(elapsed) {
	const clamped = Math.max(0, Math.min(elapsed, TOTAL_MS));
	if (clamped >= TOTAL_MS) return {
		phase: "ending",
		lineIndex: 0
	};
	const seg = TIMELINE.find((s) => clamped < s.end) ?? TIMELINE[TIMELINE.length - 1];
	const into = clamped - seg.start;
	const pl = PHASE_LINES[seg.phase];
	const lineIndex = pl ? findLineIndex(pl, into) : 0;
	return {
		phase: seg.phase,
		lineIndex
	};
}
var computeFit = () => {
	if (typeof window === "undefined") return .5;
	const w = window.innerWidth;
	const h = window.innerHeight;
	return Math.min(h * .74 / 700, w * .95 / 600);
};
var computeWalkInX = (fitVal, leftVisiblePx) => {
	if (typeof window === "undefined") return 0;
	const centerX = window.innerWidth / 2;
	return leftVisiblePx / fitVal - centerX / fitVal + 300;
};
var NAV_JUMP_MS = 5e3;
var NAV_DOUBLE_TAP_JUMP_MS = 1e4;
var DOUBLE_TAP_WINDOW_MS = 450;
var NAV_ZONE_WIDTH = "32%";
var VIDEO_FRAME_BOTTOM_VH = 3;
var VIDEO_FRAME_MAX_H_VH = 75;
var VIDEO_BUNNY_CLIP_H = 430;
var VIDEO_BUNNY_SCALE = .4;
/** BUNNY-BEHIND-FRAME FIX (this round): earlier rounds deliberately put
the bunny's z-index ABOVE the frame (z-45 vs the frame's z-40) and
let its clipped slice dip 7vh past the frame's top edge, so the
paws would visibly overlap ON TOP of the frame. The explicit ask
this round is the opposite: the bunny must sit BEHIND the frame —
only the head/ears/raised paws should be visible ABOVE the frame's
top edge, with nothing overlapping (and therefore nothing hidden by
or drawn over) the frame itself. So:
- VIDEO_BUNNY_Z is now BELOW VideoScene's frame stack (z-40),
not above it.
- VIDEO_PAW_OVERLAP_VH is 0 — the visible bunny slice now ends
exactly AT the frame's top edge instead of dipping into it, so
the paws rest right on that line and stay fully visible (a
negative/dipping value would now be hidden behind the frame
instead of drawn over it, per the new stacking order). */
var VIDEO_BUNNY_Z = 35;
var VIDEO_BUNNY_BOTTOM_VH = 78;
var MUSIC_VOLUME_FULL = .35;
var MUSIC_VOLUME_HUG_FULL = .6;
var MUSIC_VOLUME_DUCKED = .12;
var MUSIC_VOLUME_HUG_DUCKED = .24;
var MUSIC_FADE_MS = 900;
var MUSIC_MUTE_FADE_MS = 500;
/** FIX 10: how long the final screen lets the currently-playing music
continue before fading it out. */
var ENDING_MUSIC_HOLD_MS = 3e3;
/** FIX 2: the whole "crown scene → crown question → picking up the
crown → walking with the crown" block. Music never ducks/un-ducks
across this entire span — it just holds the same normal volume. */
var CROWN_SEQUENCE_PHASES = /* @__PURE__ */ new Set([
	"noticeCrown",
	"walkToCrown",
	"grabCrown",
	"backToViewer",
	"raiseCrown",
	"crownFly"
]);
function fadeAudioVolume(audio, token, target, ms) {
	const myToken = ++token.current;
	const start = audio.volume;
	const startTime = performance_default.now();
	const step = (now) => {
		if (token.current !== myToken) return;
		const t = ms <= 0 ? 1 : Math.min(1, (now - startTime) / ms);
		audio.volume = start + (target - start) * t;
		if (t < 1) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}
/** FIX 5 — sets volume (and `.muted = false`, defensively) WHILE the
element is still paused, and only then calls `.play()`, so the
correct volume is already in effect the moment the OS actually
starts the audio session. */
async function activateTrack(audio, targetVolume) {
	audio.muted = false;
	audio.volume = targetVolume;
	try {
		await audio.play();
	} catch {}
}
async function activateTrackWithRetry(audio, targetVolume, attempts = 4, delayMs = 350) {
	for (let i = 0; i < attempts; i++) {
		audio.muted = false;
		audio.volume = targetVolume;
		try {
			await audio.play();
			return;
		} catch {
			if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
		}
	}
}
/** FIX 6/7 — plays a track at volume 0 and immediately pauses it,
purely to grant it its own per-element gesture-activation credit
ahead of time (mobile WebKit requires this per element, not once
per page). isStillInactive() is re-checked right before
pause()/volume-reset — if the track has since legitimately become
the real active track, priming backs off instead of killing genuine
playback. */
async function primeTrack(audio, isStillInactive) {
	const priorVolume = audio.volume;
	audio.muted = false;
	audio.volume = 0;
	try {
		await audio.play();
		if (isStillInactive()) audio.pause();
	} catch {} finally {
		if (isStillInactive()) audio.volume = priorVolume;
	}
}
function App() {
	const [elapsed, setElapsed] = (0, import_react.useState)(0);
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [runId, setRunId] = (0, import_react.useState)(0);
	const [fit, setFit] = (0, import_react.useState)(() => computeFit());
	const [answered, setAnswered] = (0, import_react.useState)(false);
	/** VIDEO SCENE gate: same idea as `answered` above. Lifted by
	VideoScene's onComplete callback once the memory has actually
	played out (or gracefully skipped on error). */
	const [videoReleased, setVideoReleased] = (0, import_react.useState)(false);
	/** VIDEO SCENE audio: set the instant the video's native `ended`
	event fires — deliberately BEFORE the visual hold/fade beat that
	follows it. Background music resumes on THIS signal, not on the
	later phase change, so "video ends -> bg resumes" happens exactly
	when the memory's own audio actually stops, per spec, rather than
	~2.4s later once the hold+fade have also finished playing out.
	(Reset-on-entering-"video" effect lives further down, alongside
	the other phase-derived effects — `phase` itself isn't declared
	yet at this point in the component.) */
	const [videoAudioDone, setVideoAudioDone] = (0, import_react.useState)(false);
	/** VIDEO SCENE: while the memory plays, have the bunny occasionally
	glance toward it and back to the viewer instead of staring at one
	spot the whole time. */
	const [videoGlance, setVideoGlance] = (0, import_react.useState)("right");
	(0, import_react.useEffect)(() => {
		const id = setInterval(() => {
			setVideoGlance((g) => g === "right" ? "viewer" : "right");
		}, 3600);
		return () => clearInterval(id);
	}, []);
	const lastTapRef = (0, import_react.useRef)({
		side: null,
		time: 0
	});
	const trackedRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const trackOnce = (key, evt, meta) => {
		if (trackedRef.current.has(key)) return;
		trackedRef.current.add(key);
		track(evt, meta);
	};
	const bgAudioRef = (0, import_react.useRef)(null);
	const hugAudioRef = (0, import_react.useRef)(null);
	const bgFadeToken = (0, import_react.useRef)(0);
	const hugFadeToken = (0, import_react.useRef)(0);
	/** FIX 1: whether the very first ever activation (of either track)
	has happened yet — only that one moment skips the fade-up. */
	const initialStartDoneRef = (0, import_react.useRef)(false);
	/** FIX 5: always mirrors the orchestration effect's current
	`activeTarget`, so tryPlayActive() can pass the right volume into
	activateTrack() even though those call sites don't otherwise have
	access to `talking`/`phase`. */
	const activeTargetRef = (0, import_react.useRef)(MUSIC_VOLUME_FULL);
	/** FIX 8: once the hug scene is ever reached, this latches to true
	and never resets (except replay()). */
	/** VIDEO SCENE: true only while `phase === "video"`, kept in sync by
	a tiny dedicated effect below. */
	const videoActiveRef = (0, import_react.useRef)(false);
	/** VIDEO SCENE: imperative handle onto the (now permanently mounted)
	VideoScene component — used to (a) silently prime the <video>
	element's gesture-based audio permission on every existing
	gesture, exactly like the bg/hug <audio> priming below, (b) let
	the existing tap-to-advance/"skip" handler pause/resume the
	actual video when tapping the middle of the screen, and (c) reset
	the memory to its start on replay(). */
	const videoSceneRef = (0, import_react.useRef)(null);
	/** VIDEO SCENE: set the instant background/hug music gets silenced
	for the memory video, and cleared the instant it resumes. */
	const wasVideoSilencedRef = (0, import_react.useRef)(false);
	const mutedRef = (0, import_react.useRef)(muted);
	(0, import_react.useEffect)(() => {
		mutedRef.current = muted;
	}, [muted]);
	const isHugSceneRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		const measure = () => setFit(computeFit());
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, []);
	(0, import_react.useEffect)(() => {
		const bg = new Audio("/music/background.mp4");
		bg.loop = true;
		bg.preload = "auto";
		bg.volume = 0;
		bg.load();
		const hug = new Audio("/music/hug.mp4");
		hug.loop = true;
		hug.preload = "auto";
		hug.volume = 0;
		hug.load();
		bgAudioRef.current = bg;
		hugAudioRef.current = hug;
		return () => {
			bg.pause();
			hug.pause();
			bg.src = "";
			hug.src = "";
			bgAudioRef.current = null;
			hugAudioRef.current = null;
		};
	}, []);
	/** FIX 3: the shared "try to start/resume the correct track right
	now" attempt. Safe to call as often as needed. Called both from a
	passive page-wide listener (below) and synchronously from the
	app's existing click handlers (skip / nudge / mic button).
	
	VIDEO SCENE: bails out immediately if the memory video is
	currently on screen — a gesture during the video must never
	resume background/hug music. */
	const tryPlayActive = () => {
		videoSceneRef.current?.prime();
		if (mutedRef.current) return;
		if (videoActiveRef.current) return;
		const active = isHugSceneRef.current ? hugAudioRef.current : bgAudioRef.current;
		const inactive = isHugSceneRef.current ? bgAudioRef.current : hugAudioRef.current;
		if (active && active.paused) activateTrack(active, activeTargetRef.current);
		if (inactive && inactive.paused) {
			const primedTrack = inactive;
			primeTrack(primedTrack, () => {
				return (isHugSceneRef.current ? hugAudioRef.current : bgAudioRef.current) !== primedTrack;
			});
		}
	};
	(0, import_react.useEffect)(() => {
		const events = [
			"pointerdown",
			"keydown",
			"touchstart"
		];
		events.forEach((evt) => window.addEventListener(evt, tryPlayActive));
		return () => events.forEach((evt) => window.removeEventListener(evt, tryPlayActive));
	}, []);
	const gateMs = !answered ? Math.max(QUESTION_SEGMENT.start, QUESTION_SEGMENT.end - 1) : !videoReleased ? Math.max(VIDEO_SEGMENT.start, VIDEO_SEGMENT.end - 1) : TOTAL_MS;
	const gateRef = (0, import_react.useRef)(gateMs);
	(0, import_react.useEffect)(() => {
		gateRef.current = gateMs;
	}, [gateMs]);
	(0, import_react.useEffect)(() => {
		let raf;
		let last = performance_default.now();
		const tick = (now) => {
			const dt = now - last;
			last = now;
			setElapsed((e) => Math.min(gateRef.current, e + dt));
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [runId]);
	const { phase, lineIndex } = (0, import_react.useMemo)(() => resolveTimeline(elapsed), [elapsed]);
	(0, import_react.useEffect)(() => {
		videoActiveRef.current = phase === "video";
		if (phase === "video") setVideoAudioDone(false);
	}, [phase]);
	(0, import_react.useEffect)(() => {
		track("page_opened");
	}, []);
	(0, import_react.useEffect)(() => {
		if (phase === "introGreeting") trackOnce("hi_shown", "hi_shown");
		if (phase === "questionActive") trackOnce("question_shown", "question_shown");
		if (phase === "drMoment") trackOnce("dr_scene", "dr_scene");
		if (phase === "noticeCrown") trackOnce("crown_scene", "crown_scene");
		if (phase === "video") trackOnce("video_scene", "video_scene");
		if (phase === "hug") trackOnce("hug_scene", "hug_scene");
		if (phase === "ending") trackOnce("completed", "completed");
	}, [phase]);
	const isIntro = INTRO_PHASES.includes(phase);
	/** VIDEO SCENE: bunny slides slightly aside once the memory itself is
	on screen. */
	const isVideoScene = phase === "video";
	const pose = (0, import_react.useMemo)(() => {
		switch (phase) {
			case "introHidden":
			case "introPeek":
			case "introWave":
			case "introGreeting": return "idle";
			case "introEnter": return "walkIn";
			case "talk": return "talk";
			case "questionSetup": return "talk";
			case "questionActive": return "lean";
			case "yesAffirm":
			case "teacherImpact":
			case "pgCongrats":
			case "restMessage":
			case "drMoment":
			case "preCrown":
			case "finalAffirmation":
			case "preHug": return "talk";
			case "noticeCrown": return "surprised";
			case "walkToCrown": return "toCrown";
			case "grabCrown": return "holdCrown";
			case "backToViewer": return "holdCrown";
			case "raiseCrown":
			case "crownFly": return "raise";
			case "videoTransition": return "talk";
			case "video": return "holdFrame";
			case "approach": return "approach";
			case "hug": return "hug";
			case "release": return "release";
			case "wave": return "wave";
			default: return "sit";
		}
	}, [phase]);
	const look = (0, import_react.useMemo)(() => {
		if (isIntro) return "viewer";
		if (phase === "noticeCrown" || phase === "walkToCrown" || phase === "grabCrown") return "crown";
		if (phase === "talk") return lineIndex % 4 === 2 ? "shy" : "viewer";
		if (phase === "drMoment") return "up";
		if (phase === "restMessage") return "down";
		return "viewer";
	}, [
		phase,
		isIntro,
		lineIndex
	]);
	const introPh = introPhaseFor(phase);
	const leftHidden = computeLeftHidden(fit);
	const leftVisible = computeLeftVisible(fit);
	const peekTilt = isIntro && phase !== "introHidden" ? PEEK_TILT : 0;
	const walkInFrom = (0, import_react.useMemo)(() => ({
		x: computeWalkInX(fit, leftVisible),
		y: 6,
		rotate: PEEK_TILT
	}), [fit, leftVisible]);
	const walking = phase === "introEnter" || phase === "backToViewer";
	const talking = [
		"talk",
		"questionSetup",
		"yesAffirm",
		"teacherImpact",
		"pgCongrats",
		"restMessage",
		"drMoment",
		"preCrown",
		"videoTransition",
		"finalAffirmation",
		"preHug",
		"hug"
	].includes(phase);
	const holdingCrown = phase === "grabCrown" || phase === "backToViewer" || phase === "raiseCrown";
	const groundCrown = phase === "noticeCrown" || phase === "walkToCrown";
	const smiling = [
		"introWave",
		"introGreeting",
		"wave",
		"release",
		"yesAffirm",
		"drMoment",
		"finalAffirmation"
	].includes(phase);
	(0, import_react.useEffect)(() => {
		const bg = bgAudioRef.current;
		const hug = hugAudioRef.current;
		if (!bg || !hug) return;
		const hugActive = phase === "hug";
		isHugSceneRef.current = hugActive;
		const active = hugActive ? hug : bg;
		const inactive = hugActive ? bg : hug;
		const activeToken = hugActive ? hugFadeToken : bgFadeToken;
		const inactiveToken = hugActive ? bgFadeToken : hugFadeToken;
		if (muted) {
			fadeAudioVolume(bg, bgFadeToken, 0, MUSIC_MUTE_FADE_MS);
			fadeAudioVolume(hug, hugFadeToken, 0, MUSIC_MUTE_FADE_MS);
			const pauseTimer = window.setTimeout(() => {
				bg.pause();
				hug.pause();
			}, MUSIC_MUTE_FADE_MS);
			return () => window.clearTimeout(pauseTimer);
		}
		if (phase === "video" && !videoAudioDone) {
			activeTargetRef.current = 0;
			wasVideoSilencedRef.current = true;
			fadeAudioVolume(active, activeToken, 0, MUSIC_MUTE_FADE_MS);
			fadeAudioVolume(inactive, inactiveToken, 0, MUSIC_MUTE_FADE_MS);
			const pauseTimer = window.setTimeout(() => {
				active.pause();
				inactive.pause();
			}, MUSIC_MUTE_FADE_MS);
			return () => window.clearTimeout(pauseTimer);
		}
		const inCrownSequence = CROWN_SEQUENCE_PHASES.has(phase);
		const activeTarget = talking && !inCrownSequence && !hugActive ? hugActive ? MUSIC_VOLUME_HUG_DUCKED : MUSIC_VOLUME_DUCKED : hugActive ? MUSIC_VOLUME_HUG_FULL : MUSIC_VOLUME_FULL;
		activeTargetRef.current = activeTarget;
		if (active.paused) {
			initialStartDoneRef.current = true;
			if (wasVideoSilencedRef.current) {
				wasVideoSilencedRef.current = false;
				activateTrack(active, 0).then(() => {
					fadeAudioVolume(active, activeToken, activeTarget, MUSIC_FADE_MS);
				});
			} else activateTrackWithRetry(active, activeTarget);
		} else if (!initialStartDoneRef.current) {
			initialStartDoneRef.current = true;
			active.volume = activeTarget;
		} else fadeAudioVolume(active, activeToken, activeTarget, MUSIC_FADE_MS);
		fadeAudioVolume(inactive, inactiveToken, 0, MUSIC_FADE_MS);
		const pauseTimer = window.setTimeout(() => {
			if (inactive.volume <= .001) inactive.pause();
		}, 950);
		return () => window.clearTimeout(pauseTimer);
	}, [
		muted,
		phase,
		talking,
		videoAudioDone
	]);
	/** FIX 10 — FINAL-SCREEN FADE-OUT. */
	(0, import_react.useEffect)(() => {
		if (phase !== "ending") return;
		const timer = window.setTimeout(() => {
			const active = bgAudioRef.current;
			const activeToken = bgFadeToken;
			if (active && !active.paused) {
				fadeAudioVolume(active, activeToken, 0, MUSIC_FADE_MS);
				window.setTimeout(() => {
					if (active.volume <= .001) active.pause();
				}, 950);
			}
		}, ENDING_MUSIC_HOLD_MS);
		return () => window.clearTimeout(timer);
	}, [phase]);
	const skip = () => {
		tryPlayActive();
		if (phase === "video") {
			videoSceneRef.current?.togglePauseResume();
			return;
		}
		if (isIntro) {
			setElapsed(TIMELINE.find((s) => s.phase === "introEnter").start);
			return;
		}
		if (phase === "introEnter") {
			setElapsed(TIMELINE.find((s) => s.phase === "talk").start);
			return;
		}
		const pl = PHASE_LINES[phase];
		if (pl) {
			const nextLineStart = TIMELINE.find((s) => s.phase === phase).start + pl.lines[lineIndex].end;
			setElapsed(Math.min(gateMs, nextLineStart));
		}
	};
	const replay = () => {
		setElapsed(0);
		setAnswered(false);
		setVideoReleased(false);
		setVideoAudioDone(false);
		lastTapRef.current = {
			side: null,
			time: 0
		};
		trackedRef.current = /* @__PURE__ */ new Set();
		initialStartDoneRef.current = false;
		wasVideoSilencedRef.current = false;
		videoSceneRef.current?.reset();
		setRunId((r) => r + 1);
		track("page_opened");
	};
	const nudge = (direction) => {
		tryPlayActive();
		const side = direction === -1 ? "left" : "right";
		const now = performance_default.now();
		const isDoubleTap = lastTapRef.current.side === side && now - lastTapRef.current.time < DOUBLE_TAP_WINDOW_MS;
		lastTapRef.current = {
			side,
			time: now
		};
		const amount = isDoubleTap ? NAV_DOUBLE_TAP_JUMP_MS : NAV_JUMP_MS;
		setElapsed((e) => Math.max(0, Math.min(gateMs, e + direction * amount)));
	};
	const handleYes = () => {
		if (answered) return;
		setAnswered(true);
		track("yes_clicked");
	};
	const toggleSound = () => {
		tryPlayActive();
		setMuted((m) => !m);
	};
	const genericLine = TEXT_LINES[phase]?.[lineIndex] ?? null;
	const isNameCard = genericLine === NAME_CARD;
	const dialogueLine = phase === "introGreeting" || phase === "introEnter" ? DIALOGUE_LINES[0] : phase === "questionActive" ? answered ? QUESTION_TEXT : null : isNameCard ? null : genericLine;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		onClick: skip,
		className: "relative h-[100dvh] w-full overflow-hidden bg-background font-body select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Background, {
				showMoon: phase === "ending",
				warm: [
					"raiseCrown",
					"crownFly",
					"approach",
					"hug"
				].includes(phase)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: groundCrown && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.img, {
				src: "/crown.png",
				alt: "A golden crown",
				className: "pointer-events-none absolute bottom-[20dvh] right-[14vw] z-20 w-[22vw] max-w-[130px] drop-shadow-glow",
				initial: {
					opacity: 0,
					y: 16,
					scale: .9
				},
				animate: {
					opacity: 1,
					y: [
						0,
						-6,
						0
					],
					scale: 1
				},
				exit: {
					opacity: 0,
					scale: .8
				},
				transition: {
					opacity: { duration: 1 },
					y: {
						duration: 3.2,
						repeat: Infinity,
						ease: "easeInOut"
					}
				}
			}, "crown-ground") }),
			introPh ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-0 z-20 overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					className: "absolute bottom-0",
					style: {
						width: 600,
						height: 700,
						transformOrigin: "0% 100%"
					},
					animate: {
						left: introPh === "hidden" ? leftHidden : leftVisible,
						scale: fit
					},
					transition: peekTransition,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bunny, {
						introPhase: introPh,
						peekX: 0,
						peekTilt
					})
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute left-1/2",
				style: {
					width: 600,
					height: isVideoScene ? VIDEO_BUNNY_CLIP_H : 700,
					marginLeft: -300,
					bottom: isVideoScene ? `${VIDEO_BUNNY_BOTTOM_VH}vh` : 0,
					transform: `scale(${isVideoScene ? fit * VIDEO_BUNNY_SCALE : fit})`,
					transformOrigin: "50% 100%",
					zIndex: isVideoScene ? VIDEO_BUNNY_Z : 20,
					pointerEvents: isVideoScene ? "none" : void 0,
					transition: "bottom 1.1s cubic-bezier(0.22,1,0.36,1), height 1.1s cubic-bezier(0.22,1,0.36,1), transform 1.1s cubic-bezier(0.22,1,0.36,1)"
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-full",
					style: isVideoScene ? {
						height: "100%",
						overflow: "hidden"
					} : { height: "100%" },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
						animate: isVideoScene ? {
							x: 0,
							y: -0
						} : {
							x: 0,
							y: 0
						},
						transition: {
							duration: 1.1,
							ease: [
								.22,
								1,
								.36,
								1
							]
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bunny, {
							pose,
							look: isVideoScene ? videoGlance : look,
							talking,
							walking,
							smiling,
							holdingCrown,
							walkInFrom
						})
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: phase === "hug" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				className: "pointer-events-none absolute inset-0 z-30",
				initial: { opacity: 0 },
				animate: { opacity: 1 },
				exit: { opacity: 0 },
				transition: { duration: 1 },
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-hug-vignette" }), Array.from({ length: 12 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.svg, {
					viewBox: "0 0 32 29",
					className: "absolute h-6 w-6",
					style: {
						left: `${8 + i * 7.5}%`,
						bottom: "-8%",
						color: i % 2 ? "#f9a8c4" : "#e8607f"
					},
					animate: {
						y: ["0vh", "-95vh"],
						opacity: [
							0,
							1,
							0
						],
						rotate: [
							0,
							i % 2 ? 18 : -18,
							0
						]
					},
					transition: {
						duration: 7 + i % 4,
						delay: i * .45,
						repeat: Infinity,
						ease: "easeOut"
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
						fill: "currentColor",
						d: "M16 29S1 19.6 1 10.2A9.2 9.2 0 0 1 16 4.4 9.2 9.2 0 0 1 31 10.2C31 19.6 16 29 16 29z"
					})
				}, i))]
			}, "hug-fx") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: phase === "crownFly" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.img, {
				src: "/crown.png",
				alt: "A golden crown",
				className: "pointer-events-none absolute left-1/2 z-40 w-[34vw] max-w-[180px] drop-shadow-glow",
				initial: {
					top: "44%",
					x: "-50%",
					scale: .8,
					opacity: 1
				},
				animate: {
					top: "9%",
					x: "-50%",
					scale: 1,
					rotate: [
						0,
						-7,
						3,
						0
					]
				},
				exit: { opacity: 0 },
				transition: {
					duration: 1.8,
					ease: [
						.22,
						1,
						.36,
						1
					]
				}
			}, "crown-fly") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrownGlow, { active: phase === "crownFly" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VideoScene, {
				ref: videoSceneRef,
				active: phase === "video",
				frameMaxHVh: VIDEO_FRAME_MAX_H_VH,
				frameBottomVh: VIDEO_FRAME_BOTTOM_VH,
				onEnded: () => setVideoAudioDone(true),
				onComplete: () => setVideoReleased(true)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: isNameCard && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				className: "pointer-events-none absolute inset-x-0 top-1/2 z-40 -translate-y-1/2 px-8 text-center",
				initial: {
					opacity: 0,
					scale: .9,
					filter: "blur(10px)"
				},
				animate: {
					opacity: 1,
					scale: 1,
					filter: "blur(0px)"
				},
				exit: {
					opacity: 0,
					scale: .95
				},
				transition: {
					duration: 1.1,
					ease: [
						.22,
						1,
						.36,
						1
					]
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-xs uppercase tracking-[0.35em] text-cream/60 sm:text-sm",
					children: "Someday"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 font-display text-4xl text-gold drop-shadow-glow sm:text-5xl",
					children: ["Dr. ", TEACHER_NAME]
				})]
			}, "dr-name-card") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 z-40 h-[26vh] bg-subtitle-scrim" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialogue, {
				line: dialogueLine,
				tone: phase === "crownFly" ? "gold" : "soft"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: phase === "questionActive" && !answered && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionCard, {
				questionText: QUESTION_TEXT,
				onYes: handleYes,
				onAttempt: (n) => {
					track("no_attempt", { attempt: n });
					if (n === 1) trackOnce("no_clicked", "no_clicked");
				}
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: phase === "ending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				className: "pointer-events-none absolute inset-x-0 top-[30%] z-40 px-8 text-center",
				initial: {
					opacity: 0,
					y: 18,
					filter: "blur(10px)"
				},
				animate: {
					opacity: 1,
					y: 0,
					filter: "blur(0px)"
				},
				transition: {
					duration: 2,
					delay: 1.2,
					ease: "easeOut"
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl leading-tight text-gold drop-shadow-glow sm:text-4xl",
					children: "Happy Teacher's Day, Mam! ❤️"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.p, {
					className: "mt-3 font-display text-lg text-cream/90",
					initial: { opacity: 0 },
					animate: { opacity: 1 },
					transition: {
						delay: 3.4,
						duration: 1.6
					},
					children: "With lots of respect and gratitude."
				})]
			}, "ending") }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				onClick: (e) => {
					e.stopPropagation();
					nudge(-1);
				},
				"aria-hidden": "true",
				className: "absolute inset-y-0 left-0 z-30",
				style: { width: NAV_ZONE_WIDTH }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				onClick: (e) => {
					e.stopPropagation();
					nudge(1);
				},
				"aria-hidden": "true",
				className: "absolute inset-y-0 right-0 z-30",
				style: { width: NAV_ZONE_WIDTH }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: (e) => {
					e.stopPropagation();
					toggleSound();
				},
				"aria-label": muted ? "Turn music on" : "Turn music off",
				className: "absolute right-4 top-4 z-50 rounded-full border border-cream/20 bg-cream/10 p-3 text-cream backdrop-blur-sm transition-colors hover:bg-cream/20",
				children: muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { size: 18 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { size: 18 })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: phase === "ending" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
				onClick: (e) => {
					e.stopPropagation();
					replay();
				},
				initial: {
					opacity: 0,
					y: 12
				},
				animate: {
					opacity: 1,
					y: 0
				},
				exit: { opacity: 0 },
				transition: {
					delay: 3,
					duration: 1
				},
				className: "absolute bottom-6 right-5 z-50 flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-4 py-2 font-display text-sm text-gold backdrop-blur-sm transition-colors hover:bg-gold/25",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { size: 16 }), " Watch again"]
			}, "replay") })
		]
	});
}
var SplitComponent = App;
//#endregion
export { SplitComponent as component };
