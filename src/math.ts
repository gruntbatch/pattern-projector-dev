const map = (x: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
    return outMin + (outMax - outMin) * (x - inMin) / (inMax - inMin);
}

class Point {
    constructor(public x: number, public y: number) {
        this.x = x;
        this.y = y;
    }

    static add(a: Point, b: Point): Point {
        return new Point(a.x + b.x, a.y + b.y);
    }

    static map(x: Point, inMin: number, inMax: number, outMin: number, outMax: number): Point {
        return new Point(
            map(x.x, inMin, inMax, outMin, outMax),
            map(x.y, inMin, inMax, outMin, outMax)
        );
    }

    static scale(p: Point, s: number): Point {
        return new Point(p.x * s, p.y * s);
    }

    static sub(a: Point, b: Point): Point {
        return new Point(a.x - b.x, a.y - b.y);
    }
}

class Vector3 {
    constructor(public x: number, public y: number, public z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class Matrix3 {
    constructor(public _: Array<number>) {
        this._ = _;
    }

    static adjugate(m: Matrix3): Matrix3 {
        const _ = m._;
        return new Matrix3([
            _[4] * _[8] - _[5] * _[7], _[2] * _[7] - _[1] * _[8], _[1] * _[5] - _[2] * _[4],
            _[5] * _[6] - _[3] * _[8], _[0] * _[8] - _[2] * _[6], _[2] * _[3] - _[0] * _[5],
            _[3] * _[7] - _[4] * _[6], _[1] * _[6] - _[0] * _[7], _[0] * _[4] - _[1] * _[3]
        ])
    }

    static mul(a: Matrix3, b: Matrix3): Matrix3 {
        let c = new Matrix3(new Array<number>(9));
        
        for (let i=0; i<3; i++) {
            for (let j=0; j<3; j++) {
                let sum = 0;
                for (let k=0; k<3; k++) {
                    sum += a._[3 * i + k] * b._[3 * k + j];
                }
                c._[3 * i + j] = sum;
            }
        }

        return c;
    }

    static mulVector3(m: Matrix3, v: Vector3): Vector3 {
        return new Vector3(
            m._[0] * v.x + m._[1] * v.y + m._[2] * v.z,
            m._[3] * v.x + m._[4] * v.y + m._[5] * v.z,
            m._[6] * v.x + m._[7] * v.y + m._[8] * v.z
        )
    }
}

class Matrix4 {
    public _: Float32Array;

    constructor(_: Array<number>) {
        this._ = new Float32Array(_);
    }

    static mul(a: Matrix4, b: Matrix4): Matrix4 {
        let c = new Matrix4(new Array<number>(16));
        
        for (let i=0; i<4; i++) {
            for (let j=0; j<4; j++) {
                let sum = 0;
                for (let k=0; k<4; k++) {
                    sum += a._[4 * i + k] * b._[4 * k + j];
                }
                c._[4 * i + j] = sum;
            }
        }

        return c;
    }

    static identity(): Matrix4 {
        return new Matrix4([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    static model(position: Point, scale: number): Matrix4 {
        return new Matrix4([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            position.x, position.y, 0, 1
        ]);
    }

    static orthographic(x: number, y: number): Matrix4 {
        const left = x / -2.0;
        const right = x / 2.0;
        const bottom = y / -2.0;
        const top = y / 2.0;
        const far = -1000;
        const near = 1000;
        return new Matrix4([
            2.0 / (right - left), 0, 0, 0,
            0, 2.0 / (top - bottom), 0, 0,
            0, 0, -2.0 / (far - near), 0,
            -(right + left) / (right - left),
            -(top + bottom) / (top - bottom),
            -(far + near) / (far - near),
            1.0
        ]);
    }

    static scale(scale: number): Matrix4 {
        return new Matrix4([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ])
    }

    static translation(position: Point): Matrix4 {
        return Matrix4.model(position, 1);
    }

}
