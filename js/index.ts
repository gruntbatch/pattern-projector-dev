// TODO
// generate a plane mesh manually
// supply vertex indices and weights
// draw handles
// select handles
// move handles

const vertexShaderSource = `#version 300 es

precision mediump float;

// layout (std140) uniform Matrices {
//     mat4 projection;
//     mat4 view;
//     mat4 model;
// };

layout (location=0) in vec2 in_position;
layout (location=1) in vec4 in_color;
layout (location=2) in vec2 in_uv;

out vec4 inout_color;
out vec2 inout_uv;

void main(void) {
    vec4 position = vec4(in_position, 1.0, 1.0);
    gl_Position = position;
    inout_color = in_color;
    inout_uv = in_uv;
}
`;

const testFragmentShaderSource = `#version 300 es

precision mediump float;

in vec4 inout_color;
in vec4 in_uv;

out vec4 out_color;

void main(void) {
    out_color = inout_color;
}
`;

class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;    
    }
}

class Vertex {
    position: Point;
    weight: number[];
    uv: Point;

    constructor(position: Point, weight: number[], uv: Point) {
        this.position = position;
        this.weight = weight;
        this.uv = uv;
    }
}

class Primitive {
    constructor(public mode: number, public first: number, public count: number) {
        this.mode = mode;
        this.first = first;
        this.count = count;
    }
}

const VERTEX_SIZE = 8;
const MAX_VERTEX_COUNT = 2048;

class Renderer {
    private gl: WebGLRenderingContext;
    private vertexCount: number; 
    private bufferedVertices: Float32Array;

    constructor(gl: WebGLRenderingContext) {
        this.gl = gl;
        this.vertexCount = 0
        this.bufferedVertices = new Float32Array(VERTEX_SIZE * MAX_VERTEX_COUNT);
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

        return program;
    }

    uploadVertices(): WebGLBuffer {
        const gl = this.gl;
        const buffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.bufferedVertices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 32, 0);
        gl.enableVertexAttribArray(0);

        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 8);
        gl.enableVertexAttribArray(1);

        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
        gl.enableVertexAttribArray(2);        
        return buffer;
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
            const index = this.vertexCount * VERTEX_SIZE;
            this.bufferedVertices[index] = vertex.position.x;
            this.bufferedVertices[index + 1] = vertex.position.y;

            this.bufferedVertices[index + 2] = vertex.weight[0];
            this.bufferedVertices[index + 3] = vertex.weight[1];
            this.bufferedVertices[index + 4] = vertex.weight[2];
            this.bufferedVertices[index + 5] = vertex.weight[3];
            
            this.bufferedVertices[index + 6] = vertex.uv.x;
            this.bufferedVertices[index + 7] = vertex.uv.y;
        }
    }

    createPlane(resolution: number): Primitive {
        // const edgeVertexCount = resolution + 1;
        // const totalVertexCount = edgeVertexCount * edgeVertexCount;
        // const arrayBufferData = new Float32Array(8 * totalVertexCount);
        // for (let x=0; x<resolution; x++) {
        //     for (let y=0; y<resolution; y++) {
        //         const nw = this.createVertex(x / resolution, y / resolution);
        //         const ne = this.createVertex((x + 1) / resolution, y / resolution);
        //         const se = this.createVertex((x + 1) / resolution, (y + 1) / resolution);
        //         const sw = this.createVertex(x / resolution, (y + 1) / resolution);

        //         this.copyVertexToData(nw, arrayBufferData, 8 * (x + y * edgeVertexCount));
        //         this.copyVertexToData(sw, arrayBufferData, 8 * (x + (y + 1) * edgeVertexCount));
        //         this.copyVertexToData(se, arrayBufferData, 8 * ((x + 1) + (y + 1) * edgeVertexCount));

        //         this.copyVertexToData(nw, arrayBufferData, 8 * (x + y * edgeVertexCount));
        //         this.copyVertexToData(se, arrayBufferData, 8 * ((x + 1) + (y + 1) * edgeVertexCount));
        //         this.copyVertexToData(ne, arrayBufferData, 8 * ((x + 1) + y * edgeVertexCount));
        //     }
        // }

        // const gl = this.gl;
        // const buffer = this.createAndFillBuffer(gl.ARRAY_BUFFER, arrayBufferData, gl.STATIC_DRAW);
        // return new Primitive(buffer, gl.TRIANGLES, 0, totalVertexCount);
        const vertices = new Array<Vertex>(
            new Vertex(new Point(-1, 1), [1, 0, 0, 1], new Point(0, 1)),
            new Vertex(new Point(-1, -1), [0, 1, 0, 1], new Point(0, 0)),
            new Vertex(new Point(1, -1), [0, 0, 1, 1], new Point(1, 0)),

            new Vertex(new Point(-1, 1), [1, 0, 0, 1], new Point(0, 1)),
            new Vertex(new Point(1, -1), [0, 0, 1, 1], new Point(1, 0)),
            new Vertex(new Point(1, 1), [0, 1, 0, 1], new Point(1, 1)),
        );
        const first = this.vertexCount;
        const count = 6;
        this.copyVerticesToBuffer(vertices);
        return new Primitive(this.gl.TRIANGLES, first, count);

        // const gl = this.gl;
        // const buffer = this.createAndFillBuffer(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);
        // return new Primitive(buffer, gl.TRIANGLES, 0, 6);
    }

    createCircle(resolution: number): Primitive {
        // const edgeVertexCount = resolution + 1;
        // const totalVertexCount = resolution + 2;
        // const bufferData = new Float32Array(8 * totalVertexCount);
        // for (let i=0; i<edgeVertexCount; i++) {
        //     const index = 8 * (i + 1);

        //     const x = Math.sin(i / resolution * 2 * Math.PI);
        //     const y = Math.cos(i / resolution * 2 * Math.PI);

        //     bufferData[index] = x;
        //     bufferData[index + 1] = y;

        //     bufferData[index + 2] = x;
        //     bufferData[index + 3] = y;
        //     bufferData[index + 4] = 1;
        //     bufferData[index + 5] = 1;

        //     bufferData[index + 6] = x * 0.5 + 1.0;
        //     bufferData[index + 7] = y * 0.5 + 1.0;
        // }

        // const gl = this.gl;
        // const buffer = this.createAndFillBuffer(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);
        // return new Primitive(buffer, gl.TRIANGLE_FAN, 0, totalVertexCount);
        const edgeVertexCount = resolution + 1;
        const totalVertexCount = resolution + 2;
        const vertices = new Array<Vertex>(totalVertexCount);
        vertices[0] = new Vertex(new Point(0, 0), [0, 0, 0, 0], new Point(0.5, 0.5));
        for (let i=0; i<edgeVertexCount; i++) {
            const theta = i / resolution * 2 * Math.PI;
            const x = Math.sin(theta);
            const y = Math.cos(theta);
            vertices[i + 1] = new Vertex(
                new Point(x, y),
                [x, y, 1, 1],
                new Point(x * 0.5 + 1.0, y * 0.5 + 1.0)
            );
        }

        console.log(vertices);

        const first = this.vertexCount;
        const count = totalVertexCount;
        this.copyVerticesToBuffer(vertices);
        return new Primitive(this.gl.TRIANGLE_FAN, first, count);
    }

    drawPrimitive(primitive: Primitive) {
        const gl = this.gl;
        // gl.bindBuffer(gl.ARRAY_BUFFER, primitive.buffer);
        console.log("drawArrays", primitive.mode, primitive.first, primitive.count);
        gl.drawArrays(primitive.mode, primitive.first, primitive.count);
    }
}

(() => {
    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext("webgl2")!;
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    const renderer = new Renderer(gl);
    
    const program = renderer.createProgram(vertexShaderSource, testFragmentShaderSource);
    gl.useProgram(program);
    
    const plane = renderer.createPlane(2);
    const circle = renderer.createCircle(32);
    
    // const coord = gl.getAttribLocation(program, "c");
    // gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray(coord);
    // gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 32, 0);
    // gl.enableVertexAttribArray(0);

    // gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 8);
    // gl.enableVertexAttribArray(1);

    // gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    // gl.enableVertexAttribArray(2);

    gl.disable(gl.DEPTH_TEST);
    
    renderer.uploadVertices()

    renderer.drawPrimitive(plane);
    renderer.drawPrimitive(circle);
})()

