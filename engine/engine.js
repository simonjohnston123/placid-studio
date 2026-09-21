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
	let n = t ? e.filter((e) => !t.has(e)) : e, r = (n.length ? n : e)[Math.floor(Math.random() * (n.length ? n.length : e.length))];
	return t?.add(r), r;
}, l = /* @__PURE__ */ new Set([
	"LED",
	"USB",
	"HD",
	"UHD",
	"4K",
	"TV",
	"UV",
	"AC",
	"DC",
	"PVC",
	"ABS",
	"IP",
	"XL",
	"XXL",
	"SUV",
	"RV",
	"PC",
	"WIFI"
]);
function u(e) {
	return String(e || "").replace(/\b(\d{2,3})\s*(?=(flexibility|rotation|swivel|tilt|angle)\b)/gi, "$1 degree ").replace(/\b(bends?|bending|folds?|rotates?|swivels?|tilts?)(\s+(?:up\s+)?to\s+)(\d{2,3})\b(?!\s*(degree|%|mm|cm|kg|w|v))/gi, "$1$2$3 degrees").replace(/\s{2,}/g, " ");
}
function d(e) {
	return String(e || "").split(/\s+/).filter((e) => {
		let t = e.replace(/[^A-Za-z0-9]/g, "");
		return !(/^[A-Z]{2,6}$/.test(t) && !l.has(t));
	}).join(" ").replace(/\s+([.,:;!?])/g, "$1").replace(/^[\s:;,.-]+/, "").replace(/(^|[.!?]\s+)([a-z])/g, (e, t, n) => t + n.toUpperCase()).trim();
}
var f = /\b(groundbreaking|revolutionary|significant impact|state of the art|cutting[- ]edge|unparalleled|ultimate|premium quality|high quality|perfect for every|amazing|incredible)\b/i, p = /^(specifications?|description|features?|package (contents|includes)|note|warranty|shipping|delivery)\b/i;
function m(e) {
	let t = [...e.features || [], ...String(e.description || "").split(/\n+/)], n = [];
	for (let e of t) for (let t of String(e).split(/(?<=[.!?])\s+/)) {
		let e = t.trim().replace(/[✀-➿←-⇿⬀-⯿️•▪●★✔✅❌]/g, "").replace(/^[-*\s]+/, "").trim();
		e = h(e);
		let r = e.split(/\s+/).length;
		if (!e || p.test(e) || r < 4 || r > 26) continue;
		let i = 0;
		/\d/.test(e) && (i += 3), /\b(cm|mm|m|kg|g|litre|liter|l|w|watt|v|volt|hour|minute|year|pack|piece)\b/i.test(e) && (i += 2), r >= 6 && r <= 18 && (i += 2), f.test(e) && (i -= 4), n.push({
			t: e.replace(/[.!?]*$/, ""),
			score: i
		});
	}
	return n.sort((e, t) => t.score - e.score).map((e) => e.t);
}
function h(e) {
	let t = e.split(/\s+/);
	if (t.length < 4) return e;
	let n = (e) => /^[A-Z0-9]/.test(e);
	for (let r = 1; r < Math.min(5, t.length - 1); r++) if (n(t[r]) && /^[a-z]/.test(t[r + 1] || "")) {
		let n = t.slice(0, r).join(" "), i = t.slice(r).join(" ");
		return n && /^[A-Z]/.test(i) ? `${n}: ${i.replace(/^./, (e) => e.toLowerCase())}` : e;
	}
	return e;
}
function g(e, t) {
	if (!e) return e;
	let n = new Set(String(t).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)), r = e.split(/\s+/), i = +!!/^(the|this|our)$/i.test(r[0]), a = i;
	for (; a < r.length && n.has(r[a].toLowerCase().replace(/[^a-z0-9]/g, ""));) a++;
	let o = r.slice(a).join(" ");
	return a - i >= 2 && /^[a-z]/.test(o) ? `It ${o}` : e;
}
var _ = (e) => new Set(String(e).toLowerCase().match(/[a-z]{5,}/g) || []), v = (e, t) => {
	let n = _(e);
	return [..._(t)].some((e) => n.has(e));
}, y = (e) => {
	let t = String(e).split(/[|,–—]/)[0].trim(), n = t.split(/\s+/);
	if (n.length <= 7) return t;
	let r = n.slice(0, 7), i = r.findIndex((e, t) => t >= 3 && /^(with|and|for|plus|in|on|to|by|of|featuring|including)$/i.test(e));
	for (i > 0 && (r = r.slice(0, i)); r.length > 3 && /^(with|and|for|the|a|in|on|to|plus|by|of)$/i.test(r[r.length - 1]);) r.pop();
	return r.join(" ");
}, b = (e) => e % 100 ? `$${(e / 100).toFixed(2)}` : `$${e / 100}`;
function x(e) {
	return d(y(e.title)).split(/\s+/).filter((e) => !/^\d/.test(e)).slice(-2).join(" ") || "one of these";
}
function S(e) {
	let t = m(e)[0];
	if (!t) return null;
	let n = u(d(t.includes(":") ? t.split(":").slice(1).join(":") : t)).replace(/\([^)]*\)/g, " ").replace(/\s{2,}/g, " ").trim().split(/\s+/).slice(0, 7);
	for (; n.length > 3 && /^(and|with|for|the|a|to|of|in|on|that|which)$/i.test(n[n.length - 1]);) n.pop();
	return n.join(" ").replace(/[,;:]$/, "").replace(/^./, (e) => e.toLowerCase()) || null;
}
function C(e, { hook: t = null } = {}) {
	let n = /* @__PURE__ */ new Set(), r = d(y(e.title)), i = m(e), a = u(d(g(i[0], e.title))), o = i.slice(1).find((e) => !v(e, i[0] || "")) || null, s = t || w(e), l = c([
		"Here it is.",
		"Then this is for you.",
		"Here's the fix.",
		"Sorted."
	], n), f = c([
		`The ${r}.`,
		`It's the ${r}.`,
		`Meet the ${r}.`
	], n), p = a && s && v(a, s), h = p && o ? u(d(g(o, e.title))) : a, _ = p && o ? a : o && u(d(g(o, e.title))), x = !h || h.includes(":") || /^[A-Z]{2,}/.test(h);
	return [
		s,
		l,
		f,
		h ? c(x ? [`${h}.`] : [`${h}.`, `${h} — that's the whole point.`], n) : null,
		_ ? `${_}.` : null,
		e.priceCents ? c([
			`${b(e.priceCents)}, delivery worked out at checkout.`,
			`All yours for ${b(e.priceCents)}, plus delivery to your place.`,
			`${b(e.priceCents)}.`
		], n) : null,
		typeof e.stockQuantity == "number" && e.stockQuantity > 0 && e.stockQuantity <= 5 ? c([`Only ${e.stockQuantity} left.`, `There are ${e.stockQuantity} in stock.`], n) : null,
		c([
			"Placid Deals dot com.",
			"Get it at Placid Deals dot com.",
			"It's at Placid Deals dot com — go and have a look."
		], n)
	].filter(Boolean).join(" ");
}
function w(e) {
	let t = x(e).toLowerCase(), n = S(e), r = [
		`Still putting up with your old ${t}?`,
		`Shopping for a ${t}?`,
		`Is your ${t} past it?`,
		`Want a ${t} that actually works?`
	];
	return n && r.unshift(`Want a ${t} that ${n}?`, `Tired of a ${t} that can't ${n}?`), c(r);
}
//#endregion
//#region src/reel.js
var T = "\"Segoe UI\", system-ui, -apple-system, Helvetica, sans-serif";
async function E(e, t = 44100) {
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
function D(e, t, n = .45) {
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
function O(e, t) {
	let { samples: n, rate: r } = t, i = n.length / r, a = Math.floor(r * .03), o = [];
	for (let e = 0; e < n.length; e += a) {
		let t = 0;
		for (let r = e; r < Math.min(n.length, e + a); r++) t += n[r] * n[r];
		o.push(Math.sqrt(t / a));
	}
	let s = ([...o].sort((e, t) => e - t)[Math.floor(o.length * .95)] || 1) * .06, c = [], l = null;
	o.forEach((e, t) => {
		e < s ? l === null && (l = t) : (l !== null && (t - l) * .03 > .18 && c.push((l + t) / 2 * .03), l = null);
	}), e = k(e);
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
function k(e) {
	return String(e || "").replace(/\bplacid\s+deals\s+dot\s+com\b/gi, "placiddeals.com").replace(/\b([a-z0-9-]+)\s+dot\s+(com|com\.au|net|org|co)\b/gi, (e, t, n) => `${t}.${n}`).replace(/\s{2,}/g, " ").trim();
}
function A(e, t, n, r, i, a) {
	e.beginPath(), e.roundRect(t, n, r, i, a);
}
function j(e, t, n, r, i, a = 3) {
	let o = i;
	for (; o > i * .55; o -= 2) {
		e.font = `${r} ${o}px ${T}`;
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
	return e.font = `${r} ${o}px ${T}`, {
		fs: o,
		lines: [t]
	};
}
function M(e, t, n, r, i) {
	if (i <= 0) return;
	e.save(), e.globalAlpha = i;
	let a = t * .07, { fs: o, lines: s } = j(e, r.toUpperCase(), t - a * 2, 800, Math.round(t * .095), 3), c = o * 1.15, l = s.length * c + a * .8, u = n * .175;
	e.fillStyle = "rgba(0,0,0,.55)", A(e, a * .5, u - a * .4, t - a, l, t * .035), e.fill(), e.textBaseline = "top", e.textAlign = "center", s.forEach((n, r) => {
		e.fillStyle = "#fff", e.strokeStyle = "rgba(0,0,0,.65)", e.lineWidth = o * .14, e.lineJoin = "round", e.strokeText(n, t / 2, u + r * c), e.fillText(n, t / 2, u + r * c);
	}), e.restore();
}
function N(e, t, n, r) {
	if (!r) return;
	e.save();
	let { fs: i, lines: a } = j(e, r, t - t * .08 * 2, 700, Math.round(t * .062), 2), o = i * 1.2, s = n * .7;
	e.textAlign = "center", e.textBaseline = "top";
	for (let n of a) e.strokeStyle = "rgba(0,0,0,.8)", e.lineWidth = i * .18, e.lineJoin = "round", e.strokeText(n, t / 2, s), e.fillStyle = "#fff", e.fillText(n, t / 2, s), s += o;
	e.restore();
}
var P = {
	deep: "#1E0733",
	deep2: "#2C0B4E",
	violet: "#8B5CF6",
	light: "#A78BFA",
	ink: "#ffffff"
};
function F(e, t, n, r) {
	e.save(), e.translate(t, n);
	let i = r / 64;
	e.scale(i, i);
	let a = e.createLinearGradient(0, 0, 64, 64);
	a.addColorStop(0, P.light), a.addColorStop(1, P.violet), e.fillStyle = a, e.beginPath(), e.moveTo(14, 8), e.lineTo(34, 8), e.arc(34, 32, 24, -Math.PI / 2, Math.PI / 2), e.lineTo(14, 56), e.closePath(), e.fill(), e.globalCompositeOperation = "destination-out", e.beginPath(), e.moveTo(26, 20), e.lineTo(34, 20), e.arc(34, 32, 12, -Math.PI / 2, Math.PI / 2), e.lineTo(26, 44), e.closePath(), e.fill(), e.globalCompositeOperation = "source-over", e.fillStyle = a, e.beginPath(), e.moveTo(20, 46), e.lineTo(20, 26), e.lineTo(34, 12), e.lineTo(44, 22), e.lineTo(30, 36), e.lineTo(30, 46), e.closePath(), e.fill(), e.fillStyle = P.deep, e.beginPath(), e.arc(35, 21, 2.6, 0, Math.PI * 2), e.fill(), e.restore();
}
function I(e, t, n, r, i = !1) {
	e.save(), e.textBaseline = "top", e.textAlign = i ? "center" : "left", e.font = `700 ${r}px ${T}`, e.fillStyle = P.ink, e.letterSpacing = `${r * .16}px`, e.fillText("PLACID", t, n);
	let a = e.measureText("PLACID").width, o = n + r * 1.12;
	e.font = `600 ${r * .6}px ${T}`, e.fillStyle = P.light, e.letterSpacing = `${r * .26}px`, e.fillText("DEALS", t, o);
	let s = e.measureText("DEALS").width;
	e.letterSpacing = "0px";
	let c = o + r * .3, l = r * .22, u = r * .5, d = i ? t - s / 2 : t;
	return e.strokeStyle = P.violet, e.lineWidth = Math.max(1, r * .06), e.beginPath(), e.moveTo(d - l - u, c), e.lineTo(d - l, c), e.moveTo(d + s + l, c), e.lineTo(d + s + l + u, c), e.stroke(), e.restore(), a;
}
function L(e, t, n, { logo: r, host: i, price: a }) {
	let o = n * .105, s = n * .095;
	e.save();
	let c = e.createLinearGradient(0, 0, t, o);
	c.addColorStop(0, P.deep), c.addColorStop(1, P.deep2), e.fillStyle = c, e.fillRect(0, 0, t, o), e.fillStyle = P.deep, e.fillRect(0, n - s, t, s), e.strokeStyle = P.violet, e.lineWidth = Math.max(2, t * .006), e.beginPath(), e.moveTo(0, o), e.lineTo(t, o), e.moveTo(0, n - s), e.lineTo(t, n - s), e.stroke(), e.strokeRect(e.lineWidth / 2, e.lineWidth / 2, t - e.lineWidth, n - e.lineWidth);
	let l = t * .05, u = o * .52;
	if (r) {
		let t = u * 1.25, n = t * (r.width / r.height);
		e.drawImage(r, l, (o - t) / 2, n, t);
	} else {
		F(e, l, (o - u) / 2, u);
		let t = u * .42;
		e.save(), e.textBaseline = "middle", e.textAlign = "left", e.font = `700 ${t}px ${T}`, e.letterSpacing = `${t * .16}px`, e.fillStyle = P.ink;
		let n = l + u * 1.3;
		e.fillText("PLACID", n, o / 2);
		let r = e.measureText("PLACID").width + t * .5;
		e.fillStyle = P.light, e.fillText("DEALS", n + r, o / 2), e.letterSpacing = "0px", e.restore();
	}
	if (a) {
		let n = Math.round(t * .055);
		e.font = `800 ${n}px ${T}`;
		let r = e.measureText(a).width + n * 1.1, i = n * 1.5, s = t - r - l, c = (o - i) / 2;
		e.fillStyle = P.violet, A(e, s, c, r, i, i / 2), e.fill(), e.fillStyle = P.ink, e.textAlign = "center", e.textBaseline = "middle", e.fillText(a, s + r / 2, c + i / 2 + 1);
	}
	e.font = `700 ${Math.round(t * .045)}px ${T}`, e.fillStyle = P.ink, e.textAlign = "center", e.textBaseline = "middle", e.fillText(i, t / 2, n - s / 2), e.restore();
}
function R(e, t, n, { title: r, host: i, price: a, logo: o, payments: s }, c) {
	if (c <= 0) return;
	e.save(), e.globalAlpha = c, e.fillStyle = "rgba(30,7,51,.93)", e.fillRect(0, 0, t, n);
	let l = t * .09;
	e.textAlign = "center";
	let u = j(e, r, t - l * 2, 800, Math.round(t * .085), 3);
	e.textBaseline = "top";
	let d = n * .3;
	if (e.fillStyle = "#fff", u.lines.forEach((n, r) => e.fillText(n, t / 2, d + r * u.fs * 1.15)), d += u.lines.length * u.fs * 1.15 + n * .02, a && (e.font = `800 ${Math.round(t * .11)}px ${T}`, e.fillStyle = P.light, e.fillText(a, t / 2, d), d += t * .15), e.font = `700 ${Math.round(t * .058)}px ${T}`, e.fillStyle = "#fff", e.fillText(i, t / 2, d), d += t * .085, e.font = `600 ${Math.round(t * .042)}px ${T}`, e.fillStyle = "#9aa1ad", e.fillText("Link in bio", t / 2, d), s && (d += t * .075, e.font = `600 ${Math.round(t * .038)}px ${T}`, e.fillStyle = "#5eead4", e.fillText(s, t / 2, d)), o) {
		let r = t * .34, i = r * (o.height / o.width);
		e.drawImage(o, (t - r) / 2, n * .12, r, i);
	} else {
		let r = t * .2;
		F(e, (t - r) / 2, n * .09, r), I(e, t / 2, n * .09 + r * 1.25, t * .062, !0);
	}
	e.restore();
}
function z({ hook: e, cues: t, price: n, title: r, host: i, seconds: a, logo: o = null, payments: s = null }) {
	let c = Math.max(a - 2.2, a * .82);
	return (a, l) => {
		let u = a.canvas.width, d = a.canvas.height;
		l < c && L(a, u, d, {
			logo: o,
			host: i,
			price: n
		}), M(a, u, d, e, l < 2 ? Math.min(1, l / .25) : Math.max(0, 1 - (l - 2) / .6));
		let f = t.find((e) => l >= e.t0 && l < e.t1);
		l > 2.4 && N(a, u, d, f?.text), R(a, u, d, {
			title: r,
			host: i,
			price: n,
			logo: o,
			payments: s
		}, l > c ? Math.min(1, (l - c) / .5) : 0);
	};
}
function B(e, t) {
	let n = /* @__PURE__ */ new Set([
		"with",
		"and",
		"the",
		"for",
		"from",
		"your",
		"this",
		"that",
		"plus",
		"pack",
		"set",
		"new"
	]), r = String(e.title).toLowerCase().match(/[a-z]{4,}/g) || [], i = [...new Set(r.filter((e) => !n.has(e)))].slice(0, 5).map((e) => "#" + e);
	return `${t}\n\n${e.title}${e.priceLabel ? ` — ${e.priceLabel}` : ""}\n${e.url}\n\n${[
		"#placiddeals",
		"#australia",
		"#tiktokmademebuyit",
		...i
	].join(" ")}`;
}
//#endregion
//#region src/gen.worker.js?worker&url
var V = new URL("assets/gen.worker-ptNQZks0.js", import.meta.url).href, H = new URL("assets/tts.worker-DlZWSiBg.js", import.meta.url).href;
//#endregion
//#region src/engine.js
function U(e) {
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
function W(e) {
	if (e.origin === self.location.origin) return new Worker(e, { type: "module" });
	let t = new Blob([`import ${JSON.stringify(e.href)};`], { type: "text/javascript" });
	return new Worker(URL.createObjectURL(t), { type: "module" });
}
var G = null, K = null, q = () => G ??= U(W(new URL(V, import.meta.url))), J = () => K ??= U(W(new URL(H, import.meta.url)));
function Y(e) {
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
async function X(e, { base: t = null, onProgress: n } = {}) {
	let r;
	try {
		r = new URL(e);
	} catch {
		throw Error("Paste the whole product link, starting with https://");
	}
	let i = t || r.origin, a = await fetch(`${i}/api/public/product-card?url=${encodeURIComponent(r.href)}`), o = await a.json().catch(() => ({}));
	if (!a.ok) throw Error(o.error || `The product could not be read (${a.status}).`);
	if (!o.images?.length) throw Error("That product has no photos to make a reel from.");
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
var Z = [
	"push",
	"orbit",
	"pan",
	"pull",
	"crane",
	"drift"
];
async function Q({ card: e, photos: t, hook: n, script: r, voice: i = "bf_emma", music: a = "auto", logo: s = null, payments: c = !0, canvas: l, onProgress: u }) {
	let d = Y(u), f = r.startsWith(n) ? r : `${n}. ${r}`;
	u?.("Recording the voiceover…", null);
	let p = await J()({
		text: f,
		voice: i,
		speed: 1
	}, d), m = {
		samples: p.samples,
		rate: p.rate,
		text: f
	}, h = m.samples.length / m.rate + 2.6, g = null;
	(a === "auto" || a === "quiet") && (u?.("Writing the music…", null), g = await E(h, m.rate));
	let _ = D(m, g, a === "quiet" ? .22 : .45), v = z({
		hook: n,
		cues: O(f, m),
		price: e.priceLabel,
		title: e.title,
		host: new URL(e.url).host,
		seconds: h,
		logo: s ? await createImageBitmap(s) : null,
		payments: c
	}), y = [];
	for (let [e, n] of t.entries()) u?.(`Reading the depth of photo ${e + 1} of ${t.length}…`, null), y.push({
		image: await createImageBitmap(n),
		depth: await q()({
			op: "depth",
			blob: n
		}, d),
		motion: Z[e % Z.length]
	});
	let b = new o(l);
	return b.setFrame("vertical", null), {
		video: await b.record(y, {
			intensity: 1,
			grain: .03,
			onFrame: v
		}, h, _, (e) => u?.("Recording — keep this tab open", e)),
		caption: B(e, n),
		seconds: h
	};
}
//#endregion
export { n as VOICES, w as hookFor, X as loadProduct, Q as makeReel, C as productScript };
