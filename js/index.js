var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var Interface;
(function (Interface_1) {
    class Value {
        constructor(id, initial, truncate = 2) {
            this.e = document.getElementById(id);
            this.truncate = truncate;
            this.setValue(initial);
        }
        setValue(value) {
            this.e.innerHTML = ((value < 0) ? "" : " ") + value.toFixed(this.truncate);
        }
    }
    class Button {
        constructor(id, onclick) {
            this.e = document.getElementById(id);
            this.e.onclick = onclick;
        }
        setInnerHTML(innerHTML) {
            this.e.innerHTML = innerHTML;
        }
        setActive(active) {
            if (active) {
                this.e.classList.add("active");
            }
            else {
                this.e.classList.remove("active");
            }
        }
    }
    class Scalar {
        constructor(id, initial, onwheel, onclick, truncate = 2) {
            this.container = document.getElementById(id + "-container");
            this.container.onwheel = onwheel;
            this.value = new Value(id + "-value", initial, truncate);
            this.reset = new Button(id + "-reset", onclick);
        }
        setValue(value) {
            this.value.setValue(value);
        }
    }
    class Handle {
        constructor(handle, id) {
            this.handle = handle;
            this.reset = new Button(id + "-reset", () => { this.handle.resetPosition(); });
            this.handleElement = document.getElementById(id + "-handle");
            this.x = new Value(id + "-x", 3);
            this.y = new Value(id + "-y", 3);
        }
        setValue(position) {
            this.x.setValue(position.x);
            this.y.setValue(position.y);
            position = Context.glRenderer.canvasToWindowPoint(position);
            position = Point.add(new Point(-remToPixels(1), -remToPixels(1)), position);
            this.handleElement.style.left = position.x + "px";
            this.handleElement.style.top = position.y + "px";
        }
        update() {
            this.setValue(this.handle.position);
        }
    }
    class ScrubHandle extends Handle {
        setValue(position) {
            this.x.setValue(position.x);
            this.y.setValue(position.y);
            position = Context.glRenderer.canvasToWindowPoint(new Point(0, 0));
            position = Point.add(new Point(-remToPixels(1), -remToPixels(1)), position);
            this.handleElement.style.left = position.x + "px";
            this.handleElement.style.top = position.y + "px";
        }
    }
    class VisibilityGroup {
        constructor(...contents) {
            this.contents = contents;
        }
        setVisible(visible) {
            this.contents.map((v) => {
                v.classList.toggle("display-none", !visible);
            });
        }
    }
    class Editor {
        update() {
            this.scaleValue.setValue(this.model.scale);
            this.allHandles.map(x => x.update());
        }
    }
    class Calibrator extends Editor {
        constructor(calibration) {
            super();
            this.model = calibration;
            this.scaleIsLocked = false;
            this.scaleReset = new Button("ruler-scale-reset", () => { this.model.onResetScale(); });
            this.scaleValue = new Value("ruler-scale-value", this.model.scale);
            this.lockScale = new Button("ruler-lock-scale", () => {
                this.scaleIsLocked = !this.scaleIsLocked;
                this.lockScale.e.classList.toggle("active", this.scaleIsLocked);
            });
            this.origin = new Handle(calibration.origin, "ruler-origin");
            this.perspective = calibration.perspective.map((handle, i) => new Handle(handle, "ruler-perspective-" + i.toString()));
            this.allHandles = [
                this.origin,
                ...this.perspective
            ];
            this.visibilityGroup = new VisibilityGroup(...["ruler-panel", "save-load-panel"].map(x => document.getElementById(x)), ...this.allHandles.map(x => x.handleElement));
        }
        getNearestHandle(position) {
            // We'll always select _a_ handle
            let best = Infinity;
            let currentHandle = -1;
            this.allHandles.map((handle, i) => {
                let x = position.x - handle.handle.position.x;
                let y = position.y - handle.handle.position.y;
                let distanceSquared = x * x + y * y;
                if (best > distanceSquared) {
                    best = distanceSquared;
                    currentHandle = i;
                }
            });
            return currentHandle;
        }
    }
    Interface_1.Calibrator = Calibrator;
    class Projector extends Editor {
        constructor(projection) {
            super();
            this.model = projection;
            this.scaleIsLocked = false;
            this.scaleReset = new Button("pattern-scale-reset", () => { this.model.onResetScale(); });
            this.scaleValue = new Value("pattern-scale-value", this.model.scale);
            this.lockScale = new Button("pattern-lock-scale", () => {
                this.scaleIsLocked = !this.scaleIsLocked;
                this.lockScale.e.classList.toggle("active", this.scaleIsLocked);
            });
            this.origin = new ScrubHandle(projection.origin, "pattern-origin");
            this.allHandles = [
                this.origin
            ];
            const patternInput = document.getElementById("pattern-input");
            patternInput.onchange = (e) => {
                Context.pdfRenderer.renderPattern(e);
            };
            this.loadPatternButton = new Button("load-pattern-button", () => {
                patternInput.click();
            });
            this.visibilityGroup = new VisibilityGroup(...["pattern-panel", "save-load-panel"].map(x => document.getElementById(x)), ...this.allHandles.map(x => x.handleElement));
        }
        getNearestHandle(position) {
            return 0;
        }
    }
    Interface_1.Projector = Projector;
    let ActiveEditor;
    (function (ActiveEditor) {
        ActiveEditor[ActiveEditor["Calibrator"] = 0] = "Calibrator";
        ActiveEditor[ActiveEditor["Hidden"] = 1] = "Hidden";
        ActiveEditor[ActiveEditor["Projector"] = 2] = "Projector";
    })(ActiveEditor = Interface_1.ActiveEditor || (Interface_1.ActiveEditor = {}));
    ;
    class Interface {
        constructor(calibration, projection) {
            this.menu = document.getElementById("menu");
            this.alignLeft = true;
            this.menu.classList.toggle("left", this.alignLeft);
            this.swapSidesButton = new Button("swap-sides-button", () => {
                this.alignLeft = !this.alignLeft;
                this.menu.classList.toggle("left", this.alignLeft);
                this.menu.classList.toggle("right", !this.alignLeft);
            });
            this.activeEditor = ActiveEditor.Calibrator;
            this.previousEditor = this.activeEditor;
            this.calibratorMenuButton = new Button("ruler-menu-button", () => {
                this.setActiveEditor(ActiveEditor.Calibrator);
            });
            this.hideMenuButton = new Button("hide-menu-button", () => {
                if (this.activeEditor == ActiveEditor.Hidden) {
                    this.setActiveEditor(this.previousEditor);
                }
                else {
                    this.previousEditor = this.activeEditor;
                    this.setActiveEditor(ActiveEditor.Hidden);
                }
            });
            this.projectorMenuButton = new Button("pattern-menu-button", () => {
                this.setActiveEditor(ActiveEditor.Projector);
            });
            this.calibrator = new Calibrator(calibration);
            this.projector = new Projector(projection);
            this.editor = this.calibrator;
            this.saveCalibration = new Button("save-calibration", () => {
                const a = this.saveCalibration.e;
                a.href = URL.createObjectURL(new Blob([Model.serialize(calibration, projection)], { type: "text/plain" }));
            });
            const calibrationInput = document.getElementById("calibration-input");
            calibrationInput.onchange = (e) => __awaiter(this, void 0, void 0, function* () {
                const file = e.target.files[0];
                const data = yield readFileAsync(file);
                Model.deserialize(data, calibration, projection);
            });
            this.loadCalibration = new Button("load-calibration", () => {
                calibrationInput.click();
            });
            this.sensitivity = 0.1;
            this.sensitivityScalar = new Scalar("precision", 0.1, (e) => {
                this.sensitivity = Math.max(0.01, this.sensitivity + e.deltaY * 0.0002);
            }, (e) => {
                this.sensitivity = 0.1;
            }, 3);
            this.currentHandle = -1;
            this.initialHandlePosition = new Point(0, 0);
            this.initialMousePosition = new Point(0, 0);
            this.setActiveEditor(ActiveEditor.Calibrator);
            this.onResize();
        }
        getActiveEditor() {
            if (this.activeEditor == ActiveEditor.Hidden) {
                return this.previousEditor;
            }
            else {
                return this.activeEditor;
            }
        }
        setActiveEditor(activeEditor) {
            this.activeEditor = activeEditor;
            switch (this.activeEditor) {
                case ActiveEditor.Calibrator:
                    this.editor = this.calibrator;
                    this.projectorMenuButton.e.classList.remove("active");
                    this.projector.visibilityGroup.setVisible(false);
                    this.calibratorMenuButton.e.classList.add("active");
                    this.calibrator.visibilityGroup.setVisible(true);
                    this.hideMenuButton.setInnerHTML("Hide");
                    break;
                case ActiveEditor.Hidden:
                    this.calibratorMenuButton.e.classList.remove("active");
                    this.calibrator.visibilityGroup.setVisible(false);
                    this.projectorMenuButton.e.classList.remove("active");
                    this.projector.visibilityGroup.setVisible(false);
                    this.hideMenuButton.setInnerHTML("Show");
                    break;
                case ActiveEditor.Projector:
                    this.editor = this.projector;
                    this.calibratorMenuButton.e.classList.remove("active");
                    this.calibrator.visibilityGroup.setVisible(false);
                    this.projectorMenuButton.e.classList.add("active");
                    this.projector.visibilityGroup.setVisible(true);
                    this.hideMenuButton.setInnerHTML("Hide");
                    break;
            }
        }
        onResize() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            Context.glCanvas.width = width;
            Context.glCanvas.height = height;
            Context.glRenderer.resizeCanvas(width, height);
        }
        onMouseDown(e) {
            this.initialMousePosition = Context.glRenderer.windowToCanvasPoint(new Point(e.pageX, e.pageY));
            this.currentHandle = this.editor.getNearestHandle(this.initialMousePosition);
            this.initialHandlePosition = this.editor.allHandles[this.currentHandle].handle.position;
        }
        onMouseMove(e) {
            if (this.currentHandle < 0) {
                return;
            }
            const mousePosition = Context.glRenderer.windowToCanvasPoint(new Point(e.pageX, e.pageY));
            let canvasPosition = Point.add(this.initialHandlePosition, Point.scale(Point.sub(mousePosition, this.initialMousePosition), this.sensitivity));
            this.editor.allHandles[this.currentHandle].handle.position = canvasPosition;
        }
        onMouseUp() {
            this.currentHandle = -1;
        }
        onWheel(e) {
            if (!this.editor.scaleIsLocked) {
                this.editor.model.onChangeScale(e.deltaY * this.sensitivity);
            }
        }
        onUpdate() {
            this.calibrator.update();
            this.projector.update();
            this.sensitivityScalar.setValue(this.sensitivity);
        }
    }
    Interface_1.Interface = Interface;
})(Interface || (Interface = {}));
var GL;
(function (GL) {
    class Vertex {
        constructor(position, uv, color, weight) {
            this.position = position;
            this.uv = uv;
            this.color = color;
            this.weight = weight;
            this.position = position;
            this.uv = uv;
            this.color = color;
            this.weight = weight;
        }
    }
    class Plane {
        constructor(width, height, primitive) {
            this.width = width;
            this.height = height;
            this.primitive = primitive;
            this.width = width;
            this.height = height;
            this.primitive = primitive;
        }
        computeProjection(p1, p2, p3, p4) {
            const basisToPoints = (p1, p2, p3, p4) => {
                const m = new Matrix3([
                    p1.x, p2.x, p3.x,
                    p1.y, p2.y, p3.y,
                    1, 1, 1
                ]);
                const v = Matrix3.mulVector3(Matrix3.adjugate(m), new Vector3(p4.x, p4.y, 1));
                return Matrix3.mul(m, new Matrix3([
                    v.x, 0, 0,
                    0, v.y, 0,
                    0, 0, v.z
                ]));
            };
            const s = basisToPoints(new Point(0, 0), new Point(this.width, 0), new Point(0, this.height), new Point(this.width, this.height));
            const d = basisToPoints(p1, p2, p3, p4);
            const t = Matrix3.mul(d, Matrix3.adjugate(s));
            const _ = t._;
            for (let i = 0; i < 9; i++) {
                _[i] = _[i] / _[8];
            }
            return new Matrix4([
                _[0], _[3], 0, _[6],
                _[1], _[4], 0, _[7],
                0, 0, 1, 0,
                _[2], _[5], 0, _[8],
            ]);
        }
    }
    GL.Plane = Plane;
    class Primitive {
        constructor(mode, first, count) {
            this.mode = mode;
            this.first = first;
            this.count = count;
            this.mode = mode;
            this.first = first;
            this.count = count;
        }
    }
    const FLOATS_PER_VERTEX = 12;
    const MAX_VERTEX_COUNT = 8192;
    class Renderer {
        constructor(gl, orthographicScale) {
            this.gl = gl;
            this.gl = gl;
            // Create the matrix uniform buffer
            {
                const buffer = gl.createBuffer();
                gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
                gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, buffer);
                const data = new Float32Array(48);
                data.set(Matrix4.identity()._, 0);
                data.set(Matrix4.identity()._, 16);
                data.set(Matrix4.model(new Point(0, 0), 1)._, 32);
                gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW);
            }
            // Create vertex buffer
            {
                const buffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, 4 * FLOATS_PER_VERTEX * MAX_VERTEX_COUNT, gl.STATIC_DRAW);
                // Position
                gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 48, 0);
                gl.enableVertexAttribArray(0);
                // UV
                gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 48, 8);
                gl.enableVertexAttribArray(1);
                // Color
                gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 48, 16);
                gl.enableVertexAttribArray(2);
                // Weight
                gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 48, 32);
                gl.enableVertexAttribArray(3);
            }
            this.vertexCount = 0;
            this.vertices = new Float32Array(FLOATS_PER_VERTEX * MAX_VERTEX_COUNT);
            gl.clearColor(1.0, 0.0, 0.0, 1.0);
            gl.disable(gl.DEPTH_TEST);
            this.orthographicScale = orthographicScale;
        }
        setProjectionMatrix(matrix) {
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, matrix._);
        }
        setViewMatrix(matrix) {
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 4 * 16, matrix._);
        }
        setModelMatrix(matrix) {
            this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 4 * 32, matrix._);
        }
        resizeCanvas(width, height) {
            this.gl.viewport(0, 0, width, height);
            this.setProjectionMatrix(Matrix4.orthographic(width / this.orthographicScale, height / this.orthographicScale));
        }
        uploadVertices() {
            this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.vertices, 0, FLOATS_PER_VERTEX * this.vertexCount);
        }
        loadTexture(url) {
            const gl = this.gl;
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
            const image = new Image();
            image.onload = function () {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.generateMipmap(gl.TEXTURE_2D);
            };
            image.src = url;
            return texture;
        }
        createProgram(vert, frag) {
            const gl = this.gl;
            const vertShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertShader, vert);
            gl.compileShader(vertShader);
            const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragShader, frag);
            gl.compileShader(fragShader);
            const program = gl.createProgram();
            gl.attachShader(program, vertShader);
            gl.attachShader(program, fragShader);
            gl.linkProgram(program);
            gl.useProgram(program);
            {
                const index = gl.getUniformBlockIndex(program, "Matrices");
                gl.uniformBlockBinding(program, index, 0);
            }
            {
                const index = gl.getUniformLocation(program, "uni_texture");
                gl.uniform1i(index, 0);
            }
            return program;
        }
        useTexture(texture) {
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        }
        useProgram(program) {
            this.gl.useProgram(program);
        }
        copyVerticesToBuffer(vertices) {
            for (let i = 0; i < vertices.length; i++, this.vertexCount++) {
                const vertex = vertices[i];
                const index = this.vertexCount * FLOATS_PER_VERTEX;
                this.vertices[index] = vertex.position.x;
                this.vertices[index + 1] = vertex.position.y;
                this.vertices[index + 2] = vertex.uv.x;
                this.vertices[index + 3] = vertex.uv.y;
                this.vertices[index + 4] = vertex.color[0];
                this.vertices[index + 5] = vertex.color[1];
                this.vertices[index + 6] = vertex.color[2];
                this.vertices[index + 7] = vertex.color[3];
                this.vertices[index + 8] = vertex.weight[0];
                this.vertices[index + 9] = vertex.weight[1];
                this.vertices[index + 10] = vertex.weight[2];
                this.vertices[index + 11] = vertex.weight[3];
            }
        }
        newPlaneUsingFunction(width, height, resolution, func) {
            const vertexCount = 6 * resolution * resolution;
            const vertices = new Array(vertexCount);
            for (let x = 0; x < resolution; x++) {
                for (let y = 0; y < resolution; y++) {
                    const xres = (x / resolution);
                    const x1res = ((x + 1) / resolution);
                    const yres = (y / resolution);
                    const y1res = ((y + 1) / resolution);
                    const nw = func(new Point(xres, yres));
                    const ne = func(new Point(x1res, yres));
                    const se = func(new Point(x1res, y1res));
                    const sw = func(new Point(xres, y1res));
                    const index = 6 * (x + y * resolution);
                    vertices[index] = nw;
                    vertices[index + 1] = sw;
                    vertices[index + 2] = se;
                    vertices[index + 3] = nw;
                    vertices[index + 4] = se;
                    vertices[index + 5] = ne;
                }
            }
            const first = this.vertexCount;
            const count = vertexCount;
            this.copyVerticesToBuffer(vertices);
            return new Plane(width, height, new Primitive(this.gl.TRIANGLES, first, count));
        }
        randomColor() {
            return [Math.random(), Math.random(), Math.random(), 1];
        }
        newPlane(width, height, resolution) {
            return this.newPlaneUsingFunction(width, height, resolution, (position) => {
                const mappedPosition = Point.map(position, 0, 1, 0, 1);
                return new Vertex(mappedPosition, position, this.randomColor(), [mappedPosition.x, mappedPosition.y, 1, 1]);
            });
        }
        drawPrimitive(primitive) {
            this.gl.drawArrays(primitive.mode, primitive.first, primitive.count);
        }
        canvasToWindowPoint(p) {
            return new Point((p.x * this.orthographicScale) + (window.innerWidth / 2), (window.innerHeight / 2) - (p.y * this.orthographicScale));
        }
        windowToCanvasPoint(p) {
            return new Point((p.x - (window.innerWidth / 2)) / this.orthographicScale, ((window.innerHeight / 2) - p.y) / this.orthographicScale);
        }
        windowToCanvasScalar(s) {
            return s / this.orthographicScale;
        }
    }
    GL.Renderer = Renderer;
})(GL || (GL = {}));
const map = (x, inMin, inMax, outMin, outMax) => {
    return outMin + (outMax - outMin) * (x - inMin) / (inMax - inMin);
};
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.x = x;
        this.y = y;
    }
    clone() {
        return new Point(this.x, this.y);
    }
    static add(a, b) {
        return new Point(a.x + b.x, a.y + b.y);
    }
    static map(x, inMin, inMax, outMin, outMax) {
        return new Point(map(x.x, inMin, inMax, outMin, outMax), map(x.y, inMin, inMax, outMin, outMax));
    }
    static scale(p, s) {
        return new Point(p.x * s, p.y * s);
    }
    static sub(a, b) {
        return new Point(a.x - b.x, a.y - b.y);
    }
}
class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
class Matrix3 {
    constructor(_) {
        this._ = _;
        this._ = _;
    }
    static adjugate(m) {
        const _ = m._;
        return new Matrix3([
            _[4] * _[8] - _[5] * _[7], _[2] * _[7] - _[1] * _[8], _[1] * _[5] - _[2] * _[4],
            _[5] * _[6] - _[3] * _[8], _[0] * _[8] - _[2] * _[6], _[2] * _[3] - _[0] * _[5],
            _[3] * _[7] - _[4] * _[6], _[1] * _[6] - _[0] * _[7], _[0] * _[4] - _[1] * _[3]
        ]);
    }
    static mul(a, b) {
        let c = new Matrix3(new Array(9));
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let sum = 0;
                for (let k = 0; k < 3; k++) {
                    sum += a._[3 * i + k] * b._[3 * k + j];
                }
                c._[3 * i + j] = sum;
            }
        }
        return c;
    }
    static mulVector3(m, v) {
        return new Vector3(m._[0] * v.x + m._[1] * v.y + m._[2] * v.z, m._[3] * v.x + m._[4] * v.y + m._[5] * v.z, m._[6] * v.x + m._[7] * v.y + m._[8] * v.z);
    }
}
class Matrix4 {
    constructor(_) {
        this._ = new Float32Array(_);
    }
    static mul(a, b) {
        let c = new Matrix4(new Array(16));
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += a._[4 * i + k] * b._[4 * k + j];
                }
                c._[4 * i + j] = sum;
            }
        }
        return c;
    }
    static identity() {
        return new Matrix4([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
    static model(position, scale) {
        return new Matrix4([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            position.x, position.y, 0, 1
        ]);
    }
    static model2(position, scale) {
        return new Matrix4([
            scale.x, 0, 0, 0,
            0, scale.y, 0, 0,
            0, 0, 1, 0,
            position.x, position.y, 0, 1
        ]);
    }
    static orthographic(x, y) {
        const left = x / -2.0;
        const right = x / 2.0;
        const bottom = y / -2.0;
        const top = y / 2.0;
        const far = -1000;
        const near = 1000;
        return new Matrix4([
            2.0 / (right - left), 0, 0, 0,
            0, 2.0 / (top - bottom), 0, 0,
            0, 0, -2.0 / (far - near), 0,
            -(right + left) / (right - left),
            -(top + bottom) / (top - bottom),
            -(far + near) / (far - near),
            1.0
        ]);
    }
    static scale(scale) {
        return new Matrix4([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
    static scale2(scale) {
        return new Matrix4([
            scale.x, 0, 0, 0,
            0, scale.y, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
    static translation(position) {
        return Matrix4.model(position, 1);
    }
}
var Model;
(function (Model_1) {
    class Handle {
        constructor(position) {
            this.defaultPosition = position.clone();
            this.position = position;
        }
        resetPosition() {
            this.position = this.defaultPosition;
        }
    }
    Model_1.Handle = Handle;
    class Model {
        constructor(scale) {
            this.defaultScale = scale;
            this.scale = scale;
            this.origin = new Handle(new Point(0, 0));
        }
        getModelMatrix() {
            return Matrix4.mul(Matrix4.translation(Point.scale(this.origin.position, 1 / (4 * this.scale))), Matrix4.mul(Matrix4.translation(new Point(-0.5, -0.5)), Matrix4.mul(Matrix4.scale(this.scale), Matrix4.translation(new Point(0.5, 0.5)))));
        }
        onResetScale() {
            this.scale = this.defaultScale;
        }
        onChangeScale(s) {
            this.scale = Math.max(0.00001, this.scale + s * 0.01);
        }
    }
    Model_1.Model = Model;
    class Calibration extends Model {
        constructor(scale) {
            super(scale);
            this.perspective = new Array(new Handle(new Point(-scale, -scale)), new Handle(new Point(scale, -scale)), new Handle(new Point(-scale, scale)), new Handle(new Point(scale, scale)));
        }
        getProjectionMatrix(plane) {
            return plane.computeProjection(this.perspective[0].position, this.perspective[1].position, this.perspective[2].position, this.perspective[3].position);
        }
    }
    Model_1.Calibration = Calibration;
    class Projection extends Model {
        getModelMatrix() {
            const pdfDimensions = new Point(Context.pdfCanvas.width, Context.pdfCanvas.height);
            const scaledPdfDimensions = Point.scale(pdfDimensions, 1 / Context.glRenderer.orthographicScale);
            const scaledPosition = new Point(this.origin.position.x / (4 * this.scale * scaledPdfDimensions.x), this.origin.position.y / (4 * this.scale * scaledPdfDimensions.y));
            return Matrix4.mul(Matrix4.translation(scaledPosition), Matrix4.mul(Matrix4.translation(new Point(-0.5, -0.5)), Matrix4.mul(Matrix4.scale2(Point.scale(scaledPdfDimensions, this.scale)), Matrix4.translation(new Point(0.5, 0.5)))));
        }
        onChangeScale(s) {
            this.scale = Math.max(0.00001, this.scale + s * 0.0005);
        }
    }
    Model_1.Projection = Projection;
    function serialize(calibration, projection) {
        return JSON.stringify({
            version: "v0.1.0",
            calibration: {
                scale: calibration.scale,
                origin: calibration.origin.position,
                perspective: [...calibration.perspective.map(x => x.position)]
            },
            projection: {
                scale: projection.scale,
                origin: projection.origin.position
            }
        }, null, 2);
    }
    Model_1.serialize = serialize;
    function deserialize(json, calibration, projection) {
        const data = JSON.parse(json);
        calibration.scale = data.calibration.scale;
        calibration.origin.position = data.calibration.origin;
        calibration.perspective.map((x, i) => { x.position = data.calibration.perspective[i]; });
        projection.scale = data.projection.scale;
        projection.origin.position = data.projection.origin;
    }
    Model_1.deserialize = deserialize;
})(Model || (Model = {}));
var PDF;
(function (PDF) {
    class Renderer {
        constructor() {
            Context.pdfCanvas.width = 1;
            Context.pdfCanvas.height = 1;
            this.context = Context.pdfCanvas.getContext("2d");
            {
                const gl = Context.gl;
                this.texture = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 0, 255]));
            }
        }
        renderPattern(e) {
            return __awaiter(this, void 0, void 0, function* () {
                const file = e.target.files[0];
                const data = yield readFileAsync(file);
                const pdf = yield pdfjsLib.getDocument({ data: data }).promise;
                const pageNumber = 1;
                const page = yield pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1.0 });
                Context.pdfCanvas.width = viewport.width;
                Context.pdfCanvas.height = viewport.height;
                yield page.render({
                    canvasContext: this.context,
                    viewport: viewport
                }).promise;
                {
                    const gl = Context.gl;
                    gl.bindTexture(gl.TEXTURE_2D, this.texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, Context.pdfCanvas);
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
            });
        }
    }
    PDF.Renderer = Renderer;
})(PDF || (PDF = {}));
const rulerVert = `#version 300 es
precision mediump float;

layout (std140) uniform Matrices {
    mat4 projection;
    mat4 view;
    mat4 model;
};

uniform mat4 in_bones[4];

layout (location=0) in vec2 in_position;
layout (location=1) in vec2 in_uv;
layout (location=2) in vec4 in_color;
layout (location=3) in vec4 in_weights;

out vec4 inout_color;
out vec2 inout_uv;

void main(void) {
    gl_Position = projection * view * model * vec4(in_position, 1, 1);
    inout_color = in_color;
    inout_uv = in_uv;
}
`;
const rulerFrag = `#version 300 es
precision mediump float;

in vec4 inout_color;
in vec2 inout_uv;

uniform sampler2D uni_texture;

out vec4 out_color;

void main(void) {
    out_color = texture(uni_texture, inout_uv * 8.0);
}
`;
const patternFrag = `#version 300 es
precision mediump float;

in vec4 inout_color;
in vec2 inout_uv;

uniform sampler2D uni_texture;

out vec4 out_color;

void main(void) {
    out_color = texture(uni_texture, vec2(inout_uv.x, -inout_uv.y));
}
`;
const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);
function remToPixels(rem) {
    return rem * REM_TO_PIXELS;
}
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
    });
}
var Context;
(function (Context) {
    Context.calibration = new Model.Calibration(2.0);
    Context.projection = new Model.Projection(0.5);
    Context.glCanvas = document.getElementById("gl-canvas");
    Context.gl = Context.glCanvas.getContext("webgl2");
    Context.glRenderer = new GL.Renderer(Context.gl, 100);
    Context.pdfCanvas = document.getElementById("pdf-canvas");
    Context.pdfRenderer = new PDF.Renderer();
    (() => {
        const interface = new Interface.Interface(Context.calibration, Context.projection);
        const rulerProgram = Context.glRenderer.createProgram(rulerVert, rulerFrag);
        const rulerTexture = Context.glRenderer.loadTexture("assets/ruler.png");
        const rulerPlane = Context.glRenderer.newPlane(1, 1, 8);
        const patternProgram = Context.glRenderer.createProgram(rulerVert, patternFrag);
        Context.glRenderer.uploadVertices();
        window.onresize = () => { interface.onResize(); };
        // Listen to mousedown and wheel events on the _canvas_, as we're only interested in them occuring over the canvas
        Context.glCanvas.onwheel = (e) => { interface.onWheel(e); };
        Context.glCanvas.onmousedown = (e) => { interface.onMouseDown(e); };
        // Listen to mouseup and mousemove events on the _window_, as it's important to get these events wherever they are triggered
        window.onmousemove = (e) => { interface.onMouseMove(e); };
        window.onmouseup = () => { interface.onMouseUp(); };
        const animationFrame = () => {
            requestAnimationFrame(animationFrame);
            interface.onUpdate();
            Context.glRenderer.setModelMatrix(interface.editor.model.getModelMatrix());
            Context.glRenderer.setViewMatrix(Context.calibration.getProjectionMatrix(rulerPlane));
            switch (interface.getActiveEditor()) {
                case (Interface.ActiveEditor.Calibrator):
                    Context.glRenderer.useProgram(rulerProgram);
                    Context.glRenderer.useTexture(rulerTexture);
                    break;
                case (Interface.ActiveEditor.Projector):
                    Context.glRenderer.useProgram(patternProgram);
                    Context.glRenderer.useTexture(Context.pdfRenderer.texture);
                    break;
            }
            Context.glRenderer.drawPrimitive(rulerPlane.primitive);
        };
        animationFrame();
    })();
})(Context || (Context = {}));
