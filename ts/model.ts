export {
    Matrix,
    identity,
    orthographic,
    translation,

    Model,

    Point,
    point,
};

type Matrix = Float32Array;
type Point = [number, number];

function identity(): Matrix {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

function orthographic(width: number, height: number): Matrix {
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

function translation(translation: Point): Matrix {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translation[0], translation[1], 0, 1
    ]);
}

function point(x = 0, y = 0): Point {
    return [x, y];
}

const DEFAULT_SENSITIVITY = 0.001;

class Model {
    sensitivity: number;

    origin: Point;

    constructor() {
        this.sensitivity = DEFAULT_SENSITIVITY;

        this.origin = point();
    }
}
