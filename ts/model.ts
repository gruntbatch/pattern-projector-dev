import { Vector2 } from "./math.js";
import { compareArrays } from "./std.js";

export {
    CalibrationMode,
    DisplayMode,

    Model,

    Point,

    Scalar,
    BoundedScalar,
    IntegerScalar,
    BoundedIntegerScalar,
};

enum CalibrationMode {
    Keystone,
    PanZoom,
}

enum DisplayMode {
    Ruler,
    Pattern,
}

class Model {
    precision: BoundedScalar;

    corners: [Point, Point, Point, Point];

    displayMode: DisplayMode;

    pixelsPerLine: BoundedIntegerScalar;
    unitsPerQuad: BoundedIntegerScalar;

    calibrationMode: CalibrationMode;

    pan: Point;
    zoom: Scalar;

    constructor(offset: number) {
        this.precision = new BoundedScalar(1.0, 0.001, 0.001, 1.0);

        this.corners = [
            new Point(offset, offset, this.precision),
            new Point(-offset, offset, this.precision),
            new Point(-offset, -offset, this.precision),
            new Point(offset, -offset, this.precision)
        ];

        this.displayMode = DisplayMode.Ruler;

        this.pixelsPerLine = new BoundedIntegerScalar(2, 0.1, 1, 8);
        this.unitsPerQuad = new BoundedIntegerScalar(8, 0.1, 2, 32);

        this.calibrationMode = CalibrationMode.Keystone;

        this.pan = new Point(0, 0, this.precision);
        this.zoom = new Scalar(100.0, this.precision);
    }

    getCornersAsVectors(): [Vector2, Vector2, Vector2, Vector2] {
        return [
            this.corners[0].getVector2(),
            this.corners[1].getVector2(),
            this.corners[2].getVector2(),
            this.corners[3].getVector2(),
        ]
    }

    serialize(): string {
        return JSON.stringify({
            version: [0, 0, 1, 0],
            model: {
                precision: this.precision.get(),
                corners: this.corners.map((value) => value.get()),
                displayMode: this.displayMode,
                pixelsPerLine: this.pixelsPerLine.get(),
                unitsPerQuad: this.unitsPerQuad.get(),
                calibrationMode: this.calibrationMode,
                pan: this.pan.get(),
                zoom: this.zoom.get()
            }
        });
    }

    deserialize(str: string) {
        const json = JSON.parse(str);
        if (!compareArrays(json.version, [0, 0, 1, 0])) {
            throw new Error();
        }
        const model = json.model;
        this.precision.set(model.precision);
        model.corners.forEach((value: [number, number], index: number) => this.corners[index].set(value));
        this.displayMode = model.displayMode;
        this.pixelsPerLine.set(model.pixelsPerLine);
        this.unitsPerQuad.set(model.unitsPerQuad);
        this.calibrationMode = model.calibrationMode;
        this.pan.set(model.pan);
        this.zoom.set(model.zoom);
    }
}

class Point {
    x: Scalar;
    y: Scalar;

    constructor(x: number, y: number, scalar: number | Value) {
        this.x = new Scalar(x, scalar);
        this.y = new Scalar(y, scalar);
    }

    add(x: number, y: number) {
        this.x.add(x);
        this.y.add(y);
    }

    mul(x: number, y: number = x) {
        this.x.mul(x);
        this.y.mul(y);
    }

    bypassMul(x: number, y: number = x) {
        this.x.bypassMul(x);
        this.y.bypassMul(y);
    }

    reset() {
        this.x.reset();
        this.y.reset();
    }

    set(value: [number, number]) {
        this.x.set(value[0]);
        this.y.set(value[1]);
    }

    get(): [number, number] {
        return [this.x.get(), this.y.get()]
    }

    getVector2(): Vector2 {
        return new Vector2(this.get());
    }

    distanceTo(other: Point): number {
        const x = this.x.get() - other.x.get();
        const y = this.y.get() - other.y.get();
        return Math.sqrt(x * x + y * y);
    }
}

class Value {
    protected defaultValue: number;
    protected value: number;

    constructor(value: number) {
        this.defaultValue = value;
        this.value = value;
    }

    add(value: number) {
        this.set(this.value + value);
    }

    get(): number {
        return this.value;
    }

    mul(value: number) {
        this.set(this.value * value);
    }

    reset() {
        this.set(this.defaultValue);
    }

    set(value: number) {
        this.value = value;
    }
}

class Scalar extends Value {
    scalar: Value;

    constructor(value: number, scalar: number | Value) {
        super(value);

        // Mr. Yuk does _not_ like this
        if (typeof(scalar) == "number") {
            this.scalar = new Value(scalar);
        } else {
            this.scalar = scalar;
        }
    }

    add(value: number) {
        super.add(value * this.scalar.get());
    }

    bypassAdd(value: number) {
        super.add(value);
    }

    mul(value: number) {
        super.mul(value * this.scalar.get());
    }

    bypassMul(value: number) {
        super.mul(value);
    }
}

class BoundedScalar extends Scalar {
    protected minValue: number;
    protected maxValue: number;

    constructor(value: number, scalar: number | Value, minValue: number = value, maxValue: number = value) {
        super(value, scalar);
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
    constructor(value: number, scalar: number | Value) {
        super(Math.round(value), scalar);
    }

    get(): number {
        return Math.round(super.get());
    }
}

class BoundedIntegerScalar extends BoundedScalar {
    constructor(value: number, scalar: number | Value, minValue: number = value, maxValue: number = value) {
        super(Math.round(value), scalar, Math.round(minValue), Math.round(maxValue));
    }

    add(value: number) {
        super.add(value);
    }

    get(): number {
        return Math.round(super.get());
    }
}