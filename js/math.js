export { getNextPowerOfTwo, Matrix3, Matrix4, Vector2, Vector3, Vector4, };
function getNextPowerOfTwo(value) {
    let power = 1;
    while (power < value) {
        power *= 2;
    }
    return power;
}
class Buffer {
    constructor(value) {
        this.buffer = new Float32Array(value);
    }
}
class Matrix3 extends Buffer {
    static skew(originalPoints, transformedPoints) {
        const basis = (p) => {
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
        };
        const s = basis(originalPoints);
        const d = basis(transformedPoints);
        const t = d.mul(s.adjugate());
        for (let i = 0; i < 9; i++) {
            t.buffer[i] = t.buffer[i] / t.buffer[8];
        }
        return t;
    }
    constructor(value = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
        super(value);
    }
    adjugate() {
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
    mul(other) {
        const out = new Matrix3();
        for (let row = 0; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) {
                const index = row * 3 + column;
                out.buffer[index] = (this.buffer[row * 3 + 0] * other.buffer[column + 0] +
                    this.buffer[row * 3 + 1] * other.buffer[column + 3] +
                    this.buffer[row * 3 + 2] * other.buffer[column + 6]);
            }
        }
        return out;
    }
}
class Matrix4 extends Buffer {
    static model(translation, scale) {
        return new Matrix4([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            translation.buffer[0], translation.buffer[1], 0, 1
        ]);
    }
    static orthographic(width, height) {
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
    static skew(originalPoints, transformedPoints) {
        const t = Matrix3.skew(originalPoints, transformedPoints);
        return new Matrix4([
            t.buffer[0], t.buffer[3], 0, t.buffer[6],
            t.buffer[1], t.buffer[4], 0, t.buffer[7],
            0, 0, 1, 0,
            t.buffer[2], t.buffer[5], 0, t.buffer[8]
        ]);
    }
    constructor(value = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) {
        super(value);
    }
    mul(other) {
        const out = new Matrix4();
        for (let row = 0; row < 4; row += 1) {
            for (let column = 0; column < 4; column += 1) {
                const index = row * 4 + column;
                out.buffer[index] = (this.buffer[row * 4 + 0] * other.buffer[column + 0] +
                    this.buffer[row * 4 + 1] * other.buffer[column + 4] +
                    this.buffer[row * 4 + 2] * other.buffer[column + 8] +
                    this.buffer[row * 4 + 3] * other.buffer[column + 12]);
            }
        }
        return out;
    }
}
class Vector2 extends Buffer {
    constructor(value = [0, 0]) {
        super(value);
    }
    add(other) {
        return new Vector2([
            this.buffer[0] + other.buffer[0],
            this.buffer[1] + other.buffer[1]
        ]);
    }
    distanceTo(other) {
        const x = other.buffer[0] - this.buffer[0];
        const y = other.buffer[1] - this.buffer[1];
        return Math.sqrt(x * x + y * y);
    }
    scale(scalar) {
        return new Vector2([
            this.buffer[0] * scalar,
            this.buffer[1] * scalar
        ]);
    }
    sub(other) {
        return new Vector2([
            this.buffer[0] - other.buffer[0],
            this.buffer[1] - other.buffer[1]
        ]);
    }
}
class Vector3 extends Buffer {
    constructor(value = [0, 0, 0]) {
        super(value);
    }
    mul(other) {
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
class Vector4 extends Buffer {
    constructor(value = [0, 0, 0, 0]) {
        super(value);
    }
    mul(other) {
        const out = new Vector4();
        for (let row = 0; row < 4; row += 1) {
            let sum = 0;
            for (let column = 0; column < 4; column += 1) {
                sum += this.buffer[column] * other.buffer[row * 4 + column];
            }
            out.buffer[row] = sum;
        }
        return out;
    }
}
