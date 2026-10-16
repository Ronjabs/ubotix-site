// Browser-side model estimator: reads an STL/OBJ file, measures it, and estimates
// filament weight + print time, then prices it with estimate() from estimate.js.
// Nothing is uploaded: the file is read on the visitor's device only.
// These are approximations, not a real slicer.
(() => {
  const DENSITY = { PLA: 1.24, PETG: 1.27, ABS: 1.04 };   // g/cm3
  const WALL_MM = 1.2;          // solid outer shell thickness
  const FLOW_MM3_PER_S = 4.5;   // effective average extrusion rate incl. travel/accel
  const LAYER_OVERHEAD_S = 4;   // seconds lost per layer change
  const MAX_BYTES = 50 * 1024 * 1024;
  const UNITS = { mm: 1, cm: 10, in: 25.4 };

  const $ = id => document.getElementById(id);
  const drop = $('mdlDrop'), input = $('mdlFile'), out = $('mdlOut'), err = $('mdlErr');
  if (!drop) return;
  let tris = null;      // Float32Array of x,y,z * 3 per triangle (model units)
  let fileName = '';
  let stats = null;

  // ---------- parsing
  function parseSTL(buf) {
    const dv = new DataView(buf);
    if (buf.byteLength >= 84) {
      const n = dv.getUint32(80, true);
      if (84 + n * 50 === buf.byteLength) {
        const a = new Float32Array(n * 9);
        for (let i = 0; i < n; i++) {
          const o = 84 + i * 50 + 12;
          for (let k = 0; k < 9; k++) a[i * 9 + k] = dv.getFloat32(o + k * 4, true);
        }
        return a;
      }
    }
    const text = new TextDecoder().decode(buf);
    const nums = [];
    const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g;
    let m;
    while ((m = re.exec(text))) nums.push(+m[1], +m[2], +m[3]);
    if (nums.length < 9 || nums.length % 9) throw new Error('Could not read this STL file.');
    return Float32Array.from(nums);
  }

  function parseOBJ(buf) {
    const lines = new TextDecoder().decode(buf).split(/\r?\n/);
    const v = [], out = [];
    for (const line of lines) {
      if (line.startsWith('v ')) { const p = line.trim().split(/\s+/); v.push([+p[1], +p[2], +p[3]]); }
      else if (line.startsWith('f ')) {
        const idx = line.trim().split(/\s+/).slice(1).map(t => { let i = parseInt(t, 10); return i < 0 ? v.length + i : i - 1; });
        for (let k = 1; k < idx.length - 1; k++) for (const j of [idx[0], idx[k], idx[k + 1]]) {
          if (!v[j]) throw new Error('Could not read this OBJ file.');
          out.push(...v[j]);
        }
      }
    }
    if (out.length < 9) throw new Error('Could not read this OBJ file.');
    return Float32Array.from(out);
  }

  // ---------- measuring
  function measure(a, scale) {
    let vol = 0, area = 0;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < a.length; i += 9) {
      const ax = a[i] * scale, ay = a[i + 1] * scale, az = a[i + 2] * scale;
      const bx = a[i + 3] * scale, by = a[i + 4] * scale, bz = a[i + 5] * scale;
      const cx = a[i + 6] * scale, cy = a[i + 7] * scale, cz = a[i + 8] * scale;
      vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
      const ux = bx - ax, uy = by - ay, uz = bz - az, wx = cx - ax, wy = cy - ay, wz = cz - az;
      area += 0.5 * Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx);
      for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]]) {
        if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x;
        if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y;
        if (z < min[2]) min[2] = z; if (z > max[2]) max[2] = z;
      }
    }
    return { volume: Math.abs(vol), area, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
  }

  function estimateMaterial(s, infill, layer) {
    const shell = Math.min(s.volume, s.area * WALL_MM);
    const material = shell + (s.volume - shell) * infill;           // mm3 of plastic
    const grams = (material / 1000) * DENSITY[$('mdlMat').value];
    const layers = s.size[2] / layer;                               // model Z is up
    const seconds = material / FLOW_MM3_PER_S + layers * LAYER_OVERHEAD_S;
    return { grams, hours: seconds / 3600 };
  }

  // ---------- UI
  const fmtTime = h => { const t = Math.round(h * 60); return `${Math.floor(t / 60)}h ${t % 60}m`; };
  function fail(msg) { err.textContent = msg; err.hidden = false; out.hidden = true; }

  function refresh() {
    if (!tris) return;
    const scale = (UNITS[$('mdlUnits').value] || 1) * (parseFloat($('mdlScale').value) || 100) / 100;
    stats = measure(tris, scale);
    const infill = Math.min(100, Math.max(0, parseFloat($('mdlInfill').value) || 0)) / 100;
    const layer = parseFloat($('mdlLayer').value) || 0.2;
    const est = estimateMaterial(stats, infill, layer);
    if (stats.volume < 1) return fail('This model has almost no volume. It may not be a closed (watertight) mesh, or the units are wrong.');
    err.hidden = true;
    const g = Math.max(1, Math.round(est.grams));
    const h = Math.max(0.05, est.hours);
    $('mdlName').textContent = fileName;
    $('mdlSize').textContent = stats.size.map(v => v.toFixed(1)).join(' x ') + ' mm';
    $('mdlVol').textContent = (stats.volume / 1000).toFixed(1) + ' cm³';
    $('mdlGrams').textContent = '~' + g + ' g';
    $('mdlTime').textContent = '~' + fmtTime(h);
    $('mdlPrice').textContent = peso(estimate(g, h, false));
    out.dataset.g = g; out.dataset.h = h;
    out.hidden = false;
    const big = Math.max(...stats.size);
    $('mdlWarn').hidden = !(big < 5 || big > 400);
  }

  async function handle(file) {
    err.hidden = true;
    if (!file) return;
    if (file.size > MAX_BYTES) return fail('That file is over 50 MB. Please use a smaller model.');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['stl', 'obj'].includes(ext)) return fail('Please upload an .stl or .obj file. (3MF and STEP files are not supported yet.)');
    try {
      const buf = await file.arrayBuffer();
      tris = ext === 'stl' ? parseSTL(buf) : parseOBJ(buf);
      fileName = file.name;
      refresh();
      preview(tris);
    } catch (e) { tris = null; fail(e.message || 'Could not read this file.'); }
  }

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => handle(input.files[0]));
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => handle(e.dataTransfer.files[0]));
  ['mdlMat', 'mdlInfill', 'mdlLayer', 'mdlUnits', 'mdlScale'].forEach(id => $(id).addEventListener('input', refresh));
  $('mdlUse').addEventListener('click', () => {
    const h = parseFloat(out.dataset.h), g = out.dataset.g;
    $('grams').value = g; $('hours').value = Math.floor(h); $('minutes').value = Math.round((h % 1) * 60);
    $('estForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // ---------- 3D preview (three.js, optional: the estimate works without it)
  let viewer;
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  async function preview(a) {
    const box = $('mdlView');
    try {
      box.hidden = false;
      if (!window.THREE) {
        await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js');
      }
      const T = window.THREE;
      if (!viewer) {
        const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        box.innerHTML = ''; box.appendChild(renderer.domElement);
        const scene = new T.Scene();
        scene.add(new T.AmbientLight(0xffffff, 0.55));
        const d = new T.DirectionalLight(0xffffff, 0.9); d.position.set(1, 2, 3); scene.add(d);
        const camera = new T.PerspectiveCamera(40, 1, 0.1, 5000);
        const controls = new T.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        viewer = { renderer, scene, camera, controls, mesh: null };
        const resize = () => { const w = box.clientWidth, h = box.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
        addEventListener('resize', resize); resize();
        (function loop() { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();
      }
      if (viewer.mesh) { viewer.scene.remove(viewer.mesh); viewer.mesh.geometry.dispose(); }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(a, 3));
      g.computeVertexNormals(); g.computeBoundingBox();
      const c = new T.Vector3(); g.boundingBox.getCenter(c); g.translate(-c.x, -c.y, -c.z);
      const mesh = new T.Mesh(g, new T.MeshStandardMaterial({ color: 0x38b6ff, metalness: 0.1, roughness: 0.55, side: T.DoubleSide }));
      mesh.rotation.x = -Math.PI / 2;                  // STL/OBJ Z-up -> three.js Y-up
      viewer.scene.add(mesh); viewer.mesh = mesh;
      const r = g.boundingBox.getSize(new T.Vector3()).length();
      viewer.camera.position.set(r * 0.9, r * 0.7, r * 1.1);
      viewer.controls.target.set(0, 0, 0); viewer.controls.update();
    } catch (e) { box.hidden = true; }
  }
})();
