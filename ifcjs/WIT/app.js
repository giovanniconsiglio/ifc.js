import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  Scene,
  MeshLambertMaterial,
  Raycaster,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  Box3,
  Quaternion,
  Matrix4,
  MathUtils,
  Spherical,
  Sphere,
  Clock,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { IFCLoader } from "web-ifc-three/IFCLoader";
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";

import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";

import CameraControls from "camera-controls";
// Camera-controls
const subsetOfTHREE = {
  Vector2: Vector2,
  Vector3: Vector3,
  Vector4: Vector4,
  Quaternion: Quaternion,
  Matrix4: Matrix4,
  Spherical: Spherical,
  Box3: Box3,
  Sphere: Sphere,
  Raycaster: Raycaster,
  MathUtils: {
    DEG2RAD: MathUtils.DEG2RAD,
    clamp: MathUtils.clamp,
  },
};

CameraControls.install({ THREE: subsetOfTHREE });

import { createSideMenuButton } from "../../js/gui-creator/gui-creator";
import { IFCSPACE, IFCOPENINGELEMENT } from "web-ifc";

//Creates the Three.js scene
const scene = new Scene();

//Object to store the size of the viewport
const size = {
  width: window.innerWidth,
  height: window.innerHeight,
};

//Creates the camera (point of view of the user)
const camera = new PerspectiveCamera(75, size.width / size.height);
camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;

//Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 1);
directionalLight.position.set(0, 10, 0);
directionalLight.target.position.set(-5, 0, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

//Sets up the renderer, fetching the canvas of the HTML
const threeCanvas = document.getElementById("three-canvas");
const renderer = new WebGLRenderer({ canvas: threeCanvas, alpha: true });
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Creates grids and axes in the scene
const grid = new GridHelper(50, 30);
scene.add(grid);

const axes = new AxesHelper();
axes.material.depthTest = false;
axes.renderOrder = 1;
scene.add(axes);

//Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.enableDamping = true;
controls.target.set(-2, 0, 0);

//Animation loop
const animate = () => {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();

//Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
  (size.width = window.innerWidth), (size.height = window.innerHeight);
  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();
  renderer.setSize(size.width, size.height);
});

///// Load IFC Model
//Sets up the IFC loading
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.setWasmPath("../../wasm/");

ifcLoader.ifcManager.setupThreeMeshBVH(
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast
);

const ifcModels = [];
let firstModel = true;
async function loadIfc(url) {
  // Create progress bar
  const overlay = document.getElementById("loading-overlay");
  const progressText = document.getElementById("loading-progress");

  overlay.classList.remove("hidden");
  progressText.innerText = `Loading`;

  ifcLoader.ifcManager.setOnProgress((event) => {
    const percentage = Math.floor((event.loaded * 100) / event.total);
    progressText.innerText = `Loaded ${percentage}%`;
  });

  ifcLoader.ifcManager.parser.setupOptionalCategories({
    [IFCSPACE]: false,
    [IFCOPENINGELEMENT]: false,
  });

  // Load the model
  const model = await ifcLoader.loadAsync(url);
  scene.add(model);
  ifcModels.push(model);
  model.castShadow = true;

  // // Add dropped shadow and post-processing efect
  // await viewer.shadowDropper.renderShadow(model.modelID);
  // viewer.context.renderer.postProduction.active = true;

  // if (firstModel) {
  //   const matrixArr = await loader.ifcManager.ifcAPI.GetCoordinationMatrix(
  //     ifcModel.modelID
  //   );
  //   const matrix = new Matrix4().fromArray(matrixArr);
  //   loader.ifcManager.setupCoordinationMatrix(matrix);
  // }

  // firstModel = false;

  overlay.classList.add("hidden");
}

ifcLoader.ifcManager.applyWebIfcConfig({
  USE_FAST_BOOLS: true,
  COORDINATE_TO_ORIGIN: true,
});

// viewer.context.renderer.postProduction.active = true;

// Load file button
const inputElement = document.createElement("input");
inputElement.setAttribute("type", "file");
inputElement.classList.add("hidden");
inputElement.addEventListener(
  "change",
  async (changed) => {
    const ifcURL = URL.createObjectURL(changed.target.files[0]);
    const model = await loadIfc(ifcURL);
  },
  false
);

///// Sets up optimized picking
ifcLoader.ifcManager.setupThreeMeshBVH(
  computeBoundsTree,
  disposeBoundsTree,
  acceleratedRaycast
);

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
const mouse = new Vector2();

function cast(event) {
  // Computes the position of the mouse on the screen
  const bounds = threeCanvas.getBoundingClientRect();

  const x1 = event.clientX - bounds.left;
  const x2 = bounds.right - bounds.left;
  mouse.x = (x1 / x2) * 2 - 1;

  const y1 = event.clientY - bounds.top;
  const y2 = bounds.bottom - bounds.top;
  mouse.y = -(y1 / y2) * 2 + 1;

  // Places it on the camera pointing to the mouse
  raycaster.setFromCamera(mouse, camera);

  // Casts a ray
  return raycaster.intersectObjects(ifcModels);
}

// Creates subset materials
const preselectMat = new MeshLambertMaterial({
  transparent: true,
  opacity: 0.6,
  color: 0x0080ff,
  depthTest: false,
  wireframe: true,
});

const selectMat = new MeshLambertMaterial({
  transparent: true,
  opacity: 0.6,
  color: 0x0080ff,
  depthTest: false,
});

const ifc = ifcLoader.ifcManager;
// References to the previous selections
const highlightModel = { id: -1 };
const selectModel = { id: -1 };

function highlight(event, material, model, multiple = true) {
  const found = cast(event)[0];
  if (found) {
    // Gets model ID
    model.id = found.object.modelID;

    // Gets Express ID
    const index = found.faceIndex;
    const geometry = found.object.geometry;
    const id = ifc.getExpressId(geometry, index);

    // Creates subset
    ifcLoader.ifcManager.createSubset({
      modelID: model.id,
      ids: [id],
      material: material,
      scene: scene,
      removePrevious: multiple,
    });
  } else {
    // Remove previous highlight
    if (event.type == "mousemove") {
      ifc.removeSubset(highlightModel.id, material);
    } else if (event.type == "dblclick") {
      ifc.removeSubset(selectModel.id, material);
    } else if (event.code === "Escape") {
      ifc.removeSubset(selectModel.id, material);
    }
  }
}

///// Handle events
// On mouse move => prePickIfcItem
window.onmousemove = (event) => highlight(event, preselectMat, highlightModel);

// On double click => getProperties
async function getProps(event) {
  const model = cast(event)[0];
  model.id = model.object.modelID;
  const geometry = model.object.geometry;
  const faceIndex = model.faceIndex;
  const id = ifc.getExpressId(geometry, faceIndex);
  const props = await ifc.getItemProperties(model.id, id);
  console.log(props);
  const psets = await ifc.getPropertySets(model.id, id, true);
  console.log(psets);
  const typeProp = await ifc.getTypeProperties(model.id, id, true);
  console.log(typeProp);
  return props;
}

window.ondblclick = async (event) => {
  highlight(event, selectMat, selectModel);
  const props = await getProps(event);
  createPropertiesMenu(props);
};

///// Setup UI
const loadButton = createSideMenuButton("../resources/folder-icon.svg");
loadButton.addEventListener("click", () => {
  loadButton.blur();
  inputElement.click();
});

///// Create properties menu
const propsGUI = document.getElementById("ifc-property-menu-root");

function createPropertiesMenu(properties) {
  console.log(properties);

  removeAllChildren(propsGUI);

  delete properties.psets;
  delete properties.mats;
  delete properties.type;

  for (let key in properties) {
    createPropertyEntry(key, properties[key]);
  }
}

function createPropertyEntry(key, value) {
  const propContainer = document.createElement("div");
  propContainer.classList.add("ifc-property-item");

  if (value === null || value === undefined) value = "undefined";
  else if (value.value) value = value.value;

  const keyElement = document.createElement("div");
  keyElement.textContent = key;
  propContainer.appendChild(keyElement);

  const valueElement = document.createElement("div");
  valueElement.classList.add("ifc-property-value");
  valueElement.textContent = value;
  propContainer.appendChild(valueElement);

  propsGUI.appendChild(propContainer);
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
