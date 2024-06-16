import { Vector2 } from "./math.js";
import { compareArrays } from "./std.js";
export { CalibrationMode, DisplayMode, DeserializationStatus, Model, Point, Scalar, BoundedScalar, IntegerScalar, BoundedIntegerScalar, };
var CalibrationMode;
(function (CalibrationMode) {
    CalibrationMode[CalibrationMode["Keystone"] = 0] = "Keystone";
    CalibrationMode[CalibrationMode["PanZoom"] = 1] = "PanZoom";
})(CalibrationMode || (CalibrationMode = {}));
var DisplayMode;
(function (DisplayMode) {
    DisplayMode[DisplayMode["Ruler"] = 0] = "Ruler";
    DisplayMode[DisplayMode["Pattern"] = 1] = "Pattern";
})(DisplayMode || (DisplayMode = {}));
var DeserializationStatus;
(function (DeserializationStatus) {
    DeserializationStatus[DeserializationStatus["Okay"] = 0] = "Okay";
    DeserializationStatus[DeserializationStatus["SyntaxError"] = 1] = "SyntaxError";
    DeserializationStatus[DeserializationStatus["VersionError"] = 2] = "VersionError";
})(DeserializationStatus || (DeserializationStatus = {}));
class Model {
    constructor(offset) {
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
    getCornersAsVectors() {
        return [
            this.corners[0].getVector2(),
            this.corners[1].getVector2(),
            this.corners[2].getVector2(),
            this.corners[3].getVector2(),
        ];
    }
    serialize() {
        return JSON.stringify({
            version: [0, 0, 2, 0],
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
    deserialize(str) {
        let json;
        try {
            json = JSON.parse(str);
        }
        catch (e) {
            if (e instanceof SyntaxError) {
                return DeserializationStatus.SyntaxError;
            }
            else {
                throw e;
            }
        }
        if (!compareArrays(json.version, [0, 0, 2, 0])) {
            return DeserializationStatus.VersionError;
        }
        const model = json.model;
        this.precision.set(model.precision);
        model.corners.forEach((value, index) => this.corners[index].set(value));
        this.displayMode = model.displayMode;
        this.pixelsPerLine.set(model.pixelsPerLine);
        this.unitsPerQuad.set(model.unitsPerQuad);
        this.calibrationMode = model.calibrationMode;
        this.pan.set(model.pan);
        this.zoom.set(model.zoom);
        return DeserializationStatus.Okay;
    }
}
class Point {
    constructor(x, y, scalar) {
        this.x = new Scalar(x, scalar);
        this.y = new Scalar(y, scalar);
    }
    add(x, y) {
        this.x.add(x);
        this.y.add(y);
    }
    mul(x, y = x) {
        this.x.mul(x);
        this.y.mul(y);
    }
    bypassMul(x, y = x) {
        this.x.bypassMul(x);
        this.y.bypassMul(y);
    }
    reset() {
        this.x.reset();
        this.y.reset();
    }
    set(value) {
        this.x.set(value[0]);
        this.y.set(value[1]);
    }
    get() {
        return [this.x.get(), this.y.get()];
    }
    getVector2() {
        return new Vector2(this.get());
    }
    distanceTo(other) {
        const x = this.x.get() - other.x.get();
        const y = this.y.get() - other.y.get();
        return Math.sqrt(x * x + y * y);
    }
}
class Value {
    constructor(value) {
        this.defaultValue = value;
        this.value = value;
    }
    add(value) {
        this.set(this.value + value);
    }
    get() {
        return this.value;
    }
    mul(value) {
        this.set(this.value * value);
    }
    reset() {
        this.set(this.defaultValue);
    }
    set(value) {
        this.value = value;
    }
}
class Scalar extends Value {
    constructor(value, scalar) {
        super(value);
        // Mr. Yuk does _not_ like this
        if (typeof (scalar) == "number") {
            this.scalar = new Value(scalar);
        }
        else {
            this.scalar = scalar;
        }
    }
    add(value) {
        super.add(value * this.scalar.get());
    }
    bypassAdd(value) {
        super.add(value);
    }
    mul(value) {
        super.mul(value * this.scalar.get());
    }
    bypassMul(value) {
        super.mul(value);
    }
}
class BoundedScalar extends Scalar {
    constructor(value, scalar, minValue = value, maxValue = value) {
        super(value, scalar);
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.set(value);
    }
    set(value) {
        value = Math.max(this.minValue, Math.min(this.maxValue, value));
        super.set(value);
    }
}
class IntegerScalar extends Scalar {
    constructor(value, scalar) {
        super(Math.round(value), scalar);
    }
    get() {
        return Math.round(super.get());
    }
}
class BoundedIntegerScalar extends BoundedScalar {
    constructor(value, scalar, minValue = value, maxValue = value) {
        super(Math.round(value), scalar, Math.round(minValue), Math.round(maxValue));
    }
    add(value) {
        super.add(value);
    }
    get() {
        return Math.round(super.get());
    }
}
