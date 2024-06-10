import * as math from "./math.js";
// import * as model from "./model.js";

export {
    canvas,
    gl,

    newVertex,
    onResize,
    wrapCanvasById,
    setView,

    Buffer,
    Mesh,
    Program,
    Texture,
};

type Vertex = [number, number, number, number];
type Uniform = [string, Array<number>];

const VERTEX_ELEMENT_SIZE = 4;
const VERTEX_ELEMENT_COUNT = 8;

let canvas: HTMLCanvasElement | null;
let gl: WebGLRenderingContext;

let currentBuffer: WebGLBuffer | null = null;
let currentProgram: WebGLProgram | null = null;
let currentProjection: math.Matrix4 = new math.Matrix4();
let currentView: math.Matrix4 = new math.Matrix4();

function newVertex(position: [number, number] = [0, 0], texCoord: [number, number] = [0, 0]): Vertex {
    return [
        position[0], position[1],
        texCoord[0], texCoord[1]
    ];
}

function onResize(width: number, height: number) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    currentProjection = math.Matrix4.orthographic(width, height);
}

function setProjection(projection: math.Matrix4) {
    currentProjection = projection;
}

function setView(view: math.Matrix4) {
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

    newPlane(origin: [number, number] = [0, 0], scale: [number, number] = [1, 1]): Mesh {
        const vertexCount = 6;
        const vertices = new Array<Vertex>(vertexCount);

        let resolution = 1;
        let x = 0;
        let y = 0;
        {
            const minX = origin[0] + (x / resolution) * scale[0];
            const maxX = origin[0] + ((x + 1) / resolution) * scale[0];
            const minY = origin[1] + (y / resolution) * scale[1];
            const maxY = origin[1] + ((y + 1) / resolution) * scale[1];

            const v0 = newVertex([minX, minY], [minX, minY]);
            const v1 = newVertex([minX, maxY], [minX, maxY]);
            const v2 = newVertex([maxX, minY], [maxX, minY]);
            const v3 = newVertex([maxX, maxY], [maxX, maxY]);

            const index = 6 * (x + y * resolution);

            vertices[index] = v0;
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

    draw(program: Program, model: math.Matrix4, uniforms: Iterable<Uniform> = []) {
        if (program.bind(model, uniforms) && this.buffer.bind()) {
            gl.drawArrays(this.mode, this.first, this.count);
        }
    }
}

class Program {
    program: WebGLProgram | null;
    uLocProjection: WebGLUniformLocation;
    uLocView: WebGLUniformLocation;
    uLocModel: WebGLUniformLocation;
    uniformLocations: Record<string, WebGLUniformLocation>;

    constructor(vertUrl: string, fragUrl: string, uniforms: Iterable<Uniform>) {
        this.program = null;
        this.load(vertUrl, fragUrl, uniforms);
    }

    private async load(vertUrl: string, fragUrl: string, uniforms: Iterable<Uniform>) {
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

        this.uniformLocations = {};
        for (const uniform of uniforms) {
            this.uniformLocations[uniform[0]] = gl.getUniformLocation(this.program, uniform[0]);
        }

        // Bind the program once in order to initialize uniforms
        this.bind(new math.Matrix4(), uniforms);
    }

    bind(model: math.Matrix4, uniforms: Iterable<Uniform>) {
        if (!this.program) {
            return false;
        }

        if (currentProgram != this.program) {
            currentProgram = this.program;
            gl.useProgram(this.program);
        }
        gl.uniformMatrix4fv(this.uLocProjection, false, currentProjection.buffer);
        gl.uniformMatrix4fv(this.uLocView, false, currentView.buffer);
        gl.uniformMatrix4fv(this.uLocModel, false, model.buffer);

        for (const uniform of uniforms) {
            const name = uniform[0];
            const value = uniform[1];
            switch (value.length) {
                case 1:
                    gl.uniform1fv(this.uniformLocations[name], value);
                    break;

                case 4:
                    gl.uniform4fv(this.uniformLocations[name], value);
                    break;
            }
        }

        return true;
    }
}

class Texture {
    texture: WebGLTexture;

    constructor() {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA,
            1, 1,
            0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([255, 0, 0, 255])
        );
    }

    fromImageUrl(url: string) {
        const image = new Image();
        image.onload = () => {
            this.fromTexImageSource(image);
        }
        image.src = url;
    }

    fromTexImageSource(canvas: TexImageSource) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    bind() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
}
