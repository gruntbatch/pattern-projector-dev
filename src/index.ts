// TODO
// [x] Handle sensitivity
// [x] Ruler zooming
// [x] Handle appearance
// [x] change where planes originate
// [x] scale scene origin
// [x] move scene origin along xy plane
// [x] Swap menu placement?
// [x] display debug info on two lines
// [x] fix handles blocking clicks
// [x] fix dragging off of the canvas bounds
// [x] style handles
// use texture for ruler
// swap out ruler textures based on zoom
// set handles to box size mode
// save and load calibration
// upload pattern pdf
// render pattern pdf to canvas
// use rendered pattern canvas as texture
// draw pattern
// Split zoom and scale?

const handleVert = `#include("src/handle.vert")`
const handleFrag = `#include("src/handle.frag")`;
const rulerVert = `#include("src/ruler.vert")`;
const rulerFrag = `#include("src/ruler.frag")`;

const map = (x: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
    return outMin + (outMax - outMin) * (x - inMin) / (inMax - inMin);
}

class Point {
    constructor(public x: number, public y: number) {
        this.x = x;
        this.y = y;
    }

    static add(a: Point, b: Point): Point {
        return new Point(a.x + b.x, a.y + b.y);
    }

    static map(x: Point, inMin: number, inMax: number, outMin: number, outMax: number): Point {
        return new Point(
            map(x.x, inMin, inMax, outMin, outMax),
            map(x.y, inMin, inMax, outMin, outMax)
        );
    }

    static scale(p: Point, s: number): Point {
        return new Point(p.x * s, p.y * s);
    }

    static sub(a: Point, b: Point): Point {
        return new Point(a.x - b.x, a.y - b.y);
    }
}

class Vector3 {
    constructor(public x: number, public y: number, public z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class Matrix3 {
    constructor(public _: Array<number>) {
        this._ = _;
    }

    static adjugate(m: Matrix3): Matrix3 {
        const _ = m._;
        return new Matrix3([
            _[4] * _[8] - _[5] * _[7], _[2] * _[7] - _[1] * _[8], _[1] * _[5] - _[2] * _[4],
            _[5] * _[6] - _[3] * _[8], _[0] * _[8] - _[2] * _[6], _[2] * _[3] - _[0] * _[5],
            _[3] * _[7] - _[4] * _[6], _[1] * _[6] - _[0] * _[7], _[0] * _[4] - _[1] * _[3]
        ])
    }

    static mul(a: Matrix3, b: Matrix3): Matrix3 {
        let c = new Matrix3(new Array<number>(9));
        
        for (let i=0; i<3; i++) {
            for (let j=0; j<3; j++) {
                let sum = 0;
                for (let k=0; k<3; k++) {
                    sum += a._[3 * i + k] * b._[3 * k + j];
                }
                c._[3 * i + j] = sum;
            }
        }

        return c;
    }

    static mulVector3(m: Matrix3, v: Vector3): Vector3 {
        return new Vector3(
            m._[0] * v.x + m._[1] * v.y + m._[2] * v.z,
            m._[3] * v.x + m._[4] * v.y + m._[5] * v.z,
            m._[6] * v.x + m._[7] * v.y + m._[8] * v.z
        )
    }
}

class Matrix4 {
    public _: Float32Array;

    constructor(_: Array<number>) {
        this._ = new Float32Array(_);
    }

    static mul(a: Matrix4, b: Matrix4): Matrix4 {
        let c = new Matrix4(new Array<number>(16));
        
        for (let i=0; i<4; i++) {
            for (let j=0; j<4; j++) {
                let sum = 0;
                for (let k=0; k<4; k++) {
                    sum += a._[4 * i + k] * b._[4 * k + j];
                }
                c._[4 * i + j] = sum;
            }
        }

        return c;
    }

    static identity(): Matrix4 {
        return new Matrix4([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    static model(position: Point, scale: number): Matrix4 {
        return new Matrix4([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            position.x, position.y, 0, 1
        ]);
    }

    static orthographic(x: number, y: number): Matrix4 {
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

    static scale(scale: number): Matrix4 {
        return new Matrix4([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ])
    }

    static translation(position: Point): Matrix4 {
        return Matrix4.model(position, 1);
    }

}

class Vertex {
    constructor(public position: Point, public uv: Point, public color: number[], public weight: number[]) {
        this.position = position;
        this.uv = uv;
        this.color = color;
        this.weight = weight;
    }
}

class Plane {
    constructor(public width: number, public height: number, public primitive: Primitive) {
        this.width = width;
        this.height = height;
        this.primitive = primitive;
    }

    computeProjection(p1: Point, p2: Point, p3: Point, p4: Point): Matrix3 {
        const basisToPoints = (p1: Point, p2: Point, p3: Point, p4: Point): Matrix3 => {
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
        }
        const s = basisToPoints(new Point(0, 0), new Point(this.width, 0), new Point(0, this.height), new Point(this.width, this.height));
        const d = basisToPoints(p1, p2, p3, p4);
        return Matrix3.mul(d, Matrix3.adjugate(s));
    }
}

class Primitive {
    constructor(public mode: number, public first: number, public count: number) {
        this.mode = mode;
        this.first = first;
        this.count = count;
    }
}

const FLOATS_PER_VERTEX = 12;
const MAX_VERTEX_COUNT = 8192;

class Renderer {
    vertexCount: number;
    vertices: Float32Array;
    orthographicScale: number;

    constructor(private gl: WebGL2RenderingContext, orthographicScale: number) {
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
            gl.bufferData(
                gl.ARRAY_BUFFER,
                4 * FLOATS_PER_VERTEX * MAX_VERTEX_COUNT,
                gl.STATIC_DRAW
            );

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

        this.vertexCount = 0
        this.vertices = new Float32Array(FLOATS_PER_VERTEX * MAX_VERTEX_COUNT);

        gl.disable(gl.DEPTH_TEST);

        this.orthographicScale = orthographicScale;
    }

    setProjectionMatrix(matrix: Matrix4) {
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, matrix._);
    }

    setViewMatrix(matrix: Matrix4) {
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 4 * 16, matrix._);
    }

    setModelMatrix(matrix: Matrix4) {
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 4 * 32, matrix._);
    }

    resizeCanvas(width: number, height: number) {
        // width /= this.orthographicScale;
        // height /= this.orthographicScale;
        this.gl.viewport(0, 0, width, height);
        this.setProjectionMatrix(Matrix4.orthographic(width / this.orthographicScale, height / this.orthographicScale));
    }

    uploadVertices() {
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.vertices, 0, FLOATS_PER_VERTEX * this.vertexCount);
    }

    createProgram(vert: string, frag: string): WebGLProgram {
        const gl = this.gl;

        const vertShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertShader, vert);
        gl.compileShader(vertShader);
    
        const fragShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragShader, frag);
        gl.compileShader(fragShader);
    
        const program = gl.createProgram()!;
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);

        const index = gl.getUniformBlockIndex(program, "Matrices");
        gl.uniformBlockBinding(program, index, 0);

        return program;
    }

    useProgram(program: WebGLProgram) {
        this.gl.useProgram(program);
    }

    private copyVerticesToBuffer(vertices: Array<Vertex>) {
        for (let i=0; i<vertices.length; i++, this.vertexCount++) {
            const vertex = vertices[i];
            const index = this.vertexCount * FLOATS_PER_VERTEX;
            this.vertices[index     ] = vertex.position.x;
            this.vertices[index +  1] = vertex.position.y;
            
            this.vertices[index +  2] = vertex.uv.x;
            this.vertices[index +  3] = vertex.uv.y;

            this.vertices[index +  4] = vertex.color[0];
            this.vertices[index +  5] = vertex.color[1];
            this.vertices[index +  6] = vertex.color[2];
            this.vertices[index +  7] = vertex.color[3];

            this.vertices[index +  8] = vertex.weight[0];
            this.vertices[index +  9] = vertex.weight[1];
            this.vertices[index + 10] = vertex.weight[2];
            this.vertices[index + 11] = vertex.weight[3];
        }
    }

    private newPlaneUsingFunction(width: number, height: number, resolution: number, func: (position: Point) => Vertex): Plane {
        const vertexCount = 6 * resolution * resolution;
        const vertices = new Array<Vertex>(vertexCount);

        for (let x=0; x<resolution; x++) {
            for (let y=0; y<resolution; y++) {
                const xres = (x / resolution);
                const x1res = ((x + 1) / resolution);
                const yres = (y / resolution);
                const y1res = ((y + 1) / resolution);

                const nw = func(new Point(xres, yres));
                const ne = func(new Point(x1res, yres));
                const se = func(new Point(x1res, y1res));
                const sw = func(new Point(xres, y1res));

                const index = 6 * (x + y * resolution);

                vertices[index    ] = nw;
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
        // return new Primitive(this.gl.TRIANGLES, first, count);
        return new Plane(
            width,
            height,
            new Primitive(this.gl.TRIANGLES, first, count)
        );
    }

    private randomColor(): number[] {
        return [Math.random(), Math.random(), Math.random(), 1];
    }

    newPlane(width: number, height: number, resolution: number): Plane {
        return this.newPlaneUsingFunction(width, height, resolution, (position: Point): Vertex => {
            const mappedPosition = Point.map(position, 0, 1, -1, 1);
            return new Vertex(
                mappedPosition,
                position,
                this.randomColor(),
                [mappedPosition.x, mappedPosition.y, 1, 1]
            );
        });
    }

    drawPrimitive(primitive: Primitive) {
        this.gl.drawArrays(primitive.mode, primitive.first, primitive.count);
    }

    canvasToWindowPoint(p: Point): Point {
        return new Point(
            (p.x * this.orthographicScale) + (window.innerWidth / 2),
            (window.innerHeight / 2) - (p.y * this.orthographicScale)
        );
    }

    windowToCanvasPoint(p: Point): Point {
        return new Point(
            (p.x - (window.innerWidth / 2)) / this.orthographicScale,
            ((window.innerHeight / 2) - p.y) / this.orthographicScale
        );
    }

    windowToCanvasScalar(s: number): number {
        return s / this.orthographicScale;
    }
}

class Interface {
    menu: HTMLElement;
    menuLeft: boolean;
    menuSwap: HTMLElement;
    zoomReset: HTMLElement;
    onZoomReset: () => void;
    zoomValue: HTMLElement;
    handles: Array<HTMLElement>;
    handleResets: Array<HTMLElement>;
    onHandleReset: (i: number) => void;
    handleXValues: Array<HTMLElement>;
    handleYValues: Array<HTMLElement>;

    constructor () {
        this.menu = document.getElementById("menu");
        this.menuLeft = true;
        this.swapMenu();
        this.menuSwap = document.getElementById("swap");
        this.menuSwap.onclick = () => {
            this.menuLeft = !this.menuLeft;
            this.swapMenu();
        };
        this.zoomReset = document.getElementById("zoom-reset");
        this.zoomReset.onclick = () => {
            this.onZoomReset();
        }
        this.zoomValue = document.getElementById("zoom-value");
        this.handles = new Array<HTMLElement>(5);
        this.handleResets = new Array<HTMLElement>(5);
        this.handleXValues = new Array<HTMLElement>(5);
        this.handleYValues = new Array<HTMLElement>(5);
        for (let i=0; i<5; i++) {
            this.handles[i] = document.getElementById("handle-" + i);
            this.handleResets[i] = document.getElementById("reset-" + i);
            this.handleResets[i].onclick = () => {
                this.onHandleReset(i);
            }
            this.handleXValues[i] = document.getElementById("x-" + i);
            this.handleYValues[i] = document.getElementById("y-" + i);
        }
    }

    swapMenu() {
        if (this.menuLeft) {
            this.menu.classList.add("left");
            this.menu.classList.remove("right");
        } else {
            this.menu.classList.remove("left");
            this.menu.classList.add("right");
        }
    }

    updateValues(zoomValue: number, handleValues: Array<Point>, handlePositions: Array<Point>) {
        this.zoomValue.innerHTML = ((zoomValue < 0) ? "" : " ") + zoomValue.toFixed(2);
        const handleOffset = new Point(-remToPixels(1), -remToPixels(1));
        for (let i=0; i<5; i++) {
            const x = handleValues[i].x;
            this.handleXValues[i].innerHTML = ((x < 0) ? "": " ") + x.toFixed(3);
            const y = handleValues[i].y;
            this.handleYValues[i].innerHTML = ((y < 0) ? "": " ") + y.toFixed(3);

            let handlePosition = Point.add(handlePositions[i], handleOffset);
            this.handles[i].style.left = handlePosition.x + "px";
            this.handles[i].style.top = handlePosition.y + "px";
        }
    }
}

const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);

function remToPixels(rem: number): number {
    return rem * REM_TO_PIXELS;
}

const DEFAULT_HANDLE_POSITION = 2;
const DEFAULT_SCALE_VALUE = 2.0;
const DEFAULT_ZOOM_VALUE = 100;

(() => {
    let width = window.innerWidth;
    let height = window.innerHeight;

    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2")!;
    const interface = new Interface();

    const renderer = new Renderer(gl, DEFAULT_ZOOM_VALUE);

    const rulerProgram = renderer.createProgram(rulerVert, rulerFrag);
    renderer.useProgram(rulerProgram);

    const rulerPlane = renderer.newPlane(1, 1, 8);
    renderer.uploadVertices();

    const defaultHandlePositions = new Array<Point>(
        new Point(-DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
        new Point( DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
        new Point(-DEFAULT_HANDLE_POSITION,  DEFAULT_HANDLE_POSITION),
        new Point( DEFAULT_HANDLE_POSITION,  DEFAULT_HANDLE_POSITION),
        new Point(0, 0), // Origin
    );
    let handlePositions = [...defaultHandlePositions];
    let currentHandle = -1;

    let initialHandlePosition = new Point(0, 0);
    let initialMousePosition = new Point(0, 0);
    let scale = DEFAULT_SCALE_VALUE;
    let sensitivity = 0.01;

    const update = () => {
        {
            const w = rulerPlane.width;
            const h = rulerPlane.height;
            const t = rulerPlane.computeProjection(handlePositions[0], handlePositions[1], handlePositions[2], handlePositions[3]);
            const _ = t._;
            for (let i=0; i<9; i++) {
                _[i] = _[i] / _[8];
            }
            const t2 = new Matrix4([
                _[0], _[3], 0, _[6],
                _[1], _[4], 0, _[7],
                   0,    0, 1,    0,
                _[2], _[5], 0, _[8],
            ])
            renderer.setModelMatrix(
                Matrix4.mul(
                    Matrix4.translation(
                        Point.scale(
                            handlePositions[4],
                            1 / (4 * scale) // I'm pretty sure 4 is the _number of polygons_ (8) / 2
                        )
                    ),
                    Matrix4.mul(
                        Matrix4.scale(scale),
                        Matrix4.translation(new Point(0.5, 0.5))
                    ),
                )
            );
            renderer.setViewMatrix(t2);
            renderer.drawPrimitive(rulerPlane.primitive);
        }
        
        interface.updateValues(
            scale,
            handlePositions,
            handlePositions.map((v) => renderer.canvasToWindowPoint(v))
        );
    }

    update();

    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        renderer.resizeCanvas(width, height);
        update();
    }

    resize();

    const move = (e: MouseEvent) => {
        if (currentHandle < 0) {
            return;
        }

        handlePositions[currentHandle] = Point.add(
            initialHandlePosition,
            Point.scale(
                Point.sub(
                    renderer.windowToCanvasPoint(new Point(e.pageX, e.pageY)),
                    renderer.windowToCanvasPoint(initialMousePosition)
                ),
                sensitivity
            )
        );
        update();
    }

    // Listen to mouseup and mousemove events on the _window_, as it's important to get these events wherever they are triggered
    window.onmouseup = () => {
        currentHandle = -1;
    }
    window.onmousemove = move;

    // Listen to mousedown and wheel events on the _canvas_, as we're only interested in them occuring over the canvas
    canvas.onmousedown = (e: MouseEvent) => {
        const mousePosition = new Point(e.pageX, e.pageY);
        const canvasPosition = renderer.windowToCanvasPoint(mousePosition);
        let rem = renderer.windowToCanvasScalar(remToPixels(1));
        let best = rem * rem; // 1rem squared
        currentHandle = -1;
        for (let i=0; i<5; i++) {
            let dx = canvasPosition.x - handlePositions[i].x;
            let dy = canvasPosition.y - handlePositions[i].y;
            let distanceSquared = dx * dx + dy * dy;
            if (best > distanceSquared) {
                best = distanceSquared;
                currentHandle = i;
                initialHandlePosition = handlePositions[currentHandle];
                initialMousePosition = mousePosition;
            }
        }
        move(e);
    }
    canvas.onwheel = (e: WheelEvent) => {
        scale += e.deltaY * 0.0005;
        update();
    }

    interface.onZoomReset = () => {
        scale = DEFAULT_SCALE_VALUE;
        update();
    }
    interface.onHandleReset = (i: number) => {
        handlePositions[i] = defaultHandlePositions[i];
        update();
    }

    window.onresize = resize;
})()