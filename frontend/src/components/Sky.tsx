import clsx from "clsx";
import { useEffect, useRef } from "react";

const VERT = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// Twilight over the stadium: a deep-blue-to-pink sky, clouds lit from the horizon, a few stars.
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r;
uniform float t;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), u.x), mix(h(i + vec2(0.0, 1.0)), h(i + 1.0), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int k = 0; k < 6; k++) { v += a * n(p); p = m * p; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = gl_FragCoord.xy / r;
  vec2 p = vec2(uv.x * r.x / r.y, uv.y);
  float y = uv.y;

  vec3 hor = vec3(1.0, 0.70, 0.78);
  vec3 low = vec3(0.60, 0.36, 0.80);
  vec3 mid = vec3(0.17, 0.15, 0.52);
  vec3 top = vec3(0.02, 0.04, 0.18);
  vec3 sky = mix(hor, low, smoothstep(0.0, 0.28, y));
  sky = mix(sky, mid, smoothstep(0.22, 0.6, y));
  sky = mix(sky, top, smoothstep(0.55, 1.0, y));

  vec2 cell = floor(gl_FragCoord.xy / 1.5);
  float star = step(0.9975, h(cell)) * (0.55 + 0.45 * sin(t * 1.7 + h(cell + 7.0) * 40.0));
  sky += vec3(star * smoothstep(0.55, 0.95, y) * 0.9);

  vec2 q = p * vec2(1.1, 2.6) + vec2(t * 0.010, 0.0);
  float w = fbm(q + 0.9 * fbm(q * 0.7 - t * 0.006));
  float dens = smoothstep(0.42, 0.78, w + (0.52 - y) * 1.05);
  float light = smoothstep(0.15, 0.95, 1.0 - y) * (0.55 + 0.45 * fbm(q * 2.3 + 4.0));
  vec3 shadow = vec3(0.13, 0.09, 0.32);
  vec3 body = vec3(0.50, 0.38, 0.84);
  vec3 rim = vec3(1.0, 0.76, 0.88);
  vec3 cloud = mix(shadow, body, smoothstep(0.25, 0.7, w));
  cloud = mix(cloud, rim, light * smoothstep(0.5, 0.95, w));
  vec3 col = mix(sky, cloud, dens * 0.93);

  float wisp = fbm(p * vec2(0.7, 3.2) + vec2(t * 0.018, 5.0));
  col = mix(col, vec3(0.42, 0.36, 0.86), smoothstep(0.58, 0.86, wisp) * smoothstep(0.35, 0.85, y) * 0.32);

  float v = smoothstep(1.25, 0.25, length((uv - vec2(0.5, 0.58)) * vec2(1.0, 1.15)));
  col *= mix(0.5, 1.0, v);
  gl_FragColor = vec4(col, 1.0);
}`;

/** A slow living twilight sky on a canvas; the static gradient underneath stands in without WebGL. */
export function Sky({ className, scale = 0.5 }: { className?: string; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const gl = c.getContext("webgl", { antialias: false, preserveDrawingBuffer: false });
    if (!gl) return;
    const shader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uR = gl.getUniformLocation(prog, "r");
    const uT = gl.getUniformLocation(prog, "t");

    const resize = () => {
      c.width = Math.max(2, Math.round(c.clientWidth * scale));
      c.height = Math.max(2, Math.round(c.clientHeight * scale));
      gl.viewport(0, 0, c.width, c.height);
      gl.uniform2f(uR, c.width, c.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(c);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now() - 30_000;
    let raf = 0;
    const draw = (now: number) => {
      if (visible) {
        gl.uniform1f(uT, (now - start) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    c.dataset.live = "true";
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [scale]);
  return (
    <div className={clsx("overflow-hidden bg-[linear-gradient(0deg,#f2b3cc_0%,#8a52c9_28%,#2b2585_60%,#060a2c_100%)]", className)}>
      <canvas ref={ref} className="h-full w-full opacity-0 transition-opacity duration-[1500ms] data-[live=true]:opacity-100" />
    </div>
  );
}
