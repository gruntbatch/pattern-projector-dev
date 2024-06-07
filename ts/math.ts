export {
    Matrix3,
    Matrix4,
    Vector2,
    Vector3,
};

type Matrix3T = [
    number, number, number,
    number, number, number,
    number, number, number
];
type Matrix4T = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
]

type Vector2T = [number, number];
type Vector3T = [number, number, number];

type Quad = [Vector2, Vector2, Vector2, Vector2];

class Buffer {
    buffer: Float32Array;
    constructor(value: Array<number>) {
        this.buffer = new Float32Array(value);
    }
}

class Matrix3 extends Buffer {
    static skew(originalPoints: Quad, transformedPoints: Quad): Matrix3 {
        const basis = (p: Array<Vector2>): Matrix3 => {
            const m = new Matrix3([
                p[0].buffer[0], p[1].buffer[0], p[2].buffer[0],
                p[0].buffer[1], p[1].buffer[1], p[2].buffer[1],
                1, 1, 1
            ]);
            const v = new Vector3([p[3].buffer[0], p[3].buffer[1], 1]).mul(m.adjugate());
            const n = m.mul(new Matrix3([
                v.buffer[0], 0, 0,
                0, v.buffer[1], 0,
                0, 0, v.buffer[2]
            ]));
            return n;
        }
        const s = basis(originalPoints);
        const d = basis(transformedPoints);
        const t = d.mul(s.adjugate());
        for (let i = 0; i < 9; i++) {
            t.buffer[i] = t.buffer[i] / t.buffer[8];
        }
        return t;
    }
    constructor(value: Matrix3T = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
        super(value);
    }

    adjugate(): Matrix3 {
        const out = new Matrix3();

        const indices = [
            [4, 8, 5, 7], [2, 7, 1, 8], [1, 5, 2, 4],
            [5, 6, 3, 8], [0, 8, 2, 6], [2, 3, 0, 5],
            [3, 7, 4, 6], [1, 6, 0, 7], [0, 4, 1, 3]
        ];

        for (let i = 0; i < 9; i += 1) {
            const [a, b, c, d] = indices[i];
            out.buffer[i] = this.buffer[a] * this.buffer[b] - this.buffer[c] * this.buffer[d];
        }

        return out;
    }

    mul(other: Matrix3): Matrix3 {
        const out = new Matrix3();

        for (let row = 0; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) {
                const index = row * 3 + column;
                out.buffer[index] = (
                    this.buffer[row * 3 + 0] * other.buffer[column + 0] +
                    this.buffer[row * 3 + 1] * other.buffer[column + 3] +
                    this.buffer[row * 3 + 2] * other.buffer[column + 6]
                );
            }
        }

        return out;
    }
}

class Matrix4 extends Buffer {
    static model(translation: Vector2, scale: number): Matrix4 {
        return new Matrix4([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            translation.buffer[0], translation.buffer[1], 0, 1
        ]);
    }

    static orthographic(width: number, height: number): Matrix4 {
        const left = width / -2;
        const right = width / 2;
        const bottom = height / -2;
        const top = height / 2;
        const far = -1000;
        const near = 1000;

        return new Matrix4([
            2.0 / (right - left), 0, 0, 0,
            0, 2.0 / (top - bottom), 0, 0,
            0, 0, -2.0 / (far - near), 0,
            -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1.0
        ]);
    }

    static skew(originalPoints: Quad, transformedPoints: Quad): Matrix4 {
        const t = Matrix3.skew(originalPoints, transformedPoints);
        return new Matrix4([
            t.buffer[0], t.buffer[3], 0, t.buffer[6],
            t.buffer[1], t.buffer[4], 0, t.buffer[7],
            0, 0, 1, 0,
            t.buffer[2], t.buffer[5], 0, t.buffer[8]
        ]);
    }

    constructor(value: Matrix4T = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) {
        super(value);
    }

    mul(other: Matrix4): Matrix4 {
        const out = new Matrix4();

        for (let row = 0; row < 4; row += 1) {
            for (let column = 0; column < 4; column += 1) {
                const index = row * 4 + column;
                out.buffer[index] = (
                    this.buffer[row * 4 + 0] * other.buffer[column + 0] +
                    this.buffer[row * 4 + 1] * other.buffer[column + 4] +
                    this.buffer[row * 4 + 2] * other.buffer[column + 8] +
                    this.buffer[row * 4 + 3] * other.buffer[column + 12]
                )
            }
        }

        return out;
    }
}

class Vector2 extends Buffer {
    constructor(value: Vector2T = [0, 0]) {
        super(value);
    }
}

class Vector3 extends Buffer {
    constructor(value: Vector3T = [0, 0, 0]) {
        super(value);
    }

    mul(other: Matrix3): Vector3 {
        const out = new Vector3();

        for (let row = 0; row < 3; row += 1) {
            let sum = 0;
            for (let column = 0; column < 3; column += 1) {
                sum += this.buffer[column] * other.buffer[row * 3 + column];
            }
            out.buffer[row] = sum;
        }

        return out;
    }
}
