var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as math from "./math.js";
import * as model from "./model.js";
import * as pdf from "./pdf.js";
import * as render from "./render.js";
import { readFileAsync } from "./std.js";
export { Editor, Renderer, Scalar, };
const CORNER_MOVEMENT = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1]
];
const SCROLL_SCALAR = 0.001;
const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);
class Editor {
    constructor(myModel, myRenderer, canvas) {
        this.model = myModel;
        // Menu
        const menu = document.getElementById("menu");
        menu.classList.add("left");
        document.getElementById("swap").onclick = () => {
            menu.classList.toggle("left");
            menu.classList.toggle("right");
        };
        document.getElementById("hide").onclick = () => {
            menu.classList.toggle("drawer");
            menu.classList.toggle("collapsed");
        };
        // Panel controls
        for (let e of document.getElementsByClassName("drawer")) {
            e.firstElementChild.onclick = () => {
                e.classList.toggle("collapsed");
            };
        }
        // Precision
        const precision = new Scalar(this.model.precision, document.getElementById("precision-field"));
        // Display panel
        const displayTabview = new Tabview(document.getElementById("ruler-tab"), [
            document.getElementById("ruler-contents"),
        ], () => {
            this.model.displayMode = model.DisplayMode.Ruler;
        });
        displayTabview.push(document.getElementById("pattern-tab"), [
            document.getElementById("pattern-contents"),
        ], () => {
            this.model.displayMode = model.DisplayMode.Pattern;
        });
        displayTabview.show(this.model.displayMode);
        // Ruler
        const pixelsPerLine = new IntegerScalar(this.model.pixelsPerLine, document.getElementById("pixels-per-line-field"));
        const unitsPerQuad = new IntegerScalar(this.model.unitsPerQuad, document.getElementById("units-per-quad-field"));
        // Pattern
        const patternInput = document.getElementById("pattern-input");
        patternInput.onchange = (e) => __awaiter(this, void 0, void 0, function* () {
            let file = e.target.files[0];
            const [x, y] = yield pdf.renderPdf(file);
            const max = Math.max(x, y);
            myRenderer.tPattern.fromTexImageSource(pdf.canvas);
            myRenderer.mPattern.renewPlane([-(x / 2), -(y / 2)], [x, y], [0, 0], [x / max, -(y / max)]);
        });
        document.getElementById("pattern-button").onclick = () => {
            patternInput.click();
        };
        // Calibration panel
        const calibrationTabview = new Tabview(document.getElementById("keystone-tab"), [
            document.getElementById("keystone-handles"),
            document.getElementById("keystone-contents"),
        ], () => {
            this.model.calibrationMode = model.CalibrationMode.Keystone;
        });
        calibrationTabview.push(document.getElementById("pan-tab"), [
            document.getElementById("pan-handles"),
            document.getElementById("pan-contents"),
        ], () => {
            this.model.calibrationMode = model.CalibrationMode.PanZoom;
        });
        calibrationTabview.show(this.model.calibrationMode);
        // Keystone
        this.keystoneHandles = [null, null, null, null];
        const editors = ["corner-ne-field", "corner-nw-field", "corner-sw-field", "corner-se-field"];
        const handles = ["corner-ne-handle", "corner-nw-handle", "corner-sw-handle", "corner-se-handle"];
        for (let i = 0; i < 4; i++) {
            this.keystoneHandles[i] = new Handle(this.model.corners[i], document.getElementById(editors[i]), document.getElementById(handles[i]));
            this.keystoneHandles[i].view();
        }
        this.activeHandle = null;
        document.getElementById("reset-all-corners").onclick = () => {
            for (let i = 0; i < 4; i++) {
                this.model.corners[i].reset();
                this.keystoneHandles[i].view();
            }
        };
        // Pan & Zoom
        this.panHandle = new ScrubHandle(this.model.pan, document.getElementById("pan-field"), document.getElementById("pan-handle"));
        this.panHandle.view();
        this.zoom = new Scalar(this.model.zoom, document.getElementById("zoom-field"));
        // Save, Load Configuration
        const saveCalibration = document.getElementById("save-calibration");
        saveCalibration.onclick = () => {
            saveCalibration.download = `Pattern Projector Calibration - ${Date.now().toString()}.txt`;
            saveCalibration.href = URL.createObjectURL(new Blob([this.model.serialize()], { type: "text/plain" }));
        };
        const calibrationInput = document.getElementById("calibration-input");
        calibrationInput.onchange = (e) => __awaiter(this, void 0, void 0, function* () {
            const file = e.target.files[0];
            const data = yield readFileAsync(file);
            const str = new TextDecoder().decode(data);
            const status = this.model.deserialize(str);
            if (status == model.DeserializationStatus.SyntaxError) {
                alert("Syntax Error: The chosen file is either not a valid JSON file, or has become corrupted.");
            }
            else if (status == model.DeserializationStatus.VersionError) {
                alert("Version Error: The configuration was saved with a non-compatible version of Pattern Projector");
            }
            // Update all views
            precision.view();
            displayTabview.show(this.model.displayMode);
            pixelsPerLine.view();
            unitsPerQuad.view();
            calibrationTabview.show(this.model.calibrationMode);
            this.keystoneHandles.forEach((handle) => handle.view());
            this.panHandle.view();
            this.zoom.view();
        });
        document.getElementById("load-calibration").onclick = () => {
            calibrationInput.click();
        };
        // Global event handlers
        canvas.onwheel = (e) => {
            this.onWheel(e);
        };
        canvas.onmousedown = (e) => {
            switch (this.model.calibrationMode) {
                case model.CalibrationMode.Keystone:
                    this.activeHandle = this.selectNearestHandle(new math.Vector2([
                        e.pageX - (window.innerWidth / 2.0),
                        (window.innerHeight / 2.0) - e.pageY
                    ]), this.keystoneHandles);
                    break;
                case model.CalibrationMode.PanZoom:
                    this.activeHandle = this.panHandle;
                    break;
            }
            this.activeHandle.onMouseDown(new math.Vector2([e.pageX, e.pageY]));
        };
        window.onmousemove = (e) => {
            if (!this.activeHandle) {
                return;
            }
            this.activeHandle.onMouseMove(new math.Vector2([e.pageX, e.pageY]));
        };
        window.onmouseup = (e) => {
            if (!this.activeHandle) {
                return;
            }
            this.activeHandle.onMouseUp(new math.Vector2([e.pageX, e.pageY]));
            this.activeHandle = null;
        };
    }
    onResize(width, height) {
        for (const handle of this.keystoneHandles) {
            handle.view();
        }
        this.panHandle.view();
    }
    onWheel(e) {
        switch (this.model.calibrationMode) {
            case model.CalibrationMode.PanZoom:
                {
                    const deltaZoom = (e.deltaY);
                    this.model.zoom.add(deltaZoom);
                    this.zoom.view();
                }
                break;
            case model.CalibrationMode.Keystone:
                {
                    const delta = 1.0 + (e.deltaY * this.model.precision.get()) * SCROLL_SCALAR;
                    // console.log(delta);
                    // const delta = (e.deltaY
                    // const delta = e.deltaY * SCROLL_SCALAR;
                    for (let i = 0; i < 4; i++) {
                        this.model.corners[i].bypassMul(delta, delta);
                        this.keystoneHandles[i].view();
                    }
                }
                break;
        }
    }
    selectNearestHandle(mouse, handles) {
        let shortestDistance = Infinity;
        let nearestHandle = handles[0];
        for (const handle of handles) {
            const point = handle.value.getVector2();
            const distance = mouse.distanceTo(point);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestHandle = handle;
            }
        }
        return nearestHandle;
    }
}
class Handle {
    constructor(value, e, handle = null) {
        this.value = value;
        this.displayX = e.querySelector("#display-x");
        this.displayY = e.querySelector("#display-y");
        this.view();
        e.querySelector("#field-x").onwheel = (e) => {
            this.value.x.add(e.deltaY);
            this.view();
        };
        e.querySelector("#field-y").onwheel = (e) => {
            this.value.y.add(e.deltaY);
            this.view();
        };
        e.querySelector("#reset").onclick = () => {
            this.value.reset();
            this.view();
        };
        this.handle = handle;
        this.initialMousePosition = new math.Vector2();
        this.deltaMousePosition = new math.Vector2();
        this.initialModelPosition = new math.Vector2();
    }
    onMouseDown(position) {
        this.initialMousePosition = position;
        this.initialModelPosition = this.value.getVector2();
    }
    onMouseMove(position) {
        this.deltaMousePosition = position.sub(this.initialMousePosition);
        const delta = this.deltaMousePosition.scale(this.value.x.scalar.get());
        const current = new math.Vector2([
            this.initialModelPosition.buffer[0] + delta.buffer[0],
            this.initialModelPosition.buffer[1] - delta.buffer[1]
        ]);
        this.value.x.set(current.buffer[0]);
        this.value.y.set(current.buffer[1]);
        this.view();
    }
    onMouseUp(position) {
    }
    view() {
        let x = this.value.x.get();
        let y = this.value.y.get();
        this.displayX.innerText = x.toFixed(3);
        this.displayY.innerText = y.toFixed(3);
        if (this.handle) {
            this.handle.style.left = x + (window.innerWidth / 2) - REM_TO_PIXELS + "px";
            this.handle.style.top = (window.innerHeight / 2) - y - REM_TO_PIXELS + "px";
        }
    }
}
class ScrubHandle extends Handle {
    constructor(value, e, handle = null) {
        super(value, e, handle);
        this.baseHandlePosition = value.getVector2();
    }
    onMouseUp(position) {
        this.deltaMousePosition.buffer[0] = 0;
        this.deltaMousePosition.buffer[1] = 0;
        this.view();
    }
    view() {
        let x = this.value.x.get();
        let y = this.value.y.get();
        this.displayX.innerText = x.toFixed(3);
        this.displayY.innerText = y.toFixed(3);
        if (this.handle) {
            x = this.baseHandlePosition.buffer[0] + this.deltaMousePosition.buffer[0];
            y = this.baseHandlePosition.buffer[1] - this.deltaMousePosition.buffer[1];
            this.handle.style.left = x + (window.innerWidth / 2) - REM_TO_PIXELS + "px";
            this.handle.style.top = (window.innerHeight / 2) - y - REM_TO_PIXELS + "px";
        }
    }
}
class Scalar {
    constructor(value, e) {
        this.value = value;
        this.display = e.querySelector("#display");
        this.view();
        e.onwheel = (e) => {
            this.value.add(e.deltaY);
            this.view();
        };
        e.querySelector("#reset").onclick = () => {
            this.value.reset();
            this.view();
        };
        let decr = e.querySelector("#decrement");
        if (decr) {
            decr.onclick = () => {
                this.value.bypassAdd(-1);
                this.view();
            };
        }
        let incr = e.querySelector("#increment");
        if (incr) {
            incr.onclick = () => {
                this.value.bypassAdd(1);
                this.view();
            };
        }
    }
    view() {
        this.display.innerText = this.value.get().toFixed(3);
    }
}
class IntegerScalar extends Scalar {
    view() {
        this.display.innerText = this.value.get().toFixed(0);
    }
}
class Tabview {
    constructor(tab, contents, onSwitch = null) {
        this.activeTab = 0;
        this.tabs = new Array();
        this.contents = new Array();
        this.onSwitches = new Array();
        this.push(tab, contents, onSwitch);
    }
    push(tab, contents, onSwitch = null) {
        const index = this.tabs.length;
        this.tabs.push(tab);
        this.contents.push(contents);
        this.onSwitches.push(onSwitch);
        tab.onclick = (event) => {
            if (this.activeTab != index) {
                this.activeTab = index;
                this.show(index);
                event.stopPropagation();
            }
        };
    }
    show(index) {
        var _a, _b;
        for (let i = 0; i < this.tabs.length; i++) {
            if (i == index) {
                this.tabs[i].classList.add("active");
                for (const content of this.contents[i]) {
                    content.classList.remove("display-none");
                }
                (_b = (_a = this.onSwitches)[i]) === null || _b === void 0 ? void 0 : _b.call(_a);
            }
            else {
                this.tabs[i].classList.remove("active");
                for (const content of this.contents[i]) {
                    content.classList.add("display-none");
                }
            }
        }
    }
}
class Renderer {
    constructor(myModel) {
        this.model = myModel;
        const buffer = new render.Buffer();
        this.mRuler = buffer.newPlane([-1, -1], [3, 3]);
        this.pRuler = new render.Program("glsl/standard.vert", "glsl/ruler.frag", [
            ["u_color", [0, 0, 0, 1]],
            ["u_background_color", [1, 1, 1, 1]],
            ["u_distance", [myModel.corners[0].distanceTo(myModel.corners[1])]],
            ["u_resolution", [myModel.unitsPerQuad.get()]],
            ["u_width", [4.0]]
        ]);
        this.mPattern = buffer.newPlane([-250, -250], [500, 500], [0, 0], [1, 1]);
        this.pPattern = new render.Program("glsl/standard.vert", "glsl/pattern.frag", [
            ["u_texture", [0]]
        ]);
        this.tPattern = new render.Texture();
        this.tPattern.fromImageUrl("assets/ruler.png");
    }
    onAnimationFrame() {
        const skew = math.Matrix4.skew([
            new math.Vector2([1, 1]),
            new math.Vector2([0, 1]),
            new math.Vector2([0, 0]),
            new math.Vector2([1, 0])
        ], this.model.getCornersAsVectors());
        render.setView(skew);
        switch (this.model.displayMode) {
            case model.DisplayMode.Pattern:
                const pan = this.model.pan.getVector2();
                pan.buffer[0] += 100;
                pan.buffer[1] += 100;
                pan.buffer[0] /= 200;
                pan.buffer[1] /= 200;
                const zoom = this.model.zoom.get() / 500;
                this.tPattern.bind();
                this.mPattern.draw(this.pPattern, math.Matrix4.model(pan, zoom * 0.01));
                break;
            case model.DisplayMode.Ruler:
                this.mRuler.draw(this.pRuler, new math.Matrix4(), [
                    ["u_distance", [this.model.corners[0].distanceTo(this.model.corners[1])]],
                    ["u_resolution", [this.model.unitsPerQuad.get()]],
                    ["u_width", [this.model.pixelsPerLine.get()]],
                ]);
                break;
        }
    }
}
