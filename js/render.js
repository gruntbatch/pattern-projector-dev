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
// import * as model from "./model.js";
export { canvas, gl, newVertex, onResize, wrapCanvasById, setView, Buffer, Mesh, Program, Texture, };
const VERTEX_ELEMENT_SIZE = 4;
const VERTEX_ELEMENT_COUNT = 8;
let canvas;
let gl;
let currentBuffer = null;
let currentProgram = null;
let currentProjection = new math.Matrix4();
let currentView = new math.Matrix4();
function newVertex(position = [0, 0], texCoord = [0, 0]) {
    return [
        position[0], position[1],
        texCoord[0], texCoord[1]
    ];
}
function onResize(width, height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    currentProjection = math.Matrix4.orthographic(width, height);
}
function setProjection(projection) {
    currentProjection = projection;
}
function setView(view) {
    currentView = view;
}
function wrapCanvasById(id) {
    canvas = document.getElementById(id);
    if (!canvas) {
        throw new Error();
    }
    gl = canvas.getContext("webgl");
    if (!gl) {
        throw new Error();
    }
}
class Buffer {
    static verticesToFloat32Array(vertices) {
        const array = new Float32Array(vertices.length * VERTEX_ELEMENT_COUNT);
        for (let i = 0; i < vertices.length; i++) {
            const vertex = vertices[i];
            const index = i * VERTEX_ELEMENT_COUNT;
            for (let j = 0; j < VERTEX_ELEMENT_COUNT; j++) {
                array[index + j] = vertex[j];
            }
        }
        return array;
    }
    constructor(capacity = 512) {
        this.length = 0;
        this.capacity = capacity;
        this.buffer = gl.createBuffer();
        this.bind();
        gl.bufferData(gl.ARRAY_BUFFER, VERTEX_ELEMENT_SIZE * VERTEX_ELEMENT_COUNT * this.capacity, gl.DYNAMIC_DRAW);
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
    newMesh(vertices, mode = gl.TRIANGLES) {
        if (this.length + vertices.length > this.capacity) {
            throw new Error("Too many vertices!");
        }
        let data = Buffer.verticesToFloat32Array(vertices);
        if (!this.bind()) {
            throw new Error("Unable to bind buffer for writing!");
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, VERTEX_ELEMENT_SIZE * VERTEX_ELEMENT_COUNT * this.length, data);
        let mesh = new Mesh(this, mode, this.length, vertices.length);
        this.length += vertices.length;
        return mesh;
    }
    newPlane(positionOrigin = [0, 0], positionScale = [1, 1], texCoordOrigin = positionOrigin, texCoordScale = positionScale) {
        return this.newMesh(Mesh.plane(positionOrigin, positionScale, texCoordOrigin, texCoordScale), gl.TRIANGLES);
    }
}
class Mesh {
    static plane(positionOrigin, positionScale, texCoordOrigin = positionOrigin, texCoordScale = positionScale) {
        const vertexCount = 6;
        const vertices = new Array(vertexCount);
        let resolution = 1;
        let x = 0;
        let y = 0;
        {
            const positionMin = [
                positionOrigin[0] + (x / resolution) * positionScale[0],
                positionOrigin[1] + (y / resolution) * positionScale[1],
            ];
            const positionMax = [
                positionOrigin[0] + ((x + 1) / resolution) * positionScale[0],
                positionOrigin[1] + ((y + 1) / resolution) * positionScale[1],
            ];
            const texCoordMin = [
                texCoordOrigin[0] + (x / resolution) * texCoordScale[0],
                texCoordOrigin[1] + (y / resolution) * texCoordScale[1],
            ];
            const texCoordMax = [
                texCoordOrigin[0] + ((x + 1) / resolution) * texCoordScale[0],
                texCoordOrigin[1] + ((y + 1) / resolution) * texCoordScale[1],
            ];
            const v0 = newVertex([positionMin[0], positionMin[1]], [texCoordMin[0], texCoordMin[1]]);
            const v1 = newVertex([positionMin[0], positionMax[1]], [texCoordMin[0], texCoordMax[1]]);
            const v2 = newVertex([positionMax[0], positionMin[1]], [texCoordMax[0], texCoordMin[1]]);
            const v3 = newVertex([positionMax[0], positionMax[1]], [texCoordMax[0], texCoordMax[1]]);
            const index = 6 * (x + y * resolution);
            vertices[index] = v0;
            vertices[index + 1] = v1;
            vertices[index + 2] = v2;
            vertices[index + 3] = v1;
            vertices[index + 4] = v3;
            vertices[index + 5] = v2;
        }
        return vertices;
    }
    constructor(buffer, mode, first, count) {
        this.buffer = buffer;
        this.mode = mode;
        this.first = first;
        this.count = count;
    }
    draw(program, model, uniforms = []) {
        if (program.bind(model, uniforms) && this.buffer.bind()) {
            gl.drawArrays(this.mode, this.first, this.count);
        }
    }
    renewPlane(positionOrigin = [0, 0], positionScale = [1, 1], texCoordOrigin = positionOrigin, texCoordScale = positionScale) {
        const vertices = Mesh.plane(positionOrigin, positionScale, texCoordOrigin, texCoordScale);
        const data = Buffer.verticesToFloat32Array(vertices);
        if (!this.buffer.bind()) {
            throw new Error("Unable to bind buffer for bufferSubData!");
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, this.first * VERTEX_ELEMENT_COUNT * VERTEX_ELEMENT_SIZE, data);
    }
}
class Program {
    constructor(vertUrl, fragUrl, uniforms) {
        this.program = null;
        this.load(vertUrl, fragUrl, uniforms);
    }
    load(vertUrl, fragUrl, uniforms) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = yield fetch(vertUrl);
            let content = yield response.text();
            let vert = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vert, content);
            gl.compileShader(vert);
            response = yield fetch(fragUrl);
            content = yield response.text();
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
        });
    }
    bind(model, uniforms) {
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
    constructor() {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));
    }
    fromImageUrl(url) {
        const image = new Image();
        image.onload = () => {
            this.fromTexImageSource(image);
        };
        image.src = url;
    }
    fromTexImageSource(canvas) {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    bind() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
}
