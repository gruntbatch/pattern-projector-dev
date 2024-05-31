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
const REM_TO_PIXELS = parseFloat(getComputedStyle(document.documentElement).fontSize);

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

        this.handles = [null, null, null, null];
        const editors = ["corner-a-field", "corner-b-field", "corner-c-field", "corner-d-field"];
        const handles = ["corner-a-handle", "corner-b-handle", "corner-c-handle", "corner-d-handle"];
        for (let i = 0; i < 4; i++) {
            this.handles[i] = new Point(
                model.corners[i],
                model.precision,
                document.getElementById(editors[i]),
                document.getElementById(handles[i])
            );
            this.handles[i].view();
        }
        document.getElementById("reset-all-corners").onclick = () => {
            for (let i = 0; i < 4; i++) {
                model.corners[i].x.reset();
                model.corners[i].y.reset();
                this.handles[i].view();
            }
        }

        new IntegerScalar(model.pixelsPerLine, 0.1, document.getElementById("pixels-per-line-field"));
        new IntegerScalar(model.unitsPerQuad, 0.1, document.getElementById("units-per-quad-field"));

        // Global event handlers
        canvas.onwheel = (e) => {
            const delta = 1.0 + (e.deltaY * this.model.precision.get()) * SCROLL_SCALAR;
    
            for (let i = 0; i < 4; i++) {
                this.model.corners[i].x.set(
                    this.model.corners[i].x.get() * delta
                );
                this.model.corners[i].y.set(
                    this.model.corners[i].y.get() * delta
                );
                this.handles[i].view();
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
    handle: HTMLElement | null;

    constructor(value: model.Point, scalar: number | model.Scalar, e: HTMLElement, handle: HTMLElement | null = null) {
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

        this.handle = handle;
    }

    view() {
        let x = this.value.x.get();
        let y = this.value.y.get();
        this.displayX.innerText = x.toFixed(3);
        this.displayY.innerText = y.toFixed(3);
        if (this.handle) {
            this.handle.style.left = x + (window.innerWidth / 2) - REM_TO_PIXELS + "px";
            this.handle.style.top = (window.innerHeight / 2) - y - REM_TO_PIXELS + "px"
        }
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

        let decr = e.querySelector<HTMLElement>("#decrement");
        if (decr) {
            decr.onclick = () => {
                this.incr(-1);
                this.view();
            }
        }

        let incr = e.querySelector<HTMLElement>("#increment");
        if (incr) {
            incr.onclick = () => {
                this.incr(1);
                this.view();
            }
        }
    }

    incr(value: number) {
        this.value.update(value * this.scalar.get());
    }

    view() {
        this.display.innerText = this.value.get().toFixed(3);
    }
}

class IntegerScalar extends Scalar {
    incr(value: number) {
        this.value.update(value);
    }

    view() {
        this.display.innerText = this.value.get().toFixed(0);
    }
}