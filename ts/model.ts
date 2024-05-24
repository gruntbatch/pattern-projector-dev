export {
    Model,

    Point,
    point,

    Scalar,
    BoundedScalar,
};

type Point = [number, number];

function point(x = 0, y = 0): Point {
    return [x, y];
}

class Model {
    precision: BoundedScalar;

    origin: Point;

    constructor() {
        this.precision = new BoundedScalar(0.001, 0.5, 0.1);

        this.origin = point();
    }
}

class Scalar {
    private defaultValue: number;
    private value: number;

    constructor(value: number) {
        this.defaultValue = value;
        this.value = value;
    }

    get(): number {
        return this.value;
    }

    reset() {
        this.set(this.defaultValue);
    }

    set(value: number) {
        this.value = value;
    }

    update(value: number) {
        this.set(this.value + value);
    }
}

class BoundedScalar extends Scalar {
    private minValue: number;
    private maxValue: number;

    constructor(minValue: number, maxValue: number, value: number = minValue) {
        super(value);
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.set(value);
    }

    set(value: number) {
        value = Math.max(this.minValue, Math.min(this.maxValue, value));
        super.set(value);
    }
}
