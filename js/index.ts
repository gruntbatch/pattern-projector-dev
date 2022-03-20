// TODO
// supply vertex indices and weights
// draw handles
// select handles
// move handles

const vertexShaderSource = `#version 300 es

precision mediump float;

layout (std140) uniform Matrices {
    mat4 projection;
    mat4 view;
    mat4 model;
};

layout (location=0) in vec2 in_position;
layout (location=1) in vec4 in_color;
layout (location=2) in vec2 in_uv;

out vec4 inout_color;
out vec2 inout_uv;

void main(void) {
    vec4 position = projection * view * model * vec4(in_position, 1.0, 1.0);
    // vec4 position = vec4(in_position, 1.0, 1.0);
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

const map = (x: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
    return outMin + (outMax - outMin) * (x - inMin) / (inMax - inMin);
}

class Matrix {
    static Identity(): Float32Array {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    static Orthographic(x: number, y: number): Float32Array {
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

    static Model(x: number, y: number, scale: number): Float32Array {
        return new Float32Array([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            x, y, 0, 1
        ]);
    }
}

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

    static autoRect(position: Point): Vertex {
        return new Vertex(
            new Point(
                map(position.x, 0, 1, -1, 1),
                map(position.y, 0, 1, -1, 1)
            ),
            [map(position.x, 0, 1, -1, 1), map(position.y, 0, 1, -1, 1), 1, 1],
            position
        );
    }

    static autoCircle(position: Point): Vertex {
        return new Vertex(
            position,
            [position.x, position.y, 1, 1],
            new Point(
                map(position.x, -1, 1, 0, 1),
                map(position.y, -1, 1, 0, 1)
            )
        );
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
    private gl: WebGL2RenderingContext;
    private vertexCount: number; 
    private bufferedVertices: Float32Array;

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl;
        this.vertexCount = 0
        this.bufferedVertices = new Float32Array(VERTEX_SIZE * MAX_VERTEX_COUNT);
    }

    createMatrixUniformBuffer(width: number, height: number) {
        const gl = this.gl;
        const buffer = gl.createBuffer()!;
        gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
        gl.bufferData(gl.UNIFORM_BUFFER, 192, gl.STATIC_DRAW);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, Matrix.Orthographic(width, height), 0);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 64, Matrix.Identity(), 0);
        gl.bufferSubData(gl.UNIFORM_BUFFER, 128, Matrix.Model(0, 0, 100), 0);
        gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, buffer);
    }

    setModelMatrix(matrix: Float32Array) {
        this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 128, matrix);
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
        console.log(gl.UNIFORM_BLOCK_DATA_SIZE);

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
        const edgeVertexCount = resolution + 1;
        const totalVertexCount = (6 * resolution * resolution)
        const vertices = new Array<Vertex>(totalVertexCount);

        for (let x=0; x<resolution; x++) {
            for (let y=0; y<resolution; y++) {
                const nw = Vertex.autoRect(new Point(x / resolution, y / resolution));
                const ne = Vertex.autoRect(new Point((x + 1) / resolution, y / resolution));
                const se = Vertex.autoRect(new Point((x + 1) / resolution, (y + 1) / resolution));
                const sw = Vertex.autoRect(new Point(x / resolution, (y + 1) / resolution));

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
        const count = totalVertexCount;
        this.copyVerticesToBuffer(vertices);
        return new Primitive(this.gl.TRIANGLES, first, count);
    }

    createCircle(resolution: number): Primitive {
        const edgeVertexCount = resolution + 1;
        const totalVertexCount = resolution + 2;
        const vertices = new Array<Vertex>(totalVertexCount);
        vertices[0] = Vertex.autoCircle(new Point(0, 0));
        for (let i=0; i<edgeVertexCount; i++) {
            const theta = i / resolution * 2 * Math.PI;
            const x = Math.sin(theta);
            const y = Math.cos(theta);
            vertices[i + 1] = Vertex.autoCircle(new Point(x, y));
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

(() => {
    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gl = canvas.getContext("webgl2")!;
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);

    const renderer = new Renderer(gl);
    renderer.createMatrixUniformBuffer(window.innerWidth, window.innerHeight);
    
    const program = renderer.createProgram(vertexShaderSource, testFragmentShaderSource);
    gl.useProgram(program);
    
    const plane = renderer.createPlane(16);
    const circle = renderer.createCircle(32);
    renderer.uploadVertices()

    renderer.drawPrimitive(plane);
    renderer.setModelMatrix(Matrix.Model(-200, 200, 150));
    renderer.drawPrimitive(circle);
})()

