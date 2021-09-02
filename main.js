let sceneWrapper = document.querySelector(".sceneWrapper");
let scene = document.querySelector(".scene");
let floor = document.querySelector(".floor");
let [
  floorTopLeft,
  floorTopRight,
  floorBottomLeft,
  floorBottomRight
] = [...document.querySelectorAll(".floor .vertex")];
let gridSizeSelector = document.querySelector("#gridSize");
let snapSizeSelector = document.querySelector("#snapSize");

function createFace(classNames, x, y, z, rx, ry, rz, width, height, color) {
  let face = document.createElement("DIV");
  classNames.split(" ")
    .forEach(className =>
      face.classList.add(className)
    );
  face.style.position = "absolute";
  face.style.transform = `
    translate3d(${x}em, ${y}em, ${z}em)
    rotateX(${rx}deg)
    rotateY(${ry}deg)
    rotateZ(${rz}deg)
  `;
  face.style.transformStyle = "preserve-3d";
  face.style.width = width + "em";
  face.style.height = height + "em";
  face.style.backgroundColor = color;
  return face;
}

function createCuboid(classNames, x, y, z, width, height, depth, color, isSelectable) {
  let model = createFace("model " + classNames, x, -height + y, z, 0, 0, 0, width, height, "#0000", "#0000");
  let faceMap = {
    top: createFace("face top", 0, -depth/2, 0, 90, 0, 0, width, depth, color),
    bottom: createFace("face bottom", 0, height-depth/2, 0, -90, 0, 0, width, depth, color),
    back: createFace("face back", 0, 0, -depth/2, 0, 180, 0, width, height, color),
    front: createFace("face front", 0, 0, depth/2, 0, 0, 0, width, height, color),
    right: createFace("face right", -depth/2+width, 0, 0, 0, 90, 0, depth, height, color),
    left: createFace("face left", -depth/2, 0, 0, 0, -90, 0, depth, height, color)
  };
  Object.values(faceMap)
    .forEach(face => model.appendChild(face));
  
  // Box select
  if (!isSelectable) {
    model.classList.add("notSelectable");
  }
  
  // Box move
  if (isSelectable) {
    model.addEventListener("mousedown", mdevt => {

      if (mdevt.button !== 0) {
        return;
      }

      let { x: prevX, y: prevY } = getTileXY(mdevt.pageX, mdevt.pageY);

      function move(mmevt) {
        let { x: currX, y: currY } = getTileXY(mmevt.pageX, mmevt.pageY);

        let dx = currX - prevX;
        let dy = currY - prevY;
        model.style.transform = model.style.transform
          .replace(/translate3d\((.*?)em, (.*?)em, (.*?)em\)/, (_, x, y, z) =>
            `translate3d(${+x + dx}em, ${y}em, ${+z + dy}em)`
          );

        prevX = currX;
        prevY = currY;
      }

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", () =>
        document.removeEventListener("mousemove", move)
      );

    });
  }
  
  return { model, faceMap };
}

// Move selected model up and down
document.addEventListener("keypress", evt => {
  let key = evt.key;
  let allowedKeys = "qa";
  let currentlySelected = document.querySelector(".model.selected");
  if (!currentlySelected || !allowedKeys.includes(evt.key)) {
    return;
  }
  let step = snapSizeSelector.value / 2;
  let dy = 0;
  if (key === "q") {
    dy = -step;
  } else if (key === "a") {
    dy = step;
  }
  currentlySelected.style.transform = currentlySelected.style.transform
    .replace(/translate3d\((.*?)em, (.*?)em, (.*?)em\)/, (_, x, y, z) =>
      `translate3d(${x}em, ${+y + dy}em, ${z}em)`
    );
});

// Some helpers to move models around
function coords(el) {
  let { top: y, left: x } = el.getBoundingClientRect();
  return { x, y };
}

function distance2D(ax, ay, bx, by) {
  return Math.sqrt((ax-bx)**2 + (ay-by)**2);
}

function triangleArea(a, b, c) {
  let s = (a + b + c ) / 2;
  return Math.sqrt(s * (s - a) * (s - b) * (s - c));
}

function getTileXY(mouseX, mouseY) {
  let tl = coords(floorTopLeft);
  let tr = coords(floorTopRight);
  let bl = coords(floorBottomLeft);
  let br = coords(floorBottomRight);
  
  // Get distances from corners (vertices) and mouse
  let top = distance2D(tl.x, tl.y, tr.x, tr.y);
  let left = distance2D(bl.x, bl.y, tl.x, tl.y);
  let tlmd = distance2D(tl.x, tl.y, mouseX, mouseY);
  let trmd = distance2D(tr.x, tr.y, mouseX, mouseY);
  
  let bottom = distance2D(bl.x, bl.y, br.x, br.y);
  let right = distance2D(tr.x, tr.y, br.x, br.y);
  let blmd = distance2D(bl.x, bl.y, mouseX, mouseY);
  let brmd = distance2D(br.x, br.y, mouseX, mouseY);
  
  // Calc displacements
  let dtop = 2 * triangleArea(top, tlmd, trmd) / top;
  let dleft = 2 * triangleArea(left, tlmd, blmd) / left;
  
  let dbottom = 2 * triangleArea(bottom, blmd, brmd) / bottom;
  let dright = 2 * triangleArea(right, trmd, brmd) / left;
  
  // Calc percentage displacements
  let gridSize = +gridSizeSelector.value;
  let pdx = dleft / (dleft + dright);
  let pdy = dtop / (dtop + dbottom);
  
  // Adjust decimals to snap to the grid
  let snapSize = snapSizeSelector.value / 2;
  let x = Math.floor(gridSize * pdx / snapSize) * snapSize;
  let y = Math.floor(gridSize * pdy / snapSize) * snapSize;
  
  return { x, y }
}

// Select and deselect models via delegation
sceneWrapper.addEventListener("mousedown", evt => {
  
  if (evt.button !== 0) {
    return;
  }
  
  let el = evt.target;
  let parent = el.parentElement;
  let selectedModel = document.querySelector(".model.selected");
  if (!el.classList.contains("face") && selectedModel || selectedModel) {
    selectedModel.classList.remove("selected");
  }
  if (!parent.classList.contains("notSelectable") && el.classList.contains("face")) {
    parent.classList.add("selected");
  }
});

function addCube() {
  scene.appendChild(
    createCuboid(
      "cuboid",
      0, 0, 0,
      2, 2, 2,
      "#f008",
      true
    ).model
  );
}

// Rotation cube (top left corner)
let { model: rotationCube, faceMap: rotationCubeFaceMap } = createCuboid("rotationCube", 0, 0, 0, 5, 5, 5, "#fffe", false);
document.body.appendChild(rotationCube);
rotationCube.style.top = "2.5em";
rotationCube.style.left = "2.5em";
Object.entries(rotationCubeFaceMap)
  .forEach(([name, el]) => {
  
    el.innerText = name.toUpperCase();
  
    el.addEventListener("click", () => {
      if (name === "front") {
        rx = 0;
        ry = 0;
      } else if (name === "back") {
        rx = 0;
        ry = -180;
      } else if (name === "left") {
        rx = 0;
        ry = 90;
      } else if (name === "right") {
        rx = 0;
        ry = -90;
      } else if (name === "top") {
        rx = -90;
        ry = 0;
      } else if (name === "bottom") {
        rx = 90;
        ry = 0;
      }
    });
  
  });

// Grid and snap size
let defGridSize = 30;
floor.style.width = defGridSize + "em";
floor.style.height = defGridSize + "em";
gridSizeSelector
    .addEventListener("input", evt => {
        let val = evt.target.value;
        floor.style.width = val + "em";
        floor.style.height = val + "em";
    });
snapSizeSelector
    .addEventListener("input", evt => {
        let val = evt.target.value;
        floor.style.backgroundSize = `${val}em ${val}em`;
    });

// Change perspective
let persp = 100;
let iso = 5000;
sceneWrapper.style.perspective = persp + "em";
let perspIndex = 0;
let perspectives = ["perspective", "isometric"];
let changePerspBtn = document.querySelector(".changePersp");
changePerspBtn
  .addEventListener("click", () => {
    let currPersp = perspectives[perspIndex % perspectives.length];
    if (currPersp === "perspective") {
      sceneWrapper.style.perspective = iso + "em";
      changePerspBtn.classList.remove("perspective");
      changePerspBtn.classList.add("isometric");
    } else if (currPersp === "isometric") {
      sceneWrapper.style.perspective = persp + "em";
      changePerspBtn.classList.remove("isometric");
      changePerspBtn.classList.add("perspective");
    }
    perspIndex++;
  });

// Zoom
let minZoom = 15;
let maxZoom = 150;
let zoomSteps = 1;
let zoom = 25;
let zoomv = 0;
let zooma = 0;
document.addEventListener("wheel", evt =>
  zooma += (evt.deltaY < 0) ? zoomSteps : -zoomSteps
);
document.querySelector(".zoomIn")
  .addEventListener("click", () =>
    zoom += zoomSteps
  );
document.querySelector(".zoomOut")
  .addEventListener("click", () =>
    zoom -= zoomSteps
  );

// Rotation and pan
let rx = -45;
let ry = 0;
let rvx = 0;
let rvy = 0;
let rax = 0;
let ray = 0;
// ---
let px = 0;
let py = 0;
let pvx = 0;
let pvy = 0;
let pax = 0;
let pay = 0;
document.addEventListener("contextmenu", evt =>
  evt.preventDefault()
);
sceneWrapper.addEventListener("mousedown", mdevt => {
  
  if (mdevt.button === 1) {
    mdevt.preventDefault();
  }
  
  let prevMouseX = mdevt.pageX;
  let prevMouseY = mdevt.pageY;
  
  function mouseMoveHandler(mmevt) {
    if (mdevt.button === 1) {
      pax += (mmevt.pageX - prevMouseX) * 0.07;
      pay += (mmevt.pageY - prevMouseY) * 0.07;
    } else if (mdevt.button === 2) {
      ray += (mmevt.pageX - prevMouseX) * 0.03;
      rax += (prevMouseY - mmevt.pageY) * 0.03;
    }
    prevMouseX = mmevt.pageX;
    prevMouseY = mmevt.pageY;
  }
  
  document.addEventListener("mousemove", mouseMoveHandler);
  document.addEventListener("mouseup", () =>
    document.removeEventListener("mousemove", mouseMoveHandler)
  );
});

function sceneControl() {
  zoomv += zooma - zoomv / 10;
  zoom += zoomv;
  if (zoom < minZoom) {
    zoom = minZoom;
  } else if (zoom > maxZoom) {
    zoom = maxZoom;
  }
  zooma = 0;
  sceneWrapper.style.fontSize = zoom + "px";
  
  rvx += rax - rvx / 10;
  rvy += ray - rvy / 10;
  rx += rvx;
  rx %= 360;
  ry %= 360;
  ry += rvy;
  rax = 0;
  ray = 0;
  // ---
  pvx += pax - pvx / 10;
  pvy += pay - pvy / 10;
  px += pvx;
  py += pvy;
  pax = 0;
  pay = 0;
  scene.style.transform = `
    translateX(${px}px)
    translateY(${py}px)
    rotateX(${rx}deg)
    rotateY(${ry}deg)
  `;
  rotationCube.style.transform = `
    rotateX(${rx}deg)
    rotateY(${ry}deg)
  `;
  window.requestAnimationFrame(sceneControl);
}
sceneControl();

// Create and add some cuboids
Array(1).fill(0)
  .forEach(() => {
    let x = Math.floor(Math.random() * 15) - 7.5;
    let z = Math.floor(Math.random() * 15) - 7.5;
    let width = Math.floor(Math.random() * 5) + 1;
    let height = Math.floor(Math.random() * 5) + 1;
    let depth = Math.floor(Math.random() * 5) + 1;
    let hue = Math.floor(Math.random() * 361);
    scene.appendChild(
      createCuboid(
        "cuboid",
        x, 0, z,
        width, height, depth,
        `hsla(${hue}, 100%, 50%, 75%)`,
        true
      ).model
    );
  });
