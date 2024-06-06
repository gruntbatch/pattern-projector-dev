export {
    Matrix3,
    Vector2,
    Vector3,
};

type Matrix3T = [
    number, number, number,
    number, number, number,
    number, number, number
];

type Vector2T = [number, number];
type Vector3T = [number, number, number];

class Buffer {
    buffer: Float32Array;
    constructor(value: Array<number>) {
        this.buffer = new Float32Array(value);
    }
}

class Matrix3 extends Buffer {
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
