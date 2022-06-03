

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

    computeProjection(p1: Point, p2: Point, p3: Point, p4: Point): Matrix4 {
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
        const t = Matrix3.mul(d, Matrix3.adjugate(s));
        const _ = t._;
        for (let i=0; i<9; i++) {
            _[i] = _[i] / _[8];
        }
        return new Matrix4([
            _[0], _[3], 0, _[6],
            _[1], _[4], 0, _[7],
               0,    0, 1,    0,
            _[2], _[5], 0, _[8],
        ])
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

        gl.clearColor(1.0, 0.0, 0.0, 1.0);
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
        this.gl.viewport(0, 0, width, height);
        this.setProjectionMatrix(Matrix4.orthographic(width / this.orthographicScale, height / this.orthographicScale));
    }

    uploadVertices() {
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.vertices, 0, FLOATS_PER_VERTEX * this.vertexCount);
    }
    
    loadTexture(url: string) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])
        );
        
        const image = new Image();
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        image.src = url;

        return texture;
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

    useTexture(texture: WebGLTexture) {
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
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
            const mappedPosition = Point.map(position, 0, 1, 0, 1);
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