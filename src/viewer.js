import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function initScene(container, reducedMotion) {
  const status = document.querySelector('#model-status');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch {
    status.textContent = 'APERÇU · 3D INDISPONIBLE';
    container.classList.add('viewer-fallback');
    document.querySelectorAll('.viewer-tools button').forEach(button => button.disabled = true);
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .05, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .07;
  controls.enablePan = false; controls.enableZoom = false;
  controls.minPolarAngle = .1; controls.maxPolarAngle = Math.PI - .1;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .65;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xc8d3e1, 0x1c1008, 1.5));
  const key = new THREE.DirectionalLight(0xfff4e7, 3.2); key.position.set(-2, 4, 5); scene.add(key);
  const edge = new THREE.DirectionalLight(0xb7d0eb, 2.8); edge.position.set(3, 3, -4); scene.add(edge);
  const warm = new THREE.DirectionalLight(0xff6a25, .6); warm.position.set(-5, -1, -2); scene.add(warm);
  const root = new THREE.Group(); scene.add(root);
  root.rotation.set(.08, -.28, .14);
  let visible = true, ready = false, interacted = false;
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); observer.observe(container);
  controls.addEventListener('start', () => { interacted = true; });

  function reset() {
    const distance = Math.max(5.8, 7.2 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    camera.position.set(.2, .65, distance);
    controls.target.set(0, -.05, 0);
    root.rotation.set(.08, -.28, .14);
    controls.update(); interacted = false;
  }
  const resize = new ResizeObserver(() => {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); reset();
  });
  resize.observe(container);
  document.querySelector('#reset').addEventListener('click', reset);
  document.querySelector('#rotate-left').addEventListener('click', () => { root.rotation.y -= .22; interacted = true; });
  document.querySelector('#rotate-right').addEventListener('click', () => { root.rotation.y += .22; interacted = true; });
  function zoom(multiplier) {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * multiplier, 3.7, 25));
    camera.position.copy(controls.target).add(offset); controls.update(); interacted = true;
  }
  document.querySelector('#zoom-in').addEventListener('click', () => zoom(.87));
  document.querySelector('#zoom-out').addEventListener('click', () => zoom(1.13));

  status.textContent = 'CHARGEMENT DE L’OBJET…';
  const loader = new GLTFLoader();
  loader.load(import.meta.env.VITE_MODEL_URL || `${import.meta.env.BASE_URL}models/ak47.glb`, gltf => {
    const object = gltf.scene;
    const orient = new THREE.Group(); orient.add(object);
    orient.rotation.y = Math.PI / 2;
    orient.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(orient);
    const dimensions = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    orient.position.sub(center);
    const fit = new THREE.Group(); fit.add(orient); fit.scale.setScalar(6.8 / Math.max(dimensions.x, dimensions.y, dimensions.z));
    let triangles = 0;
    object.traverse(node => {
      if (!node.isMesh) return;
      triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
      for (const material of [node.material].flat()) {
        if (material.map) material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        material.envMapIntensity = .8;
      }
    });
    root.add(fit); ready = true;
    container.dataset.modelState = 'ready'; container.dataset.triangles = String(triangles);
    container.classList.add('model-ready');
    status.textContent = 'OBJET 3D · EXPLORATION À 360°';
    reset();
  }, event => {
    if (event.total) status.textContent = `CHARGEMENT DE L’OBJET · ${Math.round(event.loaded / event.total * 100)} %`;
  }, () => {
    status.textContent = 'MODÈLE INDISPONIBLE · APERÇU';
    container.classList.add('viewer-fallback'); container.dataset.modelState = 'error';
    document.querySelectorAll('.viewer-tools button').forEach(button => button.disabled = true);
  });

  renderer.setAnimationLoop(time => {
    if (!visible || document.hidden) return;
    if (ready && !reducedMotion && !interacted) root.rotation.y = -.28 + Math.sin(time * .00018) * .035;
    controls.update(); renderer.render(scene, camera);
  });
  return { setChapter() {} };
}
