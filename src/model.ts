namespace Model {
    export class Handle {
        defaultPosition: Point;
        position: Point;

        constructor(position: Point) {
            this.defaultPosition = position.clone();
            this.position = position;
        }

        resetPosition() {
            this.position = this.defaultPosition;
        }
    }

    export class Model {
        defaultScale: number;
        scale: number;
        origin: Handle;

        constructor(scale: number) {
            this.defaultScale = scale;
            this.scale = scale;
            this.origin = new Handle(new Point(0, 0));
        }
    
        getModelMatrix(): Matrix4 {
            return Matrix4.mul(
                Matrix4.translation(
                    Point.scale(
                        this.origin.position,
                        1 / (4 * this.scale)
                    )
                ),
                Matrix4.mul(
                    Matrix4.scale(this.scale),
                    Matrix4.translation(new Point(0.5, 0.5))
                )
            )
        }

        onResetScale() {
            this.scale = this.defaultScale;
        }

        onChangeScale(s: number) {
            this.scale += s;
        }
    }

    export class Calibration extends Model {
        scale: number;
        origin: Handle;
        perspective: Handle[];

        constructor(scale: number) {
            super(scale);
            this.perspective = new Array<Handle>(
                new Handle(new Point(-scale, -scale)),
                new Handle(new Point( scale, -scale)),
                new Handle(new Point(-scale,  scale)),
                new Handle(new Point( scale,  scale))
            );
        }

        getProjectionMatrix(plane: Plane): Matrix4 {
            return plane.computeProjection(
                this.perspective[0].position,
                this.perspective[1].position,
                this.perspective[2].position,
                this.perspective[3].position
            );
        }
    }

    export class Projection extends Model {
    }
}