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
    gl_Position = position;
    inout_color = in_color;
    inout_uv = in_uv;
}
`;

const testFragmentShaderSource = `#version 300 es

precision mediump float;

in vec4 inout_color;
in vec2 inout_uv;

out vec4 out_color;

void main(void) {
    out_color = vec4(inout_uv, 0, 1);
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

const BYTES_PER_FLOAT = 4;
const FLOATS_PER_VERTEX = 8;
const MAX_VERTEX_COUNT = 2048;

class Renderer {
    private gl: WebGL2RenderingContext;
    private vertexCount: number; 
    private vertices: Float32Array;

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
            data.set(Matrix.Orthographic(width, height), 0);
            data.set(Matrix.Identity(), 16);
            data.set(Matrix.Model(0, 0, 1), 32);
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
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 32, 0);
            gl.enableVertexAttribArray(0);

            // Color/Weight
            gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 8);
            gl.enableVertexAttribArray(1);

            // UV
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
            gl.enableVertexAttribArray(2);   
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
            this.vertices[index] = vertex.position.x;
            this.vertices[index + 1] = vertex.position.y;

            this.vertices[index + 2] = vertex.weight[0];
            this.vertices[index + 3] = vertex.weight[1];
            this.vertices[index + 4] = vertex.weight[2];
            this.vertices[index + 5] = vertex.weight[3];
            
            this.vertices[index + 6] = vertex.uv.x;
            this.vertices[index + 7] = vertex.uv.y;
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
    const width = window.innerWidth;
    const height = window.innerHeight;

    const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    canvas.width = width;
    canvas.height = height;

    const gl = canvas.getContext("webgl2")!;

    const renderer = new Renderer(gl, width, height);
    
    const program = renderer.createProgram(vertexShaderSource, testFragmentShaderSource);
    gl.useProgram(program);
    
    const plane = renderer.createPlane(16);
    const circle = renderer.createCircle(32);
    renderer.uploadVertices()

    renderer.drawPrimitive(plane);
    renderer.setModelMatrix(Matrix.Model(-200, 200, 150));
    renderer.drawPrimitive(circle);
})()

