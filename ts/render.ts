import * as model from "./model.js";

export {
    Vector2,

    canvas,
    gl,

    newVertex,
    newIdentityMatrix,
    newTranslationMatrix,
    onResize,
    wrapCanvasById,

    Buffer,
    Program,
};

type Color = [number, number, number, number];
type Matrix = Float32Array;
type Vector2 = [number, number];
type Vertex = [number, number, number, number, number, number, number, number];

const VERTEX_ELEMENT_SIZE = 4;
const VERTEX_ELEMENT_COUNT = 8;

let canvas: HTMLCanvasElement | null;
let gl: WebGLRenderingContext;

let currentBuffer: WebGLBuffer | null = null;
let currentProgram: WebGLProgram | null = null;
let currentProjection: Matrix = newIdentityMatrix();
let currentView: Matrix = newIdentityMatrix();

function newIdentityMatrix(): Matrix {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

function newOrthographicMatrix(width: number, height: number): Matrix {
    const left = width / -2;
    const right = width / 2;
    const bottom = height / -2;
    const top = height / 2;
    const far = -1000;
    const near = 1000;

    return new Float32Array([
        2.0 / (right - left), 0, 0, 0,
        0, 2.0 / (top - bottom), 0, 0,
        0, 0, -2.0 / (far - near), 0,
        -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1.0
    ]);
}

function newTranslationMatrix(translation: Vector2): Matrix {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translation[0], translation[1], 0, 1
    ]);
}

function newVertex(position: Vector2 = [0, 0], texCoord: Vector2 = [0, 0], color: Color = [1, 0, 0, 1]): Vertex {
    return [
        position[0], position[1],
        texCoord[0], texCoord[1],
        color[0], color[1], color[2], color[3]
    ];
}

function onResize(width: number, height: number) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    currentProjection = newOrthographicMatrix(width, height);
}

function setProjection(projection: Matrix) {
    currentProjection = projection;
}

function setView(view: Matrix) {
    currentView = view;
}

function wrapCanvasById(id: string) {
    canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) {
        throw new Error();
    }

    gl = canvas.getContext("webgl");
    if (!gl) {
        throw new Error();
    }
}

class Buffer {
    capacity: number;
    length: number = 0;
    buffer: WebGLBuffer;

    constructor(capacity = 512) {
        this.capacity = capacity;

        this.buffer = gl.createBuffer();
        this.bind();
        gl.bufferData(
            gl.ARRAY_BUFFER,
            VERTEX_ELEMENT_SIZE * VERTEX_ELEMENT_COUNT * this.capacity,
            gl.DYNAMIC_DRAW
        );

        // position
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 32, 0);
        gl.enableVertexAttribArray(0);

        // texCoord
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 8);
        gl.enableVertexAttribArray(1);

        // color
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
        gl.enableVertexAttribArray(2);
    }

    bind() {
        if (currentBuffer != this.buffer) {
            currentBuffer = this.buffer;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        }

        return true;
    }

    newMesh(vertices: Array<Vertex>, mode: number = gl.TRIANGLES): Mesh {
        if (this.length + vertices.length > this.capacity) {
            throw new Error("Too many vertices!");
        }

        let data = new Float32Array(vertices.length * VERTEX_ELEMENT_COUNT);
        for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i];
            const index = i * VERTEX_ELEMENT_COUNT;
            for (let j = 0; j < VERTEX_ELEMENT_COUNT; j++) {
                data[index + j] = vertex[j];
            }
        }

        if (!this.bind()) {
            throw new Error("Unable to bind buffer for writing!");
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, VERTEX_ELEMENT_SIZE * VERTEX_ELEMENT_COUNT * this.length, data);

        let mesh = new Mesh(this, mode, this.length, vertices.length);
        this.length += vertices.length;
        return mesh;
    }

    newPlane(size: number, color: Color): Mesh {
        const vertexCount = 6;
        const vertices = new Array<Vertex>(vertexCount);

        let resolution = 1;
        let x = 0;
        let y = 0;
        {
            const minX = (x / resolution);
            const maxX = ((x + 1) / resolution);
            const minY = (y / resolution);
            const maxY = ((y + 1) / resolution);

            const v0 = newVertex([minX * size, minY * size], [minX, minY], color);
            const v1 = newVertex([minX * size, maxY * size], [minX, maxY], color);
            const v2 = newVertex([maxX * size, minY * size], [maxX, minY], color);
            const v3 = newVertex([maxX * size, maxY * size], [maxX, maxY], color);

            const index = 6 * (x + y * resolution);

            vertices[index    ] = v0;
            vertices[index + 1] = v1;
            vertices[index + 2] = v2;

            vertices[index + 3] = v1;
            vertices[index + 4] = v3;
            vertices[index + 5] = v2;
        }

        return this.newMesh(vertices, gl.TRIANGLES);
    }
}

class Mesh {
    constructor(public buffer: Buffer, public mode: number, public first: number, public count: number) {

    }

    draw(program: Program, model: Matrix, color: Color) {
        if (program.bind(model, color) && this.buffer.bind()) {
            gl.drawArrays(this.mode, this.first, this.count);
        }
    }
}

class Program {
    program: WebGLProgram | null;
    uLocProjection: WebGLUniformLocation;
    uLocView: WebGLUniformLocation;
    uLocModel: WebGLUniformLocation;
    uLocColor: WebGLUniformLocation;

    constructor(vertUrl: string, fragUrl: string) {
        this.program = null;
        this.load(vertUrl, fragUrl);
    }

    private async load(vertUrl: string, fragUrl: string) {
        let response = await fetch(vertUrl);
        let content = await response.text();
        let vert = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vert, content);
        gl.compileShader(vert);

        response = await fetch(fragUrl);
        content = await response.text();
        let frag = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(frag, content);
        gl.compileShader(frag);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vert);
        gl.attachShader(this.program, frag);
        gl.linkProgram(this.program);

        this.uLocProjection = gl.getUniformLocation(this.program, "u_projection");
        this.uLocView = gl.getUniformLocation(this.program, "u_view");
        this.uLocModel = gl.getUniformLocation(this.program, "u_model");
        this.uLocColor = gl.getUniformLocation(this.program, "u_color");
    }

    bind(model: Matrix, color: Color) {
        if (!this.program) {
            return false;
        }

        if (currentProgram != this.program) {
            currentProgram = this.program;
            gl.useProgram(this.program);
        }
        gl.uniformMatrix4fv(this.uLocProjection, false, currentProjection);
        gl.uniformMatrix4fv(this.uLocView, false, currentView);
        gl.uniformMatrix4fv(this.uLocModel, false, model);
        gl.uniform4fv(this.uLocColor, color);

        return true;
    }
}
