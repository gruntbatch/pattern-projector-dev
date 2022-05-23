// TODO
// move handles
// scale controls
// position controls
// handle controls 

const handleVertexShaderSource = `#include("src/handle.vert")`
const handleFragmentShaderSource = `#include("src/handle.frag")`;
const patternVertexShaderSource = `#include("src/pattern.vert")`;
const rulerFragmentShaderSource = `#include("src/ruler.frag")`;

const lerp = (a: number, b: number, f: number): number => {
    return a + f * (b - a);
}

const map = (x: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
    return outMin + (outMax - outMin) * (x - inMin) / (inMax - inMin);
}

class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;    
    }

    static add(a: Point, b: Point): Point {
        return new Point(a.x + b.x, a.y + b.y);
    }

    static sub(a: Point, b: Point): Point {
        return new Point(a.x - b.x, a.y - b.y);
    }

    static lerp(a: Point, b: Point, f: number): Point {
        return new Point(lerp(a.x, b.x, f), lerp(a.y, b.y, f));
    }

    static map(x: Point, inMin: number, inMax: number, outMin: number, outMax: number): Point {
        return new Point(
            map(x.x, inMin, inMax, outMin, outMax),
            map(x.y, inMin, inMax, outMin, outMax)
        );
    }

    static zero(): Point {
        return new Point(0, 0);
    }

    static distanceSquared(a: Point, b: Point): number {
        const x = a.x - b.x;
        const y = a.y - b.y;
        return x * x + y * y;
    }
}

class Matrix {
    static identity(): Float32Array {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    static model(position: Point, scale: number): Float32Array {
        return new Float32Array([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            position.x, position.y, 0, 1
        ]);
    }

    static orthographic(x: number, y: number): Float32Array {
        const left = x / -2.0;
        const right = x / 2.0;
        const bottom = y / -2.0;
        const top = y / 2.0;
        const far = -1;
        const near = 1;
        return new Float32Array([
            2.0 / (right - left), 0, 0, 0,
            0, 2.0 / (top - bottom), 0, 0,
            0, 0, -2.0 / (far - near), 0,
            -(right + left) / (right - left),
            -(top + bottom) / (top - bottom),
            -(far + near) / (far - near),
            1.0
        ]);
    }

    static translation(position: Point): Float32Array {
        return Matrix.model(position, 1);
    }
}

class Vertex {
    position: Point;
    uv: Point;
    color: number[];
    weight: number[];

    constructor(position: Point, uv: Point, color: number[], weight: number[]) {
        this.position = position;
        this.uv = uv;
        this.color = color;
        this.weight = weight;
    }
}

class Primitive {
    constructor(public mode: number, public first: number, public count: number) {
        this.mode = mode;
        this.first = first;
        this.count = count;
    }
}

const BYTES_PER_FLOAT = 4;
const FLOATS_PER_VERTEX = 12;
const MAX_VERTEX_COUNT = 8192;

class Renderer {
    private gl: WebGL2RenderingContext;
    vertexCount: number; 
    vertices: Float32Array;

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl;
        
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, window.innerWidth, window.innerHeight);

        // Create the matrix uniform buffer
        {
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
            gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, buffer);

            const data = new Float32Array(48);
            data.set(Matrix.orthographic(width, height), 0);
            data.set(Matrix.identity(), 16);
            data.set(Matrix.model(Point.zero(), 1), 32);
            gl.bufferData(gl.UNIFORM_BUFFER, data, gl.STATIC_DRAW);
        }

        // Create vertex buffer
        {
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                BYTES_PER_FLOAT * FLOATS_PER_VERTEX * MAX_VERTEX_COUNT,
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
    }

    setModelMatrix(matrix: Float32Array) {
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, BYTES_PER_FLOAT * 32, matrix);
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

    private createVertex(x: number, y: number): Float32Array {
        return new Float32Array([
            x, y,
            x, y, 1, 1,
            x, y
        ]);
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

    private createPlaneUsingFunction(resolution: number, func: (position: Point) => Vertex) {
        const vertexCount = 6 * resolution * resolution;
        const vertices = new Array<Vertex>(vertexCount);

        for (let x=0; x<resolution; x++) {
            for (let y=0; y<resolution; y++) {
                const xres = x / resolution;
                const x1res = (x + 1) / resolution;
                const yres = y / resolution;
                const y1res = (y + 1) / resolution;

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
        return new Primitive(this.gl.TRIANGLES, first, count);
    }

    private randomColor(): number[] {
        return [Math.random(), Math.random(), Math.random(), 1];
    }

    createPlane(resolution: number): Primitive {
        return this.createPlaneUsingFunction(resolution, (position: Point): Vertex => {
            const mappedPosition = Point.map(position, 0, 1, -1, 1);
            return new Vertex(
                mappedPosition,
                position,
                this.randomColor(),
                [mappedPosition.x, mappedPosition.y, 1, 1]
            );
        });
    }

    createWeightedPlane(resolution: number): Primitive {
        return this.createPlaneUsingFunction(resolution, (position: Point): Vertex => {
            // We're currently normalizing vertex weights here, but I'm not 100% sure that's the correct thing to do.
            const weights = new Array<number>(
                Math.min(-position.x + 1, -position.y + 1),
                Math.min(position.x, -position.y + 1),
                Math.min(position.x, position.y),
                Math.min(-position.x + 1, position.y)
            );
            const scalar = 1.0 / weights.reduce((previousValue, currentValue) => previousValue + currentValue, 0);
            return new Vertex(
                Point.map(position, 0, 1, -1, 1),
                position,
                this.randomColor(),
                weights.map((x) => x * scalar)
            );
        });
    }

    createCircle(resolution: number): Primitive {
        const edgeVertexCount = resolution + 1;
        const totalVertexCount = resolution + 2;
        const vertices = new Array<Vertex>(totalVertexCount);

        vertices[0] = new Vertex(
            new Point(0, 0),
            new Point(0.5, 0.5),
            this.randomColor(),
            [0, 0, 1, 1]
        );

        for (let i=0; i<edgeVertexCount; i++) {
            const theta = i / resolution * 2 * Math.PI;
            const position = new Point(Math.sin(theta), Math.cos(theta));
            vertices[i + 1] = new Vertex(
                position,
                Point.map(position, -1, 1, 0, 1),
                this.randomColor(),
                [position.x, position.y, 1, 1]
            );
        }

        const first = this.vertexCount;
        const count = totalVertexCount;
        this.copyVerticesToBuffer(vertices);
        return new Primitive(this.gl.TRIANGLE_FAN, first, count);
    }

    drawPrimitive(primitive: Primitive) {
        const gl = this.gl;
        gl.drawArrays(primitive.mode, primitive.first, primitive.count);
    }
}

const HANDLE_BIG = 20;
const HANDLE_SMALL = 16;
const DEFAULT_HANDLE_POSITION = 200;

const findNearestPoint = (position: Point, options: Array<Point>): number => {
    let closestDistance: number = Infinity;
    let closestIndex: number = 0;
    for (let i=0; i<options.length; i++) {
        const current = options[i];
        const distance = Point.distanceSquared(current, position);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
        }
    }
    return closestIndex;
}

const LERP_FACTOR = 0.2;

(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;

    const gl = canvas.getContext("webgl2")!;

    const renderer = new Renderer(gl, width, height);

    const patternProgram = renderer.createProgram(patternVertexShaderSource, rulerFragmentShaderSource);
    const patternBonesUniformIndex = gl.getUniformLocation(patternProgram, "in_bones");
    gl.useProgram(patternProgram);
    gl.uniformMatrix4fv(patternBonesUniformIndex, false, new Float32Array(64), 0, 64);

    const handleProgram = renderer.createProgram(handleVertexShaderSource, handleFragmentShaderSource);
    const handleColorUniformIndex = gl.getUniformLocation(handleProgram, "in_color");
    gl.useProgram(handleProgram);
    gl.uniform4fv(handleColorUniformIndex, [1, 0, 0, 1]);
    
    const circle = renderer.createCircle(32);
    const weightedPlane = renderer.createWeightedPlane(4);
    renderer.uploadVertices();

    let pulsingScale = HANDLE_BIG;

    let handlePositions = new Array<Point>(
        new Point(-DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
        new Point(DEFAULT_HANDLE_POSITION, -DEFAULT_HANDLE_POSITION),
        new Point(DEFAULT_HANDLE_POSITION, DEFAULT_HANDLE_POSITION),
        new Point(-DEFAULT_HANDLE_POSITION, DEFAULT_HANDLE_POSITION)
    );

    // Determine _what_ we are mousedowning on
    // based on that
    // drag the selected handle
    // drag certain widgets
    // toggle certain widgets
    let currentHandle = 0;
    let currentHandlePosition = handlePositions[currentHandle];
    let isDraggingCurrentHandle = false;
    let mouseDownPosition = new Point(0, 0);
    canvas.onmousedown = (event) => {
        const mousePosition = new Point(
            event.pageX - (width / 2),
            (height / 2) - event.pageY
        );
        const nearestHandle = findNearestPoint(mousePosition, handlePositions);
        if (Point.distanceSquared(mousePosition, handlePositions[nearestHandle]) < (HANDLE_BIG * HANDLE_BIG)) {
            if (nearestHandle == currentHandle) {
                mouseDownPosition = mousePosition;
                isDraggingCurrentHandle = true;
            } else {
                currentHandle = nearestHandle;
                currentHandlePosition = handlePositions[currentHandle];
            }
        }
    }

    canvas.onmouseup = (event) => {
        isDraggingCurrentHandle = false;
    }

    canvas.onmousemove = (event) => {
        if (isDraggingCurrentHandle) {
            const mousePosition = new Point(
                event.pageX - (width / 2),
                (height / 2) - event.pageY
            );

            const mouseMovement = Point.sub(mousePosition, mouseDownPosition);

            handlePositions[currentHandle] = Point.add(currentHandlePosition, mouseMovement);
        }
    }

    let rulerScale = 1.0;
    canvas.onwheel = (event) => {
        rulerScale += event.deltaY * 0.01;
    }

    const update = () => {
        requestAnimationFrame(update);

        // Determine our pulse and update pulsing variables
        const t = performance.now();
        const pulse = (((t / 1600) % 1) > 0.5) ? true : false;
        const pulsingScaleTarget = (pulse) ? HANDLE_BIG : HANDLE_SMALL;
        pulsingScale = lerp(pulsingScale, pulsingScaleTarget, LERP_FACTOR);

        gl.useProgram(patternProgram);
        const bones = new Float32Array(64);
        bones.set(Matrix.translation(handlePositions[0]), 0);
        bones.set(Matrix.translation(handlePositions[1]), 16);
        bones.set(Matrix.translation(handlePositions[2]), 32);
        bones.set(Matrix.translation(handlePositions[3]), 48);
        gl.uniformMatrix4fv(patternBonesUniformIndex, false, bones, 0, 64);
        renderer.setModelMatrix(Matrix.model(Point.zero(), 1));
        renderer.drawPrimitive(weightedPlane);

        // const nearestHandle = findNearestPoint(mousePosition, handlePositions);


        gl.useProgram(handleProgram);
        for (let i=0; i<4; i++) {
            if (i == currentHandle) {
                renderer.setModelMatrix(Matrix.model(handlePositions[i], pulsingScale));
                gl.uniform4fv(handleColorUniformIndex, [1, 1, 0, 1]);
            } else {
                renderer.setModelMatrix(Matrix.model(handlePositions[i], HANDLE_SMALL));
                gl.uniform4fv(handleColorUniformIndex, [1, 0, 0, 1]);
            }
            renderer.drawPrimitive(circle);
        }

    }

    update();
})();
