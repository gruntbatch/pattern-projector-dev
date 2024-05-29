import * as model from "./model.js";

export {
    Editor,
    Scalar,
};

const CORNER_MOVEMENT = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1]
];
const SCROLL_SCALAR = 0.001;

class Editor {
    model: model.Model;

    handles: [Point, Point, Point, Point];

    currentHandle: number = -1;
    initialMousePosition: [number, number];
    initialCornerPosition: [number, number];

    constructor(model: model.Model, canvas: HTMLElement) {
        this.model = model;

        for (let e of document.getElementsByClassName("drawer")) {
            (e.firstElementChild as HTMLElement).onclick = () => {
                e.classList.toggle("collapsed");
            }
        }

        new Scalar(model.precision, SCROLL_SCALAR, document.getElementById("precision-field"));

        // NOTE: This is kind of a hack right now because several Points reference and update the same HTMLElements. It works, it might actually even be the way to go, but it was discovered by accident.
        this.handles = [null, null, null, null];
        for (let i = 0; i < 4; i++) {
            this.handles[i] = new Point(
                model.corners[i],
                model.precision,
                document.getElementById("corner-a-field")
            );
        }

        new IntegerScalar(model.dimension, 0.1, document.getElementById("scale-field"));

        // Global event handlers
        canvas.onwheel = (e) => {
            const delta = e.deltaY * this.model.precision.get();
            for (let i = 0; i < 4; i++) {
                model.corners[i].x.update(delta * CORNER_MOVEMENT[i][0]);
                model.corners[i].y.update(delta * CORNER_MOVEMENT[i][1]);
            }
        }
        canvas.onmousedown = (e) => {
            this.selectNearestCorner(e.pageX, e.pageY);
            this.initialMousePosition = [e.pageX, e.pageY];
            this.initialCornerPosition = [
                this.model.corners[this.currentHandle].x.get(),
                this.model.corners[this.currentHandle].y.get()
            ];
        }
        window.onmousemove = (e) => {
            if (this.currentHandle < 0) {
                return;
            }

            const currentMousePosition = [e.pageX, e.pageY];
            const deltaMousePosition = [
                currentMousePosition[0] - this.initialMousePosition[0],
                currentMousePosition[1] - this.initialMousePosition[1]
            ];

            const deltaCornerPosition = [
                deltaMousePosition[0] * model.precision.get(),
                deltaMousePosition[1] * model.precision.get()
            ];

            const currentCornerPosition = [
                this.initialCornerPosition[0] + deltaCornerPosition[0],
                this.initialCornerPosition[1] - deltaCornerPosition[1]
            ];

            this.model.corners[this.currentHandle].x.set(currentCornerPosition[0]);
            this.model.corners[this.currentHandle].y.set(currentCornerPosition[1]);

            this.handles[this.currentHandle].view();
        }
        window.onmouseup = (e) => {
            this.currentHandle = -1;
        }
    }

    selectNearestCorner(pageX: number, pageY: number) {
        pageX = pageX - (window.innerWidth / 2);
        pageY = (window.innerHeight / 2) - pageY;
        let best = Infinity;
        this.currentHandle = -1;
        this.model.corners.map((corner, i) => {
            const x = pageX - corner.x.get();
            const y = pageY - corner.y.get();
            const distanceSquared = Math.sqrt(x * x + y * y);
            if (distanceSquared < best) {
                best = distanceSquared;
                this.currentHandle = i;
            }
        });
    }
}

class Point {
    value: model.Point;
    scalar: model.Scalar;
    displayX: HTMLElement;
    displayY: HTMLElement;

    constructor(value: model.Point, scalar: number | model.Scalar, e: HTMLElement) {
        this.value = value;

        // Mr. Yuk does not like this
        if (typeof(scalar) == "number") {
            this.scalar = new model.Scalar(scalar);
        } else {
            this.scalar = scalar;
        }

        this.displayX = e.querySelector<HTMLElement>("#display-x");
        this.displayY = e.querySelector<HTMLElement>("#display-y");
        this.view();

        e.querySelector<HTMLElement>("#field-x").onwheel = (e) => {
            this.value.x.update(e.deltaY * this.scalar.get());
            this.view();
        }

        e.querySelector<HTMLElement>("#field-y").onwheel = (e) => {
            this.value.y.update(e.deltaY * this.scalar.get());
            this.view();
        }

        e.querySelector<HTMLElement>("#reset").onclick = () => {
            this.value.x.reset();
            this.value.y.reset();
            this.view();
        }
    }

    view() {
        this.displayX.innerText = this.value.x.get().toFixed(3);
        this.displayY.innerText = this.value.y.get().toFixed(3);
    }
}

class Scalar {
    value: model.Scalar;
    scalar: model.Scalar;
    display: HTMLElement;

    constructor(value: model.Scalar, scalar: number | model.Scalar, e: HTMLElement) {
        this.value = value;

        // Mr. Yuk does not like this
        if (typeof(scalar) == "number") {
            this.scalar = new model.Scalar(scalar);
        } else {
            this.scalar = scalar;
        }

        this.display = e.querySelector<HTMLElement>("#display");
        this.view();

        e.onwheel = (e) => {
            this.value.update(e.deltaY * this.scalar.get());
            this.view();
        };

        e.querySelector<HTMLElement>("#reset").onclick = () => {
            this.value.reset();
            this.view();
        };
    }

    view() {
        this.display.innerText = this.value.get().toFixed(3);
    }
}

class IntegerScalar extends Scalar {
    view() {
        this.display.innerText = this.value.get().toFixed(0);
    }
}