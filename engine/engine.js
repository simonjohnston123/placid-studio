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
o.prototype.renderFrames = async function(e, t, n, r, i, { fps: a = 24, onTick: o } = {}) {
	this.stop(), r && (n = Math.max(n, r.samples.length / r.rate + .6));
	let s = n / e.length, c = Array.isArray(t.shotStarts) && t.shotStarts.length === e.length ? t.shotStarts : e.map((e, t) => t * s), l = Math.ceil(n * a), u = -1, d = (t) => {
		t !== u && (u = t, this.load(e[t].image, e[t].depth));
	};
	for (let r = 0; r < l; r++) {
		let s = r / a, u = 0;
		for (; u + 1 < e.length && c[u + 1] <= s;) u++;
		d(u);
		let f = Math.max(.5, (u + 1 < e.length ? c[u + 1] : n) - c[u]), p = Math.min(1, (s - c[u]) / f), m = e.length > 1 ? Math.min(1, (s - c[u]) / .3) : 1;
		this.draw(e[u].motion, p, {
			...t,
			alpha: m
		}), t.onFrame?.(this.ctx, s, u), await i(this.out, r, l), o?.((r + 1) / l);
	}
	return {
		seconds: n,
		frames: l,
		fps: a
	};
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
}, f = (e) => String(e || "").replace(/^./, (e) => e.toUpperCase()), p = (e) => String(e || "").replace(/^./, (e) => e.toLowerCase()), m = (e) => e % 100 ? `$${(e / 100).toFixed(2)}` : `$${e / 100}`;
function h(e) {
	return String(e || "").replace(/\b(\d{2,3})\s*(?=(flexibility|rotation|swivel|tilt|angle)\b)/gi, "$1 degree ").replace(/\b(bends?|bending|folds?|rotates?|swivels?|tilts?)(\s+(?:up\s+)?to\s+)(\d{2,3})\b(?!\s*(degree|%|mm|cm|kg|w|v))/gi, "$1$2$3 degrees").replace(/\s{2,}/g, " ");
}
var g = [
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
	],
	[
		"bar fridge",
		"bar fridge",
		"kitchen"
	],
	[
		"mini fridge",
		"bar fridge",
		"kitchen"
	],
	[
		"wine fridge",
		"wine fridge",
		"kitchen"
	],
	[
		"fridge",
		"fridge",
		"kitchen"
	],
	[
		"freezer",
		"freezer",
		"kitchen"
	],
	[
		"ice maker",
		"ice maker",
		"kitchen"
	],
	[
		"cooktop",
		"cooktop",
		"kitchen"
	],
	[
		"rangehood",
		"rangehood",
		"kitchen"
	],
	[
		"coffee machine",
		"coffee machine",
		"kitchen"
	],
	[
		"microwave",
		"microwave",
		"kitchen"
	],
	[
		"dishwasher",
		"dishwasher",
		"kitchen"
	],
	[
		"dining table",
		"dining table",
		"home"
	],
	[
		"dining chairs",
		"dining chairs",
		"seat"
	],
	[
		"bar stools",
		"bar stools",
		"seat"
	],
	[
		"bar stool",
		"bar stool",
		"seat"
	],
	[
		"massage chair",
		"massage chair",
		"seat"
	],
	[
		"lounge setting",
		"outdoor lounge setting",
		"seat"
	],
	[
		"outdoor sofa set",
		"outdoor lounge setting",
		"seat"
	],
	[
		"dehumidifier",
		"dehumidifier",
		"home"
	],
	[
		"air purifier",
		"air purifier",
		"home"
	],
	[
		"humidifier",
		"humidifier",
		"home"
	],
	[
		"air conditioner",
		"air conditioner",
		"home"
	],
	[
		"wardrobe",
		"wardrobe",
		"home"
	],
	[
		"bookshelf",
		"bookshelf",
		"home"
	],
	[
		"tv unit",
		"TV unit",
		"home"
	],
	[
		"air compressor",
		"air compressor",
		"tools"
	],
	[
		"pressure pump",
		"pressure pump",
		"tools"
	],
	[
		"generator",
		"generator",
		"tools"
	],
	[
		"tool box",
		"tool box",
		"tools"
	],
	[
		"exercise bike",
		"exercise bike",
		"sport"
	],
	[
		"walking pad",
		"walking pad",
		"sport"
	],
	[
		"rowing machine",
		"rowing machine",
		"sport"
	],
	[
		"weight bench",
		"weight bench",
		"sport"
	],
	[
		"dog kennel",
		"dog kennel",
		"pet"
	],
	[
		"kennel",
		"kennel",
		"pet"
	],
	[
		"cat litter box",
		"litter box",
		"pet"
	],
	[
		"litter box",
		"litter box",
		"pet"
	],
	[
		"ride on car",
		"ride-on car",
		"kids"
	],
	[
		"kids ride on",
		"ride-on",
		"kids"
	],
	[
		"trampoline",
		"trampoline",
		"kids"
	],
	[
		"cubby house",
		"cubby house",
		"kids"
	],
	[
		"bluetooth speaker",
		"bluetooth speaker",
		"home"
	],
	[
		"speaker",
		"speaker",
		"home"
	],
	[
		"paper shredder",
		"paper shredder",
		"home"
	],
	[
		"shredder",
		"paper shredder",
		"home"
	]
], _ = [
	[
		/ air conditioner /,
		"air conditioner",
		"home"
	],
	[
		/ dual fuel cooker /,
		"dual fuel cooker",
		"kitchen"
	],
	[
		/ dehumidifier /,
		"dehumidifier",
		"home"
	]
], v = [
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
function y(e) {
	return String(e || "").split(/\s[|–—-]\s|[|,(]|\s(?:with|for|featuring|including|suitable)\s/i)[0].trim();
}
function b(e) {
	let t = ` ${y(e.title).toLowerCase().replace(/[^a-z0-9 ]+/g, " ")} `, n = null;
	for (let [e, r, i] of g) {
		let a = [...t.matchAll(RegExp(` ${e.replace(/ /g, " ")}s? `, "g"))].pop(), o = a ? a.index : -1;
		o >= 0 && (!n || o + e.length > n.end || o + e.length === n.end && e.length > n.len) && (n = {
			say: r,
			family: i,
			end: o + e.length,
			len: e.length
		});
	}
	n && n.say === "sofa bed" && t.includes(" floor lounge ") && (n = {
		...n,
		say: "floor lounge"
	});
	let r = _.find(([e]) => e.test(t));
	return r && (n = {
		say: r[1],
		family: r[2],
		end: 0,
		len: 0
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
function x(e) {
	if (e.brand && String(e.brand).length < 30) return String(e.brand);
	let t = String(e.title || "").trim().split(/\s+/)[0] || "";
	return v.find((e) => e.toLowerCase() === t.toLowerCase()) || null;
}
function S(e, t) {
	let n = String(e.title || ""), r = [], i = x(e);
	i && r.push(i);
	let a = n.match(/\b(\d)[\s-]?seat(?:er)?\b/i);
	return a && t.family === "seat" && r.push(`${d(a[1])}-seater`), /\b(kids?|toddler|children'?s?)\b/i.test(n) && !/kid/.test(t.noun) && r.push("kids'"), r.push(t.noun === "one" ? "find" : t.noun), `${t.plural ? "these" : "this"} ${r.join(" ")}`;
}
var C = {
	features: /^(key\s+)?features?\s*:?$|^highlights?\s*:?$|^this item stands out for the following characteristics\s*:?$/i,
	specs: /^(specifications?|specs|dimensions?|technical (details|specifications))\s*:?$/i,
	pack: /^(package|packaging)\s+(content|contents|includes?)\s*:?$|^in the box\s*:?$|^what'?s included\s*:?$/i,
	skip: /^(description|note|notes|warranty|shipping|delivery)\s*:?$/i
};
function w(e) {
	let t = String(e.description || "").split(/\n+/).map((e) => e.trim()).filter(Boolean);
	String(e.description || "").length >= 1190 && t.pop();
	let n = {
		prose: [],
		bullets: [...e.features || []],
		hasSpecs: !1
	}, r = "prose";
	for (let e of t) {
		if (C.features.test(e)) {
			r = "features";
			continue;
		}
		if (C.specs.test(e)) {
			r = "specs", n.hasSpecs = !0;
			continue;
		}
		if (C.pack.test(e)) {
			r = "pack";
			continue;
		}
		if (C.skip.test(e)) {
			/description/i.test(e) || (r = "skip");
			continue;
		}
		r === "features" ? n.bullets.push(e.replace(/^[-*•▪●✔✅]\s*/, "")) : r === "prose" && n.prose.push(...e.split(/(?<=[.!?])\s+/).filter((e) => /[.!]$/.test(e.trim())));
	}
	let i = `${e.title} ${e.description}`;
	return n.hasOptions = n.hasSpecs || /\b\d+(\.\d+)?\s*(cm|mm|m)\s*(x|×)\s*\d/i.test(i) || /\b(sizes?|colou?rs?|variants?|options?)\s+(available|to choose)|available in\b|random colou?r/i.test(i) || (String(e.title).match(/\|/g) || []).length >= 2, n;
}
var T = (e) => {
	let t = String(e).replace(/\s*(&|\band\b)\s*/gi, ",").split(/\s*,\s*/).map((e) => e.trim().toLowerCase()).filter(Boolean);
	return t.length > 1 ? `${t.slice(0, -1).join(", ")} and ${t[t.length - 1]}` : t[0] || "";
}, E = [
	{
		tag: "adjust",
		score: 8,
		re: /\b(\d+)[\s-]*(?:position|angle|level|stage)s?\b.*adjust|adjust\w*[^.]*?\b(\d+)\s+(?:positions|angles|levels)\b/i,
		say: (e, t) => `It adjusts to ${d(e[1] || e[2])} different positions${t.family === "seat" ? ", so you can sit up or lie right back" : ""}.`
	},
	{
		tag: "adjust",
		score: 8,
		re: /^adjustable\s+(.+?)(\s+sections?)?\.?$/i,
		say: (e, t) => `You can adjust the ${T(e[1])}${e[2] ? " sections" : ""}${t.family === "seat" ? ", so it works for sitting back, lounging or stretching right out" : ""}.`
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
		tag: "incline",
		score: 7,
		re: /\b(automatic|auto|power(ed)?|motori[sz]ed)\s+incline\b/i,
		say: () => "It's got automatic incline, so you can step up the workout without stopping."
	},
	{
		tag: "cushion",
		score: 6,
		re: /\b(cushion(ed|ing)?|shock\s?(control|absorb\w*))\b[^.]*\b(belt|deck|running)\b|\b(belt|deck)\b[^.]*\bcushion/i,
		say: (e, t) => /joint/i.test(e.input || "") ? "The running belt's cushioned, so it's easier on your joints." : "The running belt's cushioned for a more comfortable run."
	},
	{
		tag: "programs",
		score: 5,
		re: /\bprograms?\s+1\s+to\s+(\d+)\b|\b(\d+)\s+(?:preset\s+|built[- ]in\s+|workout\s+)*(?:workout\s+)?programs\b/i,
		say: (e) => `There are ${d(e[1] || e[2])} workout programs built in.`
	},
	{
		tag: "apps",
		score: 5,
		re: /\b(zwift|kinomap|app compatib\w*|compatible with[^.]*app)/i,
		say: (e) => {
			let t = [...new Set(((e.input || "").match(/\b(Zwift|Kinomap|FitShow|Kinomap|iFit)\b/gi) || []).map((e) => e[0].toUpperCase() + e.slice(1).toLowerCase()))];
			return t.length ? `It works with apps like ${t.slice(0, 2).join(" and ")}.` : "It works with fitness apps, too.";
		}
	},
	{
		tag: "motor",
		score: 3,
		re: /\bbrushless\s+motor\b/i,
		say: () => "It runs on a brushless motor for a smooth run."
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
	},
	{
		tag: "temp",
		score: 8,
		re: /\bbetween\s*(-?\d+)\s*°?\s*C?\s*(?:and|to|-|–)\s*(-?\d+)\s*°\s*C\b/i,
		say: (e) => `You can set it anywhere between ${e[1]} and ${e[2]} degrees.`
	},
	{
		tag: "speed",
		score: 7,
		re: /\bup to\s*(\d+(?:\.\d)?)\s*km\s*\/?\s*h\b/i,
		say: (e) => {
			let t = [...String(e.input || e[0]).matchAll(/(\d+(?:\.\d)?)\s*km\s*\/?\s*h/gi)].map((e) => Number(e[1]));
			return `It goes up to ${Math.max(Number(e[1]), ...t)} kilometres an hour.`;
		}
	},
	{
		tag: "incline-pct",
		score: 6,
		re: /\b(\d{1,2})\s*%\s*incline\b|\bincline[^.]{0,20}?\b(\d{1,2})\s*%/i,
		say: (e) => `The incline goes up to ${e[1] || e[2]} per cent.`
	},
	{
		tag: "noise",
		score: 6,
		re: /\b(\d{2,3})\s*dB\b/i,
		say: (e) => `It runs at ${e[1]} decibels.`
	},
	{
		tag: "extract",
		score: 7,
		re: /\b(\d{1,3}(?:\.\d)?)\s*(?:L|litre|liter)s?\s*(?:\/|per\s*)\s*day\b/i,
		say: (e) => `It pulls up to ${e[1]} litres of moisture out of the air a day.`
	},
	{
		tag: "capacity",
		score: 7,
		re: /\b(\d{2,4})\s*(?:L|litre|liter)s?\b(?!\s*(?:\/|per)\s*day)/i,
		say: (e, t) => t.family === "tools" ? `It's got a ${e[1]} litre tank.` : /dehumidifier|purifier/.test(t.noun) ? /tank|bucket|reservoir/i.test(e.input || "") ? `The water tank holds ${e[1]} litres.` : null : `There's ${e[1]} litres of room inside.`
	},
	{
		tag: "bottles",
		score: 7,
		re: /\b(\d{1,3})\s*bottles?\b/i,
		say: (e) => `It holds up to ${e[1]} bottles.`
	},
	{
		tag: "zones",
		score: 5,
		re: /\bdual[- ]zone\b/i,
		say: () => "It has two separate zones, so you can keep two temperatures at once."
	},
	{
		tag: "shelves",
		score: 5,
		re: /\badjustable\s+shelv(es|ing)\b/i,
		say: () => "The shelves are adjustable, so taller things still fit."
	},
	{
		tag: "display",
		score: 4,
		re: /\b(LED|LCD|digital)\s+(?:temperature\s+)?display\b/i,
		say: (e) => /digital/i.test(e[1]) ? "There's a digital display on the front." : `There's an ${e[1].toUpperCase()} display on the front.`
	},
	{
		tag: "wheels",
		score: 4,
		re: /\b(castors?|caster wheels?|wheels for easy|transport wheels?|wheels and handle)\b/i,
		say: () => "It's on wheels, so moving it about is easy."
	},
	{
		tag: "remote",
		score: 4,
		re: /\bremote control\b/i,
		say: () => "It comes with a remote."
	},
	{
		tag: "app",
		score: 5,
		re: /\b(wi-?fi|smart app|app control|control(?:led)? (?:from|via|by|with)[^.]{0,20}app)\b/i,
		say: () => "You can control it from your phone."
	},
	{
		tag: "timer",
		score: 3,
		re: /\b(\d{1,2})[- ]hour timer\b|\bbuilt[- ]in timer\b|\btimer function\b/i,
		say: (e) => e[1] ? `There's a ${e[1]}-hour timer.` : "There's a timer built in."
	},
	{
		tag: "oilfree",
		score: 5,
		re: /\boil[- ]free\b/i,
		say: () => "The motor's oil-free, so there's no oil to top up."
	},
	{
		tag: "airflow",
		score: 5,
		re: /\b(\d+(?:\.\d+)?)\s*CFM\b/i,
		say: (e) => `It delivers ${e[1]} CFM of air.`
	},
	{
		tag: "psi",
		score: 5,
		re: /\b(\d{2,4})\s*PSI\b/i,
		say: (e) => `It runs up to ${e[1]} PSI.`
	},
	{
		tag: "burners",
		score: 5,
		re: /\b(\d)\s*burners?\b/i,
		say: (e) => `It's got ${d(e[1])} burners.`
	},
	{
		tag: "defrost",
		score: 4,
		re: /\bauto(?:matic)?[- ]defrost\b/i,
		say: () => "It defrosts itself, so there is no chipping ice out."
	},
	{
		tag: "filter",
		score: 4,
		re: /\bwashable\s+filters?\b/i,
		say: () => "The filter washes out and goes back in."
	},
	{
		tag: "bluetooth",
		score: 3,
		re: /\bbluetooth\b/i,
		say: () => "It connects over Bluetooth."
	},
	{
		tag: "volts",
		score: 3,
		re: /\b(6|12|24)\s*V\b(?![a-z])/i,
		say: (e, t) => ["kids", "tools"].includes(t.family) ? `It runs on a ${e[1]} volt battery.` : null
	},
	{
		tag: "resistance",
		score: 6,
		re: /\b(\d{1,2})\s*levels?\s+of\s+[^.]{0,30}resistance\b|\b(\d{1,2})\s+resistance\s+levels?\b/i,
		say: (e) => `There are ${d(e[1] || e[2])} resistance levels to work through.`
	},
	{
		tag: "programs",
		score: 5,
		re: /\b(\d{1,2})\s+(?:automated\s+|training\s+)+programs?\b/i,
		say: (e) => `There are ${d(e[1])} training programs built in.`
	},
	{
		tag: "zone-support",
		score: 6,
		re: /\b(\d)[- ]zone\b[^.]{0,30}(support|comfort)/i,
		say: (e) => `It's built with ${d(e[1])} support zones down the mattress.`
	},
	{
		tag: "edge",
		score: 5,
		re: /\b(reinforced|reduced|enhanced)?\s*edge\s+(support|stability)\b/i,
		say: () => "The edges are reinforced, so you can sit right on the side."
	},
	{
		tag: "motion",
		score: 6,
		re: /\breduced motion transfer\b|\bmotion transfer\b[^.]{0,20}\breduc/i,
		say: () => "It cuts down motion transfer, so you're less likely to feel someone else turn over."
	},
	{
		tag: "breathable",
		score: 3,
		re: /\bbreathable\b[^.]{0,30}(fabric|cover|knit)/i,
		say: () => "The cover's breathable, so it doesn't sleep hot."
	},
	{
		tag: "dogsize",
		score: 6,
		re: /\bsuitable for dogs up to\s*(\d{1,3})\s*kgs?\b/i,
		say: (e) => `It suits dogs up to ${e[1]} kilos.`
	},
	{
		tag: "raised",
		score: 5,
		re: /\belevated floor\b|\braised floor\b/i,
		say: () => "The floor sits up off the ground, so it stays drier."
	},
	{
		tag: "roof",
		score: 4,
		re: /\basphalt roof\b/i,
		say: () => "The roof is asphalt, so the rain runs straight off."
	}
], D = /\b(vacuum[- ]packed|packaging|expan(d|sion)|allow \d+|instruction|manual|x\s?\d+\b|\d+\s?x\b|package|warranty|certified|suitable for|use\b.*,|colou?r|grey|gray|black|white|pink|green|blue|red|beige|charcoal|navy|cream|brown|premium|high[- ]quality|material|fabric|polyester|corduroy|suede|plastic|stainless|steel)\b/i, O = /\b(energy[- ]efficien\w*|energy[- ]saving|eco[- ]friendly|environmentally friendly|groundbreaking|revolutionary|significant impact|state of the art|cutting[- ]edge|unparalleled|ultimate|perfect for every|amazing|incredible|elevate|seamless|effortless(ly)?)\b/i;
function k(e, t, n = !0) {
	let r = h(String(e).replace(/[✀-➿←-⇿⬀-⯿️•▪●★✔✅❌]/g, "").replace(/\s+/g, " ").trim());
	if (!r) return null;
	for (let e of E) {
		if (e.tag === "fold" && ![
			"seat",
			"bed",
			"outdoor",
			"sport"
		].includes(t.family) && !/desk|table|shelf/.test(t.noun) || e.tag === "wash" && /cover/.test(t.noun)) continue;
		let n = r.match(e.re);
		if (n) {
			let r = e.say(n, t);
			if (r) return {
				text: r,
				tag: e.tag,
				score: e.score
			};
			continue;
		}
	}
	if (!n || D.test(r) || O.test(r)) return null;
	let i = r.replace(/[.!]$/, "").split(/\s+/);
	if (i.length >= 2 && i.length <= 5 && !/\d/.test(r) && !/^(it|this|the|you|and|or|for|to)\b/i.test(r)) {
		let e = p(r.replace(/[.!]$/, ""));
		if (/[A-Z]/.test(e.slice(1)) || /[&/]/.test(e) || /^(no|zero|fast|super|ultra|mega|smart|easy|instant|pure|true)\b/i.test(e)) return null;
		let t = /s$/.test(i[i.length - 1]) && !/ss$/.test(i[i.length - 1]), n = /\b(removal|control|protection|insulation|storage|cooling|heating|filtration|ventilation|efficiency|capacity|performance|comfort|support|coverage|airflow|suction|power|drainage|operation)$/i.test(e);
		return {
			text: `It's got ${t || n ? "" : /^[aeiou]/i.test(e) ? "an " : "a "}${e}.`,
			tag: `np:${i[i.length - 1].toLowerCase()}`,
			score: 1
		};
	}
	return null;
}
function ee(e, t, n) {
	let r = h(String(e).trim());
	if (!r || O.test(r) || D.test(r) || /\?$/.test(r)) return null;
	let i = r.split(/\s+/);
	if (i.length < 5 || i.length > 14 || (r.match(/,/g) || []).length > 1) return null;
	let a = String(t.title).toLowerCase().split(/\s+/), o = r.toLowerCase();
	for (let e = 0; e + 2 < a.length; e++) if (o.includes(a.slice(e, e + 3).join(" "))) return null;
	return x(t) && o.includes(x(t).toLowerCase()) || !/\b(you|your|it|keeps|lets|means|makes|gives|helps)\b/i.test(r) || /\b(our|we|us)\b/i.test(r) || !/\b(is|are|was|has|have|can|comes?|keeps?|lets?|means?|makes?|gives?|helps?|works?|folds?|holds?|fits?|adjusts?|runs?|goes|sits?|stays?|adds?|takes?|doubles?|stores?|charges?|heats?|cools?)\b/i.test(r) || /^(take|start|enjoy|experience|discover|transform|upgrade|elevate|indulge|imagine|treat|meet)\b/i.test(r) || (r.replace(/^\S+\s*/, "").match(/\b[A-Z][a-z]+/g) || []).length >= 2 ? null : (/^(makes|keeps|lets|gives|helps|holds|fits|works|stays|adds)\b/i.test(r) && (r = `It ${p(r)}`), {
		text: /[.!?]$/.test(r) ? r : `${r}.`,
		tag: `prose:${i[0].toLowerCase()}`,
		score: 2
	});
}
function A(e, t) {
	let n = w(e), r = [], i = /* @__PURE__ */ new Set(), a = (e) => {
		e && !i.has(e.tag) && !r.some((t) => t.text === e.text) && (i.add(e.tag), r.push(e));
	};
	for (let e of n.bullets) a(k(e, t));
	for (let e of n.prose) {
		let n = k(e, t, !1);
		n && n.score > 1 && a(n);
	}
	if (r.filter((e) => e.score > 1).length < 2) for (let r of n.prose) a(ee(r, e, t));
	return {
		list: r.sort((e, t) => t.score - e.score).slice(0, 4),
		copy: n
	};
}
var te = /\b(introducing|this product features|this product|here is the solution|here'?s the fix|the solution is|features include|boasts|comes equipped|is equipped with|ideal for|perfect for|high[- ]quality|premium|state[- ]of[- ]the[- ]art|meet the|sorted\.)\b/i;
function j(e, t) {
	let n = String(e || "").trim();
	if (!n || n.split(/\s+/).length > 22 || /[:;|()[\]{}\/\\#*_=<>]/.test(n) || /\d+\s*(x|×)\s*\d+/i.test(n) || (n.match(/\d+(\.\d+)?/g) || []).length > 2 || te.test(n) || O.test(n) || /\b(\w+)\s+\1\b/i.test(n) || /\b[A-Z]{2,}\b/.test(n.replace(/\b(UPF|LED|USB|UV|TV|HD|4K|BBQ)\b/g, ""))) return !1;
	if (t) {
		let e = String(t.title).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean), r = n.toLowerCase().replace(/[^a-z0-9 ]/g, " ");
		for (let t = 0; t + 3 < e.length; t++) if (r.includes(e.slice(t, t + 4).join(" "))) return !1;
	}
	return !0;
}
function ne(e, t, n) {
	let r = t.noun, i = /\b(kids?|toddler|children)\b/i.test(e.title), a = t.family, o = [];
	return a === "seat" ? (n.adjust && o.push("Need somewhere to kick back that you can actually adjust to suit you?"), (n.store || n.fold) && o.push("Need somewhere to kick back that doesn't take up half the room?"), i ? o.push("Want a comfy little spot that's just for the kids?", "Need somewhere comfy for the little ones to chill out?") : o.push("Need a comfy spot to put your feet up?", "Want a proper spot to kick back after a long day?")) : a === "cushion" ? o.push("Spend most of the day sitting down?", "Is your chair getting uncomfortable by the afternoon?") : a === "bed" ? o.push("Not sleeping as well as you'd like?", "Reckon it's time your bed got an upgrade?") : a === "clean" ? /vacuum/.test(r) ? (n.cordless && o.push("Still dragging the big vacuum out just to clean one little mess?", "Still wrestling with a vacuum cord?"), n.battery && o.push("Want a vacuum that won't give up halfway through the house?"), o.push("Sick of lugging a heavy vacuum around the house?")) : o.push("Want cleaning to be a bit less of a chore?", "Looking for an easier way to keep things clean?") : a === "outdoor" ? o.push("Heading to the beach this summer?", "Want a bit of proper shade when you head out?") : a === "garden" ? o.push("Want to give the garden a bit of life?", "Okay, this is actually pretty handy if you've got a backyard.") : a === "pet" ? o.push(/dog/i.test(e.title) ? "Want something a bit special for your dog?" : "Got a pet that deserves a treat?") : a === "kitchen" ? (/bar fridge/.test(r) ? o.push("Sick of the main fridge being packed with drinks?", "Want cold drinks right where you actually sit?") : /wine fridge/.test(r) ? o.push("Running out of spots to keep the wine cold?") : /cooktop|cooker/.test(r) ? o.push("Is the old cooktop on its last legs?", "Kitchen getting a bit of a refresh?") : /ice maker/.test(r) && o.push("Always running out of ice?"), o.push(/timer/.test(r) ? "Always losing track of time in the kitchen?" : "Want one less thing to think about in the kitchen?")) : a === "home" && /dehumidifier/.test(r) ? o.push("Is the house feeling a bit damp lately?", "Clothes taking forever to dry inside?") : a === "home" && /air conditioner/.test(r) ? o.push("Room getting too hot to sleep?", "Need to cool down a room without a split system?") : a === "tools" ? o.push(/compressor/.test(r) ? "Still pumping tyres up with a hand pump?" : "Always got a job on around the house?", "Handy on the tools on the weekend?") : a === "kids" ? o.push("Want something that gets the kids outside?", "After a gift the kids will actually use?") : a === "light" ? o.push(/head/.test(r) ? "Need both hands free when it gets dark?" : "Need a bit more light where it counts?") : a === "beauty" ? o.push("Doing your nails at home?", "Want salon-style nails without leaving the house?") : a === "jewellery" ? o.push("Looking for a little something special?", "After a gift that feels a bit different?") : a === "sport" && o.push("Getting serious about your training?", "Want gear that keeps up with you?"), t.known ? o.push(t.plural ? `Been after some new ${r}?` : `Been after a new ${r}?`, `Okay, this ${t.plural ? "is" : "one is"} actually pretty handy.`) : o.push("Found something pretty handy for around the home.", "Here's one worth a look."), o;
}
function re(e) {
	let t = b(e), n = ne(e, t, Object.fromEntries(A(e, t).list.map((e) => [e.tag, !0]))).filter((t) => j(t, e) && t.split(/\s+/).length <= 14);
	return Math.random() < .7 ? n[0] : c(n);
}
var ie = [
	`There are a few options available, so check the full details at ${l}.`,
	`Have a look at ${l} for the available options and full specifications.`,
	`There's more than one option, so pick the right one at ${l}.`
], ae = [
	`Want to check the sizing and specs? You'll find everything on the product page at ${l}.`,
	`Check ${l} to make sure the size and options are right for you.`,
	`Check the sizing and full specs on the product page at ${l}.`
], oe = [
	`Want the full specs? They're all on the product page at ${l}.`,
	`You'll find the full details and specs at ${l}.`,
	`Check out the full details at ${l}.`,
	`For all the details, have a look at ${l}.`
], se = [
	`Check it out at ${l}.`,
	`Grab yours at ${l}.`,
	`Find it at ${l}.`,
	`Have a look at ${l}.`
];
function ce(e, { hook: t = null } = {}) {
	let n = /* @__PURE__ */ new Set(), r = b(e), i = S(e, r), { list: a, copy: o } = A(e, r), s = c(r.known ? [
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
	let f = e.priceCents && e.availability !== "out_of_stock" && e.availability !== "discontinued" ? c(r.plural ? [`They're ${m(e.priceCents)}.`, `You can grab them for ${m(e.priceCents)}.`] : [
		`This one's ${m(e.priceCents)}.`,
		`It's ${m(e.priceCents)}.`,
		`You can grab it for ${m(e.priceCents)}.`
	], n) : null, p = typeof e.stockQuantity == "number" && e.stockQuantity > 0 && e.stockQuantity <= 5 ? `There are only ${d(e.stockQuantity)} left.` : null, h = `${e.title} ${e.description}`, g = (o.hasOptions ? c(/\b(sizes?|sizing|dimensions?)\b/i.test(h) ? ae : /\b(colou?rs? (available|to choose)|variants?|options? available|available in)\b/i.test(h) ? ie : oe, n) : null) || c(se, n), _ = [
		s,
		...l,
		f,
		p,
		g
	].filter(Boolean).filter((t) => j(t, e) || t === g), v = new Set(String(t || "").toLowerCase().match(/[a-z]{5,}/g) || []);
	return _.filter((e, t) => {
		if (t === 0 || e === g || e === f || e === p) return !0;
		let n = e.toLowerCase().match(/[a-z]{5,}/g) || [];
		return !n.length || !n.every((e) => v.has(e));
	}).join(" ").replace(/\s{2,}/g, " ").trim();
}
var le = [
	[
		"First up,",
		"Next,",
		"Then there's",
		"And finally,"
	],
	[
		"Start with",
		"Then",
		"There's also",
		"And"
	],
	[
		"First,",
		"Second,",
		"Third,",
		"Last one,"
	]
], M = (e) => String(e || "").replace(/&/g, "and").replace(/\s+/g, " ").trim().toLowerCase();
function ue(e, { categoryName: t }) {
	let n = /* @__PURE__ */ new Set(), r = e.filter((e) => {
		let t = y(e.title).toLowerCase().split(/\s+/).slice(0, 5).join(" ");
		return !n.has(t) && (n.add(t), !0);
	}).slice(0, 4), i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), o = r.length, s = M(t), u = c([
		`Shopping for ${s}? Here are ${d(o)} worth a look.`,
		`Need new ${s}? These ${d(o)} are worth a look.`,
		`${f(d(o))} ${s} we'd pick this week.`,
		`Looking at ${s}? Start with these ${d(o)}.`
	], i), p = c(le, i), h = [], g = [];
	r.forEach((e, t) => {
		let n = b(e), r = S(e, n).replace(/^(this|these) /, ""), i = A(e, n).list.map((e) => e.text).find((t) => j(t, e) && !a.has(t)) || null;
		i && a.add(i);
		let o = e.priceCents ? m(e.priceCents) : null, s = p[Math.min(t, p.length - 1)];
		g.push(`${s} this ${r}${o ? ` at ${o}` : ""}.`), i && g.push(i.replace(/,\s*(too|either)\.$/, ".")), h.push({
			name: y(e.title).split(/\s+/).slice(0, 5).join(" "),
			price: e.priceLabel || o,
			benefit: i,
			intro: g[g.length - (i ? 2 : 1)]
		});
	});
	let _ = c([
		`See the whole range at ${l}.`,
		`There's plenty more in the range at ${l}.`,
		`Have a look at the full range at ${l}.`
	], i);
	return {
		hook: u,
		script: [...g.filter((e) => j(e) || /\$\d/.test(e)), _].join(" "),
		items: h,
		cards: r
	};
}
var de = (e) => `#${String(e).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "")}`;
function fe(e, { categoryName: t, linkUrl: n }) {
	let r = [
		e.hook,
		...e.items.map((e) => `• ${e.name}${e.price ? ` — ${e.price}` : ""}`),
		`See the whole range at ${l}`,
		n
	], i = [.../* @__PURE__ */ new Set([
		"#placiddeals",
		"#australia",
		de(t),
		"#homedecor",
		"#homeinspo"
	])].slice(0, 6);
	return {
		caption: `${r.join("\n")}\n\n${i.join(" ")}`,
		hashtags: i
	};
}
function pe(e, { linkUrl: t }) {
	let n = [
		e.hook,
		N.owned,
		N.delivery,
		N.payLater,
		`Shop at ${l}`,
		t
	], r = [
		"#placiddeals",
		"#australia",
		"#australianowned",
		"#shoponline",
		"#homeinspo"
	];
	return {
		caption: `${n.join("\n")}\n\n${r.join(" ")}`,
		hashtags: r
	};
}
var N = {
	owned: "Placid Deals is Australian owned and operated.",
	what: "Everything for the home, delivered.",
	delivery: "You'll see the delivery cost for your postcode before you pay.",
	payLater: "Afterpay and Zip are there at checkout.",
	checked: "Stock and delivery get checked again before you pay, so there are no surprises.",
	returns: "And if something's not right, there's a returns policy."
}, me = {
	"outdoor and camping": "camping gear",
	"home and garden": "homewares",
	"sports and fitness": "fitness gear",
	"baby and kids": "kids' stuff",
	"health and beauty": "beauty",
	"audio, video and photography": "tech",
	"audio video and photography": "tech",
	"car and auto": "car gear",
	"party and occasions": "party supplies",
	"gifts and novelty": "gifts",
	"commercial and hospitality": "hospitality gear"
}, he = (e) => me[M(e)] || M(e);
function ge({ departments: e = [] } = {}) {
	let t = /* @__PURE__ */ new Set(), n = c([
		"Ever bought something online and got stung on delivery at the end?",
		"Want the delivery cost before you get to the checkout?",
		"Here's where to get everything for the home.",
		"Heard of Placid Deals?"
	], t), r = e.length >= 3 ? `There's ${e.slice(0, 3).map(he).join(", ").replace(/, ([^,]*)$/, " and $1")}, and plenty more.` : null, i = c([
		[
			N.delivery,
			N.payLater,
			N.checked
		],
		[
			N.payLater,
			N.delivery,
			N.returns
		],
		[
			N.delivery,
			N.checked,
			N.payLater
		]
	], t), a = c([
		`Have a look at ${l}.`,
		`It's all at ${l}.`,
		`Find us at ${l}.`
	], t);
	return {
		hook: n,
		script: [
			N.owned,
			N.what,
			r,
			...i,
			a
		].filter(Boolean).join(" ")
	};
}
function _e(e) {
	let t = b(e), { list: n } = A(e, t), r = n.filter((t) => j(t.text, e)), i = [];
	return t.known || i.push("can't tell what the product is from its title"), r.length < 2 && i.push(`only ${r.length} sayable benefit${r.length === 1 ? "" : "s"} in the product copy (need 2)`), e.priceCents || i.push("no current price"), {
		ok: !i.length,
		noun: t.noun,
		family: t.family,
		benefits: r.map((e) => e.text),
		reasons: i
	};
}
function P(e, t, { trendTerms: n = [] } = {}) {
	let r = b(e), i = [
		t,
		A(e, r).list.map((e) => e.text).find((t) => j(t, e)) || null,
		e.priceCents && e.availability !== "out_of_stock" && e.availability !== "discontinued" ? `${m(e.priceCents)} at ${l}` : `Have a look at ${l}`,
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
		tools: ["diy", "tools"],
		kids: ["kids", "parenting"],
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
function F(e, t) {
	let n = String(e || "").trim(), r = String(t || "").trim();
	return ve(!n || r.startsWith(n) ? r : `${n}${/[.!?]$/.test(n) ? "" : "."} ${r}`);
}
function ve(e) {
	return String(e || "").replace(/\bplaciddeals\.com\b/gi, "Placid Deals dot com").replace(/\s{2,}/g, " ").trim();
}
//#endregion
//#region src/reel.js
var I = "\"Segoe UI\", system-ui, -apple-system, Helvetica, sans-serif";
async function L(e, t = 44100) {
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
function R(e, t, n = .45) {
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
function z(e, t) {
	let { samples: n, rate: r } = t, i = n.length / r, a = Math.floor(r * .03), o = [];
	for (let e = 0; e < n.length; e += a) {
		let t = 0;
		for (let r = e; r < Math.min(n.length, e + a); r++) t += n[r] * n[r];
		o.push(Math.sqrt(t / a));
	}
	let s = ([...o].sort((e, t) => e - t)[Math.floor(o.length * .95)] || 1) * .06, c = [], l = null;
	o.forEach((e, t) => {
		e < s ? l === null && (l = t) : (l !== null && (t - l) * .03 > .18 && c.push((l + t) / 2 * .03), l = null);
	}), e = ye(e);
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
function ye(e) {
	return String(e || "").replace(/\bplacid\s+deals\s+dot\s+com\b/gi, "placiddeals.com").replace(/\b([a-z0-9-]+)\s+dot\s+(com|com\.au|net|org|co)\b/gi, (e, t, n) => `${t}.${n}`).replace(/\s{2,}/g, " ").trim();
}
function B(e, t, n, r, i, a) {
	e.beginPath(), e.roundRect(t, n, r, i, a);
}
function V(e, t, n, r, i, a = 3) {
	let o = i;
	for (; o > i * .55; o -= 2) {
		e.font = `${r} ${o}px ${I}`;
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
	return e.font = `${r} ${o}px ${I}`, {
		fs: o,
		lines: [t]
	};
}
function H(e, t, n, r, i) {
	if (i <= 0) return;
	e.save(), e.globalAlpha = i;
	let a = t * .07, { fs: o, lines: s } = V(e, r.toUpperCase(), t - a * 2, 800, Math.round(t * .095), 3), c = o * 1.15, l = s.length * c + a * .8, u = n * .175;
	e.fillStyle = "rgba(0,0,0,.55)", B(e, a * .5, u - a * .4, t - a, l, t * .035), e.fill(), e.textBaseline = "top", e.textAlign = "center", s.forEach((n, r) => {
		e.fillStyle = "#fff", e.strokeStyle = "rgba(0,0,0,.65)", e.lineWidth = o * .14, e.lineJoin = "round", e.strokeText(n, t / 2, u + r * c), e.fillText(n, t / 2, u + r * c);
	}), e.restore();
}
function U(e, t, n, r) {
	if (!r) return;
	e.save();
	let { fs: i, lines: a } = V(e, r, t - t * .08 * 2, 700, Math.round(t * .062), 2), o = i * 1.2, s = n * .7;
	e.textAlign = "center", e.textBaseline = "top";
	for (let n of a) e.strokeStyle = "rgba(0,0,0,.8)", e.lineWidth = i * .18, e.lineJoin = "round", e.strokeText(n, t / 2, s), e.fillStyle = "#fff", e.fillText(n, t / 2, s), s += o;
	e.restore();
}
var W = {
	deep: "#1E0733",
	deep2: "#2C0B4E",
	violet: "#8B5CF6",
	light: "#A78BFA",
	ink: "#ffffff"
};
function G(e, t, n, r) {
	e.save(), e.translate(t, n);
	let i = r / 64;
	e.scale(i, i);
	let a = e.createLinearGradient(0, 0, 64, 64);
	a.addColorStop(0, W.light), a.addColorStop(1, W.violet), e.fillStyle = a, e.beginPath(), e.moveTo(14, 8), e.lineTo(34, 8), e.arc(34, 32, 24, -Math.PI / 2, Math.PI / 2), e.lineTo(14, 56), e.closePath(), e.fill(), e.globalCompositeOperation = "destination-out", e.beginPath(), e.moveTo(26, 20), e.lineTo(34, 20), e.arc(34, 32, 12, -Math.PI / 2, Math.PI / 2), e.lineTo(26, 44), e.closePath(), e.fill(), e.globalCompositeOperation = "source-over", e.fillStyle = a, e.beginPath(), e.moveTo(20, 46), e.lineTo(20, 26), e.lineTo(34, 12), e.lineTo(44, 22), e.lineTo(30, 36), e.lineTo(30, 46), e.closePath(), e.fill(), e.fillStyle = W.deep, e.beginPath(), e.arc(35, 21, 2.6, 0, Math.PI * 2), e.fill(), e.restore();
}
function be(e, t, n, r, i = !1) {
	e.save(), e.textBaseline = "top", e.textAlign = i ? "center" : "left", e.font = `700 ${r}px ${I}`, e.fillStyle = W.ink, e.letterSpacing = `${r * .16}px`, e.fillText("PLACID", t, n);
	let a = e.measureText("PLACID").width, o = n + r * 1.12;
	e.font = `600 ${r * .6}px ${I}`, e.fillStyle = W.light, e.letterSpacing = `${r * .26}px`, e.fillText("DEALS", t, o);
	let s = e.measureText("DEALS").width;
	e.letterSpacing = "0px";
	let c = o + r * .3, l = r * .22, u = r * .5, d = i ? t - s / 2 : t;
	return e.strokeStyle = W.violet, e.lineWidth = Math.max(1, r * .06), e.beginPath(), e.moveTo(d - l - u, c), e.lineTo(d - l, c), e.moveTo(d + s + l, c), e.lineTo(d + s + l + u, c), e.stroke(), e.restore(), a;
}
function K(e, t, n, { logo: r, host: i, price: a }) {
	let o = n * .105, s = n * .095;
	e.save();
	let c = e.createLinearGradient(0, 0, t, o);
	c.addColorStop(0, W.deep), c.addColorStop(1, W.deep2), e.fillStyle = c, e.fillRect(0, 0, t, o), e.fillStyle = W.deep, e.fillRect(0, n - s, t, s), e.strokeStyle = W.violet, e.lineWidth = Math.max(2, t * .006), e.beginPath(), e.moveTo(0, o), e.lineTo(t, o), e.moveTo(0, n - s), e.lineTo(t, n - s), e.stroke(), e.strokeRect(e.lineWidth / 2, e.lineWidth / 2, t - e.lineWidth, n - e.lineWidth);
	let l = t * .05, u = o * .52;
	if (r) {
		let t = u * 1.25, n = t * (r.width / r.height);
		e.drawImage(r, l, (o - t) / 2, n, t);
	} else {
		G(e, l, (o - u) / 2, u);
		let t = u * .42;
		e.save(), e.textBaseline = "middle", e.textAlign = "left", e.font = `700 ${t}px ${I}`, e.letterSpacing = `${t * .16}px`, e.fillStyle = W.ink;
		let n = l + u * 1.3;
		e.fillText("PLACID", n, o / 2);
		let r = e.measureText("PLACID").width + t * .5;
		e.fillStyle = W.light, e.fillText("DEALS", n + r, o / 2), e.letterSpacing = "0px", e.restore();
	}
	if (a) {
		let n = Math.round(t * .055);
		e.font = `800 ${n}px ${I}`;
		let r = e.measureText(a).width + n * 1.1, i = n * 1.5, s = t - r - l, c = (o - i) / 2;
		e.fillStyle = W.violet, B(e, s, c, r, i, i / 2), e.fill(), e.fillStyle = W.ink, e.textAlign = "center", e.textBaseline = "middle", e.fillText(a, s + r / 2, c + i / 2 + 1);
	}
	e.font = `700 ${Math.round(t * .045)}px ${I}`, e.fillStyle = W.ink, e.textAlign = "center", e.textBaseline = "middle", e.fillText(i, t / 2, n - s / 2), e.restore();
}
function q(e, t, n, { title: r, host: i, price: a, logo: o, payments: s }, c) {
	if (c <= 0) return;
	e.save(), e.globalAlpha = c, e.fillStyle = "rgba(30,7,51,.93)", e.fillRect(0, 0, t, n);
	let l = t * .09;
	e.textAlign = "center";
	let u = V(e, r, t - l * 2, 800, Math.round(t * .085), 3);
	e.textBaseline = "top";
	let d = n * .3;
	if (e.fillStyle = "#fff", u.lines.forEach((n, r) => e.fillText(n, t / 2, d + r * u.fs * 1.15)), d += u.lines.length * u.fs * 1.15 + n * .02, a && (e.font = `800 ${Math.round(t * .11)}px ${I}`, e.fillStyle = W.light, e.fillText(a, t / 2, d), d += t * .15), e.font = `700 ${Math.round(t * .058)}px ${I}`, e.fillStyle = "#fff", e.fillText(i, t / 2, d), d += t * .085, e.font = `600 ${Math.round(t * .042)}px ${I}`, e.fillStyle = "#9aa1ad", e.fillText("Link in bio", t / 2, d), s && (d += t * .075, e.font = `600 ${Math.round(t * .038)}px ${I}`, e.fillStyle = "#5eead4", e.fillText(s, t / 2, d)), o) {
		let r = t * .34, i = r * (o.height / o.width);
		e.drawImage(o, (t - r) / 2, n * .12, r, i);
	} else {
		let r = t * .2;
		G(e, (t - r) / 2, n * .09, r), be(e, t / 2, n * .09 + r * 1.25, t * .062, !0);
	}
	e.restore();
}
function xe({ hook: e, cues: t, price: n, title: r, host: i, seconds: a, logo: o = null, payments: s = null }) {
	let c = Math.max(a - 2.2, a * .82);
	return (a, l) => {
		let u = a.canvas.width, d = a.canvas.height;
		l < c && K(a, u, d, {
			logo: o,
			host: i,
			price: n
		}), H(a, u, d, e, l < 2 ? Math.min(1, l / .25) : Math.max(0, 1 - (l - 2) / .6));
		let f = t.find((e) => l >= e.t0 && l < e.t1);
		l > 2.4 && U(a, u, d, f?.text), q(a, u, d, {
			title: r,
			host: i,
			price: n,
			logo: o,
			payments: s
		}, l > c ? Math.min(1, (l - c) / .5) : 0);
	};
}
function Se({ hook: e, cues: t, items: n, shotItem: r, host: i, seconds: a, title: o, logo: s = null, payments: c = null }) {
	let l = Math.max(a - 2.4, a * .84);
	return (a, u, d) => {
		let f = a.canvas.width, p = a.canvas.height, m = r[Math.min(d ?? 0, r.length - 1)] ?? 0, h = n[m] || {};
		u < l && (K(a, f, p, {
			logo: s,
			host: i,
			price: h.price || null
		}), u > 2.4 && h.name && Ce(a, f, p, n.length > 1 ? `${m + 1} of ${n.length} · ${h.name}` : h.name)), H(a, f, p, e, u < 2 ? Math.min(1, u / .25) : Math.max(0, 1 - (u - 2) / .6));
		let g = t.find((e) => u >= e.t0 && u < e.t1);
		u > 2.4 && U(a, f, p, g?.text), q(a, f, p, {
			title: o,
			host: i,
			price: null,
			logo: s,
			payments: c
		}, u > l ? Math.min(1, (u - l) / .5) : 0);
	};
}
function Ce(e, t, n, r) {
	e.save();
	let i = Math.round(t * .04);
	e.font = `700 ${i}px ${I}`;
	let a = r;
	for (; e.measureText(a).width > t * .84 && a.length > 12;) a = `${a.slice(0, -2).trimEnd()}…`;
	let o = e.measureText(a).width + i * 1.2, s = i * 1.7, c = (t - o) / 2, l = n * .125;
	e.fillStyle = "rgba(30,7,51,.82)", B(e, c, l, o, s, s / 2), e.fill(), e.strokeStyle = W.violet, e.lineWidth = 2, e.stroke(), e.fillStyle = W.ink, e.textAlign = "center", e.textBaseline = "middle", e.fillText(a, t / 2, l + s / 2 + 1), e.restore();
}
//#endregion
//#region src/store.js
function J(e, t) {
	let n = /* @__PURE__ */ new ArrayBuffer(44 + e.length * 2), r = new DataView(n), i = (e, t) => [...t].forEach((t, n) => r.setUint8(e + n, t.charCodeAt(0)));
	i(0, "RIFF"), r.setUint32(4, 36 + e.length * 2, !0), i(8, "WAVE"), i(12, "fmt "), r.setUint32(16, 16, !0), r.setUint16(20, 1, !0), r.setUint16(22, 1, !0), r.setUint32(24, t, !0), r.setUint32(28, t * 2, !0), r.setUint16(32, 2, !0), r.setUint16(34, 16, !0), i(36, "data"), r.setUint32(40, e.length * 2, !0);
	for (let t = 0; t < e.length; t++) r.setInt16(44 + t * 2, Math.max(-1, Math.min(1, e[t])) * 32767, !0);
	return new Blob([n], { type: "audio/wav" });
}
//#endregion
//#region src/gen.worker.js?worker&url
var we = new URL("assets/gen.worker-ptNQZks0.js", import.meta.url).href, Te = new URL("assets/tts.worker-DlZWSiBg.js", import.meta.url).href;
//#endregion
//#region src/engine.js
function Y(e) {
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
function X(e) {
	if (e.origin === self.location.origin) return new Worker(e, { type: "module" });
	let t = new Blob([`import ${JSON.stringify(e.href)};`], { type: "text/javascript" });
	return new Worker(URL.createObjectURL(t), { type: "module" });
}
var Ee = null, De = null, Z = () => Ee ??= Y(X(new URL(we, import.meta.url))), Oe = () => De ??= Y(X(new URL(Te, import.meta.url)));
function Q(e) {
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
async function ke(e, { base: t = null, onProgress: n } = {}) {
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
var Ae = [
	"push",
	"orbit",
	"pan",
	"pull",
	"crane",
	"drift"
];
async function $({ card: e, photos: t, hook: n, script: r, voice: i, music: a, logo: o, payments: s, onProgress: c }) {
	let l = Q(c), u = F(n, r);
	c?.("Recording the voiceover…", null);
	let d = await Oe()({
		text: u,
		voice: i,
		speed: 1
	}, l), f = {
		samples: d.samples,
		rate: d.rate,
		text: u
	}, p = f.samples.length / f.rate + 2.6, m = null;
	(a === "auto" || a === "quiet") && (c?.("Writing the music…", null), m = await L(p, f.rate));
	let h = R(f, m, a === "quiet" ? .22 : .45), g = xe({
		hook: n,
		cues: z(u, f),
		price: e.priceLabel,
		title: e.title,
		host: new URL(e.url).host,
		seconds: p,
		logo: o ? await createImageBitmap(o) : null,
		payments: s
	}), _ = [...Ae].sort(() => Math.random() - .5), v = [t[0], ...t.slice(1).sort(() => Math.random() - .5)], y = [];
	for (let [e, t] of v.entries()) c?.(`Reading the depth of photo ${e + 1} of ${v.length}…`, null), y.push({
		image: await createImageBitmap(t),
		depth: await Z()({
			op: "depth",
			blob: t
		}, l),
		motion: _[e % _.length]
	});
	return {
		track: h,
		overlay: g,
		shots: y,
		seconds: p
	};
}
async function je({ card: e, photos: t, hook: n, script: r, voice: i = "bf_emma", music: a = "auto", logo: s = null, payments: c = !0, canvas: l, onProgress: u, trendTerms: d = [] }) {
	let { track: f, overlay: p, shots: m, seconds: h } = await $({
		card: e,
		photos: t,
		hook: n,
		script: r,
		voice: i,
		music: a,
		logo: s,
		payments: c,
		onProgress: u
	}), g = new o(l);
	g.setFrame("vertical", null);
	let _ = await g.record(m, {
		intensity: 1,
		grain: .03,
		onFrame: p
	}, h, f, (e) => u?.("Recording — keep this tab open", e)), v = P(e, n, { trendTerms: d });
	return {
		video: _,
		caption: v.caption,
		hashtags: v.hashtags,
		hook: n,
		script: r,
		seconds: h
	};
}
async function Me({ items: e, copyItems: t, hook: n, script: r, title: i, linkUrl: a, voice: s = "bf_emma", music: c = "auto", canvas: l, sink: u, fps: d = 24, onProgress: f, photosPerItem: p = 2 }) {
	let m = Q(f), h = F(n, r);
	f?.("Recording the voiceover…", null);
	let g = await Oe()({
		text: h,
		voice: s,
		speed: 1
	}, m), _ = {
		samples: g.samples,
		rate: g.rate,
		text: h
	}, v = _.samples.length / _.rate, y = v + 2.8, b = null;
	(c === "auto" || c === "quiet") && (f?.("Writing the music…", null), b = await L(y, _.rate));
	let x = R(_, b, c === "quiet" ? .22 : .45), S = t.map((e, n) => {
		let r = e.intro ? h.indexOf(e.intro) : -1;
		return r > 0 ? Math.max(0, r / h.length * v - .25) : n / t.length * v;
	});
	S[0] = 0;
	let C = [...Ae].sort(() => Math.random() - .5), w = [], T = [], E = [];
	for (let [t, n] of e.entries()) {
		let r = [n.photos[0], ...n.photos.slice(1).sort(() => Math.random() - .5)].filter(Boolean).slice(0, p), i = S[t], a = t + 1 < e.length ? S[t + 1] : y;
		for (let [n, o] of r.entries()) f?.(`Reading the depth of product ${t + 1} of ${e.length}…`, null), w.push({
			image: await createImageBitmap(o),
			depth: await Z()({
				op: "depth",
				blob: o
			}, m),
			motion: C[w.length % C.length]
		}), T.push(t), E.push(i + (a - i) * n / r.length);
	}
	let D = Se({
		hook: n,
		cues: z(h, _),
		items: t,
		shotItem: T,
		host: new URL(a).host,
		seconds: y,
		title: i
	}), O = new o(l);
	O.setFrame("vertical", null);
	let k = await O.renderFrames(w, {
		intensity: 1,
		grain: .03,
		onFrame: D,
		shotStarts: E
	}, y, x, u, {
		fps: d,
		onTick: (e) => f?.("Drawing frames", e)
	});
	return {
		audio: J(x.samples, x.rate),
		fps: k.fps,
		frames: k.frames,
		hook: n,
		script: r,
		seconds: k.seconds
	};
}
async function Ne({ card: e, photos: t, hook: n, script: r, voice: i = "bf_emma", music: a = "auto", logo: s = null, payments: c = !0, canvas: l, sink: u, fps: d = 24, onProgress: f, trendTerms: p = [] }) {
	let { track: m, overlay: h, shots: g, seconds: _ } = await $({
		card: e,
		photos: t,
		hook: n,
		script: r,
		voice: i,
		music: a,
		logo: s,
		payments: c,
		onProgress: f
	}), v = new o(l);
	v.setFrame("vertical", null);
	let y = await v.renderFrames(g, {
		intensity: 1,
		grain: .03,
		onFrame: h
	}, _, m, u, {
		fps: d,
		onTick: (e) => f?.("Drawing frames", e)
	}), b = P(e, n, { trendTerms: p });
	return {
		audio: J(m.samples, m.rate),
		fps: y.fps,
		frames: y.frames,
		caption: b.caption,
		hashtags: b.hashtags,
		hook: n,
		script: r,
		seconds: y.seconds
	};
}
//#endregion
export { N as BRAND_FACTS, n as VOICES, _e as adReadiness, ge as brandCopy, pe as brandPost, ue as collectionCopy, fe as collectionPost, re as hookFor, ke as loadProduct, Me as makeCollectionFrames, je as makeReel, Ne as makeReelFrames, P as productPost, ce as productScript, j as sayable };
