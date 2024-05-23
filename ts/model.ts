export {
    Model,

    Point,
    point,
};

type Point = [number, number];

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
