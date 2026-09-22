//#region src/presets.js
var e = {
	push: {
		label: "Push in",
		f: (e) => ({
			zoom: 1.08 + .22 * t(e),
			ox: 0,
			oy: 0,
			s: .05 + .06 * t(e)
		})
	},
	pull: {
		label: "Pull out",
		f: (e) => ({
			zoom: 1.3 - .22 * t(e),
			ox: 0,
			oy: 0,
			s: .11 - .06 * t(e)
		})
	},
	orbit: {
		label: "Orbit",
		f: (e) => ({
			zoom: 1.12,
			ox: Math.sin((e - .5) * Math.PI) * .06,
			oy: 0,
			s: 1
		})
	},
	pan: {
		label: "Pan",
		f: (e) => ({
			zoom: 1.15,
			ox: (t(e) - .5) * .1,
			oy: 0,
			s: 1
		})
	},
	crane: {
		label: "Crane up",
		f: (e) => ({
			zoom: 1.12,
			ox: 0,
			oy: (.5 - t(e)) * .08,
			s: 1
		})
	},
	drift: {
		label: "Drift",
		f: (e) => ({
			zoom: 1.1 + .05 * e,
			ox: Math.sin(e * Math.PI * 2) * .025,
			oy: Math.cos(e * Math.PI * 2) * .015,
			s: 1
		})
	},
	vertigo: {
		label: "Vertigo",
		f: (e) => ({
			zoom: 1.08 + .25 * t(e),
			ox: 0,
			oy: 0,
			s: -.04 - .1 * t(e)
		})
	},
	still: {
		label: "Still",
		f: () => ({
			zoom: 1,
			ox: 0,
			oy: 0,
			s: 0
		})
	}
};
function t(e) {
	return e < .5 ? 2 * e * e : 1 - (-2 * e + 2) ** 2 / 2;
}
var n = [
	["bf_emma", "Emma (UK — closest to AU)"],
	["bm_george", "George (UK — closest to AU)"],
	["bf_isabella", "Isabella (UK, female)"],
	["bm_lewis", "Lewis (UK, male)"],
	["bf_alice", "Alice (UK, female)"],
	["bm_daniel", "Daniel (UK, male)"],
	["af_heart", "Heart (US, female)"],
	["af_bella", "Bella (US, female)"],
	["af_nicole", "Nicole (US, female)"],
	["am_michael", "Michael (US, male)"],
	["am_adam", "Adam (US, male)"]
], r = "attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; v.y = 1.0 - v.y; gl_Position = vec4(p, 0.0, 1.0); }", i = "precision highp float;\nvarying vec2 v;\nuniform sampler2D img, dep;\nuniform float zoom, s, grain, time;\nuniform vec2 off;\nfloat rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898, 78.233)) + time) * 43758.5453); }\nvoid main(){\n  vec2 uv = (v - 0.5) / zoom + 0.5;\n  vec2 p = uv;\n  for (int i = 0; i < 10; i++) {\n    float d = texture2D(dep, p).r;\n    p = uv - (off * 1.6 + (uv - 0.5) * s) * (d - 0.35);\n  }\n  vec3 c = texture2D(img, clamp(p, 0.001, 0.999)).rgb;\n  c += (rnd(v * 800.0) - 0.5) * grain;\n  float vig = smoothstep(0.95, 0.35, length(v - 0.5));\n  gl_FragColor = vec4(c * mix(0.82, 1.0, vig), 1.0);\n}", a = {
	source: {
		label: "Same as image",
		size: null
	},
	vertical: {
		label: "9:16 · TikTok, Reels, Shorts",
		size: [720, 1280]
	},
	square: {
		label: "1:1 · Instagram, Facebook feed",
		size: [1080, 1080]
	},
	wide: {
		label: "16:9 · YouTube",
		size: [1280, 720]
	}
}, o = class {
	constructor(e) {
		this.out = e, this.ctx = e.getContext("2d"), this.gc = document.createElement("canvas");
		let t = this.gc.getContext("webgl", {
			preserveDrawingBuffer: !0,
			premultipliedAlpha: !1
		});
		if (!t) throw Error("WebGL is not available in this browser.");
		this.gl = t;
		let n = t.createProgram();
		for (let [e, a] of [[t.VERTEX_SHADER, r], [t.FRAGMENT_SHADER, i]]) {
			let r = t.createShader(e);
			if (t.shaderSource(r, a), t.compileShader(r), !t.getShaderParameter(r, t.COMPILE_STATUS)) throw Error(t.getShaderInfoLog(r));
			t.attachShader(n, r);
		}
		t.linkProgram(n), t.useProgram(n);
		let a = t.createBuffer();
		t.bindBuffer(t.ARRAY_BUFFER, a), t.bufferData(t.ARRAY_BUFFER, new Float32Array([
			-1,
			-1,
			1,
			-1,
			-1,
			1,
			1,
			1
		]), t.STATIC_DRAW);
		let o = t.getAttribLocation(n, "p");
		t.enableVertexAttribArray(o), t.vertexAttribPointer(o, 2, t.FLOAT, !1, 0, 0), this.u = Object.fromEntries([
			"img",
			"dep",
			"zoom",
			"s",
			"off",
			"grain",
			"time"
		].map((e) => [e, t.getUniformLocation(n, e)])), t.uniform1i(this.u.img, 0), t.uniform1i(this.u.dep, 1), this.texImg = this.#e(), this.texDep = this.#e(), this.format = "source", this.caption = null;
	}
	#e() {
		let e = this.gl, t = e.createTexture();
		e.bindTexture(e.TEXTURE_2D, t);
		for (let [t, n] of [
			[e.TEXTURE_MIN_FILTER, e.LINEAR],
			[e.TEXTURE_MAG_FILTER, e.LINEAR],
			[e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE],
			[e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE]
		]) e.texParameteri(e.TEXTURE_2D, t, n);
		return t;
	}
	setFrame(e, t = null) {
		this.format = e, this.caption = t;
	}
	load(e, t, n = 1280) {
		let r = this.gl, i = Math.min(1, n / e.width), o = Math.round(e.width * i), s = Math.round(e.height * i);
		o < 720 && (s = Math.round(s * 720 / o), o = 720), this.gc.width = o - o % 2, this.gc.height = s - s % 2, r.viewport(0, 0, this.gc.width, this.gc.height), r.activeTexture(r.TEXTURE0), r.bindTexture(r.TEXTURE_2D, this.texImg), r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, r.RGBA, r.UNSIGNED_BYTE, e);
		let c = new Uint8Array(t.width * t.height * 4);
		for (let e = 0; e < t.data.length; e++) {
			let n = t.data[e];
			c[e * 4] = c[e * 4 + 1] = c[e * 4 + 2] = n, c[e * 4 + 3] = 255;
		}
		r.activeTexture(r.TEXTURE1), r.bindTexture(r.TEXTURE_2D, this.texDep), r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, t.width, t.height, 0, r.RGBA, r.UNSIGNED_BYTE, c);
		let l = a[this.format]?.size || [this.gc.width, this.gc.height];
		if ((this.out.width !== l[0] || this.out.height !== l[1]) && (this.out.width = l[0], this.out.height = l[1]), this.bg = null, a[this.format]?.size) {
			let t = document.createElement("canvas");
			t.width = 32, t.height = 32;
			let n = t.getContext("2d", { willReadFrequently: !0 });
			n.drawImage(e, 0, 0, 32, 32);
			let r = n.getImageData(0, 0, 32, 32).data, i = [], a = [], o = [];
			for (let e = 0; e < 32; e++) for (let t = 0; t < 32; t++) {
				if (t > 2 && t < 29 && e > 2 && e < 29) continue;
				let n = (e * 32 + t) * 4;
				i.push(r[n]), a.push(r[n + 1]), o.push(r[n + 2]);
			}
			let s = (e) => e.sort((e, t) => e - t)[e.length >> 1], c = document.createElement("canvas");
			c.width = l[0], c.height = l[1];
			let u = c.getContext("2d");
			u.fillStyle = `rgb(${s(i)}, ${s(a)}, ${s(o)})`, u.fillRect(0, 0, l[0], l[1]), this.bg = c;
		}
	}
	draw(t, n, { intensity: r = 1, grain: i = 0, alpha: a = 1 } = {}) {
		let o = this.gl, s = (e[t] || e.push).f(n), c = r;
		o.uniform1f(this.u.zoom, 1 + (s.zoom - 1) * Math.max(c, .3)), o.uniform1f(this.u.s, s.s === 1 ? 0 : s.s * c), o.uniform2f(this.u.off, s.ox * c, s.oy * c), o.uniform1f(this.u.grain, i), o.uniform1f(this.u.time, n * 97), o.drawArrays(o.TRIANGLE_STRIP, 0, 4);
		let l = this.ctx, u = this.out.width, d = this.out.height;
		if (l.globalAlpha = 1, l.fillStyle = "#000", l.fillRect(0, 0, u, d), l.globalAlpha = a, this.bg) {
			l.drawImage(this.bg, 0, 0);
			let e = this.caption ? .2 : 0, t = Math.min(u / this.gc.width, d * (1 - e) / this.gc.height), n = this.gc.width * t, r = this.gc.height * t;
			l.drawImage(this.gc, (u - n) / 2, (d * (1 - e) - r) / 2, n, r);
		} else l.drawImage(this.gc, 0, 0, u, d);
		l.globalAlpha = 1, this.caption && this.#t();
	}
	#t() {
		let e = this.ctx, t = this.out.width, n = this.out.height, { title: r, line: i } = this.caption, a = Math.round(t * .06), o = Math.round(Math.min(t, n) * .052);
		e.font = `700 ${o}px system-ui, -apple-system, "Segoe UI", sans-serif`;
		let c = s(e, r, t - a * 2).slice(0, 2), l = Math.round(o * .72), u = c.length * o * 1.2 + (i ? l * 1.6 : 0) + a, d = e.createLinearGradient(0, n - u - a * 1.5, 0, n);
		d.addColorStop(0, "rgba(0,0,0,0)"), d.addColorStop(.35, "rgba(0,0,0,.72)"), d.addColorStop(1, "rgba(0,0,0,.85)"), e.fillStyle = d, e.fillRect(0, n - u - a * 1.5, t, u + a * 1.5), e.fillStyle = "#fff", e.textBaseline = "top";
		let f = n - u;
		for (let t of c) e.fillText(t, a, f), f += o * 1.2;
		i && (e.font = `600 ${l}px system-ui, -apple-system, "Segoe UI", sans-serif`, e.fillStyle = "#5eead4", e.fillText(i, a, f + l * .3));
	}
	preview(e, t, n = 5) {
		this.stop();
		let r = performance.now(), i = (a) => {
			let o = (a - r) / 1e3 / n % 1;
			this.draw(e, o, t), this.raf = requestAnimationFrame(i);
		};
		this.raf = requestAnimationFrame(i);
	}
	stop() {
		cancelAnimationFrame(this.raf), clearTimeout(this.timer), this.raf = this.timer = 0;
	}
	async record(e, t, n, r, i) {
		this.stop();
		let a = this.out.captureStream(0), o = a.getVideoTracks()[0], s = null, c = null;
		if (r) {
			s = new AudioContext();
			let e = s.createBuffer(1, r.samples.length, r.rate);
			e.copyToChannel(r.samples, 0), c = s.createBufferSource(), c.buffer = e;
			let t = s.createMediaStreamDestination();
			c.connect(t), t.stream.getAudioTracks().forEach((e) => a.addTrack(e)), n = Math.max(n, e.duration + .6);
		}
		let l = [
			"video/mp4;codecs=avc1,mp4a.40.2",
			"video/mp4",
			"video/webm;codecs=vp9,opus",
			"video/webm"
		].find((e) => MediaRecorder.isTypeSupported(e)), u = new MediaRecorder(a, {
			mimeType: l,
			videoBitsPerSecond: 8e6
		}), d = [];
		u.ondataavailable = (e) => e.data.size && d.push(e.data);
		let f = new Promise((e) => u.onstop = e), p = n / e.length, m = -1, h = (t) => {
			t !== m && (m = t, this.load(e[t].image, e[t].depth));
		};
		h(0), this.draw(e[0].motion, 0, t), o.requestFrame(), u.start(250), c?.start();
		let g = performance.now();
		return await new Promise((r) => {
			let a = () => {
				let s = (performance.now() - g) / 1e3, c = Math.min(1, s / n), l = Math.min(e.length - 1, Math.floor(s / p));
				h(l);
				let u = Math.min(1, (s - l * p) / p), d = e.length > 1 ? Math.min(1, (s - l * p) / .3) : 1;
				this.draw(e[l].motion, u, {
					...t,
					alpha: d
				}), t.onFrame?.(this.ctx, s, l), o.requestFrame(), i?.(c), c < 1 ? this.timer = setTimeout(a, 1e3 / 30) : r();
			};
			a();
		}), u.stop(), await f, s?.close(), new Blob(d, { type: l.split(";")[0] });
	}
};
function s(e, t, n) {
	let r = String(t).split(/\s+/), i = [], a = "";
	for (let t of r) {
		let r = a ? a + " " + t : t;
		e.measureText(r).width > n && a ? (i.push(a), a = t) : a = r;
	}
	return a && i.push(a), i.length > 2 && (i[1] = i[1].replace(/\s*\S*$/, "") + "…"), i;
}
//#endregion
//#region src/adcopy.js
var c = (e, t = null) => {
	let n = e.filter(Boolean), r = t ? n.filter((e) => !t.has(e)) : n, i = r.length ? r : n, a = i[Math.floor(Math.random() * i.length)];
	return t?.add(a), a;
}, l = "PlacidDeals.com", u = [
	"zero",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven",
	"eight",
	"nine",
	"ten",
	"eleven",
	"twelve"
], d = (e) => {
	let t = parseInt(e, 10);
	return t >= 0 && t < u.length ? u[t] : String(e);
}, f = (e) => String(e || "").replace(/^./, (e) => e.toLowerCase()), p = (e) => e % 100 ? `$${(e / 100).toFixed(2)}` : `$${e / 100}`;
function m(e) {
	return String(e || "").replace(/\b(\d{2,3})\s*(?=(flexibility|rotation|swivel|tilt|angle)\b)/gi, "$1 degree ").replace(/\b(bends?|bending|folds?|rotates?|swivels?|tilts?)(\s+(?:up\s+)?to\s+)(\d{2,3})\b(?!\s*(degree|%|mm|cm|kg|w|v))/gi, "$1$2$3 degrees").replace(/\s{2,}/g, " ");
}
var h = [
	[
		"floor lounge",
		"floor lounge",
		"seat"
	],
	[
		"sofa bed",
		"sofa bed",
		"seat"
	],
	[
		"floor chair",
		"floor chair",
		"seat"
	],
	[
		"bean bag cover",
		"bean bag cover",
		"seat"
	],
	[
		"beanbag cover",
		"bean bag cover",
		"seat"
	],
	[
		"bean bag",
		"bean bag",
		"seat"
	],
	[
		"bean bag chair cover",
		"bean bag cover",
		"seat"
	],
	[
		"chair cover",
		"chair cover",
		"seat"
	],
	[
		"office chair",
		"office chair",
		"seat"
	],
	[
		"gaming chair",
		"gaming chair",
		"seat"
	],
	[
		"seat cushion",
		"seat cushion",
		"cushion"
	],
	[
		"recliner",
		"recliner",
		"seat"
	],
	[
		"armchair",
		"armchair",
		"seat"
	],
	[
		"ottoman",
		"ottoman",
		"seat"
	],
	[
		"sofa",
		"sofa",
		"seat"
	],
	[
		"couch",
		"couch",
		"seat"
	],
	[
		"lounge",
		"lounge",
		"seat"
	],
	[
		"chair",
		"chair",
		"seat"
	],
	[
		"bed frame",
		"bed frame",
		"bed"
	],
	[
		"mattress topper",
		"mattress topper",
		"bed"
	],
	[
		"mattress",
		"mattress",
		"bed"
	],
	[
		"pillow",
		"pillow",
		"bed"
	],
	[
		"stick vacuum",
		"vacuum",
		"clean"
	],
	[
		"robot vacuum",
		"robot vacuum",
		"clean"
	],
	[
		"vacuum",
		"vacuum",
		"clean"
	],
	[
		"steam mop",
		"steam mop",
		"clean"
	],
	[
		"mop",
		"mop",
		"clean"
	],
	[
		"glass wipers",
		"glass wipers",
		"clean"
	],
	[
		"wipers",
		"wipers",
		"clean"
	],
	[
		"pressure washer",
		"pressure washer",
		"clean"
	],
	[
		"beach tent",
		"beach tent",
		"outdoor"
	],
	[
		"tent",
		"tent",
		"outdoor"
	],
	[
		"gazebo",
		"gazebo",
		"outdoor"
	],
	[
		"umbrella",
		"umbrella",
		"outdoor"
	],
	[
		"fountain pump",
		"fountain",
		"garden"
	],
	[
		"fountain",
		"fountain",
		"garden"
	],
	[
		"bird bath",
		"bird bath",
		"garden"
	],
	[
		"planter",
		"planter",
		"garden"
	],
	[
		"dog collar",
		"dog collar",
		"pet"
	],
	[
		"dog bed",
		"dog bed",
		"pet"
	],
	[
		"pet bed",
		"pet bed",
		"pet"
	],
	[
		"cat tree",
		"cat tree",
		"pet"
	],
	[
		"collar",
		"collar",
		"pet"
	],
	[
		"kitchen timer",
		"kitchen timer",
		"kitchen"
	],
	[
		"timer",
		"timer",
		"kitchen"
	],
	[
		"air fryer",
		"air fryer",
		"kitchen"
	],
	[
		"kettle",
		"kettle",
		"kitchen"
	],
	[
		"blender",
		"blender",
		"kitchen"
	],
	[
		"headlamp",
		"headlamp",
		"light"
	],
	[
		"torch",
		"torch",
		"light"
	],
	[
		"floor lamp",
		"floor lamp",
		"light"
	],
	[
		"lamp",
		"lamp",
		"light"
	],
	[
		"manicure light",
		"nail lamp",
		"beauty"
	],
	[
		"nail lamp",
		"nail lamp",
		"beauty"
	],
	[
		"necklace",
		"necklace",
		"jewellery"
	],
	[
		"bracelet",
		"bracelet",
		"jewellery"
	],
	[
		"earrings",
		"earrings",
		"jewellery"
	],
	[
		"chalk bag",
		"chalk bag",
		"sport"
	],
	[
		"treadmill",
		"treadmill",
		"sport"
	],
	[
		"dumbbells",
		"dumbbells",
		"sport"
	],
	[
		"rug",
		"rug",
		"home"
	],
	[
		"stickers",
		"stickers",
		"home"
	],
	[
		"desk",
		"desk",
		"home"
	],
	[
		"table",
		"table",
		"home"
	],
	[
		"shelf",
		"shelf",
		"home"
	],
	[
		"fan",
		"fan",
		"home"
	],
	[
		"heater",
		"heater",
		"home"
	]
], g = [
	"Artiss",
	"Devanti",
	"Keezi",
	"Gardeon",
	"Weisshorn",
	"Midea",
	"Giantz",
	"Everfit",
	"Bestway",
	"Instahut",
	"Mountview",
	"Oikiture",
	"Levede",
	"Cefito",
	"Emajin",
	"Alfordson",
	"Spector",
	"i.Pet",
	"Giselle",
	"Maxkon",
	"Rovar",
	"Jingle Jollys"
];
function _(e) {
	return String(e || "").split(/\s[|–—-]\s|[|,(]|\s(?:with|for|featuring|including|suitable)\s/i)[0].trim();
}
function v(e) {
	let t = ` ${_(e.title).toLowerCase().replace(/[^a-z0-9 ]+/g, " ")} `, n = null;
	for (let [e, r, i] of h) {
		let a = [...t.matchAll(RegExp(` ${e.replace(/ /g, " ")}s? `, "g"))].pop(), o = a ? a.index : -1;
		o >= 0 && (!n || o + e.length > n.end || o + e.length === n.end && e.length > n.len) && (n = {
			say: r,
			family: i,
			end: o + e.length,
			len: e.length
		});
	}
	return n && n.say === "sofa bed" && t.includes(" floor lounge ") && (n = {
		...n,
		say: "floor lounge"
	}), n ? {
		noun: n.say,
		family: n.family,
		plural: /s$/.test(n.say) && !/ss$/.test(n.say),
		known: !0
	} : {
		noun: "one",
		family: "generic",
		plural: !1,
		known: !1
	};
}
function y(e) {
	if (e.brand && String(e.brand).length < 30) return String(e.brand);
	let t = String(e.title || "").trim().split(/\s+/)[0] || "";
	return g.find((e) => e.toLowerCase() === t.toLowerCase()) || null;
}
function b(e, t) {
	let n = String(e.title || ""), r = [], i = y(e);
	i && r.push(i);
	let a = n.match(/\b(\d)[\s-]?seat(?:er)?\b/i);
	return a && t.family === "seat" && r.push(`${d(a[1])}-seater`), /\b(kids?|toddler|children'?s?)\b/i.test(n) && !/kid/.test(t.noun) && r.push("kids'"), r.push(t.noun === "one" ? "find" : t.noun), `${t.plural ? "these" : "this"} ${r.join(" ")}`;
}
var x = {
	features: /^(key\s+)?features?\s*:?$|^highlights?\s*:?$|^this item stands out for the following characteristics\s*:?$/i,
	specs: /^(specifications?|specs|dimensions?|technical (details|specifications))\s*:?$/i,
	pack: /^(package|packaging)\s+(content|contents|includes?)\s*:?$|^in the box\s*:?$|^what'?s included\s*:?$/i,
	skip: /^(description|note|notes|warranty|shipping|delivery)\s*:?$/i
};
function S(e) {
	let t = String(e.description || "").split(/\n+/).map((e) => e.trim()).filter(Boolean);
	String(e.description || "").length >= 1190 && t.pop();
	let n = {
		prose: [],
		bullets: [...e.features || []],
		hasSpecs: !1
	}, r = "prose";
	for (let e of t) {
		if (x.features.test(e)) {
			r = "features";
			continue;
		}
		if (x.specs.test(e)) {
			r = "specs", n.hasSpecs = !0;
			continue;
		}
		if (x.pack.test(e)) {
			r = "pack";
			continue;
		}
		if (x.skip.test(e)) {
			/description/i.test(e) || (r = "skip");
			continue;
		}
		r === "features" ? n.bullets.push(e.replace(/^[-*•▪●✔✅]\s*/, "")) : r === "prose" && n.prose.push(...e.split(/(?<=[.!?])\s+/).filter((e) => /[.!]$/.test(e.trim())));
	}
	let i = `${e.title} ${e.description}`;
	return n.hasOptions = n.hasSpecs || /\b\d+(\.\d+)?\s*(cm|mm|m)\s*(x|×)\s*\d/i.test(i) || /\b(sizes?|colou?rs?|variants?|options?)\s+(available|to choose)|available in\b|random colou?r/i.test(i) || (String(e.title).match(/\|/g) || []).length >= 2, n;
}
var C = (e) => {
	let t = String(e).replace(/\s*(&|\band\b)\s*/gi, ",").split(/\s*,\s*/).map((e) => e.trim().toLowerCase()).filter(Boolean);
	return t.length > 1 ? `${t.slice(0, -1).join(", ")} and ${t[t.length - 1]}` : t[0] || "";
}, w = [
	{
		tag: "adjust",
		score: 8,
		re: /\b(\d+)[\s-]*(?:position|angle|level|stage)s?\b.*adjust|adjust\w*\s+(?:to\s+)?(\d+)\s+(?:positions|angles|levels)/i,
		say: (e, t) => `It adjusts to ${d(e[1] || e[2])} different positions${t.family === "seat" ? ", so you can sit up or lie right back" : ""}.`
	},
	{
		tag: "adjust",
		score: 8,
		re: /^adjustable\s+(.+?)(\s+sections?)?\.?$/i,
		say: (e, t) => `You can adjust the ${C(e[1])}${e[2] ? " sections" : ""}${t.family === "seat" ? ", so it works for sitting back, lounging or stretching right out" : ""}.`
	},
	{
		tag: "store",
		score: 7,
		re: /\bsepara\w*\s+into\s+(\w+)\s+(?:parts|pieces|sections)/i,
		say: (e) => `It even separates into ${/^\d/.test(e[1]) ? d(e[1]) : e[1].toLowerCase()} pieces, which makes storing it much easier.`
	},
	{
		tag: "fold",
		score: 6,
		re: /\bfold[- ]?out\b/i,
		say: (e, t) => t.family === "seat" ? "It folds out flat when you want to stretch out." : "It folds out when you need it."
	},
	{
		tag: "fold",
		score: 5,
		re: /\b(foldable|folding|folds? (flat|away|up|down)|collapsible)\b/i,
		say: () => "It folds away when you're not using it."
	},
	{
		tag: "battery",
		score: 8,
		re: /(?:up to\s+)?(\d+)\s*(?:-\s*)?(?:min|mins|minutes?)\b[^.]*?\b(run\s?time|runtime|battery)\b|\b(run\s?time|runtime|battery life)\s+(?:of\s+)?(?:up to\s+)?(\d+)\s*(?:min|minutes)/i,
		say: (e, t) => `You get up to ${e[1] || e[4]} minutes of run time${t.family === "clean" ? " on a charge" : ""}.`
	},
	{
		tag: "cordless",
		score: 7,
		re: /\bcordless\b/i,
		say: (e, t) => t.family === "clean" ? "It's cordless, so there's no cord dragging behind you." : "It's cordless, so you're not stuck near a power point."
	},
	{
		tag: "wash",
		score: 6,
		re: /removable[^.]*?washable[^.]*?cover|removable[^.]*?cover[^.]*?washable|washable[^.]*?removable[^.]*?cover/i,
		say: (e, t) => /machine[- ]?wash/i.test(e[0]) ? "The cover comes off and goes straight in the washing machine." : "The cover comes off for a wash, too."
	},
	{
		tag: "wash",
		score: 4,
		re: /\bmachine[- ]?washable\b/i,
		say: () => "It's machine washable, too."
	},
	{
		tag: "wash",
		score: 3,
		re: /\bremovable\b[^.]*\bcover\b/i,
		say: () => "The cover comes off, too."
	},
	{
		tag: "modes",
		score: 5,
		re: /\b(\d+)\s*(?:adjustable\s+)?(suction|power|speed|cleaning|heat|heating|light|lighting|brightness|massage)\s+(modes?|settings?|levels?)/i,
		say: (e) => `There are ${d(e[1])} ${e[2].toLowerCase()} ${e[3].toLowerCase().replace(/s?$/, "s")} to choose from.`
	},
	{
		tag: "modes",
		score: 4,
		re: /\b(\d+)\s+(?:different\s+)?(modes|settings)\b/i,
		say: (e) => `There are ${d(e[1])} ${e[2].toLowerCase()} to choose from.`
	},
	{
		tag: "bin",
		score: 5,
		re: /(\d+(?:\.\d+)?)\s*l(?:itre|iter)?s?\b[^.]*?(dust\s*bin|bin|dust\s*cup|tank)[^.]*?less frequent emptying/i,
		say: (e) => `The ${e[1]} litre bin means you're emptying it less often.`
	},
	{
		tag: "carry",
		score: 4,
		re: /\bcarry(ing)?\s+handle\b/i,
		say: () => "There's a carry handle, so it's easy to move around."
	},
	{
		tag: "pocket",
		score: 3,
		re: /\b(side|rear|toy|storage)\s+pocket(?:\s+for\s+([a-z ]+?))?(?:\s+storage)?\.?$/i,
		say: (e) => e[2] ? `There's a handy ${e[1].toLowerCase()} pocket for ${/^\w+$/.test(e[2].trim()) && !/s$/.test(e[2].trim()) ? `${e[2].trim()}s` : e[2].trim()}.` : "There's a handy storage pocket, too."
	},
	{
		tag: "slip",
		score: 3,
		re: /\banti[- ]?slip\s+(base|bottom|feet|backing)\b/i,
		say: (e) => `The anti-slip ${e[1].toLowerCase()} helps it stay put.`
	},
	{
		tag: "assembly",
		score: 4,
		re: /\bno assembly\b|\bfully assembled\b|\barrives assembled\b/i,
		say: () => "There's no assembly needed, either."
	},
	{
		tag: "glow",
		score: 5,
		re: /\bglow[- ]in[- ]the[- ]dark\b/i,
		say: () => "It even glows in the dark."
	},
	{
		tag: "water",
		score: 4,
		re: /\b(waterproof|water[- ]?resistant|splash[- ]?proof|water[- ]?repellent)\b/i,
		say: (e) => `It's ${e[1].toLowerCase().replace(/\s+/g, "-")}, too.`
	},
	{
		tag: "sun",
		score: 5,
		re: /\bUPF\s*(\d+)\+?/i,
		say: (e) => `It's rated UPF ${e[1]} for sun protection.`
	},
	{
		tag: "setup",
		score: 5,
		re: /\bpop[- ]?up\b/i,
		say: () => "It's a pop-up design, so setting it up is quick."
	},
	{
		tag: "people",
		score: 4,
		re: /\b(\d)\s*(?:-|–|to)\s*(\d)\s*(?:person|people)\b/i,
		say: (e) => `It fits ${d(e[1])} to ${d(e[2])} people.`
	},
	{
		tag: "load",
		score: 3,
		re: /\b(?:hold|holds|support|supports|load[- ]bearing|weight capacity)[^.]*?(\d{2,3})\s*kg\b/i,
		say: (e) => `It holds up to ${e[1]} kilos.`
	},
	{
		tag: "foam",
		score: 3,
		re: /\bmemory foam\b/i,
		say: () => "There's memory foam in there for extra comfort."
	},
	{
		tag: "light",
		score: 3,
		re: /\blightweight\b/i,
		say: () => "It's nice and lightweight."
	},
	{
		tag: "charge",
		score: 3,
		re: /\b(usb[- ]?(c\s+)?rechargeable|rechargeable)\b/i,
		say: () => "It's rechargeable, too."
	},
	{
		tag: "motion",
		score: 3,
		re: /\bmotion sensor\b/i,
		say: () => "It's got a motion sensor, too."
	},
	{
		tag: "magnet",
		score: 3,
		re: /\bmagnetic\s+(base|back|mount)\b/i,
		say: (e) => `It's got a magnetic ${e[1].toLowerCase()}.`
	}
], T = /\b(vacuum[- ]packed|packaging|expan(d|sion)|allow \d+|instruction|manual|x\s?\d+\b|\d+\s?x\b|package|warranty|certified|suitable for|use\b.*,|colou?r|grey|gray|black|white|pink|green|blue|red|beige|charcoal|navy|cream|brown|premium|high[- ]quality|material|fabric|polyester|corduroy|suede|plastic|stainless|steel)\b/i, E = /\b(groundbreaking|revolutionary|significant impact|state of the art|cutting[- ]edge|unparalleled|ultimate|perfect for every|amazing|incredible|elevate|seamless|effortless(ly)?)\b/i;
function D(e, t, n = !0) {
	let r = m(String(e).replace(/[✀-➿←-⇿⬀-⯿️•▪●★✔✅❌]/g, "").replace(/\s+/g, " ").trim());
	if (!r) return null;
	for (let e of w) {
		if (e.tag === "fold" && ![
			"seat",
			"bed",
			"outdoor",
			"sport"
		].includes(t.family) && !/desk|table|shelf/.test(t.noun) || e.tag === "wash" && /cover/.test(t.noun)) continue;
		let n = r.match(e.re);
		if (n) return {
			text: e.say(n, t),
			tag: e.tag,
			score: e.score
		};
	}
	if (!n || T.test(r) || E.test(r)) return null;
	let i = r.replace(/[.!]$/, "").split(/\s+/);
	if (i.length >= 2 && i.length <= 5 && !/\d/.test(r) && !/^(it|this|the|you|and|or|for|to)\b/i.test(r)) {
		let e = f(r.replace(/[.!]$/, ""));
		return {
			text: `It's got ${/s$/.test(i[i.length - 1]) && !/ss$/.test(i[i.length - 1]) ? "" : /^[aeiou]/i.test(e) ? "an " : "a "}${e}.`,
			tag: `np:${i[i.length - 1].toLowerCase()}`,
			score: 1
		};
	}
	return null;
}
function O(e, t, n) {
	let r = m(String(e).trim());
	if (!r || E.test(r) || T.test(r) || /\?$/.test(r)) return null;
	let i = r.split(/\s+/);
	if (i.length < 5 || i.length > 14 || (r.match(/,/g) || []).length > 1) return null;
	let a = String(t.title).toLowerCase().split(/\s+/), o = r.toLowerCase();
	for (let e = 0; e + 2 < a.length; e++) if (o.includes(a.slice(e, e + 3).join(" "))) return null;
	return y(t) && o.includes(y(t).toLowerCase()) || !/\b(you|your|it|keeps|lets|means|makes|gives|helps)\b/i.test(r) ? null : (/^(makes|keeps|lets|gives|helps|holds|fits|works|stays|adds)\b/i.test(r) && (r = `It ${f(r)}`), {
		text: /[.!?]$/.test(r) ? r : `${r}.`,
		tag: `prose:${i[0].toLowerCase()}`,
		score: 2
	});
}
function k(e, t) {
	let n = S(e), r = [], i = /* @__PURE__ */ new Set(), a = (e) => {
		e && !i.has(e.tag) && !r.some((t) => t.text === e.text) && (i.add(e.tag), r.push(e));
	};
	for (let e of n.bullets) a(D(e, t));
	for (let e of n.prose) {
		let n = D(e, t, !1);
		n && n.score > 1 && a(n);
	}
	if (r.filter((e) => e.score > 1).length < 2) for (let r of n.prose) a(O(r, e, t));
	return {
		list: r.sort((e, t) => t.score - e.score).slice(0, 4),
		copy: n
	};
}
var A = /\b(introducing|this product features|this product|here is the solution|here'?s the fix|the solution is|features include|boasts|comes equipped|is equipped with|ideal for|perfect for|high[- ]quality|premium|state[- ]of[- ]the[- ]art|meet the|sorted\.)\b/i;
function j(e, t) {
	let n = String(e || "").trim();
	if (!n || n.split(/\s+/).length > 22 || /[:;|()[\]{}\/\\#*_=<>]/.test(n) || /\d+\s*(x|×)\s*\d+/i.test(n) || (n.match(/\d+(\.\d+)?/g) || []).length > 2 || A.test(n) || E.test(n) || /\b(\w+)\s+\1\b/i.test(n) || /\b[A-Z]{2,}\b/.test(n.replace(/\b(UPF|LED|USB|UV|TV|HD|4K|BBQ)\b/g, ""))) return !1;
	if (t) {
		let e = String(t.title).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean), r = n.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
		for (let t = 0; t + 3 < e.length; t++) if (r.includes(e.slice(t, t + 4).join(" "))) return !1;
	}
	return !0;
}
function M(e, t, n) {
	let r = t.noun, i = /\b(kids?|toddler|children)\b/i.test(e.title), a = t.family, o = [];
	return a === "seat" ? (n.adjust && o.push("Need somewhere to kick back that you can actually adjust to suit you?"), (n.store || n.fold) && o.push("Need somewhere to kick back that doesn't take up half the room?"), i ? o.push("Want a comfy little spot that's just for the kids?", "Need somewhere comfy for the little ones to chill out?") : o.push("Need a comfy spot to put your feet up?", "Want a proper spot to kick back after a long day?")) : a === "cushion" ? o.push("Spend most of the day sitting down?", "Is your chair getting uncomfortable by the afternoon?") : a === "bed" ? o.push("Not sleeping as well as you'd like?", "Reckon it's time your bed got an upgrade?") : a === "clean" ? /vacuum/.test(r) ? (n.cordless && o.push("Still dragging the big vacuum out just to clean one little mess?", "Still wrestling with a vacuum cord?"), n.battery && o.push("Want a vacuum that won't give up halfway through the house?"), o.push("Sick of lugging a heavy vacuum around the house?")) : o.push("Want cleaning to be a bit less of a chore?", "Looking for an easier way to keep things clean?") : a === "outdoor" ? o.push("Heading to the beach this summer?", "Want a bit of proper shade when you head out?") : a === "garden" ? o.push("Want to give the garden a bit of life?", "Okay, this is actually pretty handy if you've got a backyard.") : a === "pet" ? o.push(/dog/i.test(e.title) ? "Want something a bit special for your dog?" : "Got a pet that deserves a treat?") : a === "kitchen" ? o.push(/timer/.test(r) ? "Always losing track of time in the kitchen?" : "Want one less thing to think about in the kitchen?") : a === "light" ? o.push(/head/.test(r) ? "Need both hands free when it gets dark?" : "Need a bit more light where it counts?") : a === "beauty" ? o.push("Doing your nails at home?", "Want salon-style nails without leaving the house?") : a === "jewellery" ? o.push("Looking for a little something special?", "After a gift that feels a bit different?") : a === "sport" && o.push("Getting serious about your training?", "Want gear that keeps up with you?"), t.known ? o.push(t.plural ? `Been after some new ${r}?` : `Been after a new ${r}?`, `Okay, this ${t.plural ? "is" : "one is"} actually pretty handy.`) : o.push("Found something pretty handy for around the home.", "Here's one worth a look."), o;
}
function N(e) {
	let t = v(e), n = M(e, t, Object.fromEntries(k(e, t).list.map((e) => [e.tag, !0]))).filter((t) => j(t, e) && t.split(/\s+/).length <= 14);
	return Math.random() < .7 ? n[0] : c(n);
}
var P = [
	`There are a few options available, so check the full details at ${l}.`,
	`Have a look at ${l} for the available options and full specifications.`,
	`There's more than one option, so pick the right one at ${l}.`
], F = [
	`Want to check the sizing and specs? You'll find everything on the product page at ${l}.`,
	`Check ${l} to make sure the size and options are right for you.`,
	`Check the sizing and full specs on the product page at ${l}.`
], ee = [
	`Want the full specs? They're all on the product page at ${l}.`,
	`You'll find the full details and specs at ${l}.`,
	`Check out the full details at ${l}.`,
	`For all the details, have a look at ${l}.`
], te = [
	`Check it out at ${l}.`,
	`Grab yours at ${l}.`,
	`Find it at ${l}.`,
	`Have a look at ${l}.`
];
function ne(e, { hook: t = null } = {}) {
	let n = /* @__PURE__ */ new Set(), r = v(e), i = b(e, r), { list: a, copy: o } = k(e, r), s = c(r.known ? [
		`Check out ${i}.`,
		`Have a look at ${i}.`,
		`Take a look at ${i}.`
	] : ["Check this out.", "Have a look at this."], n), l = a.map((e) => e.text).filter((t) => j(t, e));
	l.length > 1 && (l = l.filter((e, t) => t < 2 || !/^It's got /.test(e)));
	let u = (e) => new Set((e.toLowerCase().match(/[a-z]{5,}/g) || []).filter((e) => ![
		"there",
		"handy",
		"which",
		"makes"
	].includes(e)));
	l = l.filter((e, t) => !l.slice(0, t).some((t) => [...u(e)].filter((e) => u(t).has(e)).length >= 2)), l = l.slice(0, 4), l[0] && (l[0] = l[0].replace(/,\s*(too|either)\.$/, ".")), r.plural && (l = l.map((e) => e.replace(/^It's\b/, "They're").replace(/^It\b/, "They").replace(/^It even\b/, "They even")));
	let f = e.priceCents && e.availability !== "out_of_stock" && e.availability !== "discontinued" ? c(r.plural ? [`They're ${p(e.priceCents)}.`, `You can grab them for ${p(e.priceCents)}.`] : [
		`This one's ${p(e.priceCents)}.`,
		`It's ${p(e.priceCents)}.`,
		`You can grab it for ${p(e.priceCents)}.`
	], n) : null, m = typeof e.stockQuantity == "number" && e.stockQuantity > 0 && e.stockQuantity <= 5 ? `There are only ${d(e.stockQuantity)} left.` : null, h = `${e.title} ${e.description}`, g = (o.hasOptions ? c(/\b(sizes?|sizing|dimensions?)\b/i.test(h) ? F : /\b(colou?rs? (available|to choose)|variants?|options? available|available in)\b/i.test(h) ? P : ee, n) : null) || c(te, n), _ = [
		s,
		...l,
		f,
		m,
		g
	].filter(Boolean).filter((t) => j(t, e) || t === g), y = new Set(String(t || "").toLowerCase().match(/[a-z]{5,}/g) || []);
	return _.filter((e, t) => {
		if (t === 0 || e === g || e === f || e === m) return !0;
		let n = e.toLowerCase().match(/[a-z]{5,}/g) || [];
		return !n.length || !n.every((e) => y.has(e));
	}).join(" ").replace(/\s{2,}/g, " ").trim();
}
function I(e) {
	let t = v(e), { list: n } = k(e, t), r = n.filter((t) => j(t.text, e)), i = [];
	return t.known || i.push("can't tell what the product is from its title"), r.length < 2 && i.push(`only ${r.length} sayable benefit${r.length === 1 ? "" : "s"} in the product copy (need 2)`), e.priceCents || i.push("no current price"), {
		ok: !i.length,
		noun: t.noun,
		family: t.family,
		benefits: r.map((e) => e.text),
		reasons: i
	};
}
function L(e, t, { trendTerms: n = [] } = {}) {
	let r = v(e), i = [
		t,
		k(e, r).list.map((e) => e.text).find((t) => j(t, e)) || null,
		e.priceCents && e.availability !== "out_of_stock" && e.availability !== "discontinued" ? `${p(e.priceCents)} at ${l}` : `Have a look at ${l}`,
		e.url
	].filter(Boolean), a = (e) => `#${String(e).toLowerCase().replace(/[^a-z0-9]+/g, "")}`, o = new Set([...r.noun.split(/\s+/), r.noun.replace(/\s+/g, "")].filter((e) => e.length > 3 && e !== "find")), s = {
		seat: ["homedecor", "livingroom"],
		bed: ["bedroom", "sleep"],
		clean: ["cleaninghacks", "cleantok"],
		outdoor: ["outdoors", "summer"],
		garden: ["garden", "backyard"],
		pet: ["dogsofinstagram", "pets"],
		kitchen: ["kitchen", "kitchenhacks"],
		light: ["camping", "outdoors"],
		beauty: ["nails", "beauty"],
		jewellery: ["jewellery", "giftideas"],
		sport: ["fitness"],
		home: ["homehacks"],
		cushion: ["workfromhome", "comfort"]
	}, c = /* @__PURE__ */ new Set([...o, ...String(e.title).toLowerCase().match(/[a-z]{4,}/g) || []]), u = n.map((e) => String(e).toLowerCase().trim()).filter((e) => e && e.length <= 30 && e.split(/\s+/).some((e) => e.length > 3 && c.has(e))).slice(0, 2), d = [.../* @__PURE__ */ new Set([
		"#placiddeals",
		"#australia",
		...[...o].map(a),
		...(s[r.family] || []).map(a),
		...u.map(a),
		"#tiktokmademebuyit"
	])].filter((e) => e.length > 2).slice(0, 8);
	return {
		caption: `${i.join("\n")}\n\n${d.join(" ")}`,
		hashtags: d
	};
}
function R(e, t) {
	let n = String(e || "").trim(), r = String(t || "").trim();
	return z(!n || r.startsWith(n) ? r : `${n}${/[.!?]$/.test(n) ? "" : "."} ${r}`);
}
function z(e) {
	return String(e || "").replace(/\bplaciddeals\.com\b/gi, "Placid Deals dot com").replace(/\s{2,}/g, " ").trim();
}
//#endregion
//#region src/reel.js
var B = "\"Segoe UI\", system-ui, -apple-system, Helvetica, sans-serif";
async function V(e, t = 44100) {
	let n = new OfflineAudioContext(1, Math.ceil(e * t), t), r = 60 / 104, i = Math.ceil(e / (r * 4)) + 1, a = [
		[
			220,
			261.63,
			329.63
		],
		[
			174.61,
			220,
			261.63
		],
		[
			261.63,
			329.63,
			392
		],
		[
			196,
			246.94,
			293.66
		]
	], o = n.createGain();
	o.gain.value = .9, o.connect(n.destination);
	for (let s = 0; s < i; s++) {
		let i = s * r * 4, c = a[s % a.length];
		for (let e of c) {
			let t = n.createOscillator(), a = n.createGain();
			t.type = "triangle", t.frequency.value = e, a.gain.setValueAtTime(0, i), a.gain.linearRampToValueAtTime(.07, i + .35), a.gain.linearRampToValueAtTime(0, i + r * 4), t.connect(a).connect(o), t.start(i), t.stop(i + r * 4 + .05);
		}
		for (let e of [0, 2]) {
			let t = n.createOscillator(), a = n.createGain();
			t.type = "sine", t.frequency.value = c[0] / 2, a.gain.setValueAtTime(.14, i + e * r), a.gain.exponentialRampToValueAtTime(.001, i + e * r + r * .9), t.connect(a).connect(o), t.start(i + e * r), t.stop(i + e * r + r);
		}
		for (let a = 0; a < 8; a++) {
			let s = i + a * r / 2;
			if (s > e) break;
			let c = Math.floor(t * .03), l = n.createBuffer(1, c, t), u = l.getChannelData(0);
			for (let e = 0; e < c; e++) u[e] = (Math.random() * 2 - 1) * (1 - e / c) ** 3;
			let d = n.createBufferSource(), f = n.createGain();
			d.buffer = l, f.gain.value = a % 2 ? .05 : .09, d.connect(f).connect(o), d.start(s);
		}
	}
	return (await n.startRendering()).getChannelData(0);
}
function H(e, t, n = .45) {
	let r = Math.max(e.samples.length, t ? t.length : 0), i = new Float32Array(r);
	if (i.set(e.samples), t) for (let a = 0; a < r; a++) {
		let r = Math.abs(e.samples[a] || 0);
		i[a] += (t[a % t.length] || 0) * n * (r > .02 ? .5 : 1);
	}
	let a = 0;
	for (let e = 0; e < r; e++) a = Math.max(a, Math.abs(i[e]));
	if (a > .99) for (let e = 0; e < r; e++) i[e] *= .99 / a;
	return {
		samples: i,
		rate: e.rate
	};
}
function U(e, t) {
	let { samples: n, rate: r } = t, i = n.length / r, a = Math.floor(r * .03), o = [];
	for (let e = 0; e < n.length; e += a) {
		let t = 0;
		for (let r = e; r < Math.min(n.length, e + a); r++) t += n[r] * n[r];
		o.push(Math.sqrt(t / a));
	}
	let s = ([...o].sort((e, t) => e - t)[Math.floor(o.length * .95)] || 1) * .06, c = [], l = null;
	o.forEach((e, t) => {
		e < s ? l === null && (l = t) : (l !== null && (t - l) * .03 > .18 && c.push((l + t) / 2 * .03), l = null);
	}), e = W(e);
	let u = e.replace(/\s+/g, " ").trim().split(/(?<=[.!?;:,])\s+/).flatMap((e) => {
		let t = e.split(" ");
		if (t.length <= 5) return [e];
		let n = [];
		for (let e = 0; e < t.length; e += 4) n.push(t.slice(e, e + 4).join(" "));
		return n.length > 1 && n[n.length - 1].split(" ").length === 1 && (n[n.length - 2] += " " + n.pop()), n;
	}).map((e) => e.trim()).filter(Boolean), d = u.map((e) => e.length), f = d.reduce((e, t) => e + t, 0), p = [], m = 0;
	return u.forEach((e, t) => {
		let n = d[t] / f * i, r = m + n, a = c.find((e) => Math.abs(e - r) < .28);
		a && (r = a), p.push({
			t0: m,
			t1: Math.max(r, m + .35),
			text: e
		}), m = p[p.length - 1].t1;
	}), p;
}
function W(e) {
	return String(e || "").replace(/\bplacid\s+deals\s+dot\s+com\b/gi, "placiddeals.com").replace(/\b([a-z0-9-]+)\s+dot\s+(com|com\.au|net|org|co)\b/gi, (e, t, n) => `${t}.${n}`).replace(/\s{2,}/g, " ").trim();
}
function G(e, t, n, r, i, a) {
	e.beginPath(), e.roundRect(t, n, r, i, a);
}
function K(e, t, n, r, i, a = 3) {
	let o = i;
	for (; o > i * .55; o -= 2) {
		e.font = `${r} ${o}px ${B}`;
		let i = t.split(/\s+/), s = [], c = "";
		for (let t of i) {
			let r = c ? `${c} ${t}` : t;
			e.measureText(r).width > n && c ? (s.push(c), c = t) : c = r;
		}
		if (c && s.push(c), s.length <= a) return {
			fs: o,
			lines: s
		};
	}
	return e.font = `${r} ${o}px ${B}`, {
		fs: o,
		lines: [t]
	};
}
function q(e, t, n, r, i) {
	if (i <= 0) return;
	e.save(), e.globalAlpha = i;
	let a = t * .07, { fs: o, lines: s } = K(e, r.toUpperCase(), t - a * 2, 800, Math.round(t * .095), 3), c = o * 1.15, l = s.length * c + a * .8, u = n * .175;
	e.fillStyle = "rgba(0,0,0,.55)", G(e, a * .5, u - a * .4, t - a, l, t * .035), e.fill(), e.textBaseline = "top", e.textAlign = "center", s.forEach((n, r) => {
		e.fillStyle = "#fff", e.strokeStyle = "rgba(0,0,0,.65)", e.lineWidth = o * .14, e.lineJoin = "round", e.strokeText(n, t / 2, u + r * c), e.fillText(n, t / 2, u + r * c);
	}), e.restore();
}
function J(e, t, n, r) {
	if (!r) return;
	e.save();
	let { fs: i, lines: a } = K(e, r, t - t * .08 * 2, 700, Math.round(t * .062), 2), o = i * 1.2, s = n * .7;
	e.textAlign = "center", e.textBaseline = "top";
	for (let n of a) e.strokeStyle = "rgba(0,0,0,.8)", e.lineWidth = i * .18, e.lineJoin = "round", e.strokeText(n, t / 2, s), e.fillStyle = "#fff", e.fillText(n, t / 2, s), s += o;
	e.restore();
}
var Y = {
	deep: "#1E0733",
	deep2: "#2C0B4E",
	violet: "#8B5CF6",
	light: "#A78BFA",
	ink: "#ffffff"
};
function X(e, t, n, r) {
	e.save(), e.translate(t, n);
	let i = r / 64;
	e.scale(i, i);
	let a = e.createLinearGradient(0, 0, 64, 64);
	a.addColorStop(0, Y.light), a.addColorStop(1, Y.violet), e.fillStyle = a, e.beginPath(), e.moveTo(14, 8), e.lineTo(34, 8), e.arc(34, 32, 24, -Math.PI / 2, Math.PI / 2), e.lineTo(14, 56), e.closePath(), e.fill(), e.globalCompositeOperation = "destination-out", e.beginPath(), e.moveTo(26, 20), e.lineTo(34, 20), e.arc(34, 32, 12, -Math.PI / 2, Math.PI / 2), e.lineTo(26, 44), e.closePath(), e.fill(), e.globalCompositeOperation = "source-over", e.fillStyle = a, e.beginPath(), e.moveTo(20, 46), e.lineTo(20, 26), e.lineTo(34, 12), e.lineTo(44, 22), e.lineTo(30, 36), e.lineTo(30, 46), e.closePath(), e.fill(), e.fillStyle = Y.deep, e.beginPath(), e.arc(35, 21, 2.6, 0, Math.PI * 2), e.fill(), e.restore();
}
function re(e, t, n, r, i = !1) {
	e.save(), e.textBaseline = "top", e.textAlign = i ? "center" : "left", e.font = `700 ${r}px ${B}`, e.fillStyle = Y.ink, e.letterSpacing = `${r * .16}px`, e.fillText("PLACID", t, n);
	let a = e.measureText("PLACID").width, o = n + r * 1.12;
	e.font = `600 ${r * .6}px ${B}`, e.fillStyle = Y.light, e.letterSpacing = `${r * .26}px`, e.fillText("DEALS", t, o);
	let s = e.measureText("DEALS").width;
	e.letterSpacing = "0px";
	let c = o + r * .3, l = r * .22, u = r * .5, d = i ? t - s / 2 : t;
	return e.strokeStyle = Y.violet, e.lineWidth = Math.max(1, r * .06), e.beginPath(), e.moveTo(d - l - u, c), e.lineTo(d - l, c), e.moveTo(d + s + l, c), e.lineTo(d + s + l + u, c), e.stroke(), e.restore(), a;
}
function ie(e, t, n, { logo: r, host: i, price: a }) {
	let o = n * .105, s = n * .095;
	e.save();
	let c = e.createLinearGradient(0, 0, t, o);
	c.addColorStop(0, Y.deep), c.addColorStop(1, Y.deep2), e.fillStyle = c, e.fillRect(0, 0, t, o), e.fillStyle = Y.deep, e.fillRect(0, n - s, t, s), e.strokeStyle = Y.violet, e.lineWidth = Math.max(2, t * .006), e.beginPath(), e.moveTo(0, o), e.lineTo(t, o), e.moveTo(0, n - s), e.lineTo(t, n - s), e.stroke(), e.strokeRect(e.lineWidth / 2, e.lineWidth / 2, t - e.lineWidth, n - e.lineWidth);
	let l = t * .05, u = o * .52;
	if (r) {
		let t = u * 1.25, n = t * (r.width / r.height);
		e.drawImage(r, l, (o - t) / 2, n, t);
	} else {
		X(e, l, (o - u) / 2, u);
		let t = u * .42;
		e.save(), e.textBaseline = "middle", e.textAlign = "left", e.font = `700 ${t}px ${B}`, e.letterSpacing = `${t * .16}px`, e.fillStyle = Y.ink;
		let n = l + u * 1.3;
		e.fillText("PLACID", n, o / 2);
		let r = e.measureText("PLACID").width + t * .5;
		e.fillStyle = Y.light, e.fillText("DEALS", n + r, o / 2), e.letterSpacing = "0px", e.restore();
	}
	if (a) {
		let n = Math.round(t * .055);
		e.font = `800 ${n}px ${B}`;
		let r = e.measureText(a).width + n * 1.1, i = n * 1.5, s = t - r - l, c = (o - i) / 2;
		e.fillStyle = Y.violet, G(e, s, c, r, i, i / 2), e.fill(), e.fillStyle = Y.ink, e.textAlign = "center", e.textBaseline = "middle", e.fillText(a, s + r / 2, c + i / 2 + 1);
	}
	e.font = `700 ${Math.round(t * .045)}px ${B}`, e.fillStyle = Y.ink, e.textAlign = "center", e.textBaseline = "middle", e.fillText(i, t / 2, n - s / 2), e.restore();
}
function ae(e, t, n, { title: r, host: i, price: a, logo: o, payments: s }, c) {
	if (c <= 0) return;
	e.save(), e.globalAlpha = c, e.fillStyle = "rgba(30,7,51,.93)", e.fillRect(0, 0, t, n);
	let l = t * .09;
	e.textAlign = "center";
	let u = K(e, r, t - l * 2, 800, Math.round(t * .085), 3);
	e.textBaseline = "top";
	let d = n * .3;
	if (e.fillStyle = "#fff", u.lines.forEach((n, r) => e.fillText(n, t / 2, d + r * u.fs * 1.15)), d += u.lines.length * u.fs * 1.15 + n * .02, a && (e.font = `800 ${Math.round(t * .11)}px ${B}`, e.fillStyle = Y.light, e.fillText(a, t / 2, d), d += t * .15), e.font = `700 ${Math.round(t * .058)}px ${B}`, e.fillStyle = "#fff", e.fillText(i, t / 2, d), d += t * .085, e.font = `600 ${Math.round(t * .042)}px ${B}`, e.fillStyle = "#9aa1ad", e.fillText("Link in bio", t / 2, d), s && (d += t * .075, e.font = `600 ${Math.round(t * .038)}px ${B}`, e.fillStyle = "#5eead4", e.fillText(s, t / 2, d)), o) {
		let r = t * .34, i = r * (o.height / o.width);
		e.drawImage(o, (t - r) / 2, n * .12, r, i);
	} else {
		let r = t * .2;
		X(e, (t - r) / 2, n * .09, r), re(e, t / 2, n * .09 + r * 1.25, t * .062, !0);
	}
	e.restore();
}
function oe({ hook: e, cues: t, price: n, title: r, host: i, seconds: a, logo: o = null, payments: s = null }) {
	let c = Math.max(a - 2.2, a * .82);
	return (a, l) => {
		let u = a.canvas.width, d = a.canvas.height;
		l < c && ie(a, u, d, {
			logo: o,
			host: i,
			price: n
		}), q(a, u, d, e, l < 2 ? Math.min(1, l / .25) : Math.max(0, 1 - (l - 2) / .6));
		let f = t.find((e) => l >= e.t0 && l < e.t1);
		l > 2.4 && J(a, u, d, f?.text), ae(a, u, d, {
			title: r,
			host: i,
			price: n,
			logo: o,
			payments: s
		}, l > c ? Math.min(1, (l - c) / .5) : 0);
	};
}
//#endregion
//#region src/gen.worker.js?worker&url
var se = new URL("assets/gen.worker-ptNQZks0.js", import.meta.url).href, ce = new URL("assets/tts.worker-DlZWSiBg.js", import.meta.url).href;
//#endregion
//#region src/engine.js
function Z(e) {
	let t = 0, n = /* @__PURE__ */ new Map();
	return e.onmessage = ({ data: e }) => {
		let t = n.get(e.id);
		t && (e.type === "done" ? (n.delete(e.id), t.resolve(e.result)) : e.type === "error" ? (n.delete(e.id), t.reject(Error(e.message))) : t.onEvent?.(e));
	}, e.onerror = (e) => {
		e.preventDefault?.();
		for (let e of n.values()) e.reject(/* @__PURE__ */ Error("The video engine ran out of memory. Close other tabs and try again."));
		n.clear();
	}, (r, i) => new Promise((a, o) => {
		let s = ++t;
		n.set(s, {
			resolve: a,
			reject: o,
			onEvent: i
		}), e.postMessage({
			...r,
			id: s
		});
	});
}
function Q(e) {
	if (e.origin === self.location.origin) return new Worker(e, { type: "module" });
	let t = new Blob([`import ${JSON.stringify(e.href)};`], { type: "text/javascript" });
	return new Worker(URL.createObjectURL(t), { type: "module" });
}
var le = null, $ = null, ue = () => le ??= Z(Q(new URL(se, import.meta.url))), de = () => $ ??= Z(Q(new URL(ce, import.meta.url)));
function fe(e) {
	let t = /* @__PURE__ */ new Map();
	return (n) => {
		if (n.type === "progress") {
			t.set(n.file, n);
			let r = 0, i = 0;
			for (let e of t.values()) r += e.loaded || 0, i += e.total || 0;
			i && e?.(`Downloading the ${n.stage.toLowerCase()} (first time only)`, r / i);
		} else n.type === "status" && (t.clear(), e?.(n.text, null));
	};
}
async function pe(e, { base: t = null, onProgress: n } = {}) {
	let r;
	try {
		r = new URL(e);
	} catch {
		throw Error("Paste the whole product link, starting with https://");
	}
	let i = t || r.origin, a = await fetch(`${i}/api/public/product-card?url=${encodeURIComponent(r.href)}`), o = await a.json().catch(() => ({}));
	if (!a.ok) throw Error(o.error || `The product could not be read (${a.status}).`);
	if (!o.images?.length) throw Error("That product has no photos to make a reel from.");
	try {
		let e = new URL(o.url);
		e.protocol = r.protocol, e.host = r.host, o.url = e.href;
	} catch {
		o.url = r.href;
	}
	n?.("Downloading product photos…", null);
	let s = [];
	for (let e of o.images.slice(0, 5)) {
		let t = await fetch(e).catch(() => null);
		t?.ok && s.push(await t.blob());
	}
	if (!s.length) throw Error("The product photos could not be downloaded. Try again in a minute.");
	return {
		card: o,
		photos: s
	};
}
var me = [
	"push",
	"orbit",
	"pan",
	"pull",
	"crane",
	"drift"
];
async function he({ card: e, photos: t, hook: n, script: r, voice: i = "bf_emma", music: a = "auto", logo: s = null, payments: c = !0, canvas: l, onProgress: u, trendTerms: d = [] }) {
	let f = fe(u), p = R(n, r);
	u?.("Recording the voiceover…", null);
	let m = await de()({
		text: p,
		voice: i,
		speed: 1
	}, f), h = {
		samples: m.samples,
		rate: m.rate,
		text: p
	}, g = h.samples.length / h.rate + 2.6, _ = null;
	(a === "auto" || a === "quiet") && (u?.("Writing the music…", null), _ = await V(g, h.rate));
	let v = H(h, _, a === "quiet" ? .22 : .45), y = oe({
		hook: n,
		cues: U(p, h),
		price: e.priceLabel,
		title: e.title,
		host: new URL(e.url).host,
		seconds: g,
		logo: s ? await createImageBitmap(s) : null,
		payments: c
	}), b = [...me].sort(() => Math.random() - .5), x = [t[0], ...t.slice(1).sort(() => Math.random() - .5)], S = [];
	for (let [e, n] of x.entries()) u?.(`Reading the depth of photo ${e + 1} of ${t.length}…`, null), S.push({
		image: await createImageBitmap(n),
		depth: await ue()({
			op: "depth",
			blob: n
		}, f),
		motion: b[e % b.length]
	});
	let C = new o(l);
	C.setFrame("vertical", null);
	let w = await C.record(S, {
		intensity: 1,
		grain: .03,
		onFrame: y
	}, g, v, (e) => u?.("Recording — keep this tab open", e)), T = L(e, n, { trendTerms: d });
	return {
		video: w,
		caption: T.caption,
		hashtags: T.hashtags,
		hook: n,
		script: r,
		seconds: g
	};
}
//#endregion
export { n as VOICES, I as adReadiness, N as hookFor, pe as loadProduct, he as makeReel, L as productPost, ne as productScript, j as sayable };
