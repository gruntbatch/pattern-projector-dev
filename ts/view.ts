import * as model from "./model.js";

export {
    Editor,
    Scalar,
};

const SCROLL_SCALAR = 0.001;

class Editor {
    model: model.Model;

    constructor(model: model.Model) {
        this.model = model;

        for (let e of document.getElementsByClassName("drawer")) {
            (e.firstElementChild as HTMLElement).onclick = () => {
                e.classList.toggle("collapsed");
            }
        }

        new Scalar(model.precision, SCROLL_SCALAR, document.getElementById("precision-field"));
        
        new Point(model.origin, model.precision, document.getElementById("origin-field"));

        // TODO: Revisit how this scalar gets calculated
        new Scalar(model.zoom, SCROLL_SCALAR, document.getElementById("zoom-field"));
        new IntegerScalar(model.scale, 0.05, document.getElementById("scale-field"));
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