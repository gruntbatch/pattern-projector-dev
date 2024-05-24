import { Vector2 } from "./render.js";

export {
    Model,

    Point,

    Scalar,
    BoundedScalar,
    IntegerScalar,
    BoundedIntegerScalar,
};

class Model {
    precision: BoundedScalar;

    origin: Point;

    zoom: Scalar;
    scale: BoundedIntegerScalar;

    constructor() {
        this.precision = new BoundedScalar(0.001, 0.5, 0.1);

        this.origin = new Point();

        this.zoom = new Scalar(1.0);
        this.scale = new BoundedIntegerScalar(1, 8, 4);
    }
}

class Point {
    x: Scalar;
    y: Scalar;

    constructor(x: number = 0, y: number = 0) {
        this.x = new Scalar(x);
        this.y = new Scalar(y);
    }

    getVector2(): Vector2 {
        return [this.x.get(), this.y.get()];
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

class IntegerScalar extends Scalar {
    constructor(value: number) {
        super(Math.round(value));
    }

    get(): number {
        return Math.round(super.get());
    }
}

class BoundedIntegerScalar extends BoundedScalar {
    constructor(minValue: number, maxValue: number, value: number = minValue) {
        super(Math.round(minValue), Math.round(maxValue), Math.round(value));
    }

    get(): number {
        return Math.round(super.get());
    }
}