import * as THREE from "three";
import { Encoder } from "./encoder";
import "./styles.css";

const appElm = document.getElementById("app")!;
const recordBtn = document.getElementById("record-btn")!;

const size = {
  width: 1280,
  height: 720,
} as const;

function initScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
  camera.position.z = 2.5;

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(0, 0, 2);

  scene.add(light);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(size.width, size.height);
  appElm.appendChild(renderer.domElement);

  const cubes = [makeCube([-1, 0, 0]), makeCube([1, 0, 0])];
  scene.add(...cubes);

  return {
    renderer,
    scene,
    camera,
    cubes,
  };
}

function makeCube(position: [number, number, number]) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x3283a8,
  });

  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(...position);
  return cube;
}

const { renderer, cubes, scene, camera } = initScene();

const encoder = new Encoder({
  canvas: renderer.domElement,
  duration: 5,
  framerate: 60,
  videoBitrate: 5_000_000,
});

await encoder.prepare();

let recording = false;

async function onFrame() {
  cubes.forEach((cube, i) => {
    const speed = 0.01 * (i + 1);
    cube.rotation.x += speed;
    cube.rotation.y += speed;
  });
  renderer.render(scene, camera);

  let finished = false;
  if (recording) {
    finished = await encoder.addFrame();
    if (finished) {
      recording = false;
      recordBtn.innerText = "Reload to record again";
    }
  }
  if (!recording || !finished) {
    requestAnimationFrame(onFrame);
  }
}

recordBtn.addEventListener("click", () => {
  recording = true;
  recordBtn.innerText = "Recording...";
  recordBtn.setAttribute("disabled", "true");
});

requestAnimationFrame(onFrame);
